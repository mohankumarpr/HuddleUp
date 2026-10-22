import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";
import { reviewRegistration } from "./registrations";
import { AppError } from "./errors";

// Players are publicly readable (the spectator screen and auction cards show them), so they carry
// only non-sensitive fields. Email, phone and address live in playerPrivate/{playerId}, which only
// organizers -- and the player themself, matched by email -- can read.

export function subscribeToPlayers(eventId, callback) {
  const q = query(collection(db, "events", eventId, "players"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function subscribeToPlayerPrivate(eventId, callback) {
  return onSnapshot(collection(db, "events", eventId, "playerPrivate"), (snap) => {
    const byId = {};
    snap.docs.forEach((d) => {
      byId[d.id] = { id: d.id, ...d.data() };
    });
    callback(byId);
  });
}

export function buildPlayerDocs({ name, photoUrl, sportIds, basePrice, gender, aboutMe, email, contact, block, registrationId, source }) {
  const trimmedEmail = (email || "").trim();
  return {
    player: {
      registrationId: registrationId || null,
      name: name.trim(),
      photoUrl: photoUrl || null,
      sportIds: sportIds || [],
      basePrice: Math.max(0, Number(basePrice) || 0),
      gender: gender || "",
      aboutMe: (aboutMe || "").trim(),
      source: source || "registration",
      status: "pool",
      marquee: false,
      soldTeamId: null,
      soldPrice: null,
      soldAt: null,
      createdAt: serverTimestamp(),
    },
    playerPrivate: {
      email: trimmedEmail,
      emailLower: trimmedEmail.toLowerCase(),
      contact: (contact || "").trim(),
      block: (block || "").trim(),
      createdAt: serverTimestamp(),
    },
  };
}

// Approve: copies the registration into an auction-eligible player (public fields) plus its
// private record, then marks the source registration "approved".
export async function promoteRegistrationToPlayer(eventId, registration, { basePrice, reviewerUid }) {
  const playerRef = doc(collection(db, "events", eventId, "players"));
  const { player, playerPrivate } = buildPlayerDocs({
    ...registration,
    registrationId: registration.id,
    basePrice,
    source: "registration",
  });

  const batch = writeBatch(db);
  batch.set(playerRef, player);
  batch.set(doc(db, "events", eventId, "playerPrivate", playerRef.id), playerPrivate);
  await batch.commit();

  await reviewRegistration(eventId, registration.id, "approved", reviewerUid);
  return playerRef.id;
}

export async function rejectRegistrationRequest(eventId, registration, reviewerUid, notes) {
  await reviewRegistration(eventId, registration.id, "rejected", reviewerUid, notes);
}

export async function updatePlayer(eventId, playerId, patch) {
  await updateDoc(doc(db, "events", eventId, "players", playerId), patch);
}

// Sends an unsold player back into the pool so they can be put on the block again. No purse or
// team was ever touched for an unsold player, so (unlike returnPlayerToPool for a sold player)
// this is just a status flip, no transaction needed.
export async function requeueUnsoldPlayer(eventId, playerId) {
  await updateDoc(doc(db, "events", eventId, "players", playerId), { status: "pool" });
}

export async function updatePlayerPrivate(eventId, playerId, patch) {
  await setDoc(doc(db, "events", eventId, "playerPrivate", playerId), patch, { merge: true });
}

// Organizer convenience for normalizing every player to one starting price at once (e.g. "everyone
// starts at 50 lakhs") instead of editing each player individually. Doesn't touch sold/soldPrice --
// basePrice is just the opening price a player's auction started at, so rewriting it after the fact
// is harmless even for already-sold players. Batched in chunks of 450 to stay under Firestore's
// 500-write-per-batch limit for very large player pools.
export async function bulkSetBasePrice(eventId, players, basePrice) {
  const price = Math.max(0, Number(basePrice) || 0);
  const chunkSize = 450;
  for (let i = 0; i < players.length; i += chunkSize) {
    const batch = writeBatch(db);
    for (const player of players.slice(i, i + chunkSize)) {
      batch.update(doc(db, "events", eventId, "players", player.id), { basePrice: price });
    }
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }
}

// Refuses to remove a player who's sold (their team's purse deduction would have nothing to point
// at) or currently on the block (the live auction state still references them). Anything else --
// pool or unsold -- is safe to remove outright, no soft-delete/undo: re-adding a player (manually
// or via bulk upload) is cheap, unlike a team or sport with fixtures/results tied to it.
export async function deletePlayer(eventId, playerId) {
  const ref = doc(db, "events", eventId, "players", playerId);
  const snap = await getDoc(ref);
  if (snap.exists() && ["sold", "on_block"].includes(snap.data().status)) {
    throw new AppError("PLAYER_NOT_REMOVABLE");
  }

  const batch = writeBatch(db);
  batch.delete(ref);
  batch.delete(doc(db, "events", eventId, "playerPrivate", playerId));
  await batch.commit();
}

// Post-auction roster correction -- moves a sold player to a different team at the same price the
// original team paid. The selling team is refunded that amount, the receiving team is charged it.
// A transaction because the receiving team's purse must be re-checked against its live value at
// commit time, same reasoning as a live bid.
export async function transferPlayer(eventId, playerId, toTeamId) {
  const playerRef = doc(db, "events", eventId, "players", playerId);
  const toTeamRef = doc(db, "events", eventId, "teams", toTeamId);
  const auctionStateRef = doc(db, "events", eventId, "auction", "state");

  return runTransaction(db, async (tx) => {
    const [playerSnap, auctionStateSnap] = await Promise.all([tx.get(playerRef), tx.get(auctionStateRef)]);
    if (!playerSnap.exists() || playerSnap.data().status !== "sold") {
      throw new AppError("PLAYER_NOT_SOLD");
    }
    const player = playerSnap.data();
    if (player.soldTeamId === toTeamId) {
      throw new AppError("SAME_TEAM");
    }

    const fromTeamRef = doc(db, "events", eventId, "teams", player.soldTeamId);
    const [fromTeamSnap, toTeamSnap] = await Promise.all([tx.get(fromTeamRef), tx.get(toTeamRef)]);
    if (!fromTeamSnap.exists() || !toTeamSnap.exists()) {
      throw new AppError("TEAM_NOT_FOUND");
    }

    const price = player.soldPrice || 0;
    const toTeam = toTeamSnap.data();
    if (price > toTeam.purseRemaining) {
      throw new AppError("TRANSFER_INSUFFICIENT_PURSE");
    }

    tx.update(fromTeamRef, { purseRemaining: fromTeamSnap.data().purseRemaining + price });
    tx.update(toTeamRef, { purseRemaining: toTeam.purseRemaining - price });
    tx.update(playerRef, { soldTeamId: toTeamId });

    // A pending "undo last sale" for this same player is now stale -- it refers to a team this
    // player no longer belongs to, and replaying it later would double-refund that team. Clearing
    // it here means the console never even offers an undo that can't safely apply.
    if (auctionStateSnap.exists() && auctionStateSnap.data().undo?.playerId === playerId) {
      tx.update(auctionStateRef, { undo: null });
    }
  });
}

// Reverts a sold player back to the pool and refunds their price to the team that bought them --
// unlike the live auction console's single-level undo, this works on any sold player at any time,
// not just the most recent sale.
export async function returnPlayerToPool(eventId, playerId) {
  const playerRef = doc(db, "events", eventId, "players", playerId);
  const auctionStateRef = doc(db, "events", eventId, "auction", "state");

  return runTransaction(db, async (tx) => {
    const [playerSnap, auctionStateSnap] = await Promise.all([tx.get(playerRef), tx.get(auctionStateRef)]);
    if (!playerSnap.exists() || playerSnap.data().status !== "sold") {
      throw new AppError("PLAYER_NOT_SOLD");
    }
    const player = playerSnap.data();
    const teamRef = doc(db, "events", eventId, "teams", player.soldTeamId);
    const teamSnap = await tx.get(teamRef);
    if (teamSnap.exists()) {
      tx.update(teamRef, { purseRemaining: teamSnap.data().purseRemaining + (player.soldPrice || 0) });
    }
    tx.update(playerRef, { status: "pool", soldTeamId: null, soldPrice: null, soldAt: null });

    // Same reasoning as transferPlayer -- a pending undo for this player would now be stale.
    if (auctionStateSnap.exists() && auctionStateSnap.data().undo?.playerId === playerId) {
      tx.update(auctionStateRef, { undo: null });
    }
  });
}

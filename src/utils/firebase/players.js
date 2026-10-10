import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
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

export async function updatePlayerPrivate(eventId, playerId, patch) {
  await setDoc(doc(db, "events", eventId, "playerPrivate", playerId), patch, { merge: true });
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

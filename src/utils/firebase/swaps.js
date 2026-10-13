import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./config";
import { AppError } from "./errors";

// A team-to-team "buy this player from you" offer -- see firestore.rules for who can do what.
// Each team gets exactly one of these to ever reach "completed" (see requestSwap/completeSwapRequest);
// a declined or cancelled offer doesn't burn that one use.

export function subscribeToSwapRequests(eventId, callback) {
  const q = query(collection(db, "events", eventId, "swapRequests"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function requestSwap(eventId, { requesterTeamId, targetTeamId, playerId, price, createdByUid }) {
  if (requesterTeamId === targetTeamId) {
    throw new AppError("SAME_TEAM");
  }
  const teamSnap = await getDoc(doc(db, "events", eventId, "teams", requesterTeamId));
  if (teamSnap.exists() && teamSnap.data().swapUsed) {
    throw new AppError("SWAP_ALREADY_USED");
  }
  await addDoc(collection(db, "events", eventId, "swapRequests"), {
    requesterTeamId,
    targetTeamId,
    playerId,
    price: Math.max(0, Number(price) || 0),
    status: "pending",
    createdByUid,
    createdAt: serverTimestamp(),
  });
}

export async function respondToSwapRequest(eventId, requestId, accept, uid) {
  await updateDoc(doc(db, "events", eventId, "swapRequests", requestId), {
    status: accept ? "accepted" : "declined",
    respondedByUid: uid,
    respondedAt: serverTimestamp(),
  });
}

export async function cancelSwapRequest(eventId, requestId) {
  await updateDoc(doc(db, "events", eventId, "swapRequests", requestId), { status: "cancelled" });
}

// Organizer-only: moves the player to the requesting team at the agreed price, refunds the
// selling team, charges the buying team, and marks the requester's one swap as used -- all in a
// transaction so a purse that changed (another sale, another swap) between accept and confirm is
// re-checked, not trusted from a stale snapshot.
export async function completeSwapRequest(eventId, requestId) {
  const requestRef = doc(db, "events", eventId, "swapRequests", requestId);

  return runTransaction(db, async (tx) => {
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists() || requestSnap.data().status !== "accepted") {
      throw new AppError("SWAP_NOT_ACCEPTED");
    }
    const request = requestSnap.data();

    const playerRef = doc(db, "events", eventId, "players", request.playerId);
    const requesterTeamRef = doc(db, "events", eventId, "teams", request.requesterTeamId);
    const targetTeamRef = doc(db, "events", eventId, "teams", request.targetTeamId);

    const [playerSnap, requesterSnap, targetSnap] = await Promise.all([
      tx.get(playerRef),
      tx.get(requesterTeamRef),
      tx.get(targetTeamRef),
    ]);

    if (!playerSnap.exists() || playerSnap.data().status !== "sold" || playerSnap.data().soldTeamId !== request.targetTeamId) {
      throw new AppError("SWAP_PLAYER_NOT_AVAILABLE");
    }
    if (!requesterSnap.exists() || !targetSnap.exists()) {
      throw new AppError("TEAM_NOT_FOUND");
    }
    const requesterTeam = requesterSnap.data();
    if (requesterTeam.swapUsed) {
      throw new AppError("SWAP_ALREADY_USED");
    }
    if (request.price > requesterTeam.purseRemaining) {
      throw new AppError("TRANSFER_INSUFFICIENT_PURSE");
    }

    tx.update(playerRef, { soldTeamId: request.requesterTeamId, soldPrice: request.price });
    tx.update(requesterTeamRef, { purseRemaining: requesterTeam.purseRemaining - request.price, swapUsed: true });
    tx.update(targetTeamRef, { purseRemaining: targetSnap.data().purseRemaining + request.price });
    tx.update(requestRef, { status: "completed", completedAt: serverTimestamp() });
  });
}

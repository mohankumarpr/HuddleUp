import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./config";

// events/{eventId}/participants/{uid} = { playerId, email, name }
// Existing means "this login belongs to an approved player of this event". Security Rules use it to
// gate participant-only data (standings), and only allow creating it when the account's email
// matches the player's private record -- so it can't be claimed for someone else's record.

export async function getParticipant(eventId, uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "events", eventId, "participants", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Finds the player whose private record has this account's email and links the account to it.
// Returns the participant doc, or null when no approved player uses that email.
export async function claimPlayerRecord(eventId, user) {
  const existing = await getParticipant(eventId, user.uid);
  if (existing) return existing;
  if (!user.email) return null;

  const emailLower = user.email.toLowerCase();
  const matches = await getDocs(
    query(collection(db, "events", eventId, "playerPrivate"), where("emailLower", "==", emailLower), limit(1))
  );
  if (matches.empty) return null;

  const playerId = matches.docs[0].id;
  const participant = {
    playerId,
    email: emailLower,
    name: user.displayName || "",
    linkedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "events", eventId, "participants", user.uid), participant);
  return { id: user.uid, ...participant };
}

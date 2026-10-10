import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

// events/{eventId}/activityLog/{entryId} -- an append-only trail of who did what, for an organizer
// to review after the fact (e.g. "who approved this player" or "when was this team deleted").
// Logging is best-effort and fire-and-forget: a failed log write should never block the real
// action it's describing, so callers don't await this and errors are swallowed.
export function logActivity(eventId, { actorUid, action, summary, meta }) {
  addDoc(collection(db, "events", eventId, "activityLog"), {
    actorUid: actorUid || null,
    action,
    summary,
    meta: meta || null,
    createdAt: serverTimestamp(),
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Couldn't write activity log entry:", err);
  });
}

export function subscribeToActivityLog(eventId, callback, max = 200) {
  const q = query(collection(db, "events", eventId, "activityLog"), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

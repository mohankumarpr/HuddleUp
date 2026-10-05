import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./config";

// Public, no-login submission -- the create rule on registrations/{regId} allows anyone.
export async function submitRegistration(
  eventId,
  { name, contact, email, gender, block, aboutMe, sportIds, requestedBasePrice, photoUrl }
) {
  const ref = doc(collection(db, "events", eventId, "registrations"));
  await setDoc(ref, {
    name,
    contact,
    email: (email || "").trim(),
    emailLower: (email || "").trim().toLowerCase(),
    gender: gender || "",
    block: (block || "").trim(),
    aboutMe: (aboutMe || "").trim(),
    sportIds,
    requestedBasePrice: requestedBasePrice ?? null,
    photoUrl: photoUrl || null, // a compressed data: URL -- see src/utils/image.js
    status: "pending",
    submittedAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
  });
  return ref.id;
}

// status omitted -> all registrations (organizer's full list); pass "pending" for the review queue.
export function subscribeToRegistrations(eventId, status, callback) {
  const base = collection(db, "events", eventId, "registrations");
  const q = status
    ? query(base, where("status", "==", status), orderBy("submittedAt", "desc"))
    : query(base, orderBy("submittedAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

// Just a count for the dashboard -- equality-only query, served by the automatic single-field
// index (unlike subscribeToRegistrations, which orders and therefore needs a composite index).
export function subscribeToPendingRegistrationCount(eventId, callback) {
  const q = query(collection(db, "events", eventId, "registrations"), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => callback(snap.size));
}

export async function reviewRegistration(eventId, registrationId, status, reviewerUid, notes) {
  await updateDoc(doc(db, "events", eventId, "registrations", registrationId), {
    status,
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerUid,
    ...(notes ? { notes } : {}),
  });
}

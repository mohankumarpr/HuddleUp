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
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";
import { AppError } from "./errors";

// organizations/{orgId}/invites/{inviteId} -- a pending co-organizer invite, keyed by the
// invitee's email. Accepting one joins an EXISTING org as a non-owner 'organizer'; it does not
// support an account that already belongs to a different org (see acceptInvite below), since
// every account currently points at exactly one organization (users/{uid}.orgId).

export async function createInvite(orgId, orgName, { email, invitedByUid }) {
  const ref = doc(collection(db, "organizations", orgId, "invites"));
  await setDoc(ref, {
    orgName,
    email: email.trim(),
    emailLower: email.trim().toLowerCase(),
    role: "organizer",
    invitedBy: invitedByUid,
    status: "pending",
    acceptedBy: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getInvite(orgId, inviteId) {
  const snap = await getDoc(doc(db, "organizations", orgId, "invites", inviteId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeToPendingInvites(orgId, callback) {
  const q = query(collection(db, "organizations", orgId, "invites"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function revokeInvite(orgId, inviteId) {
  await updateDoc(doc(db, "organizations", orgId, "invites", inviteId), { status: "revoked" });
}

// Joins the signed-in user (a real email/password account matching the invite's email) into the
// inviting organization as a non-owner 'organizer', and points users/{uid} at that org. Batched so
// the membership, user-profile and invite-status writes all succeed or fail together.
export async function acceptInvite(orgId, inviteId, user) {
  const invite = await getInvite(orgId, inviteId);
  if (!invite || invite.status !== "pending") throw new AppError("INVITE_NOT_FOUND");

  const userEmailLower = (user.email || "").toLowerCase();
  if (invite.emailLower !== userEmailLower) throw new AppError("INVITE_EMAIL_MISMATCH");

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const existingOrgId = userSnap.exists() ? userSnap.data().orgId : null;
  if (existingOrgId && existingOrgId !== orgId) throw new AppError("ALREADY_IN_ANOTHER_ORG");

  const batch = writeBatch(db);
  batch.set(doc(db, "organizations", orgId, "members", user.uid), {
    role: "organizer",
    email: user.email,
    displayName: user.displayName || "",
    inviteId,
    addedAt: serverTimestamp(),
  });
  batch.set(
    doc(db, "users", user.uid),
    { orgId, email: user.email, displayName: user.displayName || "", createdAt: serverTimestamp() },
    { merge: true }
  );
  batch.update(doc(db, "organizations", orgId, "invites", inviteId), {
    status: "accepted",
    acceptedBy: user.uid,
  });
  await batch.commit();
}

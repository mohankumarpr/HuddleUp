import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./config";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// Creates the organization doc, then its owner membership doc, as two sequential writes
// (not a batch) so the membership doc's security rule -- which reads the org doc's
// ownerUid via get() -- always evaluates against an already-committed org doc.
export async function createOrganizationWithOwner({ name, ownerUid }) {
  const orgRef = doc(collection(db, "organizations"));
  await setDoc(orgRef, {
    name,
    slug: slugify(name),
    logoUrl: null,
    ownerUid,
    plan: "free",
    createdAt: serverTimestamp(),
  });

  try {
    await setDoc(doc(db, "organizations", orgRef.id, "members", ownerUid), {
      role: "owner",
      addedAt: serverTimestamp(),
    });
  } catch (err) {
    await deleteDoc(orgRef).catch(() => {});
    throw err;
  }

  return orgRef.id;
}

export async function getOrganization(orgId) {
  if (!orgId) return null;
  const snap = await getDoc(doc(db, "organizations", orgId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getMembership(orgId, uid) {
  if (!orgId || !uid) return null;
  const snap = await getDoc(doc(db, "organizations", orgId, "members", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateOrganization(orgId, patch) {
  await updateDoc(doc(db, "organizations", orgId), patch);
}

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./config";
import { createOrganizationWithOwner } from "./organizations";

// Signs up a new organizer AND creates their organization in one flow. This is the only
// sign-up path in the app -- every account is an organization owner by default.
export async function signUpOrganizer({ email, password, displayName, orgName }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }

  const orgId = await createOrganizationWithOwner({
    name: orgName,
    ownerUid: cred.user.uid,
    email,
    displayName,
  });

  await setDoc(doc(db, "users", cred.user.uid), {
    orgId,
    displayName: displayName || "",
    email,
    createdAt: serverTimestamp(),
  });

  return { user: cred.user, orgId };
}

// Player accounts are plain email/password users with no organization. They're tied to an event by
// participants.js, which matches the account's email against the player's private record.
export async function signUpPlayer({ email, password, displayName }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred.user;
}

export async function signInWithEmail({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function sendPlayerPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function signInOrganizer({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutUser() {
  await signOut(auth);
}

// Silent, no-UI sign-in used for public spectators so Security Rules have a uniform
// request.auth != null to check against. Safe to call repeatedly -- no-ops if already signed in.
export async function ensureAnonymousAuth() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

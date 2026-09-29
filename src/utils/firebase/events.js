import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./config";
import { ensureAnonymousAuth } from "./auth";
import { AppError } from "./errors";

const TEAM_COLORS = ["#e53935", "#1e88e5", "#43a047", "#fb8c00", "#8e24aa", "#00897b", "#f4511e", "#3949ab"];

export function randomDigits(length) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

function toNumberOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Owners may be stored as an `owners` array (new) or a single legacy `ownerName` string. This
// always returns an array so callers never have to care which shape a team doc has.
export function getTeamOwners(team) {
  if (Array.isArray(team?.owners) && team.owners.length) return team.owners;
  if (team?.ownerName) return [{ id: "legacy", name: team.ownerName, gender: "", contact: "" }];
  return [];
}

function cleanOwners(owners) {
  return (owners || [])
    .filter((o) => o && o.name && o.name.trim())
    .map((o, i) => ({
      id: o.id && o.id !== "legacy" ? o.id : `o${Date.now().toString(36)}${i}`,
      name: o.name.trim(),
      gender: o.gender || "",
      contact: (o.contact || "").trim(),
    }));
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function randomCode(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function createEvent(orgId, { name, description, venue, eventDate, purseDefault }) {
  const eventRef = doc(collection(db, "events"));
  const slug = `${slugify(name)}-${randomCode(4).toLowerCase()}`;

  await setDoc(eventRef, {
    orgId,
    name,
    slug,
    description: description || "",
    venue: venue || "",
    eventDate: eventDate || null,
    status: "draft",
    bannerUrl: null,
    logoUrl: null,
    purseDefault: Number(purseDefault) || 0,
    joinCode: randomCode(6),
    publicRegistrationEnabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return eventRef.id;
}

export async function updateEvent(eventId, patch) {
  await updateDoc(doc(db, "events", eventId), { ...patch, updatedAt: serverTimestamp() });
}

export async function getEvent(eventId) {
  const snap = await getDoc(doc(db, "events", eventId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getEventBySlug(slug) {
  const q = query(collection(db, "events"), where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const eventDoc = snap.docs[0];
  return { id: eventDoc.id, ...eventDoc.data() };
}

// Live subscription -- an organizer dashboard should always reflect the current status
// (e.g. another tab flips an event to "live") without a manual refresh.
export function subscribeToEvent(eventId, callback) {
  return onSnapshot(doc(db, "events", eventId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function subscribeToOrgEvents(orgId, callback) {
  const q = query(collection(db, "events"), where("orgId", "==", orgId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ---------- Sports ----------

export function subscribeToSports(eventId, callback) {
  const q = query(collection(db, "events", eventId, "sports"), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

function sportFields(data) {
  return {
    name: data.name.trim(),
    description: (data.description || "").trim(),
    date: data.date || "", // "YYYY-MM-DDTHH:mm" from a datetime-local input, or "" when not scheduled yet
    venue: (data.venue || "").trim(),
    rules: (data.rules || "").trim(),
    playersPerTeam: toNumberOrNull(data.playersPerTeam),
    maxParticipants: toNumberOrNull(data.maxParticipants),
  };
}

export async function createSport(eventId, { order, active = true, ...data }) {
  const ref = doc(collection(db, "events", eventId, "sports"));
  await setDoc(ref, { ...sportFields(data), order: order ?? Date.now(), active });
  return ref.id;
}

// Partial updates are fine (e.g. just toggling `active`), so only normalize the fields present.
export async function updateSport(eventId, sportId, patch) {
  const next = { ...patch };
  if ("name" in patch) next.name = patch.name.trim();
  if ("description" in patch) next.description = (patch.description || "").trim();
  if ("venue" in patch) next.venue = (patch.venue || "").trim();
  if ("rules" in patch) next.rules = (patch.rules || "").trim();
  if ("playersPerTeam" in patch) next.playersPerTeam = toNumberOrNull(patch.playersPerTeam);
  if ("maxParticipants" in patch) next.maxParticipants = toNumberOrNull(patch.maxParticipants);
  await updateDoc(doc(db, "events", eventId, "sports", sportId), next);
}

export async function deleteSport(eventId, sportId) {
  await deleteDoc(doc(db, "events", eventId, "sports", sportId));
}

// ---------- Teams ----------

export function subscribeToTeams(eventId, callback) {
  const q = query(collection(db, "events", eventId, "teams"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function createTeam(eventId, { name, owners, purseTotal, color }, colorIndex = 0) {
  const ref = doc(collection(db, "events", eventId, "teams"));
  const purse = Number(purseTotal) || 0;
  const cleaned = cleanOwners(owners);
  await setDoc(ref, {
    name: name.trim(),
    owners: cleaned,
    ownerName: cleaned[0]?.name || "", // kept for older readers of the doc
    logoUrl: null,
    color: color || TEAM_COLORS[colorIndex % TEAM_COLORS.length],
    purseTotal: purse,
    purseRemaining: purse,
    repUids: [],
    joinPin: randomDigits(4),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Edits name/owners/color/purse. If the purse total changes, the remaining purse moves by the same
// amount so money already spent in the auction stays accounted for.
export async function saveTeamDetails(eventId, team, { name, owners, purseTotal, color }) {
  const newTotal = Number(purseTotal) || 0;
  const spent = (team.purseTotal || 0) - (team.purseRemaining || 0);
  const cleaned = cleanOwners(owners);
  await updateDoc(doc(db, "events", eventId, "teams", team.id), {
    name: name.trim(),
    owners: cleaned,
    ownerName: cleaned[0]?.name || "",
    color,
    purseTotal: newTotal,
    purseRemaining: newTotal - spent,
  });
}

export async function updateTeam(eventId, teamId, patch) {
  await updateDoc(doc(db, "events", eventId, "teams", teamId), patch);
}

export async function deleteTeam(eventId, teamId) {
  await deleteDoc(doc(db, "events", eventId, "teams", teamId));
}

// ---------- Team-rep join flow ----------

// Verifies the event's join code and the chosen team's PIN, then signs the visitor in
// anonymously (if not already) and claims their seat by writing teamReps/{uid}. Security Rules
// only check for the existence of that doc (see firestore.rules) -- the PIN/code check here is
// client-side, which is an explicit low-friction/low-security trade-off: a leaked code+PIN lets
// someone bid as that team until the organizer deletes their teamReps doc (kick/reset).
export async function claimTeamSeat(eventId, { joinCode, teamId, pin, displayName }) {
  const event = await getEvent(eventId);
  if (!event || event.joinCode !== joinCode.toUpperCase()) {
    throw new AppError("INVALID_JOIN_CODE");
  }

  const teamSnap = await getDoc(doc(db, "events", eventId, "teams", teamId));
  if (!teamSnap.exists() || teamSnap.data().joinPin !== pin) {
    throw new AppError("INVALID_PIN");
  }

  const user = await ensureAnonymousAuth();
  await setDoc(doc(db, "events", eventId, "teamReps", user.uid), {
    teamId,
    displayName: displayName || "",
    joinedAt: serverTimestamp(),
  });

  return { uid: user.uid, teamId };
}

export async function getTeamRep(eventId, uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "events", eventId, "teamReps", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

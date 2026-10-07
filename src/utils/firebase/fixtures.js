import { collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./config";
import { buildFixturePlan } from "../fixtures";

// events/{eventId}/fixtures/{fixtureId} = one individual match (not a whole pairing) --
// { sportId, category, matchType, matchIndex, teamAId, teamBId, winnerId, createdAt }

export function subscribeToFixtures(eventId, sportId, callback) {
  const q = query(collection(db, "events", eventId, "fixtures"), where("sportId", "==", sportId));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

async function getSportFixtures(eventId, sportId) {
  const q = query(collection(db, "events", eventId, "fixtures"), where("sportId", "==", sportId));
  const snap = await getDocs(q);
  return snap.docs;
}

// Creates every fixture for a round-robin among `teams` using the sport's match format. Refuses
// to run if the sport already has fixtures -- call clearFixtures first (after organizer
// confirmation, since that discards any recorded results) to regenerate.
export async function generateFixtures(eventId, sport, teams) {
  const existing = await getSportFixtures(eventId, sport.id);
  if (existing.length > 0) {
    throw new Error("Fixtures already exist for this sport. Clear them first to regenerate.");
  }

  const plan = buildFixturePlan(sport.matchFormat, teams.map((t) => t.id));
  const batch = writeBatch(db);
  plan.forEach((fixture) => {
    const ref = doc(collection(db, "events", eventId, "fixtures"));
    batch.set(ref, { sportId: sport.id, ...fixture, winnerId: null, createdAt: serverTimestamp() });
  });
  await batch.commit();
  return plan.length;
}

export async function clearFixtures(eventId, sportId) {
  const docs = await getSportFixtures(eventId, sportId);
  const batch = writeBatch(db);
  docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function setFixtureWinner(eventId, fixtureId, winnerId) {
  await updateDoc(doc(db, "events", eventId, "fixtures", fixtureId), { winnerId });
}

// Adds one fixture by hand -- for any format that isn't "everyone plays everyone once" (knockout,
// Swiss, a custom playoff, or just a single extra match), since there's no way to auto-generate a
// format the app doesn't know the rules of. `category`/`matchType` are free text here (e.g. a
// knockout round's name), not tied to the sport's configured match-format categories.
export async function addFixture(eventId, { sportId, category, matchType, teamAId, teamBId }) {
  const ref = doc(collection(db, "events", eventId, "fixtures"));
  await setDoc(ref, {
    sportId,
    category: (category || "").trim(),
    matchType: (matchType || "").trim(),
    matchIndex: 0,
    teamAId,
    teamBId,
    winnerId: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteFixture(eventId, fixtureId) {
  await deleteDoc(doc(db, "events", eventId, "fixtures", fixtureId));
}

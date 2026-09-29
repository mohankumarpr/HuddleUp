import { collection, doc, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./config";

// events/{eventId}/results/{sportId} = { points: { [teamId]: number }, updatedAt }
// Points are entered manually by the organizer -- no scoring rules are built in.

export function subscribeToResults(eventId, callback, onError) {
  return onSnapshot(
    collection(db, "events", eventId, "results"),
    (snap) => {
      const bySport = {};
      snap.docs.forEach((d) => {
        bySport[d.id] = d.data().points || {};
      });
      callback(bySport);
    },
    onError
  );
}

// `matrix` is { [sportId]: { [teamId]: number | "" } }. Only the sports listed in `sportIds` are
// written, so the caller can save just the rows the organizer actually changed.
export async function saveResults(eventId, matrix, sportIds) {
  const batch = writeBatch(db);
  sportIds.forEach((sportId) => {
    const points = {};
    Object.entries(matrix[sportId] || {}).forEach(([teamId, value]) => {
      const n = Number(value);
      if (value !== "" && value != null && Number.isFinite(n)) points[teamId] = n;
    });
    batch.set(doc(db, "events", eventId, "results", sportId), { points, updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

// Pure: turns raw results into a ranked table. Ties share a rank (1, 2, 2, 4).
export function computeStandings(teams, resultsBySport) {
  const rows = teams.map((team) => {
    let total = 0;
    const perSport = {};
    Object.entries(resultsBySport || {}).forEach(([sportId, points]) => {
      const value = Number(points?.[team.id]);
      if (Number.isFinite(value) && points?.[team.id] !== undefined) {
        perSport[sportId] = value;
        total += value;
      }
    });
    return { team, total, perSport };
  });

  rows.sort((a, b) => b.total - a.total || a.team.name.localeCompare(b.team.name));

  let lastTotal = null;
  let lastRank = 0;
  return rows.map((row, i) => {
    const rank = row.total === lastTotal ? lastRank : i + 1;
    lastTotal = row.total;
    lastRank = rank;
    return { ...row, rank };
  });
}

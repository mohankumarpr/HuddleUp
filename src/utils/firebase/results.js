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
    batch.set(doc(db, "events", eventId, "results", sportId), { points, updatedAt: serverTimestamp() }, { merge: true });
  });
  await batch.commit();
}

// events/{eventId}/results/{sportId}.stats = { [teamId]: { played, won, drawn, lost } }. Optional
// and separate from `points` -- not every sport is a team-vs-team format where a match record
// makes sense (e.g. individual races), so organizers only fill this in for the sports it fits.
export function subscribeToSportStats(eventId, callback, onError) {
  return onSnapshot(
    collection(db, "events", eventId, "results"),
    (snap) => {
      const bySport = {};
      snap.docs.forEach((d) => {
        bySport[d.id] = d.data().stats || {};
      });
      callback(bySport);
    },
    onError
  );
}

// `statsBySport` is { [sportId]: { [teamId]: { played, won, drawn, lost } } }. Only the sports
// listed in `sportIds` are written -- mirrors saveResults so switching which sport you're looking
// at never has to discard anything: every sport's edits live in the draft at once, and saving
// writes whichever ones are actually dirty.
export async function saveSportStats(eventId, statsBySport, sportIds) {
  const batch = writeBatch(db);
  sportIds.forEach((sportId) => {
    const clean = {};
    Object.entries(statsBySport[sportId] || {}).forEach(([teamId, row]) => {
      const entry = {};
      ["played", "won", "drawn", "lost"].forEach((field) => {
        const n = Number(row?.[field]);
        if (row?.[field] !== "" && row?.[field] != null && Number.isFinite(n)) entry[field] = n;
      });
      if (Object.keys(entry).length) clean[teamId] = entry;
    });
    batch.set(doc(db, "events", eventId, "results", sportId), { stats: clean, updatedAt: serverTimestamp() }, { merge: true });
  });
  await batch.commit();
}

// Pure: turns raw results into a ranked table. Ties share a rank (1, 2, 2, 4). `statsBySport`
// (optional) is summed per team across every sport that has a match record, for a supplementary
// played/won/drawn/lost column -- it never affects ranking, which stays points-only.
export function computeStandings(teams, resultsBySport, statsBySport) {
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

    let stats = null;
    if (statsBySport) {
      const totals = { played: 0, won: 0, drawn: 0, lost: 0 };
      let any = false;
      Object.values(statsBySport).forEach((teamStats) => {
        const s = teamStats?.[team.id];
        if (s) {
          any = true;
          totals.played += Number(s.played) || 0;
          totals.won += Number(s.won) || 0;
          totals.drawn += Number(s.drawn) || 0;
          totals.lost += Number(s.lost) || 0;
        }
      });
      if (any) stats = totals;
    }

    return { team, total, perSport, stats };
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

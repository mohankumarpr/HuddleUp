// Pure, unit-testable fixture math -- no Firestore here (see utils/firebase/fixtures.js for I/O).

// Every team plays every other team exactly once.
export function roundRobinPairs(teamIds) {
  const pairs = [];
  for (let i = 0; i < teamIds.length; i += 1) {
    for (let j = i + 1; j < teamIds.length; j += 1) {
      pairs.push([teamIds[i], teamIds[j]]);
    }
  }
  return pairs;
}

// Expands a sport's match format into the full list of individual fixtures for a round-robin
// among `teamIds` -- every pair plays the category's exact match-type sequence once. `matchIndex`
// distinguishes repeats of the same type within a category (e.g. a category with two "Doubles"
// slots), so a pair gets one fixture per slot, not a single merged one.
export function buildFixturePlan(matchFormat, teamIds) {
  const pairs = roundRobinPairs(teamIds);
  const plan = [];
  (matchFormat?.categories || []).forEach((category) => {
    category.matchTypes.forEach((matchType, matchIndex) => {
      pairs.forEach(([teamAId, teamBId]) => {
        plan.push({ category: category.name, matchType, matchIndex, teamAId, teamBId });
      });
    });
  });
  return plan;
}

// Counts completed-match wins per team from a sport's fixtures. Every team in `teamIds` is
// present in the result (0 if they haven't won anything yet), so callers don't have to guard
// against missing keys.
export function computeMatchWins(fixtures, teamIds) {
  const wins = {};
  teamIds.forEach((id) => {
    wins[id] = 0;
  });
  (fixtures || []).forEach((f) => {
    if (f.winnerId && f.winnerId in wins) wins[f.winnerId] += 1;
  });
  return wins;
}

// Standard competition ranking from win counts: teams with equal wins share a position number,
// jointly consuming that many consecutive slots (so the next distinct count skips ahead) --
// matching exactly how the points-by-position calculator in Standings splits a tie.
export function rankTeamsByWins(wins, teamIds) {
  const sorted = [...teamIds].sort((a, b) => (wins[b] || 0) - (wins[a] || 0));
  const positions = {};
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && wins[sorted[j + 1]] === wins[sorted[i]]) j += 1;
    for (let k = i; k <= j; k += 1) positions[sorted[k]] = i + 1;
    i = j + 1;
  }
  return positions; // { teamId: 1-indexed position }, ties share a number
}

// Pure, unit-testable helpers for two independent auction constraints an organizer can opt into:
//
// 1. A max-bid cap so a team can never spend so much on one player that it can no longer afford
//    the base reserve for every remaining roster slot. Based purely on total roster size (ALL
//    players, any gender) -- so it works correctly even when gender isn't tracked at all.
// 2. A men's/women's quota cap -- independent of the money cap -- based on each gender's share of
//    the full player pool split evenly across teams. Players with no gender set (or "other") are
//    outside this system entirely: never capped, never counted toward a quota.
//
// Both are purely derived from already-public data (players + teams + the event's reserveSlotPrice)
// and are intentionally **not** mixed together: an uneven gender split (see computeGenderQuota)
// means the sum of both genders' maxes can legitimately exceed the overall roster target, and that
// is fine -- the two caps are enforced separately, not reconciled against each other.

export function computeTotalSlotsPerTeam(totalPlayers, numTeams) {
  if (!numTeams) return 0;
  return Math.ceil(totalPlayers / numTeams);
}

// floor = the minimum every team should expect to end up with; max = the hard cap no team may
// exceed for that gender (enforced by isGenderCapped). When totalOfGender isn't evenly divisible,
// some teams will land on floor and some on max -- which specific teams is left to how the auction
// actually plays out, not decided up front.
export function computeGenderQuota(totalOfGender, numTeams) {
  if (!numTeams) return { min: 0, max: 0, total: totalOfGender };
  return {
    min: Math.floor(totalOfGender / numTeams),
    max: Math.ceil(totalOfGender / numTeams),
    total: totalOfGender,
  };
}

// Gender totals across the whole pool (any status) -- the fixed target the quota is based on.
export function computePoolGenderTotals(players) {
  let female = 0;
  let male = 0;
  for (const p of players) {
    if (p.gender === "female") female++;
    else if (p.gender === "male") male++;
  }
  return { female, male };
}

// One team's current roster: total players owned, and how many of each gender.
export function countTeamRoster(players, teamId) {
  let total = 0;
  let female = 0;
  let male = 0;
  for (const p of players) {
    if (p.status === "sold" && p.soldTeamId === teamId) {
      total++;
      if (p.gender === "female") female++;
      else if (p.gender === "male") male++;
    }
  }
  return { total, female, male };
}

// The most a team may bid on the player currently on the block, so that after winning them it can
// still afford the reserve price for every remaining slot. `reserveSlotPrice` of 0/null disables
// the cap entirely (returns Infinity) -- the organizer hasn't opted into this constraint.
export function maxBidCapForTeam({ purseRemaining, totalSlotsPerTeam, teamTotalOwned, reserveSlotPrice }) {
  if (!reserveSlotPrice) return Infinity;
  const remainingSlots = Math.max(0, totalSlotsPerTeam - teamTotalOwned);
  const slotsAfterThisPick = Math.max(0, remainingSlots - 1);
  return Math.max(0, purseRemaining - slotsAfterThisPick * reserveSlotPrice);
}

// Only "female"/"male" are ever capped -- a player with no gender set, or "other", never blocks a
// bid this way.
export function isGenderCapped(gender, teamGenderCount, genderQuotaMax) {
  if (gender !== "female" && gender !== "male") return false;
  return teamGenderCount >= genderQuotaMax;
}

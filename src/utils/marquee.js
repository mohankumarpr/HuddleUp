// Marquee players are deliberately held back from the auction until the pool has thinned out --
// organizers use this for star players they want auctioned near the end, when the drama (and team
// purses) are at their peak. The hold window scales with how many marquee players there are: with
// M marquee players, they're excluded from selection until at most 2*M players remain in the pool,
// at which point every remaining player (marquee or not) becomes eligible again. M=0 is a no-op --
// every pool player is eligible from the start.
export function partitionPoolForAuction(poolPlayers) {
  const marquee = poolPlayers.filter((p) => p.marquee);
  const holdWindow = marquee.length * 2;

  if (poolPlayers.length <= holdWindow) {
    return { eligible: poolPlayers, heldBack: [], holdWindow };
  }

  const regular = poolPlayers.filter((p) => !p.marquee);
  return { eligible: regular, heldBack: marquee, holdWindow };
}

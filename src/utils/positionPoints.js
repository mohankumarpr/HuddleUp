// Pure, unit-testable: turns a points-by-position scale (e.g. 1st=5, 2nd=3, 3rd=1) plus each
// team's assigned position into a final points-per-team map. Any team with no position assigned
// gets 0 -- "the rest all become 0", per how this is meant to be used.
//
// Ties: when several teams share one position, they split the sum of that many CONSECUTIVE
// scale values starting at that position, not just the one value for that position alone. Two
// teams tied for 1st (scale 5,3,1) get (5+3)/2 = 4 each -- they're jointly occupying ranks 1 and
// 2, so nobody else can also be "2nd". Two teams tied for 2nd get (3+1)/2 = 2 each, consuming
// ranks 2 and 3. A rank past the end of the scale (e.g. a 3-value scale asked for rank 4) is 0.
export function computePositionPoints(scale, positions) {
  const groups = {};
  Object.entries(positions || {}).forEach(([teamId, pos]) => {
    const p = Number(pos);
    if (!Number.isFinite(p) || p < 1) return;
    (groups[p] = groups[p] || []).push(teamId);
  });

  const points = {};
  Object.entries(groups).forEach(([posKey, teamIds]) => {
    const pos = Number(posKey);
    const k = teamIds.length;
    let sum = 0;
    for (let i = 0; i < k; i += 1) sum += Number(scale[pos - 1 + i]) || 0;
    const share = sum / k;
    teamIds.forEach((id) => {
      points[id] = share;
    });
  });

  return points;
}

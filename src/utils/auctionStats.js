// Pure, unit-testable: turns the raw players array into the numbers organizers/teams/spectators
// want to see live during an auction -- how many are left, how much has moved, and the headline sale.
export function computeAuctionStats(players) {
  const sold = (players || []).filter((p) => p.status === "sold");
  const unsold = (players || []).filter((p) => p.status === "unsold");
  const pool = (players || []).filter((p) => p.status === "pool");

  const totalSpent = sold.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
  const avgSale = sold.length ? Math.round(totalSpent / sold.length) : 0;
  const highest = sold.reduce(
    (best, p) => (!best || (p.soldPrice || 0) > best.price ? { name: p.name, price: p.soldPrice || 0 } : best),
    null
  );

  return {
    soldCount: sold.length,
    unsoldCount: unsold.length,
    poolCount: pool.length,
    totalSpent,
    avgSale,
    highest,
  };
}

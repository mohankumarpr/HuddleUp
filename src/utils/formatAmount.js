// Formats a rupee amount the way it's actually read aloud on an Indian auction floor -- "50
// lakhs", "1.25 crore", "5 crore" -- instead of a wall of zeros that's easy to miscount under
// time pressure while bidding is live. Only kicks in at lakh scale and above; anything smaller
// (a demo purse, a bid increment, a reserve price typed in plain rupees) is shown as-is so small
// numbers don't get a misleading "0.01 lakhs"-style label.
const LAKH = 100000;
const CRORE = 10000000;

function trimDecimals(value) {
  return (Math.round(value * 100) / 100).toString();
}

export function formatAmount(amount) {
  if (!Number.isFinite(Number(amount))) return String(amount);
  const n = Math.round(Number(amount) || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs < LAKH) return String(n);

  if (abs >= CRORE) {
    return `${sign}${trimDecimals(abs / CRORE)} crore`;
  }
  const lakhs = trimDecimals(abs / LAKH);
  return `${sign}${lakhs} lakh${lakhs === "1" ? "" : "s"}`;
}

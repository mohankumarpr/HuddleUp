// "2026-01-03T09:30" (from a datetime-local input) -> "3 Jan 2026, 9:30 AM". Empty -> "".
export function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Scheduled sports first (soonest first), unscheduled ones after, by their configured order.
export function sortSportsBySchedule(sports) {
  return [...sports].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return (a.order || 0) - (b.order || 0);
  });
}

export function participantsLabel(sport) {
  const parts = [];
  if (sport.playersPerTeam != null) parts.push(`${sport.playersPerTeam} per team`);
  if (sport.maxParticipants != null) parts.push(`max ${sport.maxParticipants} total`);
  return parts.join(" · ");
}

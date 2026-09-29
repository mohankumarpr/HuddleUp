import { toCsv } from "./download";

// Pure: one row per player, with their final auction outcome and (if sold) who bought them and
// for how much -- the record organizers actually want after the event is done.
export function buildResultsCsv({ players, teams, sports, privateById = {} }) {
  const teamName = (id) => teams.find((t) => t.id === id)?.name || "";
  const sportNames = (ids) =>
    (ids || [])
      .map((id) => sports.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join("; ");

  const headers = ["Name", "Status", "Team", "Sold Price", "Base Price", "Sports", "Gender", "Email", "Contact"];
  const rows = players.map((p) => {
    const priv = privateById[p.id] || {};
    return [
      p.name,
      p.status,
      p.status === "sold" ? teamName(p.soldTeamId) : "",
      p.status === "sold" ? p.soldPrice : "",
      p.basePrice,
      sportNames(p.sportIds),
      p.gender || "",
      priv.email || "",
      priv.contact || "",
    ];
  });

  return toCsv(headers, rows);
}

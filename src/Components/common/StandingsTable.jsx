import React from "react";
import { Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { computeStandings } from "../../utils/firebase/results";

const MEDAL = { 1: "#F59E0B", 2: "#94A3B8", 3: "#B45309" };

// Team standings from manually entered points. With `sports` + `showBreakdown` it also lists the
// points each team earned per sport.
export default function StandingsTable({ teams, results, sports = [], showBreakdown = false }) {
  const rows = computeStandings(teams, results);
  const scoredSports = showBreakdown ? sports.filter((s) => results?.[s.id]) : [];
  const anyPoints = rows.some((r) => Object.keys(r.perSport).length > 0);

  if (!teams.length) {
    return (
      <Typography color="text.secondary" variant="body2">
        No teams yet.
      </Typography>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={56}>#</TableCell>
              <TableCell>Team</TableCell>
              {scoredSports.map((s) => (
                <TableCell key={s.id} align="right">
                  {s.name}
                </TableCell>
              ))}
              <TableCell align="right">Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.team.id} hover>
                <TableCell>
                  {anyPoints && MEDAL[row.rank] ? (
                    <EmojiEventsIcon fontSize="small" sx={{ color: MEDAL[row.rank], verticalAlign: "middle" }} />
                  ) : (
                    row.rank
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: row.team.color, flexShrink: 0 }} />
                    <Typography fontWeight={600}>{row.team.name}</Typography>
                  </Box>
                </TableCell>
                {scoredSports.map((s) => (
                  <TableCell key={s.id} align="right">
                    {row.perSport[s.id] ?? "–"}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Chip size="small" color={anyPoints && row.rank === 1 ? "primary" : "default"} label={row.total} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!anyPoints && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          No points recorded yet.
        </Typography>
      )}
    </Box>
  );
}

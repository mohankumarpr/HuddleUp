import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { subscribeToEvent, subscribeToSports, subscribeToTeams } from "../../utils/firebase/events";
import { subscribeToPlayers } from "../../utils/firebase/players";
import { subscribeToResults, subscribeToSportStats } from "../../utils/firebase/results";
import { formatDate } from "../../utils/format";
import StandingsTable from "../common/StandingsTable";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

// A printable, shareable wrap-up: final standings plus every team's roster and spend. Meant to be
// opened once the event (or at least the auction) is over and printed or saved as a PDF via the
// browser's print dialog -- see the .print-hide/.MuiAppBar-root rules in App.css for what's
// stripped out of the printed page.
export default function EventResults() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [teams, setTeams] = useState(null);
  const [sports, setSports] = useState(null);
  const [players, setPlayers] = useState(null);
  const [results, setResults] = useState({});
  const [stats, setStats] = useState({});

  useEffect(() => {
    const unsubs = [
      subscribeToEvent(eventId, setEvent),
      subscribeToTeams(eventId, setTeams),
      subscribeToSports(eventId, setSports),
      subscribeToPlayers(eventId, setPlayers),
      subscribeToResults(eventId, setResults, () => setResults({})),
      subscribeToSportStats(eventId, setStats, () => setStats({})),
    ];
    return () => unsubs.forEach((u) => u());
  }, [eventId]);

  const rosterByTeam = useMemo(() => {
    const byTeam = {};
    (players || [])
      .filter((p) => p.status === "sold" && p.soldTeamId)
      .forEach((p) => {
        if (!byTeam[p.soldTeamId]) byTeam[p.soldTeamId] = [];
        byTeam[p.soldTeamId].push(p);
      });
    Object.values(byTeam).forEach((roster) => roster.sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0)));
    return byTeam;
  }, [players]);

  if (!event || !teams || !sports || !players) return <LoadingSpinner />;

  const heroSubtitleParts = [event.eventDate && formatDate(event.eventDate), event.venue].filter(Boolean);

  return (
    <Box>
      <Box className="print-hide">
        <DashboardHero
          title="Final results"
          subtitle={heroSubtitleParts.join(" · ") || event.name}
          image={heroImageFor(event.id)}
          icon={<EmojiEventsIcon />}
          dense
          action={
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
              sx={{ bgcolor: "#fff", color: "primary.dark", "&:hover": { bgcolor: "rgba(255,255,255,0.9)" } }}
            >
              Print / save as PDF
            </Button>
          }
        />
      </Box>

      <Box className="print-only" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          {event.name}
        </Typography>
        <Typography color="text.secondary">{heroSubtitleParts.join(" · ")}</Typography>
        <Typography variant="h6" sx={{ mt: 1 }}>
          Final results
        </Typography>
      </Box>

      <Typography variant="h6" fontWeight={700} gutterBottom>
        Standings
      </Typography>
      <Box sx={{ mb: 4 }}>
        <StandingsTable teams={teams} results={results} sports={sports} showBreakdown statsBySport={stats} />
      </Box>

      <Typography variant="h6" fontWeight={700} gutterBottom>
        Team rosters
      </Typography>
      <Grid container spacing={2}>
        {teams.map((team) => {
          const roster = rosterByTeam[team.id] || [];
          const spent = roster.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
          return (
            <Grid item xs={12} sm={6} md={4} key={team.id} sx={{ breakInside: "avoid" }}>
              <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: team.color, flexShrink: 0 }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>
                    {team.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {roster.length} player{roster.length === 1 ? "" : "s"}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Spent {spent} / {team.purseTotal} · {team.purseRemaining} remaining
                </Typography>
                <Divider sx={{ mb: 1 }} />
                {roster.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No players bought.
                  </Typography>
                ) : (
                  <Stack spacing={0.5}>
                    {roster.map((p) => (
                      <Stack key={p.id} direction="row" justifyContent="space-between">
                        <Typography variant="body2">{p.name}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {p.soldPrice}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

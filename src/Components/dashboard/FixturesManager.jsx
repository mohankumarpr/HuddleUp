import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { useAuth } from "../../context/AuthContext";
import { subscribeToSports, subscribeToTeams } from "../../utils/firebase/events";
import { addFixture, clearFixtures, deleteFixture, generateFixtures, setFixtureWinner, subscribeToFixtures } from "../../utils/firebase/fixtures";
import { logActivity } from "../../utils/firebase/activityLog";
import { computeMatchWins, rankTeamsByWins } from "../../utils/fixtures";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

function AddFixtureDialog({ open, teams, onClose, onSave }) {
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [category, setCategory] = useState("");
  const [matchType, setMatchType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setTeamAId("");
      setTeamBId("");
      setCategory("");
      setMatchType("");
      setError(null);
    }
  }, [open]);

  async function handleSave() {
    if (!teamAId || !teamBId) {
      setError("Pick both teams.");
      return;
    }
    if (teamAId === teamBId) {
      setError("A team can't play itself.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ teamAId, teamBId, category, matchType });
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't add that fixture.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add a fixture</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          For any format that isn't a full round robin -- a knockout round, a Swiss pairing, or just one extra match.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Team A" value={teamAId} onChange={(e) => setTeamAId(e.target.value)} fullWidth>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Team B" value={teamBId} onChange={(e) => setTeamBId(e.target.value)} fullWidth>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Round / category"
            placeholder="e.g. Quarterfinal, Men"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          />
          <TextField
            label="Match type"
            placeholder="e.g. Singles, Final"
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Adding..." : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function FixturesManager() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sports, setSports] = useState(null);
  const [teams, setTeams] = useState(null);
  const [sportId, setSportId] = useState(searchParams.get("sport") || "");
  const [fixtures, setFixtures] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const unsubs = [subscribeToSports(eventId, setSports), subscribeToTeams(eventId, setTeams)];
    return () => unsubs.forEach((u) => u());
  }, [eventId]);

  useEffect(() => {
    if (!sportId && sports?.length) setSportId(sports[0].id);
  }, [sports, sportId]);

  useEffect(() => {
    if (!sportId) {
      setFixtures(null);
      return undefined;
    }
    return subscribeToFixtures(eventId, sportId, setFixtures);
  }, [eventId, sportId]);

  const sport = (sports || []).find((s) => s.id === sportId);
  const canAutoGenerate = Boolean(sport?.matchFormat?.categories?.length);

  const pairings = useMemo(() => {
    if (!fixtures || !teams) return [];
    const groups = new Map();
    fixtures.forEach((f) => {
      const key = `${f.teamAId}_${f.teamBId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    });
    return Array.from(groups.entries()).map(([key, matches]) => {
      const [teamAId, teamBId] = key.split("_");
      matches.sort((a, b) => a.category.localeCompare(b.category) || a.matchIndex - b.matchIndex);
      return {
        key,
        teamA: teams.find((t) => t.id === teamAId),
        teamB: teams.find((t) => t.id === teamBId),
        matches,
      };
    });
  }, [fixtures, teams]);

  const wins = useMemo(() => computeMatchWins(fixtures || [], (teams || []).map((t) => t.id)), [fixtures, teams]);
  const ranking = useMemo(() => rankTeamsByWins(wins, (teams || []).map((t) => t.id)), [wins, teams]);
  const completedCount = (fixtures || []).filter((f) => f.winnerId).length;

  async function run(action) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    await run(async () => {
      const count = await generateFixtures(eventId, sport, teams);
      setMessage(`Generated ${count} fixtures for ${sport.name}.`);
    });
  }

  async function handleClear() {
    if (!window.confirm(`Clear all fixtures for ${sport.name}? Every recorded result will be lost.`)) return;
    await run(async () => {
      await clearFixtures(eventId, sportId);
      logActivity(eventId, { actorUid: user.uid, action: "fixtures_cleared", summary: `Cleared fixtures for ${sport.name}` });
    });
  }

  async function handleDeleteFixture(fixtureId) {
    if (!window.confirm("Remove this fixture? Its recorded result will be lost.")) return;
    await run(() => deleteFixture(eventId, fixtureId));
  }

  function sendRankingToStandings() {
    // Only 1st/2nd/3rd matter to the points calculator -- anything ranked 4th or worse is left
    // out entirely, which the calculator already treats as "rest" (0 points).
    const positions = {};
    Object.entries(ranking).forEach(([teamId, pos]) => {
      if (pos <= 3) positions[teamId] = String(pos);
    });
    navigate(`/app/events/${eventId}/standings`, { state: { fixtureRanking: { sportId, positions } } });
  }

  if (!sports || !teams) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <DashboardHero
        title="Fixtures"
        subtitle="Generate a round robin, or add matches one at a time for any other format."
        image={heroImageFor("fixtures")}
        icon={<EmojiEventsIcon />}
        dense
      />

      {sports.length === 0 ? (
        <Alert severity="info">Add a sport first.</Alert>
      ) : teams.length < 2 ? (
        <Alert severity="info">Add at least 2 teams first.</Alert>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            select
            size="small"
            label="Sport"
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            sx={{ mb: 3, minWidth: 220 }}
          >
            {sports.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          {fixtures === null ? (
            <LoadingSpinner />
          ) : fixtures.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                No fixtures yet for {sport.name}.
                {canAutoGenerate
                  ? ` Generating creates every team-vs-team pairing, each playing ${sport.matchFormat.categories
                      .map((c) => `${c.name} (${c.matchTypes.join(", ")})`)
                      .join(" and ")}.`
                  : " This sport has no match format configured for a round robin -- add fixtures one at a time instead, in whatever shape your format needs (e.g. a knockout round)."}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center">
                {canAutoGenerate && (
                  <Button variant="contained" disabled={busy} onClick={handleGenerate}>
                    Generate round robin
                  </Button>
                )}
                <Button variant={canAutoGenerate ? "outlined" : "contained"} startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                  Add fixture
                </Button>
              </Stack>
            </Paper>
          ) : (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2, gap: 1 }}>
                <Chip label={`${completedCount} / ${fixtures.length} matches recorded`} color={completedCount === fixtures.length ? "success" : "default"} />
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                    Add fixture
                  </Button>
                  {canAutoGenerate && (
                    <Button size="small" color="error" disabled={busy} onClick={handleClear}>
                      Clear &amp; regenerate
                    </Button>
                  )}
                </Stack>
              </Stack>

              <Stack spacing={1.5} sx={{ mb: 4 }}>
                {pairings.map(({ key, teamA, teamB, matches }) => {
                  if (!teamA || !teamB) return null;
                  const done = matches.filter((m) => m.winnerId).length;
                  return (
                    <Accordion key={key} variant="outlined" disableGutters>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", pr: 2 }}>
                          <Typography fontWeight={600}>
                            {teamA.name} vs {teamB.name}
                          </Typography>
                          <Chip size="small" label={`${done} / ${matches.length}`} />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={1.5}>
                          {matches.map((m) => (
                            <Stack
                              key={m.id}
                              direction={{ xs: "column", sm: "row" }}
                              justifyContent="space-between"
                              alignItems={{ sm: "center" }}
                              spacing={1}
                            >
                              <Typography variant="body2" color="text.secondary">
                                {[m.category, m.matchType].filter(Boolean).join(" · ") || "Match"}
                                {m.matchIndex > 0 ? ` #${m.matchIndex + 1}` : ""}
                              </Typography>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <ToggleButtonGroup
                                  size="small"
                                  exclusive
                                  value={m.winnerId}
                                  onChange={(e, value) => run(() => setFixtureWinner(eventId, m.id, value))}
                                >
                                  <ToggleButton value={teamA.id}>{teamA.name}</ToggleButton>
                                  <ToggleButton value={teamB.id}>{teamB.name}</ToggleButton>
                                </ToggleButtonGroup>
                                <IconButton size="small" onClick={() => handleDeleteFixture(m.id)} aria-label="Remove fixture">
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Stack>
                          ))}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Stack>

              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Match wins
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Team</TableCell>
                      <TableCell align="center">Wins</TableCell>
                      <TableCell align="center">Rank</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...teams]
                      .sort((a, b) => (ranking[a.id] || 99) - (ranking[b.id] || 99))
                      .map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: t.color }} />
                              <span>{t.name}</span>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">{wins[t.id] || 0}</TableCell>
                          <TableCell align="center">{ranking[t.id] <= 3 ? `#${ranking[t.id]}` : "—"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button variant="contained" disabled={completedCount === 0} onClick={sendRankingToStandings}>
                Send ranking to Standings
              </Button>
            </>
          )}

          <AddFixtureDialog
            open={addOpen}
            teams={teams}
            onClose={() => setAddOpen(false)}
            onSave={(data) => addFixture(eventId, { sportId, ...data })}
          />
        </>
      )}

      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage(null)} message={message} />
    </Box>
  );
}

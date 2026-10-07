import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Divider,
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
  Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { subscribeToSports, subscribeToTeams } from "../../utils/firebase/events";
import { saveResults, saveSportStats, subscribeToResults, subscribeToSportStats } from "../../utils/firebase/results";
import { sortSportsBySchedule } from "../../utils/format";
import { computePositionPoints } from "../../utils/positionPoints";
import StandingsTable from "../common/StandingsTable";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

const STAT_FIELDS = ["played", "won", "drawn", "lost"];
const POSITION_LABELS = { 1: "1st", 2: "2nd", 3: "3rd" };

export default function StandingsManager() {
  const { eventId } = useParams();
  const location = useLocation();
  const [sports, setSports] = useState(null);
  const [teams, setTeams] = useState(null);
  const [saved, setSaved] = useState(null); // results as stored: { sportId: { teamId: n } }
  const [draft, setDraft] = useState({}); // edits not yet saved: { sportId: { teamId: value } }
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Position-based scoring calculator -- not itself persisted; it just computes numbers and fills
  // them into `draft` via the same `edit()` the manual grid below uses, so publishing still goes
  // through the one existing save path.
  const [posSportId, setPosSportId] = useState("");
  const [posScale, setPosScale] = useState(["", "", ""]); // [1st, 2nd, 3rd]
  const [positions, setPositions] = useState({}); // { teamId: "1" | "2" | "3" | "" }

  // Match record (played/won/drawn/lost) -- optional. `statsSportId` only controls which sport's
  // grid is VISIBLE; the draft itself is keyed by sport (like `draft` above) so switching which
  // one you're looking at never discards edits to another sport.
  const [savedStats, setSavedStats] = useState(null); // { sportId: { teamId: {played,won,drawn,lost} } }
  const [statsSportId, setStatsSportId] = useState("");
  const [statsDraft, setStatsDraft] = useState({}); // { sportId: { teamId: { field: value } } }
  const [savingStats, setSavingStats] = useState(false);

  useEffect(() => {
    const unsubs = [
      subscribeToSports(eventId, setSports),
      subscribeToTeams(eventId, setTeams),
      subscribeToResults(eventId, setSaved, () => {
        setSaved({});
        setError("Couldn't load saved points. Make sure the latest Firestore rules are published.");
      }),
      subscribeToSportStats(eventId, setSavedStats, () => setSavedStats({})),
    ];
    return () => unsubs.forEach((u) => u());
  }, [eventId]);

  const orderedSports = useMemo(() => sortSportsBySchedule(sports || []), [sports]);

  useEffect(() => {
    if (!statsSportId && orderedSports.length) setStatsSportId(orderedSports[0].id);
  }, [orderedSports, statsSportId]);

  useEffect(() => {
    if (!posSportId && orderedSports.length) setPosSportId(orderedSports[0].id);
  }, [orderedSports, posSportId]);

  // Arriving from Fixtures' "Send ranking to Standings" -- pre-fill the calculator with the
  // match-win ranking it computed, so the organizer only has to set the point scale and apply.
  useEffect(() => {
    const ranking = location.state?.fixtureRanking;
    if (!ranking) return;
    setPosSportId(ranking.sportId);
    setPositions(ranking.positions);
    setMessage("Ranking imported from Fixtures -- set the point scale below and click \"Apply to points table\".");
  }, [location.state]);

  // What each input shows: the unsaved edit if there is one, otherwise the stored value.
  const valueOf = (sportId, teamId) => {
    if (draft[sportId] && teamId in draft[sportId]) return draft[sportId][teamId];
    const stored = saved?.[sportId]?.[teamId];
    return stored === undefined ? "" : stored;
  };

  // The merged view used for the live totals below the table.
  const merged = useMemo(() => {
    const out = {};
    (sports || []).forEach((s) => {
      const row = { ...(saved?.[s.id] || {}) };
      Object.entries(draft[s.id] || {}).forEach(([teamId, v]) => {
        if (v === "" || v == null) delete row[teamId];
        else row[teamId] = Number(v);
      });
      if (Object.keys(row).length) out[s.id] = row;
    });
    return out;
  }, [sports, saved, draft]);

  const dirtySportIds = Object.keys(draft).filter((id) => Object.keys(draft[id]).length > 0);

  function edit(sportId, teamId, value) {
    setDraft((d) => ({ ...d, [sportId]: { ...(d[sportId] || {}), [teamId]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const matrix = {};
      dirtySportIds.forEach((sportId) => {
        const row = {};
        teams.forEach((t) => {
          const v = valueOf(sportId, t.id);
          if (v !== "") row[t.id] = v;
        });
        matrix[sportId] = row;
      });
      await saveResults(eventId, matrix, dirtySportIds);
      setDraft({});
      setMessage("Standings saved");
    } catch (err) {
      setError(err.message || "Couldn't save the standings.");
    } finally {
      setSaving(false);
    }
  }

  const scaleNumbers = useMemo(() => posScale.map((v) => Number(v) || 0), [posScale]);
  const computedPositionPoints = useMemo(
    () => computePositionPoints(scaleNumbers, positions),
    [scaleNumbers, positions]
  );
  const anyPositionSet = Object.values(positions).some((v) => v);

  function setTeamPosition(teamId, value) {
    setPositions((p) => ({ ...p, [teamId]: value }));
  }

  // Fills every team's points for this sport -- the assigned ones from the computed podium split,
  // everyone else explicitly 0 ("the rest all become 0") -- into the manual grid's own draft, so
  // publishing still goes through the one existing "Save points" button.
  function applyPositionPoints() {
    teams.forEach((t) => {
      const value = computedPositionPoints[t.id];
      edit(posSportId, t.id, value != null ? String(value) : "0");
    });
    setMessage(`Points filled in for ${orderedSports.find((s) => s.id === posSportId)?.name} -- click "Save points" to publish.`);
  }

  // Match record (played/won/drawn/lost) for whichever sport is currently selected in the dropdown.
  const statsValueOf = (sportId, teamId, field) => {
    if (statsDraft[sportId]?.[teamId] && field in statsDraft[sportId][teamId]) return statsDraft[sportId][teamId][field];
    const stored = savedStats?.[sportId]?.[teamId]?.[field];
    return stored === undefined ? "" : stored;
  };

  const statsDirtySportIds = Object.keys(statsDraft).filter(
    (id) => Object.values(statsDraft[id] || {}).some((row) => Object.keys(row || {}).length > 0)
  );

  function editStats(sportId, teamId, field, value) {
    setStatsDraft((d) => ({
      ...d,
      [sportId]: { ...(d[sportId] || {}), [teamId]: { ...(d[sportId]?.[teamId] || {}), [field]: value } },
    }));
  }

  async function handleSaveStats() {
    setSavingStats(true);
    setError(null);
    try {
      const statsBySport = {};
      statsDirtySportIds.forEach((sportId) => {
        const row = {};
        teams.forEach((t) => {
          const entry = {};
          STAT_FIELDS.forEach((field) => {
            const v = statsValueOf(sportId, t.id, field);
            if (v !== "") entry[field] = v;
          });
          if (Object.keys(entry).length) row[t.id] = entry;
        });
        statsBySport[sportId] = row;
      });
      await saveSportStats(eventId, statsBySport, statsDirtySportIds);
      setStatsDraft({});
      setMessage("Match record saved");
    } catch (err) {
      setError(err.message || "Couldn't save the match record.");
    } finally {
      setSavingStats(false);
    }
  }

  if (!sports || !teams || saved === null || savedStats === null) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <DashboardHero
        title="Standings"
        subtitle="Enter the points each team earned in each sport -- players logged into the portal see these too."
        image={heroImageFor("standings")}
        icon={<EmojiEventsIcon />}
        dense
      />
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 2 }}>
        <Button disabled={!dirtySportIds.length || saving} onClick={() => setDraft({})}>
          Discard
        </Button>
        <Button variant="contained" disabled={!dirtySportIds.length || saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save points"}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {teams.length === 0 || sports.length === 0 ? (
        <Alert severity="info">Add at least one team and one sport first.</Alert>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <MilitaryTechIcon color="primary" fontSize="small" />
              <Typography variant="h6">Set points by position</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set how many points 1st/2nd/3rd place earn, assign each team's finish, and everyone else gets 0. Give two
              teams the same position to split it between them -- e.g. two teams tied for 1st (5/3/1 scale) each get
              (5+3)/2 = 4, and the next team is still "3rd" for 1 point.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
              <TextField
                select
                size="small"
                label="Sport"
                value={posSportId}
                onChange={(e) => setPosSportId(e.target.value)}
                sx={{ minWidth: 220 }}
              >
                {orderedSports.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
              {[1, 2, 3].map((pos, i) => (
                <TextField
                  key={pos}
                  size="small"
                  type="number"
                  label={`${POSITION_LABELS[pos]} place points`}
                  value={posScale[i]}
                  onChange={(e) => setPosScale((s) => s.map((v, idx) => (idx === i ? e.target.value : v)))}
                  sx={{ width: 160 }}
                />
              ))}
            </Stack>

            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Team</TableCell>
                    <TableCell align="center">Finish</TableCell>
                    <TableCell align="right">Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teams.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: t.color }} />
                          <span>{t.name}</span>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          select
                          size="small"
                          value={positions[t.id] || ""}
                          onChange={(e) => setTeamPosition(t.id, e.target.value)}
                          sx={{ minWidth: 90 }}
                          SelectProps={{ displayEmpty: true, "aria-label": `Finish position for ${t.name}` }}
                        >
                          <MenuItem value="">— (rest)</MenuItem>
                          <MenuItem value="1">1st</MenuItem>
                          <MenuItem value="2">2nd</MenuItem>
                          <MenuItem value="3">3rd</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell align="right">{computedPositionPoints[t.id] ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" spacing={1}>
              <Button disabled={!anyPositionSet} onClick={() => setPositions({})}>
                Clear finishes
              </Button>
              <Button variant="contained" onClick={applyPositionPoints}>
                Apply to points table
              </Button>
            </Stack>
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Sport</TableCell>
                  {teams.map((t) => (
                    <TableCell key={t.id} align="center">
                      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.75}>
                        <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: t.color }} />
                        <span>{t.name}</span>
                      </Stack>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {orderedSports.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                    {teams.map((t) => (
                      <TableCell key={t.id} align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={valueOf(s.id, t.id)}
                          onChange={(e) => edit(s.id, t.id, e.target.value)}
                          inputProps={{ "aria-label": `${s.name} points for ${t.name}`, style: { textAlign: "center", width: 70 } }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Leaderboard{dirtySportIds.length ? " (unsaved changes included)" : ""}
          </Typography>
          <StandingsTable teams={teams} results={merged} sports={orderedSports} statsBySport={savedStats} showBreakdown />

          <Divider sx={{ my: 4 }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">Match record (optional)</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                disabled={!statsDirtySportIds.length || savingStats}
                onClick={() => setStatsDraft((d) => ({ ...d, [statsSportId]: {} }))}
              >
                Discard
              </Button>
              <Button variant="contained" disabled={!statsDirtySportIds.length || savingStats} onClick={handleSaveStats}>
                {savingStats ? "Saving..." : "Save match record"}
              </Button>
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            For team-vs-team sports, track played/won/drawn/lost per team. Skip this for individual-format sports where
            it doesn't apply -- it's shown alongside points wherever standings appear, but never affects ranking.
            Switching sports below keeps every sport's unsaved edits; "Save match record" saves all of them at once.
          </Typography>
          <TextField
            select
            size="small"
            label="Sport"
            value={statsSportId}
            onChange={(e) => setStatsSportId(e.target.value)}
            sx={{ mb: 2, minWidth: 220 }}
          >
            {orderedSports.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
                {statsDirtySportIds.includes(s.id) ? " *" : ""}
              </MenuItem>
            ))}
          </TextField>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Team</TableCell>
                  <TableCell align="center">Played</TableCell>
                  <TableCell align="center">Won</TableCell>
                  <TableCell align="center">Drawn</TableCell>
                  <TableCell align="center">Lost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                    {STAT_FIELDS.map((field) => (
                      <TableCell key={field} align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={statsValueOf(statsSportId, t.id, field)}
                          onChange={(e) => editStats(statsSportId, t.id, field, e.target.value)}
                          inputProps={{ "aria-label": `${field} for ${t.name}`, style: { textAlign: "center", width: 70 } }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage(null)} message={message} />
    </Box>
  );
}

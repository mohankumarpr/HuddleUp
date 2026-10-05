import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
import { subscribeToSports, subscribeToTeams } from "../../utils/firebase/events";
import { saveResults, saveSportStats, subscribeToResults, subscribeToSportStats } from "../../utils/firebase/results";
import { sortSportsBySchedule } from "../../utils/format";
import StandingsTable from "../common/StandingsTable";
import LoadingSpinner from "../LoadingSpinner";

const STAT_FIELDS = ["played", "won", "drawn", "lost"];

export default function StandingsManager() {
  const { eventId } = useParams();
  const [sports, setSports] = useState(null);
  const [teams, setTeams] = useState(null);
  const [saved, setSaved] = useState(null); // results as stored: { sportId: { teamId: n } }
  const [draft, setDraft] = useState({}); // edits not yet saved: { sportId: { teamId: value } }
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Match record (played/won/drawn/lost) -- optional, edited one sport at a time.
  const [savedStats, setSavedStats] = useState(null); // { sportId: { teamId: {played,won,drawn,lost} } }
  const [statsSportId, setStatsSportId] = useState("");
  const [statsDraft, setStatsDraft] = useState({}); // { teamId: { field: value } }, for statsSportId only
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

  // Match record (played/won/drawn/lost), edited one sport at a time.
  const statsValueOf = (teamId, field) => {
    if (statsDraft[teamId] && field in statsDraft[teamId]) return statsDraft[teamId][field];
    const stored = savedStats?.[statsSportId]?.[teamId]?.[field];
    return stored === undefined ? "" : stored;
  };

  const statsDirty = Object.values(statsDraft).some((row) => Object.keys(row || {}).length > 0);

  function editStats(teamId, field, value) {
    setStatsDraft((d) => ({ ...d, [teamId]: { ...(d[teamId] || {}), [field]: value } }));
  }

  async function handleSaveStats() {
    setSavingStats(true);
    setError(null);
    try {
      const row = {};
      teams.forEach((t) => {
        const entry = {};
        STAT_FIELDS.forEach((field) => {
          const v = statsValueOf(t.id, field);
          if (v !== "") entry[field] = v;
        });
        if (Object.keys(entry).length) row[t.id] = entry;
      });
      await saveSportStats(eventId, statsSportId, row);
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Standings
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button disabled={!dirtySportIds.length || saving} onClick={() => setDraft({})}>
            Discard
          </Button>
          <Button variant="contained" disabled={!dirtySportIds.length || saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save points"}
          </Button>
        </Stack>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter the points each team earned in each sport. Players logged in to the event portal see these standings.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {teams.length === 0 || sports.length === 0 ? (
        <Alert severity="info">Add at least one team and one sport first.</Alert>
      ) : (
        <>
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
              <Button disabled={!statsDirty || savingStats} onClick={() => setStatsDraft({})}>
                Discard
              </Button>
              <Button variant="contained" disabled={!statsDirty || savingStats} onClick={handleSaveStats}>
                {savingStats ? "Saving..." : "Save match record"}
              </Button>
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            For team-vs-team sports, track played/won/drawn/lost per team. Skip this for individual-format sports where
            it doesn't apply -- it's shown alongside points wherever standings appear, but never affects ranking.
          </Typography>
          <TextField
            select
            size="small"
            label="Sport"
            value={statsSportId}
            onChange={(e) => {
              if (statsDirty && !window.confirm("Discard unsaved match-record changes for this sport?")) return;
              setStatsDraft({});
              setStatsSportId(e.target.value);
            }}
            sx={{ mb: 2, minWidth: 220 }}
          >
            {orderedSports.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
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
                          value={statsValueOf(t.id, field)}
                          onChange={(e) => editStats(t.id, field, e.target.value)}
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

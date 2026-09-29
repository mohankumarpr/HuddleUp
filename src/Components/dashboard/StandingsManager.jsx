import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
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
import { saveResults, subscribeToResults } from "../../utils/firebase/results";
import { sortSportsBySchedule } from "../../utils/format";
import StandingsTable from "../common/StandingsTable";
import LoadingSpinner from "../LoadingSpinner";

export default function StandingsManager() {
  const { eventId } = useParams();
  const [sports, setSports] = useState(null);
  const [teams, setTeams] = useState(null);
  const [saved, setSaved] = useState(null); // results as stored: { sportId: { teamId: n } }
  const [draft, setDraft] = useState({}); // edits not yet saved: { sportId: { teamId: value } }
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubs = [
      subscribeToSports(eventId, setSports),
      subscribeToTeams(eventId, setTeams),
      subscribeToResults(eventId, setSaved, () => {
        setSaved({});
        setError("Couldn't load saved points. Make sure the latest Firestore rules are published.");
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [eventId]);

  const orderedSports = useMemo(() => sortSportsBySchedule(sports || []), [sports]);

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

  if (!sports || !teams || saved === null) return <LoadingSpinner />;

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
          <StandingsTable teams={teams} results={merged} sports={orderedSports} showBreakdown />
        </>
      )}

      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage(null)} message={message} />
    </Box>
  );
}

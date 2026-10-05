import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import PersonIcon from "@mui/icons-material/Person";
import {
  createTeam,
  deleteTeam,
  getTeamOwners,
  randomDigits,
  saveTeamDetails,
  subscribeToEvent,
  subscribeToTeams,
  updateTeam,
} from "../../utils/firebase/events";
import QrCodeButton from "../common/QrCodeButton";
import LoadingSpinner from "../LoadingSpinner";

const GENDER_ICON = { male: <MaleIcon />, female: <FemaleIcon />, other: <PersonIcon /> };
const DEFAULT_COLORS = ["#e53935", "#1e88e5", "#43a047", "#fb8c00", "#8e24aa", "#00897b", "#f4511e", "#3949ab"];

let ownerCounter = 0;
const blankOwner = () => ({ id: `new${Date.now()}-${ownerCounter++}`, name: "", gender: "", contact: "" });

function TeamDialog({ open, team, defaultPurse, colorIndex, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", purseTotal: "", color: "#6366f1", owners: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (team) {
      const owners = getTeamOwners(team).map((o) => ({ ...o }));
      setForm({ name: team.name, purseTotal: team.purseTotal ?? "", color: team.color || "#6366f1", owners: owners.length ? owners : [blankOwner()] });
    } else {
      setForm({ name: "", purseTotal: defaultPurse ?? "", color: DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length], owners: [blankOwner()] });
    }
  }, [open, team, defaultPurse, colorIndex]);

  const setOwner = (id, key, value) =>
    setForm((f) => ({ ...f, owners: f.owners.map((o) => (o.id === id ? { ...o, [key]: value } : o)) }));

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Team name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save the team.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{team ? `Edit ${team.name}` : "Add a team"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={2}>
            <TextField
              label="Team name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Colour"
              type="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              sx={{ width: 110 }}
            />
          </Stack>
          <TextField
            label="Starting purse"
            type="number"
            value={form.purseTotal}
            onChange={(e) => setForm((f) => ({ ...f, purseTotal: e.target.value }))}
            helperText={team ? "Changing this moves the remaining purse by the same amount." : undefined}
            fullWidth
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Owners / captains
            </Typography>
            <Stack spacing={1.5}>
              {form.owners.map((owner, i) => (
                <Stack key={owner.id} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                  <TextField
                    label={`Name ${i + 1}`}
                    size="small"
                    value={owner.name}
                    onChange={(e) => setOwner(owner.id, "name", e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Gender"
                    size="small"
                    select
                    value={owner.gender}
                    onChange={(e) => setOwner(owner.id, "gender", e.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="">—</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </TextField>
                  <TextField
                    label="Contact"
                    size="small"
                    value={owner.contact}
                    onChange={(e) => setOwner(owner.id, "contact", e.target.value)}
                    fullWidth
                  />
                  <IconButton
                    size="small"
                    aria-label="Remove owner"
                    onClick={() => setForm((f) => ({ ...f, owners: f.owners.filter((o) => o.id !== owner.id) }))}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Button size="small" startIcon={<AddIcon />} sx={{ mt: 1 }} onClick={() => setForm((f) => ({ ...f, owners: [...f.owners, blankOwner()] }))}>
              Add owner / captain
            </Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function TeamManager() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [teams, setTeams] = useState(null);
  const [dialog, setDialog] = useState({ open: false, team: null });

  useEffect(() => {
    const unsubEvent = subscribeToEvent(eventId, setEvent);
    const unsubTeams = subscribeToTeams(eventId, setTeams);
    return () => {
      unsubEvent();
      unsubTeams();
    };
  }, [eventId]);

  async function handleSave(form) {
    if (dialog.team) {
      await saveTeamDetails(eventId, dialog.team, form);
    } else {
      await createTeam(eventId, form, teams?.length || 0);
    }
  }

  async function handleDelete(team) {
    if (window.confirm(`Delete ${team.name}? This can't be undone.`)) await deleteTeam(eventId, team.id);
  }

  async function resetPin(team) {
    if (window.confirm(`Generate a new join PIN for ${team.name}? Anyone using the old PIN can't join until they get the new one.`)) {
      await updateTeam(eventId, team.id, { joinPin: randomDigits(4) });
    }
  }

  if (!teams || !event) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Teams
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ open: true, team: null })}>
          Add team
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Each team can have any number of owners or captains. The join PIN, together with the event's join code, lets a
        team rep bid live.
      </Typography>

      <Stack spacing={1.5}>
        {teams.length === 0 && <Typography color="text.secondary">No teams added yet.</Typography>}
        {teams.map((team) => {
          const owners = getTeamOwners(team);
          return (
            <Paper key={team.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="flex-start" spacing={2}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: team.color, flexShrink: 0, mt: 0.9 }} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {team.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Purse {team.purseRemaining} / {team.purseTotal}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {owners.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No owners added
                      </Typography>
                    )}
                    {owners.map((o) => (
                      <Chip
                        key={o.id}
                        size="small"
                        variant="outlined"
                        icon={GENDER_ICON[o.gender] || <PersonIcon />}
                        label={o.contact ? `${o.name} · ${o.contact}` : o.name}
                      />
                    ))}
                  </Stack>
                </Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Chip label={`PIN ${team.joinPin}`} size="small" sx={{ fontFamily: "monospace" }} />
                  <QrCodeButton
                    value={`${window.location.origin}/e/${event.slug}/join?code=${event.joinCode}&team=${team.id}&pin=${team.joinPin}`}
                    label={`${team.name} join QR`}
                  />
                  <Tooltip title="Generate a new PIN">
                    <IconButton size="small" onClick={() => resetPin(team)} aria-label={`Reset PIN for ${team.name}`}>
                      <AutorenewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => setDialog({ open: true, team })} aria-label={`Edit ${team.name}`}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(team)} aria-label={`Delete ${team.name}`}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <TeamDialog
        open={dialog.open}
        team={dialog.team}
        defaultPurse={event.purseDefault}
        colorIndex={teams.length}
        onClose={() => setDialog({ open: false, team: null })}
        onSave={handleSave}
      />
    </Box>
  );
}

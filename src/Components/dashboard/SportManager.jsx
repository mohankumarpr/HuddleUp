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
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import GroupsIcon from "@mui/icons-material/Groups";
import GavelIcon from "@mui/icons-material/Gavel";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import { createSport, deleteSport, subscribeToSports, updateSport } from "../../utils/firebase/events";
import { formatDateTime, participantsLabel } from "../../utils/format";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

const EMPTY = { name: "", description: "", date: "", venue: "", rules: "", playersPerTeam: "", maxParticipants: "", active: true };

function SportDialog({ open, sport, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(
        sport
          ? {
              name: sport.name || "",
              description: sport.description || "",
              date: sport.date || "",
              venue: sport.venue || "",
              rules: sport.rules || "",
              playersPerTeam: sport.playersPerTeam ?? "",
              maxParticipants: sport.maxParticipants ?? "",
              active: sport.active !== false,
            }
          : EMPTY
      );
      setError(null);
    }
  }, [open, sport]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Sport name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save the sport.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{sport ? `Edit ${sport.name}` : "Add a sport"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Sport name" value={form.name} onChange={set("name")} required autoFocus fullWidth />
          <TextField label="Description" value={form.description} onChange={set("description")} multiline minRows={2} fullWidth />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Date & time"
              type="datetime-local"
              value={form.date}
              onChange={set("date")}
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty until it's scheduled"
              fullWidth
            />
            <TextField label="Venue" value={form.venue} onChange={set("venue")} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Players per team"
              type="number"
              value={form.playersPerTeam}
              onChange={set("playersPerTeam")}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="Max total participants"
              type="number"
              value={form.maxParticipants}
              onChange={set("maxParticipants")}
              inputProps={{ min: 0 }}
              fullWidth
            />
          </Stack>
          <TextField label="Rules" value={form.rules} onChange={set("rules")} multiline minRows={4} fullWidth />
          {sport && (
            <FormControlLabel
              control={<Switch checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />}
              label="Open for registration"
            />
          )}
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

export default function SportManager() {
  const { eventId } = useParams();
  const [sports, setSports] = useState(null);
  const [dialog, setDialog] = useState({ open: false, sport: null });

  useEffect(() => subscribeToSports(eventId, setSports), [eventId]);

  async function handleSave(form) {
    const data = {
      name: form.name,
      description: form.description,
      date: form.date,
      venue: form.venue,
      rules: form.rules,
      playersPerTeam: form.playersPerTeam,
      maxParticipants: form.maxParticipants,
    };
    if (dialog.sport) {
      await updateSport(eventId, dialog.sport.id, { ...data, active: form.active });
    } else {
      await createSport(eventId, { ...data, order: (sports?.length || 0) + 1 });
    }
  }

  async function handleDelete(sport) {
    if (window.confirm(`Delete ${sport.name}? Players who picked it keep their registration, but the sport is removed.`)) {
      await deleteSport(eventId, sport.id);
    }
  }

  if (!sports) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 800 }}>
      <DashboardHero
        title="Sports"
        subtitle="Dates, rules and participant counts can be added or changed at any time."
        image={heroImageFor("sports")}
        icon={<SportsScoreIcon />}
        dense
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog({ open: true, sport: null })}
            sx={{ bgcolor: "#fff", color: "primary.dark", "&:hover": { bgcolor: "rgba(255,255,255,0.9)" } }}
          >
            Add sport
          </Button>
        }
      />

      <Stack spacing={1.5}>
        {sports.length === 0 && <Typography color="text.secondary">No sports added yet.</Typography>}
        {sports.map((sport) => (
          <Paper key={sport.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {sport.name}
                  </Typography>
                  {sport.active === false && <Chip label="closed" size="small" />}
                </Stack>
                {sport.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {sport.description}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<EventIcon />}
                    label={formatDateTime(sport.date) || "Date not set"}
                    color={sport.date ? "primary" : "default"}
                  />
                  {sport.venue && <Chip size="small" variant="outlined" icon={<PlaceIcon />} label={sport.venue} />}
                  {participantsLabel(sport) && (
                    <Chip size="small" variant="outlined" icon={<GroupsIcon />} label={participantsLabel(sport)} />
                  )}
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<GavelIcon />}
                    label={sport.rules ? "Rules added" : "No rules yet"}
                    color={sport.rules ? "success" : "default"}
                  />
                </Stack>
              </Box>
              <IconButton size="small" onClick={() => setDialog({ open: true, sport })} aria-label={`Edit ${sport.name}`}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleDelete(sport)} aria-label={`Delete ${sport.name}`}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <SportDialog
        open={dialog.open}
        sport={dialog.sport}
        onClose={() => setDialog({ open: false, sport: null })}
        onSave={handleSave}
      />
    </Box>
  );
}

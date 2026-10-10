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
import { Link as RouterLink } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import GroupsIcon from "@mui/icons-material/Groups";
import GavelIcon from "@mui/icons-material/Gavel";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import {
  createSport,
  deleteSport,
  restoreSport,
  subscribeToDeletedSports,
  subscribeToSports,
  updateSport,
} from "../../utils/firebase/events";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { logActivity } from "../../utils/firebase/activityLog";
import { formatDateTime, participantsLabel } from "../../utils/format";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

const EMPTY = {
  name: "",
  description: "",
  date: "",
  venue: "",
  rules: "",
  format: "",
  winningCriteria: "",
  playersPerTeam: "",
  maxParticipants: "",
  active: true,
  matchFormat: { categories: [] },
};

function MatchFormatEditor({ matchFormat, onChange }) {
  const categories = matchFormat?.categories || [];
  const [newType, setNewType] = useState({});

  function updateCategories(next) {
    onChange({ categories: next });
  }
  function addCategory() {
    updateCategories([...categories, { name: "", matchTypes: [] }]);
  }
  function removeCategory(idx) {
    updateCategories(categories.filter((_, i) => i !== idx));
  }
  function setCategoryName(idx, name) {
    updateCategories(categories.map((c, i) => (i === idx ? { ...c, name } : c)));
  }
  function addMatchType(idx, type) {
    if (!type.trim()) return;
    updateCategories(categories.map((c, i) => (i === idx ? { ...c, matchTypes: [...c.matchTypes, type.trim()] } : c)));
    setNewType((n) => ({ ...n, [idx]: "" }));
  }
  function removeMatchType(catIdx, typeIdx) {
    updateCategories(
      categories.map((c, i) => (i === catIdx ? { ...c, matchTypes: c.matchTypes.filter((_, ti) => ti !== typeIdx) } : c))
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Match format (optional)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Define categories (e.g. Men, Women) and the exact sequence of matches every pairing plays. The Fixtures page
        then generates a round robin -- every team plays every other team this exact sequence once.
      </Typography>
      <Stack spacing={2}>
        {categories.map((category, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <TextField
                size="small"
                label="Category name"
                placeholder="e.g. Men"
                value={category.name}
                onChange={(e) => setCategoryName(idx, e.target.value)}
                fullWidth
              />
              <IconButton size="small" onClick={() => removeCategory(idx)} aria-label={`Remove category ${idx + 1}`}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              {category.matchTypes.map((type, typeIdx) => (
                <Chip
                  key={typeIdx}
                  label={`${typeIdx + 1}. ${type}`}
                  size="small"
                  onDelete={() => removeMatchType(idx, typeIdx)}
                />
              ))}
              {category.matchTypes.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No matches added yet.
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button size="small" variant="outlined" onClick={() => addMatchType(idx, "Singles")}>
                + Singles
              </Button>
              <Button size="small" variant="outlined" onClick={() => addMatchType(idx, "Doubles")}>
                + Doubles
              </Button>
              <TextField
                size="small"
                placeholder="Custom match type"
                value={newType[idx] || ""}
                onChange={(e) => setNewType((n) => ({ ...n, [idx]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMatchType(idx, newType[idx] || "");
                  }
                }}
              />
              <Button size="small" onClick={() => addMatchType(idx, newType[idx] || "")}>
                Add
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
      <Button size="small" startIcon={<AddIcon />} sx={{ mt: categories.length ? 1.5 : 0 }} onClick={addCategory}>
        Add category
      </Button>
    </Box>
  );
}

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
              format: sport.format || "",
              winningCriteria: sport.winningCriteria || "",
              playersPerTeam: sport.playersPerTeam ?? "",
              maxParticipants: sport.maxParticipants ?? "",
              active: sport.active !== false,
              matchFormat: sport.matchFormat?.categories?.length ? sport.matchFormat : { categories: [] },
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
          <TextField
            label="Format"
            placeholder="e.g. Round robin, Knockout, Swiss -- however you're actually running this sport"
            value={form.format}
            onChange={set("format")}
            fullWidth
          />
          <TextField
            label="Winning criteria"
            placeholder="e.g. Most matches won across the round robin advances"
            value={form.winningCriteria}
            onChange={set("winningCriteria")}
            multiline
            minRows={2}
            fullWidth
          />
          <MatchFormatEditor
            matchFormat={form.matchFormat}
            onChange={(matchFormat) => setForm((f) => ({ ...f, matchFormat }))}
          />
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
  const { user } = useAuth();
  const confirm = useConfirm();
  const [sports, setSports] = useState(null);
  const [deletedSports, setDeletedSports] = useState([]);
  const [dialog, setDialog] = useState({ open: false, sport: null });
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => subscribeToSports(eventId, setSports), [eventId]);
  useEffect(() => subscribeToDeletedSports(eventId, setDeletedSports), [eventId]);

  async function handleSave(form) {
    const data = {
      name: form.name,
      description: form.description,
      date: form.date,
      venue: form.venue,
      rules: form.rules,
      format: form.format,
      winningCriteria: form.winningCriteria,
      playersPerTeam: form.playersPerTeam,
      maxParticipants: form.maxParticipants,
      matchFormat: form.matchFormat,
    };
    if (dialog.sport) {
      await updateSport(eventId, dialog.sport.id, { ...data, active: form.active });
    } else {
      await createSport(eventId, { ...data, order: (sports?.length || 0) + 1 });
    }
  }

  async function handleDelete(sport) {
    const ok = await confirm({
      title: `Delete ${sport.name}?`,
      description: `It's moved to "Recently deleted" and can be restored later.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setDeleteError(null);
    try {
      await deleteSport(eventId, sport.id);
      logActivity(eventId, { actorUid: user.uid, action: "sport_deleted", summary: `Deleted sport ${sport.name}` });
    } catch (err) {
      setDeleteError(friendlyErrorMessage(err));
    }
  }

  async function handleRestore(sport) {
    setDeleteError(null);
    try {
      await restoreSport(eventId, sport.id);
    } catch (err) {
      setDeleteError(friendlyErrorMessage(err));
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

      {deleteError && (
        <Alert severity="error" onClose={() => setDeleteError(null)} sx={{ mb: 2 }}>
          {deleteError}
        </Alert>
      )}

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
                  {sport.format && <Chip size="small" variant="outlined" icon={<EmojiEventsIcon />} label={sport.format} />}
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
                <Button
                  size="small"
                  component={RouterLink}
                  to={`/app/events/${eventId}/fixtures?sport=${sport.id}`}
                  startIcon={<EmojiEventsIcon fontSize="small" />}
                  sx={{ mt: 1 }}
                >
                  Manage fixtures
                </Button>
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

      {deletedSports.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Recently deleted
          </Typography>
          <Stack spacing={1}>
            {deletedSports.map((sport) => (
              <Paper key={sport.id} variant="outlined" sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1.5, opacity: 0.75 }}>
                <Typography sx={{ flexGrow: 1 }}>{sport.name}</Typography>
                <Button size="small" startIcon={<RestoreFromTrashIcon />} onClick={() => handleRestore(sport)}>
                  Restore
                </Button>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      <SportDialog
        open={dialog.open}
        sport={dialog.sport}
        onClose={() => setDialog({ open: false, sport: null })}
        onSave={handleSave}
      />
    </Box>
  );
}

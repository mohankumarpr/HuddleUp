import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { compressImageFile } from "../../utils/image";

// Edits a player's own details after they're already in the pool -- correcting a typo, fixing the
// base price, adding sports they forgot to select, or re-uploading a photo. Deliberately does NOT
// touch status/soldTeamId/soldPrice; those are only ever changed through the dedicated auction,
// transfer, and return-to-pool flows, never a free-form edit.
export default function EditPlayerDialog({ open, player, privateInfo, sports, onClose, onSave }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [sportIds, setSportIds] = useState([]);
  const [basePrice, setBasePrice] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [block, setBlock] = useState("");
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !player) return;
    setName(player.name || "");
    setGender(player.gender || "");
    setSportIds(player.sportIds || []);
    setBasePrice(player.basePrice ?? "");
    setAboutMe(player.aboutMe || "");
    setPhotoDataUrl(player.photoUrl || null);
    setEmail(privateInfo?.email || "");
    setContact(privateInfo?.contact || "");
    setBlock(privateInfo?.block || "");
    setError(null);
  }, [open, player, privateInfo]);

  function toggleSport(id) {
    setSportIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setCompressingPhoto(true);
    try {
      setPhotoDataUrl(await compressImageFile(file));
    } catch (err) {
      setError(err.message || "Couldn't process that photo.");
    } finally {
      setCompressingPhoto(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const trimmedEmail = email.trim();
      await onSave({
        player: {
          name: name.trim(),
          gender,
          sportIds,
          basePrice: Math.max(0, Number(basePrice) || 0),
          aboutMe: aboutMe.trim(),
          photoUrl: photoDataUrl || null,
        },
        private: {
          email: trimmedEmail,
          emailLower: trimmedEmail.toLowerCase(),
          contact: contact.trim(),
          block: block.trim(),
        },
      });
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit {player?.name}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={photoDataUrl} alt={name} sx={{ width: 64, height: 64 }}>
              {name?.[0]}
            </Avatar>
            <Button variant="outlined" component="label" size="small" disabled={compressingPhoto}>
              {compressingPhoto ? (
                <CircularProgress size={16} sx={{ mr: 1 }} />
              ) : photoDataUrl ? (
                "Change photo"
              ) : (
                "Add a photo"
              )}
              <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
            </Button>
          </Stack>

          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth autoFocus />

          <Stack direction="row" spacing={2}>
            <TextField select label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} fullWidth>
              <MenuItem value="">Not specified</MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
            <TextField
              label="Base price"
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              fullWidth
            />
          </Stack>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Sports
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {sports.map((s) => {
                const selected = sportIds.includes(s.id);
                return (
                  <Chip
                    key={s.id}
                    label={s.name}
                    clickable
                    onClick={() => toggleSport(s.id)}
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                  />
                );
              })}
              {sports.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No sports configured yet.
                </Typography>
              )}
            </Stack>
          </Box>

          <TextField
            label="About me"
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Divider />
          <Typography variant="subtitle2">Contact details (organizer-only, not shown publicly)</Typography>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <Stack direction="row" spacing={2}>
            <TextField label="Contact number" value={contact} onChange={(e) => setContact(e.target.value)} fullWidth />
            <TextField label="Block / flat" value={block} onChange={(e) => setBlock(e.target.value)} fullWidth />
          </Stack>
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

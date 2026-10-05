import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import { getEventBySlug, subscribeToSports } from "../../utils/firebase/events";
import { submitRegistration } from "../../utils/firebase/registrations";
import { compressImageFile } from "../../utils/image";
import LoadingSpinner from "../LoadingSpinner";

const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80";

function CenteredMessage({ icon, title, subtitle, action }) {
  return (
    <Container maxWidth="sm" sx={{ py: 12, textAlign: "center" }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <Box sx={{ mb: 2, color: "primary.main" }}>{icon}</Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography color="text.secondary">{subtitle}</Typography>
        {action && <Box sx={{ mt: 3 }}>{action}</Box>}
      </motion.div>
    </Container>
  );
}

export default function PublicRegistrationForm() {
  const { eventSlug } = useParams();
  const [event, setEvent] = useState(undefined); // undefined = loading, null = not found
  const [sports, setSports] = useState([]);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [block, setBlock] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [sportIds, setSportIds] = useState([]);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let unsubSports;
    (async () => {
      const found = await getEventBySlug(eventSlug);
      setEvent(found);
      if (found) unsubSports = subscribeToSports(found.id, setSports);
    })();
    return () => unsubSports && unsubSports();
  }, [eventSlug]);

  function toggleSport(sportId) {
    setSportIds((prev) => (prev.includes(sportId) ? prev.filter((id) => id !== sportId) : [...prev, sportId]));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-choosing the same file later
    if (!file) return;
    setError(null);
    setCompressingPhoto(true);
    try {
      const dataUrl = await compressImageFile(file);
      setPhotoDataUrl(dataUrl);
    } catch (err) {
      setError(err.message || "Couldn't process that photo.");
    } finally {
      setCompressingPhoto(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitRegistration(event.id, { name, contact, email, gender, block, aboutMe, sportIds, photoUrl: photoDataUrl });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Couldn't submit your registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (event === undefined) return <LoadingSpinner />;

  if (event === null) {
    return (
      <CenteredMessage
        icon={<SportsScoreIcon sx={{ fontSize: 56 }} />}
        title="Event not found"
        subtitle="Check the registration link and try again."
      />
    );
  }

  if (!event.publicRegistrationEnabled) {
    return (
      <CenteredMessage
        icon={<SportsScoreIcon sx={{ fontSize: 56 }} />}
        title="Registration is closed"
        subtitle={`${event.name} isn't accepting new registrations right now.`}
      />
    );
  }

  if (submitted) {
    return (
      <CenteredMessage
        icon={<CheckCircleIcon sx={{ fontSize: 56 }} />}
        title={`Thanks, ${name}!`}
        subtitle={`Your registration for ${event.name} has been received and is pending review. Once you're approved, log in to the event portal with ${email} to see the schedule and team standings.`}
        action={
          <Button variant="outlined" component="a" href={`/e/${eventSlug}/portal`}>
            Go to the player portal
          </Button>
        }
      />
    );
  }

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          height: { xs: 180, md: 240 },
          backgroundImage: `linear-gradient(160deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.75) 60%, rgba(36,27,77,0.8) 100%), url(${event.bannerUrl || HERO_FALLBACK})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <Container maxWidth="sm" sx={{ pb: 4 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Typography variant="overline" sx={{ color: "primary.light", fontWeight: 700 }}>
              Player registration
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: "#fff" }}>
              {event.name}
            </Typography>
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 }, mt: { xs: -4, md: -6 }, position: "relative" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Paper elevation={4} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={photoDataUrl} sx={{ width: 64, height: 64, bgcolor: "action.disabledBackground" }} />
                  <Box>
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
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Optional
                    </Typography>
                  </Box>
                </Stack>

                <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  helperText="You'll use this to log in to the event portal once you're approved"
                />
                <TextField
                  label="Contact number"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  fullWidth
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Gender" select value={gender} onChange={(e) => setGender(e.target.value)} fullWidth>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </TextField>
                  <TextField label="Block / flat" value={block} onChange={(e) => setBlock(e.target.value)} fullWidth />
                </Stack>
                <TextField
                  label="About me (optional)"
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  multiline
                  minRows={2}
                  fullWidth
                />

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Sports interested in
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {sports.map((sport) => {
                      const selected = sportIds.includes(sport.id);
                      return (
                        <Chip
                          key={sport.id}
                          label={sport.name}
                          clickable
                          onClick={() => toggleSport(sport.id)}
                          color={selected ? "primary" : "default"}
                          variant={selected ? "filled" : "outlined"}
                          sx={{ fontWeight: 600 }}
                        />
                      );
                    })}
                    {sports.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No sports have been configured yet.
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ py: 1.4 }}>
                  {submitting ? "Submitting..." : "Submit registration"}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}

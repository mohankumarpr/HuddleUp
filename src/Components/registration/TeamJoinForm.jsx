import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import { claimTeamSeat, getEventBySlug, subscribeToTeams } from "../../utils/firebase/events";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import LoadingSpinner from "../LoadingSpinner";

const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=80";

export default function TeamJoinForm() {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [event, setEvent] = useState(undefined);
  const [teams, setTeams] = useState([]);
  const [joinCode, setJoinCode] = useState((searchParams.get("code") || "").toUpperCase());
  const [teamId, setTeamId] = useState(searchParams.get("team") || "");
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // A team's QR code (see TeamManager) encodes code/team/pin as query params so scanning it
  // leaves only "your name" to type.
  const scannedIn = Boolean(searchParams.get("team"));

  useEffect(() => {
    let unsubTeams;
    (async () => {
      const found = await getEventBySlug(eventSlug);
      setEvent(found);
      if (found) unsubTeams = subscribeToTeams(found.id, setTeams);
    })();
    return () => unsubTeams && unsubTeams();
  }, [eventSlug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await claimTeamSeat(event.id, { joinCode, teamId, pin, displayName });
      navigate(`/e/${eventSlug}/bid`);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (event === undefined) return <LoadingSpinner />;
  if (event === null) {
    return (
      <Container maxWidth="sm" sx={{ py: 12, textAlign: "center" }}>
        <SportsScoreIcon sx={{ fontSize: 56, color: "primary.main", mb: 2 }} />
        <Typography variant="h5">Event not found</Typography>
      </Container>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          height: { xs: 160, md: 200 },
          backgroundImage: `linear-gradient(160deg, rgba(15,23,42,0.88) 0%, rgba(30,41,59,0.8) 60%, rgba(36,27,77,0.85) 100%), url(${HERO_FALLBACK})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <Container maxWidth="xs" sx={{ pb: 3 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Typography variant="overline" sx={{ color: "primary.light", fontWeight: 700 }}>
              Join the live auction
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: "#fff" }}>
              {event.name}
            </Typography>
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="xs" sx={{ py: 6, mt: -4, position: "relative" }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {scannedIn
                ? "Your team's QR code filled in the rest -- just add your name to join."
                : "Enter the event code and your team's PIN to bid live from this device."}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  fullWidth
                />
                {scannedIn ? (
                  <TextField
                    label="Team"
                    value={teams.find((t) => t.id === teamId)?.name || "Loading..."}
                    disabled
                    fullWidth
                  />
                ) : (
                  <>
                    <TextField
                      label="Event code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      required
                      fullWidth
                      inputProps={{ style: { textTransform: "uppercase" } }}
                    />
                    <TextField label="Team" select value={teamId} onChange={(e) => setTeamId(e.target.value)} required fullWidth>
                      {teams.map((team) => (
                        <MenuItem key={team.id} value={team.id}>
                          {team.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Team PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      required
                      fullWidth
                      inputProps={{ inputMode: "numeric", maxLength: 4 }}
                    />
                  </>
                )}
                <Button type="submit" variant="contained" size="large" disabled={submitting || !teamId} sx={{ py: 1.4 }}>
                  {submitting ? "Joining..." : "Join and bid"}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}

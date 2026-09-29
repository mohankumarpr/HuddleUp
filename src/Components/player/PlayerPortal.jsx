import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import { useAuth } from "../../context/AuthContext";
import { sendPlayerPasswordReset, signInWithEmail, signOutUser, signUpPlayer } from "../../utils/firebase/auth";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { getEventBySlug, subscribeToSports, subscribeToTeams } from "../../utils/firebase/events";
import { claimPlayerRecord } from "../../utils/firebase/participants";
import { subscribeToPlayers } from "../../utils/firebase/players";
import { subscribeToResults } from "../../utils/firebase/results";
import { formatDate, sortSportsBySchedule } from "../../utils/format";
import useDocumentTitle from "../../utils/useDocumentTitle";
import { APP_NAME } from "../../branding";
import EventInfoTabs from "../common/EventInfoTabs";
import LoadingSpinner from "../LoadingSpinner";

function PortalLogin({ event, onDone }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") await signUpPlayer({ email, password, displayName: name });
      else await signInWithEmail({ email, password });
      onDone();
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setError(null);
    if (!email) {
      setError("Enter your email first, then click 'Forgot password'.");
      return;
    }
    try {
      await sendPlayerPasswordReset(email);
      setInfo("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(friendlyErrorMessage(err));
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="overline" color="primary.main" fontWeight={700}>
          Player portal
        </Typography>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {event.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {mode === "signup"
            ? "Create your account with the same email you registered with."
            : "Sign in to see your player details alongside the schedule and standings."}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}
        <Box component="form" onSubmit={submit}>
          <Stack spacing={2}>
            {mode === "signup" && <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />}
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              helperText={mode === "signup" ? "At least 6 characters" : undefined}
            />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </Stack>
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          <Button size="small" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); }}>
            {mode === "signup" ? "I already have an account" : "Create an account"}
          </Button>
          {mode === "signin" && (
            <Button size="small" onClick={forgot}>
              Forgot password
            </Button>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}

export default function PlayerPortal() {
  const { eventSlug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(undefined);
  const [participant, setParticipant] = useState(undefined); // undefined = checking, null = no matching player
  const [claimTick, setClaimTick] = useState(0);

  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [players, setPlayers] = useState([]);
  const [results, setResults] = useState({});

  useEffect(() => {
    (async () => setEvent(await getEventBySlug(eventSlug)))();
  }, [eventSlug]);

  const loggedIn = Boolean(user && !user.isAnonymous);

  // Link the login to its player record (matched by email) as soon as we know who's signed in.
  useEffect(() => {
    if (authLoading || !event) return;
    if (!loggedIn) {
      setParticipant(undefined);
      return;
    }
    setParticipant(undefined);
    claimPlayerRecord(event.id, user)
      .then(setParticipant)
      .catch(() => setParticipant(null));
  }, [authLoading, event, loggedIn, user, claimTick]);

  const isMember = Boolean(participant);
  useEffect(() => {
    if (!event || !isMember) return undefined;
    const unsubs = [
      subscribeToTeams(event.id, setTeams),
      subscribeToSports(event.id, setSports),
      subscribeToPlayers(event.id, setPlayers),
      subscribeToResults(event.id, setResults, () => setResults({})),
    ];
    return () => unsubs.forEach((u) => u());
  }, [event, isMember]);

  const orderedSports = useMemo(() => sortSportsBySchedule(sports), [sports]);
  const me = players.find((p) => p.id === participant?.playerId);
  const myTeam = me?.soldTeamId ? teams.find((t) => t.id === me.soldTeamId) : null;
  useDocumentTitle(event ? `${event.name} portal -- ${APP_NAME}` : undefined);

  if (event === undefined || authLoading) return <LoadingSpinner />;
  if (event === null) {
    return (
      <Container maxWidth="sm" sx={{ py: 12, textAlign: "center" }}>
        <Typography variant="h5">Event not found</Typography>
      </Container>
    );
  }

  if (!loggedIn) return <PortalLogin event={event} onDone={() => setClaimTick((t) => t + 1)} />;
  if (participant === undefined) return <LoadingSpinner />;

  if (participant === null) {
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Alert
          severity="info"
          action={<Button color="inherit" size="small" onClick={() => signOutUser()}>Sign out</Button>}
        >
          We couldn't find an approved player for <b>{user.email}</b> in {event.name}. If you've just registered, the
          organizer needs to approve you first. Make sure you're using the same email you registered with.
        </Alert>
      </Container>
    );
  }

  const myDetailsTab = {
    label: "My details",
    content: (
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar src={me?.photoUrl} sx={{ width: 64, height: 64 }}>
              {me?.name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {me?.name || participant.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {(me?.sportIds || []).map((id) => {
              const sport = sports.find((s) => s.id === id);
              return sport ? <Chip key={id} label={sport.name} variant="outlined" /> : null;
            })}
          </Stack>
          {me && (
            <Alert severity={me.status === "sold" ? "success" : "info"}>
              {me.status === "sold" && myTeam && (
                <>You're on team <b>{myTeam.name}</b>{me.soldPrice != null ? ` (bought for ${me.soldPrice})` : ""}.</>
              )}
              {me.status === "pool" && "You're in the auction pool. You'll see your team here once you're picked."}
              {me.status === "on_block" && "You're on the block right now!"}
              {me.status === "unsold" && "You weren't picked in the auction this time."}
            </Alert>
          )}
        </CardContent>
      </Card>
    ),
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={700}>
            Player portal
          </Typography>
          <Typography variant="h4" fontWeight={800}>
            {event.name}
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ color: "text.secondary", mt: 0.5 }}>
            {event.eventDate && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <EventIcon fontSize="small" />
                <Typography variant="body2">{formatDate(event.eventDate)}</Typography>
              </Stack>
            )}
            {event.venue && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PlaceIcon fontSize="small" />
                <Typography variant="body2">{event.venue}</Typography>
              </Stack>
            )}
          </Stack>
        </Box>
        <Button size="small" onClick={() => signOutUser()}>
          Sign out
        </Button>
      </Stack>

      {event.description && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {event.description}
        </Typography>
      )}

      <EventInfoTabs teams={teams} sports={orderedSports} results={results} players={players} myTeamId={myTeam?.id} extraTab={myDetailsTab} />
    </Container>
  );
}

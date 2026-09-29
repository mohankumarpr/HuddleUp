import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import GroupsIcon from "@mui/icons-material/Groups";
import GavelIcon from "@mui/icons-material/Gavel";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import PersonIcon from "@mui/icons-material/Person";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { getTeamOwners, subscribeToEvent, subscribeToSports, subscribeToTeams, updateEvent } from "../../utils/firebase/events";
import { subscribeToPlayers } from "../../utils/firebase/players";
import { subscribeToPendingRegistrationCount } from "../../utils/firebase/registrations";
import { subscribeToResults } from "../../utils/firebase/results";
import { formatDate, formatDateTime, participantsLabel, sortSportsBySchedule } from "../../utils/format";
import StandingsTable from "../common/StandingsTable";
import LoadingSpinner from "../LoadingSpinner";

const STATUS_FLOW = ["draft", "registration_open", "live", "ended"];
const STATUS_LABEL = { draft: "Draft", registration_open: "Registration open", live: "Live", ended: "Ended" };
const GENDER_ICON = { male: <MaleIcon />, female: <FemaleIcon />, other: <PersonIcon /> };

const NAV = [
  { to: "sports", label: "Sports", desc: "Dates, rules and participant counts" },
  { to: "teams", label: "Teams", desc: "Teams, captains, purses and PINs" },
  { to: "registrations", label: "Registrations", desc: "Review and approve player sign-ups" },
  { to: "players", label: "Player pool", desc: "Everyone eligible for the auction" },
  { to: "import", label: "Bulk upload", desc: "Add many players from a CSV file" },
  { to: "standings", label: "Standings", desc: "Enter points for each sport" },
  { to: "console", label: "Live auction console", desc: "Run the auction and confirm sales" },
];

function StatTile({ label, value, hint }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={800}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all", flexGrow: 1 }}>
          {value}
        </Typography>
        <Tooltip title={copied ? "Copied!" : "Copy"}>
          <IconButton size="small" onClick={copy} aria-label={`Copy ${label}`}>
            <ContentCopyIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

export default function EventOverview() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [teams, setTeams] = useState(null);
  const [sports, setSports] = useState(null);
  const [players, setPlayers] = useState(null);
  const [results, setResults] = useState({});
  const [pending, setPending] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubs = [
      subscribeToEvent(eventId, setEvent),
      subscribeToTeams(eventId, setTeams),
      subscribeToSports(eventId, setSports),
      subscribeToPlayers(eventId, setPlayers),
      subscribeToPendingRegistrationCount(eventId, setPending),
      subscribeToResults(eventId, setResults, () => setResults({})),
    ];
    return () => unsubs.forEach((u) => u());
  }, [eventId]);

  const orderedSports = useMemo(() => sortSportsBySchedule(sports || []), [sports]);
  const rosterCount = useMemo(() => {
    const counts = {};
    (players || []).forEach((p) => {
      if (p.status === "sold" && p.soldTeamId) counts[p.soldTeamId] = (counts[p.soldTeamId] || 0) + 1;
    });
    return counts;
  }, [players]);

  if (!event || !teams || !sports || !players) return <LoadingSpinner />;

  const origin = window.location.origin;
  const links = {
    public: `${origin}/e/${event.slug}`,
    registration: `${origin}/e/${event.slug}/register`,
    portal: `${origin}/e/${event.slug}/portal`,
    watch: `${origin}/e/${event.slug}/watch`,
    join: `${origin}/e/${event.slug}/join`,
  };
  const nextStatus = STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(event.status) + 1, STATUS_FLOW.length - 1)];
  const isLast = event.status === "ended";
  const count = (status) => players.filter((p) => p.status === status).length;

  async function advanceStatus() {
    setError(null);
    try {
      await updateEvent(event.id, { status: nextStatus });
    } catch (err) {
      setError(err.message || "Couldn't update the event status.");
    }
  }

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
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
          {event.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
              {event.description}
            </Typography>
          )}
        </Box>
        <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={1}>
          <Chip label={STATUS_LABEL[event.status]} color="primary" />
          <Button size="small" variant="outlined" onClick={advanceStatus} disabled={isLast}>
            {isLast ? "Event ended" : `Mark as "${STATUS_LABEL[nextStatus]}"`}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2}>
          <StatTile label="Teams" value={teams.length} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatTile label="Sports" value={sports.length} hint={`${sports.filter((s) => s.date).length} scheduled`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatTile label="Players" value={players.length} hint={`${count("pool")} in pool`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatTile label="Pending sign-ups" value={pending} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatTile label="Sold" value={count("sold")} />
        </Grid>
        <Grid item xs={6} md={2}>
          <StatTile label="Unsold" value={count("unsold")} />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Teams</Typography>
                <Button size="small" component={RouterLink} to={`/app/events/${event.id}/teams`} endIcon={<ArrowForwardIcon />}>
                  Manage
                </Button>
              </Stack>
              <Stack spacing={2} divider={<Divider flexItem />}>
                {teams.length === 0 && <Typography color="text.secondary">No teams yet.</Typography>}
                {teams.map((team) => {
                  const owners = getTeamOwners(team);
                  const pct = team.purseTotal ? (team.purseRemaining / team.purseTotal) * 100 : 0;
                  return (
                    <Box key={team.id}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: team.color }} />
                        <Typography fontWeight={700} sx={{ flexGrow: 1 }}>
                          {team.name}
                        </Typography>
                        <Chip size="small" icon={<GroupsIcon />} label={`${rosterCount[team.id] || 0} players`} variant="outlined" />
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ my: 1 }}>
                        {owners.length === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            No owners / captains added
                          </Typography>
                        )}
                        {owners.map((o) => (
                          <Chip key={o.id} size="small" icon={GENDER_ICON[o.gender] || <PersonIcon />} label={o.name} />
                        ))}
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ height: 6, borderRadius: 3, bgcolor: "action.disabledBackground", "& .MuiLinearProgress-bar": { bgcolor: team.color } }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Purse {team.purseRemaining} / {team.purseTotal}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Standings</Typography>
                <Button size="small" component={RouterLink} to={`/app/events/${event.id}/standings`} endIcon={<ArrowForwardIcon />}>
                  Enter points
                </Button>
              </Stack>
              <StandingsTable teams={teams} results={results} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Sports schedule</Typography>
            <Button size="small" component={RouterLink} to={`/app/events/${event.id}/sports`} endIcon={<ArrowForwardIcon />}>
              Manage
            </Button>
          </Stack>
          {orderedSports.length === 0 ? (
            <Typography color="text.secondary">No sports added yet.</Typography>
          ) : (
            <Grid container spacing={2}>
              {orderedSports.map((sport) => (
                <Grid item xs={12} sm={6} md={4} key={sport.id}>
                  <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, height: "100%" }}>
                    <Typography fontWeight={700}>{sport.name}</Typography>
                    <Typography variant="body2" color={sport.date ? "primary.main" : "text.secondary"} sx={{ mb: 0.5 }}>
                      {formatDateTime(sport.date) || "Date not set"}
                    </Typography>
                    {sport.venue && (
                      <Typography variant="body2" color="text.secondary">
                        {sport.venue}
                      </Typography>
                    )}
                    {participantsLabel(sport) && (
                      <Typography variant="body2" color="text.secondary">
                        {participantsLabel(sport)}
                      </Typography>
                    )}
                    {sport.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {sport.description}
                      </Typography>
                    )}
                    <Chip
                      size="small"
                      icon={<GavelIcon />}
                      label={sport.rules ? "Rules added" : "No rules yet"}
                      color={sport.rules ? "success" : "default"}
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Share
              </Typography>
              <Stack spacing={1.5}>
                <CopyRow label="Public event page (schedule, standings, no login)" value={links.public} />
                <CopyRow label="Player registration link" value={links.registration} />
                <CopyRow label="Player portal (login, event details, standings)" value={links.portal} />
                <CopyRow label="Spectator screen" value={links.watch} />
                <CopyRow label="Team rep join link" value={links.join} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Live auction join code
                  </Typography>
                  <Box>
                    <Chip label={event.joinCode} variant="outlined" sx={{ fontFamily: "monospace", fontSize: 16 }} />
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Grid container spacing={2}>
            {NAV.map((item) => (
              <Grid item xs={12} sm={6} key={item.to}>
                <Card variant="outlined">
                  <CardActionArea component={RouterLink} to={`/app/events/${event.id}/${item.to}`} sx={{ p: 2 }}>
                    <Typography fontWeight={600}>{item.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.desc}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

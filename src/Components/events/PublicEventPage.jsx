import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import GavelIcon from "@mui/icons-material/Gavel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LoginIcon from "@mui/icons-material/Login";
import { getEventBySlug, subscribeToSports, subscribeToTeams } from "../../utils/firebase/events";
import { subscribeToResults, subscribeToSportStats } from "../../utils/firebase/results";
import { formatDate, sortSportsBySchedule } from "../../utils/format";
import useDocumentTitle from "../../utils/useDocumentTitle";
import { APP_NAME } from "../../branding";
import EventInfoTabs from "../common/EventInfoTabs";
import LoadingSpinner from "../LoadingSpinner";

const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80";

export default function PublicEventPage() {
  const { eventSlug } = useParams();
  const [event, setEvent] = useState(undefined);
  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [results, setResults] = useState({});
  const [stats, setStats] = useState({});

  useEffect(() => {
    (async () => setEvent(await getEventBySlug(eventSlug)))();
  }, [eventSlug]);

  useEffect(() => {
    if (!event) return undefined;
    const unsubs = [
      subscribeToTeams(event.id, setTeams),
      subscribeToSports(event.id, setSports),
      subscribeToResults(event.id, setResults, () => setResults({})),
      subscribeToSportStats(event.id, setStats, () => setStats({})),
    ];
    return () => unsubs.forEach((u) => u());
  }, [event]);

  const orderedSports = useMemo(() => sortSportsBySchedule(sports), [sports]);
  useDocumentTitle(event ? `${event.name} -- ${APP_NAME}` : undefined);

  if (event === undefined) return <LoadingSpinner />;
  if (event === null) {
    return (
      <Container maxWidth="sm" sx={{ py: 12, textAlign: "center" }}>
        <Typography variant="h5">Event not found</Typography>
      </Container>
    );
  }

  const links = [
    { to: `/e/${event.slug}/register`, label: "Register as a player", icon: <HowToRegIcon /> },
    { to: `/e/${event.slug}/join`, label: "Join to bid", icon: <GavelIcon /> },
    { to: `/e/${event.slug}/watch`, label: "Watch live", icon: <VisibilityIcon /> },
    { to: `/e/${event.slug}/portal`, label: "Player login", icon: <LoginIcon /> },
  ];

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          height: { xs: 220, md: 280 },
          backgroundImage: `linear-gradient(160deg, rgba(11,15,25,0.9) 0%, rgba(15,23,42,0.75) 40%, rgba(36,27,77,0.55) 100%), url(${event.bannerUrl || HERO_FALLBACK})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <Container maxWidth="md" sx={{ pb: 4 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Typography variant="h3" fontWeight={800} sx={{ color: "#fff" }}>
              {event.name}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ color: "grey.300", mt: 1 }}>
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
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 5 } }}>
        {event.description && (
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
            {event.description}
          </Typography>
        )}

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 5 }}>
          {links.map((link) => (
            <Button key={link.to} component={RouterLink} to={link.to} variant="outlined" startIcon={link.icon}>
              {link.label}
            </Button>
          ))}
        </Stack>

        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          Schedule, teams & standings
        </Typography>
        <EventInfoTabs teams={teams} sports={orderedSports} results={results} statsBySport={stats} />
      </Container>
    </Box>
  );
}

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Chip, Container, Grid, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import GavelIcon from "@mui/icons-material/Gavel";
import { ensureAnonymousAuth } from "../../utils/firebase/auth";
import { getEventBySlug, subscribeToSports } from "../../utils/firebase/events";
import { subscribeToBidsForPlayer } from "../../utils/firebase/auctionRealtime";
import { useAuctionRoom } from "../auctionRoom/useAuctionRoom";
import PlayerOnBlockCard from "../auctionRoom/PlayerOnBlockCard";
import AuctionStatsBar from "../auctionRoom/AuctionStatsBar";
import BidHistoryList from "../common/BidHistoryList";
import SoundToggleButton from "../common/SoundToggleButton";
import LoadingSpinner from "../LoadingSpinner";
import { APP_NAME } from "../../branding";

export default function SpectatorView() {
  const { eventSlug } = useParams();
  const [event, setEvent] = useState(undefined);
  const [sports, setSports] = useState([]);

  useEffect(() => {
    ensureAnonymousAuth();
  }, []);

  useEffect(() => {
    (async () => setEvent(await getEventBySlug(eventSlug)))();
  }, [eventSlug]);

  useEffect(() => {
    if (!event) return undefined;
    return subscribeToSports(event.id, setSports);
  }, [event]);

  const room = useAuctionRoom(event?.id);
  const [bids, setBids] = useState([]);

  useEffect(() => {
    if (!event || !room.state?.currentPlayerId) {
      setBids([]);
      return undefined;
    }
    return subscribeToBidsForPlayer(event.id, room.state.currentPlayerId, setBids);
  }, [event, room.state?.currentPlayerId]);

  function sportNames(sportIds) {
    return (sportIds || []).map((id) => sports.find((s) => s.id === id)?.name).filter(Boolean).join(", ");
  }

  if (event === undefined) return <LoadingSpinner />;
  if (event === null) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5">Event not found</Typography>
      </Container>
    );
  }

  const isLive = room.state?.status === "live";

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        color: "#fff",
        overflow: "hidden",
        backgroundImage: "linear-gradient(160deg, #0F172A 0%, #1E293B 55%, #241B4D 100%)",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(99,102,241,0.35), transparent 45%), radial-gradient(circle at 85% 90%, rgba(99,102,241,0.2), transparent 40%)",
        }}
      />

      <Container maxWidth="md" sx={{ position: "relative", py: { xs: 4, md: 6 } }}>
        <Box sx={{ position: "absolute", top: { xs: 16, md: 24 }, right: { xs: 16, md: 24 } }}>
          <SoundToggleButton enabled={room.soundEnabled} onToggle={room.toggleSound} sx={{ color: "#fff" }} />
        </Box>

        <Stack alignItems="center" spacing={1} sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ opacity: 0.7 }}>
            <GavelIcon fontSize="small" sx={{ color: "primary.light" }} />
            <Typography variant="caption" sx={{ letterSpacing: 2 }}>
              {APP_NAME.toUpperCase()}
            </Typography>
          </Stack>
          <Typography variant="h3" fontWeight={800} textAlign="center">
            {event.name}
          </Typography>
          {isLive && (
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
              <Chip label="LIVE" color="error" size="small" sx={{ fontWeight: 700, letterSpacing: 1 }} />
            </motion.div>
          )}
        </Stack>

        <PlayerOnBlockCard
          player={room.currentPlayer}
          currentPrice={room.state?.currentPrice}
          highBidTeam={room.highBidTeam}
          sportNames={sportNames}
          basePrice={room.currentPlayer ? room.state?.basePrice : null}
          deadlineAt={room.state?.blockDeadlineAt}
          timerSeconds={room.state?.bidTimerSeconds}
        />

        <Box sx={{ mt: 2 }}>
          <AuctionStatsBar stats={room.stats} dark />
        </Box>

        {room.currentPlayer && bids.length > 0 && (
          <Paper
            variant="outlined"
            sx={{ p: 2, mt: 2, bgcolor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)", borderRadius: 2 }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#fff", mb: 1 }}>
              Bid history
            </Typography>
            <BidHistoryList bids={bids} teams={room.teams} dense dark />
          </Paper>
        )}

        <Typography variant="h6" sx={{ mt: 6, mb: 2, opacity: 0.9 }}>
          Teams
        </Typography>
        <Grid container spacing={2}>
          {room.teams.map((team, i) => {
            const pct = team.purseTotal ? Math.round((team.purseRemaining / team.purseTotal) * 100) : 0;
            return (
              <Grid item xs={6} sm={4} key={team.id}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)", borderRadius: 2 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: team.color, flexShrink: 0 }} />
                      <Typography fontWeight={700} sx={{ color: "#fff" }} noWrap>
                        {team.name}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,0.1)",
                        mb: 0.75,
                        "& .MuiLinearProgress-bar": { bgcolor: team.color, borderRadius: 3 },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "grey.400" }}>
                      {team.purseRemaining} / {team.purseTotal}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}

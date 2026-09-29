import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Chip, Container, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { getEventBySlug, getTeamRep, subscribeToSports } from "../../utils/firebase/events";
import { nextIncrement, placeBid } from "../../utils/firebase/auctionRealtime";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { subscribeToBidsForPlayer } from "../../utils/firebase/auctionRealtime";
import { useAuctionRoom } from "../auctionRoom/useAuctionRoom";
import PlayerOnBlockCard from "../auctionRoom/PlayerOnBlockCard";
import BidHistoryList from "../common/BidHistoryList";
import SoundToggleButton from "../common/SoundToggleButton";
import LoadingSpinner from "../LoadingSpinner";

export default function TeamBidderView() {
  const { eventSlug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(undefined); // undefined = loading, null = not found
  const [teamRep, setTeamRep] = useState(undefined); // undefined = loading, null = not joined
  const [sports, setSports] = useState([]);
  const [error, setError] = useState(null);
  const [bidding, setBidding] = useState(false);

  useEffect(() => {
    (async () => setEvent(await getEventBySlug(eventSlug)))();
  }, [eventSlug]);

  useEffect(() => {
    if (!event || authLoading) return;
    if (!user) {
      setTeamRep(null);
      return;
    }
    (async () => setTeamRep(await getTeamRep(event.id, user.uid)))();
  }, [event, user, authLoading]);

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

  if (event === undefined || authLoading || teamRep === undefined) return <LoadingSpinner />;

  if (event === null) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5">Event not found</Typography>
      </Container>
    );
  }

  if (teamRep === null) {
    return <Navigate to={`/e/${eventSlug}/join`} replace />;
  }

  const myTeam = room.teams.find((t) => t.id === teamRep.teamId);
  const isLive = Boolean(room.state?.status === "live" && room.state?.currentPlayerId);
  const alreadyHighBidder = room.state?.currentHighBidTeamId === teamRep.teamId;
  const proposedPrice = room.state ? nextIncrement(room.state.currentPrice, room.state.incrementLadder) : null;
  const canAfford = Boolean(myTeam && proposedPrice != null && proposedPrice <= myTeam.purseRemaining);
  const canBid = isLive && Boolean(myTeam) && !alreadyHighBidder && canAfford;

  async function handleBid() {
    setError(null);
    setBidding(true);
    try {
      await placeBid(event.id, teamRep.teamId, user.uid);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBidding(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          {event.name}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SoundToggleButton enabled={room.soundEnabled} onToggle={room.toggleSound} />
          {myTeam && <Chip label={myTeam.name} sx={{ bgcolor: myTeam.color, color: "#fff", fontWeight: 700 }} />}
        </Stack>
      </Stack>

      {myTeam && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Your purse
            </Typography>
            <Typography variant="h6">
              {myTeam.purseRemaining} / {myTeam.purseTotal}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={myTeam.purseTotal ? (myTeam.purseRemaining / myTeam.purseTotal) * 100 : 0}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "action.disabledBackground",
              "& .MuiLinearProgress-bar": { bgcolor: myTeam.color, borderRadius: 3 },
            }}
          />
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <PlayerOnBlockCard
          player={room.currentPlayer}
          currentPrice={room.state?.currentPrice}
          highBidTeam={room.highBidTeam}
          sportNames={sportNames}
        />
      </Box>

      {room.currentPlayer && bids.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Bid history
          </Typography>
          <BidHistoryList bids={bids} teams={room.teams} dense />
        </Paper>
      )}

      <motion.div whileTap={canBid ? { scale: 0.97 } : undefined}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={!canBid || bidding}
          onClick={handleBid}
          sx={{ py: 2, fontSize: 20 }}
        >
          {alreadyHighBidder
            ? "You're leading"
            : !isLive
            ? "Waiting for auction"
            : !canAfford
            ? "Insufficient purse"
            : `Bid ${proposedPrice}`}
        </Button>
      </motion.div>
    </Container>
  );
}

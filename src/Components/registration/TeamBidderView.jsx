import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useAuth } from "../../context/AuthContext";
import { getEventBySlug, getTeamRep, subscribeToSports } from "../../utils/firebase/events";
import { nextIncrement, placeBid } from "../../utils/firebase/auctionRealtime";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { subscribeToBidsForPlayer } from "../../utils/firebase/auctionRealtime";
import { useAuctionRoom } from "../auctionRoom/useAuctionRoom";
import PlayerOnBlockCard from "../auctionRoom/PlayerOnBlockCard";
import AuctionStatsBar from "../auctionRoom/AuctionStatsBar";
import BidHistoryList from "../common/BidHistoryList";
import SoundToggleButton from "../common/SoundToggleButton";
import TeamPurseList from "../common/TeamPurseList";
import LoadingSpinner from "../LoadingSpinner";

export default function TeamBidderView() {
  const { eventSlug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(undefined); // undefined = loading, null = not found
  const [teamRep, setTeamRep] = useState(undefined); // undefined = loading, null = not joined
  const [sports, setSports] = useState([]);
  const [error, setError] = useState(null);
  const [bidding, setBidding] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);

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
  const myRoster = room.players.filter((p) => p.status === "sold" && p.soldTeamId === teamRep.teamId);
  const mySpent = myTeam ? myTeam.purseTotal - myTeam.purseRemaining : 0;
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

      <Box sx={{ mb: 2 }}>
        <AuctionStatsBar stats={room.stats} />
      </Box>

      {myTeam && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Spent
              </Typography>
              <Typography variant="h6">{mySpent}</Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Remaining
              </Typography>
              <Typography variant="h6">{myTeam.purseRemaining}</Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Total purse
              </Typography>
              <Typography variant="h6">{myTeam.purseTotal}</Typography>
            </Box>
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

          <Button
            size="small"
            onClick={() => setRosterOpen((o) => !o)}
            endIcon={rosterOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mt: 1.5 }}
          >
            My roster ({myRoster.length})
          </Button>
          <Collapse in={rosterOpen}>
            {myRoster.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 1 }}>
                No players won yet.
              </Typography>
            ) : (
              <List dense disablePadding>
                {myRoster.map((p) => (
                  <ListItem key={p.id} disableGutters>
                    <ListItemAvatar>
                      <Avatar src={p.photoUrl} alt={p.name} sx={{ width: 32, height: 32 }} />
                    </ListItemAvatar>
                    <ListItemText primary={p.name} secondary={`Bought for ${p.soldPrice}`} />
                  </ListItem>
                ))}
              </List>
            )}
          </Collapse>
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
          basePrice={room.currentPlayer ? room.state?.basePrice : null}
          deadlineAt={room.state?.blockDeadlineAt}
          timerSeconds={room.state?.bidTimerSeconds}
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

      <Divider sx={{ my: 3 }} />

      <Button
        size="small"
        onClick={() => setTeamsOpen((o) => !o)}
        endIcon={teamsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ mb: 1 }}
      >
        All teams' purses
      </Button>
      <Collapse in={teamsOpen}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TeamPurseList teams={room.teams} highlightTeamId={teamRep.teamId} />
        </Paper>
      </Collapse>
    </Container>
  );
}

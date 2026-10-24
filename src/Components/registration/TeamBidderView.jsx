import React, { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useNavigationGuard } from "../../context/NavigationGuardContext";
import { getEventBySlug, getTeamRep, subscribeToEvent, subscribeToSports } from "../../utils/firebase/events";
import { nextIncrement, placeBid, withdrawBid } from "../../utils/firebase/auctionRealtime";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { subscribeToBidsForPlayer } from "../../utils/firebase/auctionRealtime";
import {
  cancelSwapRequest,
  requestSwap,
  respondToSwapRequest,
  subscribeToSwapRequests,
} from "../../utils/firebase/swaps";
import { playSwapSound } from "../../utils/sound";
import { formatAmount } from "../../utils/formatAmount";
import {
  computeGenderQuota,
  computePoolGenderTotals,
  computeTotalSlotsPerTeam,
  countTeamRoster,
  isGenderCapped,
  maxBidCapForTeam,
} from "../../utils/auctionQuota";
import { useAuctionRoom } from "../auctionRoom/useAuctionRoom";
import PlayerOnBlockCard from "../auctionRoom/PlayerOnBlockCard";
import AuctionStatsBar from "../auctionRoom/AuctionStatsBar";
import BidHistoryList from "../common/BidHistoryList";
import SoundToggleButton from "../common/SoundToggleButton";
import TeamPurseList from "../common/TeamPurseList";
import AmountField from "../common/AmountField";
import LoadingSpinner from "../LoadingSpinner";

// Offer another team a price for one of their already-sold players. If they accept, the organizer
// finalizes it (see OrganizerConsole) -- the player moves to the offering team's roster and the
// price is added to the selling team's purse.
function SwapRequestDialog({ open, onClose, myTeam, teams, otherTeamPlayers, onSubmit }) {
  const [playerId, setPlayerId] = useState("");
  const [price, setPrice] = useState(0);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPlayerId("");
      setPrice(0);
      setError(null);
    }
  }, [open]);

  const priceNum = Number(price) || 0;
  const canAfford = Boolean(myTeam) && priceNum > 0 && priceNum <= myTeam.purseRemaining;

  async function handleSubmit() {
    const player = otherTeamPlayers.find((p) => p.id === playerId);
    if (!player || !canAfford) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ playerId, targetTeamId: player.soldTeamId, price: priceNum });
      onClose();
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Swap a player</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Offer another team a price for one of their players. If they accept, the organizer
          finalizes the move -- the player joins your roster and the price goes to their purse.
          You get one of these for the whole auction.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2}>
          <TextField select label="Player" value={playerId} onChange={(e) => setPlayerId(e.target.value)} fullWidth>
            {otherTeamPlayers.length === 0 && (
              <MenuItem value="" disabled>
                No other teams have bought a player yet
              </MenuItem>
            )}
            {otherTeamPlayers.map((p) => {
              const team = teams.find((t) => t.id === p.soldTeamId);
              return (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} -- {team?.name || "Unknown team"}
                </MenuItem>
              );
            })}
          </TextField>
          <AmountField
            key={open}
            label="Price you're offering"
            value={price}
            onChange={setPrice}
            helperText={myTeam ? `Your remaining purse: ${formatAmount(myTeam.purseRemaining)}` : undefined}
          />
          {priceNum > 0 && !canAfford && <Alert severity="warning">Your remaining purse can't cover this offer.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!playerId || !canAfford || submitting} onClick={handleSubmit}>
          {submitting ? "Sending..." : "Send offer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function TeamBidderView() {
  const { eventSlug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const [event, setEvent] = useState(undefined); // undefined = loading, null = not found
  const [teamRep, setTeamRep] = useState(undefined); // undefined = loading, null = not joined
  const [sports, setSports] = useState([]);
  const [error, setError] = useState(null);
  const [bidding, setBidding] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [soldOpen, setSoldOpen] = useState(false);
  const [unsoldOpen, setUnsoldOpen] = useState(false);
  const [swapRequests, setSwapRequests] = useState([]);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapActionError, setSwapActionError] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  // Resolves the slug to an event ID once, then switches to a live subscription -- a one-time
  // fetch here would freeze this screen's event data (reserveSlotPrice, purseDefault, etc.) at
  // whatever it was when the rep's tab first loaded, which for a reserve price the organizer sets
  // up after reps have already joined and left their tab open, means it would never show up.
  const [eventId, setEventId] = useState(undefined); // undefined = resolving, null = not found
  useEffect(() => {
    (async () => {
      const ev = await getEventBySlug(eventSlug);
      setEventId(ev ? ev.id : null);
      if (!ev) setEvent(null);
    })();
  }, [eventSlug]);

  useEffect(() => {
    if (!eventId) return undefined;
    return subscribeToEvent(eventId, setEvent);
  }, [eventId]);

  useEffect(() => {
    if (!event || authLoading) return;
    if (!user) {
      setTeamRep(null);
      return;
    }
    (async () => setTeamRep(await getTeamRep(event.id, user.uid)))();
    // Deliberately keyed on event?.id, not the whole live `event` object -- re-fetching teamRep
    // on every unrelated field change (reserveSlotPrice, status, ...) the live subscription above
    // pushes through would be pure waste; this only needs to run when the event itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, user, authLoading]);

  // A joined rep shouldn't get bounced off this screen by an accidental tap (the navbar logo, a
  // browser back/refresh) without a chance to say so first -- they could be mid-bid.
  const confirmLeaveBidding = teamRep
    ? () =>
        confirm({
          title: "Leave the bidding screen?",
          description: "You'll stop seeing live bids and won't be able to bid until you come back.",
          confirmLabel: "Leave",
          destructive: true,
        })
    : null;
  useNavigationGuard(confirmLeaveBidding, [Boolean(teamRep)]);

  useEffect(() => {
    if (!teamRep) return undefined;
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [teamRep]);

  useEffect(() => {
    if (!event) return undefined;
    return subscribeToSports(event.id, setSports);
  }, [event]);

  useEffect(() => {
    if (!event) return undefined;
    return subscribeToSwapRequests(event.id, setSwapRequests);
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

  // A chime when an offer arrives for this team, or this team's own offer gets accepted -- a swap
  // can happen at any time, so it shouldn't rely on the rep already looking at this part of the
  // screen. Seeded silently on the first snapshot so reopening the page doesn't replay old chimes.
  const swapSeenRef = useRef(null);
  useEffect(() => {
    const myTeamId = teamRep?.teamId;
    if (!myTeamId) return;
    const relevant = swapRequests.filter(
      (r) =>
        (r.status === "pending" && r.targetTeamId === myTeamId) ||
        (r.status === "accepted" && r.requesterTeamId === myTeamId)
    );
    const next = new Map(relevant.map((r) => [r.id, r.status]));
    if (swapSeenRef.current === null) {
      swapSeenRef.current = next;
      return;
    }
    const prev = swapSeenRef.current;
    let notify = false;
    for (const [id, status] of next) {
      if (!prev.has(id) || (prev.get(id) !== status && status === "accepted")) notify = true;
    }
    if (notify && room.soundEnabled) playSwapSound();
    swapSeenRef.current = next;
  }, [swapRequests, teamRep?.teamId, room.soundEnabled]);

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
  const biddingOpen = Boolean(room.state?.biddingOpen);
  const alreadyHighBidder = room.state?.currentHighBidTeamId === teamRep.teamId;
  const proposedPrice = room.state ? nextIncrement(room.state.currentPrice, room.state.incrementLadder) : null;

  // Roster planning: an optional max-bid cap (reserve enough purse for every remaining slot) and
  // an independent men's/women's quota cap -- see auctionQuota.js. Both mirror exactly what
  // placeBid enforces server-side, so the button's disabled state never contradicts what actually
  // happens when it's pressed.
  const numTeams = room.teams.length;
  const totalSlotsPerTeam = computeTotalSlotsPerTeam(room.players.length, numTeams);
  const myRosterCounts = countTeamRoster(room.players, teamRep.teamId);
  const genderTotals = computePoolGenderTotals(room.players);
  const womenQuota = computeGenderQuota(genderTotals.female, numTeams);
  const menQuota = computeGenderQuota(genderTotals.male, numTeams);
  const myBidCap = myTeam
    ? maxBidCapForTeam({
        purseRemaining: myTeam.purseRemaining,
        totalSlotsPerTeam,
        teamTotalOwned: myRosterCounts.total,
        reserveSlotPrice: event.reserveSlotPrice,
      })
    : Infinity;
  const currentPlayerGender = room.currentPlayer?.gender;
  const myGenderCountForCurrent = currentPlayerGender === "female" ? myRosterCounts.female : myRosterCounts.male;
  const myGenderQuotaMaxForCurrent = currentPlayerGender === "female" ? womenQuota.max : menQuota.max;
  const genderCapped = isGenderCapped(currentPlayerGender, myGenderCountForCurrent, myGenderQuotaMaxForCurrent);

  const canAffordPurse = Boolean(myTeam && proposedPrice != null && proposedPrice <= myTeam.purseRemaining);
  const withinReserveCap = Boolean(proposedPrice != null && proposedPrice <= myBidCap);
  const canAfford = canAffordPurse && withinReserveCap;
  const canBid = isLive && biddingOpen && Boolean(myTeam) && !alreadyHighBidder && canAfford && !genderCapped;

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

  async function handleWithdrawBid() {
    const ok = await confirm({
      title: "Withdraw your bid?",
      description: "Your bid will be pulled back to whoever (or wherever) it was before. This is your one bid withdrawal for the whole auction -- you won't be able to do this again.",
      confirmLabel: "Withdraw bid",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    setWithdrawing(true);
    try {
      await withdrawBid(event.id, teamRep.teamId);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setWithdrawing(false);
    }
  }

  const otherTeamPlayers = room.soldPlayers.filter((p) => p.soldTeamId !== teamRep.teamId);
  const myOutgoingSwap = swapRequests.find(
    (r) => r.requesterTeamId === teamRep.teamId && (r.status === "pending" || r.status === "accepted")
  );
  const incomingSwaps = swapRequests.filter((r) => r.targetTeamId === teamRep.teamId && r.status === "pending");
  const canOfferSwap = Boolean(myTeam) && !myTeam.swapUsed && !myOutgoingSwap;

  async function handleSendSwap({ playerId, targetTeamId, price }) {
    await requestSwap(event.id, {
      requesterTeamId: teamRep.teamId,
      targetTeamId,
      playerId,
      price,
      createdByUid: user.uid,
    });
  }

  async function handleCancelSwap(requestId) {
    setSwapActionError(null);
    try {
      await cancelSwapRequest(event.id, requestId);
    } catch (err) {
      setSwapActionError(friendlyErrorMessage(err));
    }
  }

  async function handleRespondSwap(requestId, accept) {
    setSwapActionError(null);
    setRespondingId(requestId);
    try {
      await respondToSwapRequest(event.id, requestId, accept, user.uid);
    } catch (err) {
      setSwapActionError(friendlyErrorMessage(err));
    } finally {
      setRespondingId(null);
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
              <Typography variant="h6">{formatAmount(mySpent)}</Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Remaining
              </Typography>
              <Typography variant="h6">{formatAmount(myTeam.purseRemaining)}</Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Total purse
              </Typography>
              <Typography variant="h6">{formatAmount(myTeam.purseTotal)}</Typography>
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

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
            {Boolean(event.reserveSlotPrice) && (
              <Chip
                size="small"
                color={myBidCap < myTeam.purseRemaining ? "warning" : "default"}
                variant="outlined"
                label={`Max safe bid: ${formatAmount(Number.isFinite(myBidCap) ? myBidCap : myTeam.purseRemaining)}`}
              />
            )}
            {genderTotals.female > 0 && (
              <Chip
                size="small"
                variant="outlined"
                color={myRosterCounts.female >= womenQuota.max ? "error" : "default"}
                label={`Women ${myRosterCounts.female}/${womenQuota.max}`}
              />
            )}
            {genderTotals.male > 0 && (
              <Chip
                size="small"
                variant="outlined"
                color={myRosterCounts.male >= menQuota.max ? "error" : "default"}
                label={`Men ${myRosterCounts.male}/${menQuota.max}`}
              />
            )}
          </Stack>

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
                    <ListItemText primary={p.name} secondary={`Bought for ${formatAmount(p.soldPrice)}`} />
                  </ListItem>
                ))}
              </List>
            )}
          </Collapse>
        </Paper>
      )}

      {myTeam && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Swap a player
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {myTeam.swapUsed
                  ? "You've used your one swap for this auction."
                  : "Offer any team a price for one of their players -- one use per team, any time."}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<SwapHorizIcon />}
              disabled={!canOfferSwap}
              onClick={() => setSwapDialogOpen(true)}
            >
              Swap a player
            </Button>
          </Stack>

          {swapActionError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setSwapActionError(null)}>
              {swapActionError}
            </Alert>
          )}

          {myOutgoingSwap &&
            (() => {
              const player = room.players.find((p) => p.id === myOutgoingSwap.playerId);
              const targetTeam = room.teams.find((t) => t.id === myOutgoingSwap.targetTeamId);
              return (
                <Alert
                  severity={myOutgoingSwap.status === "accepted" ? "success" : "info"}
                  sx={{ mt: 2 }}
                  action={
                    myOutgoingSwap.status === "pending" && (
                      <Button color="inherit" size="small" onClick={() => handleCancelSwap(myOutgoingSwap.id)}>
                        Withdraw
                      </Button>
                    )
                  }
                >
                  {myOutgoingSwap.status === "accepted"
                    ? `${targetTeam?.name || "They"} agreed to your offer of ${formatAmount(myOutgoingSwap.price)} for ${player?.name || "that player"} -- waiting for the organizer to confirm it.`
                    : `Waiting for ${targetTeam?.name || "the other team"} to respond to your offer of ${formatAmount(myOutgoingSwap.price)} for ${player?.name || "that player"}.`}
                </Alert>
              );
            })()}

          {incomingSwaps.map((req) => {
            const player = room.players.find((p) => p.id === req.playerId);
            const fromTeam = room.teams.find((t) => t.id === req.requesterTeamId);
            return (
              <Alert
                key={req.id}
                severity="warning"
                sx={{ mt: 2 }}
                action={
                  <Stack direction="row" spacing={1}>
                    <Button
                      color="inherit"
                      size="small"
                      disabled={respondingId === req.id}
                      onClick={() => handleRespondSwap(req.id, false)}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={respondingId === req.id}
                      onClick={() => handleRespondSwap(req.id, true)}
                    >
                      Accept
                    </Button>
                  </Stack>
                }
              >
                {fromTeam?.name || "Another team"} wants to buy {player?.name || "this player"} from you for{" "}
                {formatAmount(req.price)}.
              </Alert>
            );
          })}
        </Paper>
      )}

      <SwapRequestDialog
        open={swapDialogOpen}
        onClose={() => setSwapDialogOpen(false)}
        myTeam={myTeam}
        teams={room.teams}
        otherTeamPlayers={otherTeamPlayers}
        onSubmit={handleSendSwap}
      />

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
          biddingOpen={biddingOpen}
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
            : !biddingOpen
            ? "Waiting for organizer to start bidding"
            : genderCapped
            ? "Your squad is full for this gender"
            : !canAffordPurse
            ? "Insufficient purse"
            : !withinReserveCap
            ? "Over your reserve-safe limit"
            : `Bid ${formatAmount(proposedPrice)}`}
        </Button>
      </motion.div>

      {alreadyHighBidder && myTeam && (
        <Button
          fullWidth
          size="small"
          color="error"
          disabled={myTeam.bidWithdrawUsed || withdrawing}
          onClick={handleWithdrawBid}
          sx={{ mt: 1 }}
        >
          {myTeam.bidWithdrawUsed
            ? "Bid withdrawal already used for this auction"
            : withdrawing
            ? "Withdrawing..."
            : "Withdraw my bid (one-time use)"}
        </Button>
      )}

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
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <TeamPurseList teams={room.teams} highlightTeamId={teamRep.teamId} players={room.players} />
        </Paper>
      </Collapse>

      <Button
        size="small"
        onClick={() => setSoldOpen((o) => !o)}
        endIcon={soldOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ mb: 1 }}
      >
        Sold players ({room.soldPlayers.length})
      </Button>
      <Collapse in={soldOpen}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          {room.soldPlayers.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No players sold yet.
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 420, overflowY: "auto" }}>
              {room.teams
                .map((team) => ({ team, players: room.soldPlayers.filter((p) => p.soldTeamId === team.id) }))
                .filter((g) => g.players.length > 0)
                .concat(
                  (() => {
                    const orphaned = room.soldPlayers.filter((p) => !room.teams.some((t) => t.id === p.soldTeamId));
                    return orphaned.length ? [{ team: null, players: orphaned }] : [];
                  })()
                )
                .map(({ team, players: teamPlayers }) => (
                  <Box
                    key={team?.id || "unknown"}
                    data-testid={`sold-group-${team?.id || "unknown"}`}
                    sx={{ mb: 1.5, "&:last-child": { mb: 0 } }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 0.5, py: 0.5 }}>
                      <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: team?.color || "grey.400", flexShrink: 0 }} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        {team?.name || "Unknown team"} ({teamPlayers.length})
                      </Typography>
                    </Stack>
                    <List dense disablePadding>
                      {teamPlayers.map((p) => (
                        <ListItem key={p.id} disableGutters sx={{ pl: 2 }}>
                          <ListItemAvatar>
                            <Avatar src={p.photoUrl} alt={p.name} sx={{ width: 32, height: 32 }} />
                          </ListItemAvatar>
                          <ListItemText primary={p.name} secondary={formatAmount(p.soldPrice)} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ))}
            </Box>
          )}
        </Paper>
      </Collapse>

      <Button
        size="small"
        onClick={() => setUnsoldOpen((o) => !o)}
        endIcon={unsoldOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ mb: 1 }}
      >
        Unsold players ({room.unsoldPlayers.length})
      </Button>
      <Collapse in={unsoldOpen}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          {room.unsoldPlayers.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No unsold players.
            </Typography>
          ) : (
            <List dense disablePadding sx={{ maxHeight: 320, overflowY: "auto" }}>
              {room.unsoldPlayers.map((p) => (
                <ListItem key={p.id} disableGutters>
                  <ListItemAvatar>
                    <Avatar src={p.photoUrl} alt={p.name} sx={{ width: 32, height: 32 }} />
                  </ListItemAvatar>
                  <ListItemText primary={p.name} secondary={`Base price ${formatAmount(p.basePrice)}`} />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Collapse>
    </Container>
  );
}

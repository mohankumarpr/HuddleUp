import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import UndoIcon from "@mui/icons-material/Undo";
import StarIcon from "@mui/icons-material/Star";
import ShareIcon from "@mui/icons-material/Share";
import { useAuth } from "../../context/AuthContext";
import { subscribeToEvent, subscribeToSports } from "../../utils/firebase/events";
import { requeueUnsoldPlayer } from "../../utils/firebase/players";
import { completeSwapRequest, subscribeToSwapRequests } from "../../utils/firebase/swaps";
import { partitionPoolForAuction } from "../../utils/marquee";
import {
  DEFAULT_LADDER,
  confirmSold,
  extendBlockTimer,
  getOrCreateAuctionState,
  markUnsold,
  nextIncrement,
  placeBid,
  revertLastAction,
  setAuctionStatus,
  startBidding,
  startPlayerOnBlock,
  subscribeToBidsForPlayer,
  updateAuctionRules,
} from "../../utils/firebase/auctionRealtime";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { logActivity } from "../../utils/firebase/activityLog";
import { playSwapSound } from "../../utils/sound";
import { useAuctionRoom } from "./useAuctionRoom";
import PlayerOnBlockDialog from "./PlayerOnBlockDialog";
import AuctionStatsBar from "./AuctionStatsBar";
import SoundToggleButton from "../common/SoundToggleButton";
import TeamPurseList from "../common/TeamPurseList";
import ShareSoldDialog from "../common/ShareSoldDialog";
import SwapRequestsPanel from "../common/SwapRequestsPanel";
import LoadingSpinner from "../LoadingSpinner";

function AuctionRulesDialog({ open, ladder, bidTimerSeconds, onClose, onSave }) {
  const [rows, setRows] = useState([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setRows((ladder && ladder.length ? ladder : DEFAULT_LADDER).map((r) => ({ upTo: r.upTo, increment: r.increment })));
      setTimerSeconds(bidTimerSeconds || 0);
      setError(null);
    }
  }, [open, ladder, bidTimerSeconds]);

  const setRow = (i, key, value) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));

  async function handleSave() {
    const cleaned = rows
      .map((r) => ({ upTo: Number(r.upTo), increment: Number(r.increment) }))
      .filter((r) => Number.isFinite(r.upTo) && Number.isFinite(r.increment) && r.increment > 0);
    if (!cleaned.length) {
      setError("Add at least one valid rung (both fields are numbers, increment > 0).");
      return;
    }
    const cleanTimer = Math.max(0, Number(timerSeconds) || 0);
    setSaving(true);
    setError(null);
    try {
      await onSave({ incrementLadder: cleaned.sort((a, b) => a.upTo - b.upTo), bidTimerSeconds: cleanTimer });
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save the auction rules.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Auction rules</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="subtitle2" gutterBottom>
          Bid timer
        </Typography>
        <TextField
          label="Seconds per player"
          type="number"
          size="small"
          value={timerSeconds}
          onChange={(e) => setTimerSeconds(e.target.value)}
          helperText="0 = no timer (you confirm sold/unsold manually, as before). A bid resets the clock."
          fullWidth
          sx={{ mb: 3 }}
        />

        <Typography variant="subtitle2" gutterBottom>
          Bid increments
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Below each "up to" price, a bid raises the price by that increment. The last rung's increment applies to any
          price above the highest threshold.
        </Typography>
        <Stack spacing={1.5}>
          {rows.map((row, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <TextField
                label="Up to"
                type="number"
                size="small"
                value={row.upTo}
                onChange={(e) => setRow(i, "upTo", e.target.value)}
                fullWidth
              />
              <TextField
                label="Increment"
                type="number"
                size="small"
                value={row.increment}
                onChange={(e) => setRow(i, "increment", e.target.value)}
                fullWidth
              />
              <IconButton size="small" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))} aria-label="Remove rung">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
        <Button size="small" startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setRows((r) => [...r, { upTo: "", increment: "" }])}>
          Add rung
        </Button>
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

export default function OrganizerConsole() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const {
    loading,
    state,
    teams,
    players,
    currentPlayer,
    highBidTeam,
    poolPlayers,
    soldPlayers,
    unsoldPlayers,
    stats,
    soundEnabled,
    toggleSound,
  } = useAuctionRoom(eventId);
  const [sports, setSports] = useState([]);
  const [event, setEvent] = useState(null);
  const [bids, setBids] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [shareCard, setShareCard] = useState(null);
  const [swapRequests, setSwapRequests] = useState([]);

  useEffect(() => subscribeToEvent(eventId, setEvent), [eventId]);
  useEffect(() => subscribeToSwapRequests(eventId, setSwapRequests), [eventId]);

  // A chime the moment a swap offer arrives (or gets accepted and is ready to confirm) -- this can
  // happen at any time, including while the full-screen on-the-block dialog covers the console, so
  // a silent panel update alone could easily go unnoticed. Seeded silently on the first snapshot,
  // same reasoning as the sold-confetti seeding in useAuctionRoom, so reopening the console after
  // several swaps are already pending/accepted doesn't fire a barrage of chimes.
  const swapSeenRef = useRef(null);
  useEffect(() => {
    const next = new Map(
      swapRequests.filter((r) => r.status === "pending" || r.status === "accepted").map((r) => [r.id, r.status])
    );
    if (swapSeenRef.current === null) {
      swapSeenRef.current = next;
      return;
    }
    const prev = swapSeenRef.current;
    let notify = false;
    for (const [id, status] of next) {
      const prevStatus = prev.get(id);
      if (!prevStatus || (prevStatus === "pending" && status === "accepted")) notify = true;
    }
    if (notify && soundEnabled) playSwapSound();
    swapSeenRef.current = next;
  }, [swapRequests, soundEnabled]);

  useEffect(() => {
    getOrCreateAuctionState(eventId);
    const unsubscribe = subscribeToSports(eventId, setSports);
    return unsubscribe;
  }, [eventId]);

  useEffect(() => {
    if (!state?.currentPlayerId) {
      setBids([]);
      return undefined;
    }
    return subscribeToBidsForPlayer(eventId, state.currentPlayerId, setBids);
  }, [eventId, state?.currentPlayerId]);

  // Auto-pace: when a bid timer is configured, this organizer tab confirms the sale (or marks
  // unsold if nobody bid) the moment the shared deadline passes. Re-scheduled on every change to
  // blockDeadlineAt -- a new bid pushes it back, a new player on the block gets its own deadline,
  // and it's cleared entirely (no-op here) once a sale is confirmed.
  useEffect(() => {
    if (!state?.blockDeadlineAt || !state?.currentPlayerId) return undefined;
    const msLeft = state.blockDeadlineAt - Date.now();
    const playerName = currentPlayer?.name;
    const teamName = highBidTeam?.name;
    const price = state?.currentPrice;
    const timer = setTimeout(() => {
      confirmSold(eventId, user.uid)
        .then(() => {
          logActivity(eventId, {
            actorUid: user.uid,
            action: "player_sold",
            summary: teamName ? `Sold ${playerName} to ${teamName} for ${price} (timer expired)` : `${playerName} went unsold (timer expired, no bids)`,
          });
        })
        .catch(() => {
          // A second open organizer tab racing the same deadline will find the player already
          // resolved -- harmless, so this stays silent rather than surfacing a confusing error.
        });
    }, Math.max(0, msLeft));
    return () => clearTimeout(timer);
    // currentPlayer/highBidTeam/currentPrice are read only to label the log entry when the timer
    // fires, not to decide whether to (re)schedule it -- blockDeadlineAt already changes on every
    // bid and every new player, so keying off that alone is correct and avoids rescheduling the
    // timeout on every bid-price re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, user.uid, state?.blockDeadlineAt, state?.currentPlayerId]);

  function sportNames(sportIds) {
    return (sportIds || []).map((id) => sports.find((s) => s.id === id)?.name).filter(Boolean).join(", ");
  }

  async function run(action) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleConfirmSold() {
    const playerSnapshot = currentPlayer;
    const teamSnapshot = highBidTeam;
    const price = state?.currentPrice;
    return run(async () => {
      await confirmSold(eventId, user.uid);
      logActivity(eventId, {
        actorUid: user.uid,
        action: "player_sold",
        summary: teamSnapshot
          ? `Sold ${playerSnapshot?.name} to ${teamSnapshot.name} for ${price}`
          : `${playerSnapshot?.name} went unsold (no bids)`,
      });
      // Only a genuine sale (someone actually won the player) is worth a share card -- an
      // unsold pass-through has nothing worth announcing.
      if (teamSnapshot) {
        setShareCard({ player: playerSnapshot, teamName: teamSnapshot.name, teamColor: teamSnapshot.color, price });
      }
    });
  }

  function handleMarkUnsold() {
    const playerName = currentPlayer?.name;
    return run(async () => {
      await markUnsold(eventId, user.uid);
      logActivity(eventId, { actorUid: user.uid, action: "player_unsold", summary: `Marked ${playerName} unsold` });
    });
  }

  // Opens the block for bids -- a player going on the block and bidding actually opening are two
  // separate organizer actions, so everyone has a moment to see who's up before the clock (if any)
  // starts and the Bid buttons unlock.
  function handleStartBidding() {
    const playerName = currentPlayer?.name;
    return run(async () => {
      await startBidding(eventId, user.uid, state?.bidTimerSeconds);
      logActivity(eventId, { actorUid: user.uid, action: "bidding_started", summary: `Opened bidding for ${playerName}` });
    });
  }

  // The organizer placing a bid "for" a team -- useful when a rep is bidding verbally/in person
  // and the organizer is entering it on their behalf, or a team has no rep logged in at all.
  // Reuses the same transactional placeBid the public bidder view uses, so the purse check and
  // concurrency safety are identical; Firestore rules already let an org member write this
  // regardless of whose uid places it.
  function handleBidForTeam(teamId) {
    const team = teams.find((t) => t.id === teamId);
    const playerName = currentPlayer?.name;
    const price = state ? nextIncrement(state.currentPrice, state.incrementLadder) : null;
    return run(async () => {
      await placeBid(eventId, teamId, user.uid);
      logActivity(eventId, {
        actorUid: user.uid,
        action: "organizer_bid_placed",
        summary: `Placed a bid of ${price} for ${team?.name || "a team"} on ${playerName || "the player"}`,
      });
    });
  }

  if (loading) return <LoadingSpinner />;

  const isLive = state?.status === "live";
  const undo = state?.undo;
  const undoPlayerName = undo && players.find((p) => p.id === undo.playerId)?.name;
  const undoTeamName = undo?.type === "sold" && teams.find((t) => t.id === undo.teamId)?.name;
  const { eligible: eligiblePoolPlayers, heldBack: heldBackPlayers } = partitionPoolForAuction(poolPlayers);
  const eligibleIds = new Set(eligiblePoolPlayers.map((p) => p.id));
  const nextBidAmount = state ? nextIncrement(state.currentPrice, state.incrementLadder) : null;

  function handleRequeueUnsold(player) {
    return run(async () => {
      await requeueUnsoldPlayer(eventId, player.id);
      logActivity(eventId, { actorUid: user.uid, action: "player_requeued", summary: `Sent ${player.name} back to the pool` });
    });
  }

  const pendingSwaps = swapRequests.filter((r) => r.status === "pending");
  const acceptedSwaps = swapRequests.filter((r) => r.status === "accepted");

  function handleCompleteSwap(req) {
    const player = players.find((p) => p.id === req.playerId);
    const fromTeam = teams.find((t) => t.id === req.targetTeamId);
    const toTeam = teams.find((t) => t.id === req.requesterTeamId);
    return run(async () => {
      await completeSwapRequest(eventId, req.id);
      logActivity(eventId, {
        actorUid: user.uid,
        action: "swap_completed",
        summary: `Swapped ${player?.name || "a player"} from ${fromTeam?.name || "a team"} to ${toTeam?.name || "a team"} for ${req.price}`,
      });
    });
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Live auction console
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SoundToggleButton enabled={soundEnabled} onToggle={toggleSound} />
          <Tooltip title="Auction rules">
            <IconButton size="small" onClick={() => setRulesOpen(true)} aria-label="Edit auction rules">
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {pendingSwaps.length + acceptedSwaps.length > 0 && (
            <Chip
              label={`${pendingSwaps.length + acceptedSwaps.length} swap request${pendingSwaps.length + acceptedSwaps.length === 1 ? "" : "s"}`}
              color={acceptedSwaps.length > 0 ? "success" : "info"}
            />
          )}
          <Chip label={state?.status?.replace("_", " ") || "not started"} color={isLive ? "success" : "default"} />
        </Stack>
      </Stack>

      <Box sx={{ mb: 3 }}>
        <AuctionStatsBar stats={stats} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {undo && !currentPlayer && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              color="inherit"
              startIcon={<UndoIcon />}
              disabled={busy}
              onClick={() => {
                const summary =
                  undo.type === "sold"
                    ? `Undid sale of ${undoPlayerName || "a player"} to ${undoTeamName || "a team"}`
                    : `Undid unsold mark on ${undoPlayerName || "a player"}`;
                run(async () => {
                  await revertLastAction(eventId, user.uid);
                  logActivity(eventId, { actorUid: user.uid, action: "action_undone", summary });
                });
              }}
            >
              Undo
            </Button>
          }
        >
          {undo.type === "sold"
            ? `Last action: sold ${undoPlayerName || "a player"} to ${undoTeamName || "a team"} for ${undo.price}.`
            : `Last action: marked ${undoPlayerName || "a player"} unsold.`}
        </Alert>
      )}

      {state?.status === "not_started" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Start the auction to let team reps and spectators join the live room.
          <Button
            size="small"
            variant="contained"
            sx={{ ml: 2 }}
            disabled={busy}
            onClick={() => run(() => setAuctionStatus(eventId, "live", user.uid))}
          >
            Start auction
          </Button>
        </Alert>
      )}

      {isLive && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Pool ({poolPlayers.length})
              </Typography>
              {poolPlayers.length === 0 ? (
                <Typography color="text.secondary">
                  No players left in the pool. Approve more registrations to continue.
                </Typography>
              ) : (
                <>
                  {!currentPlayer && (
                    <Tooltip
                      title={
                        eligiblePoolPlayers.length === 0
                          ? "Every remaining player is a held-back marquee player"
                          : ""
                      }
                    >
                      <span>
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{ mb: 2 }}
                          disabled={busy || eligiblePoolPlayers.length === 0}
                          onClick={() =>
                            run(() =>
                              startPlayerOnBlock(
                                eventId,
                                eligiblePoolPlayers[Math.floor(Math.random() * eligiblePoolPlayers.length)],
                                user.uid
                              )
                            )
                          }
                        >
                          Pick random player
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                  <List dense sx={{ maxHeight: 420, overflowY: "auto", flexGrow: 1 }}>
                    {poolPlayers.map((player) => {
                      const heldBack = !eligibleIds.has(player.id);
                      return (
                        <ListItem
                          key={player.id}
                          secondaryAction={
                            !currentPlayer && (
                              <Tooltip
                                title={
                                  heldBack
                                    ? `Marquee player -- held back until ${heldBackPlayers.length * 2} or fewer players remain in the pool`
                                    : "Put this player on the block"
                                }
                              >
                                <span>
                                  <Button
                                    size="small"
                                    disabled={busy || heldBack}
                                    onClick={() => run(() => startPlayerOnBlock(eventId, player, user.uid))}
                                  >
                                    Put on block
                                  </Button>
                                </span>
                              </Tooltip>
                            )
                          }
                        >
                          <ListItemAvatar>
                            <Avatar src={player.photoUrl} alt={player.name} />
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                {player.marquee && <StarIcon sx={{ fontSize: 15, color: "warning.main" }} />}
                                <Typography variant="body2" component="span">
                                  {player.name}
                                </Typography>
                              </Stack>
                            }
                            secondary={`Base price ${player.basePrice}${heldBack ? " · held back" : ""}`}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Sold ({soldPlayers.length})
              </Typography>
              {soldPlayers.length === 0 ? (
                <Typography color="text.secondary">No players sold yet.</Typography>
              ) : (
                <List dense sx={{ maxHeight: 420, overflowY: "auto", flexGrow: 1 }}>
                  {soldPlayers.map((player) => {
                    const soldTeam = teams.find((t) => t.id === player.soldTeamId);
                    return (
                      <ListItem
                        key={player.id}
                        secondaryAction={
                          <Tooltip title={`Share ${player.name}'s sale`}>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setShareCard({ player, teamName: soldTeam?.name || "Unknown team", teamColor: soldTeam?.color, price: player.soldPrice })
                              }
                              aria-label={`Share ${player.name}'s sale`}
                            >
                              <ShareIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar src={player.photoUrl} alt={player.name} />
                        </ListItemAvatar>
                        <ListItemText primary={player.name} secondary={`${soldTeam?.name || "Unknown team"} · ${player.soldPrice}`} />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Unsold ({unsoldPlayers.length})
              </Typography>
              {unsoldPlayers.length === 0 ? (
                <Typography color="text.secondary">No unsold players.</Typography>
              ) : (
                <List dense sx={{ maxHeight: 420, overflowY: "auto", flexGrow: 1 }}>
                  {unsoldPlayers.map((player) => (
                    <ListItem
                      key={player.id}
                      secondaryAction={
                        <Button size="small" disabled={busy} onClick={() => handleRequeueUnsold(player)}>
                          Back to pool
                        </Button>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar src={player.photoUrl} alt={player.name} />
                      </ListItemAvatar>
                      <ListItemText primary={player.name} secondary={`Base price ${player.basePrice}`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {(acceptedSwaps.length > 0 || pendingSwaps.length > 0) && (
        <>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Swap requests
          </Typography>
          <SwapRequestsPanel
            swapRequests={swapRequests}
            players={players}
            teams={teams}
            busy={busy}
            onComplete={handleCompleteSwap}
            sx={{ mb: 3 }}
          />
        </>
      )}

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Teams
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TeamPurseList teams={teams} players={players} reserveSlotPrice={event?.reserveSlotPrice} />
      </Paper>

      <AuctionRulesDialog
        open={rulesOpen}
        ladder={state?.incrementLadder}
        bidTimerSeconds={state?.bidTimerSeconds}
        onClose={() => setRulesOpen(false)}
        onSave={(rules) => updateAuctionRules(eventId, rules, user.uid)}
      />

      <PlayerOnBlockDialog
        player={currentPlayer}
        currentPrice={state?.currentPrice}
        highBidTeam={highBidTeam}
        sportNames={sportNames}
        basePrice={currentPlayer ? state?.basePrice : null}
        deadlineAt={state?.blockDeadlineAt}
        timerSeconds={state?.bidTimerSeconds}
        onExtendTimer={() => run(() => extendBlockTimer(eventId, 60, user.uid))}
        bids={bids}
        teams={teams}
        busy={busy}
        error={error}
        onDismissError={() => setError(null)}
        nextBidAmount={nextBidAmount}
        onBidForTeam={handleBidForTeam}
        onConfirmSold={handleConfirmSold}
        onMarkUnsold={handleMarkUnsold}
        biddingOpen={Boolean(state?.biddingOpen)}
        onStartBidding={handleStartBidding}
        allPlayers={players}
        swapRequests={swapRequests}
        onCompleteSwap={handleCompleteSwap}
        reserveSlotPrice={event?.reserveSlotPrice}
      />

      <ShareSoldDialog
        open={Boolean(shareCard)}
        onClose={() => setShareCard(null)}
        player={shareCard?.player}
        teamName={shareCard?.teamName}
        teamColor={shareCard?.teamColor}
        price={shareCard?.price}
        eventName={event?.name}
      />
    </Box>
  );
}

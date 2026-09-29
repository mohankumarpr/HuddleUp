import React, { useEffect, useState } from "react";
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
import { useAuth } from "../../context/AuthContext";
import { subscribeToSports } from "../../utils/firebase/events";
import {
  DEFAULT_LADDER,
  confirmSold,
  getOrCreateAuctionState,
  markUnsold,
  revertLastAction,
  setAuctionStatus,
  startPlayerOnBlock,
  subscribeToBidsForPlayer,
  updateIncrementLadder,
} from "../../utils/firebase/auctionRealtime";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { useAuctionRoom } from "./useAuctionRoom";
import PlayerOnBlockCard from "./PlayerOnBlockCard";
import BidHistoryList from "../common/BidHistoryList";
import SoundToggleButton from "../common/SoundToggleButton";
import LoadingSpinner from "../LoadingSpinner";

function LadderDialog({ open, ladder, onClose, onSave }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setRows((ladder && ladder.length ? ladder : DEFAULT_LADDER).map((r) => ({ upTo: r.upTo, increment: r.increment })));
      setError(null);
    }
  }, [open, ladder]);

  const setRow = (i, key, value) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));

  async function handleSave() {
    const cleaned = rows
      .map((r) => ({ upTo: Number(r.upTo), increment: Number(r.increment) }))
      .filter((r) => Number.isFinite(r.upTo) && Number.isFinite(r.increment) && r.increment > 0);
    if (!cleaned.length) {
      setError("Add at least one valid rung (both fields are numbers, increment > 0).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(cleaned.sort((a, b) => a.upTo - b.upTo));
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save the bid increments.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Bid increments</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Below each "up to" price, a bid raises the price by that increment. The last rung's increment applies to any
          price above the highest threshold.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
    soundEnabled,
    toggleSound,
  } = useAuctionRoom(eventId);
  const [sports, setSports] = useState([]);
  const [bids, setBids] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ladderOpen, setLadderOpen] = useState(false);

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

  if (loading) return <LoadingSpinner />;

  const isLive = state?.status === "live";
  const undo = state?.undo;
  const undoPlayerName = undo && players.find((p) => p.id === undo.playerId)?.name;
  const undoTeamName = undo?.type === "sold" && teams.find((t) => t.id === undo.teamId)?.name;

  return (
    <Box sx={{ maxWidth: 960 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Live auction console
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SoundToggleButton enabled={soundEnabled} onToggle={toggleSound} />
          <Tooltip title="Bid increments">
            <IconButton size="small" onClick={() => setLadderOpen(true)} aria-label="Edit bid increments">
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Chip label={state?.status?.replace("_", " ") || "not started"} color={isLive ? "success" : "default"} />
        </Stack>
      </Stack>

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
              onClick={() => run(() => revertLastAction(eventId, user.uid))}
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

      <Box sx={{ mb: 2 }}>
        <PlayerOnBlockCard
          player={currentPlayer}
          currentPrice={state?.currentPrice}
          highBidTeam={highBidTeam}
          sportNames={sportNames}
        />
      </Box>

      {currentPlayer && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Bid history
          </Typography>
          <BidHistoryList bids={bids} teams={teams} dense />
        </Paper>
      )}

      {currentPlayer ? (
        <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            disabled={busy}
            onClick={() => run(() => confirmSold(eventId, user.uid))}
          >
            {highBidTeam ? `Confirm SOLD to ${highBidTeam.name}` : "Confirm (no bids -> unsold)"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="large"
            disabled={busy}
            onClick={() => run(() => markUnsold(eventId, user.uid))}
          >
            Mark unsold
          </Button>
        </Stack>
      ) : (
        isLive && (
          <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Pick the next player ({poolPlayers.length} remaining)
            </Typography>
            {poolPlayers.length === 0 ? (
              <Typography color="text.secondary">
                No players left in the pool. Approve more registrations to continue.
              </Typography>
            ) : (
              <>
                <Button
                  variant="contained"
                  sx={{ mb: 2 }}
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      startPlayerOnBlock(
                        eventId,
                        poolPlayers[Math.floor(Math.random() * poolPlayers.length)],
                        user.uid
                      )
                    )
                  }
                >
                  Pick random player
                </Button>
                <List dense sx={{ maxHeight: 280, overflowY: "auto" }}>
                  {poolPlayers.map((player) => (
                    <ListItem
                      key={player.id}
                      secondaryAction={
                        <Button size="small" disabled={busy} onClick={() => run(() => startPlayerOnBlock(eventId, player, user.uid))}>
                          Put on block
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
              </>
            )}
          </Paper>
        )
      )}

      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Teams
      </Typography>
      <Grid container spacing={2}>
        {teams.map((team) => (
          <Grid item xs={12} sm={6} md={4} key={team.id}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: team.color }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontWeight={600}>{team.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Purse {team.purseRemaining} / {team.purseTotal}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <LadderDialog
        open={ladderOpen}
        ladder={state?.incrementLadder}
        onClose={() => setLadderOpen(false)}
        onSave={(ladder) => updateIncrementLadder(eventId, ladder, user.uid)}
      />
    </Box>
  );
}

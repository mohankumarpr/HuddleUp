import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import UndoIcon from "@mui/icons-material/Undo";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ShareIcon from "@mui/icons-material/Share";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import TableRowsIcon from "@mui/icons-material/TableRows";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { genderMeta } from "../../utils/gender";
import GenderBadge from "../common/GenderBadge";
import { computeGenderQuota, computePoolGenderTotals, computeTotalSlotsPerTeam } from "../../utils/auctionQuota";
import { subscribeToEvent, subscribeToSports, subscribeToTeams, updateEvent } from "../../utils/firebase/events";
import {
  bulkSetBasePrice,
  deletePlayer,
  returnPlayerToPool,
  subscribeToPlayerPrivate,
  subscribeToPlayers,
  transferPlayer,
  updatePlayer,
  updatePlayerPrivate,
} from "../../utils/firebase/players";
import { formatAmount } from "../../utils/formatAmount";
import { subscribeToBidsForPlayer } from "../../utils/firebase/auctionRealtime";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { logActivity } from "../../utils/firebase/activityLog";
import { downloadTextFile } from "../../utils/download";
import { buildResultsCsv } from "../../utils/resultsExport";
import BidHistoryList from "../common/BidHistoryList";
import ShareSoldDialog from "../common/ShareSoldDialog";
import EditPlayerDialog from "./EditPlayerDialog";
import PlayerDetailDialog from "./PlayerDetailDialog";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

const STATUS_COLOR = {
  pool: "default",
  on_block: "warning",
  sold: "success",
  unsold: "error",
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pool", label: "In pool" },
  { value: "on_block", label: "On the block" },
  { value: "sold", label: "Sold" },
  { value: "unsold", label: "Unsold" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name (A-Z)" },
  { value: "basePrice", label: "Base price (high-low)" },
  { value: "newest", label: "Newest first" },
];

const PAGE_SIZE = 24;

function PlayerBidHistory({ eventId, playerId, teams }) {
  const [bids, setBids] = useState(null);
  useEffect(() => subscribeToBidsForPlayer(eventId, playerId, setBids), [eventId, playerId]);
  if (bids === null) return <CircularProgress size={20} />;
  return <BidHistoryList bids={bids} teams={teams} dense emptyText="No bids were placed on this player." />;
}

export default function PlayerPool() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState(null);
  const [privateById, setPrivateById] = useState({});
  const [sports, setSports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const [historyPlayer, setHistoryPlayer] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferToTeamId, setTransferToTeamId] = useState("");
  const [transferError, setTransferError] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [marqueeOnly, setMarqueeOnly] = useState(false);
  const [shareCard, setShareCard] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [event, setEvent] = useState(null);
  const [reservePriceDraft, setReservePriceDraft] = useState("");
  const [savingReservePrice, setSavingReservePrice] = useState(false);
  const [basePriceDraft, setBasePriceDraft] = useState(5000000);
  const [settingBasePrice, setSettingBasePrice] = useState(false);
  const [basePriceError, setBasePriceError] = useState(null);
  // Remembered per browser (not per event) -- whichever view an organizer prefers, they almost
  // certainly want it again next time, regardless of which event they're looking at.
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("playerPoolViewMode") === "table" ? "table" : "card";
    } catch {
      return "card";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("playerPoolViewMode", viewMode);
    } catch {
      // Ignore -- the preference just won't persist across sessions.
    }
  }, [viewMode]);
  const statusFilter = searchParams.get("status") || "";

  function setStatusFilter(value) {
    setSearchParams(value ? { status: value } : {}, { replace: true });
    setPage(1);
  }

  useEffect(() => subscribeToEvent(eventId, setEvent), [eventId]);
  useEffect(() => {
    setReservePriceDraft(event?.reserveSlotPrice ? String(event.reserveSlotPrice) : "");
  }, [event?.reserveSlotPrice]);

  async function handleSaveReservePrice() {
    setSavingReservePrice(true);
    try {
      await updateEvent(eventId, { reserveSlotPrice: Math.max(0, Number(reservePriceDraft) || 0) });
    } finally {
      setSavingReservePrice(false);
    }
  }

  async function handleBulkSetBasePrice() {
    const price = Math.max(0, Number(basePriceDraft) || 0);
    const ok = await confirm({
      title: `Set base price to ${formatAmount(price)} for all ${players.length} players?`,
      description: "This overwrites every player's base price in this event, including already-sold ones. It can't be undone automatically -- you'd need to edit players back one at a time.",
      confirmLabel: "Set for all players",
      destructive: true,
    });
    if (!ok) return;
    setBasePriceError(null);
    setSettingBasePrice(true);
    try {
      await bulkSetBasePrice(eventId, players, price);
      logActivity(eventId, {
        actorUid: user.uid,
        action: "players_base_price_bulk_set",
        summary: `Set base price to ${formatAmount(price)} for all ${players.length} players`,
      });
    } catch (err) {
      setBasePriceError(friendlyErrorMessage(err));
    } finally {
      setSettingBasePrice(false);
    }
  }

  useEffect(() => {
    const unsubs = [
      subscribeToPlayers(eventId, setPlayers),
      subscribeToSports(eventId, setSports),
      subscribeToTeams(eventId, setTeams),
      subscribeToPlayerPrivate(eventId, setPrivateById),
    ];
    return () => unsubs.forEach((u) => u());
  }, [eventId]);

  const sportNames = (sportIds) =>
    (sportIds || [])
      .map((id) => sports.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  const teamName = (id) => teams.find((t) => t.id === id)?.name;

  const visible = useMemo(() => {
    if (!players) return players;
    const q = search.trim().toLowerCase();
    const filtered = players.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (marqueeOnly && !p.marquee) return false;
      if (!q) return true;
      const priv = privateById[p.id] || {};
      return [p.name, priv.email, priv.contact, priv.block].some((v) => (v || "").toLowerCase().includes(q));
    });
    const sorted = [...filtered];
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "basePrice") sorted.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    else if (sortBy === "newest") sorted.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    return sorted;
  }, [players, privateById, search, statusFilter, marqueeOnly, sortBy]);

  const pageCount = Math.max(1, Math.ceil((visible?.length || 0) / PAGE_SIZE));
  const paged = useMemo(() => (visible || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [visible, page]);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy]);

  function handleExport() {
    const csv = buildResultsCsv({ players, teams, sports, privateById });
    downloadTextFile("player-results.csv", csv);
  }

  async function handleToggleMarquee(player) {
    try {
      await updatePlayer(eventId, player.id, { marquee: !player.marquee });
      logActivity(eventId, {
        actorUid: user.uid,
        action: "player_marquee_changed",
        summary: `${player.marquee ? "Unmarked" : "Marked"} ${player.name} as a marquee player`,
      });
    } catch (err) {
      setDeleteError(friendlyErrorMessage(err));
    }
  }

  async function handleEditSave(patch) {
    await updatePlayer(eventId, editTarget.id, patch.player);
    await updatePlayerPrivate(eventId, editTarget.id, patch.private);
    logActivity(eventId, { actorUid: user.uid, action: "player_edited", summary: `Edited ${patch.player.name}'s details` });
  }

  async function handleDelete(player) {
    const ok = await confirm({
      title: `Remove ${player.name}?`,
      description: "They'll be removed from the player pool. This can't be undone.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setDeleteError(null);
    try {
      await deletePlayer(eventId, player.id);
      logActivity(eventId, { actorUid: user.uid, action: "player_removed", summary: `Removed ${player.name} from the player pool` });
    } catch (err) {
      setDeleteError(friendlyErrorMessage(err));
    }
  }

  function openTransfer(player) {
    setTransferError(null);
    setTransferToTeamId("");
    setTransferTarget(player);
  }

  async function handleTransferConfirm() {
    if (!transferToTeamId) return;
    setTransferring(true);
    setTransferError(null);
    try {
      const toTeam = teams.find((t) => t.id === transferToTeamId);
      await transferPlayer(eventId, transferTarget.id, transferToTeamId);
      logActivity(eventId, {
        actorUid: user.uid,
        action: "player_transferred",
        summary: `Transferred ${transferTarget.name} to ${toTeam?.name || "another team"} for ${formatAmount(transferTarget.soldPrice)}`,
      });
      setTransferTarget(null);
    } catch (err) {
      setTransferError(friendlyErrorMessage(err));
    } finally {
      setTransferring(false);
    }
  }

  async function handleReturnToPool(player) {
    const ok = await confirm({
      title: `Return ${player.name} to the pool?`,
      description: `${teamName(player.soldTeamId) || "Their team"} will be refunded ${formatAmount(player.soldPrice)}, and ${player.name} becomes available to put on the block again.`,
      confirmLabel: "Return to pool",
      destructive: true,
    });
    if (!ok) return;
    setDeleteError(null);
    try {
      await returnPlayerToPool(eventId, player.id);
      logActivity(eventId, {
        actorUid: user.uid,
        action: "player_returned_to_pool",
        summary: `Returned ${player.name} to the pool (refunded ${formatAmount(player.soldPrice)} to ${teamName(player.soldTeamId) || "their team"})`,
      });
    } catch (err) {
      setDeleteError(friendlyErrorMessage(err));
    }
  }

  if (!players) return <LoadingSpinner />;

  return (
    <Box>
      <DashboardHero
        title="Player pool"
        subtitle={`${players.length} player${players.length === 1 ? "" : "s"} approved for the auction.`}
        image={heroImageFor("players")}
        icon={<PersonIcon />}
        dense
        action={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: "100%" }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={players.length === 0}
              fullWidth
              sx={{ bgcolor: "#fff", color: "primary.dark", "&:hover": { bgcolor: "rgba(255,255,255,0.9)" }, whiteSpace: "nowrap" }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              component={RouterLink}
              to={`/app/events/${eventId}/import`}
              fullWidth
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#fff" }, whiteSpace: "nowrap" }}
            >
              Bulk upload
            </Button>
          </Stack>
        }
      />

      {(() => {
        const numTeams = teams.length;
        const totalSlotsPerTeam = computeTotalSlotsPerTeam(players.length, numTeams);
        const genderTotals = computePoolGenderTotals(players);
        const womenQuota = computeGenderQuota(genderTotals.female, numTeams);
        const menQuota = computeGenderQuota(genderTotals.male, numTeams);
        return (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Roster planning
            </Typography>
            {numTeams === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Add teams first to see per-team roster targets.
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Chip size="small" variant="outlined" label={`${players.length} players · ${numTeams} teams · ${totalSlotsPerTeam} slots/team`} />
                {genderTotals.female > 0 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Women: ${womenQuota.min === womenQuota.max ? womenQuota.min : `${womenQuota.min}-${womenQuota.max}`}/team (${genderTotals.female} total)`}
                  />
                )}
                {genderTotals.male > 0 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Men: ${menQuota.min === menQuota.max ? menQuota.min : `${menQuota.min}-${menQuota.max}`}/team (${genderTotals.male} total)`}
                  />
                )}
              </Stack>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              <TextField
                size="small"
                label="Reserve price per remaining slot"
                type="number"
                value={reservePriceDraft}
                onChange={(e) => setReservePriceDraft(e.target.value)}
                sx={{ maxWidth: 280 }}
              />
              <Button size="small" variant="outlined" disabled={savingReservePrice} onClick={handleSaveReservePrice}>
                {savingReservePrice ? "Saving..." : "Save"}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 480 }}>
                Caps how much a team can bid, so it never leaves them unable to afford this amount for
                every roster slot still left to fill. Leave at 0 to turn this off.
              </Typography>
            </Stack>

            {basePriceError && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setBasePriceError(null)}>
                {basePriceError}
              </Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mt: 2 }}>
              <TextField
                size="small"
                label="Base price for every player"
                type="number"
                value={basePriceDraft}
                onChange={(e) => setBasePriceDraft(e.target.value)}
                helperText={formatAmount(Number(basePriceDraft) || 0)}
                sx={{ maxWidth: 280 }}
              />
              <Button
                size="small"
                variant="outlined"
                color="warning"
                disabled={settingBasePrice || !players.length}
                onClick={handleBulkSetBasePrice}
              >
                {settingBasePrice ? "Setting..." : "Set for all players"}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 480 }}>
                Overwrites every player's base price at once -- handy for starting a fresh auction where
                everyone opens at the same amount.
              </Typography>
            </Stack>
          </Paper>
        );
      })()}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by name, email, contact or block"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <TextField
          select
          size="small"
          label="Sort by"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          sx={{ minWidth: { sm: 220 } }}
        >
          {SORT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={viewMode}
          onChange={(_, next) => next && setViewMode(next)}
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="card" aria-label="Card view">
            <Tooltip title="Card view">
              <ViewModuleIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="table" aria-label="Table view (shows every player on one screen)">
            <Tooltip title="Table view -- shows every player on one screen">
              <TableRowsIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 2 }}>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value || "all"}
            label={f.label}
            size="small"
            color={statusFilter === f.value ? "primary" : "default"}
            variant={statusFilter === f.value ? "filled" : "outlined"}
            onClick={() => setStatusFilter(f.value)}
          />
        ))}
        <Chip
          icon={marqueeOnly ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
          label="Marquee only"
          size="small"
          color={marqueeOnly ? "warning" : "default"}
          variant={marqueeOnly ? "filled" : "outlined"}
          onClick={() => {
            setMarqueeOnly((v) => !v);
            setPage(1);
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {visible.length} shown
        </Typography>
      </Stack>

      {deleteError && (
        <Alert severity="error" onClose={() => setDeleteError(null)} sx={{ mb: 2 }}>
          {deleteError}
        </Alert>
      )}

      {players.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No players yet. Approve registrations or bulk upload a CSV to build the pool.
          </Typography>
        </Paper>
      )}

      {players.length > 0 && visible.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">No players match this filter.</Typography>
        </Paper>
      )}

      {viewMode === "table" && visible.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "75vh" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48 }}>#</TableCell>
                <TableCell>Player</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sport(s)</TableCell>
                <TableCell align="right">Base price</TableCell>
                <TableCell>Sold</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((player, index) => {
                const priv = privateById[player.id] || {};
                const details = [priv.email, priv.contact, priv.block].filter(Boolean).join(" · ");
                const hasHistory = player.status === "sold" || player.status === "unsold";
                const removable = !["sold", "on_block"].includes(player.status);
                return (
                  <TableRow key={player.id} hover onClick={() => setDetailTarget(player)} sx={{ cursor: "pointer" }}>
                    <TableCell sx={{ color: "text.secondary" }}>{index + 1}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 180 }}>
                        <Avatar
                          src={player.photoUrl}
                          alt={player.name}
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: 14,
                            ...(genderMeta(player.gender) && { border: `2px solid ${genderMeta(player.gender).color}` }),
                          }}
                        >
                          {player.name?.[0]}
                        </Avatar>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                          {player.marquee && <StarIcon sx={{ fontSize: 15, color: "warning.main", flexShrink: 0 }} />}
                          <Typography variant="body2" fontWeight={600} noWrap title={player.name}>
                            {player.name}
                          </Typography>
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <GenderBadge gender={player.gender} sx={{ height: 20, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={player.status.replace("_", " ")} color={STATUS_COLOR[player.status]} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 160 }} title={sportNames(player.sportIds)}>
                        {sportNames(player.sportIds) || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatAmount(player.basePrice)}</TableCell>
                    <TableCell>
                      {player.status === "sold" && teamName(player.soldTeamId) ? (
                        <Typography variant="body2" color="success.main" noWrap>
                          {teamName(player.soldTeamId)} · {formatAmount(player.soldPrice)}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", maxWidth: 220 }} title={details}>
                        {details || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" justifyContent="flex-end" spacing={0.25} flexWrap="nowrap">
                        <Tooltip title={`Edit ${player.name}`}>
                          <IconButton size="small" onClick={() => setEditTarget(player)} aria-label={`Edit ${player.name}`}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {player.status === "pool" && (
                          <Tooltip title={player.marquee ? `Unmark ${player.name} as marquee` : `Mark ${player.name} as a marquee player`}>
                            <IconButton size="small" onClick={() => handleToggleMarquee(player)} aria-label={`Toggle marquee for ${player.name}`}>
                              {player.marquee ? <StarIcon fontSize="small" sx={{ color: "warning.main" }} /> : <StarBorderIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        )}
                        {hasHistory && (
                          <Tooltip title={`Bid history for ${player.name}`}>
                            <IconButton size="small" onClick={() => setHistoryPlayer(player)} aria-label={`Show bid history for ${player.name}`}>
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {player.status === "sold" && (
                          <>
                            <Tooltip title={`Share ${player.name}'s sale`}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const soldTeam = teams.find((t) => t.id === player.soldTeamId);
                                  setShareCard({ player, teamName: soldTeam?.name || "Unknown team", teamColor: soldTeam?.color, price: player.soldPrice });
                                }}
                                aria-label={`Share ${player.name}'s sale`}
                              >
                                <ShareIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={`Transfer ${player.name} to another team`}>
                              <IconButton size="small" onClick={() => openTransfer(player)} aria-label={`Transfer ${player.name}`}>
                                <SwapHorizIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={`Return ${player.name} to the pool (refunds their team)`}>
                              <IconButton size="small" onClick={() => handleReturnToPool(player)} aria-label={`Return ${player.name} to pool`}>
                                <UndoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title={removable ? `Remove ${player.name}` : "Sold or on-the-block players can't be removed"}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!removable}
                              onClick={() => handleDelete(player)}
                              aria-label={`Remove ${player.name}`}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {viewMode === "card" && (
      <Grid container spacing={2}>
        {paged.map((player) => {
          const priv = privateById[player.id] || {};
          const details = [priv.email, priv.contact, priv.block].filter(Boolean).join(" · ");
          const hasHistory = player.status === "sold" || player.status === "unsold";
          const removable = !["sold", "on_block"].includes(player.status);
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={player.id}>
              <Paper
                variant="outlined"
                onClick={() => setDetailTarget(player)}
                sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Avatar
                    src={player.photoUrl}
                    alt={player.name}
                    sx={{
                      width: 44,
                      height: 44,
                      ...(genderMeta(player.gender) && { border: `3px solid ${genderMeta(player.gender).color}` }),
                    }}
                  >
                    {player.name?.[0]}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {player.marquee && <StarIcon sx={{ fontSize: 16, color: "warning.main" }} />}
                      <Typography fontWeight={600} noWrap title={player.name}>
                        {player.name}
                      </Typography>
                    </Stack>
                    <GenderBadge gender={player.gender} sx={{ height: 20, fontSize: 11, mt: 0.25 }} />
                  </Box>
                  <Chip label={player.status.replace("_", " ")} color={STATUS_COLOR[player.status]} size="small" />
                </Stack>

                <Box sx={{ mt: 1.5, flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {sportNames(player.sportIds) || "No sports"}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Base price <b>{formatAmount(player.basePrice)}</b>
                  </Typography>
                  {player.status === "sold" && teamName(player.soldTeamId) && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                      Sold to {teamName(player.soldTeamId)} for {formatAmount(player.soldPrice)}
                    </Typography>
                  )}
                  {player.aboutMe && (
                    <Tooltip title={player.aboutMe} componentsProps={{ tooltip: { sx: { whiteSpace: "pre-line", maxWidth: 320 } } }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          whiteSpace: "pre-line",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {player.aboutMe}
                      </Typography>
                    </Tooltip>
                  )}
                  {details && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, wordBreak: "break-all" }}>
                      {details}
                    </Typography>
                  )}
                </Box>

                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={0.5}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ mt: 1.5, pt: 1, borderTop: 1, borderColor: "divider" }}
                >
                  <Tooltip title={`Edit ${player.name}`}>
                    <IconButton size="small" onClick={() => setEditTarget(player)} aria-label={`Edit ${player.name}`}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {player.status === "pool" && (
                    <Tooltip title={player.marquee ? `Unmark ${player.name} as marquee` : `Mark ${player.name} as a marquee player`}>
                      <IconButton size="small" onClick={() => handleToggleMarquee(player)} aria-label={`Toggle marquee for ${player.name}`}>
                        {player.marquee ? <StarIcon fontSize="small" sx={{ color: "warning.main" }} /> : <StarBorderIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  )}
                  {hasHistory && (
                    <Tooltip title={`Bid history for ${player.name}`}>
                      <IconButton size="small" onClick={() => setHistoryPlayer(player)} aria-label={`Show bid history for ${player.name}`}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {player.status === "sold" && (
                    <>
                      <Tooltip title={`Share ${player.name}'s sale`}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const soldTeam = teams.find((t) => t.id === player.soldTeamId);
                            setShareCard({ player, teamName: soldTeam?.name || "Unknown team", teamColor: soldTeam?.color, price: player.soldPrice });
                          }}
                          aria-label={`Share ${player.name}'s sale`}
                        >
                          <ShareIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={`Transfer ${player.name} to another team`}>
                        <IconButton size="small" onClick={() => openTransfer(player)} aria-label={`Transfer ${player.name}`}>
                          <SwapHorizIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={`Return ${player.name} to the pool (refunds their team)`}>
                        <IconButton size="small" onClick={() => handleReturnToPool(player)} aria-label={`Return ${player.name} to pool`}>
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title={removable ? `Remove ${player.name}` : "Sold or on-the-block players can't be removed"}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={!removable}
                        onClick={() => handleDelete(player)}
                        aria-label={`Remove ${player.name}`}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      )}

      {viewMode === "card" && pageCount > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Stack>
      )}

      <Dialog open={Boolean(historyPlayer)} onClose={() => setHistoryPlayer(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Bid history -- {historyPlayer?.name}
          <IconButton size="small" onClick={() => setHistoryPlayer(null)} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {historyPlayer && <PlayerBidHistory eventId={eventId} playerId={historyPlayer.id} teams={teams} />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(transferTarget)} onClose={() => setTransferTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Transfer {transferTarget?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Moves {transferTarget?.name} from {teamName(transferTarget?.soldTeamId) || "their current team"} to the team
            below at the same price ({formatAmount(transferTarget?.soldPrice)}) -- the current team is refunded, the new team is charged.
          </Typography>
          {transferError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {transferError}
            </Alert>
          )}
          <TextField
            select
            label="Transfer to"
            value={transferToTeamId}
            onChange={(e) => setTransferToTeamId(e.target.value)}
            fullWidth
          >
            {teams
              .filter((t) => t.id !== transferTarget?.soldTeamId)
              .map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} (purse {formatAmount(t.purseRemaining)})
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={!transferToTeamId || transferring} onClick={handleTransferConfirm}>
            {transferring ? "Transferring..." : "Transfer"}
          </Button>
        </DialogActions>
      </Dialog>

      <ShareSoldDialog
        open={Boolean(shareCard)}
        onClose={() => setShareCard(null)}
        player={shareCard?.player}
        teamName={shareCard?.teamName}
        teamColor={shareCard?.teamColor}
        price={shareCard?.price}
        eventName={event?.name}
      />

      <EditPlayerDialog
        open={Boolean(editTarget)}
        player={editTarget}
        privateInfo={privateById[editTarget?.id]}
        sports={sports}
        onClose={() => setEditTarget(null)}
        onSave={handleEditSave}
      />

      <PlayerDetailDialog
        player={detailTarget}
        privateInfo={privateById[detailTarget?.id]}
        sportNames={sportNames(detailTarget?.sportIds)}
        teams={teams}
        onClose={() => setDetailTarget(null)}
      />
    </Box>
  );
}

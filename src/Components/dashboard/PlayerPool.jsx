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
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
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
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { subscribeToSports, subscribeToTeams } from "../../utils/firebase/events";
import { deletePlayer, subscribeToPlayerPrivate, subscribeToPlayers } from "../../utils/firebase/players";
import { subscribeToBidsForPlayer } from "../../utils/firebase/auctionRealtime";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { logActivity } from "../../utils/firebase/activityLog";
import { downloadTextFile } from "../../utils/download";
import { buildResultsCsv } from "../../utils/resultsExport";
import BidHistoryList from "../common/BidHistoryList";
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
  const [deleteError, setDeleteError] = useState(null);
  const statusFilter = searchParams.get("status") || "";

  function setStatusFilter(value) {
    setSearchParams(value ? { status: value } : {}, { replace: true });
    setPage(1);
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
      if (!q) return true;
      const priv = privateById[p.id] || {};
      return [p.name, priv.email, priv.contact, priv.block].some((v) => (v || "").toLowerCase().includes(q));
    });
    const sorted = [...filtered];
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "basePrice") sorted.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    else if (sortBy === "newest") sorted.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    return sorted;
  }, [players, privateById, search, statusFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil((visible?.length || 0) / PAGE_SIZE));
  const paged = useMemo(() => (visible || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [visible, page]);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy]);

  function handleExport() {
    const csv = buildResultsCsv({ players, teams, sports, privateById });
    downloadTextFile("player-results.csv", csv);
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
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={players.length === 0}
              sx={{ bgcolor: "#fff", color: "primary.dark", "&:hover": { bgcolor: "rgba(255,255,255,0.9)" } }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              component={RouterLink}
              to={`/app/events/${eventId}/import`}
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#fff" } }}
            >
              Bulk upload
            </Button>
          </Stack>
        }
      />

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

      <Grid container spacing={2}>
        {paged.map((player) => {
          const priv = privateById[player.id] || {};
          const details = [priv.email, priv.contact, priv.block].filter(Boolean).join(" · ");
          const hasHistory = player.status === "sold" || player.status === "unsold";
          const removable = !["sold", "on_block"].includes(player.status);
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={player.id}>
              <Paper variant="outlined" sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Avatar src={player.photoUrl} alt={player.name} sx={{ width: 44, height: 44 }}>
                    {player.name?.[0]}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} noWrap title={player.name}>
                      {player.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {player.gender || "—"}
                    </Typography>
                  </Box>
                  <Chip label={player.status.replace("_", " ")} color={STATUS_COLOR[player.status]} size="small" />
                </Stack>

                <Box sx={{ mt: 1.5, flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {sportNames(player.sportIds) || "No sports"}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Base price <b>{player.basePrice}</b>
                  </Typography>
                  {player.status === "sold" && teamName(player.soldTeamId) && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                      Sold to {teamName(player.soldTeamId)} for {player.soldPrice}
                    </Typography>
                  )}
                  {details && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, wordBreak: "break-all" }}>
                      {details}
                    </Typography>
                  )}
                </Box>

                <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ mt: 1.5, pt: 1, borderTop: 1, borderColor: "divider" }}>
                  {hasHistory && (
                    <Tooltip title={`Bid history for ${player.name}`}>
                      <IconButton size="small" onClick={() => setHistoryPlayer(player)} aria-label={`Show bid history for ${player.name}`}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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

      {pageCount > 1 && (
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
    </Box>
  );
}

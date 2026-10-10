import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Collapse, IconButton, InputAdornment, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
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
  const [expandedId, setExpandedId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const statusFilter = searchParams.get("status") || "";

  function setStatusFilter(value) {
    setSearchParams(value ? { status: value } : {}, { replace: true });
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
    return players.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (!q) return true;
      const priv = privateById[p.id] || {};
      return [p.name, priv.email, priv.contact, priv.block].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [players, privateById, search, statusFilter]);

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
    <Box sx={{ maxWidth: 860 }}>
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

      <TextField
        size="small"
        placeholder="Search by name, email, contact or block"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
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

      <Stack spacing={1.5}>
        {visible.map((player) => {
          const priv = privateById[player.id] || {};
          const details = [priv.email, priv.contact, priv.block].filter(Boolean).join(" · ");
          const hasHistory = player.status === "sold" || player.status === "unsold";
          const expanded = expandedId === player.id;
          return (
            <Paper key={player.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar src={player.photoUrl} alt={player.name} sx={{ width: 48, height: 48 }}>
                  {player.name?.[0]}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography fontWeight={600}>
                    {player.name}
                    {player.gender ? ` · ${player.gender}` : ""}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {sportNames(player.sportIds) || "No sports"} · Base price {player.basePrice}
                    {player.status === "sold" && teamName(player.soldTeamId)
                      ? ` · Sold to ${teamName(player.soldTeamId)} for ${player.soldPrice}`
                      : ""}
                  </Typography>
                  {details && (
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                      {details}
                    </Typography>
                  )}
                </Box>
                <Chip label={player.status.replace("_", " ")} color={STATUS_COLOR[player.status]} size="small" />
                {hasHistory && (
                  <IconButton
                    size="small"
                    onClick={() => setExpandedId(expanded ? null : player.id)}
                    aria-label={`${expanded ? "Hide" : "Show"} bid history for ${player.name}`}
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                )}
                <Tooltip
                  title={
                    ["sold", "on_block"].includes(player.status)
                      ? "Sold or on-the-block players can't be removed"
                      : `Remove ${player.name}`
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      disabled={["sold", "on_block"].includes(player.status)}
                      onClick={() => handleDelete(player)}
                      aria-label={`Remove ${player.name}`}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              {hasHistory && (
                <Collapse in={expanded} unmountOnExit>
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                    {expanded && <PlayerBidHistory eventId={eventId} playerId={player.id} teams={teams} />}
                  </Box>
                </Collapse>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

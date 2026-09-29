import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Avatar, Box, Button, Chip, CircularProgress, Collapse, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import { subscribeToSports, subscribeToTeams } from "../../utils/firebase/events";
import { subscribeToPlayerPrivate, subscribeToPlayers } from "../../utils/firebase/players";
import { subscribeToBidsForPlayer } from "../../utils/firebase/auctionRealtime";
import { downloadTextFile } from "../../utils/download";
import { buildResultsCsv } from "../../utils/resultsExport";
import BidHistoryList from "../common/BidHistoryList";
import LoadingSpinner from "../LoadingSpinner";

const STATUS_COLOR = {
  pool: "default",
  on_block: "warning",
  sold: "success",
  unsold: "error",
};

function PlayerBidHistory({ eventId, playerId, teams }) {
  const [bids, setBids] = useState(null);
  useEffect(() => subscribeToBidsForPlayer(eventId, playerId, setBids), [eventId, playerId]);
  if (bids === null) return <CircularProgress size={20} />;
  return <BidHistoryList bids={bids} teams={teams} dense emptyText="No bids were placed on this player." />;
}

export default function PlayerPool() {
  const { eventId } = useParams();
  const [players, setPlayers] = useState(null);
  const [privateById, setPrivateById] = useState({});
  const [sports, setSports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

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
    const q = search.trim().toLowerCase();
    if (!q || !players) return players;
    return players.filter((p) => {
      const priv = privateById[p.id] || {};
      return [p.name, priv.email, priv.contact, priv.block].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [players, privateById, search]);

  function handleExport() {
    const csv = buildResultsCsv({ players, teams, sports, privateById });
    downloadTextFile("player-results.csv", csv);
  }

  if (!players) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 860 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1, gap: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Player pool
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} disabled={players.length === 0}>
            Export CSV
          </Button>
          <Button variant="outlined" startIcon={<UploadFileIcon />} component={RouterLink} to={`/app/events/${eventId}/import`}>
            Bulk upload
          </Button>
        </Stack>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {players.length} player{players.length === 1 ? "" : "s"} approved for the auction.
      </Typography>

      <TextField
        size="small"
        placeholder="Search by name, email, contact or block"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      {players.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No players yet. Approve registrations or bulk upload a CSV to build the pool.
          </Typography>
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

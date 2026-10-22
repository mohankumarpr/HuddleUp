import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GavelIcon from "@mui/icons-material/Gavel";
import BidTimer from "./BidTimer";
import BidHistoryList from "../common/BidHistoryList";
import GenderBadge from "../common/GenderBadge";
import SwapRequestsPanel from "../common/SwapRequestsPanel";
import TeamPurseList from "../common/TeamPurseList";
import {
  computeGenderQuota,
  computePoolGenderTotals,
  computeTotalSlotsPerTeam,
  countTeamRoster,
  isGenderCapped,
  maxBidCapForTeam,
} from "../../utils/auctionQuota";
import { formatAmount } from "../../utils/formatAmount";

// The whole "player on the block" experience as a full-screen takeover -- it can only be closed by
// resolving the player (sold or unsold), never by a backdrop click or Escape, so the organizer
// can't accidentally lose track of who's being auctioned mid-bid. Full screen (rather than a
// regular dialog) so the photo and price get real presence instead of competing with the rest of
// the console for space.
export default function PlayerOnBlockDialog({
  player,
  currentPrice,
  highBidTeam,
  sportNames,
  basePrice,
  deadlineAt,
  timerSeconds,
  onExtendTimer,
  bids,
  teams,
  busy,
  error,
  onDismissError,
  nextBidAmount,
  onBidForTeam,
  onConfirmSold,
  onMarkUnsold,
  biddingOpen,
  onStartBidding,
  allPlayers,
  swapRequests,
  onCompleteSwap,
  reserveSlotPrice,
}) {
  const accent = highBidTeam?.color || "#6366F1";
  const [proxyTeamId, setProxyTeamId] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  // Expanded by default (unlike bid history) -- this is exactly what the organizer needs to glance
  // at while running a live bid, not something to dig for. Still collapsible for screens tight on
  // room, or events with a lot of teams.
  const [teamsOpen, setTeamsOpen] = useState(true);

  // Reset the picker and collapse history back down whenever a new player comes on the block.
  useEffect(() => {
    setProxyTeamId("");
    setHistoryOpen(false);
  }, [player?.id]);

  const proxyCandidates = teams.filter((t) => t.id !== highBidTeam?.id);
  const proxyTeam = teams.find((t) => t.id === proxyTeamId);

  // Same two caps TeamBidderView shows its own rep -- an organizer placing a bid "for" a team goes
  // through the exact same placeBid() the rep's own Bid button does, so it's subject to the exact
  // same limits; surfacing them here avoids a confusing server rejection after the click.
  const players = allPlayers || [];
  const numTeams = teams.length;
  const totalSlotsPerTeam = computeTotalSlotsPerTeam(players.length, numTeams);
  const genderTotals = computePoolGenderTotals(players);
  const genderQuotaMax = computeGenderQuota(genderTotals[player?.gender] || 0, numTeams).max;
  const proxyRoster = proxyTeam ? countTeamRoster(players, proxyTeam.id) : null;
  const proxyBidCap = proxyTeam
    ? maxBidCapForTeam({
        purseRemaining: proxyTeam.purseRemaining,
        totalSlotsPerTeam,
        teamTotalOwned: proxyRoster.total,
        reserveSlotPrice,
      })
    : Infinity;
  const proxyGenderCapped = proxyTeam
    ? isGenderCapped(player?.gender, player?.gender === "female" ? proxyRoster.female : proxyRoster.male, genderQuotaMax)
    : false;
  const proxyCanAfford =
    !proxyTeam ||
    nextBidAmount == null ||
    (proxyTeam.purseRemaining >= nextBidAmount && nextBidAmount <= proxyBidCap && !proxyGenderCapped);

  return (
    <Dialog
      open={Boolean(player)}
      onClose={() => {}}
      disableEscapeKeyDown
      fullScreen
      PaperProps={{
        sx: {
          background:
            "radial-gradient(circle at 18% 10%, rgba(99,102,241,0.3), transparent 55%), linear-gradient(165deg, #0B1220 0%, #0F172A 55%, #1E1B3A 100%)",
        },
      }}
    >
      {player && (
        <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", color: "#fff" }}>
          {/* The whole middle area scrolls as one unit -- simpler and more robust than giving each
              column its own independent scroll, which could silently squash a tall child (like the
              description panel) instead of letting it scroll into view. */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            {/* Photo panel -- just the photo, name, and light metadata. Everything else (price,
                leading team, description, bid history) lives in the panel beside it, grouped
                together since those are what the organizer needs to see at a glance. */}
            <Box
              sx={{
                flex: { xs: "0 0 auto", md: "0 0 38%" },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                py: { xs: 4, md: 6 },
                px: 3,
              }}
            >
              <Typography variant="overline" sx={{ letterSpacing: 4, color: "primary.light", mb: 2 }}>
                On the block
              </Typography>
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Box
                  sx={{
                    width: { xs: 170, sm: 210, md: 260 },
                    height: { xs: 170, sm: 210, md: 260 },
                    borderRadius: "50%",
                    p: "6px",
                    background: `conic-gradient(${accent}, rgba(255,255,255,0.15), ${accent})`,
                    boxShadow: `0 0 70px ${accent}66`,
                  }}
                >
                  <Avatar
                    src={player.photoUrl}
                    alt={player.name}
                    sx={{ width: "100%", height: "100%", fontSize: 64, border: "5px solid #0B1220" }}
                  >
                    {player.name?.[0]}
                  </Avatar>
                </Box>
              </motion.div>
              <Typography variant="h3" fontWeight={800} sx={{ mt: 3, textAlign: "center", fontSize: { xs: 26, sm: 30, md: 34 } }}>
                {player.name}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ mt: 1.25 }} flexWrap="wrap" justifyContent="center" useFlexGap>
                {sportNames(player.sportIds) && (
                  <Chip
                    size="small"
                    label={sportNames(player.sportIds)}
                    sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "grey.300", fontSize: 12 }}
                  />
                )}
                <GenderBadge gender={player.gender} sx={{ fontSize: 12 }} />
                {basePrice != null && (
                  <Chip
                    size="small"
                    label={`Base ${formatAmount(basePrice)}`}
                    variant="outlined"
                    sx={{ color: "grey.300", borderColor: "rgba(255,255,255,0.3)", fontSize: 12 }}
                  />
                )}
              </Stack>

              {/* Lives here (under the photo) rather than in the price panel -- this is otherwise
                  empty space while bidding hasn't opened yet, and the price panel is already busy
                  with the price/leading-team display right above where this used to sit. */}
              {onStartBidding && !biddingOpen && (
                <Box sx={{ textAlign: "center", mt: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<GavelIcon />}
                    disabled={busy}
                    onClick={onStartBidding}
                    sx={{ px: 4, py: 1.5, fontSize: 18 }}
                  >
                    Start bidding
                  </Button>
                  <Typography variant="body2" sx={{ mt: 1, color: "grey.400" }}>
                    Teams can't bid until you open it.
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Price / description / bid history panel */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                px: { xs: 3, md: 6 },
                py: { xs: 3, md: 6 },
                bgcolor: "rgba(255,255,255,0.03)",
                borderTop: { xs: "1px solid rgba(255,255,255,0.08)", md: "none" },
                borderLeft: { md: "1px solid rgba(255,255,255,0.08)" },
              }}
            >
              {error && (
                <Alert severity="error" onClose={onDismissError} sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* A swap offer can land at any time, including right now -- surfaced here too (not
                  just on the console behind this full-screen dialog) so it's never missed. */}
              {swapRequests && (
                <SwapRequestsPanel
                  swapRequests={swapRequests}
                  players={allPlayers || []}
                  teams={teams}
                  busy={busy}
                  onComplete={onCompleteSwap}
                  sx={{ mb: 3 }}
                />
              )}

              <Stack direction="row" alignItems="center" justifyContent="center" spacing={4} sx={{ mb: 3, flexWrap: "wrap" }}>
                {deadlineAt && (
                  <Stack alignItems="center" spacing={0.5}>
                    <BidTimer deadlineAt={deadlineAt} totalSeconds={timerSeconds} size={72} />
                    {onExtendTimer && (
                      <Button size="small" startIcon={<AddAlarmIcon fontSize="small" />} onClick={onExtendTimer} sx={{ color: "primary.light" }}>
                        +60s
                      </Button>
                    )}
                  </Stack>
                )}
                <Box sx={{ textAlign: "center" }}>
                  <motion.div key={currentPrice} initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }}>
                    <Typography fontWeight={800} sx={{ fontSize: { xs: 56, sm: 72, md: 88 }, lineHeight: 1 }}>
                      {formatAmount(currentPrice)}
                    </Typography>
                  </motion.div>
                  {highBidTeam ? (
                    <Chip
                      label={`${highBidTeam.name} leading`}
                      sx={{ mt: 1.5, height: 34, bgcolor: highBidTeam.color, color: "#fff", fontWeight: 700, fontSize: 14, px: 1 }}
                    />
                  ) : (
                    <Chip
                      label={biddingOpen ? "No bids yet" : "Bidding not open yet"}
                      variant="outlined"
                      sx={{ mt: 1.5, color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
                    />
                  )}
                </Box>
              </Stack>

              {/* Description -- promoted up next to the price/leading team, since this is the other
                  thing the organizer (and the room) actually wants to see clearly while a player is
                  live. A fixed height with its own scrollbar, not a shrinkable flex child, so it can
                  never get silently squashed down to a sliver by the rest of the layout. */}
              {player.aboutMe && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2.5,
                    flexShrink: 0,
                    height: 210,
                    overflowY: "auto",
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Typography variant="overline" sx={{ color: "primary.light", letterSpacing: 2 }}>
                    About
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      textAlign: "left",
                      color: "grey.100",
                      fontSize: 19,
                      lineHeight: 1.65,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {player.aboutMe}
                  </Typography>
                </Box>
              )}

              {onBidForTeam && biddingOpen && (
                <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.05)" }}>
                  <Typography variant="caption" sx={{ color: "grey.400", display: "block", mb: 1 }}>
                    Bid on behalf of a team (e.g. a rep bidding in person, or no rep online)
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField
                      select
                      size="small"
                      label="Team"
                      value={proxyTeamId}
                      onChange={(e) => setProxyTeamId(e.target.value)}
                      sx={{
                        flexGrow: 1,
                        "& .MuiInputBase-root": { color: "#fff" },
                        "& .MuiInputLabel-root": { color: "grey.400" },
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.3)" },
                      }}
                    >
                      {proxyCandidates.map((t) => {
                        const roster = countTeamRoster(players, t.id);
                        const capped = isGenderCapped(
                          player?.gender,
                          player?.gender === "female" ? roster.female : roster.male,
                          genderQuotaMax
                        );
                        const cap = maxBidCapForTeam({
                          purseRemaining: t.purseRemaining,
                          totalSlotsPerTeam,
                          teamTotalOwned: roster.total,
                          reserveSlotPrice,
                        });
                        return (
                          <MenuItem key={t.id} value={t.id} disabled={capped}>
                            {t.name} (purse {formatAmount(t.purseRemaining)}
                            {Number.isFinite(cap) ? `, max bid ${formatAmount(cap)}` : ""}){capped ? " -- gender quota full" : ""}
                          </MenuItem>
                        );
                      })}
                    </TextField>
                    <Button
                      variant="contained"
                      startIcon={<GavelIcon />}
                      disabled={busy || !proxyTeamId || !proxyCanAfford}
                      onClick={() => {
                        onBidForTeam(proxyTeamId);
                        setProxyTeamId("");
                      }}
                    >
                      Bid {formatAmount(nextBidAmount)}
                    </Button>
                  </Stack>
                  {proxyTeamId && !proxyCanAfford && (
                    <Typography variant="caption" color="error.light" sx={{ display: "block", mt: 0.5 }}>
                      {proxyGenderCapped
                        ? `${proxyTeam?.name} already has its maximum number of players of this gender.`
                        : nextBidAmount > proxyBidCap
                        ? `${proxyTeam?.name} needs to keep enough purse for its remaining roster slots.`
                        : `${proxyTeam?.name}'s remaining purse can't cover this bid.`}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Every team's purse, gender progress, and max bid cap -- the console's own "Teams"
                  panel is hidden behind this full-screen dialog the whole time a player is on the
                  block, so it's surfaced here too instead of making the organizer hunt for it. */}
              <Accordion
                expanded={teamsOpen}
                onChange={(_, isOpen) => setTeamsOpen(isOpen)}
                disableGutters
                square
                sx={{
                  bgcolor: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  borderRadius: 2,
                  mb: 2,
                  "&:before": { display: "none" },
                  boxShadow: "none",
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "grey.400" }} />}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ color: "grey.200" }}>
                    Teams
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ maxHeight: 260, overflowY: "auto" }}>
                  <TeamPurseList teams={teams} players={allPlayers || []} reserveSlotPrice={reserveSlotPrice} dark />
                </AccordionDetails>
              </Accordion>

              <Accordion
                expanded={historyOpen}
                onChange={(_, isOpen) => setHistoryOpen(isOpen)}
                disableGutters
                square
                sx={{
                  bgcolor: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  borderRadius: 2,
                  "&:before": { display: "none" },
                  boxShadow: "none",
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "grey.400" }} />}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ color: "grey.200" }}>
                      Bid history
                    </Typography>
                    {bids?.length > 0 && (
                      <Chip size="small" label={bids.length} sx={{ height: 20, fontSize: 11, bgcolor: "rgba(255,255,255,0.12)", color: "#fff" }} />
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ maxHeight: 220, overflowY: "auto" }}>
                  <BidHistoryList bids={bids} teams={teams} dark highlightTop emptyText="No bids yet -- waiting for the first one." />
                </AccordionDetails>
              </Accordion>
            </Box>
          </Box>

          {/* Action bar */}
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ p: 3, borderTop: "1px solid rgba(255,255,255,0.1)", bgcolor: "rgba(0,0,0,0.3)" }}
          >
            <Button variant="outlined" color="error" size="large" disabled={busy} onClick={onMarkUnsold} sx={{ minWidth: 180 }}>
              Mark unsold
            </Button>
            <Button variant="contained" color="success" size="large" disabled={busy} onClick={onConfirmSold} sx={{ minWidth: 220 }}>
              {highBidTeam ? `Confirm SOLD to ${highBidTeam.name}` : "Confirm (no bids -> unsold)"}
            </Button>
          </Stack>
        </Box>
      )}
    </Dialog>
  );
}

import React from "react";
import { motion } from "framer-motion";
import { Avatar, Box, Button, Chip, Dialog, Stack, Typography } from "@mui/material";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import BidTimer from "./BidTimer";
import BidHistoryList from "../common/BidHistoryList";

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
  onConfirmSold,
  onMarkUnsold,
}) {
  const accent = highBidTeam?.color || "#6366F1";

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
          <Box sx={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: { xs: "column", md: "row" } }}>
            {/* Photo panel */}
            <Box
              sx={{
                flex: { xs: "0 0 auto", md: "0 0 42%" },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: { xs: 5, md: 8 },
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
                    width: { xs: 190, sm: 240, md: 300 },
                    height: { xs: 190, sm: 240, md: 300 },
                    borderRadius: "50%",
                    p: "6px",
                    background: `conic-gradient(${accent}, rgba(255,255,255,0.15), ${accent})`,
                    boxShadow: `0 0 70px ${accent}66`,
                  }}
                >
                  <Avatar
                    src={player.photoUrl}
                    alt={player.name}
                    sx={{ width: "100%", height: "100%", fontSize: 72, border: "5px solid #0B1220" }}
                  >
                    {player.name?.[0]}
                  </Avatar>
                </Box>
              </motion.div>
              <Typography variant="h3" fontWeight={800} sx={{ mt: 3, textAlign: "center", fontSize: { xs: 28, sm: 34, md: 40 } }}>
                {player.name}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" justifyContent="center" useFlexGap>
                {sportNames(player.sportIds) && (
                  <Chip label={sportNames(player.sportIds)} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff" }} />
                )}
                {player.gender && <Chip label={player.gender} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff" }} />}
                {basePrice != null && (
                  <Chip label={`Base ${basePrice}`} variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.35)" }} />
                )}
              </Stack>
            </Box>

            {/* Price / bid history panel */}
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
                minHeight: 0,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={4} sx={{ mb: 4, flexWrap: "wrap" }}>
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
                      {currentPrice}
                    </Typography>
                  </motion.div>
                  {highBidTeam ? (
                    <Chip
                      label={`${highBidTeam.name} leading`}
                      sx={{ mt: 1.5, height: 34, bgcolor: highBidTeam.color, color: "#fff", fontWeight: 700, fontSize: 14, px: 1 }}
                    />
                  ) : (
                    <Chip
                      label="No bids yet"
                      variant="outlined"
                      sx={{ mt: 1.5, color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
                    />
                  )}
                </Box>
              </Stack>

              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color: "grey.400" }}>
                Bid history
              </Typography>
              <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 1, minHeight: 0 }}>
                <BidHistoryList bids={bids} teams={teams} dark highlightTop emptyText="No bids yet -- waiting for the first one." />
              </Box>
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

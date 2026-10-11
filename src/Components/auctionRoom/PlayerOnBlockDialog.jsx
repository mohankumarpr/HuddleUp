import React from "react";
import { motion } from "framer-motion";
import { Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import BidTimer from "./BidTimer";
import BidHistoryList from "../common/BidHistoryList";

// The whole "player on the block" experience as a single, non-dismissible dialog -- it can only be
// closed by resolving the player (sold or unsold), never by a backdrop click or Escape, so the
// organizer can't accidentally lose track of who's being auctioned mid-bid.
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
  return (
    <Dialog
      open={Boolean(player)}
      onClose={() => {}}
      disableEscapeKeyDown
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
    >
      {player && (
        <>
          <Box
            sx={{
              p: 4,
              background: "linear-gradient(160deg, #0F172A 0%, #1E293B 100%)",
              color: "#fff",
            }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center">
              <Avatar
                src={player.photoUrl}
                alt={player.name}
                sx={{ width: 110, height: 110, border: "3px solid rgba(255,255,255,0.15)" }}
              />
              <Box sx={{ flexGrow: 1, textAlign: { xs: "center", sm: "left" }, minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: "primary.light" }}>
                  On the block
                </Typography>
                <Typography variant="h4" fontWeight={800} noWrap>
                  {player.name}
                </Typography>
                <Typography variant="body1" sx={{ color: "grey.400" }}>
                  {[sportNames(player.sportIds) || "No sport", player.gender, basePrice != null && `Base ${basePrice}`]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="center"
              spacing={4}
              sx={{ mt: 3, pt: 3, borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              {deadlineAt && (
                <Stack alignItems="center" spacing={0.5}>
                  <BidTimer deadlineAt={deadlineAt} totalSeconds={timerSeconds} />
                  {onExtendTimer && (
                    <Button
                      size="small"
                      startIcon={<AddAlarmIcon fontSize="small" />}
                      onClick={onExtendTimer}
                      sx={{ color: "primary.light", minWidth: 0, px: 1 }}
                    >
                      +60s
                    </Button>
                  )}
                </Stack>
              )}
              <Box sx={{ textAlign: "center" }}>
                <motion.div key={currentPrice} initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }}>
                  <Typography variant="h2" fontWeight={800}>
                    {currentPrice}
                  </Typography>
                </motion.div>
                {highBidTeam ? (
                  <Chip
                    label={`${highBidTeam.name} leading`}
                    sx={{ mt: 1, bgcolor: highBidTeam.color, color: "#fff", fontWeight: 700 }}
                  />
                ) : (
                  <Chip label="No bids yet" sx={{ mt: 1, color: "#fff", borderColor: "rgba(255,255,255,0.4)" }} variant="outlined" />
                )}
              </Box>
            </Stack>
          </Box>

          <DialogContent sx={{ maxHeight: 320 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Bid history
            </Typography>
            <BidHistoryList bids={bids} teams={teams} dense highlightTop emptyText="No bids yet -- waiting for the first one." />
          </DialogContent>

          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button variant="outlined" color="error" size="large" disabled={busy} onClick={onMarkUnsold}>
              Mark unsold
            </Button>
            <Button variant="contained" color="success" size="large" disabled={busy} onClick={onConfirmSold}>
              {highBidTeam ? `Confirm SOLD to ${highBidTeam.name}` : "Confirm (no bids -> unsold)"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

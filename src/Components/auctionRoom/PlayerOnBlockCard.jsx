import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import BidTimer from "./BidTimer";

export default function PlayerOnBlockCard({ player, currentPrice, highBidTeam, sportNames, basePrice, deadlineAt, timerSeconds }) {
  if (!player) {
    return (
      <Paper
        variant="outlined"
        sx={{ p: 6, textAlign: "center", bgcolor: "background.subtle", borderStyle: "dashed" }}
      >
        <Typography variant="h6" color="text.secondary">
          Waiting for the next player...
        </Typography>
      </Paper>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={player.id}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            background: "linear-gradient(160deg, #0F172A 0%, #1E293B 100%)",
            color: "#fff",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center">
            <Avatar src={player.photoUrl} alt={player.name} sx={{ width: 96, height: 96 }} />
            <Box sx={{ flexGrow: 1, textAlign: { xs: "center", sm: "left" } }}>
              <Typography variant="overline" sx={{ color: "primary.light" }}>
                On the block
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {player.name}
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.400" }}>
                {sportNames(player.sportIds) || "No sport"}
                {basePrice != null && ` · Base ${basePrice}`}
              </Typography>
            </Box>
            {deadlineAt && (
              <BidTimer deadlineAt={deadlineAt} totalSeconds={timerSeconds} />
            )}
            <Box sx={{ textAlign: "center" }}>
              <motion.div key={currentPrice} initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }}>
                <Typography variant="h3" fontWeight={800}>
                  {currentPrice}
                </Typography>
              </motion.div>
              {highBidTeam ? (
                <Chip
                  label={`${highBidTeam.name} leading`}
                  sx={{ mt: 1, bgcolor: highBidTeam.color, color: "#fff", fontWeight: 700 }}
                />
              ) : (
                <Chip label="No bids yet" sx={{ mt: 1 }} variant="outlined" />
              )}
            </Box>
          </Stack>
        </Paper>
      </motion.div>
    </AnimatePresence>
  );
}

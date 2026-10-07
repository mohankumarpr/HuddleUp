import React from "react";
import { Box, Stack, Typography } from "@mui/material";

function Stat({ label, value, color, dark }) {
  return (
    <Box sx={{ textAlign: "center", minWidth: 64 }}>
      <Typography variant="h6" fontWeight={800} sx={{ color: color || (dark ? "#fff" : "text.primary"), lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: dark ? "grey.400" : "text.secondary" }}>
        {label}
      </Typography>
    </Box>
  );
}

// A compact, always-visible strip of auction-wide numbers -- how many players are left, how much
// has moved, and the headline sale so far. Shown identically to the organizer, every team rep, and
// spectators, so "how's the auction going" never requires asking someone else.
export default function AuctionStatsBar({ stats, dark = false }) {
  return (
    <Stack
      direction="row"
      spacing={{ xs: 2, sm: 3 }}
      justifyContent="center"
      flexWrap="wrap"
      useFlexGap
      sx={{
        py: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: dark ? "rgba(255,255,255,0.05)" : "background.subtle",
        border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid",
        borderColor: dark ? undefined : "divider",
      }}
    >
      <Stat label="Sold" value={stats.soldCount} color="#10B981" dark={dark} />
      <Stat label="Unsold" value={stats.unsoldCount} color="#EF4444" dark={dark} />
      <Stat label="In pool" value={stats.poolCount} dark={dark} />
      <Stat label="Total spent" value={stats.totalSpent} dark={dark} />
      <Stat label="Avg sale" value={stats.avgSale} dark={dark} />
      {stats.highest && <Stat label={`Top: ${stats.highest.name}`} value={stats.highest.price} color="#F59E0B" dark={dark} />}
    </Stack>
  );
}

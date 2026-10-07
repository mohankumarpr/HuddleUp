import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

// A countdown ring driven by `deadlineAt` (an epoch-ms number on the shared auction state, so
// every viewer computes the same remaining time locally instead of trusting a local clock that
// started ticking at an arbitrary moment). Ticks every 250ms purely for display -- nothing here
// writes to Firestore; only the organizer's own client acts on the deadline (see OrganizerConsole).
export default function BidTimer({ deadlineAt, totalSeconds, size = 56 }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadlineAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadlineAt]);

  if (!deadlineAt || !totalSeconds) return null;

  const remainingMs = Math.max(0, deadlineAt - now);
  const remaining = Math.ceil(remainingMs / 1000);
  const pct = Math.max(0, Math.min(100, (remainingMs / (totalSeconds * 1000)) * 100));
  const urgent = remaining <= 5;

  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress
        variant="determinate"
        value={pct}
        size={size}
        thickness={4}
        sx={{ color: urgent ? "error.main" : "primary.light", transition: "none" }}
      />
      <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: urgent ? "error.main" : "inherit" }}>
          {remaining}
        </Typography>
      </Box>
    </Box>
  );
}

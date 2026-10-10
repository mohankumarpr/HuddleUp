import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOff";

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

// Firestore's writer already queues mutations offline and replays them on reconnect, but the UI
// gives no sign that's happening -- an organizer mid-auction could tap "Confirm SOLD" on a dead
// connection and see nothing wrong until it silently resyncs later. This just surfaces that state.
export default function ConnectivityBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        py: 0.75,
        px: 2,
        bgcolor: "warning.main",
        color: "warning.contrastText",
      }}
    >
      <WifiOffIcon fontSize="small" />
      <Typography variant="body2" fontWeight={600}>
        You're offline -- changes will sync automatically once your connection is back.
      </Typography>
    </Box>
  );
}

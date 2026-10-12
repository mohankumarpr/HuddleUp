import React, { useRef, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import SoldShareCard from "./SoldShareCard";

const canUseWebShare = typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function";

function fileNameFor(player) {
  const safe = (player?.name || "player").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${safe}-sold.png`;
}

// Captures the SoldShareCard as a PNG (via html2canvas, lazy-loaded since it's only needed here)
// and either downloads it or, on a device that supports the Web Share API with files (most
// mobile browsers), opens the native share sheet straight to WhatsApp/etc. Entirely client-side,
// no server round-trip -- the image never leaves the organizer's device except via their own share.
export default function ShareSoldDialog({ open, onClose, player, teamName, teamColor, price, eventName }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function captureBlob() {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
    return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't generate the image."))), "image/png"));
  }

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      const blob = await captureBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameFor(player);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Couldn't download the image.");
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    setBusy(true);
    setError(null);
    try {
      const blob = await captureBlob();
      const file = new File([blob], fileNameFor(player), { type: "image/png" });
      if (!navigator.canShare({ files: [file] })) throw new Error("Sharing images isn't supported on this device.");
      await navigator.share({ files: [file], title: "Sold!", text: `${player?.name} sold to ${teamName} for ${price}` });
    } catch (err) {
      // A user cancelling the native share sheet also lands here (AbortError) -- not a real error.
      if (err?.name !== "AbortError") setError(err.message || "Couldn't share the image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Share this sale
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Box sx={{ transform: "scale(0.85)", transformOrigin: "top center" }}>
            <SoldShareCard ref={cardRef} player={player} teamName={teamName} teamColor={teamColor} price={price} eventName={eventName} />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ width: "100%" }}>
          <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} disabled={busy} onClick={handleDownload}>
            Download
          </Button>
          {canUseWebShare && (
            <Button fullWidth variant="contained" startIcon={<ShareIcon />} disabled={busy} onClick={handleShare}>
              Share
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

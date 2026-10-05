import React, { useState } from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import DownloadIcon from "@mui/icons-material/Download";
import { QRCodeSVG } from "qrcode.react";

// A small icon button that pops open a scannable QR code for `value` (a URL). Used anywhere a
// join code/PIN/link would otherwise have to be typed by hand -- a team rep or player can just
// scan instead.
export default function QrCodeButton({ value, label, iconSize = "small" }) {
  const [open, setOpen] = useState(false);

  function downloadPng() {
    const svg = document.getElementById(`qr-svg-${label.replace(/\s+/g, "-")}`);
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${label.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
      a.click();
    };
    img.src = url;
  }

  return (
    <>
      <Tooltip title={`Show QR code: ${label}`}>
        <IconButton size={iconSize} onClick={() => setOpen(true)} aria-label={`Show QR code for ${label}`}>
          <QrCode2Icon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{label}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} alignItems="center" sx={{ pb: 2 }}>
            <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <QRCodeSVG id={`qr-svg-${label.replace(/\s+/g, "-")}`} value={value} size={220} level="M" />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all", textAlign: "center" }}>
              {value}
            </Typography>
            <Button startIcon={<DownloadIcon />} onClick={downloadPng} size="small">
              Download PNG
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}

import React from "react";
import { Box } from "@mui/material";

// Subtle film-grain texture layered over dark gradient sections for a more premium, less "flat
// gradient" feel. Pure CSS/SVG, no image request.
const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function GrainOverlay({ opacity = 0.05 }) {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        opacity,
        backgroundImage: NOISE_SVG,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
}

import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";

export default function SoundToggleButton({ enabled, onToggle, sx }) {
  return (
    <Tooltip title={enabled ? "Mute bid/sold sounds" : "Unmute bid/sold sounds"}>
      <IconButton onClick={onToggle} size="small" sx={sx} aria-label={enabled ? "Mute sounds" : "Unmute sounds"}>
        {enabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

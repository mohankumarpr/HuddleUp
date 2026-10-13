import React from "react";
import { Chip } from "@mui/material";
import { genderMeta } from "../../utils/gender";

// A small colored, iconed chip -- the one consistent way gender is shown across the player pool,
// the live auction card, and the on-the-block reveal, so men's and women's players are visually
// distinguishable at a glance everywhere, not just as plain text.
export default function GenderBadge({ gender, size = "small", sx }) {
  const meta = genderMeta(gender);
  if (!meta) return null;
  const Icon = meta.Icon;
  return (
    <Chip
      size={size}
      icon={<Icon fontSize="small" />}
      label={meta.label}
      sx={{
        bgcolor: `${meta.color}26`,
        color: meta.color,
        border: `1px solid ${meta.color}66`,
        fontWeight: 600,
        "& .MuiChip-icon": { color: meta.color },
        ...sx,
      }}
    />
  );
}

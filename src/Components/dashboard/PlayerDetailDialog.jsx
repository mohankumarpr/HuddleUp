import React from "react";
import { Avatar, Box, Chip, Dialog, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import GenderBadge from "../common/GenderBadge";

const STATUS_LABEL = {
  pool: "In pool",
  on_block: "On the block",
  sold: "Sold",
  unsold: "Unsold",
};

// A read-only, full-detail look at one player -- deliberately styled like the live auction's
// "on the block" reveal (the gradient-ring photo, big name, chip row, About panel) so a player
// looks the same whether you're reviewing them in the pool or watching them get bid on.
export default function PlayerDetailDialog({ open, player, privateInfo, sportNames, teams, onClose }) {
  const soldTeam = player?.status === "sold" ? teams?.find((t) => t.id === player.soldTeamId) : null;
  const accent = soldTeam?.color || "#6366F1";
  const details = player
    ? [privateInfo?.email, privateInfo?.contact, privateInfo?.block].filter(Boolean).join(" · ")
    : "";

  return (
    <Dialog
      open={Boolean(player)}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          background:
            "radial-gradient(circle at 18% 10%, rgba(99,102,241,0.3), transparent 55%), linear-gradient(165deg, #0B1220 0%, #0F172A 55%, #1E1B3A 100%)",
          color: "#fff",
        },
      }}
    >
      {player && (
        <Box sx={{ position: "relative", px: 3, py: 5 }}>
          <IconButton onClick={onClose} aria-label="Close" sx={{ position: "absolute", top: 8, right: 8, color: "grey.400" }}>
            <CloseIcon />
          </IconButton>

          <Stack alignItems="center" spacing={0}>
            <Box
              sx={{
                width: 180,
                height: 180,
                borderRadius: "50%",
                p: "6px",
                background: `conic-gradient(${accent}, rgba(255,255,255,0.15), ${accent})`,
                boxShadow: `0 0 70px ${accent}66`,
              }}
            >
              <Avatar
                src={player.photoUrl}
                alt={player.name}
                sx={{ width: "100%", height: "100%", fontSize: 48, border: "5px solid #0B1220" }}
              >
                {player.name?.[0]}
              </Avatar>
            </Box>

            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 3 }}>
              {player.marquee && <StarIcon sx={{ color: "warning.main" }} />}
              <Typography variant="h4" fontWeight={800} textAlign="center">
                {player.name}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }} flexWrap="wrap" justifyContent="center" useFlexGap>
              <Chip
                size="small"
                label={STATUS_LABEL[player.status] || player.status}
                sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "grey.200", fontSize: 12, fontWeight: 600 }}
              />
              {sportNames && (
                <Chip size="small" label={sportNames} sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "grey.300", fontSize: 12 }} />
              )}
              <GenderBadge gender={player.gender} sx={{ fontSize: 12 }} />
              <Chip
                size="small"
                label={`Base ${player.basePrice}`}
                variant="outlined"
                sx={{ color: "grey.300", borderColor: "rgba(255,255,255,0.3)", fontSize: 12 }}
              />
            </Stack>

            {player.status === "sold" && (
              <Typography sx={{ mt: 1.5, color: "success.light", fontWeight: 600 }}>
                Sold to {soldTeam?.name || "Unknown team"} for {player.soldPrice}
              </Typography>
            )}

            {player.aboutMe && (
              <Box
                sx={{
                  mt: 3,
                  p: 2.5,
                  width: "100%",
                  maxHeight: 220,
                  overflowY: "auto",
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Typography variant="overline" sx={{ color: "primary.light", letterSpacing: 2 }}>
                  About
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    textAlign: "left",
                    color: "grey.100",
                    fontSize: 15,
                    lineHeight: 1.65,
                    whiteSpace: "pre-line",
                  }}
                >
                  {player.aboutMe}
                </Typography>
              </Box>
            )}

            {details && (
              <Box sx={{ mt: 2.5, width: "100%", textAlign: "center" }}>
                <Typography variant="overline" sx={{ color: "primary.light", letterSpacing: 2, display: "block" }}>
                  Contact (organizer-only)
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.300", wordBreak: "break-word" }}>
                  {details}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}
    </Dialog>
  );
}

import React from "react";
import { Avatar, Box, Typography } from "@mui/material";
import { APP_NAME } from "../../branding";
import { formatAmount } from "../../utils/formatAmount";

// A fixed-size, self-contained visual card meant to be captured as an image (see
// ShareSoldDialog.jsx) and shared outside the app -- a WhatsApp-group-friendly "SOLD!" announcement
// with no app chrome. Fixed pixel dimensions (not responsive) so the exported image always comes
// out the same shape regardless of the viewer's screen.
const SoldShareCard = React.forwardRef(function SoldShareCard({ player, teamName, teamColor, price, eventName }, ref) {
  return (
    <Box
      ref={ref}
      sx={{
        width: 420,
        height: 600,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(165deg, #0B1220 0%, #0F172A 55%, ${teamColor || "#1E1B3A"}55 100%)`,
        color: "#fff",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 4,
        py: 5,
        textAlign: "center",
      }}
    >
      <Typography
        sx={{
          fontSize: 42,
          fontWeight: 900,
          letterSpacing: 2,
          color: "#34D399",
          textShadow: "0 0 24px rgba(52,211,153,0.6)",
          mb: 3,
        }}
      >
        SOLD!
      </Typography>

      <Box
        sx={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          p: "5px",
          background: `conic-gradient(${teamColor || "#6366F1"}, rgba(255,255,255,0.15), ${teamColor || "#6366F1"})`,
          mb: 3,
        }}
      >
        <Avatar
          src={player?.photoUrl}
          alt={player?.name}
          sx={{ width: "100%", height: "100%", fontSize: 56, border: "4px solid #0B1220" }}
        >
          {player?.name?.[0]}
        </Avatar>
      </Box>

      <Typography sx={{ fontSize: 30, fontWeight: 800, mb: 1 }}>{player?.name}</Typography>

      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          bgcolor: teamColor || "#6366F1",
          borderRadius: 999,
          px: 2.5,
          py: 0.75,
          mb: 2,
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{teamName}</Typography>
      </Box>

      <Typography sx={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{formatAmount(price)}</Typography>

      <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.55)", mt: 5, letterSpacing: 1 }}>
        {eventName ? `${eventName} · ` : ""}
        {APP_NAME}
      </Typography>
    </Box>
  );
});

export default SoldShareCard;

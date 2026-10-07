import React from "react";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";

// Every team's purse, side by side -- used wherever "what have the other teams got left" matters:
// the team bidder view (so a rep can see rivals' budgets, not just their own), the spectator
// screen, and the organizer console. `highlightTeamId` marks the viewer's own team, if any.
export default function TeamPurseList({ teams, highlightTeamId, dark = false }) {
  return (
    <Stack spacing={1.25}>
      {teams.map((team) => {
        const pct = team.purseTotal ? (team.purseRemaining / team.purseTotal) * 100 : 0;
        const isMe = team.id === highlightTeamId;
        return (
          <Box
            key={team.id}
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: isMe ? (dark ? "rgba(255,255,255,0.08)" : "action.selected") : "transparent",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: team.color, flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  fontWeight={isMe ? 700 : 500}
                  noWrap
                  sx={{ color: dark ? "#fff" : "text.primary" }}
                >
                  {team.name}
                  {isMe ? " (You)" : ""}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: dark ? "grey.400" : "text.secondary", flexShrink: 0 }}>
                {team.purseRemaining} / {team.purseTotal}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 5,
                borderRadius: 3,
                mt: 0.5,
                bgcolor: dark ? "rgba(255,255,255,0.1)" : "action.disabledBackground",
                "& .MuiLinearProgress-bar": { bgcolor: team.color, borderRadius: 3 },
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

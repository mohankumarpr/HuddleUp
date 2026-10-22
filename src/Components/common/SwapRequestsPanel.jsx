import React from "react";
import { Alert, Button, Stack } from "@mui/material";
import { formatAmount } from "../../utils/formatAmount";

// Shown both on the organizer console and inside the full-screen "on the block" dialog -- a swap
// offer can arrive at any time, including mid-auction while that dialog covers the whole screen,
// so the organizer needs to see (and act on) it from either place, not just the console behind it.
export default function SwapRequestsPanel({ swapRequests, players, teams, busy, onComplete, sx }) {
  const accepted = swapRequests.filter((r) => r.status === "accepted");
  const pending = swapRequests.filter((r) => r.status === "pending");
  if (accepted.length === 0 && pending.length === 0) return null;

  return (
    <Stack spacing={1.5} sx={sx}>
      {accepted.map((req) => {
        const player = players.find((p) => p.id === req.playerId);
        const fromTeam = teams.find((t) => t.id === req.targetTeamId);
        const toTeam = teams.find((t) => t.id === req.requesterTeamId);
        return (
          <Alert
            key={req.id}
            severity="success"
            action={
              <Button variant="contained" size="small" color="success" disabled={busy} onClick={() => onComplete(req)}>
                Confirm swap
              </Button>
            }
          >
            Both sides agreed: move {player?.name || "a player"} from {fromTeam?.name || "a team"} to{" "}
            {toTeam?.name || "a team"} for {formatAmount(req.price)}.
          </Alert>
        );
      })}
      {pending.map((req) => {
        const player = players.find((p) => p.id === req.playerId);
        const fromTeam = teams.find((t) => t.id === req.targetTeamId);
        const toTeam = teams.find((t) => t.id === req.requesterTeamId);
        return (
          <Alert key={req.id} severity="info">
            {toTeam?.name || "A team"} offered {fromTeam?.name || "a team"} {formatAmount(req.price)} for{" "}
            {player?.name || "a player"} -- waiting for {fromTeam?.name || "them"} to respond.
          </Alert>
        );
      })}
    </Stack>
  );
}

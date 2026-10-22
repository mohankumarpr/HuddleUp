import React from "react";
import { Box, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { computeGenderQuota, computePoolGenderTotals, computeTotalSlotsPerTeam, countTeamRoster, maxBidCapForTeam } from "../../utils/auctionQuota";
import { formatAmount } from "../../utils/formatAmount";

// Every team's purse, side by side -- used wherever "what have the other teams got left" matters:
// the team bidder view (so a rep can see rivals' budgets, not just their own), the spectator
// screen, and the organizer console. `highlightTeamId` marks the viewer's own team, if any.
// `players`, when passed, also shows each team's progress toward its men's/women's quota (see
// auctionQuota.js) -- omit it to just show purses, same as before this was added.
// `reserveSlotPrice`, when passed, ALSO shows each team's reserve-safe max bid for the next player
// -- this is organizer-only intel (see OrganizerConsole): a team should see its own max bid, never
// another team's, so TeamBidderView's "all teams" list deliberately never passes this prop.
export default function TeamPurseList({ teams, highlightTeamId, dark = false, players, reserveSlotPrice }) {
  const genderTotals = players ? computePoolGenderTotals(players) : null;
  const womenQuota = genderTotals ? computeGenderQuota(genderTotals.female, teams.length) : null;
  const menQuota = genderTotals ? computeGenderQuota(genderTotals.male, teams.length) : null;
  const totalSlotsPerTeam = players ? computeTotalSlotsPerTeam(players.length, teams.length) : null;

  return (
    <Stack spacing={1.25}>
      {teams.map((team) => {
        const pct = team.purseTotal ? (team.purseRemaining / team.purseTotal) * 100 : 0;
        const isMe = team.id === highlightTeamId;
        const roster = players ? countTeamRoster(players, team.id) : null;
        const bidCap =
          roster && reserveSlotPrice
            ? maxBidCapForTeam({
                purseRemaining: team.purseRemaining,
                totalSlotsPerTeam,
                teamTotalOwned: roster.total,
                reserveSlotPrice,
              })
            : null;
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
                {team.swapUsed && (
                  <Chip
                    label="Swap used"
                    size="small"
                    sx={{ height: 18, fontSize: 10, bgcolor: dark ? "rgba(255,255,255,0.12)" : undefined, color: dark ? "#fff" : undefined }}
                  />
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: dark ? "grey.400" : "text.secondary", flexShrink: 0 }}>
                {formatAmount(team.purseRemaining)} / {formatAmount(team.purseTotal)}
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
            {(bidCap != null || (roster && (genderTotals.female > 0 || genderTotals.male > 0))) && (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                {bidCap != null && (
                  <Chip
                    size="small"
                    label={`Max bid: ${formatAmount(bidCap)}`}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: dark ? "rgba(255,255,255,0.1)" : undefined,
                      color: dark ? "grey.300" : undefined,
                    }}
                  />
                )}
                {genderTotals.female > 0 && (
                  <Chip
                    size="small"
                    label={`Women ${roster.female}/${womenQuota.max}`}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: dark ? "rgba(255,255,255,0.1)" : undefined,
                      color: dark ? "grey.300" : undefined,
                    }}
                  />
                )}
                {genderTotals.male > 0 && (
                  <Chip
                    size="small"
                    label={`Men ${roster.male}/${menQuota.max}`}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: dark ? "rgba(255,255,255,0.1)" : undefined,
                      color: dark ? "grey.300" : undefined,
                    }}
                  />
                )}
              </Stack>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

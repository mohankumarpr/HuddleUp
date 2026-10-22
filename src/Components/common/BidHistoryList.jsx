import React from "react";
import { Box, Chip, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";

function timeAgo(placedAt) {
  const ms = placedAt?.toMillis ? placedAt.toMillis() : null;
  if (!ms) return "";
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

// `bids` is already ordered newest-first (see subscribeToBidsForPlayer). Used both live -- the
// current player's bid feed in the auction room -- and historically, from the player pool, to
// settle "wait, who bid first" questions after the fact. `dark` is for hosts like SpectatorView
// that are always rendered on a dark background regardless of the site's light/dark mode.
// `highlightTop` calls out bids[0] as the current leading bid -- only meaningful while a player is
// actively on the block (newest bid == highest bid); not used for a settled player's history.
export default function BidHistoryList({ bids, teams, dense = false, emptyText = "No bids yet.", dark = false, highlightTop = false }) {
  const textSx = dark ? { color: "#fff" } : undefined;
  const secondarySx = dark ? { color: "grey.400" } : undefined;

  if (!bids?.length) {
    return (
      <Typography variant="body2" sx={dark ? secondarySx : undefined} color={dark ? undefined : "text.secondary"}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <List dense={dense} disablePadding>
      {bids.map((bid, i) => {
        const team = teams.find((t) => t.id === bid.teamId);
        const isTop = highlightTop && i === 0 && !bid.withdrawn;
        return (
          <ListItem
            key={bid.id}
            disableGutters
            divider={!dark}
            sx={{
              ...(dark ? { borderBottom: "1px solid rgba(255,255,255,0.1)" } : {}),
              ...(bid.withdrawn && { opacity: 0.5 }),
              ...(isTop && {
                borderRadius: 1.5,
                bgcolor: dark ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.12)",
                pl: 1,
                my: 0.5,
              }),
            }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: team?.color || "grey.400", mr: 1.5, flexShrink: 0 }} />
            <ListItemText
              primary={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography
                    component="span"
                    sx={{ fontWeight: isTop ? 700 : 400, textDecoration: bid.withdrawn ? "line-through" : "none", ...textSx }}
                  >
                    {team?.name || "Unknown team"}
                  </Typography>
                  {isTop && <Chip size="small" label="Leading" color="success" sx={{ height: 18, fontSize: 11 }} />}
                  {bid.withdrawn && <Chip size="small" label="Withdrawn" sx={{ height: 18, fontSize: 11 }} />}
                </Stack>
              }
              secondary={timeAgo(bid.placedAt)}
              secondaryTypographyProps={{ sx: secondarySx }}
            />
            <Chip
              size="small"
              label={bid.amount}
              sx={
                isTop
                  ? { bgcolor: "success.main", color: "#fff", fontWeight: 700 }
                  : dark
                    ? { bgcolor: "rgba(255,255,255,0.12)", color: "#fff" }
                    : undefined
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
}

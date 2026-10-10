import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { subscribeToActivityLog } from "../../utils/firebase/activityLog";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

const ACTION_LABELS = {
  team_deleted: "Team deleted",
  sport_deleted: "Sport deleted",
  player_removed: "Player removed",
  registration_approved: "Registration approved",
  registration_rejected: "Registration rejected",
  player_sold: "Player sold",
  player_unsold: "Player unsold",
  action_undone: "Action undone",
  standings_published: "Standings published",
  fixtures_cleared: "Fixtures cleared",
};

function formatWhen(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : null;
  if (!date) return "Just now";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ActivityLog() {
  const { eventId } = useParams();
  const [entries, setEntries] = useState(null);

  useEffect(() => subscribeToActivityLog(eventId, setEntries), [eventId]);

  if (!entries) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 800 }}>
      <DashboardHero
        title="Activity log"
        subtitle="Who did what -- the last 200 organizer actions for this event."
        image={heroImageFor("activity")}
        icon={<HistoryIcon />}
        dense
      />

      {entries.length === 0 && <Typography color="text.secondary">Nothing's happened yet.</Typography>}

      <Stack spacing={1.5}>
        {entries.map((entry) => (
          <Paper key={entry.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
              <Box>
                <Typography variant="body1">{entry.summary}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatWhen(entry.createdAt)}
                </Typography>
              </Box>
              <Chip size="small" label={ACTION_LABELS[entry.action] || entry.action} variant="outlined" />
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

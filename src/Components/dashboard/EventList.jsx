import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import AddIcon from "@mui/icons-material/Add";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PlaceIcon from "@mui/icons-material/Place";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import { useAuth } from "../../context/AuthContext";
import { subscribeToOrgEvents } from "../../utils/firebase/events";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

const STATUS_COLOR = {
  draft: "default",
  registration_open: "info",
  live: "success",
  ended: "warning",
};

const ACCENTS = ["#6366F1", "#EC4899", "#10B981", "#F59E0B", "#0EA5E9", "#8B5CF6"];
function accentFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return ACCENTS[hash % ACCENTS.length];
}

export default function EventList() {
  const { organization } = useAuth();
  const [events, setEvents] = useState(null);

  useEffect(() => {
    if (!organization?.id) return undefined;
    const unsubscribe = subscribeToOrgEvents(organization.id, setEvents);
    return unsubscribe;
  }, [organization?.id]);

  if (!events) return <LoadingSpinner />;

  return (
    <Box>
      <DashboardHero
        title="Your events"
        subtitle={`${events.length} event${events.length === 1 ? "" : "s"} under ${organization?.name || "your organization"}`}
        image={heroImageFor("events")}
        icon={<SportsScoreIcon />}
        action={
          <Button
            component={RouterLink}
            to="/app/events/new"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ bgcolor: "#fff", color: "primary.dark", "&:hover": { bgcolor: "rgba(255,255,255,0.9)" } }}
          >
            New event
          </Button>
        }
      />

      {events.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card
            variant="outlined"
            sx={{
              p: 6,
              textAlign: "center",
              borderStyle: "dashed",
              bgcolor: "background.subtle",
            }}
          >
            <EventAvailableIcon sx={{ fontSize: 48, color: "primary.main", opacity: 0.6, mb: 1.5 }} />
            <Typography color="text.secondary" sx={{ maxWidth: 360, mx: "auto" }}>
              You haven't created an event yet. Create one to get a registration link and a live
              auction room.
            </Typography>
            <Button component={RouterLink} to="/app/events/new" variant="contained" sx={{ mt: 3 }} startIcon={<AddIcon />}>
              Create your first event
            </Button>
          </Card>
        </motion.div>
      ) : (
        <Stack spacing={2}>
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
            >
              <Card
                variant="outlined"
                sx={{
                  borderLeft: "4px solid",
                  borderLeftColor: accentFor(event.id),
                  transition: "box-shadow 0.2s ease, transform 0.2s ease",
                  "&:hover": { boxShadow: 4, transform: "translateY(-2px)" },
                }}
              >
                <CardActionArea component={RouterLink} to={`/app/events/${event.id}`}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: `${accentFor(event.id)}22`,
                            color: accentFor(event.id),
                          }}
                        >
                          <SportsScoreIcon />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h6" noWrap>
                            {event.name}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: "text.secondary" }}>
                            <PlaceIcon fontSize="inherit" />
                            <Typography variant="body2" noWrap>
                              {event.venue || "No venue set"}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                      <Chip
                        label={event.status.replace("_", " ")}
                        color={STATUS_COLOR[event.status] || "default"}
                        size="small"
                        sx={{ flexShrink: 0 }}
                      />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </motion.div>
          ))}
        </Stack>
      )}
    </Box>
  );
}

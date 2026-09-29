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
import { useAuth } from "../../context/AuthContext";
import { subscribeToOrgEvents } from "../../utils/firebase/events";
import LoadingSpinner from "../LoadingSpinner";

const STATUS_COLOR = {
  draft: "default",
  registration_open: "info",
  live: "success",
  ended: "warning",
};

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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Your events
        </Typography>
        <Button component={RouterLink} to="/app/events/new" variant="contained" startIcon={<AddIcon />}>
          New event
        </Button>
      </Stack>

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
              <Card variant="outlined" sx={{ transition: "box-shadow 0.2s ease", "&:hover": { boxShadow: 3 } }}>
                <CardActionArea component={RouterLink} to={`/app/events/${event.id}`}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h6">{event.name}</Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: "text.secondary" }}>
                          <PlaceIcon fontSize="inherit" />
                          <Typography variant="body2">{event.venue || "No venue set"}</Typography>
                        </Stack>
                      </Box>
                      <Chip
                        label={event.status.replace("_", " ")}
                        color={STATUS_COLOR[event.status] || "default"}
                        size="small"
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

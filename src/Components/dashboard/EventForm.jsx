import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useAuth } from "../../context/AuthContext";
import { createEvent, getEvent, updateEvent } from "../../utils/firebase/events";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

export default function EventForm() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEdit = Boolean(eventId);
  const { organization } = useAuth();

  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [purseDefault, setPurseDefault] = useState(10000);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;
    (async () => {
      const event = await getEvent(eventId);
      if (!active) return;
      if (event) {
        setName(event.name || "");
        setVenue(event.venue || "");
        setEventDate(event.eventDate || "");
        setDescription(event.description || "");
        setPurseDefault(event.purseDefault ?? 10000);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [isEdit, eventId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateEvent(eventId, {
          name,
          venue,
          eventDate: eventDate || null,
          description,
          purseDefault: Math.max(0, Number(purseDefault) || 0),
        });
        navigate(`/app/events/${eventId}`, { replace: true });
      } else {
        const newId = await createEvent(organization.id, { name, venue, eventDate: eventDate || null, description, purseDefault });
        navigate(`/app/events/${newId}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || `Couldn't ${isEdit ? "save" : "create"} the event. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 560 }}>
      <DashboardHero
        title={isEdit ? "Edit event" : "Create a new event"}
        image={heroImageFor(isEdit ? eventId : "new-event")}
        icon={isEdit ? <EditOutlinedIcon /> : <AddIcon />}
        dense
      />
      <Paper variant="outlined" sx={{ p: 4 }}>
        {!isEdit && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You'll be able to configure sports, teams, and registration after creating the event.
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Event name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} fullWidth />
            <TextField
              label="Event date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Starting purse per team"
              type="number"
              value={purseDefault}
              onChange={(e) => setPurseDefault(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create event"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

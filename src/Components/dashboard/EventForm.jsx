import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { createEvent } from "../../utils/firebase/events";

export default function EventForm() {
  const navigate = useNavigate();
  const { organization } = useAuth();

  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [purseDefault, setPurseDefault] = useState(10000);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const eventId = await createEvent(organization.id, {
        name,
        venue,
        eventDate: eventDate || null,
        description,
        purseDefault,
      });
      navigate(`/app/events/${eventId}`, { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't create the event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 4, maxWidth: 560 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Create a new event
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        You'll be able to configure sports, teams, and registration after creating the event.
      </Typography>

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
            {submitting ? "Creating..." : "Create event"}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import { useAuth } from "../../context/AuthContext";
import { subscribeToSports } from "../../utils/firebase/events";
import { subscribeToRegistrations } from "../../utils/firebase/registrations";
import { promoteRegistrationToPlayer, rejectRegistrationRequest } from "../../utils/firebase/players";
import { logActivity } from "../../utils/firebase/activityLog";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

export default function RegistrationReviewQueue() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState(null);
  const [sports, setSports] = useState([]);
  const [approving, setApproving] = useState(null); // registration being approved
  const [basePrice, setBasePrice] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubRegs = subscribeToRegistrations(eventId, "pending", setRegistrations);
    const unsubSports = subscribeToSports(eventId, setSports);
    return () => {
      unsubRegs();
      unsubSports();
    };
  }, [eventId]);

  function sportNames(sportIds) {
    return (sportIds || [])
      .map((id) => sports.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }

  function openApprove(registration) {
    setApproving(registration);
    setBasePrice(String(registration.requestedBasePrice || ""));
    setError(null);
  }

  async function confirmApprove() {
    try {
      await promoteRegistrationToPlayer(eventId, approving, {
        basePrice: Number(basePrice) || 0,
        reviewerUid: user.uid,
      });
      logActivity(eventId, {
        actorUid: user.uid,
        action: "registration_approved",
        summary: `Approved ${approving.name}'s registration`,
      });
      setApproving(null);
    } catch (err) {
      setError(err.message || "Couldn't approve this registration.");
    }
  }

  async function handleReject(registration) {
    await rejectRegistrationRequest(eventId, registration, user.uid);
    logActivity(eventId, {
      actorUid: user.uid,
      action: "registration_rejected",
      summary: `Rejected ${registration.name}'s registration`,
    });
  }

  if (!registrations) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <DashboardHero
        title="Registration review"
        subtitle="Approve a registration to add it to the auction-eligible player pool."
        image={heroImageFor("registrations")}
        icon={<HowToRegIcon />}
        dense
      />

      {registrations.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">No pending registrations.</Typography>
        </Paper>
      )}

      <Stack spacing={1.5}>
        {registrations.map((registration) => (
          <Paper key={registration.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar src={registration.photoUrl} alt={registration.name} sx={{ width: 48, height: 48 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={600}>
                  {registration.name}
                  {registration.gender ? ` · ${registration.gender}` : ""}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {[registration.email, registration.contact, registration.block].filter(Boolean).join(" · ")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {sportNames(registration.sportIds) || "No sports selected"}
                </Typography>
                {registration.aboutMe && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    “{registration.aboutMe}”
                  </Typography>
                )}
              </Box>
              {registration.requestedBasePrice != null && (
                <Chip label={`Requested: ${registration.requestedBasePrice}`} size="small" />
              )}
              <Button size="small" onClick={() => handleReject(registration)}>
                Reject
              </Button>
              <Button size="small" variant="contained" onClick={() => openApprove(registration)}>
                Approve
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Dialog open={Boolean(approving)} onClose={() => setApproving(null)} fullWidth maxWidth="xs">
        <DialogTitle>Approve {approving?.name}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="Base price"
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            fullWidth
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproving(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmApprove}>
            Add to player pool
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

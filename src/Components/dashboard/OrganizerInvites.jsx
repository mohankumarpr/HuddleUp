import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GroupsIcon from "@mui/icons-material/Groups";
import IconButton from "@mui/material/IconButton";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { subscribeToMembers } from "../../utils/firebase/organizations";
import { createInvite, revokeInvite, subscribeToPendingInvites } from "../../utils/firebase/invites";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import DashboardHero, { heroImageFor } from "./DashboardHero";
import LoadingSpinner from "../LoadingSpinner";

export default function OrganizerInvites() {
  const { user, organization, membership } = useAuth();
  const confirm = useConfirm();
  const isOwner = membership?.role === "owner";
  const orgId = organization?.id;

  const [members, setMembers] = useState(null);
  const [invites, setInvites] = useState(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!orgId) return undefined;
    const unsubs = [subscribeToMembers(orgId, setMembers)];
    // Listing invites is owner-only (see firestore.rules) -- a non-owner organizer doesn't see
    // this section at all, so skip the query rather than let it hang on a permission error.
    if (isOwner) {
      unsubs.push(subscribeToPendingInvites(orgId, setInvites));
    } else {
      setInvites([]);
    }
    return () => unsubs.forEach((u) => u());
  }, [orgId, isOwner]);

  async function handleInvite(e) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await createInvite(orgId, organization.name, { email, invitedByUid: user.uid });
      setEmail("");
      setMessage("Invite created -- share the link below with them.");
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke(invite) {
    const ok = await confirm({
      title: "Revoke this invite?",
      description: `The invite sent to ${invite.email} will no longer work.`,
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (!ok) return;
    try {
      await revokeInvite(orgId, invite.id);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    }
  }

  async function copyInviteLink(invite) {
    const link = `${window.location.origin}/invite/${orgId}/${invite.id}`;
    await navigator.clipboard.writeText(link);
    setMessage("Invite link copied");
  }

  if (!members || !invites) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 700 }}>
      <DashboardHero
        title="Co-organizers"
        subtitle={`Everyone here can manage every event under ${organization?.name || "your organization"}.`}
        image={heroImageFor("organizers")}
        icon={<GroupsIcon />}
        dense
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Members
        </Typography>
        <Stack spacing={1.5}>
          {members.map((m) => (
            <Stack key={m.id} direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={600}>{m.displayName || m.email || "Unnamed"}</Typography>
                {m.email && (
                  <Typography variant="body2" color="text.secondary">
                    {m.email}
                  </Typography>
                )}
              </Box>
              <Chip size="small" label={m.role} color={m.role === "owner" ? "primary" : "default"} />
            </Stack>
          ))}
        </Stack>
      </Paper>

      {isOwner && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            Invite a co-organizer
          </Typography>
          <Box component="form" onSubmit={handleInvite}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Their email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={sending} sx={{ whiteSpace: "nowrap" }}>
                {sending ? "Sending..." : "Create invite"}
              </Button>
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            They don't need an account yet -- the invite link lets them create one and join automatically. If they
            already have an account under a different organization, they'll need a different email to accept.
          </Typography>

          {invites.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Pending invites
              </Typography>
              <Stack spacing={1}>
                {invites.map((invite) => (
                  <Stack key={invite.id} direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ flexGrow: 1 }} variant="body2">
                      {invite.email}
                    </Typography>
                    <Button size="small" onClick={() => copyInviteLink(invite)}>
                      Copy link
                    </Button>
                    <IconButton size="small" aria-label={`Revoke invite for ${invite.email}`} onClick={() => handleRevoke(invite)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </>
          )}
        </Paper>
      )}

      <Snackbar open={Boolean(message)} autoHideDuration={2500} onClose={() => setMessage(null)} message={message} />
    </Box>
  );
}

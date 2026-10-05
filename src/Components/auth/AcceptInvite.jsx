import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { motion } from "framer-motion";
import GroupsIcon from "@mui/icons-material/Groups";
import { useAuth } from "../../context/AuthContext";
import { signInWithEmail, signOutUser, signUpPlayer } from "../../utils/firebase/auth";
import { acceptInvite, getInvite } from "../../utils/firebase/invites";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import LoadingSpinner from "../LoadingSpinner";
import AuthLayout from "./AuthLayout";

export default function AcceptInvite() {
  const { orgId, inviteId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refresh } = useAuth();

  const [invite, setInvite] = useState(undefined); // undefined = loading, null = not found
  const [mode, setMode] = useState("signup"); // signup | signin
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => setInvite(await getInvite(orgId, inviteId)))();
  }, [orgId, inviteId]);

  const loggedIn = Boolean(user && !user.isAnonymous);
  const emailMatches = loggedIn && invite && (user.email || "").toLowerCase() === invite.emailLower;

  async function finish(signedInUser) {
    await acceptInvite(orgId, inviteId, signedInUser);
    await refresh();
    setDone(true);
    setTimeout(() => navigate("/app/events", { replace: true }), 1200);
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const newUser = await signUpPlayer({ email: invite.email, password, displayName: name });
      await finish(newUser);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const existingUser = await signInWithEmail({ email: invite.email, password });
      await finish(existingUser);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAcceptAsCurrentUser() {
    setError(null);
    setBusy(true);
    try {
      await finish(user);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (invite === undefined || authLoading) return <LoadingSpinner />;

  if (invite === null || invite.status !== "pending") {
    return (
      <Container maxWidth="sm" sx={{ py: 12, textAlign: "center" }}>
        <Typography variant="h5">This invite link is no longer valid.</Typography>
        <Typography color="text.secondary">It may have been revoked or already accepted.</Typography>
      </Container>
    );
  }

  return (
    <AuthLayout>
      <Container maxWidth="xs" sx={{ py: 6 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: 1, borderColor: "divider" }}>
            <GroupsIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Join {invite.orgName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You've been invited to co-organize events for <b>{invite.orgName}</b> as <b>{invite.email}</b>.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {done && (
              <Alert severity="success" sx={{ mb: 2 }}>
                You're in! Taking you to the dashboard...
              </Alert>
            )}

            {!done && loggedIn && emailMatches && (
              <Button variant="contained" size="large" fullWidth onClick={handleAcceptAsCurrentUser} disabled={busy}>
                {busy ? "Joining..." : `Accept as ${user.email}`}
              </Button>
            )}

            {!done && loggedIn && !emailMatches && (
              <Stack spacing={2}>
                <Alert severity="warning">
                  You're signed in as <b>{user.email}</b>, but this invite was sent to <b>{invite.email}</b>.
                </Alert>
                <Button variant="outlined" onClick={() => signOutUser()}>
                  Sign out and use {invite.email}
                </Button>
              </Stack>
            )}

            {!done && !loggedIn && (
              <Box component="form" onSubmit={mode === "signup" ? handleCreateAccount : handleSignIn}>
                <Stack spacing={2}>
                  {mode === "signup" && (
                    <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
                  )}
                  <TextField label="Email" value={invite.email} disabled fullWidth />
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                    helperText={mode === "signup" ? "At least 6 characters -- this creates your login" : undefined}
                  />
                  <Button type="submit" variant="contained" size="large" disabled={busy}>
                    {busy ? "Please wait..." : mode === "signup" ? "Create account and join" : "Sign in and join"}
                  </Button>
                </Stack>
                <Button
                  size="small"
                  sx={{ mt: 1.5 }}
                  onClick={() => {
                    setMode(mode === "signup" ? "signin" : "signup");
                    setError(null);
                  }}
                >
                  {mode === "signup" ? "I already have an account with this email" : "I need to create an account"}
                </Button>
              </Box>
            )}
          </Paper>
        </motion.div>
      </Container>
    </AuthLayout>
  );
}

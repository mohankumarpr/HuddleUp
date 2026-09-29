import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Container, TextField, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { signUpOrganizer } from "../../utils/firebase/auth";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "./AuthLayout";

export default function SignupForm() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUpOrganizer({ email, password, displayName, orgName });
      await refresh();
      navigate("/app/events", { replace: true });
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <Container maxWidth="xs" sx={{ py: 6 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Create your account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Set up your organization and start running your own player auctions.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              fullWidth
              helperText="e.g. your club, society, or company name"
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              helperText="At least 6 characters"
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ py: 1.4 }}>
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </Typography>
        </motion.div>
      </Container>
    </AuthLayout>
  );
}

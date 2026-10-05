import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Container, TextField, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { sendPasswordReset } from "../../utils/firebase/auth";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import AuthLayout from "./AuthLayout";

export default function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
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
            Reset your password
          </Typography>

          {sent ? (
            <>
              <Alert severity="success" sx={{ mb: 3 }}>
                Password reset link sent to <b>{email}</b>. Check your inbox (and spam folder) and click the link to
                choose a new password.
              </Alert>
              <Button variant="outlined" fullWidth onClick={() => navigate("/login")}>
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Enter the email on your account and we'll send you a link to reset your password.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ py: 1.4 }}>
                  {submitting ? "Sending..." : "Send reset link"}
                </Button>
              </Box>
            </>
          )}

          <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }}>
            <Link to="/login">Back to sign in</Link>
          </Typography>
        </motion.div>
      </Container>
    </AuthLayout>
  );
}

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Container, TextField, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { completePasswordReset, verifyResetCode } from "../../utils/firebase/auth";
import { friendlyErrorMessage } from "../../utils/firebase/errors";
import LoadingSpinner from "../LoadingSpinner";
import AuthLayout from "./AuthLayout";

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState(undefined); // undefined = checking, null = invalid/expired code
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setEmail(null);
      return;
    }
    verifyResetCode(oobCode)
      .then(setEmail)
      .catch(() => setEmail(null));
  }, [oobCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await completePasswordReset(oobCode, password);
      setDone(true);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (email === undefined) return <LoadingSpinner />;

  return (
    <AuthLayout>
      <Container maxWidth="xs" sx={{ py: 6 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Set a new password
          </Typography>

          {email === null ? (
            <>
              <Alert severity="error" sx={{ mb: 3 }}>
                This reset link is invalid or has expired. Request a new one to continue.
              </Alert>
              <Button variant="contained" fullWidth onClick={() => navigate("/forgot-password")}>
                Request a new link
              </Button>
            </>
          ) : done ? (
            <>
              <Alert severity="success" sx={{ mb: 3 }}>
                Your password has been reset. You can now sign in with your new password.
              </Alert>
              <Button variant="contained" fullWidth onClick={() => navigate("/login")}>
                Go to sign in
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Choose a new password for <b>{email}</b>.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  fullWidth
                  helperText="At least 6 characters"
                />
                <TextField
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ py: 1.4 }}>
                  {submitting ? "Resetting..." : "Reset password"}
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

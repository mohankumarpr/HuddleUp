import React from "react";
import { Link as RouterLink, Outlet } from "react-router-dom";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { signOutUser } from "../../utils/firebase/auth";

export default function DashboardLayout() {
  const { organization, profile } = useAuth();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/app/events"
            sx={{ textDecoration: "none", color: "inherit", fontWeight: 700, flexGrow: 1 }}
          >
            {organization?.name || "My Organization"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile?.displayName || profile?.email}
          </Typography>
          <Button size="small" onClick={() => signOutUser()}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}

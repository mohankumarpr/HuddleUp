import React, { useState } from "react";
import { Link as RouterLink, Outlet } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupsIcon from "@mui/icons-material/Groups";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../../context/AuthContext";
import { useThemeMode } from "../../context/ThemeModeContext";
import { signOutUser } from "../../utils/firebase/auth";

export default function DashboardLayout() {
  const { organization, profile } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [menuAnchor, setMenuAnchor] = useState(null);

  const initials = (profile?.displayName || profile?.email || "?").trim()[0]?.toUpperCase();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: (theme) =>
          theme.palette.mode === "dark"
            ? "radial-gradient(circle at 15% 0%, rgba(99,102,241,0.18), transparent 45%), radial-gradient(circle at 85% 20%, rgba(236,72,153,0.12), transparent 40%)"
            : "radial-gradient(circle at 15% 0%, rgba(99,102,241,0.10), transparent 45%), radial-gradient(circle at 85% 20%, rgba(236,72,153,0.08), transparent 40%)",
        backgroundColor: "background.default",
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundImage: "linear-gradient(100deg, #4338CA 0%, #6366F1 55%, #A855F7 100%)",
          color: "#fff",
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <Box
            component={RouterLink}
            to="/app/events"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              color: "inherit",
              flexGrow: 1,
              minWidth: 0,
            }}
          >
            <GavelIcon sx={{ opacity: 0.9, flexShrink: 0 }} />
            <Typography
              variant="h6"
              fontWeight={700}
              noWrap
              sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {organization?.name || "My Organization"}
            </Typography>
          </Box>

          <IconButton
            onClick={toggleMode}
            sx={{ color: "#fff" }}
            aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>

          {/* Desktop: inline actions */}
          <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              component={RouterLink}
              to="/app/organizers"
              startIcon={<GroupsIcon fontSize="small" />}
              sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.12)", "&:hover": { bgcolor: "rgba(255,255,255,0.2)" } }}
            >
              Co-organizers
            </Button>
            <Button
              size="small"
              onClick={() => signOutUser()}
              startIcon={<LogoutIcon fontSize="small" />}
              sx={{ color: "#fff" }}
            >
              Sign out
            </Button>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "rgba(255,255,255,0.22)", fontSize: 14, fontWeight: 700 }}>
              {initials}
            </Avatar>
          </Box>

          {/* Mobile: collapse into a menu */}
          <Box sx={{ display: { xs: "flex", sm: "none" } }}>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Account menu">
              <Avatar sx={{ width: 32, height: 32, bgcolor: "rgba(255,255,255,0.22)", fontSize: 14, fontWeight: 700 }}>
                {initials}
              </Avatar>
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <MenuItem disabled sx={{ opacity: "1 !important" }}>
                <ListItemText primary={profile?.displayName || profile?.email} secondary={profile?.email} />
              </MenuItem>
              <Divider />
              <MenuItem component={RouterLink} to="/app/organizers" onClick={() => setMenuAnchor(null)}>
                <ListItemIcon>
                  <GroupsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Co-organizers" />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  signOutUser();
                }}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Sign out" />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 4 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}

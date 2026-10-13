import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GavelIcon from '@mui/icons-material/Gavel';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { useRequestNavigation } from '../context/NavigationGuardContext';
import { APP_NAME } from '../branding';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOrganizer } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const requestNavigation = useRequestNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The organizer dashboard (DashboardLayout) has its own branded, mobile-responsive top bar --
  // this marketing navbar would just duplicate it.
  if (location.pathname.startsWith('/app')) return null;

  // On a public event page, the brand mark should bring a visitor back to that event's own page,
  // not away to the unrelated marketing site -- that's what "home" means to someone who arrived
  // via an event link and has never seen the marketing site at all.
  const eventSlugMatch = location.pathname.match(/^\/e\/([^/]+)/);
  const logoDestination = eventSlugMatch ? `/e/${eventSlugMatch[1]}` : '/';

  // Every navigation this navbar triggers goes through the currently-mounted page's guard (if any)
  // first -- see NavigationGuardContext. Today that's only the live bidding screen, which asks for
  // confirmation before letting a rep get bounced off it mid-auction by an accidental logo tap.
  async function go(destination) {
    if (await requestNavigation()) navigate(destination);
  }

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: isOrganizer ? 'Dashboard' : 'Organizer Login', to: isOrganizer ? '/app/events' : '/login' },
  ];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ bgcolor: 'rgba(15,23,42,0.96)', backdropFilter: 'blur(8px)', color: '#fff' }}
    >
      <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', py: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ cursor: 'pointer', flexGrow: 1 }}
          onClick={() => go(logoDestination)}
        >
          <GavelIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {APP_NAME}
          </Typography>
        </Stack>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
          {navLinks.map((link) => (
            <Button
              key={link.to}
              onClick={() => go(link.to)}
              sx={{
                color: location.pathname === link.to ? 'primary.light' : 'grey.200',
                fontWeight: 600,
              }}
            >
              {link.label}
            </Button>
          ))}

          <IconButton
            onClick={toggleMode}
            sx={{ color: 'grey.200' }}
            aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>

          {!isOrganizer && (
            <Button variant="contained" onClick={() => go('/signup')}>
              Get started
            </Button>
          )}
        </Box>

        <IconButton
          onClick={toggleMode}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#fff' }}
          aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>

        <IconButton
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#fff' }}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 240 }} role="presentation" onClick={() => setDrawerOpen(false)}>
          <List>
            {navLinks.map((link) => (
              <ListItemButton key={link.to} onClick={() => go(link.to)}>
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
            {!isOrganizer && (
              <ListItemButton onClick={() => go('/signup')}>
                <ListItemText primary="Get started" />
              </ListItemButton>
            )}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}

export default Navbar;

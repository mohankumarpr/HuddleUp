import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Container, Divider, Grid, Link, Stack, Typography } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import BoltIcon from '@mui/icons-material/Bolt';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, APP_TAGLINE } from '../branding';
import Reveal from './common/Reveal';

const LINK_COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Home', to: '/' },
      { label: 'How it works', to: '/#how-it-works' },
      { label: 'Features', to: '/#features' },
    ],
  },
];

const Footer = () => {
  const { isOrganizer } = useAuth();
  const { pathname } = useLocation();
  // The sign-up banner is marketing -- keep it off the dashboard and the pages players/teams use.
  const showCta = !pathname.startsWith('/app') && !pathname.startsWith('/e/');
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        mt: 'auto',
        bgcolor: 'secondary.main',
        color: 'grey.300',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          backgroundImage:
            'radial-gradient(circle at 10% 0%, rgba(99,102,241,0.22), transparent 45%), radial-gradient(circle at 90% 100%, rgba(99,102,241,0.14), transparent 40%)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 6, md: 8 } }}>
        {showCta && (
        <Reveal>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={3}
            sx={{
              mb: 5,
              p: { xs: 3, md: 4 },
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                {isOrganizer ? 'Ready to run your next event?' : 'Ready to run your own auction?'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'grey.400' }}>
                {isOrganizer
                  ? 'Jump back into your dashboard and keep things moving.'
                  : 'Create your organization and go live in minutes -- free to start.'}
              </Typography>
            </Box>
            <Link
              component={RouterLink}
              to={isOrganizer ? '/app/events' : '/signup'}
              underline="none"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 3,
                py: 1.4,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: '#fff',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 10px 24px -8px rgba(99,102,241,0.5)',
                transition: 'transform 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <BoltIcon fontSize="small" />
              {isOrganizer ? 'Go to dashboard' : 'Get started free'}
            </Link>
          </Stack>
        </Reveal>
        )}

        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <GavelIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                {APP_NAME}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'grey.400', maxWidth: 320 }}>
              {APP_TAGLINE}
            </Typography>
          </Grid>

          {LINK_COLUMNS.map((col) => (
            <Grid item xs={6} md={2} key={col.title}>
              <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, mb: 1.5 }}>
                {col.title}
              </Typography>
              <Stack spacing={1}>
                {col.links.map((link) => (
                  <Link key={link.to} component={RouterLink} to={link.to} color="inherit" underline="hover" variant="body2">
                    {link.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}

          <Grid item xs={6} md={2}>
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, mb: 1.5 }}>
              Organizers
            </Typography>
            <Stack spacing={1}>
              <Link component={RouterLink} to="/login" color="inherit" underline="hover" variant="body2">
                Organizer login
              </Link>
              <Link component={RouterLink} to="/signup" color="inherit" underline="hover" variant="body2">
                Create an account
              </Link>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

        <Typography variant="body2" sx={{ color: 'grey.500' }}>
          © {currentYear} {APP_NAME}. Run a professional player auction for any sport.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;

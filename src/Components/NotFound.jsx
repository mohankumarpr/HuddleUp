import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import GavelIcon from '@mui/icons-material/Gavel';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        textAlign: 'center',
        px: 3,
        overflow: 'hidden',
        backgroundImage: 'linear-gradient(160deg, #0F172A 0%, #1E293B 55%, #241B4D 100%)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.2), transparent 40%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ position: 'relative' }}
      >
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <GavelIcon sx={{ fontSize: 48, color: 'primary.light', mb: 1 }} />
          <Typography variant="h1" sx={{ fontWeight: 800, fontSize: { xs: 80, md: 140 }, lineHeight: 1 }}>
            404
          </Typography>
        </motion.div>
        <Typography variant="h4" fontWeight={700} sx={{ mt: 2, mb: 1.5 }}>
          Sold out of pages
        </Typography>
        <Typography variant="body1" sx={{ color: 'grey.400', mb: 4, maxWidth: 420, mx: 'auto' }}>
          The page you're looking for doesn't exist, or the link may be out of date.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate('/')} sx={{ py: 1.4, px: 4 }}>
          Go back home
        </Button>
      </motion.div>
    </Box>
  );
};

export default NotFound;

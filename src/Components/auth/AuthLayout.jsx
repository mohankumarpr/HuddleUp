import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import GavelIcon from "@mui/icons-material/Gavel";
import BoltIcon from "@mui/icons-material/Bolt";
import GroupsIcon from "@mui/icons-material/Groups";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { APP_NAME } from "../../branding";

const HIGHLIGHTS = [
  { icon: <BoltIcon fontSize="small" />, text: "Live bidding that syncs in real time" },
  { icon: <GroupsIcon fontSize="small" />, text: "Any sport, any number of teams" },
  { icon: <AccountBalanceWalletIcon fontSize="small" />, text: "Purses that can never overspend" },
];

export default function AuthLayout({ children }) {
  return (
    <Box sx={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          width: "45%",
          minWidth: 420,
          position: "relative",
          p: 6,
          color: "#fff",
          backgroundImage:
            "linear-gradient(160deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.88) 55%, rgba(36,27,77,0.9) 100%), url(https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Stack
          component={RouterLink}
          to="/"
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ textDecoration: "none", color: "inherit" }}
        >
          <GavelIcon sx={{ color: "primary.light" }} />
          <Typography variant="h6" fontWeight={700}>
            {APP_NAME}
          </Typography>
        </Stack>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 3, maxWidth: 380 }}>
            Run your player auction like it's on TV.
          </Typography>
          <Stack spacing={2}>
            {HIGHLIGHTS.map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: "rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "primary.light",
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography variant="body1" sx={{ color: "grey.200" }}>
                    {item.text}
                  </Typography>
                </Stack>
              </motion.div>
            ))}
          </Stack>
        </motion.div>

        <Typography variant="caption" sx={{ color: "grey.500" }}>
          Free to start -- no credit card required.
        </Typography>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

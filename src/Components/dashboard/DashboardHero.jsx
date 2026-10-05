import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import GrainOverlay from "../common/GrainOverlay";

// The same verified sport photos used on the marketing site (src/Components/marketing/Home.jsx) --
// reused here so every dashboard page gets its own background image without introducing new,
// unvetted photo URLs (a prior round of this project shipped mismatched sport photos once;
// reusing already-checked ones avoids repeating that).
export const HERO_IMAGES = {
  cricket: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80",
  football: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=80",
  basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80",
  volleyball: "https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1600&q=80",
  tableTennis: "https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1600&q=80",
  badminton: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1600&q=80",
};

const ORDER = ["cricket", "football", "basketball", "volleyball", "tableTennis", "badminton"];

// Cycles deterministically through the image set by a string key (e.g. a page name or event id),
// so the same page always gets the same photo but different pages/events get visual variety.
export function heroImageFor(key = "") {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 997;
  return HERO_IMAGES[ORDER[hash % ORDER.length]];
}

// A colorful, photo-backed banner used at the top of every organizer dashboard page -- the
// post-login counterpart to the marketing site's hero/section imagery, so the app doesn't go
// flat-white the moment someone signs in.
export default function DashboardHero({ title, subtitle, image, icon, action, dense = false }) {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 4,
        mb: 3,
        minHeight: dense ? { xs: 96, sm: 112 } : { xs: 128, sm: 160 },
        display: "flex",
        alignItems: "center",
        color: "#fff",
        backgroundImage: `linear-gradient(120deg, rgba(67,56,202,0.88) 0%, rgba(99,102,241,0.8) 45%, rgba(236,72,153,0.55) 100%), url(${image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <GrainOverlay opacity={0.07} />
      <Box sx={{ position: "relative", width: "100%", px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3 } }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {icon && (
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    bgcolor: "rgba(255,255,255,0.18)",
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </Box>
              )}
              <Box>
                <Typography variant={dense ? "h6" : "h5"} fontWeight={800} sx={{ lineHeight: 1.2 }}>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.25 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Stack>
            {action && <Box sx={{ width: { xs: "100%", sm: "auto" } }}>{action}</Box>}
          </Stack>
        </motion.div>
      </Box>
    </Box>
  );
}

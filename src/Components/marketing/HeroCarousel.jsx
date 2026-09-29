import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Container, Grid, IconButton, Paper, Stack, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Button from "@mui/material/Button";
import { APP_TAGLINE } from "../../branding";
import GrainOverlay from "../common/GrainOverlay";

const STATS = [
  { value: "100%", label: "Free to start" },
  { value: "<1s", label: "Bid sync latency" },
  { value: "Any", label: "Sport or format" },
];

// Reuses the same verified Unsplash photos as the sports gallery further down the page, so the
// hero and gallery never disagree about what a given sport actually looks like.
const SLIDES = [
  {
    sport: "Cricket",
    emoji: "🏏",
    image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1600&q=80",
    player: { name: "Player #14", role: "All-rounder", price: "₹2,400", teams: ["Falcons", "Titans", "Warriors"] },
  },
  {
    sport: "Football",
    emoji: "⚽",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=80",
    player: { name: "Player #9", role: "Striker", price: "₹3,100", teams: ["Titans", "Strikers", "Falcons"] },
  },
  {
    sport: "Basketball",
    emoji: "🏀",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80",
    player: { name: "Player #23", role: "Point guard", price: "₹1,800", teams: ["Warriors", "Titans", "Falcons"] },
  },
  {
    sport: "Volleyball",
    emoji: "🏐",
    image: "https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1600&q=80",
    player: { name: "Player #5", role: "Spiker", price: "₹1,200", teams: ["Falcons", "Smashers", "Titans"] },
  },
  {
    sport: "Badminton",
    emoji: "🏸",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1600&q=80",
    player: { name: "Player #11", role: "Doubles", price: "₹1,450", teams: ["Warriors", "Falcons", "Titans"] },
  },
];

const AUTOPLAY_MS = 3200;

export default function HeroCarousel() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  function goTo(i) {
    setIndex((i + SLIDES.length) % SLIDES.length);
  }

  const slide = SLIDES[index];

  return (
    <Box
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{ position: "relative", overflow: "hidden", color: "#fff", minHeight: { xs: "auto", md: 640 } }}
    >
      {/* Crossfading background photo per slide */}
      <AnimatePresence mode="sync">
        <motion.div
          key={slide.image}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${slide.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </AnimatePresence>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(100deg, rgba(11,15,25,0.92) 0%, rgba(15,23,42,0.72) 32%, rgba(15,23,42,0.4) 58%, rgba(36,27,77,0.32) 100%), linear-gradient(0deg, rgba(11,15,25,0.55) 0%, transparent 40%)",
        }}
      />
      <GrainOverlay opacity={0.06} />

      <Container maxWidth="lg" sx={{ position: "relative", pt: { xs: 10, md: 14 }, pb: { xs: 8, md: 12 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={7}>
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.sport}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <Chip
                  label={`${slide.emoji} Perfect for ${slide.sport} auctions`}
                  sx={{ mb: 3, bgcolor: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 600 }}
                />
              </motion.div>
            </AnimatePresence>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <Typography variant="h1" sx={{ fontSize: { xs: 40, md: 62 }, lineHeight: 1.08, mb: 3 }}>
                Run your entire
                <br />
                <Box
                  component="span"
                  sx={{
                    backgroundImage: "linear-gradient(90deg, #818CF8, #C4B5FD)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  sports meet
                </Box>
              </Typography>
              <Typography variant="h6" sx={{ color: "grey.300", fontWeight: 400, mb: 4, maxWidth: 520 }}>
                {APP_TAGLINE} When it's time to bid, everyone joins live from their own device —
                no spreadsheets, no single laptop running the show.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 5 }}>
                <Button size="large" variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/signup")}>
                  Get started free
                </Button>
                <Button
                  size="large"
                  variant="outlined"
                  onClick={() => navigate("/login")}
                  sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", "&:hover": { borderColor: "#fff" } }}
                >
                  Organizer login
                </Button>
              </Stack>
              <Stack direction="row" spacing={4}>
                {STATS.map((stat) => (
                  <Box key={stat.label}>
                    <Typography variant="h5" fontWeight={800}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "grey.400" }}>
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box sx={{ position: "relative" }}>
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  transform: "translate(16px, 16px)",
                  borderRadius: 4,
                  bgcolor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.sport}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.97 }}
                  transition={{ duration: 0.4 }}
                  style={{ position: "relative" }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      bgcolor: "rgba(15,23,42,0.55)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#EF4444" }} />
                      </motion.div>
                      <Typography variant="overline" sx={{ color: "primary.light" }}>
                        On the block
                      </Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ color: "#fff", mb: 0.5 }}>
                      {slide.player.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "grey.400", mb: 2 }}>
                      {slide.sport} · {slide.player.role}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
                      <Typography variant="h3" sx={{ color: "#fff" }}>
                        {slide.player.price}
                      </Typography>
                      <Chip size="small" label={`Team ${slide.player.teams[0]} leading`} color="primary" />
                    </Stack>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {slide.player.teams.map((team) => (
                        <Chip key={team} label={team} variant="outlined" sx={{ color: "grey.300", borderColor: "rgba(255,255,255,0.2)" }} />
                      ))}
                    </Box>
                  </Paper>
                </motion.div>
              </AnimatePresence>
            </Box>
          </Grid>
        </Grid>

        {/* Carousel controls */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: { xs: 6, md: 8 } }}>
          <IconButton
            onClick={() => goTo(index - 1)}
            size="small"
            sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.08)", "&:hover": { bgcolor: "rgba(255,255,255,0.16)" } }}
            aria-label="Previous slide"
          >
            <ChevronLeftIcon />
          </IconButton>

          <Stack direction="row" spacing={1}>
            {SLIDES.map((s, i) => (
              <Box
                key={s.sport}
                onClick={() => goTo(i)}
                role="button"
                aria-label={`Show ${s.sport} slide`}
                sx={{
                  width: i === index ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: i === index ? "primary.light" : "rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  transition: "width 0.3s ease, background-color 0.3s ease",
                }}
              />
            ))}
          </Stack>

          <IconButton
            onClick={() => goTo(index + 1)}
            size="small"
            sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.08)", "&:hover": { bgcolor: "rgba(255,255,255,0.16)" } }}
            aria-label="Next slide"
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Container>
    </Box>
  );
}

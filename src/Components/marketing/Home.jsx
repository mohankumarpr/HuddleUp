import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Container, Grid, Paper, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import BoltIcon from "@mui/icons-material/Bolt";
import GroupsIcon from "@mui/icons-material/Groups";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LinkIcon from "@mui/icons-material/Link";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { APP_NAME } from "../../branding";
import Reveal from "../common/Reveal";
import GrainOverlay from "../common/GrainOverlay";
import HeroCarousel from "./HeroCarousel";

const STEPS = [
  { title: "Create your event", desc: "Set up sports, teams, schedule, and purses in minutes." },
  { title: "Open registration", desc: "Share one link — players sign up, teams get a join PIN, co-organizers pitch in." },
  { title: "Configure & track", desc: "Sports, schedules, rosters, and standings stay live and up to date for everyone." },
  { title: "Auction live, if you use one", desc: "Open the bidding room — team reps bid in real time from their own devices." },
];

const FEATURES = [
  {
    icon: <SportsScoreIcon />,
    title: "One platform for the whole event",
    desc: "Registration, teams, sports scheduling, standings, and a live auction — run every stage of your event from a single dashboard, with co-organizers alongside you.",
    big: true,
  },
  { icon: <LinkIcon />, title: "One-link registration", desc: "Replace paper forms and spreadsheets with a shareable page." },
  { icon: <GroupsIcon />, title: "Any sport, any format", desc: "Configure your own sports list and teams per event." },
  { icon: <EmojiEventsIcon />, title: "Live standings & schedule", desc: "Scores, match records, and schedules update instantly for players and spectators." },
  { icon: <BoltIcon />, title: "Live auction, when you need one", desc: "Purse-safe bidding that syncs instantly across every device — optional, and built in when your event needs it." },
];

const SPORTS_GALLERY = [
  { emoji: "🏏", label: "Cricket", image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80" },
  { emoji: "⚽", label: "Football", image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=800&q=80" },
  { emoji: "🏀", label: "Basketball", image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80" },
  { emoji: "🏐", label: "Volleyball", image: "https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=800&q=80" },
  { emoji: "🏓", label: "Table Tennis", image: "https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=800&q=80" },
  { emoji: "🏸", label: "Badminton", image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80" },
];

function FloatingOrb({ sx, duration = 10, delay = 0 }) {
  return (
    <motion.div
      style={{ position: "absolute", borderRadius: "50%", filter: "blur(60px)", ...sx }}
      animate={{ y: [0, -24, 0], x: [0, 16, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

function DarkSection({ children, sx }) {
  return (
    <Box sx={{ position: "relative", overflow: "hidden", backgroundImage: "linear-gradient(160deg, #0F172A 0%, #1E293B 55%, #241B4D 100%)", color: "#fff", ...sx }}>
      <GrainOverlay />
      <FloatingOrb sx={{ width: 320, height: 320, top: -80, left: "8%", background: "rgba(99,102,241,0.35)" }} duration={12} />
      <FloatingOrb sx={{ width: 260, height: 260, bottom: -60, right: "10%", background: "rgba(129,140,248,0.25)" }} duration={14} delay={1.5} />
      <Box sx={{ position: "relative" }}>{children}</Box>
    </Box>
  );
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero */}
      <HeroCarousel />

      {/* How it works -- connected timeline */}
      <Container id="how-it-works" maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: 80 }}>
        <Reveal>
          <Typography variant="overline" color="primary.main" fontWeight={700}>
            How it works
          </Typography>
          <Typography variant="h3" sx={{ mb: 7, maxWidth: 640 }}>
            From registration to results, in four steps
          </Typography>
        </Reveal>
        <Box sx={{ position: "relative" }}>
          <Box
            sx={{
              display: { xs: "none", md: "block" },
              position: "absolute",
              top: 22,
              left: "12.5%",
              right: "12.5%",
              height: 2,
              backgroundImage: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4) 15%, rgba(99,102,241,0.4) 85%, transparent)",
            }}
          />
          <Grid container spacing={3}>
            {STEPS.map((step, i) => (
              <Grid item xs={12} sm={6} md={3} key={step.title}>
                <Reveal delay={i * 0.08}>
                  <Stack alignItems="center" textAlign="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        boxShadow: "0 8px 20px -6px rgba(99,102,241,0.6)",
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Typography variant="h6">{step.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {step.desc}
                    </Typography>
                  </Stack>
                </Reveal>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* Features -- bento grid */}
      <Box id="features" sx={{ bgcolor: "background.paper", borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", scrollMarginTop: 80 }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Reveal>
            <Typography variant="overline" color="primary.main" fontWeight={700}>
              Why {APP_NAME}
            </Typography>
            <Typography variant="h3" sx={{ mb: 6, maxWidth: 640 }}>
              Everything your event needs, built in
            </Typography>
          </Reveal>
          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gridAutoRows: "1fr",
            }}
          >
            {FEATURES.map((feature, i) => (
              <Box
                key={feature.title}
                sx={{
                  gridColumn: feature.big ? { xs: "span 1", sm: "span 2", md: "span 2" } : "span 1",
                }}
              >
                <Reveal delay={i * 0.05} style={{ height: "100%" }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      height: "100%",
                      p: 3,
                      borderRadius: 3,
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: "primary.main",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 2,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant={feature.big ? "h5" : "subtitle1"} fontWeight={700} gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.desc}
                    </Typography>
                  </Paper>
                </Reveal>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Sports gallery */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Reveal>
          <Typography variant="overline" color="primary.main" fontWeight={700}>
            Built for any sport
          </Typography>
          <Typography variant="h3" sx={{ mb: 6, maxWidth: 640 }}>
            Cricket, football, or your own sport — you decide
          </Typography>
        </Reveal>
        <Grid container spacing={2}>
          {SPORTS_GALLERY.map((sport, i) => (
            <Grid item xs={6} sm={4} md={2} key={sport.label}>
              <Reveal delay={i * 0.05}>
                <Box
                  sx={{
                    position: "relative",
                    borderRadius: 3,
                    overflow: "hidden",
                    aspectRatio: "1 / 1.1",
                    backgroundImage: `url(${sport.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    display: "flex",
                    alignItems: "flex-end",
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover .overlay": { transform: "scale(1.06)" },
                  }}
                >
                  <Box
                    className="overlay"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(15,23,42,0.88), transparent 60%)",
                      transition: "transform 0.4s ease",
                    }}
                  />
                  <Typography sx={{ position: "relative", color: "#fff", p: 1.5, fontWeight: 600 }}>
                    {sport.emoji} {sport.label}
                  </Typography>
                </Box>
              </Reveal>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Final CTA */}
      <DarkSection sx={{ py: { xs: 8, md: 10 } }}>
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Reveal>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Ready to run your next event?
            </Typography>
            <Typography variant="body1" sx={{ color: "grey.300", mb: 4 }}>
              Create your organization and your first event in under five minutes.
            </Typography>
            <Button size="large" variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/signup")}>
              Get started free
            </Button>
          </Reveal>
        </Container>
      </DarkSection>
    </Box>
  );
}

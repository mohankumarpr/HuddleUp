import { createTheme } from "@mui/material/styles";

const SHARED = {
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Manrope", sans-serif', fontWeight: 800, letterSpacing: -0.5 },
    h2: { fontFamily: '"Manrope", sans-serif', fontWeight: 800, letterSpacing: -0.5 },
    h3: { fontFamily: '"Manrope", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Manrope", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Manrope", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Manrope", sans-serif', fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
};

const PALETTES = {
  light: {
    mode: "light",
    primary: { main: "#6366F1", dark: "#4338CA", light: "#818CF8", contrastText: "#fff" },
    secondary: { main: "#0F172A", light: "#1E293B", contrastText: "#fff" },
    background: { default: "#F8FAFC", paper: "#FFFFFF", subtle: "#F1F5F9" },
    success: { main: "#10B981" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    text: { primary: "#0F172A", secondary: "#475569" },
    divider: "rgba(15, 23, 42, 0.08)",
  },
  dark: {
    mode: "dark",
    primary: { main: "#818CF8", dark: "#6366F1", light: "#A5B4FC", contrastText: "#0B0F19" },
    secondary: { main: "#1E293B", light: "#334155", contrastText: "#fff" },
    background: { default: "#0B0F19", paper: "#131826", subtle: "#1B2333" },
    success: { main: "#34D399" },
    warning: { main: "#FBBF24" },
    error: { main: "#F87171" },
    text: { primary: "#F1F5F9", secondary: "#94A3B8" },
    divider: "rgba(255, 255, 255, 0.09)",
  },
};

export function getTheme(mode = "light") {
  const palette = PALETTES[mode] || PALETTES.light;
  const glow = mode === "dark" ? "rgba(129,140,248,0.45)" : "rgba(99,102,241,0.5)";
  const glowHover = mode === "dark" ? "rgba(129,140,248,0.55)" : "rgba(99,102,241,0.6)";

  return createTheme({
    palette,
    ...SHARED,
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, paddingInline: 22, paddingBlock: 10 },
          containedPrimary: {
            boxShadow: `0 10px 24px -8px ${glow}`,
            "&:hover": { boxShadow: `0 12px 28px -6px ${glowHover}` },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: { root: { boxShadow: "none" } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
    },
  });
}

// Default export kept for any lingering static imports -- prefer getTheme(mode) for new code.
export default getTheme("light");

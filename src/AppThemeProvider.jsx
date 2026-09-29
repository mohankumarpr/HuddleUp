import React, { useMemo } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ThemeModeProvider, useThemeMode } from "./context/ThemeModeContext";
import { getTheme } from "./theme";

function MuiThemeBridge({ children }) {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function AppThemeProvider({ children }) {
  return (
    <ThemeModeProvider>
      <MuiThemeBridge>{children}</MuiThemeBridge>
    </ThemeModeProvider>
  );
}

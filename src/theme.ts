"use client";

import { createTheme } from "@mui/material/styles";

// Palette ispirata a Material Design 3 (seed: rosa lampone)
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#8C4A60", contrastText: "#FFFFFF" },
        secondary: { main: "#75565E", contrastText: "#FFFFFF" },
        background: { default: "#FFF8F8", paper: "#FFFFFF" },
        text: { primary: "#22191C", secondary: "#524346" },
        divider: "#D6C2C5",
      },
    },
    dark: {
      palette: {
        primary: { main: "#FFB0C8", contrastText: "#541D32" },
        secondary: { main: "#E3BDC6", contrastText: "#422930" },
        background: { default: "#191113", paper: "#22191C" },
        text: { primary: "#EFDFE1", secondary: "#D6C2C5" },
        divider: "#524346",
      },
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: "var(--font-roboto), Roboto, system-ui, sans-serif",
    h1: { fontSize: "2rem", fontWeight: 500, letterSpacing: 0 },
    h2: { fontSize: "1.5rem", fontWeight: 500 },
    h3: { fontSize: "1.125rem", fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 500, letterSpacing: 0.1 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 24, minHeight: 40 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, height: "auto", minHeight: 36, paddingBlock: 4 }, label: { whiteSpace: "normal" } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 24 } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 24 } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: "none", paddingInline: 16 } },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 28 } } },
  },
});

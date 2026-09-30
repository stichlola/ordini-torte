"use client";

import { createTheme } from "@mui/material/styles";

// Stile ripreso da artigianafiume.com: crema, marrone scuro, oro; Playfair Display + Jost
const CREAM = "#F9F6F0";
const SAND = "#F0EBE1";
const BROWN = "#2B221C";
const GOLD = "#C2A06A";
const MUTED = "#6E6358";
const display = "var(--font-display), Georgia, serif";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: BROWN, contrastText: CREAM },
    secondary: { main: GOLD, dark: "#8C6D3B", contrastText: BROWN },
    background: { default: CREAM, paper: "#FFFFFF" },
    text: { primary: BROWN, secondary: MUTED },
    divider: "#E2DACB",
    action: { hover: SAND },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: "var(--font-body), system-ui, sans-serif",
    h1: { fontFamily: display, fontSize: "2rem", fontWeight: 400 },
    h2: { fontFamily: display, fontSize: "1.6rem", fontWeight: 400, fontVariantNumeric: "lining-nums" },
    h3: { fontFamily: display, fontSize: "1.25rem", fontWeight: 400 },
    subtitle2: { textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "0.72rem", fontWeight: 500 },
    button: { textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.18em", fontSize: "0.8rem" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 28, minHeight: 44 } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, height: "auto", minHeight: 38, paddingBlock: 4, paddingInline: 4, fontSize: "0.9rem" },
        label: { whiteSpace: "normal" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 24 } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 24 } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: "none", letterSpacing: 0, fontSize: "0.9rem", paddingInline: 18 } },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 28 } } },
    MuiDialogTitle: { styleOverrides: { root: { fontFamily: display, fontWeight: 400, fontSize: "1.4rem" } } },
  },
});

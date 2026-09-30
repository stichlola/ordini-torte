import type { Metadata, Viewport } from "next";
import { Jost, Playfair_Display, Dancing_Script } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "@/theme";

const body = Jost({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const display = Playfair_Display({
  weight: ["400", "500", "600", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const script = Dancing_Script({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: "Ordina la tua torta",
  description: "Componi la tua torta personalizzata e prenota il ritiro in pasticceria.",
};

export const viewport: Viewport = {
  themeColor: "#F9F6F0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${body.variable} ${display.variable} ${script.variable}`}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Roboto, Dancing_Script } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { theme } from "@/theme";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8F8" },
    { media: "(prefers-color-scheme: dark)", color: "#191113" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${roboto.variable} ${script.variable}`} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="class" />
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

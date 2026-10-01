import { Box, Typography } from "@mui/material";
import Logo from "./Logo";

export default function CatalogUnavailable() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 3, textAlign: "center" }}>
      <Box sx={{ maxWidth: 420 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Logo variant="full" size={160} />
        </Box>
        <Typography variant="h2" sx={{ mb: 1 }}>
          Ordini online non disponibili
        </Typography>
        <Typography color="text.secondary">
          Non riusciamo a caricare il catalogo in questo momento. Riprova tra qualche minuto oppure contatta la pasticceria.
        </Typography>
      </Box>
    </Box>
  );
}

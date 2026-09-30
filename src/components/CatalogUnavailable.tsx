import { Box, Typography } from "@mui/material";
import CloudOffIcon from "@mui/icons-material/CloudOff";

export default function CatalogUnavailable() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 3, textAlign: "center" }}>
      <Box sx={{ maxWidth: 420 }}>
        <CloudOffIcon color="disabled" sx={{ fontSize: 64, mb: 2 }} />
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

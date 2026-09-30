"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { Catalog } from "@/lib/catalog";
import { describeConfig, formatEuro, minPickupDate, type CakeConfig, type Customer } from "@/lib/order";

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  catalog: Catalog;
  config: CakeConfig;
  total: number;
  image: Blob | null;
  fullScreen: boolean;
}

export default function CheckoutDialog({ open, onClose, onDone, catalog, config, total, image, fullScreen }: Props) {
  const minDate = useMemo(() => minPickupDate(catalog.rules.minLeadDays), [catalog.rules.minLeadDays]);
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    phone: "",
    email: "",
    pickupDate: "",
    pickupSlot: catalog.rules.pickupSlots[0],
  });
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; total: number } | null>(null);

  const errors = {
    name: customer.name.trim().length < 2 ? "Inserisci nome e cognome" : null,
    phone: !/^\+?[0-9 ]{6,16}$/.test(customer.phone.trim()) ? "Numero non valido" : null,
    email: customer.email && !/^\S+@\S+\.\S+$/.test(customer.email) ? "Email non valida" : null,
    pickupDate: !customer.pickupDate || customer.pickupDate < minDate ? `Scegli una data dal ${formatDate(minDate)}` : null,
  };
  const valid = Object.values(errors).every((e) => !e);
  const set = (patch: Partial<Customer>) => setCustomer((c) => ({ ...c, ...patch }));

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    setSending(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("config", JSON.stringify(config));
      body.set("customer", JSON.stringify(customer));
      if (config.topper.type === "image" && image) body.set("image", image, "cialda.jpg");
      const res = await fetch("/api/orders", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore nell'invio dell'ordine");
      setResult({ code: data.code, total: data.total });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto");
    } finally {
      setSending(false);
    }
  };

  const close = () => {
    if (sending) return;
    if (result) {
      onDone();
      setResult(null);
      setTouched(false);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 7 }}>
        {result ? "Ordine inviato" : "Dati per il ritiro"}
        <IconButton aria-label="Chiudi" onClick={close} sx={{ position: "absolute", right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {result ? (
        <>
          <DialogContent>
            <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center", py: 3 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
              <Typography variant="h2">Grazie {customer.name.split(" ")[0]}!</Typography>
              <Typography color="text.secondary">
                Abbiamo ricevuto la tua richiesta. Ti contatteremo per confermare l&apos;ordine.
              </Typography>
              <Chip label={`Codice ordine: ${result.code}`} color="primary" sx={{ fontSize: 16, px: 1 }} />
              <Typography>
                Ritiro il <b>{formatDate(customer.pickupDate)}</b>, fascia <b>{customer.pickupSlot}</b> · Totale stimato{" "}
                <b>{formatEuro(result.total)}</b>
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button variant="contained" onClick={close}>
              Nuovo ordine
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <Box sx={{ bgcolor: "action.hover", borderRadius: "16px", p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Riepilogo torta
                </Typography>
                {describeConfig(catalog, config).map((r) => (
                  <Typography key={r} variant="body2" color="text.secondary">
                    {r}
                  </Typography>
                ))}
                {config.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: "italic" }}>
                    Note: {config.notes}
                  </Typography>
                )}
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography variant="subtitle1">Totale stimato</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "secondary.dark" }}>
                    {formatEuro(total)}
                  </Typography>
                </Stack>
              </Box>

              <TextField
                label="Nome e cognome"
                required
                autoComplete="name"
                value={customer.name}
                onChange={(e) => set({ name: e.target.value })}
                error={touched && !!errors.name}
                helperText={touched && errors.name}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Telefono"
                  required
                  type="tel"
                  autoComplete="tel"
                  value={customer.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  error={touched && !!errors.phone}
                  helperText={touched && errors.phone}
                />
                <TextField
                  label="Email (facoltativa)"
                  type="email"
                  autoComplete="email"
                  value={customer.email}
                  onChange={(e) => set({ email: e.target.value })}
                  error={touched && !!errors.email}
                  helperText={touched && errors.email}
                />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Data di ritiro"
                  required
                  type="date"
                  value={customer.pickupDate}
                  onChange={(e) => set({ pickupDate: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDate } }}
                  error={touched && !!errors.pickupDate}
                  helperText={touched && errors.pickupDate ? errors.pickupDate : `Preavviso minimo ${catalog.rules.minLeadDays} giorni`}
                />
                <TextField select label="Fascia oraria" value={customer.pickupSlot} onChange={(e) => set({ pickupSlot: e.target.value })}>
                  {catalog.rules.pickupSlots.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              {error && <Alert severity="error">{error}</Alert>}
              <Typography variant="caption" color="text.secondary">
                Il prezzo è una stima: l&apos;ordine sarà confermato dalla pasticceria, che potrà contattarti per eventuali richieste nelle note.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={close} disabled={sending}>
              Indietro
            </Button>
            <Button variant="contained" onClick={submit} disabled={sending} startIcon={sending ? <CircularProgress size={18} color="inherit" /> : null}>
              Invia ordine
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long" });
}

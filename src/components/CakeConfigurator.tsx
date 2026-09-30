"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import RectangleOutlinedIcon from "@mui/icons-material/RectangleOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import type { Catalog, ShapeId } from "@/lib/catalog";
import { computePrice, defaultConfig, formatEuro, missingChoices, normalizeConfig, type CakeConfig } from "@/lib/order";
import CakePreview from "./CakePreview";
import CheckoutDialog from "./CheckoutDialog";

const SHAPE_ICONS: Record<ShapeId, ReactNode> = {
  rotonda: <CircleOutlinedIcon fontSize="small" />,
  quadrata: <CropSquareIcon fontSize="small" />,
  rettangolare: <RectangleOutlinedIcon fontSize="small" />,
  cuore: <FavoriteBorderIcon fontSize="small" />,
};

const MAX_IMAGE_SIDE = 1600;

/** Ridimensiona la foto lato client: upload più leggero e sotto i limiti di Vercel */
async function downscaleImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversione immagine fallita"))), "image/jpeg", 0.88),
  );
}

export default function CakeConfigurator({ catalog }: { catalog: Catalog }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [config, setConfig] = useState<CakeConfig>(() => defaultConfig(catalog));
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => () => void (image && URL.revokeObjectURL(image.url)), [image]);

  const update = (patch: Partial<CakeConfig>) => setConfig((c) => normalizeConfig(catalog, { ...c, ...patch }));
  const price = useMemo(() => computePrice(catalog, config), [catalog, config]);

  /** Differenza di prezzo se si scegliesse un'altra opzione */
  const delta = (patch: Partial<CakeConfig>) =>
    computePrice(catalog, normalizeConfig(catalog, { ...config, ...patch })).total - price.total;

  const deltaLabel = (d: number) => (Math.abs(d) < 0.005 ? "incluso" : `${d > 0 ? "+" : "−"}${formatEuro(Math.abs(d))}`);

  const maxTiers = catalog.shapes.find((s) => s.id === config.shape)?.maxTiers ?? Infinity;
  const sizeFactor = catalog.sizes.find((s) => s.id === config.size)?.factor ?? 1;
  const covering = catalog.coverings.find((c) => c.id === config.covering);
  const missing = missingChoices(config);
  const garnishFull = config.garnishes.length >= catalog.rules.maxGarnishes;
  const needsImage = config.topper.type === "image" && !image;

  const onPickImage = async (file: File | undefined) => {
    setImageError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setImageError("Seleziona un file immagine (JPG, PNG, WEBP).");
    if (file.size > 15 * 1024 * 1024) return setImageError("Immagine troppo grande (max 15 MB).");
    try {
      const blob = await downscaleImage(file);
      setImage({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setImageError("Impossibile leggere l'immagine, prova con un altro file.");
    }
  };

  const preview = (
    <Box
      sx={{
        position: "relative",
        bgcolor: "action.hover",
        borderRadius: "24px",
        overflow: "hidden",
        "& svg": { height: { xs: "min(30dvh, 75vw)", md: "auto" }, width: { xs: "100%", md: "100%" }, mx: "auto" },
      }}
    >
      <CakePreview catalog={catalog} config={config} imageUrl={image?.url} />
      <Typography
        variant="caption"
        sx={{ position: "absolute", top: 12, left: 12, bgcolor: "background.paper", borderRadius: "8px", px: 1.25, py: 0.5 }}
      >
        Anteprima indicativa
      </Typography>
    </Box>
  );

  const priceDetails = (
    <Stack spacing={0.75}>
      {price.lines.map((l) => (
        <Stack key={l.label} direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary">
            {l.label}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
            {formatEuro(l.amount)}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );

  const sections = (
    <Stack spacing={2}>
      <Section title="Forma e dimensione" step={1}>
        <ChipGroup>
          {catalog.shapes.map((s) => (
            <ChoiceChip
              key={s.id}
              icon={SHAPE_ICONS[s.id]}
              label={s.label}
              selected={config.shape === s.id}
              onClick={() => update({ shape: s.id })}
              hint={s.maxTiers === 1 ? "solo 1 piano" : undefined}
            />
          ))}
        </ChipGroup>
        <SubTitle>Dimensione</SubTitle>
        <ChipGroup>
          {catalog.sizes.map((s) => (
            <ChoiceChip
              key={s.id}
              label={`${s.label} · Ø${s.diameterCm} cm`}
              hint={s.servings}
              price={config.size === s.id ? undefined : deltaLabel(delta({ size: s.id }))}
              selected={config.size === s.id}
              onClick={() => update({ size: s.id })}
            />
          ))}
        </ChipGroup>
        <SubTitle>Piani</SubTitle>
        <ChipGroup>
          {catalog.tiers.map((t) => (
            <ChoiceChip
              key={t.id}
              label={t.label}
              hint={t.extraServings || undefined}
              price={config.tiers === t.id || t.tiers > maxTiers ? undefined : deltaLabel(delta({ tiers: t.id }))}
              selected={config.tiers === t.id}
              disabled={t.tiers > maxTiers}
              onClick={() => update({ tiers: t.id })}
            />
          ))}
        </ChipGroup>
      </Section>

      <Section title="Impasto e farcitura" step={2}>
        <SubTitle first>Impasto</SubTitle>
        <ChipGroup>
          {catalog.sponges.map((s) => (
            <ChoiceChip
              key={s.id}
              swatch={s.color}
              label={s.label}
              price={config.sponge === s.id ? undefined : deltaLabel(delta({ sponge: s.id }))}
              selected={config.sponge === s.id}
              onClick={() => update({ sponge: s.id })}
            />
          ))}
        </ChipGroup>
        <SubTitle>Farcitura</SubTitle>
        <ChipGroup>
          {catalog.fillings.map((f) => (
            <ChoiceChip
              key={f.id}
              swatch={f.color}
              label={f.label}
              price={config.filling === f.id ? undefined : deltaLabel(delta({ filling: f.id }))}
              selected={config.filling === f.id}
              onClick={() => update({ filling: f.id })}
            />
          ))}
        </ChipGroup>
      </Section>

      <Section title="Copertura" step={3}>
        <ChipGroup>
          {catalog.coverings.map((c) => (
            <ChoiceChip
              key={c.id}
              label={c.label}
              price={config.covering === c.id ? undefined : deltaLabel(delta({ covering: c.id }))}
              selected={config.covering === c.id}
              onClick={() => update({ covering: c.id })}
            />
          ))}
        </ChipGroup>
        {covering && covering.colors.length > 0 && (
          <>
            <SubTitle>Colore</SubTitle>
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ flexWrap: "wrap" }}>
              {covering.colors.map((id) => {
                const col = catalog.colors.find((c) => c.id === id)!;
                return (
                  <Swatch
                    key={id}
                    hex={col.hex}
                    label={col.label}
                    selected={config.coveringColor === id}
                    onClick={() => update({ coveringColor: id })}
                  />
                );
              })}
            </Stack>
          </>
        )}
      </Section>

      <Section
        title="Guarnizioni"
        step={4}
        subtitle={`Scegline fino a ${catalog.rules.maxGarnishes} (${config.garnishes.length}/${catalog.rules.maxGarnishes})`}
      >
        <ChipGroup>
          {catalog.garnishes.map((g) => {
            const selected = config.garnishes.includes(g.id);
            return (
              <ChoiceChip
                key={g.id}
                filter
                label={g.label}
                price={selected ? undefined : `+${formatEuro(g.price * sizeFactor)}`}
                selected={selected}
                disabled={!selected && garnishFull}
                onClick={() =>
                  update({
                    garnishes: selected ? config.garnishes.filter((x) => x !== g.id) : [...config.garnishes, g.id],
                  })
                }
              />
            );
          })}
        </ChipGroup>
      </Section>

      <Section title="Decorazione sopra" step={5}>
        <ToggleButtonGroup
          exclusive
          color="primary"
          value={config.topper.type}
          onChange={(_, v) => v && update({ topper: { ...config.topper, type: v } })}
          sx={{ flexWrap: "wrap", "& .MuiToggleButton-root": { borderRadius: "999px !important", border: 1, borderColor: "divider", m: 0.5 } }}
        >
          <ToggleButton value="none">Nessuna</ToggleButton>
          <ToggleButton value="image">Foto stampata</ToggleButton>
          <ToggleButton value="model">Modellino 3D</ToggleButton>
          <ToggleButton value="number">Numero 3D</ToggleButton>
        </ToggleButtonGroup>

        <Collapse in={config.topper.type === "image"} unmountOnExit>
          <Box sx={{ mt: 2 }}>
            <SubTitle first>Formato cialda</SubTitle>
            <ChipGroup>
              {catalog.toppers.printedImage.shapes.map((s) => (
                <ChoiceChip
                  key={s.id}
                  label={s.label}
                  selected={config.topper.imageShape === s.id}
                  onClick={() => update({ topper: { ...config.topper, imageShape: s.id } })}
                />
              ))}
            </ChipGroup>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 2 }}>
              <Button component="label" variant={image ? "outlined" : "contained"} startIcon={<PhotoCameraOutlinedIcon />}>
                {image ? "Cambia foto" : "Carica foto"}
                <input hidden type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
              </Button>
              {image && (
                <>
                  <Box component="img" src={image.url} alt="Foto caricata" sx={{ width: 48, height: 48, objectFit: "cover", borderRadius: "12px" }} />
                  <Tooltip title="Rimuovi foto">
                    <IconButton onClick={() => setImage(null)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
            <Typography variant="caption" color={imageError ? "error" : "text.secondary"} sx={{ display: "block", mt: 1 }}>
              {imageError ?? "JPG, PNG o WEBP. Usa foto nitide: la stampa alimentare riduce leggermente i contrasti."}
            </Typography>
          </Box>
        </Collapse>

        <Collapse in={config.topper.type === "model"} unmountOnExit>
          <Box sx={{ mt: 2 }}>
            <ChipGroup>
              {catalog.toppers.models.map((m) => (
                <ChoiceChip
                  key={m.id}
                  icon={<span style={{ fontSize: 18, lineHeight: 1 }}>{m.emoji}</span>}
                  label={m.label}
                  price={config.topper.model === m.id ? undefined : deltaLabel(delta({ topper: { ...config.topper, model: m.id } }))}
                  selected={config.topper.model === m.id}
                  onClick={() => update({ topper: { ...config.topper, model: m.id } })}
                />
              ))}
            </ChipGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Modellini in pasta di zucchero realizzati a mano. Per colori o dettagli particolari usa le note.
            </Typography>
          </Box>
        </Collapse>

        <Collapse in={config.topper.type === "number"} unmountOnExit>
          <Box sx={{ mt: 2, maxWidth: 220 }}>
            <TextField
              label="Numero"
              value={config.topper.number}
              onChange={(e) => update({ topper: { ...config.topper, number: e.target.value } })}
              slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 2 } }}
              helperText={`${formatEuro(catalog.toppers.number.price)} per cifra`}
            />
          </Box>
        </Collapse>
      </Section>

      <Section title="Scritta" step={6} subtitle={`Facoltativa · ${formatEuro(catalog.lettering.price)}`}>
        <TextField
          label="Testo della scritta"
          placeholder="Buon compleanno Giulia"
          value={config.lettering.text}
          onChange={(e) => update({ lettering: { ...config.lettering, text: e.target.value } })}
          slotProps={{ htmlInput: { maxLength: catalog.lettering.maxChars } }}
          helperText={`${config.lettering.text.length}/${catalog.lettering.maxChars}`}
        />
        <Collapse in={config.lettering.text.trim().length > 0}>
          <SubTitle>Colore scritta</SubTitle>
          <Stack direction="row" spacing={1.5}>
            {catalog.lettering.colors.map((id) => {
              const col = catalog.colors.find((c) => c.id === id)!;
              return (
                <Swatch
                  key={id}
                  hex={col.hex}
                  label={col.label}
                  selected={config.lettering.color === id}
                  onClick={() => update({ lettering: { ...config.lettering, color: id } })}
                />
              );
            })}
          </Stack>
        </Collapse>
      </Section>

      <Section title="Note per il laboratorio" step={7}>
        <TextField
          multiline
          minRows={3}
          label="Note (facoltative)"
          placeholder="Allergie, richieste sui colori del modellino, dettagli sulla foto…"
          value={config.notes}
          onChange={(e) => update({ notes: e.target.value })}
          slotProps={{ htmlInput: { maxLength: catalog.rules.maxNotesChars } }}
          helperText={`Richieste fuori catalogo verranno valutate e confermate dalla pasticceria · ${config.notes.length}/${catalog.rules.maxNotesChars}`}
        />
      </Section>
    </Stack>
  );

  const blocked = missing.length > 0 || needsImage;
  const blockedHint = missing.length
    ? `Da scegliere: ${missing.join(", ")}`
    : needsImage
      ? "Carica la foto da stampare"
      : null;
  const priceTitle = missing.length ? "Prezzo parziale" : "Prezzo stimato";

  const cta = (fullWidth: boolean) => (
    <Button variant="contained" size="large" disabled={blocked} onClick={() => setCheckoutOpen(true)} fullWidth={fullWidth}>
      Continua
    </Button>
  );

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", pb: { xs: 14, md: 6 } }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: "background.default", borderBottom: 1, borderColor: "divider" }}>
        <Toolbar>
          <Image src="/logo.png" alt="Artigiana Fiume" width={44} height={44} priority style={{ marginRight: 12 }} />
          <Typography variant="h3" component="h1" sx={{ flexGrow: 1 }}>
            Componi la tua torta
          </Typography>
          <Tooltip title="Ricomincia">
            <IconButton
              onClick={() => {
                setConfig(defaultConfig(catalog));
                setImage(null);
              }}
            >
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ pt: { xs: 0, md: 4 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 6fr) minmax(0, 5fr)" }, gap: { xs: 2, md: 4 }, alignItems: "start" }}>
          <Box
            sx={{
              order: { xs: 0, md: 1 },
              position: "sticky",
              top: { xs: 56, sm: 64, md: 88 },
              zIndex: 2,
              bgcolor: { xs: "background.default", md: "transparent" },
              mx: { xs: -2, sm: -3, md: 0 },
              px: { xs: 2, sm: 3, md: 0 },
              py: { xs: 1.5, md: 0 },
            }}
          >
            <Card variant="outlined" sx={{ border: { xs: 0, md: 1 }, borderColor: "divider", bgcolor: { xs: "transparent", md: "background.paper" } }}>
              <CardContent sx={{ p: { xs: 0, md: 3 }, "&:last-child": { pb: { xs: 0, md: 3 } } }}>
                {preview}
                <Box sx={{ display: { xs: "none", md: "block" } }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mt: 3, mb: 1.5 }}>
                    <Typography variant="h3">{priceTitle}</Typography>
                    <Typography variant="h2" sx={{ fontWeight: 500, color: "secondary.dark" }}>
                      {formatEuro(price.total)}
                    </Typography>
                  </Stack>
                  {priceDetails}
                  <Divider sx={{ my: 2 }} />
                  {cta(true)}
                  {blockedHint && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 1 }}>
                      {blockedHint}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ order: { xs: 1, md: 0 } }}>{sections}</Box>
        </Box>
      </Container>

      <Paper
          elevation={8}
          sx={{
            display: { md: "none" },
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: "24px 24px 0 0",
            px: 2,
            pt: 1.5,
            pb: "calc(12px + env(safe-area-inset-bottom))",
            zIndex: (t) => t.zIndex.appBar,
          }}
        >
          <Collapse in={detailsOpen}>
            <Box sx={{ pb: 1.5, maxHeight: "40dvh", overflow: "auto" }}>{priceDetails}</Box>
            <Divider sx={{ mb: 1.5 }} />
          </Collapse>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box sx={{ flexGrow: 1, cursor: "pointer" }} onClick={() => setDetailsOpen((o) => !o)}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center" }}>
                {priceTitle} {detailsOpen ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 500, lineHeight: 1.1, color: "secondary.dark" }}>
                {formatEuro(price.total)}
              </Typography>
            </Box>
            {cta(false)}
          </Stack>
          {blockedHint && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {blockedHint}
            </Typography>
          )}
        </Paper>

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        catalog={catalog}
        config={config}
        total={price.total}
        image={image?.blob ?? null}
        fullScreen={!isDesktop}
        onDone={() => {
          setConfig(defaultConfig(catalog));
          setImage(null);
        }}
      />
    </Box>
  );
}

// ---------- componenti di supporto ----------

function Section({ title, subtitle, step, children }: { title: string; subtitle?: string; step: number; children: ReactNode }) {
  return (
    <Card variant="outlined" component="section">
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {step}
          </Box>
          <Box>
            <Typography variant="h3" component="h2">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function SubTitle({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: first ? 0 : 2.5, mb: 1 }}>
      {children}
    </Typography>
  );
}

function ChipGroup({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
      {children}
    </Stack>
  );
}

function ChoiceChip(props: {
  label: string;
  hint?: string;
  price?: string;
  selected: boolean;
  disabled?: boolean;
  filter?: boolean;
  icon?: ReactNode;
  swatch?: string;
  onClick: () => void;
}) {
  const { label, hint, price, selected, disabled, filter, icon, swatch, onClick } = props;
  const lead = selected && filter ? (
    <CheckIcon fontSize="small" />
  ) : swatch ? (
    <Box component="span" sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: swatch, border: 1, borderColor: "divider", ml: "6px !important" }} />
  ) : (
    icon
  );
  return (
    <Chip
      clickable
      disabled={disabled}
      onClick={onClick}
      icon={lead as React.ReactElement | undefined}
      variant={selected ? "filled" : "outlined"}
      color={selected ? "primary" : "default"}
      aria-pressed={selected}
      label={
        <Box component="span" sx={{ display: "flex", flexDirection: "column", py: 0.25 }}>
          <span>{label}</span>
          {(hint || price) && (
            <Box component="span" sx={{ fontSize: 12, opacity: 0.75 }}>
              {[hint, price].filter(Boolean).join(" · ")}
            </Box>
          )}
        </Box>
      }
    />
  );
}

function Swatch({ hex, label, selected, onClick }: { hex: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <Tooltip title={label}>
      <Box
        component="button"
        type="button"
        aria-label={label}
        aria-pressed={selected}
        onClick={onClick}
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          bgcolor: hex,
          cursor: "pointer",
          border: 2,
          borderColor: selected ? "primary.main" : "divider",
          outline: selected ? "3px solid" : "none",
          outlineColor: "primary.main",
          outlineOffset: 2,
          display: "grid",
          placeItems: "center",
          p: 0,
          transition: "outline-offset .15s",
        }}
      >
        {selected && <CheckIcon sx={{ fontSize: 18, color: parseInt(hex.slice(1), 16) < 0x777777 ? "#fff" : "#000" }} />}
      </Box>
    </Tooltip>
  );
}

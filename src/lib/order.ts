import type { Catalog, ShapeId } from "./catalog";

export type TopperType = "none" | "image" | "model" | "number";

export interface CakeConfig {
  // null = il cliente non ha ancora scelto
  shape: ShapeId | null;
  size: string | null;
  tiers: string | null;
  sponge: string | null;
  filling: string | null;
  covering: string | null;
  coveringColor: string | null;
  garnishes: string[];
  topper: {
    type: TopperType;
    imageShape: "tonda" | "rettangolare";
    model: string;
    number: string;
  };
  lettering: { text: string; color: string };
  notes: string;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
  pickupDate: string; // YYYY-MM-DD
  pickupSlot: string;
}

export interface PriceLine {
  label: string;
  amount: number;
}

/** Configurazione iniziale: nessuna scelta preimpostata. */
export function defaultConfig(c: Catalog): CakeConfig {
  return {
    shape: null,
    size: null,
    tiers: null,
    sponge: null,
    filling: null,
    covering: null,
    coveringColor: null,
    garnishes: [],
    topper: { type: "none", imageShape: "tonda", model: c.toppers.models[0].id, number: "18" },
    lettering: { text: "", color: c.lettering.colors[0] },
    notes: "",
  };
}

/** Scelte obbligatorie ancora mancanti (etichette per l'utente). Vuoto = ordine completo. */
export function missingChoices(cfg: CakeConfig): string[] {
  const out: string[] = [];
  if (!cfg.shape) out.push("forma");
  if (!cfg.size) out.push("dimensione");
  if (!cfg.tiers) out.push("piani");
  if (!cfg.sponge) out.push("impasto");
  if (!cfg.filling) out.push("farcitura");
  if (!cfg.covering) out.push("copertura");
  return out;
}

const find = <T extends { id: string }>(list: T[], id: string | null | undefined) => list.find((x) => x.id === id);
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Normalizza una configurazione: rimuove valori non ammessi e riporta tutto nei "binari"
 * del catalogo. Usato sia dal client (quando cambia un'opzione) sia dal server (validazione).
 */
export function normalizeConfig(c: Catalog, input: CakeConfig): CakeConfig {
  const d = defaultConfig(c);
  const shape = find(c.shapes, input.shape);
  const size = find(c.sizes, input.size);
  let tier = find(c.tiers, input.tiers);
  if (tier && shape && tier.tiers > shape.maxTiers) tier = [...c.tiers].reverse().find((t) => t.tiers <= shape.maxTiers);
  const covering = find(c.coverings, input.covering);
  const coveringColor =
    !covering || covering.colors.length === 0
      ? null
      : covering.colors.includes(input.coveringColor ?? "")
        ? input.coveringColor
        : covering.colors[0];
  const garnishes = Array.from(new Set(input.garnishes ?? []))
    .filter((g) => find(c.garnishes, g))
    .slice(0, c.rules.maxGarnishes);
  const t = input.topper ?? d.topper;
  const topper = {
    type: (["none", "image", "model", "number"] as const).includes(t.type) ? t.type : "none",
    imageShape: t.imageShape === "rettangolare" ? "rettangolare" : "tonda",
    model: find(c.toppers.models, t.model) ? t.model : c.toppers.models[0].id,
    number: (t.number ?? "").replace(/\D/g, "").slice(0, 2) || "1",
  } satisfies CakeConfig["topper"];
  const lettering = {
    text: (input.lettering?.text ?? "").replace(/[\r\n]/g, " ").slice(0, c.lettering.maxChars),
    color: c.lettering.colors.includes(input.lettering?.color) ? input.lettering.color : c.lettering.colors[0],
  };
  return {
    shape: shape?.id ?? null,
    size: size?.id ?? null,
    tiers: tier?.id ?? null,
    sponge: find(c.sponges, input.sponge)?.id ?? null,
    filling: find(c.fillings, input.filling)?.id ?? null,
    covering: covering?.id ?? null,
    coveringColor,
    garnishes,
    topper,
    lettering,
    notes: (input.notes ?? "").slice(0, c.rules.maxNotesChars),
  };
}

/** Calcolo prezzo: stessa funzione lato client (preview) e server (prezzo definitivo). */
export function computePrice(c: Catalog, cfg: CakeConfig): { lines: PriceLine[]; total: number } {
  const shape = find(c.shapes, cfg.shape);
  const size = find(c.sizes, cfg.size);
  const tier = find(c.tiers, cfg.tiers);
  const sponge = find(c.sponges, cfg.sponge);
  const filling = find(c.fillings, cfg.filling);
  const covering = find(c.coverings, cfg.covering);
  // Finché la taglia non è scelta i supplementi sono riferiti alla più piccola
  const sizeFactor = size?.factor ?? 1;
  // Più piani = più superficie da farcire/coprire
  const scale = sizeFactor * (1 + ((tier?.tiers ?? 1) - 1) * 0.45);

  const lines: PriceLine[] = [];
  const add = (label: string, amount: number) => {
    if (amount > 0) lines.push({ label, amount: round2(amount) });
  };

  if (size) {
    const name = shape ? ` ${shape.label.toLowerCase()}` : "";
    add(`Base ${size.label.toLowerCase()}${name} (${size.servings})`, size.price * (shape?.factor ?? 1));
  }
  if (tier) add(tier.label, tier.price * sizeFactor);
  if (sponge) add(sponge.label, sponge.price * scale);
  if (filling) add(filling.label, filling.price * scale);
  if (covering) add(covering.label, covering.price * scale);
  for (const g of cfg.garnishes) {
    const opt = find(c.garnishes, g);
    if (opt) add(opt.label, opt.price * sizeFactor);
  }
  if (cfg.topper.type === "image") add(c.toppers.printedImage.label, c.toppers.printedImage.price);
  if (cfg.topper.type === "model") {
    const m = find(c.toppers.models, cfg.topper.model);
    if (m) add(`Modellino 3D: ${m.label}`, m.price);
  }
  if (cfg.topper.type === "number") {
    add(`${c.toppers.number.label} "${cfg.topper.number}"`, c.toppers.number.price * cfg.topper.number.length);
  }
  if (cfg.lettering.text.trim()) add(c.lettering.label, c.lettering.price);

  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, total };
}

export function formatEuro(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

/** Riepilogo testuale leggibile dal laboratorio */
export function describeConfig(c: Catalog, cfg: CakeConfig): string[] {
  const l = (list: { id: string; label: string }[], id: string | null) => find(list, id)?.label ?? "—";
  const rows = [
    `Forma: ${l(c.shapes, cfg.shape)} – ${l(c.sizes, cfg.size)} (${find(c.sizes, cfg.size)?.servings ?? "—"})`,
    `Piani: ${l(c.tiers, cfg.tiers)}`,
    `Base: ${l(c.sponges, cfg.sponge)}`,
    `Farcitura: ${l(c.fillings, cfg.filling)}`,
    `Copertura: ${l(c.coverings, cfg.covering)}${cfg.coveringColor ? ` (${l(c.colors, cfg.coveringColor)})` : ""}`,
    `Guarnizioni: ${cfg.garnishes.length ? cfg.garnishes.map((g) => l(c.garnishes, g)).join(", ") : "nessuna"}`,
  ];
  if (cfg.topper.type === "image") rows.push(`Decorazione: cialda stampata ${cfg.topper.imageShape}`);
  if (cfg.topper.type === "model") rows.push(`Decorazione: modellino 3D ${l(c.toppers.models, cfg.topper.model)}`);
  if (cfg.topper.type === "number") rows.push(`Decorazione: numero 3D "${cfg.topper.number}"`);
  if (cfg.lettering.text.trim()) rows.push(`Scritta: "${cfg.lettering.text}" (${l(c.colors, cfg.lettering.color)})`);
  return rows;
}

/** Data minima di ritiro in formato YYYY-MM-DD (fuso Europe/Rome) */
export function minPickupDate(leadDays: number, now = new Date()): string {
  const rome = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  rome.setDate(rome.getDate() + leadDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${rome.getFullYear()}-${p(rome.getMonth() + 1)}-${p(rome.getDate())}`;
}

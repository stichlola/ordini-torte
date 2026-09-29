// Catalogo delle opzioni disponibili.
// È la fonte di default: se Supabase contiene la tabella `catalog_items`,
// label/prezzi/attivazione vengono sovrascritti da lì (vedi lib/catalog-server.ts).
// Nessun import con alias qui: il file è usato anche da scripts/gen-seed.ts.

export type ShapeId = "rotonda" | "quadrata" | "cuore" | "rettangolare";
export type CoveringKind = "panna" | "pdz" | "buttercream" | "ganache" | "naked";

export interface Option {
  id: string;
  label: string;
  /** Prezzo in euro. Per le voci "scalabili" è riferito alla taglia base (fattore 1). */
  price: number;
  description?: string;
  active?: boolean;
}

export interface ShapeOption extends Option {
  id: ShapeId;
  /** Moltiplicatore sul prezzo base della taglia */
  factor: number;
  maxTiers: number;
}

export interface SizeOption extends Option {
  servings: string;
  diameterCm: number;
  /** Fattore di scala per farciture, coperture e guarnizioni */
  factor: number;
}

export interface TierOption extends Option {
  tiers: number;
  /** Porzioni aggiuntive indicative */
  extraServings: string;
}

export interface SpongeOption extends Option {
  color: string;
}

export interface FillingOption extends Option {
  color: string;
}

export interface CoveringOption extends Option {
  kind: CoveringKind;
  /** Colori ammessi (id di COLORS). Vuoto = colore fisso */
  colors: string[];
  fixedColor?: string;
}

export interface ColorOption {
  id: string;
  label: string;
  hex: string;
}

export interface GarnishOption extends Option {
  /** Tipo grafico per la preview */
  render: "fruit" | "macaron" | "flower" | "pearl" | "chips" | "meringue" | "drip" | "gold" | "rosette";
}

export interface ModelOption extends Option {
  emoji: string;
}

export interface Catalog {
  shapes: ShapeOption[];
  sizes: SizeOption[];
  tiers: TierOption[];
  sponges: SpongeOption[];
  fillings: FillingOption[];
  coverings: CoveringOption[];
  colors: ColorOption[];
  garnishes: GarnishOption[];
  toppers: {
    printedImage: Option & { shapes: { id: "tonda" | "rettangolare"; label: string }[] };
    models: ModelOption[];
    number: Option;
  };
  lettering: Option & { maxChars: number; colors: string[] };
  rules: {
    maxGarnishes: number;
    maxNotesChars: number;
    minLeadDays: number;
    pickupSlots: string[];
  };
}

export const COLORS: ColorOption[] = [
  { id: "bianco", label: "Bianco", hex: "#FAF7F2" },
  { id: "avorio", label: "Avorio", hex: "#F3E7CF" },
  { id: "rosa", label: "Rosa cipria", hex: "#F4C6CF" },
  { id: "azzurro", label: "Azzurro", hex: "#BFDDF2" },
  { id: "lilla", label: "Lilla", hex: "#D9C8EC" },
  { id: "menta", label: "Verde menta", hex: "#C5E8D4" },
  { id: "giallo", label: "Giallo pastello", hex: "#FBE6A2" },
  { id: "nero", label: "Nero", hex: "#2B2B2B" },
];

const PASTEL = ["bianco", "avorio", "rosa", "azzurro", "lilla", "menta", "giallo"];

export const DEFAULT_CATALOG: Catalog = {
  shapes: [
    { id: "rotonda", label: "Rotonda", price: 0, factor: 1, maxTiers: 3 },
    { id: "quadrata", label: "Quadrata", price: 0, factor: 1.1, maxTiers: 3 },
    { id: "rettangolare", label: "Rettangolare", price: 0, factor: 1.2, maxTiers: 1 },
    { id: "cuore", label: "Cuore", price: 0, factor: 1.15, maxTiers: 1 },
  ],
  sizes: [
    { id: "s", label: "Piccola", servings: "6–8 porzioni", diameterCm: 18, price: 28, factor: 1 },
    { id: "m", label: "Media", servings: "10–12 porzioni", diameterCm: 22, price: 40, factor: 1.4 },
    { id: "l", label: "Grande", servings: "15–20 porzioni", diameterCm: 26, price: 58, factor: 1.9 },
    { id: "xl", label: "Extra", servings: "25–30 porzioni", diameterCm: 30, price: 80, factor: 2.5 },
  ],
  tiers: [
    { id: "1", label: "1 piano", tiers: 1, price: 0, extraServings: "" },
    { id: "2", label: "2 piani", tiers: 2, price: 35, extraServings: "+8 porzioni" },
    { id: "3", label: "3 piani", tiers: 3, price: 75, extraServings: "+14 porzioni" },
  ],
  sponges: [
    { id: "classico", label: "Pan di Spagna classico", price: 0, color: "#F2D59A" },
    { id: "cacao", label: "Pan di Spagna al cacao", price: 2, color: "#7A4A2E" },
    { id: "redvelvet", label: "Red velvet", price: 4, color: "#A8323E" },
    { id: "carota", label: "Carota e mandorle", price: 3, color: "#D9A05B" },
  ],
  fillings: [
    { id: "pasticcera", label: "Crema pasticcera", price: 0, color: "#F7DF8B" },
    { id: "chantilly", label: "Chantilly", price: 0, color: "#FBF1D6" },
    { id: "cioccolato", label: "Crema al cioccolato", price: 2, color: "#5A3522" },
    { id: "nocciola", label: "Crema alla nocciola", price: 3, color: "#8A5A3B" },
    { id: "pistacchio", label: "Crema al pistacchio", price: 5, color: "#B8CC7A" },
    { id: "frutti", label: "Chantilly e frutti di bosco", price: 4, color: "#C9587A" },
  ],
  coverings: [
    { id: "panna", label: "Panna montata", price: 0, kind: "panna", colors: ["bianco", "rosa", "azzurro", "giallo"] },
    { id: "buttercream", label: "Buttercream", price: 6, kind: "buttercream", colors: PASTEL },
    { id: "pdz", label: "Pasta di zucchero", price: 12, kind: "pdz", colors: COLORS.map((c) => c.id) },
    { id: "ganache", label: "Ganache al cioccolato", price: 8, kind: "ganache", colors: [], fixedColor: "#4A2A1A" },
    { id: "naked", label: "Naked cake (senza copertura)", price: 0, kind: "naked", colors: [] },
  ],
  colors: COLORS,
  garnishes: [
    { id: "frutta", label: "Frutta fresca", price: 6, render: "fruit" },
    { id: "macarons", label: "Macarons", price: 9, render: "macaron" },
    { id: "fiori", label: "Fiori eduli", price: 7, render: "flower" },
    { id: "rosette", label: "Rosette di crema", price: 4, render: "rosette" },
    { id: "meringhe", label: "Meringhette", price: 4, render: "meringue" },
    { id: "perle", label: "Perline di zucchero", price: 3, render: "pearl" },
    { id: "scaglie", label: "Scaglie di cioccolato", price: 3, render: "chips" },
    { id: "drip", label: "Colata di cioccolato (drip)", price: 5, render: "drip" },
    { id: "oro", label: "Foglia oro alimentare", price: 8, render: "gold" },
  ],
  toppers: {
    printedImage: {
      id: "cialda",
      label: "Immagine stampata (cialda)",
      price: 12,
      description: "Stampa alimentare della tua foto su cialda",
      shapes: [
        { id: "tonda", label: "Tonda" },
        { id: "rettangolare", label: "Rettangolare" },
      ],
    },
    models: [
      { id: "orsetto", label: "Orsetto", price: 18, emoji: "🧸" },
      { id: "unicorno", label: "Unicorno", price: 22, emoji: "🦄" },
      { id: "dinosauro", label: "Dinosauro", price: 22, emoji: "🦖" },
      { id: "pallone", label: "Pallone da calcio", price: 15, emoji: "⚽" },
      { id: "auto", label: "Macchinina", price: 20, emoji: "🚗" },
      { id: "corona", label: "Corona", price: 16, emoji: "👑" },
      { id: "sposi", label: "Sposi", price: 35, emoji: "💑" },
      { id: "cuore", label: "Cuore", price: 12, emoji: "❤️" },
    ],
    number: { id: "numero", label: "Numero 3D", price: 10, description: "Fino a 2 cifre" },
  },
  lettering: {
    id: "scritta",
    label: "Scritta",
    price: 3,
    maxChars: 30,
    colors: ["bianco", "nero", "rosa", "azzurro"],
  },
  rules: {
    maxGarnishes: 3,
    maxNotesChars: 300,
    minLeadDays: 2,
    pickupSlots: ["09:00–11:00", "11:00–13:00", "15:00–17:00", "17:00–19:30"],
  },
};

/** Tutte le voci con prezzo, identificate da "categoria:id" (usato per sync con il DB). */
export function catalogEntries(c: Catalog): { key: string; category: string; item: Option }[] {
  const out: { key: string; category: string; item: Option }[] = [];
  const push = (category: string, items: Option[]) =>
    items.forEach((item) => out.push({ key: `${category}:${item.id}`, category, item }));
  push("shape", c.shapes);
  push("size", c.sizes);
  push("tier", c.tiers);
  push("sponge", c.sponges);
  push("filling", c.fillings);
  push("covering", c.coverings);
  push("garnish", c.garnishes);
  push("model", c.toppers.models);
  push("topper", [c.toppers.printedImage, c.toppers.number]);
  push("lettering", [c.lettering]);
  return out;
}

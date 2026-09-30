// Tipi e struttura del catalogo. I prezzi vivono solo su Supabase (`catalog_items`):
// vedi lib/catalog-server.ts per il caricamento.

export type ShapeId = "rotonda" | "quadrata" | "cuore" | "rettangolare";
export type CoveringKind = "panna" | "pdz" | "buttercream" | "ganache" | "naked";

export interface Option {
  id: string;
  label: string;
  /** Prezzo in euro, letto dal database. Per le voci "scalabili" è riferito alla taglia base (fattore 1). */
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

/** Catalog senza i campi `price`: i prezzi esistono solo nel database. */
export type NoPrice<T> = T extends (infer U)[]
  ? NoPrice<U>[]
  : T extends object
    ? { [K in keyof T as K extends "price" ? never : K]: NoPrice<T[K]> }
    : T;

/**
 * Struttura del catalogo: quali opzioni esistono e come vengono disegnate.
 * Prezzi, etichette e disponibilità NON sono qui: arrivano da `catalog_items` su Supabase.
 */
export const CATALOG_TEMPLATE: NoPrice<Catalog> = {
  shapes: [
    { id: "rotonda", label: "Rotonda", factor: 1, maxTiers: 3 },
    { id: "quadrata", label: "Quadrata", factor: 1.1, maxTiers: 3 },
    { id: "rettangolare", label: "Rettangolare", factor: 1.2, maxTiers: 1 },
    { id: "cuore", label: "Cuore", factor: 1.15, maxTiers: 1 },
  ],
  sizes: [
    { id: "s", label: "Piccola", servings: "6–8 porzioni", diameterCm: 18, factor: 1 },
    { id: "m", label: "Media", servings: "10–12 porzioni", diameterCm: 22, factor: 1.4 },
    { id: "l", label: "Grande", servings: "15–20 porzioni", diameterCm: 26, factor: 1.9 },
    { id: "xl", label: "Extra", servings: "25–30 porzioni", diameterCm: 30, factor: 2.5 },
  ],
  tiers: [
    { id: "1", label: "1 piano", tiers: 1, extraServings: "" },
    { id: "2", label: "2 piani", tiers: 2, extraServings: "+8 porzioni" },
    { id: "3", label: "3 piani", tiers: 3, extraServings: "+14 porzioni" },
  ],
  sponges: [
    { id: "classico", label: "Pan di Spagna classico", color: "#F2D59A" },
    { id: "cacao", label: "Pan di Spagna al cacao", color: "#7A4A2E" },
    { id: "redvelvet", label: "Red velvet", color: "#A8323E" },
    { id: "carota", label: "Carota e mandorle", color: "#D9A05B" },
  ],
  fillings: [
    { id: "pasticcera", label: "Crema pasticcera", color: "#F7DF8B" },
    { id: "chantilly", label: "Chantilly", color: "#FBF1D6" },
    { id: "cioccolato", label: "Crema al cioccolato", color: "#5A3522" },
    { id: "nocciola", label: "Crema alla nocciola", color: "#8A5A3B" },
    { id: "pistacchio", label: "Crema al pistacchio", color: "#B8CC7A" },
    { id: "frutti", label: "Chantilly e frutti di bosco", color: "#C9587A" },
  ],
  coverings: [
    { id: "panna", label: "Panna montata", kind: "panna", colors: ["bianco", "rosa", "azzurro", "giallo"] },
    { id: "buttercream", label: "Buttercream", kind: "buttercream", colors: PASTEL },
    { id: "pdz", label: "Pasta di zucchero", kind: "pdz", colors: COLORS.map((c) => c.id) },
    { id: "ganache", label: "Ganache al cioccolato", kind: "ganache", colors: [], fixedColor: "#4A2A1A" },
    { id: "naked", label: "Naked cake (senza copertura)", kind: "naked", colors: [] },
  ],
  colors: COLORS,
  garnishes: [
    { id: "frutta", label: "Frutta fresca", render: "fruit" },
    { id: "macarons", label: "Macarons", render: "macaron" },
    { id: "fiori", label: "Fiori eduli", render: "flower" },
    { id: "rosette", label: "Rosette di crema", render: "rosette" },
    { id: "meringhe", label: "Meringhette", render: "meringue" },
    { id: "perle", label: "Perline di zucchero", render: "pearl" },
    { id: "scaglie", label: "Scaglie di cioccolato", render: "chips" },
    { id: "drip", label: "Colata di cioccolato (drip)", render: "drip" },
    { id: "oro", label: "Foglia oro alimentare", render: "gold" },
  ],
  toppers: {
    printedImage: {
      id: "cialda",
      label: "Immagine stampata (cialda)",
     
      description: "Stampa alimentare della tua foto su cialda",
      shapes: [
        { id: "tonda", label: "Tonda" },
        { id: "rettangolare", label: "Rettangolare" },
      ],
    },
    models: [
      { id: "orsetto", label: "Orsetto", emoji: "🧸" },
      { id: "unicorno", label: "Unicorno", emoji: "🦄" },
      { id: "dinosauro", label: "Dinosauro", emoji: "🦖" },
      { id: "pallone", label: "Pallone da calcio", emoji: "⚽" },
      { id: "auto", label: "Macchinina", emoji: "🚗" },
      { id: "corona", label: "Corona", emoji: "👑" },
      { id: "sposi", label: "Sposi", emoji: "💑" },
      { id: "cuore", label: "Cuore", emoji: "❤️" },
    ],
    number: { id: "numero", label: "Numero 3D", description: "Fino a 2 cifre" },
  },
  lettering: {
    id: "scritta",
    label: "Scritta",
   
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

type Entry = { id: string; label: string; price?: number; active?: boolean };

/** Tutte le voci con prezzo, identificate da "categoria:id" (chiave della riga in `catalog_items`). */
export function catalogEntries(c: NoPrice<Catalog>): { key: string; item: Entry }[] {
  const out: { key: string; item: Entry }[] = [];
  const push = (category: string, items: Entry[]) =>
    items.forEach((item) => out.push({ key: `${category}:${item.id}`, item }));
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

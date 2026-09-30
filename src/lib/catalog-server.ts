import "server-only";
import { catalogEntries, CATALOG_TEMPLATE, type Catalog } from "./catalog";
import { getSupabaseAdmin } from "./supabase-server";

interface CatalogRow {
  key: string;
  label: string;
  price: number;
  active: boolean;
  sort_order: number;
}

/** Il catalogo non può essere costruito: database non raggiungibile o dati mancanti. */
export class CatalogError extends Error {}

/**
 * Carica il catalogo da Supabase. Il codice definisce solo struttura e grafica;
 * etichette, prezzi, ordine e disponibilità vengono da `catalog_items`.
 * Non esistono valori di riserva: una voce senza riga nel database non viene proposta.
 */
export async function getCatalog(): Promise<Catalog> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new CatalogError("Variabili d'ambiente Supabase mancanti.");

  const { data, error } = await supabase
    .from("catalog_items")
    .select("key,label,price,active,sort_order");
  if (error || !data) throw new CatalogError(`Lettura di catalog_items fallita: ${error?.message}`);

  const rows = new Map((data as CatalogRow[]).map((r) => [r.key, r]));
  const template = structuredClone(CATALOG_TEMPLATE);
  for (const { key, item } of catalogEntries(template)) {
    const row = rows.get(key);
    // senza riga (o riga disattivata) la voce è fuori catalogo
    item.active = !!row?.active;
    if (!row) continue;
    item.label = row.label;
    item.price = Number(row.price);
    (item as { sort?: number }).sort = row.sort_order;
  }
  // da qui in poi ogni voce attiva ha il suo prezzo
  const catalog = template as unknown as Catalog;

  const keep = <T extends { active?: boolean; sort?: number }>(list: T[]) =>
    list.filter((x) => x.active).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  catalog.shapes = keep(catalog.shapes);
  catalog.sizes = keep(catalog.sizes);
  catalog.tiers = keep(catalog.tiers);
  catalog.sponges = keep(catalog.sponges);
  catalog.fillings = keep(catalog.fillings);
  catalog.coverings = keep(catalog.coverings);
  catalog.garnishes = keep(catalog.garnishes);
  catalog.toppers.models = keep(catalog.toppers.models);

  // Il configuratore ha bisogno di almeno una voce per ogni scelta obbligatoria
  const required: [string, { active?: boolean }[]][] = [
    ["shape", catalog.shapes],
    ["size", catalog.sizes],
    ["tier", catalog.tiers],
    ["sponge", catalog.sponges],
    ["filling", catalog.fillings],
    ["covering", catalog.coverings],
    ["model", catalog.toppers.models],
    ["topper:cialda", [catalog.toppers.printedImage]],
    ["topper:numero", [catalog.toppers.number]],
    ["lettering:scritta", [catalog.lettering]],
  ];
  const missing = required.filter(([, list]) => !list.some((x) => x.active)).map(([name]) => name);
  if (missing.length) throw new CatalogError(`Voci mancanti o disattivate in catalog_items: ${missing.join(", ")}`);

  return catalog;
}

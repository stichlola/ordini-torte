import "server-only";
import { catalogEntries, DEFAULT_CATALOG, type Catalog } from "./catalog";
import { getSupabaseAdmin } from "./supabase-server";

interface CatalogRow {
  key: string;
  label: string;
  price: number;
  active: boolean;
  sort_order: number;
}

/**
 * Carica il catalogo: struttura e grafica vengono dal codice, mentre label, prezzi,
 * ordine e disponibilità possono essere gestiti dalla tabella `catalog_items`.
 */
export async function getCatalog(): Promise<Catalog> {
  const catalog: Catalog = structuredClone(DEFAULT_CATALOG);
  const supabase = getSupabaseAdmin();
  if (!supabase) return catalog;

  const { data, error } = await supabase
    .from("catalog_items")
    .select("key,label,price,active,sort_order");
  if (error || !data) {
    console.error("Catalogo Supabase non disponibile, uso i default:", error?.message);
    return catalog;
  }

  const rows = new Map((data as CatalogRow[]).map((r) => [r.key, r]));
  for (const { key, item } of catalogEntries(catalog)) {
    const row = rows.get(key);
    if (!row) continue;
    item.label = row.label;
    item.price = Number(row.price);
    item.active = row.active;
    (item as { sort?: number }).sort = row.sort_order;
  }

  const keep = <T extends { active?: boolean; sort?: number }>(list: T[]) => {
    const filtered = list.filter((x) => x.active !== false);
    return (filtered.length ? filtered : list).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  };
  catalog.shapes = keep(catalog.shapes);
  catalog.sizes = keep(catalog.sizes);
  catalog.tiers = keep(catalog.tiers);
  catalog.sponges = keep(catalog.sponges);
  catalog.fillings = keep(catalog.fillings);
  catalog.coverings = keep(catalog.coverings);
  catalog.garnishes = keep(catalog.garnishes);
  catalog.toppers.models = keep(catalog.toppers.models);
  return catalog;
}

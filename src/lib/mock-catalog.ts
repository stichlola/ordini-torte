import { catalogEntries, CATALOG_TEMPLATE, type Catalog } from "./catalog";

// Demo senza backend: listino d'esempio fisso nel codice (prezzi da sostituire con quelli della pasticceria).

interface CatalogRow {
  key: string;
  label: string;
  price: number;
}

const ROWS: CatalogRow[] = [
  { key: "shape:rotonda", label: "Rotonda", price: 0 },
  { key: "shape:quadrata", label: "Quadrata", price: 0 },
  { key: "shape:rettangolare", label: "Rettangolare", price: 0 },
  { key: "shape:cuore", label: "Cuore", price: 0 },
  { key: "size:s", label: "Piccola", price: 28 },
  { key: "size:m", label: "Media", price: 40 },
  { key: "size:l", label: "Grande", price: 58 },
  { key: "size:xl", label: "Extra", price: 80 },
  { key: "tier:1", label: "1 piano", price: 0 },
  { key: "tier:2", label: "2 piani", price: 35 },
  { key: "tier:3", label: "3 piani", price: 75 },
  { key: "sponge:classico", label: "Pan di Spagna classico", price: 0 },
  { key: "sponge:cacao", label: "Pan di Spagna al cacao", price: 2 },
  { key: "sponge:redvelvet", label: "Red velvet", price: 4 },
  { key: "sponge:carota", label: "Carota e mandorle", price: 3 },
  { key: "filling:pasticcera", label: "Crema pasticcera", price: 0 },
  { key: "filling:chantilly", label: "Chantilly", price: 0 },
  { key: "filling:cioccolato", label: "Crema al cioccolato", price: 2 },
  { key: "filling:nocciola", label: "Crema alla nocciola", price: 3 },
  { key: "filling:pistacchio", label: "Crema al pistacchio", price: 5 },
  { key: "filling:frutti", label: "Chantilly e frutti di bosco", price: 4 },
  { key: "covering:panna", label: "Panna montata", price: 0 },
  { key: "covering:buttercream", label: "Buttercream", price: 6 },
  { key: "covering:pdz", label: "Pasta di zucchero", price: 12 },
  { key: "covering:ganache", label: "Ganache al cioccolato", price: 8 },
  { key: "covering:naked", label: "Naked cake (senza copertura)", price: 0 },
  { key: "garnish:frutta", label: "Frutta fresca", price: 6 },
  { key: "garnish:macarons", label: "Macarons", price: 9 },
  { key: "garnish:fiori", label: "Fiori eduli", price: 7 },
  { key: "garnish:rosette", label: "Rosette di crema", price: 4 },
  { key: "garnish:meringhe", label: "Meringhette", price: 4 },
  { key: "garnish:perle", label: "Perline di zucchero", price: 3 },
  { key: "garnish:scaglie", label: "Scaglie di cioccolato", price: 3 },
  { key: "garnish:drip", label: "Colata di cioccolato (drip)", price: 5 },
  { key: "garnish:oro", label: "Foglia oro alimentare", price: 8 },
  { key: "model:orsetto", label: "Orsetto", price: 18 },
  { key: "model:unicorno", label: "Unicorno", price: 22 },
  { key: "model:dinosauro", label: "Dinosauro", price: 22 },
  { key: "model:pallone", label: "Pallone da calcio", price: 15 },
  { key: "model:auto", label: "Macchinina", price: 20 },
  { key: "model:corona", label: "Corona", price: 16 },
  { key: "model:sposi", label: "Sposi", price: 35 },
  { key: "model:cuore", label: "Cuore", price: 12 },
  { key: "topper:cialda", label: "Immagine stampata (cialda)", price: 12 },
  { key: "topper:numero", label: "Numero 3D", price: 10 },
  { key: "lettering:scritta", label: "Scritta", price: 3 },
];

/** Unisce la struttura definita nel codice con il listino d'esempio, nell'ordine di ROWS. */
export function getCatalog(): Catalog {
  const rows = new Map(ROWS.map((r, i) => [r.key, { ...r, sort: i }]));
  const template = structuredClone(CATALOG_TEMPLATE);
  for (const { key, item } of catalogEntries(template)) {
    const row = rows.get(key);
    // una voce senza riga nel listino è fuori catalogo
    item.active = !!row;
    if (!row) continue;
    item.label = row.label;
    item.price = row.price;
    (item as { sort?: number }).sort = row.sort;
  }
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
  return catalog;
}

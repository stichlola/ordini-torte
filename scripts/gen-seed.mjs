// Genera supabase/seed.sql a partire dal catalogo di default (src/lib/catalog.ts).
// Uso: node scripts/gen-seed.mjs   (Node >= 22.18 per il type stripping)
import { writeFileSync } from "node:fs";
import { DEFAULT_CATALOG, catalogEntries } from "../src/lib/catalog.ts";

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rows = catalogEntries(DEFAULT_CATALOG).map(
  ({ key, category, item }, i) => `  (${q(key)}, ${q(category)}, ${q(item.label)}, ${item.price.toFixed(2)}, true, ${i})`,
);

const sql = `-- Generato da scripts/gen-seed.mjs: prezzi e voci del catalogo
insert into public.catalog_items (key, category, label, price, active, sort_order) values
${rows.join(",\n")}
on conflict (key) do update set
  category = excluded.category,
  label = excluded.label,
  price = excluded.price,
  sort_order = excluded.sort_order,
  updated_at = now();
`;
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log(`seed.sql: ${rows.length} voci`);

import { CatalogError, getCatalog } from "@/lib/catalog-server";
import type { Catalog } from "@/lib/catalog";
import CakeConfigurator from "@/components/CakeConfigurator";
import CatalogUnavailable from "@/components/CatalogUnavailable";

// Il catalogo (prezzi) viene riletto da Supabase al massimo ogni minuto
export const revalidate = 60;

export default async function Home() {
  let catalog: Catalog;
  try {
    catalog = await getCatalog();
  } catch (e) {
    if (!(e instanceof CatalogError)) throw e;
    console.error("Catalogo non disponibile:", e.message);
    return <CatalogUnavailable />;
  }
  return <CakeConfigurator catalog={catalog} />;
}

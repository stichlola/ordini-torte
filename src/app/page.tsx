import { getCatalog } from "@/lib/catalog-server";
import CakeConfigurator from "@/components/CakeConfigurator";

// Il catalogo (prezzi) viene riletto da Supabase al massimo ogni minuto
export const revalidate = 60;

export default async function Home() {
  const catalog = await getCatalog();
  return <CakeConfigurator catalog={catalog} />;
}

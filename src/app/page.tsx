import { getCatalog } from "@/lib/mock-catalog";
import CakeConfigurator from "@/components/CakeConfigurator";

export default function Home() {
  return <CakeConfigurator catalog={getCatalog()} />;
}

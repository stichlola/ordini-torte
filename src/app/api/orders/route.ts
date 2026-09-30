import { NextResponse } from "next/server";
import { CatalogError, getCatalog } from "@/lib/catalog-server";
import type { Catalog } from "@/lib/catalog";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { computePrice, describeConfig, minPickupDate, missingChoices, normalizeConfig, type CakeConfig, type Customer } from "@/lib/order";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // sotto il limite body di Vercel (4.5 MB)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return bad("Servizio ordini non configurato (variabili Supabase mancanti).", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Richiesta non valida.");
  }

  let rawConfig: CakeConfig;
  let customer: Customer;
  try {
    rawConfig = JSON.parse(String(form.get("config")));
    customer = JSON.parse(String(form.get("customer")));
  } catch {
    return bad("Dati dell'ordine non validi.");
  }

  let catalog: Catalog;
  try {
    catalog = await getCatalog();
  } catch (e) {
    if (!(e instanceof CatalogError)) throw e;
    console.error("Catalogo non disponibile:", e.message);
    return bad("Catalogo non disponibile, riprova tra poco.", 503);
  }
  // Il server non si fida del client: rinormalizza e ricalcola il prezzo
  const config = normalizeConfig(catalog, rawConfig);
  const missing = missingChoices(config);
  if (missing.length) return bad(`Configurazione incompleta: manca ${missing.join(", ")}.`);
  const price = computePrice(catalog, config);

  const name = String(customer?.name ?? "").trim().slice(0, 120);
  const phone = String(customer?.phone ?? "").trim().slice(0, 20);
  const email = String(customer?.email ?? "").trim().slice(0, 200);
  const pickupDate = String(customer?.pickupDate ?? "");
  const pickupSlot = String(customer?.pickupSlot ?? "");

  if (name.length < 2) return bad("Nome mancante.");
  if (!/^\+?[0-9 ]{6,16}$/.test(phone)) return bad("Telefono non valido.");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return bad("Email non valida.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || pickupDate < minPickupDate(catalog.rules.minLeadDays))
    return bad(`La data di ritiro deve essere almeno tra ${catalog.rules.minLeadDays} giorni.`);
  if (!catalog.rules.pickupSlots.includes(pickupSlot)) return bad("Fascia oraria non valida.");

  // Immagine per la cialda
  let imagePath: string | null = null;
  if (config.topper.type === "image") {
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) return bad("Manca la foto da stampare.");
    if (image.size > MAX_IMAGE_BYTES) return bad("Foto troppo grande (max 4 MB).");
    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) return bad("Formato foto non supportato.");
    const ext = image.type.split("/")[1].replace("jpeg", "jpg");
    imagePath = `${pickupDate}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("order-images")
      .upload(imagePath, image, { contentType: image.type, upsert: false });
    if (error) {
      console.error("Upload immagine fallito:", error.message);
      return bad("Caricamento della foto non riuscito, riprova.", 500);
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      pickup_date: pickupDate,
      pickup_slot: pickupSlot,
      config,
      summary: describeConfig(catalog, config).join("\n"),
      notes: config.notes || null,
      image_path: imagePath,
      price_lines: price.lines,
      total_price: price.total,
    })
    .select("id, code")
    .single();

  if (error || !data) {
    console.error("Inserimento ordine fallito:", error?.message);
    if (imagePath) await supabase.storage.from("order-images").remove([imagePath]);
    return bad("Impossibile salvare l'ordine, riprova tra poco.", 500);
  }

  return NextResponse.json({ id: data.id, code: data.code, total: price.total }, { status: 201 });
}

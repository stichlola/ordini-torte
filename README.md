# Pasticceria – ordini torte

Web app (Next.js 16 + Material UI + Supabase) per comporre una torta personalizzata con
opzioni guidate, vedere prezzo e anteprima grafica in tempo reale e inviare l'ordine.

## Avvio in locale

```bash
npm install
cp .env.example .env.local   # inserisci URL e service role key di Supabase
npm run dev
```

Senza variabili Supabase l'app funziona con il catalogo di default, ma l'invio ordini risponde 503.

## Supabase

1. Crea un progetto su supabase.com.
2. SQL Editor → esegui `supabase/migrations/20260929000000_init.sql` (tabelle `catalog_items`, `orders`, bucket `order-images`).
3. Esegui `supabase/seed.sql` per popolare i prezzi.
4. Da ora puoi cambiare prezzi, etichette e disponibilità direttamente nella tabella `catalog_items` (aggiornamento entro 1 minuto).

Se modifichi il catalogo nel codice (`src/lib/catalog.ts`) rigenera il seed con `npm run seed`.

## Deploy su Vercel

Importa il repo su Vercel e imposta le variabili d'ambiente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server)

## Struttura

- `src/lib/catalog.ts` – opzioni disponibili (forme, taglie, farciture, guarnizioni, topper…)
- `src/lib/order.ts` – validazione/normalizzazione della configurazione e calcolo prezzo (condiviso client/server)
- `src/components/CakePreview.tsx` – anteprima SVG della torta
- `src/components/CakeConfigurator.tsx` – interfaccia di configurazione
- `src/components/CheckoutDialog.tsx` – dati cliente e ritiro
- `src/app/api/orders/route.ts` – ricalcolo prezzo lato server, upload foto, salvataggio ordine

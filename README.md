# Pasticceria – ordini torte

Web app (Next.js 16 + Material UI + Supabase) per comporre una torta personalizzata con
opzioni guidate, vedere prezzo e anteprima grafica in tempo reale e inviare l'ordine.

## Avvio in locale

```bash
npm install
cp .env.example .env.local   # inserisci URL e service role key di Supabase
npm run dev
```

Prezzi ed etichette esistono solo su Supabase: senza le variabili o senza dati in `catalog_items` il sito mostra "Ordini online non disponibili".

## Supabase

1. Crea un progetto su supabase.com.
2. SQL Editor → esegui `supabase/migrations/20260929000000_init.sql` (tabelle `catalog_items`, `orders`, bucket `order-images`).
3. Esegui `supabase/seed.sql` per caricare il listino iniziale (prezzi di esempio da sostituire).
4. Da ora puoi cambiare prezzi, etichette e disponibilità direttamente nella tabella `catalog_items` (aggiornamento entro 1 minuto).

Una voce senza riga in `catalog_items` (o con `active = false`) non viene proposta. Per aggiungere un'opzione nuova serve sia la voce in `src/lib/catalog.ts` (struttura e grafica) sia la riga nel database (etichetta e prezzo).

## Deploy su Vercel

Importa il repo su Vercel e imposta le variabili d'ambiente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server)

## Struttura

- `src/lib/catalog.ts` – struttura e grafica delle opzioni (niente prezzi)
- `src/lib/order.ts` – validazione/normalizzazione della configurazione e calcolo prezzo (condiviso client/server)
- `src/components/CakePreview.tsx` – anteprima SVG della torta
- `src/components/CakeConfigurator.tsx` – interfaccia di configurazione
- `src/components/CheckoutDialog.tsx` – dati cliente e ritiro
- `src/app/api/orders/route.ts` – ricalcolo prezzo lato server, upload foto, salvataggio ordine

# Pasticceria – ordini torte

Web app (Next.js 16 + Material UI) per comporre una torta personalizzata con
opzioni guidate, vedere prezzo e anteprima grafica in tempo reale e inviare l'ordine.

## Avvio in locale

```bash
npm install
npm run dev
```

Demo senza backend: listino d'esempio in `src/lib/mock-catalog.ts` e ordine simulato nel browser (nessun dato viene salvato o inviato).

`supabase/` contiene schema e listino della versione con database, oggi non usati.

## Deploy su Vercel

Importa il repo su Vercel: non servono variabili d'ambiente.

## Struttura

- `src/lib/catalog.ts` – struttura e grafica delle opzioni (niente prezzi)
- `src/lib/mock-catalog.ts` – listino d'esempio (etichette e prezzi)
- `src/lib/order.ts` – validazione/normalizzazione della configurazione e calcolo prezzo (condiviso client/server)
- `src/components/CakePreview.tsx` – anteprima SVG della torta
- `src/components/CakeConfigurator.tsx` – interfaccia di configurazione
- `src/components/CheckoutDialog.tsx` – dati cliente e ritiro, invio simulato

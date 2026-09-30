"use client";

import { useId, useMemo, type ReactNode } from "react";
import type { Catalog, ShapeId } from "@/lib/catalog";
import type { CakeConfig } from "@/lib/order";

/*
 * Preview grafica "all'incirca" della torta, disegnata in SVG.
 * Ogni piano è la forma vista dall'alto, schiacciata in prospettiva (K) ed estrusa
 * impilando copie del contorno: funziona per qualunque forma (anche il cuore)
 * e permette di colorare le fasce laterali (naked cake).
 */

type Pt = [number, number];

const VIEW_W = 420;
const VIEW_Y = 70;
const VIEW_H = 340;
const NEUTRAL = "#DDD5C8"; // parti non ancora scelte
const K = 0.42; // inclinazione della vista
const PLATE_Y = 322;

// ---------- Geometria ----------

function shapePolygon(shape: ShapeId): Pt[] {
  switch (shape) {
    case "rotonda":
      return Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * Math.PI * 2;
        return [Math.cos(a), Math.sin(a)];
      });
    case "quadrata":
      return roundedRect(0.9, 0.9, 0.08);
    case "rettangolare":
      return roundedRect(1.25, 0.8, 0.08);
    case "cuore":
      return Array.from({ length: 90 }, (_, i) => {
        const t = (i / 90) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        // punta verso chi guarda (v positivo)
        return [(x / 16) * 1.05, (-(y + 2.5) / 15) * 1.05];
      });
  }
}

function roundedRect(hw: number, hh: number, r: number): Pt[] {
  const pts: Pt[] = [];
  const corners: [number, number, number][] = [
    [hw - r, hh - r, 0],
    [-hw + r, hh - r, Math.PI / 2],
    [-hw + r, -hh + r, Math.PI],
    [hw - r, -hh + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

/** v massimo (bordo frontale) del poligono alla coordinata u */
function frontV(poly: Pt[], u: number): number | null {
  let best: number | null = null;
  for (let i = 0; i < poly.length; i++) {
    const [u1, v1] = poly[i];
    const [u2, v2] = poly[(i + 1) % poly.length];
    if ((u1 <= u && u2 >= u) || (u2 <= u && u1 >= u)) {
      const t = u2 === u1 ? 0 : (u - u1) / (u2 - u1);
      const v = v1 + t * (v2 - v1);
      if (best === null || v > best) best = v;
    }
  }
  return best;
}

function inside(poly: Pt[], [u, v]: Pt): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i];
    const [uj, vj] = poly[j];
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) c = !c;
  }
  return c;
}

function uBounds(poly: Pt[]): [number, number] {
  const us = poly.map((p) => p[0]);
  return [Math.min(...us), Math.max(...us)];
}

/** Generatore pseudo-casuale deterministico: la preview non "salta" a ogni render */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------- Colori ----------

function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(pct < 0 ? c * (1 + pct) : c + (255 - c) * pct)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 110;
}

// ---------- Componente ----------

interface Props {
  catalog: Catalog;
  config: CakeConfig;
  imageUrl?: string | null;
}

interface Tier {
  cx: number;
  baseY: number;
  R: number;
  H: number;
}

interface Drawable {
  depth: number;
  node: ReactNode;
}

export default function CakePreview({ catalog, config, imageUrl }: Props) {
  const uid = useId().replace(/[:«»]/g, "");

  const scene = useMemo(() => {
    const poly = shapePolygon(config.shape ?? "rotonda");
    // taglia non ancora scelta: disegno una misura media
    const sizeIdx = config.size ? Math.max(0, catalog.sizes.findIndex((s) => s.id === config.size)) : 1;
    const tierCount = catalog.tiers.find((t) => t.id === config.tiers)?.tiers ?? 1;
    const widthFactor = config.shape === "rettangolare" ? 0.82 : 1;
    const R0 = (100 + sizeIdx * 13) * widthFactor;
    const H0 = tierCount === 1 ? 74 : tierCount === 2 ? 64 : 54;

    const tiers: Tier[] = [];
    let baseY = PLATE_Y - 6;
    for (let i = 0; i < tierCount; i++) {
      const R = R0 * Math.pow(0.7, i);
      const H = H0 * Math.pow(0.92, i);
      tiers.push({ cx: VIEW_W / 2, baseY, R, H });
      baseY -= H;
    }
    return { poly, tiers, R0 };
  }, [catalog, config.shape, config.size, config.tiers]);

  const sponge = catalog.sponges.find((s) => s.id === config.sponge)?.color ?? NEUTRAL;
  const filling = catalog.fillings.find((f) => f.id === config.filling)?.color ?? shade(NEUTRAL, 0.35);
  const covering = catalog.coverings.find((c) => c.id === config.covering);
  // senza copertura scelta si vedono gli strati, come in una naked cake
  const kind = covering?.kind ?? "naked";
  const coverColor =
    kind === "naked"
      ? filling
      : (covering?.fixedColor ?? catalog.colors.find((c) => c.id === config.coveringColor)?.hex ?? "#FAF7F2");
  const hasDrip = config.garnishes.includes("drip");
  const letteringHex = catalog.colors.find((c) => c.id === config.lettering.color)?.hex ?? "#FFFFFF";

  const { poly, tiers, R0 } = scene;
  const top = tiers[tiers.length - 1];

  // proiezione di un punto (u,v) del piano superiore del piano `t` all'altezza z
  const P = (t: Tier, u: number, v: number, z: number): Pt => [t.cx + u * t.R, t.baseY - z + v * t.R * K];
  const polyPath = (t: Tier, z: number, scale = 1, du = 0, dv = 0) =>
    "M" +
    poly
      .map(([u, v]) => P(t, u * scale + du, v * scale + dv, z))
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join("L") +
    "Z";

  // colore laterale in funzione dell'altezza relativa (0 = base, 1 = cima)
  const sideColor = (rel: number): string => {
    if (kind !== "naked") return coverColor;
    const bands = [sponge, filling, sponge, filling, sponge];
    return bands[Math.min(bands.length - 1, Math.floor(rel * bands.length))];
  };

  const gradients = new Map<string, string>();
  const gradFor = (color: string) => {
    if (!gradients.has(color)) gradients.set(color, `${uid}g${gradients.size}`);
    return `url(#${gradients.get(color)})`;
  };

  // ---------- piani ----------
  const tierNodes = tiers.map((t, ti) => {
    const layers: ReactNode[] = [];
    const step = 1.5;
    for (let z = 0; z <= t.H; z += step) {
      layers.push(<path key={z} d={polyPath(t, z)} fill={gradFor(sideColor(z / t.H))} />);
    }
    const isTop = ti === tiers.length - 1;
    const topFill = isTop && hasDrip ? "#4A2A1A" : kind === "naked" ? shade(filling, 0.25) : shade(coverColor, 0.12);

    // bordino decorativo alla base (panna/buttercream)
    const border: ReactNode[] = [];
    if (kind === "panna" || kind === "buttercream") {
      const [umin, umax] = uBounds(poly);
      const n = Math.round(((umax - umin) * t.R) / 9);
      for (let i = 0; i <= n; i++) {
        const u = umin + 0.02 + ((umax - umin - 0.04) * i) / n;
        const v = frontV(poly, u);
        if (v === null) continue;
        const [x, y] = P(t, u, v, 3);
        border.push(
          <circle key={i} cx={x} cy={y} r={5.2} fill={shade(coverColor, 0.18)} stroke={shade(coverColor, -0.12)} strokeWidth={0.8} />,
        );
      }
    }

    // colata di cioccolato sul piano superiore
    const drips: ReactNode[] = [];
    if (isTop && hasDrip) {
      const r = rng(7);
      const [umin, umax] = uBounds(poly);
      const n = Math.round(((umax - umin) * t.R) / 11);
      for (let i = 0; i <= n; i++) {
        const u = umin + 0.03 + ((umax - umin - 0.06) * i) / n;
        const v = frontV(poly, u);
        if (v === null) continue;
        const [x, y] = P(t, u, v, t.H);
        const len = 8 + r() * (t.H * 0.45);
        drips.push(
          <path
            key={i}
            d={`M${x - 5},${y - 2} L${x - 3.5},${y + len - 3} Q${x},${y + len + 4} ${x + 3.5},${y + len - 3} L${x + 5},${y - 2}Z`}
            fill="#4A2A1A"
          />,
        );
      }
    }

    return (
      <g key={ti}>
        <ellipse cx={t.cx} cy={t.baseY + 2} rx={t.R * 1.02} ry={t.R * K * 1.02} fill="rgba(0,0,0,0.12)" />
        {layers}
        <path d={polyPath(t, t.H)} fill={topFill} stroke={shade(topFill, -0.08)} strokeWidth={1} />
        {isTop && hasDrip && <path d={polyPath(t, t.H, 0.97)} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={3} />}
        {drips}
        {kind === "ganache" && (
          <path d={polyPath(t, t.H, 0.6, -0.15, -0.1)} fill="rgba(255,255,255,0.08)" />
        )}
        {border}
      </g>
    );
  });

  // ---------- decorazioni sul piano superiore ----------
  const items: Drawable[] = [];
  const hasCenter = config.topper.type !== "none";
  const hasText = config.lettering.text.trim().length > 0;
  const at = (u: number, v: number, z = top.H) => P(top, u, v, z);

  // anelli sul bordo
  const ringKinds = config.garnishes.filter((g) => ["frutta", "macarons", "rosette"].includes(g));
  const ringScale = [0.8, 0.58];
  ringKinds.forEach((g, ri) => {
    const s = ringScale[ri] ?? 0.45;
    const count = Math.max(8, Math.round((top.R * s) / (g === "macarons" ? 7 : 6)));
    const step = Math.max(1, Math.floor(poly.length / count));
    poly.forEach(([u, v], i) => {
      if (i % step !== 0) return;
      const [x, y] = at(u * s, v * s);
      const depth = v * s;
      const size = Math.max(5, top.R * 0.07);
      if (g === "frutta") {
        const berry = (i / step) % 3 === 2;
        items.push({
          depth,
          node: berry ? (
            <g key={`${g}${i}`}>
              <circle cx={x} cy={y - size * 0.5} r={size * 0.55} fill="#2E3A7A" />
              <circle cx={x - size * 0.2} cy={y - size * 0.7} r={size * 0.15} fill="rgba(255,255,255,0.4)" />
            </g>
          ) : (
            <g key={`${g}${i}`}>
              <path
                d={`M${x - size * 0.8},${y - size} Q${x},${y + size * 0.9} ${x + size * 0.8},${y - size} Q${x},${y - size * 1.5} ${x - size * 0.8},${y - size}Z`}
                fill="#D7263D"
              />
              <path d={`M${x - size * 0.5},${y - size * 1.1} L${x},${y - size * 1.5} L${x + size * 0.5},${y - size * 1.1}Z`} fill="#3E8E41" />
            </g>
          ),
        });
      } else if (g === "macarons") {
        const cols = ["#F4B6C2", "#B5E3D8", "#F9E3A1", "#D8C4F0"];
        const c = cols[(i / step) % cols.length];
        const w = size * 1.1;
        items.push({
          depth,
          node: (
            <g key={`${g}${i}`}>
              <ellipse cx={x} cy={y - w * 0.3} rx={w} ry={w * 0.45} fill={shade(c, -0.1)} />
              <rect x={x - w * 0.9} y={y - w * 0.75} width={w * 1.8} height={w * 0.35} fill="#FFF6E8" />
              <ellipse cx={x} cy={y - w * 0.85} rx={w} ry={w * 0.45} fill={c} />
            </g>
          ),
        });
      } else {
        const rc = kind === "naked" || kind === "ganache" ? "#FFF8EE" : shade(coverColor, 0.3);
        items.push({
          depth,
          node: (
            <g key={`${g}${i}`}>
              <ellipse cx={x} cy={y - size * 0.3} rx={size * 0.95} ry={size * 0.6} fill={shade(rc, -0.06)} />
              <ellipse cx={x} cy={y - size * 0.75} rx={size * 0.6} ry={size * 0.4} fill={rc} />
              <circle cx={x} cy={y - size * 1.1} r={size * 0.22} fill={shade(rc, -0.04)} />
            </g>
          ),
        });
      }
    });
  });

  // elementi sparsi
  const scatter = (seed: number, n: number, avoidCenter: boolean) => {
    const r = rng(seed);
    const pts: Pt[] = [];
    let guard = 0;
    while (pts.length < n && guard++ < n * 40) {
      const p: Pt = [(r() * 2 - 1) * 1.2, r() * 2 - 1];
      const scaled: Pt = [p[0] / 0.82, p[1] / 0.82];
      if (!inside(poly, scaled)) continue;
      if (avoidCenter && Math.hypot(p[0], p[1] * 1.2) < 0.42) continue;
      pts.push(p);
    }
    return pts;
  };

  if (config.garnishes.includes("perle")) {
    scatter(11, 40, false).forEach(([u, v], i) => {
      const [x, y] = at(u, v);
      items.push({
        depth: v,
        node: <circle key={`p${i}`} cx={x} cy={y - 1.5} r={2.2} fill={i % 3 ? "#FFFDF7" : "#E7C873"} stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />,
      });
    });
  }
  if (config.garnishes.includes("scaglie")) {
    scatter(23, 26, false).forEach(([u, v], i) => {
      const [x, y] = at(u, v);
      items.push({
        depth: v,
        node: <rect key={`s${i}`} x={x - 4} y={y - 2.5} width={8} height={3} rx={1} fill={i % 2 ? "#3B2215" : "#5C3A24"} transform={`rotate(${(i * 47) % 180} ${x} ${y})`} />,
      });
    });
  }
  if (config.garnishes.includes("oro")) {
    scatter(31, 7, true).forEach(([u, v], i) => {
      const [x, y] = at(u, v);
      const s = 5 + (i % 3) * 2;
      items.push({
        depth: v,
        node: <path key={`o${i}`} d={`M${x},${y - s} L${x + s * 0.8},${y - s * 0.2} L${x + s * 0.2},${y + s * 0.3} L${x - s * 0.9},${y - s * 0.1}Z`} fill="#D4AF37" stroke="#F6E27A" strokeWidth={0.6} />,
      });
    });
  }
  if (config.garnishes.includes("meringhe")) {
    scatter(41, 9, hasCenter || hasText).forEach(([u, v], i) => {
      const [x, y] = at(u, v);
      const s = Math.max(6, top.R * 0.07);
      items.push({
        depth: v,
        node: (
          <path
            key={`m${i}`}
            d={`M${x - s},${y} Q${x - s * 0.9},${y - s * 1.2} ${x},${y - s * 2} Q${x + s * 0.9},${y - s * 1.2} ${x + s},${y}Z`}
            fill={i % 2 ? "#FFFFFF" : "#FBE3EA"}
            stroke="rgba(0,0,0,0.1)"
            strokeWidth={0.6}
          />
        ),
      });
    });
  }
  if (config.garnishes.includes("fiori")) {
    // bouquet sul lato posteriore sinistro
    const cols = ["#F28DB2", "#FFFFFF", "#F7C948", "#B794F4"];
    const [umin] = uBounds(poly);
    for (let i = 0; i < 6; i++) {
      const u = umin * 0.55 + (i % 3) * 0.14;
      const v = -0.45 + Math.floor(i / 3) * 0.18;
      const [x, y] = at(u, v);
      const s = Math.max(5, top.R * 0.065);
      const c = cols[i % cols.length];
      items.push({
        depth: v,
        node: (
          <g key={`f${i}`}>
            {Array.from({ length: 5 }, (_, k) => {
              const a = (k / 5) * Math.PI * 2;
              return <ellipse key={k} cx={x + Math.cos(a) * s * 0.6} cy={y - s + Math.sin(a) * s * 0.35} rx={s * 0.5} ry={s * 0.32} fill={c} stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />;
            })}
            <circle cx={x} cy={y - s} r={s * 0.28} fill="#F6B93B" />
          </g>
        ),
      });
    }
  }

  // ---------- topper centrale ----------
  const centerV = hasText ? -0.12 : 0;
  if (config.topper.type === "image") {
    const round = config.topper.imageShape === "tonda";
    const w = top.R * (round ? 0.52 : 0.6);
    const h = round ? w : w * 0.72;
    const [cx, cy] = at(0, centerV, top.H + 0.5);
    const clipId = `${uid}clip`;
    items.push({
      depth: centerV,
      node: (
        <g key="img">
          <defs>
            <clipPath id={clipId}>
              {round ? <ellipse cx={cx} cy={cy} rx={w} ry={h * K} /> : <rect x={cx - w} y={cy - h * K} width={w * 2} height={h * 2 * K} rx={3} />}
            </clipPath>
          </defs>
          {imageUrl ? (
            <image href={imageUrl} x={cx - w} y={cy - h * K} width={w * 2} height={h * 2 * K} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
          ) : (
            <g clipPath={`url(#${clipId})`}>
              <rect x={cx - w} y={cy - h * K} width={w * 2} height={h * 2 * K} fill="#EFE6D3" />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fill="#8C6D3B" fontFamily="var(--font-body), sans-serif">
                la tua foto
              </text>
            </g>
          )}
          {round ? (
            <ellipse cx={cx} cy={cy} rx={w} ry={h * K} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
          ) : (
            <rect x={cx - w} y={cy - h * K} width={w * 2} height={h * 2 * K} rx={3} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
          )}
        </g>
      ),
    });
  }
  if (config.topper.type === "model") {
    const m = catalog.toppers.models.find((x) => x.id === config.topper.model);
    const [cx, cy] = at(0, centerV);
    const fs = Math.min(84, top.R * 0.9);
    items.push({
      depth: centerV + 0.01,
      node: (
        <g key="model">
          <ellipse cx={cx} cy={cy} rx={fs * 0.42} ry={fs * 0.42 * K} fill="rgba(0,0,0,0.18)" />
          <text x={cx} y={cy + fs * 0.08} textAnchor="middle" fontSize={fs} style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,.25))" }}>
            {m?.emoji}
          </text>
        </g>
      ),
    });
  }
  if (config.topper.type === "number") {
    const [cx, cy] = at(0, centerV);
    const fs = Math.min(96, top.R * 1.05);
    const txt = config.topper.number;
    const base = "#E3B341";
    items.push({
      depth: centerV + 0.01,
      node: (
        <g key="num" fontFamily="var(--font-body), sans-serif" fontWeight={900} fontSize={fs} textAnchor="middle">
          <ellipse cx={cx} cy={cy} rx={fs * 0.3 * txt.length} ry={fs * 0.1} fill="rgba(0,0,0,0.18)" />
          {[6, 5, 4, 3, 2, 1].map((d) => (
            <text key={d} x={cx + d} y={cy - 2 + d * 0.5} fill={shade(base, -0.35)}>
              {txt}
            </text>
          ))}
          <text x={cx} y={cy - 2} fill={base} stroke="#FFF3C4" strokeWidth={1.2}>
            {txt}
          </text>
        </g>
      ),
    });
  }

  // ---------- scritta ----------
  if (hasText) {
    const v = hasCenter ? (config.shape === "cuore" ? 0.42 : 0.55) : 0.05;
    const [cx, cy] = at(0, v);
    const text = config.lettering.text;
    const maxW = top.R * (hasCenter ? 1.3 : 1.7);
    const fs = Math.max(11, Math.min(34, (maxW / Math.max(4, text.length)) * 1.9));
    items.push({
      depth: v,
      node: (
        <text
          key="txt"
          x={0}
          y={0}
          transform={`translate(${cx} ${cy}) scale(1 ${0.62})`}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-script), cursive"
          fontSize={fs}
          fill={letteringHex}
          stroke={isDark(letteringHex) ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.4)"}
          strokeWidth={2.2}
          paintOrder="stroke"
          fontWeight={700}
        >
          {text}
        </text>
      ),
    });
  }

  items.sort((a, b) => a.depth - b.depth);

  return (
    <svg viewBox={`0 ${VIEW_Y} ${VIEW_W} ${VIEW_H}`} role="img" aria-label="Anteprima della torta" style={{ display: "block" }}>
      <defs>
        {[...gradients.entries()].map(([color, id]) => (
          <linearGradient key={id} id={id} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={shade(color, -0.22)} />
            <stop offset="0.35" stopColor={shade(color, 0.06)} />
            <stop offset="0.6" stopColor={color} />
            <stop offset="1" stopColor={shade(color, -0.28)} />
          </linearGradient>
        ))}
        <radialGradient id={`${uid}plate`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E2DACB" />
        </radialGradient>
      </defs>

      {/* alzatina */}
      <ellipse cx={VIEW_W / 2} cy={PLATE_Y + 10} rx={R0 * 1.18 + 14} ry={(R0 * 1.18 + 14) * K} fill="rgba(0,0,0,0.08)" />
      <ellipse cx={VIEW_W / 2} cy={PLATE_Y} rx={R0 * 1.14 + 12} ry={(R0 * 1.14 + 12) * K} fill={`url(#${uid}plate)`} stroke="#D3C9B8" strokeWidth={1} />

      {config.shape ? (
        <>
          {tierNodes}
          <g>{items.map((it) => it.node)}</g>
        </>
      ) : (
        <text x={VIEW_W / 2} y={VIEW_Y + VIEW_H / 2 - 20} textAnchor="middle" fontSize={17} fill="#8A7F73" fontFamily="var(--font-body), sans-serif">
          Scegli la forma per iniziare
        </text>
      )}
    </svg>
  );
}

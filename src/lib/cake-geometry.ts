import type { ShapeId } from "./catalog";

export type Pt = [number, number];

/** Contorno della torta vista dall'alto, in unità normalizzate (v positivo = verso chi guarda). */
export function shapePolygon(shape: ShapeId): Pt[] {
  switch (shape) {
    case "rotonda":
      return Array.from({ length: 96 }, (_, i) => {
        const a = (i / 96) * Math.PI * 2;
        return [Math.cos(a), Math.sin(a)];
      });
    case "quadrata":
      return roundedRect(0.9, 0.9, 0.1);
    case "rettangolare":
      return roundedRect(1.25, 0.8, 0.1);
    case "cuore":
      return Array.from({ length: 120 }, (_, i) => {
        const t = (i / 120) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        // punta verso chi guarda
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
    for (let i = 0; i <= 8; i++) {
      const a = a0 + (i / 8) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

export function inside(poly: Pt[], [u, v]: Pt): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i];
    const [uj, vj] = poly[j];
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) c = !c;
  }
  return c;
}

/** Punti equidistanti lungo il contorno (per bordini, colate, anelli di decorazioni) */
export function alongOutline(poly: Pt[], count: number, scale = 1): Pt[] {
  const seg = poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  });
  const total = seg.reduce((a, b) => a + b, 0);
  const out: Pt[] = [];
  let i = 0;
  let acc = 0;
  for (let k = 0; k < count; k++) {
    const d = (k / count) * total;
    while (acc + seg[i] < d) acc += seg[i++];
    const t = (d - acc) / seg[i];
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    out.push([(p[0] + (q[0] - p[0]) * t) * scale, (p[1] + (q[1] - p[1]) * t) * scale]);
  }
  return out;
}

export function perimeter(poly: Pt[]): number {
  return poly.reduce((s, p, i) => {
    const q = poly[(i + 1) % poly.length];
    return s + Math.hypot(q[0] - p[0], q[1] - p[1]);
  }, 0);
}

/** Generatore pseudo-casuale deterministico: le decorazioni non "saltano" a ogni render */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(pct < 0 ? c * (1 + pct) : c + (255 - c) * pct)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

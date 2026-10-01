"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Catalog } from "@/lib/catalog";
import type { CakeConfig } from "@/lib/order";
import { alongOutline, inside, perimeter, rng, shade, shapePolygon, type Pt } from "@/lib/cake-geometry";

/*
 * Anteprima 3D "all'incirca" della torta (three.js via React Three Fiber).
 * Ogni piano è il contorno della forma estruso in verticale; decorazioni e topper
 * sono primitive semplici posizionate sul piano superiore. Si ruota trascinando.
 */

const NEUTRAL = "#DDD5C8"; // parti non ancora scelte
const CHOCO = "#4A2A1A";

interface Props {
  catalog: Catalog;
  config: CakeConfig;
  imageUrl?: string | null;
}

interface Tier {
  R: number;
  H: number;
  y0: number;
}

export default function Cake3D({ catalog, config, imageUrl }: Props) {
  const poly = useMemo(() => shapePolygon(config.shape ?? "rotonda"), [config.shape]);

  const sizeIdx = config.size ? Math.max(0, catalog.sizes.findIndex((s) => s.id === config.size)) : 1;
  const tierCount = catalog.tiers.find((t) => t.id === config.tiers)?.tiers ?? 1;
  const R0 = (1 + sizeIdx * 0.13) * (config.shape === "rettangolare" ? 0.82 : 1);
  const H0 = tierCount === 1 ? 0.72 : tierCount === 2 ? 0.62 : 0.54;
  const tiers: Tier[] = [];
  let y = 0.06; // spessore alzatina
  for (let i = 0; i < tierCount; i++) {
    const t = { R: R0 * Math.pow(0.7, i), H: H0 * Math.pow(0.92, i), y0: y };
    tiers.push(t);
    y += t.H;
  }
  const topY = y;

  const sponge = catalog.sponges.find((s) => s.id === config.sponge)?.color ?? NEUTRAL;
  const filling = catalog.fillings.find((f) => f.id === config.filling)?.color ?? shade(NEUTRAL, 0.35);
  const covering = catalog.coverings.find((c) => c.id === config.covering);
  const kind = covering?.kind ?? "naked";
  const coverColor =
    covering?.fixedColor ?? catalog.colors.find((c) => c.id === config.coveringColor)?.hex ?? "#FAF7F2";

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2.3, 3.9], fov: 34 }}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      style={{ touchAction: "none" }}
    >
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#d9c8ad", 0.7]} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-4, 2, -3]} intensity={0.45} />

      {/* alzatina */}
      <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[R0 * 1.22 + 0.12, R0 * 1.18 + 0.12, 0.06, 96]} />
        <meshStandardMaterial color="#FBF8F3" roughness={0.25} metalness={0.05} />
      </mesh>
      <ContactShadows position={[0, -0.001, 0]} opacity={0.35} scale={6} blur={2.6} far={2} />

      {config.shape &&
        tiers.map((t, i) => (
          <TierMesh
            key={i}
            poly={poly}
            tier={t}
            kind={kind}
            coverColor={coverColor}
            sponge={sponge}
            filling={filling}
            isTop={i === tiers.length - 1}
            drip={i === tiers.length - 1 && config.garnishes.includes("drip")}
          />
        ))}

      {config.shape && (
        <TopDecorations
          catalog={catalog}
          config={config}
          poly={poly}
          R={tiers[tiers.length - 1].R}
          topY={topY}
          kind={kind}
          coverColor={coverColor}
          imageUrl={imageUrl}
        />
      )}

      <FitCamera R={R0} height={topY} />
      <OrbitControls
        makeDefault
        target={[0, Math.min(topY * 0.55, 0.9), 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.25}
        maxPolarAngle={1.45}
        autoRotate
        autoRotateSpeed={0.7}
        enableDamping
      />
    </Canvas>
  );
}

/** Allontana/avvicina la camera quando cambiano dimensione o numero di piani, mantenendo l'angolo */
function FitCamera({ R, height }: { R: number; height: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useEffect(() => {
    if (!controls) return;
    const aspect = size.width / Math.max(1, size.height);
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitWidth = (R * 1.4) / half / Math.min(1, aspect);
    const fitHeight = (height * 0.75 + 0.3) / half;
    const dist = Math.max(fitWidth, fitHeight) + R;
    const offset = camera.position.clone().sub(controls.target).setLength(dist);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }, [camera, controls, size, R, height]);
  return null;
}

// ---------- piani ----------

/** Estrude il contorno: base a y=0, cima a y=h, centrato in x/z */
function useSlab(poly: Pt[], R: number, h: number, bevel: number) {
  return useMemo(() => {
    const shape = new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u * R, -v * R)));
    const b = Math.min(bevel, h / 3);
    let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, h - 2 * b),
      bevelEnabled: b > 0,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 3,
      curveSegments: 4,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, b, 0);
    g.deleteAttribute("uv");
    g = mergeVertices(g, 1e-4);
    g.computeVertexNormals();
    return g;
  }, [poly, R, h, bevel]);
}

function Slab({ poly, R, y0, h, color, roughness = 0.8, bevel = 0.02, metalness = 0 }: {
  poly: Pt[];
  R: number;
  y0: number;
  h: number;
  color: string;
  roughness?: number;
  bevel?: number;
  metalness?: number;
}) {
  const geom = useSlab(poly, R, h, bevel);
  useEffect(() => () => geom.dispose(), [geom]);
  return (
    <mesh geometry={geom} position={[0, y0, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

function TierMesh({ poly, tier, kind, coverColor, sponge, filling, isTop, drip }: {
  poly: Pt[];
  tier: Tier;
  kind: string;
  coverColor: string;
  sponge: string;
  filling: string;
  isTop: boolean;
  drip: boolean;
}) {
  const { R, H, y0 } = tier;
  const parts: ReactNode[] = [];

  if (kind === "naked") {
    // strati visibili: pan di spagna / crema alternati
    const bands = 5;
    const bh = H / bands;
    for (let i = 0; i < bands; i++) {
      const isCream = i % 2 === 1;
      parts.push(
        <Slab
          key={i}
          poly={poly}
          R={isCream ? R * 0.985 : R}
          y0={y0 + i * bh}
          h={bh + 0.002}
          color={isCream ? filling : sponge}
          roughness={isCream ? 0.6 : 0.95}
          bevel={isCream ? 0.005 : 0.012}
        />,
      );
    }
    parts.push(<Slab key="cap" poly={poly} R={R * 0.97} y0={y0 + H} h={0.025} color={filling} roughness={0.55} bevel={0.01} />);
  } else {
    const roughness = kind === "pdz" ? 0.55 : kind === "ganache" ? 0.28 : 0.85;
    parts.push(<Slab key="body" poly={poly} R={R} y0={y0} h={H} color={coverColor} roughness={roughness} bevel={kind === "pdz" ? 0.035 : 0.03} />);
  }

  // bordino di panna/buttercream alla base
  if (kind === "panna" || kind === "buttercream") {
    const n = Math.round((perimeter(poly) * R) / 0.085);
    alongOutline(poly, n, 1.0).forEach(([u, v], i) =>
      parts.push(
        <mesh key={`b${i}`} position={[u * R, y0 + 0.04, v * R]} scale={[1, 0.8, 1]} castShadow>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshStandardMaterial color={shade(coverColor, 0.15)} roughness={0.85} />
        </mesh>,
      ),
    );
  }

  // colata di cioccolato
  if (isTop && drip) {
    parts.push(<Slab key="dripcap" poly={poly} R={R * 1.005} y0={y0 + H - 0.01} h={0.04} color={CHOCO} roughness={0.25} bevel={0.015} />);
    const r = rng(7);
    const n = Math.round((perimeter(poly) * R) / 0.11);
    alongOutline(poly, n, 1.0).forEach(([u, v], i) => {
      const len = 0.06 + r() * H * 0.45;
      const len2 = Math.max(0.001, len - 0.07);
      parts.push(
        <mesh key={`d${i}`} position={[u * R * 1.004, y0 + H - len / 2, v * R * 1.004]} castShadow>
          <capsuleGeometry args={[0.035, len2, 4, 8]} />
          <meshStandardMaterial color={CHOCO} roughness={0.25} />
        </mesh>,
      );
    });
  }

  return <group>{parts}</group>;
}

// ---------- decorazioni ----------

function TopDecorations({ catalog, config, poly, R, topY, kind, coverColor, imageUrl }: {
  catalog: Catalog;
  config: CakeConfig;
  poly: Pt[];
  R: number;
  topY: number;
  kind: string;
  coverColor: string;
  imageUrl?: string | null;
}) {
  const items: ReactNode[] = [];
  const surf = topY + (kind === "naked" ? 0.025 : config.garnishes.includes("drip") ? 0.03 : 0);
  const pos = (u: number, v: number, dy = 0): [number, number, number] => [u * R, surf + dy, v * R];
  const hasCenter = config.topper.type !== "none";
  const hasText = config.lettering.text.trim().length > 0;

  // anelli sul bordo
  const ringKinds = config.garnishes.filter((g) => ["frutta", "macarons", "rosette"].includes(g));
  ringKinds.forEach((g, ri) => {
    const s = [0.8, 0.58, 0.4][ri];
    const spacing = g === "macarons" ? 0.17 : 0.14;
    const n = Math.max(6, Math.round((perimeter(poly) * R * s) / spacing));
    alongOutline(poly, n, s).forEach(([u, v], i) => {
      const p = pos(u, v);
      if (g === "frutta") items.push(i % 3 === 2 ? <Blueberry key={`${g}${i}`} p={p} /> : <Strawberry key={`${g}${i}`} p={p} />);
      else if (g === "macarons") items.push(<Macaron key={`${g}${i}`} p={p} color={["#F4B6C2", "#B5E3D8", "#F9E3A1", "#D8C4F0"][i % 4]} />);
      else items.push(<Rosette key={`${g}${i}`} p={p} color={kind === "naked" || kind === "ganache" ? "#FFF8EE" : shade(coverColor, 0.25)} />);
    });
  });

  const scatter = (seed: number, n: number, avoidCenter: boolean) => {
    const r = rng(seed);
    const pts: Pt[] = [];
    let guard = 0;
    while (pts.length < n && guard++ < n * 50) {
      const p: Pt = [(r() * 2 - 1) * 1.25, r() * 2 - 1];
      if (!inside(poly, [p[0] / 0.82, p[1] / 0.82])) continue;
      if (avoidCenter && Math.hypot(p[0], p[1]) < 0.42) continue;
      pts.push(p);
    }
    return pts;
  };

  if (config.garnishes.includes("perle"))
    scatter(11, 50, false).forEach(([u, v], i) =>
      items.push(
        <mesh key={`p${i}`} position={pos(u, v, 0.015)} castShadow>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshStandardMaterial color={i % 3 ? "#FFFDF7" : "#E7C873"} roughness={0.2} metalness={i % 3 ? 0.1 : 0.8} />
        </mesh>,
      ),
    );
  if (config.garnishes.includes("scaglie"))
    scatter(23, 30, false).forEach(([u, v], i) =>
      items.push(
        <mesh key={`s${i}`} position={pos(u, v, 0.008)} rotation={[0.2 * (i % 3), i * 0.9, 0.15 * (i % 2)]} castShadow>
          <boxGeometry args={[0.08, 0.012, 0.03]} />
          <meshStandardMaterial color={i % 2 ? "#3B2215" : "#5C3A24"} roughness={0.5} />
        </mesh>,
      ),
    );
  if (config.garnishes.includes("oro"))
    scatter(31, 8, hasCenter).forEach(([u, v], i) =>
      items.push(
        <mesh key={`o${i}`} position={pos(u, v, 0.006)} rotation={[-Math.PI / 2 + 0.25, 0, i * 1.3]}>
          <circleGeometry args={[0.05, 5]} />
          <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.25} side={THREE.DoubleSide} />
        </mesh>,
      ),
    );
  if (config.garnishes.includes("meringhe"))
    scatter(41, 9, hasCenter || hasText).forEach(([u, v], i) => items.push(<Meringue key={`m${i}`} p={pos(u, v)} color={i % 2 ? "#FFFFFF" : "#FBE3EA"} />));
  if (config.garnishes.includes("fiori")) {
    const cols = ["#F28DB2", "#FFFFFF", "#F7C948", "#B794F4"];
    const umin = Math.min(...poly.map((p) => p[0]));
    for (let i = 0; i < 6; i++) {
      const u = umin * 0.55 + (i % 3) * 0.14;
      const v = -0.45 + Math.floor(i / 3) * 0.18;
      items.push(<Flower key={`f${i}`} p={pos(u, v)} color={cols[i % cols.length]} />);
    }
  }

  // topper
  const centerV = hasText ? -0.15 : 0;
  if (config.topper.type === "image")
    items.push(<PrintedImage key="img" p={pos(0, centerV, 0.004)} R={R} round={config.topper.imageShape === "tonda"} url={imageUrl} />);
  if (config.topper.type === "model") {
    const m = catalog.toppers.models.find((x) => x.id === config.topper.model);
    if (m) items.push(<Billboard key="model" p={pos(0, centerV)} height={Math.min(0.75, R * 0.7)} kind="emoji" text={m.emoji} />);
  }
  if (config.topper.type === "number")
    items.push(
      <Billboard key="num" p={pos(0, centerV)} height={Math.min(0.8, R * 0.75)} kind="number" text={config.topper.number} />,
    );

  // scritta
  if (hasText)
    items.push(
      <Lettering
        key="txt"
        p={pos(0, hasCenter ? (config.shape === "cuore" ? 0.42 : 0.55) : 0.05, 0.006)}
        width={R * (hasCenter ? 1.3 : 1.7)}
        text={config.lettering.text}
        color={catalog.colors.find((c) => c.id === config.lettering.color)?.hex ?? "#FFFFFF"}
      />,
    );

  return <group>{items}</group>;
}

type V3 = [number, number, number];

function Strawberry({ p }: { p: V3 }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.055, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.05, 0.1, 14]} />
        <meshStandardMaterial color="#D7263D" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.11, 0]} castShadow>
        <coneGeometry args={[0.035, 0.02, 6]} />
        <meshStandardMaterial color="#3E8E41" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Blueberry({ p }: { p: V3 }) {
  return (
    <mesh position={[p[0], p[1] + 0.032, p[2]]} castShadow>
      <sphereGeometry args={[0.034, 14, 12]} />
      <meshStandardMaterial color="#2E3A7A" roughness={0.4} />
    </mesh>
  );
}

function Macaron({ p, color }: { p: V3; color: string }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.018, 0]} castShadow>
        <cylinderGeometry args={[0.062, 0.066, 0.034, 20]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.043, 0]}>
        <cylinderGeometry args={[0.056, 0.056, 0.018, 20]} />
        <meshStandardMaterial color="#FFF6E8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.068, 0]} castShadow>
        <cylinderGeometry args={[0.066, 0.062, 0.034, 20]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Rosette({ p, color }: { p: V3; color: string }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.03, 0]} scale={[1, 0.65, 1]} castShadow>
        <sphereGeometry args={[0.055, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.075, 0]} castShadow>
        <coneGeometry args={[0.035, 0.06, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

function Meringue({ p, color }: { p: V3; color: string }) {
  return (
    <group position={p}>
      <mesh position={[0, 0.02, 0]} scale={[1, 0.5, 1]} castShadow>
        <sphereGeometry args={[0.05, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.06, 0]} castShadow>
        <coneGeometry args={[0.045, 0.08, 14]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Flower({ p, color }: { p: V3; color: string }) {
  return (
    <group position={[p[0], p[1] + 0.012, p[2]]}>
      {Array.from({ length: 5 }, (_, k) => {
        const a = (k / 5) * Math.PI * 2;
        return (
          <mesh key={k} position={[Math.cos(a) * 0.035, 0, Math.sin(a) * 0.035]} rotation={[0, -a, 0]} scale={[1.4, 0.35, 0.9]} castShadow>
            <sphereGeometry args={[0.025, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.008, 0]}>
        <sphereGeometry args={[0.018, 10, 8]} />
        <meshStandardMaterial color="#F6B93B" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ---------- topper ----------

/** Cialda stampata: disco o rettangolo sottile con l'immagine sulla faccia superiore */
function PrintedImage({ p, R, round, url }: { p: V3; R: number; round: boolean; url?: string | null }) {
  const w = R * (round ? 0.52 : 0.6);
  const d = round ? w : w * 0.72;

  const placeholder = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#EFE6D3";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#8C6D3B";
    ctx.font = "500 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("la tua foto", 128, 138);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => placeholder.dispose(), [placeholder]);

  const [loaded, setLoaded] = useState<{ key: string; tex: THREE.Texture } | null>(null);
  const key = `${url}|${w}|${d}`;
  useEffect(() => {
    if (!url) return;
    const tex = new THREE.TextureLoader().load(url, (t) => {
      // effetto "cover": ritaglia l'immagine sulle proporzioni della cialda
      const img = t.image as HTMLImageElement;
      const imgRatio = img.width / img.height;
      const boxRatio = w / d;
      if (imgRatio > boxRatio) {
        t.repeat.set(boxRatio / imgRatio, 1);
        t.offset.set((1 - boxRatio / imgRatio) / 2, 0);
      } else {
        t.repeat.set(1, imgRatio / boxRatio);
        t.offset.set(0, (1 - imgRatio / boxRatio) / 2);
      }
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      setLoaded({ key: `${url}|${w}|${d}`, tex: t });
    });
    return () => tex.dispose();
  }, [url, w, d]);
  const texture = url && loaded?.key === key ? loaded.tex : placeholder;

  const side = <meshStandardMaterial attach="material-0" color="#F3EDE2" roughness={0.6} />;
  return round ? (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[w, w, 0.008, 64]} />
      {side}
      <meshStandardMaterial attach="material-1" map={texture} roughness={0.55} />
      <meshStandardMaterial attach="material-2" color="#F3EDE2" />
    </mesh>
  ) : (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={[w * 2, 0.008, d * 2]} />
      {[0, 1, 3, 4, 5].map((i) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color="#F3EDE2" roughness={0.6} />
      ))}
      <meshStandardMaterial attach="material-2" map={texture} roughness={0.55} />
    </mesh>
  );
}

/**
 * Elemento "in piedi" disegnato su canvas che ruota sempre verso la camera (solo attorno all'asse Y).
 * I numeri impilano più strati per dare spessore.
 */
function Billboard({ p, height, kind, text }: { p: V3; height: number; kind: "emoji" | "number"; text: string }) {
  const depth = kind === "number" ? 10 : 1;
  const group = useRef<THREE.Group>(null);
  const [tex, setTex] = useState<{ front: THREE.Texture; back: THREE.Texture } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const make = (back: boolean) => {
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      const ctx = c.getContext("2d")!;
      if (kind === "emoji") drawEmoji(ctx, 512, text);
      else drawNumber(ctx, 512, text, back);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };
    let made: { front: THREE.Texture; back: THREE.Texture } | null = null;
    (kind === "number" ? loadFont(`900 64px ${cssFont("--font-display", "Georgia")}`) : Promise.resolve()).then(() => {
      if (cancelled) return;
      made = { front: make(false), back: make(true) };
      setTex(made);
    });
    return () => {
      cancelled = true;
      made?.front.dispose();
      made?.back.dispose();
    };
  }, [kind, text]);

  useFrame(({ camera }) => {
    if (group.current) group.current.rotation.y = Math.atan2(camera.position.x - p[0], camera.position.z - p[2]);
  });

  if (!tex) return null;
  const layers = Array.from({ length: depth }, (_, i) => i);
  return (
    <group ref={group} position={[p[0], p[1] + height / 2, p[2]]}>
      {layers.map((i) => (
        <mesh key={i} position={[0, 0, -0.006 * (depth - 1 - i)]} castShadow>
          <planeGeometry args={[height, height]} />
          <meshStandardMaterial
            map={i === depth - 1 ? tex.front : tex.back}
            transparent
            alphaTest={0.4}
            roughness={0.35}
            metalness={i === depth - 1 && depth > 1 ? 0.35 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function loadFont(spec: string): Promise<unknown> {
  return document.fonts.load(spec).catch(() => undefined);
}

function cssFont(variable: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v || fallback;
}

function drawEmoji(ctx: CanvasRenderingContext2D, s: number, emoji: string) {
  ctx.clearRect(0, 0, s, s);
  ctx.font = `${s * 0.82}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(emoji, s / 2, s * 0.86);
}

function drawNumber(ctx: CanvasRenderingContext2D, s: number, text: string, back: boolean) {
  ctx.clearRect(0, 0, s, s);
  const family = cssFont("--font-display", "Georgia, serif");
  const size = text.length > 1 ? s * 0.78 : s * 0.95;
  ctx.font = `900 ${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (back) {
    ctx.fillStyle = "#9C7A3C";
  } else {
    const g = ctx.createLinearGradient(0, s * 0.1, 0, s);
    g.addColorStop(0, "#F6DE96");
    g.addColorStop(0.5, "#E3B341");
    g.addColorStop(1, "#B98A2E");
    ctx.fillStyle = g;
  }
  ctx.fillText(text, s / 2, s * 0.96);
}

/** Scritta "appoggiata" sulla superficie della torta */
function Lettering({ p, width, text, color }: { p: V3; width: number; text: string; color: string }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const aspect = 4;

  useEffect(() => {
    let cancelled = false;
    let t: THREE.Texture | null = null;
    const family = cssFont("--font-script", "cursive");
    // il font corsivo non è usato altrove nella pagina: va caricato esplicitamente
    loadFont(`700 64px ${family}`).then(() => {
      if (cancelled) return;
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 1024 / aspect;
      const ctx = c.getContext("2d")!;
      let size = 150;
      ctx.font = `700 ${size}px ${family}`;
      while (ctx.measureText(text).width > c.width * 0.94 && size > 30) {
        size -= 6;
        ctx.font = `700 ${size}px ${family}`;
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const n = parseInt(color.slice(1), 16);
      const dark = ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 110;
      ctx.lineWidth = 10;
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.85)" : "rgba(60,40,30,0.55)";
      ctx.strokeText(text, c.width / 2, c.height / 2);
      ctx.fillStyle = color;
      ctx.fillText(text, c.width / 2, c.height / 2);
      t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      setTex(t);
    });
    return () => {
      cancelled = true;
      t?.dispose();
    };
  }, [text, color]);

  if (!tex) return null;
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, width / aspect]} />
      <meshStandardMaterial map={tex} transparent alphaTest={0.3} roughness={0.5} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

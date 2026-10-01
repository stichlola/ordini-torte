// Logo Artigiana Fiume in SVG: "mark" = solo cuore, "full" = cuore + scritta
const BG = "#392D2D";
const GOLD = "#B89B6E";

function Heart() {
  return (
    <>
      <path d="M50 78 L25 53 A17.5 17.5 0 0 1 50 28 C58 23 70 25 76 33 C79 37 80 42 79 47 Z" fill={GOLD} />
      <circle cx="76" cy="47" r="4.6" fill={GOLD} />
      <path d="M51 25 C38 31 38 51 47 53 C55 55 59 44 70.5 44.5" fill="none" stroke={BG} strokeWidth="5.2" strokeLinecap="round" />
    </>
  );
}

export default function Logo({ variant = "mark", size = 40 }: { variant?: "mark" | "full"; size?: number }) {
  if (variant === "mark") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Artigiana Fiume" style={{ display: "block", flexShrink: 0 }}>
        <rect width="100" height="100" rx="18" fill={BG} />
        <g transform="translate(0 -3)">
          <Heart />
        </g>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Artigiana Fiume" style={{ display: "block", flexShrink: 0 }}>
      <rect width="100" height="100" rx="14" fill={BG} />
      <g transform="translate(23 2) scale(0.54)">
        <Heart />
      </g>
      <g fill={GOLD} textAnchor="middle" fontFamily="var(--font-display), Georgia, serif">
        <text x="50" y="66" fontSize="12.5" letterSpacing="0.4">artigiana</text>
        <text x="50" y="78" fontSize="12.5" letterSpacing="0.4">fiume</text>
        <text x="50" y="89" fontSize="3.4" letterSpacing="0.9" fontFamily="var(--font-body), sans-serif" fontWeight="500">
          PASTICCERIA · GELATERIA · CAFFETTERIA
        </text>
      </g>
    </svg>
  );
}

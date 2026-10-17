// Logo neutro della demo: torta a due piani, da sostituire con quello della pasticceria
const BG = "#392D2D";
const GOLD = "#B89B6E";

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="La tua pasticceria" style={{ display: "block", flexShrink: 0 }}>
      <rect width="100" height="100" rx="18" fill={BG} />
      <g fill={GOLD}>
        <rect x="47" y="16" width="6" height="12" rx="3" />
        <rect x="34" y="31" width="32" height="18" rx="4" />
        <rect x="22" y="53" width="56" height="22" rx="5" />
        <rect x="16" y="78" width="68" height="5" rx="2.5" />
      </g>
      <path d="M22 62 Q29 67 36 62 T50 62 T64 62 T78 62" fill="none" stroke={BG} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M34 39 Q42 44 50 39 T66 39" fill="none" stroke={BG} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

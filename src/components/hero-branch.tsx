type Leaf = { x: number; y: number; rotate: number; length: number };

const LEAVES: Leaf[] = [
  { x: 35, y: 266, rotate: -6, length: 28 },
  { x: 63, y: 222, rotate: 64, length: 36 },
  { x: 90, y: 177, rotate: -8, length: 42 },
  { x: 117, y: 132, rotate: 62, length: 40 },
  { x: 144, y: 87, rotate: -10, length: 32 },
  { x: 168, y: 48, rotate: 60, length: 22 },
];

function leafPath(length: number): string {
  const w = length * 0.22;
  const tip = -length;
  return `M0,0 C ${-w},${tip * 0.32} ${-w},${tip * 0.68} 0,${tip} C ${w},${tip * 0.68} ${w},${tip * 0.32} 0,0 Z`;
}

/** Rama decorativa de hojas, estilo line-art dorado. */
export function HeroBranch() {
  return (
    <svg
      viewBox="0 0 200 320"
      width="100%"
      height="100%"
      fill="none"
      stroke="#c49a50"
      strokeWidth={1.4}
      strokeLinecap="round"
    >
      <path d="M20,300 L180,20" />
      {LEAVES.map((leaf, i) => (
        <g key={i} transform={`translate(${leaf.x},${leaf.y}) rotate(${leaf.rotate})`}>
          <path d={leafPath(leaf.length)} />
          <line x1={0} y1={0} x2={0} y2={-leaf.length} />
        </g>
      ))}
    </svg>
  );
}

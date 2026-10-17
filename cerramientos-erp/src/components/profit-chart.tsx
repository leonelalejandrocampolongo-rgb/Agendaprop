"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, MONTH_NAMES } from "@/lib/format";

type Point = { month: number; netCents: number };

// Validados con el script de dataviz (contraste y daltonismo) sobre blanco.
const POSITIVE = "#2a6fb0";
const NEGATIVE = "#d1495b";

const H = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 52 };

function compact(cents: number): string {
  const pesos = cents / 100;
  const abs = Math.abs(pesos);
  const sign = pesos < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** Escala "linda" para el eje: 0, 500K, 1M… */
function niceStep(max: number): number {
  const raw = max / 3;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? pow * 10;
}

/** Barras de ganancia neta por mes, con un tooltip al pasar el mouse o tocar. */
export function ProfitChart({ points, selectedMonth }: { points: Point[]; selectedMonth: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  // Se dibuja al ancho real del contenedor para que el texto no se achique en el celular.
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const values = points.map((p) => p.netCents);
  const maxAbs = Math.max(1, ...values.map(Math.abs));
  const step = niceStep(maxAbs);
  const top = Math.max(step, Math.ceil(Math.max(0, ...values) / step) * step);
  const bottom = Math.min(0, Math.floor(Math.min(0, ...values) / step) * step);
  const innerH = H - PAD.top - PAD.bottom;
  const innerW = W - PAD.left - PAD.right;
  const y = (v: number) => PAD.top + ((top - v) / (top - bottom)) * innerH;
  const band = innerW / points.length;
  const barW = Math.min(24, band * 0.6);
  const ticks: number[] = [];
  for (let v = bottom; v <= top + 1; v += step) ticks.push(v);

  const shown = hover ?? (selectedMonth ? selectedMonth - 1 : null);
  const shortLabels = band < 30;

  return (
    <div ref={boxRef}>
      <p className="mb-2 h-6 text-sm text-steel" aria-live="polite">
        {shown !== null && (
          <>
            {MONTH_NAMES[points[shown].month - 1]}:{" "}
            <span className={`font-semibold tabular-nums ${points[shown].netCents < 0 ? "text-red-700" : "text-ink"}`}>
              {formatMoney(points[shown].netCents)}
            </span>
          </>
        )}
      </p>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label="Ganancia neta de cada mes">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#9aa5b1" : "#e2e6eb"} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#5b6673" className="tabular-nums">
              {compact(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const cx = PAD.left + band * i + band / 2;
          const v = p.netCents;
          const y0 = y(0);
          const y1 = y(v);
          const h = Math.max(Math.abs(y1 - y0), v === 0 ? 0 : 2);
          const r = Math.min(4, h, barW / 2);
          const x = cx - barW / 2;
          // Punta redondeada (4px) y base recta sobre la línea del cero.
          const d =
            v >= 0
              ? `M${x},${y0} V${y0 - h + r} Q${x},${y0 - h} ${x + r},${y0 - h} H${x + barW - r} Q${x + barW},${y0 - h} ${x + barW},${y0 - h + r} V${y0} Z`
              : `M${x},${y0} V${y0 + h - r} Q${x},${y0 + h} ${x + r},${y0 + h} H${x + barW - r} Q${x + barW},${y0 + h} ${x + barW},${y0 + h - r} V${y0} Z`;
          const dim = shown !== null && shown !== i;
          return (
            <g
              key={p.month}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(i)}
              className="cursor-default"
            >
              {/* Zona de toque más grande que la barra */}
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH} fill="transparent" />
              {h > 0 && <path d={d} fill={v >= 0 ? POSITIVE : NEGATIVE} opacity={dim ? 0.45 : 1} />}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill={shown === i ? "#1d2733" : "#5b6673"} fontWeight={shown === i ? 600 : 400}>
                {MONTH_NAMES[p.month - 1].slice(0, shortLabels ? 1 : 3)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

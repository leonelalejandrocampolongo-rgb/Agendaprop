import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { MoneyInputClient } from "@/components/money-input";

// text-base en el celular: con menos de 16px el iPhone hace zoom al tocar el campo.
export const inputClass =
  "w-full rounded-lg border border-steel/30 bg-white px-3 py-2.5 text-base sm:text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function Field({
  label,
  children,
  className = "",
  hint,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-steel mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-steel/80 mt-1">{hint}</span>}
    </label>
  );
}

export function MoneyInput({
  name,
  defaultValue,
  required = true,
}: {
  name: string;
  defaultValue?: number;
  required?: boolean;
}) {
  return <MoneyInputClient name={name} defaultValue={defaultValue} required={required} className={inputClass} />;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-steel max-w-2xl">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-4 sm:p-6 shadow-sm ${className}`}>
      {title && <h2 className="text-lg font-semibold text-ink mb-4">{title}</h2>}
      {children}
    </section>
  );
}

type Tone = "neutral" | "positive" | "negative" | "brand";

export function Stat({
  label,
  cents,
  hint,
  tone = "neutral",
  big = false,
}: {
  label: string;
  cents: number;
  hint?: string;
  tone?: Tone;
  big?: boolean;
}) {
  const color =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-red-700"
        : tone === "brand"
          ? "text-brand-dark"
          : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-sm">
      <p className="text-sm text-steel">{label}</p>
      <p className={`mt-1 font-semibold tracking-tight ${big ? "text-3xl" : "text-2xl"} ${color}`}>
        {formatMoney(cents)}
      </p>
      {hint && <p className="mt-1 text-xs text-steel">{hint}</p>}
    </div>
  );
}

/** Color según el signo, para ganancias que pueden dar negativo. */
export function signTone(cents: number): Tone {
  return cents > 0 ? "positive" : cents < 0 ? "negative" : "neutral";
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-steel py-4">{children}</p>;
}

export const tableClass = "w-full text-sm";
export const thClass = "text-left font-medium text-steel py-2 pr-4 whitespace-nowrap";
export const tdClass = "py-3 pr-4 border-t border-line align-top";

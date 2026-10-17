"use client";

/** "1500000,5" -> "1.500.000,5": puntos de miles mientras se escribe. */
export function formatTyping(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, "");
  const [intPart, ...rest] = cleaned.split(",");
  const int = intPart.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return rest.length ? `${int},${rest.join("").slice(0, 2)}` : int;
}

function initialText(cents: number | undefined): string | undefined {
  if (cents === undefined) return undefined;
  const [int, dec] = (cents / 100).toFixed(2).split(".");
  return formatTyping(dec === "00" ? int : `${int},${dec}`);
}

export function MoneyInputClient({
  name,
  defaultValue,
  required,
  className,
}: {
  name: string;
  defaultValue?: number;
  required: boolean;
  className: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-steel">$</span>
      <input
        name={name}
        inputMode="decimal"
        autoComplete="off"
        required={required}
        placeholder="0"
        defaultValue={initialText(defaultValue)}
        onChange={(e) => {
          // Se reformatea sin volver el input "controlado", así el reset del
          // formulario sigue funcionando.
          e.currentTarget.value = formatTyping(e.currentTarget.value);
        }}
        className={`${className} pl-7 tabular-nums`}
      />
    </div>
  );
}

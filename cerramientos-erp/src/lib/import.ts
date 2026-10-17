import type {
  EmployeePaymentType,
  JobStatus,
  PaymentMethod,
} from "@/lib/db-types";
import { parseMoneyToCents } from "@/lib/format";

/**
 * Importación de planillas viejas (Excel/CSV). Este módulo es puro: lo usa
 * el navegador para la vista previa y el servidor para volver a validar
 * antes de guardar, así los dos interpretan cada celda exactamente igual.
 */

/** Valor de una celda tal como llega al servidor (las fechas ya como texto). */
export type Cell = string | number | boolean | null;

export type ImportKind = "obras" | "cobros" | "gastos" | "sueldos" | "retiros";

type FieldType = "text" | "money" | "date";

export type ImportField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Palabras que, si aparecen en el título de la columna, la delatan. */
  guesses: string[];
};

const DATE_GUESSES = ["fecha", "dia", "date"];
const AMOUNT_GUESSES = ["monto", "importe", "total", "valor", "$", "pesos", "precio"];
const METHOD_FIELD: ImportField = {
  key: "method",
  label: "Forma de pago",
  type: "text",
  guesses: ["forma", "medio", "metodo", "pago con"],
};
const NOTES_FIELD: ImportField = {
  key: "notes",
  label: "Notas",
  type: "text",
  guesses: ["nota", "observ", "coment", "detalle"],
};

export const IMPORT_KINDS: Record<
  ImportKind,
  { label: string; description: string; fields: ImportField[] }
> = {
  obras: {
    label: "Obras / trabajos",
    description:
      "Una fila por obra con el cliente y el precio. Si la planilla tiene lo que ya se cobró de cada obra, se carga como un pago.",
    fields: [
      { key: "clientName", label: "Cliente", type: "text", required: true, guesses: ["cliente", "nombre", "razon"] },
      { key: "description", label: "Trabajo", type: "text", guesses: ["trabajo", "descrip", "detalle", "obra", "abertura"] },
      { key: "price", label: "Precio total", type: "money", required: true, guesses: ["precio", "total", "presupuesto", "monto", "importe", "valor"] },
      { key: "collected", label: "Ya cobrado", type: "money", guesses: ["cobrado", "pagado", "pago", "seña", "sena", "entrega", "abonado"] },
      { key: "status", label: "Estado", type: "text", guesses: ["estado", "situacion"] },
      { key: "startDate", label: "Fecha de inicio", type: "date", guesses: ["inicio", "fecha", "comienzo"] },
      { key: "endDate", label: "Fecha de entrega", type: "date", guesses: ["entrega", "fin", "termin"] },
      { key: "address", label: "Dirección", type: "text", guesses: ["direc", "domicilio", "lugar"] },
      { key: "clientPhone", label: "Teléfono", type: "text", guesses: ["tel", "celular", "whatsapp"] },
      { ...NOTES_FIELD, guesses: ["nota", "observ", "coment"] },
    ],
  },
  cobros: {
    label: "Cobros a clientes",
    description:
      "Señas y pagos que hicieron los clientes. Se asocian a la obra del cliente con el mismo nombre; si no existe, se crea una obra terminada con lo cobrado.",
    fields: [
      { key: "date", label: "Fecha", type: "date", required: true, guesses: DATE_GUESSES },
      { key: "clientName", label: "Cliente", type: "text", required: true, guesses: ["cliente", "nombre", "obra"] },
      { key: "amount", label: "Monto", type: "money", required: true, guesses: ["cobr", "ingreso", "entrada", "haber", ...AMOUNT_GUESSES] },
      METHOD_FIELD,
      NOTES_FIELD,
    ],
  },
  gastos: {
    label: "Gastos del negocio",
    description:
      "Materiales, alquiler, combustible, impuestos… Las categorías que no existan se agregan solas. Si hay una columna de obra/cliente, el gasto se asocia a esa obra.",
    fields: [
      { key: "date", label: "Fecha", type: "date", required: true, guesses: DATE_GUESSES },
      { key: "amount", label: "Monto", type: "money", required: true, guesses: ["gasto", "egreso", "salida", "debe", ...AMOUNT_GUESSES] },
      { key: "category", label: "Categoría", type: "text", guesses: ["categ", "rubro", "tipo", "concepto"] },
      { key: "description", label: "Detalle", type: "text", guesses: ["detalle", "descrip", "proveedor", "item"] },
      { key: "clientName", label: "Obra / cliente", type: "text", guesses: ["obra", "cliente"] },
      METHOD_FIELD,
    ],
  },
  sueldos: {
    label: "Pagos a empleados",
    description:
      "Sueldos, jornales, adelantos, aguinaldos. Los empleados que no existan se crean solos con el nombre de la planilla.",
    fields: [
      { key: "date", label: "Fecha", type: "date", required: true, guesses: DATE_GUESSES },
      { key: "employeeName", label: "Empleado", type: "text", required: true, guesses: ["emplead", "nombre", "operario", "personal"] },
      { key: "amount", label: "Monto", type: "money", required: true, guesses: [...AMOUNT_GUESSES, "sueldo", "jornal", "pagado"] },
      { key: "type", label: "Concepto", type: "text", guesses: ["concepto", "tipo", "motivo"] },
      { key: "clientName", label: "Obra / cliente", type: "text", guesses: ["obra", "cliente"] },
      METHOD_FIELD,
      NOTES_FIELD,
    ],
  },
  retiros: {
    label: "Retiros del dueño",
    description: "La plata que el dueño sacó para él en meses anteriores.",
    fields: [
      { key: "date", label: "Fecha", type: "date", required: true, guesses: DATE_GUESSES },
      { key: "amount", label: "Monto", type: "money", required: true, guesses: ["retiro", ...AMOUNT_GUESSES] },
      METHOD_FIELD,
      NOTES_FIELD,
    ],
  },
};

export function isImportKind(value: string): value is ImportKind {
  return value in IMPORT_KINDS;
}

/** Minúsculas y sin acentos, para comparar textos escritos a mano. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Adivina qué columna corresponde a cada campo mirando los títulos. Cada
 * columna se usa para un solo campo, y gana el campo que la nombra antes
 * en su lista de pistas.
 */
export function guessMapping(kind: ImportKind, headers: string[]): Record<string, number | null> {
  const normalized = headers.map((h) => normalizeText(h));
  const used = new Set<number>();
  const mapping: Record<string, number | null> = {};
  for (const field of IMPORT_KINDS[kind].fields) {
    mapping[field.key] = null;
    for (const guess of field.guesses) {
      const idx = normalized.findIndex((h, i) => !used.has(i) && h.includes(normalizeText(guess)));
      if (idx !== -1) {
        mapping[field.key] = idx;
        used.add(idx);
        break;
      }
    }
  }
  return mapping;
}

/** Primera fila con al menos dos celdas con texto: suele ser la de títulos. */
export function detectHeaderRow(rows: Cell[][]): number {
  const idx = rows.findIndex(
    (row) => row.filter((c) => typeof c === "string" && c.trim() !== "").length >= 2,
  );
  return idx === -1 ? 0 : idx;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function validDate(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  if (y < 1990 || y > 2100) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Fecha de una celda -> "YYYY-MM-DD". Acepta fechas de Excel (que llegan
 * como "YYYY-MM-DD" o como número de serie), "15/03/2025", "15-3-25" y
 * "2025-03-15". Siempre día/mes, como se escribe en Argentina.
 */
export function parseDateCell(value: Cell): string | null {
  if (value === null || typeof value === "boolean") return null;
  if (typeof value === "number") {
    // Número de serie de Excel: días desde el 30/12/1899.
    if (value < 20000 || value > 80000) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return validDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const s = value.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) return validDate(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

/**
 * Monto de una celda -> centavos. Las planillas suelen anotar los gastos en
 * negativo o entre paréntesis, así que se toma el valor absoluto.
 */
export function parseMoneyCell(value: Cell): number | null {
  if (value === null || typeof value === "boolean") return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(Math.abs(value) * 100) : null;
  const s = value.trim().replace(/^\((.*)\)$/, "$1").replace(/^-\s*/, "").replace(/^\$\s*-\s*/, "$");
  return parseMoneyToCents(s);
}

function cellText(value: Cell): string {
  if (value === null) return "";
  return String(value).trim();
}

export function guessPaymentMethod(raw: string): PaymentMethod {
  const s = normalizeText(raw);
  if (s.includes("transf") || s.includes("banco") || s.includes("mercado") || s.includes("mp")) return "transferencia";
  if (s.includes("cheq") || s.includes("echeq")) return "cheque";
  if (s.includes("tarj") || s.includes("debito") || s.includes("credito")) return "tarjeta";
  return "efectivo";
}

export function guessJobStatus(raw: string): JobStatus {
  const s = normalizeText(raw);
  if (s.includes("cancel") || s.includes("anul")) return "cancelado";
  if (s.includes("presup") || s.includes("cotiz")) return "presupuestado";
  if (s.includes("curso") || s.includes("proceso") || s.includes("pendiente") || s.includes("haciendo")) return "en_curso";
  // Lo más común en una planilla histórica es que la obra ya esté hecha.
  return "terminado";
}

export function guessEmployeePaymentType(raw: string): EmployeePaymentType {
  const s = normalizeText(raw);
  if (s.includes("adelan") || s.includes("vale")) return "adelanto";
  if (s.includes("aguin") || s.includes("sac")) return "aguinaldo";
  if (s.includes("carga") || s.includes("art") || s.includes("aporte") || s.includes("931")) return "cargas_sociales";
  if (s.includes("bono") || s.includes("extra") || s.includes("premio")) return "bono";
  return "sueldo";
}

export type ParsedRow = {
  /** Número de fila en la planilla (empezando en 1), para los mensajes. */
  sheetRow: number;
  values: Record<string, string | number | null>;
  error: string | null;
  /** Filas sin monto ni datos: se saltean sin contarlas como error. */
  skipped: boolean;
};

/**
 * Convierte las filas de la planilla en valores listos para guardar según
 * el mapeo de columnas elegido. Las fechas quedan "YYYY-MM-DD" y los montos
 * en centavos.
 */
export function parseRows(
  kind: ImportKind,
  rows: Cell[][],
  mapping: Record<string, number | null>,
  firstSheetRow: number,
): ParsedRow[] {
  const fields = IMPORT_KINDS[kind].fields;
  return rows.map((row, i) => {
    const sheetRow = firstSheetRow + i;
    const values: Record<string, string | number | null> = {};
    let error: string | null = null;
    const raw = (key: string): Cell => {
      const col = mapping[key];
      return col === null || col === undefined ? null : (row[col] ?? null);
    };

    const isEmpty = fields.every((f) => cellText(raw(f.key)) === "");
    const moneyKey = fields.find((f) => f.type === "money" && f.required)?.key;
    // Una fila sin monto (por ejemplo, un renglón de "Ingresos" en una
    // planilla con columnas de ingreso y egreso) no es un error.
    if (isEmpty || (moneyKey && cellText(raw(moneyKey)) === "")) {
      return { sheetRow, values, error: null, skipped: true };
    }

    for (const field of fields) {
      const cell = raw(field.key);
      const text = cellText(cell);
      if (field.type === "money") {
        values[field.key] = text === "" ? null : parseMoneyCell(cell);
        if (text !== "" && values[field.key] === null) error ??= `${field.label}: "${text}" no es un monto válido`;
      } else if (field.type === "date") {
        values[field.key] = text === "" ? null : parseDateCell(cell);
        if (text !== "" && values[field.key] === null) error ??= `${field.label}: "${text}" no es una fecha válida`;
      } else {
        values[field.key] = text || null;
      }
      if (field.required && (values[field.key] === null || values[field.key] === undefined) && !error) {
        error = `Falta ${field.label.toLowerCase()}`;
      }
    }
    if (!error && kind === "obras" && values.collected && !values.startDate && !values.endDate) {
      // Sin fecha no se sabe en qué mes contar esa plata como cobrada.
      error = "Para cargar lo ya cobrado hace falta la fecha de inicio o de entrega";
    }
    return { sheetRow, values, error, skipped: false };
  });
}

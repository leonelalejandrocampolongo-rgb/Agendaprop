"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importSpreadsheet, type ImportResult } from "@/lib/actions";
import { decodeCsvBytes, parseCsv } from "@/lib/csv";
import { formatDate, formatMoney } from "@/lib/format";
import {
  detectHeaderRow,
  guessMapping,
  IMPORT_KINDS,
  parseRows,
  type Cell,
  type ImportKind,
} from "@/lib/import";
import { inputClass } from "@/components/ui";

type Sheet = { name: string; rows: Cell[][] };

const PREVIEW_ROWS = 30;

/** Letra de columna de Excel: 0 -> A, 26 -> AA. */
function columnLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
}

function toCell(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  // read-excel-file devuelve las fechas como Date a medianoche UTC.
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

async function readFile(file: File): Promise<Sheet[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const rows = parseCsv(decodeCsvBytes(await file.arrayBuffer()));
    return [{ name: file.name, rows }];
  }
  if (name.endsWith(".xls")) {
    throw new Error(
      "Los archivos .xls (Excel viejo) no se pueden leer. Abrilo en Excel y usá «Guardar como» → «Libro de Excel (.xlsx)».",
    );
  }
  // Se carga recién al elegir un archivo, para no sumar peso al resto de la app.
  const { default: readExcelFile } = await import("read-excel-file/universal");
  const sheets = await readExcelFile(file);
  return sheets.map((s) => ({ name: s.sheet, rows: s.data.map((row) => row.map(toCell)) }));
}

function formatValue(type: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  if (type === "money") return formatMoney(Number(value));
  if (type === "date") return formatDate(String(value));
  return String(value);
}

export function ImportWizard({
  previousImports,
}: {
  /** Importaciones ya hechas, para avisar si se repite el mismo archivo. */
  previousImports: { kind: string; fileName: string }[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ImportKind>("gastos");
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [readError, setReadError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, startImport] = useTransition();

  const sheet = sheets[sheetIndex];
  const headers = useMemo(
    () => (sheet ? (sheet.rows[headerRow] ?? []).map((c) => String(c ?? "").trim()) : []),
    [sheet, headerRow],
  );
  const columnCount = sheet ? Math.max(0, ...sheet.rows.map((r) => r.length)) : 0;
  const dataRows = useMemo(() => (sheet ? sheet.rows.slice(headerRow + 1) : []), [sheet, headerRow]);
  const fields = IMPORT_KINDS[kind].fields;

  const parsed = useMemo(
    () => (sheet ? parseRows(kind, dataRows, mapping, headerRow + 2) : []),
    [kind, sheet, dataRows, mapping, headerRow],
  );
  const valid = parsed.filter((r) => !r.skipped && !r.error);
  const withErrors = parsed.filter((r) => r.error);
  const missingRequired = fields.filter((f) => f.required && mapping[f.key] == null);
  const alreadyImported = previousImports.some((b) => b.kind === kind && b.fileName === fileName);

  function selectSheet(rows: Cell[][], index: number, k: ImportKind) {
    const header = detectHeaderRow(rows);
    setSheetIndex(index);
    setHeaderRow(header);
    setMapping(guessMapping(k, (rows[header] ?? []).map((c) => String(c ?? ""))));
    setResult(null);
  }

  async function onFile(file: File | undefined) {
    setReadError(null);
    setResult(null);
    setSheets([]);
    if (!file) return;
    try {
      const loaded = await readFile(file);
      const nonEmpty = loaded.filter((s) => s.rows.length > 0);
      if (nonEmpty.length === 0) throw new Error("La planilla está vacía.");
      setFileName(file.name);
      setSheets(nonEmpty);
      selectSheet(nonEmpty[0].rows, 0, kind);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    }
  }

  function changeKind(k: ImportKind) {
    setKind(k);
    setResult(null);
    if (sheet) setMapping(guessMapping(k, headers));
  }

  function changeHeaderRow(row: number) {
    if (!sheet) return;
    const r = Math.min(Math.max(row, 0), sheet.rows.length - 1);
    setHeaderRow(r);
    setMapping(guessMapping(kind, (sheet.rows[r] ?? []).map((c) => String(c ?? ""))));
  }

  function runImport() {
    startImport(async () => {
      const res = await importSpreadsheet({
        kind,
        fileName,
        rows: dataRows,
        mapping,
        firstSheetRow: headerRow + 2,
      });
      setResult(res);
      if (res.summary) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-ink">1. ¿Qué tiene esta planilla?</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(IMPORT_KINDS) as ImportKind[]).map((k) => (
            <label
              key={k}
              className={`block cursor-pointer rounded-lg border p-3 ${
                kind === k ? "border-brand bg-brand/5" : "border-line hover:border-brand/50"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-ink">
                <input type="radio" name="kind" checked={kind === k} onChange={() => changeKind(k)} />
                {IMPORT_KINDS[k].label}
              </span>
              <span className="block mt-1 text-xs text-steel">{IMPORT_KINDS[k].description}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-ink">2. Elegí el archivo</h2>
        <input
          type="file"
          accept=".xlsx,.csv,.xls"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white hover:file:bg-brand-dark"
        />
        <p className="text-xs text-steel">Excel (.xlsx) o CSV. El archivo se lee en tu navegador; solo se guardan las filas que importes.</p>
        {readError && <p role="alert" className="text-sm text-red-700">{readError}</p>}

        {sheet && (
          <div className="flex flex-wrap gap-4">
            {sheets.length > 1 && (
              <label>
                <span className="block text-xs text-steel mb-1">Hoja</span>
                <select
                  value={sheetIndex}
                  onChange={(e) => selectSheet(sheets[Number(e.target.value)].rows, Number(e.target.value), kind)}
                  className={inputClass}
                >
                  {sheets.map((s, i) => (
                    <option key={i} value={i}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span className="block text-xs text-steel mb-1">Los títulos están en la fila</span>
              <input
                type="number"
                min={1}
                max={sheet.rows.length}
                value={headerRow + 1}
                onChange={(e) => changeHeaderRow(Number(e.target.value) - 1)}
                className={`${inputClass} w-24`}
              />
            </label>
          </div>
        )}
      </section>

      {sheet && (
        <section className="rounded-xl border border-line bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-ink">3. ¿Qué columna es cada dato?</h2>
          <p className="text-sm text-steel">
            Ya elegimos según los títulos de tu planilla. Revisalo y corregí lo que haga falta. Los marcados con * son obligatorios.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <label key={field.key} className="block">
                <span className="block text-xs font-medium text-steel mb-1">
                  {field.label}
                  {field.required && " *"}
                </span>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field.key]: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className={`${inputClass} ${field.required && mapping[field.key] == null ? "border-red-400" : ""}`}
                >
                  <option value="">— No está en la planilla —</option>
                  {Array.from({ length: columnCount }, (_, i) => (
                    <option key={i} value={i}>
                      {columnLetter(i)}: {headers[i] || "(sin título)"}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      )}

      {sheet && missingRequired.length === 0 && (
        <section className="rounded-xl border border-line bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-ink">4. Revisá antes de importar</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-emerald-800">
              {valid.length} filas para importar
            </span>
            {withErrors.length > 0 && (
              <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-red-800">
                {withErrors.length} con errores (se saltean)
              </span>
            )}
            <span className="rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1 text-zinc-700">
              {parsed.length - valid.length - withErrors.length} vacías o sin monto (se ignoran)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-medium text-steel py-2 pr-4">Fila</th>
                  {fields
                    .filter((f) => mapping[f.key] != null)
                    .map((f) => (
                      <th key={f.key} className="text-left font-medium text-steel py-2 pr-4 whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {valid.slice(0, PREVIEW_ROWS).map((r) => (
                  <tr key={r.sheetRow}>
                    <td className="py-1.5 pr-4 border-t border-line text-steel">{r.sheetRow}</td>
                    {fields
                      .filter((f) => mapping[f.key] != null)
                      .map((f) => (
                        <td
                          key={f.key}
                          className={`py-1.5 pr-4 border-t border-line ${f.type === "money" ? "tabular-nums whitespace-nowrap" : ""}`}
                        >
                          {formatValue(f.type, r.values[f.key])}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {valid.length > PREVIEW_ROWS && (
              <p className="mt-2 text-xs text-steel">…y {valid.length - PREVIEW_ROWS} filas más.</p>
            )}
          </div>

          {withErrors.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-red-700">Ver filas con errores</summary>
              <ul className="mt-2 space-y-1 text-steel">
                {withErrors.slice(0, 100).map((r) => (
                  <li key={r.sheetRow}>
                    Fila {r.sheetRow}: {r.error}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {alreadyImported && !result?.summary && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Ya importaste un archivo llamado «{fileName}» como {IMPORT_KINDS[kind].label.toLowerCase()}. Si es el
              mismo, importarlo de nuevo duplica los datos.
            </p>
          )}
          {result?.error && <p role="alert" className="text-sm text-red-700">{result.error}</p>}
          {result?.summary ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-1">
              <p className="font-medium">¡Listo! Se importaron {result.summary.created} registros.</p>
              {result.summary.jobsCreated > 0 && (
                <p>Se crearon {result.summary.jobsCreated} obras para clientes que no estaban cargados.</p>
              )}
              {result.summary.employeesCreated > 0 && (
                <p>Se crearon {result.summary.employeesCreated} empleados nuevos.</p>
              )}
              {result.summary.categoriesAdded.length > 0 && (
                <p>Categorías de gastos nuevas: {result.summary.categoriesAdded.join(", ")}.</p>
              )}
              {result.summary.unmatchedJobs > 0 && (
                <p>
                  {result.summary.unmatchedJobs} filas nombraban una obra que no existe y quedaron como generales.
                </p>
              )}
              <p className="text-emerald-800">Si algo no quedó bien, la podés deshacer desde la lista de abajo.</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={runImport}
              disabled={importing || valid.length === 0}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {importing ? "Importando…" : `Importar ${valid.length} filas`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

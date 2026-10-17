import Link from "next/link";
import { getDb } from "@/lib/db";
import { jobFinancials } from "@/lib/finance";
import { formatDate, formatMoney, JOB_STATUS_LABELS } from "@/lib/format";
import type { JobStatus } from "@/lib/db-types";
import { StatusBadge } from "@/components/status-badge";
import { Card, Empty, PageHeader, tableClass, tdClass, thClass } from "@/components/ui";

const FILTERS: { value: JobStatus | "activas" | "todas"; label: string }[] = [
  { value: "activas", label: "Activas" },
  ...(Object.entries(JOB_STATUS_LABELS) as [JobStatus, string][]).map(([value, label]) => ({ value, label })),
  { value: "todas", label: "Todas" },
];

export default async function ObrasPage({ searchParams }: PageProps<"/obras">) {
  const { estado = "activas" } = (await searchParams) as { estado?: string };
  const db = await getDb();

  const jobs = db.jobs
    .filter((j) =>
      estado === "todas"
        ? true
        : estado === "activas"
          ? j.status === "presupuestado" || j.status === "en_curso"
          : j.status === estado,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((job) => ({ job, f: jobFinancials(db, job) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obras"
        description="Cada trabajo con lo que se cobró, lo que falta cobrar y cuánto dejó después de materiales y mano de obra."
        action={{ href: "/obras/nueva", label: "+ Nueva obra" }}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/obras?estado=${f.value}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              estado === f.value
                ? "border-brand bg-brand text-white"
                : "border-line bg-white text-steel hover:border-brand"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        {jobs.length === 0 ? (
          <Empty>
            No hay obras en esta vista.{" "}
            <Link href="/obras/nueva" className="text-brand-dark underline">
              Cargá la primera
            </Link>
            .
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Cliente / trabajo</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass}>Inicio</th>
                  <th className={`${thClass} text-right`}>Precio</th>
                  <th className={`${thClass} text-right`}>Cobrado</th>
                  <th className={`${thClass} text-right`}>Debe</th>
                  <th className={`${thClass} text-right`}>Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(({ job, f }) => (
                  <tr key={job.id}>
                    <td className={tdClass}>
                      <Link href={`/obras/${job.id}`} className="font-medium hover:text-brand-dark">
                        {job.clientName}
                      </Link>
                      <span className="block text-xs text-steel">{job.description}</span>
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={job.status} />
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(job.startDate)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(f.priceCents)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(f.collectedCents)}</td>
                    <td className={`${tdClass} text-right tabular-nums ${f.pendingCents > 0 ? "text-red-700" : ""}`}>
                      {formatMoney(f.pendingCents)}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums ${f.profitCents < 0 ? "text-red-700" : ""}`}>
                      {formatMoney(f.profitCents)}
                      {f.marginPct !== null && (
                        <span className="block text-xs text-steel">{f.marginPct}%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

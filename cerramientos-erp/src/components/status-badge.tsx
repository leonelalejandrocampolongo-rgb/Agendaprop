import type { JobStatus } from "@/lib/db-types";
import { JOB_STATUS_LABELS } from "@/lib/format";

const STYLES: Record<JobStatus, string> = {
  presupuestado: "bg-amber-50 text-amber-800 border-amber-200",
  en_curso: "bg-sky-50 text-sky-800 border-sky-200",
  terminado: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelado: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${STYLES[status]}`}>
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}

import Link from "next/link";
import { getDb } from "@/lib/db";
import { todayDateString } from "@/lib/availability";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const db = await getDb();
  const today = todayDateString();

  const todayAppointments = db.appointments
    .filter((a) => a.date === today && a.status !== "CANCELLED")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pendingCount = db.appointments.filter(
    (a) => a.status === "PENDING",
  ).length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Turnos hoy" value={todayAppointments.length} />
        <StatCard label="Pendientes de confirmar" value={pendingCount} />
        <StatCard label="Servicios activos" value={db.services.filter((s) => s.active).length} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-stone-900">Turnos de hoy</h2>
          <Link href="/admin/turnos" className="text-sm text-rose-700 hover:underline">
            Ver todos →
          </Link>
        </div>

        {todayAppointments.length === 0 ? (
          <p className="text-stone-500 text-sm">No hay turnos para hoy.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {todayAppointments.map((a) => {
              const service = db.services.find((s) => s.id === a.serviceId);
              return (
                <li key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-stone-900">
                      {a.startTime} · {a.clientName}
                    </p>
                    <p className="text-sm text-stone-500">
                      {service?.name ?? "Servicio eliminado"}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={a.status} />
                    {service && (
                      <p className="text-xs text-stone-400 mt-1">
                        {formatPrice(service.priceCents)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-2xl font-semibold text-stone-900">{value}</p>
      <p className="text-sm text-stone-500">{label}</p>
    </div>
  );
}

import Link from "next/link";
import { getDb } from "@/lib/db";
import { EmployeePaymentForm } from "@/components/employee-payment-form";
import { Icon, type IconName } from "@/components/icons";
import { ExpenseForm, JobPaymentPickJobForm, WithdrawalForm } from "@/components/quick-forms";
import { Card, PageHeader } from "@/components/ui";

const OPTIONS: { tipo: string; label: string; hint: string; icon: IconName; href?: string }[] = [
  { tipo: "gasto", label: "Un gasto", hint: "Material, nafta, alquiler…", icon: "gastos" },
  { tipo: "cobro", label: "Un cobro", hint: "Seña o pago de un cliente", icon: "cobro" },
  { tipo: "sueldo", label: "Un pago a un empleado", hint: "Sueldo, jornal, adelanto", icon: "empleados" },
  { tipo: "retiro", label: "Un retiro para mí", hint: "Plata que sacás del negocio", icon: "retiros" },
  { tipo: "obra", label: "Una obra nueva", hint: "Un trabajo con su precio", icon: "obras", href: "/obras/nueva" },
];

export default async function CargarPage({ searchParams }: PageProps<"/cargar">) {
  const { tipo } = (await searchParams) as { tipo?: string };
  const db = await getDb();
  const selected = OPTIONS.find((o) => o.tipo === tipo);
  const activeEmployees = db.employees.filter((e) => e.active);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="¿Qué querés cargar?" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {OPTIONS.map((o) => {
          const active = selected?.tipo === o.tipo;
          return (
            <Link
              key={o.tipo}
              href={o.href ?? `/cargar?tipo=${o.tipo}`}
              aria-current={active ? "true" : undefined}
              className={`flex flex-col gap-2 rounded-2xl border p-4 shadow-sm transition-colors ${
                active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  active ? "bg-white/20" : "bg-brand/10 text-brand-dark"
                }`}
              >
                <Icon name={o.icon} />
              </span>
              <span className="font-semibold leading-tight">{o.label}</span>
              <span className={`text-xs ${active ? "text-white/80" : "text-steel"}`}>{o.hint}</span>
            </Link>
          );
        })}
      </div>

      {selected?.tipo === "gasto" && (
        <Card title="Cargar un gasto">
          <ExpenseForm categories={db.settings.expenseCategories} jobs={db.jobs} />
        </Card>
      )}
      {selected?.tipo === "cobro" &&
        (db.jobs.length === 0 ? (
          <Card>
            <p className="text-sm text-steel">
              Para registrar un cobro primero{" "}
              <Link href="/obras/nueva" className="text-brand-dark underline">
                cargá la obra
              </Link>
              .
            </p>
          </Card>
        ) : (
          <Card title="Registrar un cobro">
            <JobPaymentPickJobForm jobs={db.jobs} />
          </Card>
        ))}
      {selected?.tipo === "sueldo" &&
        (activeEmployees.length === 0 ? (
          <Card>
            <p className="text-sm text-steel">
              Primero{" "}
              <Link href="/empleados" className="text-brand-dark underline">
                agregá a tus empleados
              </Link>
              .
            </p>
          </Card>
        ) : (
          <Card title="Registrar un pago a un empleado">
            <EmployeePaymentForm employees={activeEmployees} jobs={db.jobs} />
          </Card>
        ))}
      {selected?.tipo === "retiro" && (
        <Card title="Registrar un retiro">
          <WithdrawalForm />
        </Card>
      )}
    </div>
  );
}

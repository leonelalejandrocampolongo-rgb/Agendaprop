import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { LogoutRow } from "@/components/logout-row";
import { PageHeader } from "@/components/ui";

const LINKS: { href: string; label: string; hint: string; icon: IconName }[] = [
  { href: "/empleados", label: "Empleados", hint: "Tu equipo y lo que se les paga", icon: "empleados" },
  { href: "/retiros", label: "Mis retiros", hint: "Lo que sacaste para vos", icon: "retiros" },
  { href: "/importar", label: "Importar Excel", hint: "Traer datos de planillas viejas", icon: "importar" },
  { href: "/configuracion", label: "Configuración", hint: "Nombre del negocio, categorías, contraseña", icon: "config" },
];

// Solo se usa en el celular: es el destino del botón "Más" de la barra de abajo.
export default function MasPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Más opciones" />
      <ul className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm divide-y divide-line">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-4 px-4 py-4 hover:bg-surface">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-dark">
                <Icon name={l.icon} />
              </span>
              <span className="flex-1">
                <span className="block font-medium text-ink">{l.label}</span>
                <span className="block text-sm text-steel">{l.hint}</span>
              </span>
              <Icon name="right" className="h-5 w-5 text-steel" />
            </Link>
          </li>
        ))}
        <li>
          <LogoutRow />
        </li>
      </ul>
    </div>
  );
}

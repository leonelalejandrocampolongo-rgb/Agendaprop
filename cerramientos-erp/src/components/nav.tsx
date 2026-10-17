"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Resumen" },
  { href: "/obras", label: "Obras" },
  { href: "/gastos", label: "Gastos" },
  { href: "/empleados", label: "Empleados" },
  { href: "/retiros", label: "Mis retiros" },
  { href: "/configuracion", label: "Configuración" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto max-w-6xl px-4 sm:px-6 flex gap-5 text-sm overflow-x-auto">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`py-3 border-b-2 whitespace-nowrap ${
              active
                ? "border-brand text-brand-dark font-medium"
                : "border-transparent text-steel hover:text-brand-dark"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Icon, type IconName } from "@/components/icons";

type Item = { href: string; label: string; icon: IconName };

const SIDEBAR: Item[] = [
  { href: "/", label: "Resumen", icon: "home" },
  { href: "/obras", label: "Obras", icon: "obras" },
  { href: "/gastos", label: "Gastos", icon: "gastos" },
  { href: "/empleados", label: "Empleados", icon: "empleados" },
  { href: "/retiros", label: "Mis retiros", icon: "retiros" },
  { href: "/importar", label: "Importar Excel", icon: "importar" },
  { href: "/configuracion", label: "Configuración", icon: "config" },
];

// En el celular entran cinco: el resto va en "Más".
const BOTTOM: Item[] = [
  { href: "/", label: "Resumen", icon: "home" },
  { href: "/obras", label: "Obras", icon: "obras" },
  { href: "/cargar", label: "Cargar", icon: "plus" },
  { href: "/gastos", label: "Gastos", icon: "gastos" },
  { href: "/mas", label: "Más", icon: "more" },
];

const MORE_PATHS = ["/mas", "/empleados", "/retiros", "/importar", "/configuracion"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/mas") return MORE_PATHS.some((p) => pathname.startsWith(p));
  return pathname.startsWith(href);
}

const SMALL_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y", "e"]);

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w && !SMALL_WORDS.has(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Logo({ businessName }: { businessName: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white">
      {initials(businessName) || "CA"}
    </span>
  );
}

export function Sidebar({ businessName, userName }: { businessName: string; userName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col border-r border-line bg-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo businessName={businessName} />
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold text-ink leading-tight">{businessName}</p>
          <p className="truncate text-xs text-steel">{userName}</p>
        </div>
      </div>
      <div className="px-3">
        <Link
          href="/cargar"
          className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          <Icon name="plus" className="h-4 w-4" /> Cargar algo
        </Link>
      </div>
      <nav className="mt-4 flex-1 space-y-1 px-3">
        {SIDEBAR.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                active ? "bg-brand/10 font-medium text-brand-dark" : "text-steel hover:bg-surface hover:text-ink"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
        className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-steel hover:bg-surface hover:text-ink"
      >
        <Icon name="logout" /> Cerrar sesión
      </button>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
      aria-label="Menú principal"
    >
      {BOTTOM.map((item) => {
        const active = isActive(pathname, item.href);
        if (item.href === "/cargar") {
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center py-1.5">
              <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30">
                <Icon name="plus" className="h-6 w-6" />
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-brand-dark">{item.label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${
              active ? "font-medium text-brand-dark" : "text-steel"
            }`}
          >
            <Icon name={item.icon} className="h-6 w-6" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

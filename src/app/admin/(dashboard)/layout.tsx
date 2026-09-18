import Link from "next/link";
import { auth } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const NAV = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/turnos", label: "Turnos" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/horarios", label: "Horarios" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-nude bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-cocoa">AgendaProp</p>
            <p className="text-xs text-taupe">
              {session?.user?.name ?? session?.user?.email}
            </p>
          </div>
          <LogoutButton />
        </div>
        <nav className="mx-auto max-w-5xl px-6 flex gap-6 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="py-3 border-b-2 border-transparent text-taupe hover:text-gold-dark hover:border-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}

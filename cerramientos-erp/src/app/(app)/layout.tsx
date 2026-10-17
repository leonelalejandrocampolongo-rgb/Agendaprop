import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { BottomNav, Logo, Sidebar } from "@/components/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [session, db] = await Promise.all([auth(), getDb()]);
  const businessName = db.settings.businessName;
  const userName = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="flex-1 flex min-h-screen">
      <Sidebar businessName={businessName} userName={userName} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
          <Logo businessName={businessName} />
          <p className="truncate font-semibold text-ink">{businessName}</p>
        </header>
        {/* pb-28 en el celular: lugar para la barra de abajo */}
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-28 md:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

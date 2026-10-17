import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { LogoutButton } from "@/components/logout-button";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [session, db] = await Promise.all([auth(), getDb()]);

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink">{db.settings.businessName}</p>
            <p className="text-xs text-steel">{session?.user?.name ?? session?.user?.email}</p>
          </div>
          <LogoutButton />
        </div>
        <Nav />
      </header>
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

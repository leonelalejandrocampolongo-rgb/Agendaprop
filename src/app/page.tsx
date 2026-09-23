import Link from "next/link";
import { getDb } from "@/lib/db";
import { formatDuration, formatPrice } from "@/lib/format";
import { HeroBranch } from "@/components/hero-branch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await getDb();
  const services = db.services
    .filter((s) => s.active && !s.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="flex-1">
      <section className="hero-premium">
        <div className="hero-decoration hero-decoration-left">
          <HeroBranch />
        </div>

        <div className="hero-content">
          <h1>{db.settings.businessName}</h1>

          <div className="hero-divider"></div>

          <p>{db.settings.heroTagline}</p>

          <Link href="/reservar" className="hero-button">
            Reservar turno
            <span>→</span>
          </Link>
        </div>

        <div className="hero-decoration hero-decoration-right">
          <HeroBranch />
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h2 className="text-xl font-semibold text-cocoa mb-6">
            Nuestros servicios
          </h2>

          {services.length === 0 ? (
            <p className="text-taupe">
              Todavía no hay servicios cargados.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="rounded-xl border border-nude bg-white p-5 shadow-sm"
                >
                  <h3 className="font-medium text-cocoa">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="mt-1 text-sm text-taupe">
                      {service.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-taupe">
                      {formatDuration(service.durationMinutes)}
                    </span>
                    <span className="font-medium text-gold-dark">
                      {formatPrice(service.priceCents)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { getDb } from "@/lib/db";
import { formatDuration, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await getDb();
  const services = db.services
    .filter((s) => s.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="flex-1">
      <section className="bg-champagne border-b border-dustypink/30">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold text-cocoa">
            Bienestar Mariana Cabello
          </h1>
          <p className="mt-4 text-taupe max-w-xl mx-auto">
            Reservá tu turno de masajes, tratamientos faciales y estética
            online, en pocos pasos y sin llamadas.
          </p>
          <Link
            href="/reservar"
            className="inline-block mt-8 rounded-full bg-gold px-8 py-3 text-white font-medium hover:bg-gold-dark transition-colors"
          >
            Reservar turno
          </Link>
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

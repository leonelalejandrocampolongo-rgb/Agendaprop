"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatPrice } from "@/lib/format";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  isPack?: boolean;
  packSessionsCount?: number | null;
};

type FormState = {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
  isPack: boolean;
  packSessionsCount: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  durationMinutes: "60",
  price: "",
  isPack: false,
  packSessionsCount: "4",
};

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/services");
    const data = await res.json();
    setServices(data.services ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? "",
      durationMinutes: String(service.durationMinutes),
      price: String(service.priceCents / 100),
      isPack: service.isPack ?? false,
      packSessionsCount: String(service.packSessionsCount ?? 4),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const priceNumber = Number(form.price.replace(",", "."));
    const durationNumber = Number(form.durationMinutes);
    if (!form.name.trim() || !Number.isFinite(priceNumber) || priceNumber < 0) {
      setError("Revisá el nombre y el precio.");
      setSaving(false);
      return;
    }

    if (form.isPack && (!Number(form.packSessionsCount) || Number(form.packSessionsCount) < 2)) {
      setError("La cantidad de sesiones del pack debe ser 2 o más.");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      durationMinutes: durationNumber,
      priceCents: Math.round(priceNumber * 100),
      isPack: form.isPack,
      packSessionsCount: form.isPack ? Number(form.packSessionsCount) : null,
    };

    const res = await fetch(
      editingId ? `/api/admin/services/${editingId}` : "/api/admin/services",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setSaving(false);

    if (!res.ok) {
      setError("No se pudo guardar el servicio.");
      return;
    }

    cancelEdit();
    await load();
  }

  async function toggleActive(service: Service) {
    await fetch(`/api/admin/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !service.active }),
    });
    await load();
  }

  async function remove(service: Service) {
    if (!confirm(`¿Eliminar "${service.name}"?`)) return;
    await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-cocoa">Servicios</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-nude bg-white p-5 space-y-4"
      >
        <h2 className="font-medium text-cocoa">
          {editingId ? "Editar servicio" : "Nuevo servicio"}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-taupe mb-1">
              Nombre
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-taupe mb-1">
              Duración (minutos)
            </label>
            <input
              type="number"
              required
              min={5}
              step={5}
              value={form.durationMinutes}
              onChange={(e) =>
                setForm({ ...form, durationMinutes: e.target.value })
              }
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-taupe mb-1">
              Precio ($)
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-taupe mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isPack"
              checked={form.isPack}
              onChange={(e) => setForm({ ...form, isPack: e.target.checked })}
              className="rounded border-taupe/30"
            />
            <label htmlFor="isPack" className="text-sm text-taupe">
              Es un pack de varias sesiones
            </label>
          </div>
          {form.isPack && (
            <div>
              <label className="block text-sm text-taupe mb-1">
                Cantidad de sesiones del pack
              </label>
              <input
                type="number"
                min={2}
                step={1}
                value={form.packSessionsCount}
                onChange={(e) =>
                  setForm({ ...form, packSessionsCount: e.target.value })
                }
                className="w-full rounded-lg border border-taupe/30 px-3 py-2"
              />
              <p className="mt-1 text-xs text-taupe">
                El precio de arriba es el precio total del pack.
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-white hover:bg-gold-dark disabled:opacity-60"
          >
            {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear servicio"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-taupe/30 px-5 py-2 text-sm text-taupe"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {services === null ? (
        <p className="text-taupe text-sm">Cargando…</p>
      ) : (
        <ul className="divide-y divide-nude rounded-xl border border-nude bg-white">
          {services.map((service) => (
            <li
              key={service.id}
              className="px-4 py-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium text-cocoa flex items-center gap-2">
                  {service.name}
                  {!service.active && (
                    <span className="text-xs rounded-full bg-nude text-taupe px-2 py-0.5">
                      Inactivo
                    </span>
                  )}
                  {service.isPack && (
                    <span className="text-xs rounded-full bg-champagne text-cocoa px-2 py-0.5">
                      Pack x{service.packSessionsCount}
                    </span>
                  )}
                </p>
                <p className="text-sm text-taupe">
                  {formatDuration(service.durationMinutes)} ·{" "}
                  {formatPrice(service.priceCents)}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() => startEdit(service)}
                  className="rounded-full border border-taupe/30 px-3 py-1.5 text-taupe hover:border-gold-light"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(service)}
                  className="rounded-full border border-taupe/30 px-3 py-1.5 text-taupe hover:border-gold-light"
                >
                  {service.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => remove(service)}
                  className="rounded-full border border-taupe/30 px-3 py-1.5 text-red-600 hover:border-red-300"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

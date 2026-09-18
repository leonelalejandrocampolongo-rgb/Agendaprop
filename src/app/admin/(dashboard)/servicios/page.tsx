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
};

type FormState = {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  durationMinutes: "60",
  price: "",
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

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      durationMinutes: durationNumber,
      priceCents: Math.round(priceNumber * 100),
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
      <h1 className="text-xl font-semibold text-stone-900">Servicios</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-stone-200 bg-white p-5 space-y-4"
      >
        <h2 className="font-medium text-stone-900">
          {editingId ? "Editar servicio" : "Nuevo servicio"}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-stone-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1">
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
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-700 mb-1">
              Precio ($)
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-stone-700 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-amber-800 px-5 py-2 text-sm font-medium text-white hover:bg-amber-900 disabled:opacity-60"
          >
            {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear servicio"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-700"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {services === null ? (
        <p className="text-stone-500 text-sm">Cargando…</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {services.map((service) => (
            <li
              key={service.id}
              className="px-4 py-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium text-stone-900 flex items-center gap-2">
                  {service.name}
                  {!service.active && (
                    <span className="text-xs rounded-full bg-stone-200 text-stone-600 px-2 py-0.5">
                      Inactivo
                    </span>
                  )}
                </p>
                <p className="text-sm text-stone-500">
                  {formatDuration(service.durationMinutes)} ·{" "}
                  {formatPrice(service.priceCents)}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() => startEdit(service)}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-stone-700 hover:border-amber-400"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(service)}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-stone-700 hover:border-amber-400"
                >
                  {service.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => remove(service)}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-red-600 hover:border-red-300"
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

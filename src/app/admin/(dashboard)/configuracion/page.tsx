"use client";

import { useEffect, useState } from "react";

type Settings = {
  bufferMinutes: number;
  businessName: string;
  depositAlias: string;
  depositAccountHolder: string;
  depositWhatsappNumber: string;
  businessAddress: string;
};

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    depositAlias: "",
    depositAccountHolder: "",
    depositWhatsappNumber: "",
    businessAddress: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings);
        setForm({
          businessName: data.settings.businessName,
          depositAlias: data.settings.depositAlias,
          depositAccountHolder: data.settings.depositAccountHolder,
          depositWhatsappNumber: data.settings.depositWhatsappNumber,
          businessAddress: data.settings.businessAddress,
        });
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!/^\d+$/.test(form.depositWhatsappNumber)) {
      setError("El WhatsApp debe tener solo números, sin '+' ni espacios (ej: 5491112345678).");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "No se pudo guardar.");
      return;
    }

    const data = await res.json();
    setSettings(data.settings);
    setSaved(true);
  }

  if (!settings) {
    return <p className="text-taupe text-sm">Cargando…</p>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-cocoa">Configuración del negocio</h1>
        <p className="mt-1 text-sm text-taupe">
          Estos datos se muestran en la página pública y en los emails a las
          clientas. Cambiarlos acá no requiere tocar código — sirve para
          adaptar esta misma app a otro profesional o negocio.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-nude bg-white p-5 space-y-4"
      >
        <div>
          <label htmlFor="cfg-business-name" className="block text-sm text-taupe mb-1">
            Nombre del negocio
          </label>
          <input
            id="cfg-business-name"
            type="text"
            required
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            className="w-full rounded-lg border border-taupe/30 px-3 py-2"
          />
          <p className="mt-1 text-xs text-taupe">Se muestra en el título de la página de inicio.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cfg-alias" className="block text-sm text-taupe mb-1">
              Alias de transferencia
            </label>
            <input
              id="cfg-alias"
              type="text"
              required
              value={form.depositAlias}
              onChange={(e) => setForm({ ...form, depositAlias: e.target.value })}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="cfg-holder" className="block text-sm text-taupe mb-1">
              Titular de la cuenta
            </label>
            <input
              id="cfg-holder"
              type="text"
              required
              value={form.depositAccountHolder}
              onChange={(e) => setForm({ ...form, depositAccountHolder: e.target.value })}
              className="w-full rounded-lg border border-taupe/30 px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="cfg-whatsapp" className="block text-sm text-taupe mb-1">
            WhatsApp para comprobantes
          </label>
          <input
            id="cfg-whatsapp"
            type="tel"
            required
            placeholder="5491112345678"
            value={form.depositWhatsappNumber}
            onChange={(e) => setForm({ ...form, depositWhatsappNumber: e.target.value })}
            className="w-full rounded-lg border border-taupe/30 px-3 py-2"
          />
          <p className="mt-1 text-xs text-taupe">
            Formato internacional, solo números (ej: 5491112345678).
          </p>
        </div>

        <div>
          <label htmlFor="cfg-address" className="block text-sm text-taupe mb-1">
            Dirección del local
          </label>
          <input
            id="cfg-address"
            type="text"
            required
            value={form.businessAddress}
            onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
            className="w-full rounded-lg border border-taupe/30 px-3 py-2"
          />
          <p className="mt-1 text-xs text-taupe">
            Se incluye en el email de turno confirmado.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-700">Guardado.</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-white hover:bg-gold-dark disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

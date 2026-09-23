"use client";

import { useEffect, useState } from "react";

type Settings = {
  bufferMinutes: number;
  businessName: string;
  depositAlias: string;
  depositAccountHolder: string;
  depositWhatsappNumber: string;
  businessAddress: string;
  heroTagline: string;
  colorTheme: "dorado" | "barberia" | "neutro" | "spa";
};

const COLOR_THEMES: { id: Settings["colorTheme"]; label: string; swatches: string[] }[] = [
  { id: "dorado", label: "Dorado cálido (spa)", swatches: ["#f8f4ee", "#c9a24a", "#4a3b35"] },
  { id: "barberia", label: "Barbería clásica", swatches: ["#f5f3ef", "#8c6b3f", "#23262b"] },
  { id: "neutro", label: "Profesional neutro", swatches: ["#f7f7f8", "#3e5c76", "#23262b"] },
  { id: "spa", label: "Spa fresco", swatches: ["#f3f8f7", "#4c9c8b", "#2e3a3a"] },
];

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    depositAlias: "",
    depositAccountHolder: "",
    depositWhatsappNumber: "",
    businessAddress: "",
    heroTagline: "",
    colorTheme: "dorado" as Settings["colorTheme"],
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
          heroTagline: data.settings.heroTagline,
          colorTheme: data.settings.colorTheme,
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

        <div>
          <label htmlFor="cfg-tagline" className="block text-sm text-taupe mb-1">
            Lema (debajo del nombre)
          </label>
          <input
            id="cfg-tagline"
            type="text"
            required
            value={form.heroTagline}
            onChange={(e) => setForm({ ...form, heroTagline: e.target.value })}
            className="w-full rounded-lg border border-taupe/30 px-3 py-2"
          />
          <p className="mt-1 text-xs text-taupe">
            Se muestra debajo del nombre del negocio en la portada.
          </p>
        </div>

        <div>
          <span className="block text-sm text-taupe mb-2">Paleta de colores</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_THEMES.map((theme) => (
              <label
                key={theme.id}
                htmlFor={`cfg-theme-${theme.id}`}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition ${
                  form.colorTheme === theme.id
                    ? "border-gold ring-1 ring-gold"
                    : "border-taupe/30"
                }`}
              >
                <input
                  id={`cfg-theme-${theme.id}`}
                  type="radio"
                  name="colorTheme"
                  value={theme.id}
                  checked={form.colorTheme === theme.id}
                  onChange={() => setForm({ ...form, colorTheme: theme.id })}
                  className="sr-only"
                />
                <span className="flex shrink-0 overflow-hidden rounded-full border border-taupe/20">
                  {theme.swatches.map((color, i) => (
                    <span
                      key={i}
                      className="h-6 w-6"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="text-sm text-cocoa">{theme.label}</span>
              </label>
            ))}
          </div>
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

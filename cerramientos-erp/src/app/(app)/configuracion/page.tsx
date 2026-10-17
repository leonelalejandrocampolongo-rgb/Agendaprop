import { getDb } from "@/lib/db";
import { changePassword, updateSettings } from "@/lib/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, Field, inputClass, PageHeader } from "@/components/ui";

export default async function ConfiguracionPage() {
  const db = await getDb();
  const { settings } = db;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Configuración" />

      <Card title="Negocio">
        <ActionForm key={JSON.stringify(settings)} action={updateSettings} resetOnSuccess={false} className="space-y-4" successMessage="Configuración guardada.">
          <Field label="Nombre del negocio *">
            <input name="businessName" required defaultValue={settings.businessName} className={inputClass} />
          </Field>
          <Field label="Nombre del dueño">
            <input name="ownerName" defaultValue={settings.ownerName} className={inputClass} />
          </Field>
          <Field label="Categorías de gastos" hint="Una por línea. Los gastos ya cargados conservan su categoría aunque la saques de acá.">
            <textarea
              name="expenseCategories"
              rows={12}
              defaultValue={settings.expenseCategories.join("\n")}
              className={inputClass}
            />
          </Field>
          <SubmitButton>Guardar</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Cambiar contraseña">
        <ActionForm action={changePassword} className="space-y-4" successMessage="Contraseña actualizada.">
          <Field label="Contraseña actual">
            <input type="password" name="currentPassword" required autoComplete="current-password" className={inputClass} />
          </Field>
          <Field label="Contraseña nueva" hint="Mínimo 8 caracteres.">
            <input type="password" name="newPassword" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <Field label="Repetir contraseña nueva">
            <input type="password" name="confirmPassword" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <SubmitButton>Cambiar contraseña</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}

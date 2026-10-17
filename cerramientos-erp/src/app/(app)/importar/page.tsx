import { getDb } from "@/lib/db";
import { undoImportBatch } from "@/lib/actions";
import { isImportKind, IMPORT_KINDS } from "@/lib/import";
import { DeleteButton } from "@/components/action-form";
import { ImportWizard } from "@/components/import-wizard";
import { Card, Empty, PageHeader, tableClass, tdClass } from "@/components/ui";

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));
}

export default async function ImportarPage() {
  const db = await getDb();
  const batches = [...db.importBatches].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar desde Excel"
        description="Traé los datos de tus planillas viejas para no cargar todo a mano. Importá una cosa por vez (por ejemplo, primero las obras y después los cobros y los gastos), así los cobros y gastos se asocian a sus obras."
      />

      <ImportWizard previousImports={batches.map((b) => ({ kind: b.kind, fileName: b.fileName }))} />

      <Card title="Importaciones hechas">
        {batches.length === 0 ? (
          <Empty>Todavía no importaste ninguna planilla.</Empty>
        ) : (
          <table className={tableClass}>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(b.createdAt)}</td>
                  <td className={tdClass}>
                    {isImportKind(b.kind) ? IMPORT_KINDS[b.kind].label : b.kind}
                    <span className="block text-xs text-steel">{b.fileName}</span>
                  </td>
                  <td className={`${tdClass} text-right`}>{b.count} registros</td>
                  <td className={`${tdClass} text-right`}>
                    <DeleteButton
                      action={undoImportBatch.bind(null, b.id)}
                      label="Deshacer"
                      confirm="¿Deshacer esta importación? Se borra todo lo que se creó con ella (incluidas las obras y empleados nuevos)."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

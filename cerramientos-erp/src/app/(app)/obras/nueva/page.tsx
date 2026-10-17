import { createJob } from "@/lib/actions";
import { JobForm } from "@/components/job-form";
import { Card, PageHeader } from "@/components/ui";

export default function NuevaObraPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Nueva obra"
        description="Cargá el trabajo con el precio pactado. Después vas a poder registrar la seña, los pagos y los materiales que uses."
      />
      <Card>
        <JobForm action={createJob} submitLabel="Crear obra" />
      </Card>
    </div>
  );
}

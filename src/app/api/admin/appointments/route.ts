import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdminSession, unauthorized } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

  const date = request.nextUrl.searchParams.get("date");
  const status = request.nextUrl.searchParams.get("status");
  // "true" = solo archivados, "all" = todos, cualquier otro valor (o ausente) = solo no archivados.
  const archived = request.nextUrl.searchParams.get("archived");

  const db = await getDb();
  let appointments = db.appointments;
  if (date) appointments = appointments.filter((a) => a.date === date);
  if (status) appointments = appointments.filter((a) => a.status === status);
  if (archived === "true") {
    appointments = appointments.filter((a) => a.archivedAt);
  } else if (archived !== "all") {
    appointments = appointments.filter((a) => !a.archivedAt);
  }

  const withService = appointments
    .map((a) => ({
      ...a,
      service: db.services.find((s) => s.id === a.serviceId) ?? null,
    }))
    .sort((a, b) =>
      a.date === b.date
        ? a.startTime.localeCompare(b.startTime)
        : a.date.localeCompare(b.date),
    );

  return NextResponse.json({ appointments: withService });
}

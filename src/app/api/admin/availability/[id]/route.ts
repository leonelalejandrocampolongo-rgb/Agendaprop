import { NextRequest, NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { notFound, requireAdminSession, unauthorized } from "@/lib/api-helpers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdminSession())) return unauthorized();
  const { id } = await params;

  const existed = await mutateDb((db) => {
    const before = db.weeklyAvailability.length;
    db.weeklyAvailability = db.weeklyAvailability.filter((w) => w.id !== id);
    return db.weeklyAvailability.length < before;
  });

  if (!existed) return notFound("Horario no encontrado");
  return NextResponse.json({ ok: true });
}

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
    const before = db.blockedDates.length;
    db.blockedDates = db.blockedDates.filter((b) => b.id !== id);
    return db.blockedDates.length < before;
  });

  if (!existed) return notFound("Bloqueo no encontrado");
  return NextResponse.json({ ok: true });
}

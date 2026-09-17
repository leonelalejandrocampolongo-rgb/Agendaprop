import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb, newId } from "@/lib/db";
import { badRequest, requireAdminSession, unauthorized } from "@/lib/api-helpers";

const createSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "El horario de inicio debe ser antes que el de fin",
  });

export async function GET() {
  if (!(await requireAdminSession())) return unauthorized();
  const db = await getDb();
  const weeklyAvailability = [...db.weeklyAvailability].sort((a, b) =>
    a.dayOfWeek === b.dayOfWeek
      ? a.startTime.localeCompare(b.startTime)
      : a.dayOfWeek - b.dayOfWeek,
  );
  return NextResponse.json({ weeklyAvailability });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten());

  const entry = await mutateDb((db) => {
    const newEntry = { id: newId(), ...parsed.data };
    db.weeklyAvailability.push(newEntry);
    return newEntry;
  });

  return NextResponse.json({ weeklyAvailability: entry }, { status: 201 });
}

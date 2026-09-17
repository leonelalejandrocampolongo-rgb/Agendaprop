import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb, newId } from "@/lib/db";
import { badRequest, requireAdminSession, unauthorized } from "@/lib/api-helpers";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().trim().max(200).optional(),
});

export async function GET() {
  if (!(await requireAdminSession())) return unauthorized();
  const db = await getDb();
  const blockedDates = [...db.blockedDates].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return NextResponse.json({ blockedDates });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten());

  const entry = await mutateDb((db) => {
    const newEntry = {
      id: newId(),
      date: parsed.data.date,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      reason: parsed.data.reason ?? null,
    };
    db.blockedDates.push(newEntry);
    return newEntry;
  });

  return NextResponse.json({ blockedDate: entry }, { status: 201 });
}

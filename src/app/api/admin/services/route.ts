import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb, newId } from "@/lib/db";
import { badRequest, requireAdminSession, unauthorized } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  priceCents: z.coerce.number().int().min(0),
  active: z.boolean().optional(),
  isPack: z.boolean().optional(),
  packSessionsCount: z.coerce.number().int().min(2).max(50).nullable().optional(),
});

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();
  const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "true";
  const db = await getDb();
  const services = db.services
    .filter((s) => includeHidden || !s.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten());

  const now = new Date().toISOString();
  const service = await mutateDb((db) => {
    const newService = {
      id: newId(),
      name: parsed.data.name,
      description: parsed.data.description || null,
      durationMinutes: parsed.data.durationMinutes,
      priceCents: parsed.data.priceCents,
      active: parsed.data.active ?? true,
      isPack: parsed.data.isPack ?? false,
      packSessionsCount: parsed.data.isPack ? parsed.data.packSessionsCount ?? null : null,
      hidden: false,
      createdAt: now,
      updatedAt: now,
    };
    db.services.push(newService);
    return newService;
  });

  return NextResponse.json({ service }, { status: 201 });
}

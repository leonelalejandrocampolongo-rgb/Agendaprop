import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { badRequest, requireAdminSession, unauthorized } from "@/lib/api-helpers";
import { computeMonthlyRevenue } from "@/lib/revenue";

/** Endpoint exclusivo de métricas contables. No toca los endpoints de turnos. */
export async function GET(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");
  const year = Number(yearParam);
  const month = Number(monthParam);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return badRequest("Año inválido");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return badRequest("Mes inválido");
  }

  const db = await getDb();
  const revenue = computeMonthlyRevenue(db, year, month);

  return NextResponse.json({ revenue });
}

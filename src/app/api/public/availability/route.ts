import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";
import { badRequest } from "@/lib/api-helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get("serviceId");
  const date = request.nextUrl.searchParams.get("date");

  if (!serviceId) return badRequest("Falta serviceId");
  if (!date || !DATE_RE.test(date)) return badRequest("Fecha inválida");

  const db = await getDb();
  const slots = getAvailableSlots({ db, serviceId, date });
  return NextResponse.json({ slots });
}

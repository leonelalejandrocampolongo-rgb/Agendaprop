import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const services = db.services
    .filter((s) => s.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ services });
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** Datos públicos del negocio (nombre, alias/titular para la seña, WhatsApp, dirección). */
export async function GET() {
  const db = await getDb();
  const { businessName, depositAlias, depositAccountHolder, depositWhatsappNumber, businessAddress } =
    db.settings;
  return NextResponse.json({
    settings: { businessName, depositAlias, depositAccountHolder, depositWhatsappNumber, businessAddress },
  });
}

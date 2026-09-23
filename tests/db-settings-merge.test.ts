import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

describe("readDb: merge de settings con datos existentes", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "agendaprop-test-"));
    process.env.DATA_DIR = tmpDir;
  });

  after(async () => {
    delete process.env.DATA_DIR;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("un db.json 'viejo' que solo tiene settings.bufferMinutes recibe los campos nuevos con sus valores por defecto", async () => {
    // Simula el estado real de producción: settings ya existía, pero solo
    // con el campo que existía en ese momento (bufferMinutes), agregado en
    // una feature anterior a "Configuración del negocio".
    const legacyDb = {
      admins: [],
      services: [],
      weeklyAvailability: [],
      blockedDates: [],
      appointments: [],
      packs: [],
      packPayments: [],
      settings: { bufferMinutes: 30 },
    };
    await fs.writeFile(path.join(tmpDir, "db.json"), JSON.stringify(legacyDb));

    // Import dinámico después de fijar DATA_DIR, para que db.ts lo lea al inicializar.
    const { getDb } = await import("@/lib/db");
    const db = await getDb();

    // El valor guardado se respeta...
    assert.equal(db.settings.bufferMinutes, 30);
    // ...y los campos nuevos, ausentes en el archivo viejo, no quedan undefined:
    // toman el valor por defecto en vez de romper la página o los emails.
    assert.equal(typeof db.settings.businessName, "string");
    assert.ok(db.settings.businessName.length > 0);
    assert.equal(typeof db.settings.depositAlias, "string");
    assert.equal(typeof db.settings.depositAccountHolder, "string");
    assert.equal(typeof db.settings.depositWhatsappNumber, "string");
    assert.equal(typeof db.settings.businessAddress, "string");
  });
});

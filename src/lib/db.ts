import { promises as fs } from "fs";
import path from "path";
import type { DbShape } from "@/lib/db-types";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const EMPTY_DB: DbShape = {
  admins: [],
  services: [],
  weeklyAvailability: [],
  blockedDates: [],
  appointments: [],
};

// Serializes reads/writes within this process so concurrent requests never
// interleave and corrupt the file. Good enough for a single-server personal app.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return { ...EMPTY_DB, ...JSON.parse(raw) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      await fs.writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
      return { ...EMPTY_DB };
    }
    throw err;
  }
}

async function writeDb(data: DbShape): Promise<void> {
  const tmpPath = `${DB_PATH}.tmp`;
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2));
  await fs.rename(tmpPath, DB_PATH);
}

/** Read the whole database. Safe to call concurrently. */
export function getDb(): Promise<DbShape> {
  return enqueue(readDb);
}

/**
 * Read-modify-write the database as a single atomic step relative to other
 * callers of getDb/mutateDb. `mutator` receives the current data and returns
 * the new data (or mutates it in place and returns it).
 */
export function mutateDb<T>(
  mutator: (db: DbShape) => T | Promise<T>,
): Promise<T> {
  return enqueue(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });
}

export function newId(): string {
  return crypto.randomUUID();
}

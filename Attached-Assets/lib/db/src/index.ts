import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "url";
import path from "path";
import * as schema from "./schema";

const { Pool } = pg;

export let pool: any = null;
export let db: any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg(pool, { schema });
} else {
  console.log("DATABASE_URL is not set. Initializing PGlite local database.");
  const pgliteDataPath = path.resolve(__dirname, "../pglite-data");
  const client = new PGlite(pgliteDataPath);
  db = drizzlePglite(client, { schema });

  // Run migrations automatically
  const migrationsFolder = path.resolve(__dirname, "../drizzle");
  console.log("Running migrations from:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully!");
}

export * from "./schema";


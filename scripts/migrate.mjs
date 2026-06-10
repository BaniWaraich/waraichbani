#!/usr/bin/env node
/**
 * Simple forward-only migration runner.
 *
 * Reads every *.sql file in /migrations (sorted by filename), tracks which have
 * been applied in a `_migrations` table, and runs the rest in a transaction
 * each. Idempotent: re-running only applies new files.
 *
 * Usage:
 *   POSTGRES_URL=... npm run migrate
 *
 * Loads .env.local automatically if present.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// --- Minimal .env.local loader (no dependency on dotenv) -------------------
function loadEnv(file) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // strip inline comments and surrounding quotes
    if (!val.startsWith('"') && !val.startsWith("'")) {
      const hash = val.indexOf(" #");
      if (hash !== -1) val = val.slice(0, hash).trim();
    }
    val = val.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv(join(root, ".env.local"));

if (!process.env.POSTGRES_URL) {
  console.error("✗ POSTGRES_URL is not set. Add it to .env.local or the environment.");
  process.exit(1);
}

const { sql } = await import("@vercel/postgres");

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  const migrationsDir = join(root, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows: applied } = await sql`SELECT name FROM _migrations`;
  const appliedSet = new Set(applied.map((r) => r.name));

  let ran = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`• skip   ${file} (already applied)`);
      continue;
    }
    const content = readFileSync(join(migrationsDir, file), "utf8");
    process.stdout.write(`→ apply  ${file} ... `);
    try {
      await sql.query("BEGIN");
      await sql.query(content);
      await sql.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await sql.query("COMMIT");
      console.log("done");
      ran++;
    } catch (err) {
      await sql.query("ROLLBACK");
      console.error(`\n✗ failed on ${file}:\n${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\n✓ migrations complete (${ran} applied, ${files.length - ran} skipped)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import postgres from "postgres";
import { readFileSync } from "node:fs";
const db = postgres(process.env.DATABASE_URL!, { max: 1 });
await db.unsafe(readFileSync("drizzle/0000_foundation.sql", "utf8"));
console.log("Migração aplicada.");
await db.end();

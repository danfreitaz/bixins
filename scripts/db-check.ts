import postgres from "postgres";
const db = postgres(process.env.DATABASE_URL!, { max: 1 });
try {
  const tables =
    await db`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('properties','game_actions','economy_ledger') ORDER BY table_name`;
  if (tables.length !== 3) throw Error("Migração incompleta.");
  const constraints =
    await db`SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema='public' AND table_name IN ('properties','game_actions','economy_ledger')`;
  const clock = await db`SELECT now() IS NOT NULL AS server_clock`;
  console.log(
    JSON.stringify({
      connected: true,
      tables: tables.map((t) => t.table_name),
      constraints: constraints.length,
      serverClock: clock[0].server_clock,
    }),
  );
} finally {
  await db.end();
}

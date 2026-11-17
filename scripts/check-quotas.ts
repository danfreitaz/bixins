import { db } from "../src/lib/db/client";
// Read-only application counters. Provider dashboards remain the billing authority.
const [size] =
  await db`SELECT pg_database_size(current_database())::bigint AS bytes`;
const [counts] =
  await db`SELECT (SELECT count(*)::int FROM properties) AS properties, (SELECT count(*)::int FROM game_actions) AS actions, (SELECT count(*)::int FROM economy_ledger) AS ledger, (SELECT count(*)::int FROM game_actions WHERE created_at > now()-interval '24 hours') AS actions_24h`;
const [snapshots] =
  await db`SELECT coalesce(max(octet_length(state::text)),0)::int AS largest_bytes, coalesce(round(avg(octet_length(state::text))),0)::int AS average_bytes FROM properties`;
const result = {
  checkedAt: new Date().toISOString(),
  databaseBytes: Number(size.bytes),
  ...counts,
  snapshots,
  warnings: [] as string[],
};
const budgetMiB = Number(process.env.BIXINS_DB_BUDGET_MIB || 500);
if (!Number.isFinite(budgetMiB) || budgetMiB <= 0)
  throw Error("BIXINS_DB_BUDGET_MIB deve ser positivo.");
if (result.databaseBytes > budgetMiB * 1024 * 1024 * 0.8)
  result.warnings.push(
    "Banco acima de 80% do orçamento local configurado; confira a cota real do seu plano no Neon.",
  );
if (snapshots.largest_bytes > 150000)
  result.warnings.push(
    "Snapshot acima de 150 kB; revisar retenção de históricos antes de ampliar o teste.",
  );
if (counts.actions_24h > 20000)
  result.warnings.push(
    "Mais de 20 mil ações em 24h; revisar consumo, acessos e polling nos painéis Neon/Vercel.",
  );
console.log(JSON.stringify(result, null, 2));
await db.end();
if (result.warnings.length) process.exitCode = 2;

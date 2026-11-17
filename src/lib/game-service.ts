import "server-only";
import { randomInt } from "node:crypto";
import { db } from "./db/client";
import { createGame, simulate } from "@/game/engine";
import { applyAction, type Action } from "@/game/actions";
import type { Game } from "@/game/types";
import { migrateGame } from "@/game/progression";
export async function transact(owner: string, action: Action, key: string) {
  return db.begin(async (tx) => {
    const initial = createGame(Date.now(), randomInt(1, 2147483647));
    await tx`INSERT INTO properties(owner_id,state,credits) VALUES(${owner},${tx.json(initial)},600) ON CONFLICT(owner_id) DO NOTHING`;
    const [row] =
      await tx`SELECT state FROM properties WHERE owner_id=${owner} FOR UPDATE`;
    const [clock] =
      await tx`SELECT extract(epoch from clock_timestamp())*1000 as now`;
    const now = Math.floor(Number(clock.now));
    const g = migrateGame(row.state as Game);
    const [duplicate] =
      await tx`SELECT kind FROM game_actions WHERE owner_id=${owner} AND idempotency_key=${key}`;
    if (duplicate) {
      if (duplicate.kind !== action.type)
        throw Error("Chave de ação já utilizada.");
      return { state: g, serverTime: now };
    }
    if (action.type !== "sync") {
      const [rate] =
        await tx`SELECT count(*)::int AS count FROM game_actions WHERE owner_id=${owner} AND created_at>now()-interval '1 minute' AND kind<>'sync'`;
      if (rate.count >= 45)
        throw Error(
          "Muitas ações juntas. Respire um pouquinho e tente novamente.",
        );
    }
    simulate(g, now);
    applyAction(g, action, now, key, randomInt(1, 2147483647));
    g.version++;
    g.ledger = g.ledger.slice(0, 100);
    await tx`UPDATE properties SET state=${tx.json(g)},credits=${g.credits},version=${g.version},updated_at=now() WHERE owner_id=${owner}`;
    await tx`INSERT INTO game_actions(owner_id,idempotency_key,kind) VALUES(${owner},${key},${action.type})`;
    for (const entry of g.ledger)
      await tx`INSERT INTO economy_ledger(owner_id,reference,delta,balance_after,kind) VALUES(${owner},${entry.id},${entry.delta},${entry.balance},${entry.kind}) ON CONFLICT(owner_id,reference) DO NOTHING`;
    return { state: g, serverTime: now };
  });
}

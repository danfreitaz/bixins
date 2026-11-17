import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db/client";
import { transact } from "../src/lib/game-service";
import { createGame, hatch } from "../src/game/engine";
import { relation } from "../src/game/colony";
import { saleQuote } from "../src/game/progression";
import type { Game } from "../src/game/types";
const owner = `qa-colony-${randomUUID()}`,
  other = `qa-isolation-${randomUUID()}`,
  now = Date.now();
try {
  const g = createGame(now, 871);
  g.eggs[0].readyAt = now;
  g.eggs[0].species = "musguito";
  hatch(g, "first-egg", now);
  g.eggs.push({
    id: "other",
    species: "musguito",
    first: false,
    readyAt: now,
    x: 4,
    y: 3,
  });
  hatch(g, "other", now);
  const [a, b] = g.bixins;
  Object.assign(a, { bornAt: now - 90000000, role: "A", x: 4, y: 5 });
  Object.assign(b, { bornAt: now - 90000000, role: "B", x: 5, y: 4 });
  for (const o of [a, b])
    for (const k of Object.keys(o.needs) as (keyof typeof o.needs)[])
      o.needs[k] = 95;
  relation(g, a.id, b.id).affinity = 40;
  g.items.push({ id: "nest", key: "nest", placed: true, x: 5, y: 5, stock: 0 });
  await db`INSERT INTO properties(owner_id,state,credits) VALUES(${owner},${db.json(g)},${g.credits})`;
  const action = {
    type: "prepare-breeding" as const,
    a: a.id,
    b: b.id,
    itemId: "nest",
  };
  const starts = await Promise.allSettled([
    transact(owner, action, randomUUID()),
    transact(owner, action, randomUUID()),
    transact(owner, action, randomUUID()),
  ]);
  assert.equal(starts.filter((r) => r.status === "fulfilled").length, 1);
  await assert.rejects(transact(other, action, randomUUID()));
  let [row] = await db`SELECT state FROM properties WHERE owner_id=${owner}`;
  let state = row.state as Game;
  assert(state.nest);
  assert.equal(state.eggs.length, 0);
  state.lastSimulated = Date.now() - 660000;
  state.nest.preparedAt = state.lastSimulated;
  await db`UPDATE properties SET state=${db.json(state)} WHERE owner_id=${owner}`;
  const syncKey = randomUUID();
  await Promise.all([
    transact(owner, { type: "sync" }, syncKey),
    transact(owner, { type: "sync" }, syncKey),
    ...Array.from({ length: 5 }, () =>
      transact(owner, { type: "sync" }, randomUUID()),
    ),
  ]);
  [row] = await db`SELECT state FROM properties WHERE owner_id=${owner}`;
  state = row.state as Game;
  assert.equal(state.eggs.length, 1);
  assert.equal(state.food, g.food - 12);
  assert.equal(state.nest, null);
  assert.equal(state.bixins[0].lastBredAt, state.bixins[1].lastBredAt);
  await assert.rejects(transact(owner, action, randomUUID()), /24 horas/);
  const e = state.eggs[0];
  e.readyAt = Date.now() - 1;
  e.x = 12;
  e.y = 9;
  await db`UPDATE properties SET state=${db.json(state)} WHERE owner_id=${owner}`;
  const hatches = await Promise.allSettled([
    transact(owner, { type: "hatch", id: e.id }, randomUUID()),
    transact(owner, { type: "hatch", id: e.id }, randomUUID()),
  ]);
  assert.equal(hatches.filter((r) => r.status === "fulfilled").length, 1);
  [row] = await db`SELECT state FROM properties WHERE owner_id=${owner}`;
  state = row.state as Game;
  const child = state.bixins.find((o) => o.parentA === a.id)!;
  assert(child);
  assert.deepEqual(child.genome, e.genome);
  assert.equal(child.parentB, b.id);
  const parent = state.bixins.find((o) => o.id === a.id)!;
  const quote = saleQuote(state, parent, Date.now());
  assert(quote.allowed);
  await transact(
    owner,
    { type: "sell", id: a.id, expectedPrice: quote.price },
    randomUUID(),
  );
  [row] = await db`SELECT state FROM properties WHERE owner_id=${owner}`;
  state = row.state as Game;
  assert.equal(state.transfers?.[0].bixin.id, child.parentA);
  assert(state.bixins.some((o) => o.parentA === a.id));
  const limited = await Promise.allSettled(
    Array.from({ length: 15 }, () =>
      transact(owner, { type: "sync" }, randomUUID()),
    ),
  );
  assert(limited.some((r) => r.status === "rejected"));
  const [count] =
    await db`SELECT count(*)::int AS value FROM game_actions WHERE owner_id=${owner} AND kind='sync'`;
  assert.equal(count.value, 12);
  const [ledger] =
    await db`SELECT count(*)::int AS value FROM economy_ledger WHERE owner_id=${owner}`;
  assert.equal(ledger.value, 1);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "one-concurrent-preparation",
        "foreign-owner-denied",
        "offline-colony-persisted",
        "one-concurrent-egg",
        "one-food-debit",
        "24h-cooldown",
        "single-concurrent-hatch",
        "inherited-genome",
        "lineage-after-transfer",
        "sync-rate-limit",
        "ledger-only-new-entries",
      ],
      fixtureOwners: [owner, other],
    }),
  );
} finally {
  await db.end();
}

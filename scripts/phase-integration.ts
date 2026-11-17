import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { db } from "../src/lib/db/client";
import { transact } from "../src/lib/game-service";
import { createGame, hatch } from "../src/game/engine";
import { saleQuote, updateMissions } from "../src/game/progression";
const now = Date.now(),
  owner = "qa-phases-" + randomUUID(),
  walletOwner = "qa-wallet-" + randomUUID();
const g = createGame(now, 204);
g.credits = 6000;
g.eggs[0].readyAt = now;
hatch(g, "first-egg", now);
g.eggs.push({
  id: "fixture-adult",
  species: "pedruxo",
  readyAt: now,
  first: false,
  x: 9,
  y: 8,
});
hatch(g, "fixture-adult", now);
g.bixins.forEach((b) => {
  b.bornAt = now - 25 * 3600000;
  for (const n of Object.keys(b.needs)) b.needs[n as keyof typeof b.needs] = 85;
});
Object.assign(g.items[0], { placed: true, x: 4, y: 4 });
updateMissions(g, now);
const wallet = createGame(now, 303);
await db`INSERT INTO properties(owner_id,state,credits) VALUES(${owner},${db.json(g)},${g.credits}),(${walletOwner},${db.json(wallet)},${wallet.credits})`;
const key = randomUUID();
await Promise.all([
  transact(owner, { type: "buy", key: "food" }, key),
  transact(owner, { type: "buy", key: "food" }, key),
]);
let [row] = await db`SELECT state FROM properties WHERE owner_id=${owner}`;
assert.equal(row.state.credits, 5920);
assert.equal(row.state.items.length, 5);
const foodBefore = row.state.food;
const foodKey = randomUUID();
await Promise.all([
  transact(owner, { type: "buy-food" }, foodKey),
  transact(owner, { type: "buy-food" }, foodKey),
]);
const [foodRow] =
  await db`SELECT state FROM properties WHERE owner_id=${owner}`;
assert.equal(foodRow.state.food, foodBefore + 12);
assert.equal(foodRow.state.credits, 5910);
const race = await Promise.allSettled(
  Array.from({ length: 8 }, () =>
    transact(walletOwner, { type: "buy", key: "food" }, randomUUID()),
  ),
);
assert.equal(race.filter((r) => r.status === "fulfilled").length, 7);
const [w] =
  await db`SELECT credits FROM properties WHERE owner_id=${walletOwner}`;
assert.equal(w.credits, 40);
const mission = await Promise.allSettled([
  transact(owner, { type: "claim-mission", mission: "hatch" }, randomUUID()),
  transact(owner, { type: "claim-mission", mission: "hatch" }, randomUUID()),
]);
assert.equal(mission.filter((r) => r.status === "fulfilled").length, 1);
const expansion = await Promise.allSettled([
  transact(owner, { type: "expand" }, randomUUID()),
  transact(owner, { type: "expand" }, randomUUID()),
]);
assert.equal(expansion.filter((r) => r.status === "fulfilled").length, 1);
await transact(owner, { type: "upgrade", id: "kit-0" }, randomUUID());
[row] = await db`SELECT state FROM properties WHERE owner_id=${owner}`;
assert.equal(row.state.width, 24);
assert.equal(row.state.items[0].x, 4);
assert.equal(row.state.items[0].y, 4);
assert.equal(row.state.items[0].level, 2);
const b = row.state.bixins.find(
  (b: { id: string }) => b.id === "bixin-fixture-adult",
);
const quote = saleQuote(row.state, b, Date.now());
const sales = await Promise.allSettled([
  transact(
    owner,
    { type: "sell", id: b.id, expectedPrice: quote.price },
    randomUUID(),
  ),
  transact(
    owner,
    { type: "sell", id: b.id, expectedPrice: quote.price },
    randomUUID(),
  ),
]);
assert.equal(sales.filter((r) => r.status === "fulfilled").length, 1);
[row] = await db`SELECT state FROM properties WHERE owner_id=${owner}`;
assert.equal(row.state.transfers.length, 1);
assert.equal(row.state.bixins.length, 1);
const tripKey = randomUUID();
await transact(owner, { type: "start-expedition", region: "cerrado" }, tripKey);
[row] = await db`SELECT state FROM properties WHERE owner_id=${owner}`;
// Only this isolated SQL fixture gets a past deadline; production has no clock override.
const fixture = row.state;
fixture.expedition.endsAt = Date.now() - 1;
await db`UPDATE properties SET state=${db.json(fixture)} WHERE owner_id=${owner}`;
const claims = await Promise.allSettled([
  transact(owner, { type: "claim-expedition", id: tripKey }, randomUUID()),
  transact(owner, { type: "claim-expedition", id: tripKey }, randomUUID()),
]);
assert.equal(claims.filter((r) => r.status === "fulfilled").length, 1);
const [final] = await db`SELECT state FROM properties WHERE owner_id=${owner}`;
assert.equal(final.state.expeditionsCompleted, 1);
assert.equal(final.state.expedition, null);
const [audit] =
  await db`SELECT count(*) FILTER (WHERE reference='mission-hatch')::int AS mission_entries FROM economy_ledger WHERE owner_id=${owner}`;
assert.equal(audit.mission_entries, 1);
console.log(
  JSON.stringify({
    passed: true,
    checks: [
      "purchase-idempotency",
      "nonnegative-concurrent-wallet",
      "single-mission-reward",
      "single-expansion",
      "preserved-coordinates",
      "upgrade",
      "single-sale-history",
      "single-expedition-claim",
      "ledger-audit",
    ],
    fixtureOwners: [owner, walletOwner],
  }),
);
await db.end();

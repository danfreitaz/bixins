import { readFileSync, writeFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import { db } from "../src/lib/db/client";
import { createGame, hatch } from "../src/game/engine";
import { relation } from "../src/game/colony";
import type { Game } from "../src/game/types";
// Local QA runner only: never imported by the app, no HTTP clock/credit override.
const info = JSON.parse(readFileSync("test-results/colony-owner.json", "utf8"));
const accounts = JSON.parse(readFileSync("test-results/accounts.json", "utf8"));
assert(
  accounts.registered.includes(info.email) && info.email !== accounts.email,
  "Use somente a segunda conta fictícia já registrada.",
);
const owner = info.owner,
  mode = process.argv[2],
  backupPath = "test-results/colony-backup.json";
assert(typeof owner === "string" && owner.length > 5);
try {
  if (mode === "prepare") {
    if (existsSync(backupPath)) {
      const old = JSON.parse(readFileSync(backupPath, "utf8"));
      assert(
        old.restored,
        "Restaure o teste anterior antes de preparar outro.",
      );
    }
    const [row] =
      await db`SELECT state,credits,version FROM properties WHERE owner_id=${owner}`;
    assert(row);
    writeFileSync(
      backupPath,
      JSON.stringify({ owner, ...row, restored: false }),
    );
    const now = Date.now(),
      g = createGame(now, 941);
    g.credits = 2000;
    g.food = 200;
    g.eggs[0].species = "musguito";
    g.eggs[0].readyAt = now;
    hatch(g, "first-egg", now);
    g.eggs.push({
      id: "qa-second",
      species: "musguito",
      first: false,
      readyAt: now,
      x: 9,
      y: 5,
    });
    hatch(g, "qa-second", now);
    const [a, b] = g.bixins;
    Object.assign(a, {
      name: "Fubá QA",
      role: "A",
      bornAt: now - 25 * 3600000,
      x: 8,
      y: 5,
    });
    Object.assign(b, {
      name: "Pingo QA",
      role: "B",
      bornAt: now - 25 * 3600000,
      x: 9,
      y: 5,
    });
    for (const o of [a, b]) {
      for (const n of Object.keys(o.needs) as (keyof typeof o.needs)[])
        o.needs[n] = 95;
      o.traits = ["Carinhoso", "Curioso", "Organizado"];
    }
    relation(g, a.id, b.id).affinity = 40;
    g.items.forEach((i, n) =>
      Object.assign(i, { placed: true, x: 2 + n * 2, y: 2 }),
    );
    await db`UPDATE properties SET state=${db.json(g)},credits=${g.credits},version=${g.version},updated_at=now() WHERE owner_id=${owner}`;
  } else if (mode === "offline" || mode === "incubation") {
    const backup = JSON.parse(readFileSync(backupPath, "utf8"));
    assert(backup.owner === owner && !backup.restored);
    const [row] =
      await db`SELECT state FROM properties WHERE owner_id=${owner}`;
    const g = row.state as Game;
    assert(
      g.bixins.some((b) => b.name === "Fubá QA"),
      "A fixture deve estar ativa.",
    );
    if (mode === "offline") {
      assert(g.nest);
      g.lastSimulated = Date.now() - 900000;
      g.nest.preparedAt = g.lastSimulated;
    } else {
      const egg = g.eggs.find((e) => e.parentA && e.readyAt);
      assert(egg);
      egg.readyAt = Date.now() - 1;
    }
    await db`UPDATE properties SET state=${db.json(g)},updated_at=now() WHERE owner_id=${owner}`;
  } else if (mode === "restore") {
    const saved = JSON.parse(readFileSync(backupPath, "utf8"));
    assert(saved.owner === owner);
    if (!saved.restored) {
      await db`UPDATE properties SET state=${db.json(saved.state)},credits=${saved.credits},version=${saved.version},updated_at=now() WHERE owner_id=${owner}`;
      saved.restored = true;
      writeFileSync(backupPath, JSON.stringify(saved));
    }
  } else throw Error("Modo inválido.");
  console.log(JSON.stringify({ fixture: mode, passed: true }));
} finally {
  await db.end();
}

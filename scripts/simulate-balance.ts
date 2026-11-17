import { writeFileSync, mkdirSync } from "node:fs";
import { applyAction, type Action } from "../src/game/actions";
import { createGame, hatch, simulate } from "../src/game/engine";
import { CONFIG, items, type Need } from "../src/game/config";
import { stockMax } from "../src/game/geometry";
import {
  charm,
  eggPrice,
  saleQuote,
  shopEggs,
  wellbeing,
} from "../src/game/progression";
const start = 1800000000000,
  day = 86400000,
  profiles = ["casual", "cuidadoso", "colecionador", "ausente", "explorador"];
const results = [];
const began = performance.now();
const samples = Number(process.env.BIXINS_BALANCE_COLONIES ?? 100);
for (let sample = 0; sample < samples; sample++) {
  if (sample === 0) console.log("Iniciando simulação:", samples, "colônias");
  const profile = profiles[sample % 5],
    g = createGame(start, 100 + sample);
  g.eggs[0].readyAt = start;
  hatch(g, "first-egg", start);
  [
    [5, 5],
    [8, 5],
    [5, 8],
    [8, 8],
  ].forEach(([x, y], n) => Object.assign(g.items[n], { placed: true, x, y }));
  let sequence = 0,
    income = 0,
    expenses = 0,
    expandedAt: number | null = null;
  const act = (a: Action, t: number) => {
    const old = g.credits;
    try {
      applyAction(
        g,
        a,
        t,
        "balance-" + sample + "-" + sequence++,
        sample * 1009 + sequence,
      );
      g.version++;
      if (g.credits < old) expenses += old - g.credits;
      return true;
    } catch {
      return false;
    }
  };
  const interval =
    profile === "cuidadoso"
      ? day / 24
      : profile === "ausente"
        ? day * 4
        : profile === "casual"
          ? day
          : day / 2;
  for (
    let t = start + interval;
    t < start + 14 * day + interval;
    t += interval
  ) {
    const now = Math.min(t, start + 14 * day);
    const old = g.credits;
    simulate(g, now);
    income += g.credits - old;
    if (profile !== "ausente") {
      for (const i of g.items)
        if (items[i.key].stockMax && i.stock < stockMax(i) && g.food > 0)
          act({ type: "refill", id: i.id }, now);
      for (const b of g.bixins) {
        const kind =
          b.needs.hygiene < 65 ? "bath" : b.needs.social < 65 ? "pet" : "snack";
        act({ type: "care", id: b.id, kind }, now);
      }
      for (const [key, m] of Object.entries(g.missions ?? {}))
        if (m.completedAt !== null && m.claimedAt === null)
          act({ type: "claim-mission", mission: key as "hatch" }, now);
      if ((g.level ?? 1) === 1 && g.credits >= CONFIG.expansionPrice + 200) {
        if (act({ type: "expand" }, now)) expandedAt = (now - start) / day;
      }
      if (
        profile === "cuidadoso" &&
        g.credits > 400 &&
        g.items.some((i) => i.key === "bath") === false
      ) {
        if (act({ type: "buy", key: "bath" }, now)) {
          const i = g.items.at(-1)!;
          act({ type: "place", id: i.id, x: 12, y: 5 }, now);
        }
      }
      if (
        profile === "explorador" &&
        g.expedition &&
        now >= g.expedition.endsAt
      )
        act({ type: "claim-expedition", id: g.expedition.id }, now);
      for (const e of [...g.eggs]) {
        if (e.readyAt !== null && now >= e.readyAt)
          act({ type: "hatch", id: e.id }, now);
        else if (
          e.readyAt === null &&
          g.bixins.length + g.eggs.filter((e) => e.readyAt !== null).length <
            g.capacity
        ) {
          for (let x = 12; x < g.width - 1; x++)
            if (act({ type: "incubate", id: e.id, x, y: 10 }, now)) break;
        }
      }
      if (
        profile === "colecionador" &&
        g.eggs.length + (g.expedition ? 1 : 0) < CONFIG.maxEggs &&
        g.bixins.length < g.capacity
      ) {
        const offer =
          shopEggs(g, now).find((s) => !g.discoveries.includes(s)) ??
          shopEggs(g, now)[0];
        if (g.credits > eggPrice(offer) + 200)
          act({ type: "buy-egg", species: offer }, now);
      }
      if (
        profile === "explorador" &&
        !g.expedition &&
        g.eggs.length < CONFIG.maxEggs &&
        g.bixins.length < g.capacity &&
        g.credits > 250
      )
        act(
          {
            type: "start-expedition",
            region: (g.level ?? 1) > 1 ? "cerrado" : "mata",
          },
          now,
        );
    }
    if (g.credits < 0 || g.bixins.some((b) => b.needs.health < 35))
      throw Error("Colônia fora dos limites: " + sample);
    if (now === start + 14 * day) break;
  }
  results.push({
    colony: sample,
    profile,
    days: 14,
    credits: g.credits,
    meanHealth: Math.round(
      g.bixins.reduce((a, b) => a + b.needs.health, 0) / g.bixins.length,
    ),
    wellbeing: Math.round(
      g.bixins.reduce((a, b) => a + wellbeing(b), 0) / g.bixins.length,
    ),
    bixins: g.bixins.length,
    discoveries: g.discoveries.length,
    income,
    expenses,
    daysToExpansion: expandedAt,
    charm: Math.round(charm(g)),
  });
  if ((sample + 1) % 5 === 0) console.log("Colônias simuladas:", sample + 1);
}
mkdirSync("test-results", { recursive: true });
writeFileSync(
  "test-results/balance.json",
  JSON.stringify(
    { elapsedMs: Math.round(performance.now() - began), colonies: results },
    null,
    2,
  ),
);
const keys = Object.keys(results[0]) as (keyof (typeof results)[0])[];
writeFileSync(
  "test-results/balance.csv",
  keys.join(",") +
    "\n" +
    results.map((r) => keys.map((k) => r[k] ?? "").join(",")).join("\n"),
);
console.log(
  JSON.stringify({
    colonies: samples,
    days: 14,
    passed: true,
    elapsedMs: Math.round(performance.now() - began),
    minBalance: Math.min(...results.map((r) => r.credits)),
    minHealth: Math.min(...results.map((r) => r.meanHealth)),
  }),
);

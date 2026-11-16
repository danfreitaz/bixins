import {
  CONFIG,
  decay,
  items,
  species,
  type Need,
  type Species,
} from "./config";
import type { Bixin, Game, Point } from "./types";
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function event(g: Game, text: string, at: number) {
  g.events.unshift({
    id: `${g.seed}-${g.version}-${at}-${g.events.length}`,
    at,
    text,
  });
  g.events = g.events.slice(0, 200);
}
export function createGame(now: number, seed: number): Game {
  const random = rng(seed);
  const sp = (Object.keys(species) as Species[])[Math.floor(random() * 3)];
  return {
    version: 0,
    name: "Meu cantinho",
    credits: CONFIG.credits,
    width: 20,
    height: 14,
    capacity: 6,
    lastSimulated: now,
    lastIncome: now,
    food: 48,
    foodDay: Math.floor(now / 86400000),
    seed,
    bixins: [],
    items: (Object.keys(items) as (keyof typeof items)[]).map((key, i) => ({
      id: `kit-${i}`,
      key,
      placed: false,
      x: 0,
      y: 0,
      stock: key === "food" ? 12 : 0,
    })),
    eggs: [
      { id: "first-egg", species: sp, readyAt: null, first: true, x: 0, y: 0 },
    ],
    events: [
      {
        id: "welcome",
        at: now,
        text: "Esse pedacinho de mundo agora é seu! Seu kit está na caixa de entregas.",
      },
    ],
    ledger: [],
    discoveries: [],
  };
}
export function pathfind(g: Game, start: Point, end: Point): Point[] {
  const blocked = new Set(
    g.items.filter((i) => i.placed).map((i) => `${i.x},${i.y}`),
  );
  const key = (p: Point) => `${p.x},${p.y}`;
  const queue = [start];
  const visited = new Set([key(start)]);
  const prev = new Map<string, Point>();
  for (let n = 0; n < queue.length; n++) {
    const p = queue[n];
    if (key(p) === key(end)) {
      const route: Point[] = [];
      let q = p;
      while (key(q) !== key(start)) {
        route.unshift(q);
        q = prev.get(key(q))!;
      }
      return route;
    }
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (
        q.x < 0 ||
        q.y < 0 ||
        q.x >= g.width ||
        q.y >= g.height ||
        blocked.has(key(q)) ||
        visited.has(key(q))
      )
        continue;
      visited.add(key(q));
      prev.set(key(q), p);
      queue.push(q);
    }
  }
  return [];
}
export function validPlacement(g: Game, x: number, y: number, ignore?: string) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= g.width ||
    y >= g.height
  )
    return false;
  if (y === g.height - 1 && x === Math.floor(g.width / 2)) return false;
  if (
    g.items.some(
      (i) => i.placed && i.id !== ignore && i.x === x && i.y === y,
    ) ||
    g.eggs.some((e) => e.readyAt && e.x === x && e.y === y) ||
    g.bixins.some((b) => b.x === x && b.y === y)
  )
    return false;
  const test = structuredClone(g);
  test.items = test.items.filter((i) => i.id !== ignore);
  test.items.push({ id: "preview", key: "bed", placed: true, stock: 0, x, y });
  const entrance = { x: Math.floor(g.width / 2), y: g.height - 1 };
  const reachable = (p: Point) =>
    (p.x === entrance.x && p.y === entrance.y) ||
    pathfind(test, entrance, p).length > 0;
  const reachesInterior = [
    { x: 8, y: 6 },
    { x: 11, y: 6 },
    { x: 8, y: 8 },
    { x: 11, y: 8 },
  ].some(reachable);
  return (
    reachesInterior &&
    test.items
      .filter((i) => i.placed)
      .every((i) =>
        [
          [i.x - 1, i.y],
          [i.x + 1, i.y],
          [i.x, i.y - 1],
          [i.x, i.y + 1],
        ].some(([a, b]) => reachable({ x: a, y: b })),
      ) &&
    test.bixins.every(reachable)
  );
}
export function chooseActivity(g: Game, b: Bixin, at: number) {
  const occupied = new Set(
    g.bixins.filter((o) => o.id !== b.id && o.targetId).map((o) => o.targetId),
  );
  const candidates = g.items
    .filter(
      (i) =>
        i.placed && !occupied.has(i.id) && (i.key !== "food" || i.stock > 0),
    )
    .map((i) => {
      const options = [
        { x: i.x - 1, y: i.y },
        { x: i.x + 1, y: i.y },
        { x: i.x, y: i.y - 1 },
        { x: i.x, y: i.y + 1 },
      ]
        .map((p) => ({ p, path: pathfind(g, b, p) }))
        .filter((o) => o.path.length || (o.p.x === b.x && o.p.y === b.y))
        .sort((a, c) => a.path.length - c.path.length);
      const need = items[i.key].need;
      return {
        i,
        option: options[0],
        score:
          100 -
          b.needs[need] +
          (need === "hydration" && b.needs.hydration < 30 ? 100 : 0) +
          (b.species === "musguito" && need === "energy" ? 8 : 0),
      };
    })
    .filter((c) => c.option)
    .sort((a, c) => c.score - a.score || a.i.id.localeCompare(c.i.id));
  const target = candidates[0];
  if (target && (target.score > 20 || Math.floor(at / 20000) % 4 === 0)) {
    b.targetId = target.i.id;
    b.path = target.option.path;
    b.activity = {
      food: "Comendo",
      water: "Bebendo",
      bed: "Dormindo",
      toy: "Brincando",
    }[target.i.key];
    return;
  }
  const random = rng(g.seed + Math.floor(at / 20000) + b.id.length);
  const p = {
    x: Math.floor(random() * g.width),
    y: Math.floor(random() * g.height),
  };
  b.targetId = undefined;
  b.path = pathfind(g, b, p);
  b.activity = "Passeando";
}
export function simulate(g: Game, now: number) {
  const end = Math.max(g.lastSimulated, now);
  const stop = Math.min(end, g.lastSimulated + CONFIG.offlineHours * 3600000);
  let t = g.lastSimulated;
  while (t + 20000 <= stop) {
    t += 20000;
    const h = 20 / 3600;
    for (const b of g.bixins) {
      for (const n of Object.keys(decay) as Need[])
        b.needs[n] = Math.max(0, Math.min(100, b.needs[n] - decay[n] * h));
      if (b.needs.satiety < 10 || b.needs.hydration < 10)
        b.needs.health = Math.max(35, b.needs.health - 2 * h);
      if (b.path.length) {
        const next = b.path.shift()!;
        b.x = next.x;
        b.y = next.y;
        continue;
      }
      const target = g.items.find((i) => i.id === b.targetId && i.placed);
      if (target && Math.abs(b.x - target.x) + Math.abs(b.y - target.y) === 1) {
        const n = items[target.key].need;
        if (target.key !== "food" || target.stock > 0) {
          if (target.key === "food") target.stock--;
          b.needs[n] = Math.min(100, b.needs[n] + 25);
          event(
            g,
            `${b.name} ${{ food: "saboreou um lanchinho", water: "bebeu água fresquinha", bed: "tirou uma soneca", toy: "inventou uma brincadeira" }[target.key]}.`,
            t,
          );
        }
        b.targetId = undefined;
      }
      chooseActivity(g, b, t);
    }
  }
  // Preserve sub-step time so repeated short syncs cannot erase progression.
  g.lastSimulated = end - stop >= 1 ? t + (end - stop) : t;
  if (end - stop > 0) {
    g.lastSimulated = end;
    for (const b of g.bixins)
      for (const n of Object.keys(b.needs) as Need[])
        b.needs[n] = Math.max(n === "health" ? 60 : 35, b.needs[n]);
  }
  const day = Math.floor(end / 86400000);
  if (day > g.foodDay) {
    g.food = Math.max(g.food, CONFIG.freeFood);
    g.foodDay = day;
  }
  const hours = Math.floor((end - g.lastIncome) / 3600000);
  if (hours > 0) {
    const paid = Math.min(hours, CONFIG.incomeHours);
    if (g.bixins.length) {
      const avg =
        g.bixins.reduce(
          (s, b) => s + Object.values(b.needs).reduce((a, v) => a + v, 0) / 8,
          0,
        ) / g.bixins.length;
      const value =
        paid *
        Math.round(
          12 + 3 * g.bixins.length + 0.08 * avg + 2 * g.discoveries.length,
        );
      g.credits += value;
      g.ledger.unshift({
        id: `income-${g.lastIncome}`,
        at: end,
        delta: value,
        balance: g.credits,
        kind: "Visitação",
      });
      event(g, `Seu refúgio recebeu C$ ${value} em visitação.`, end);
    }
    g.lastIncome += hours * 3600000;
  }
  return g;
}
export function hatch(g: Game, id: string, now: number) {
  const e = g.eggs.find((e) => e.id === id);
  if (!e || !e.readyAt || now < e.readyAt)
    throw Error("Esse ovo ainda está se preparando.");
  if (g.bixins.length >= g.capacity) throw Error("Seu refúgio está cheio.");
  const b: Bixin = {
    id: `bixin-${e.id}`,
    species: e.species,
    name: { musguito: "Fubá", capinzim: "Pipoca", espinim: "Dengo" }[e.species],
    bornAt: now,
    x: e.x,
    y: e.y,
    needs: {
      health: 100,
      satiety: 85,
      hydration: 85,
      energy: 85,
      hygiene: 90,
      social: 70,
      fun: 80,
      comfort: 80,
    },
    activity: "Conhecendo o mundo",
    path: [],
    careAt: 0,
    role: g.bixins.length % 2 ? "B" : "A",
    traits: [species[e.species].trait, "Curioso", "Carinhoso"],
  };
  g.bixins.push(b);
  g.eggs = g.eggs.filter((o) => o.id !== id);
  if (!g.discoveries.includes(e.species)) g.discoveries.push(e.species);
  event(g, `${b.name} nasceu! Que bom ter você por aqui.`, now);
  return b;
}

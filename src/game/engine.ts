import {
  CONFIG,
  decay,
  items,
  species,
  starters,
  kitKeys,
  type Need,
  type Species,
  type ItemKey,
} from "./config";
import {
  accessPoints,
  adjacent,
  blockedCells,
  capacity,
  cells,
  dimensions,
  navigation,
} from "./geometry";
import { charm, migrateGame, updateMissions, wellbeing } from "./progression";
import type { Bixin, Game, Point, OwnedItem } from "./types";
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function event(g: Game, text: string, at: number) {
  g.eventSequence = (g.eventSequence ?? g.events.length) + 1;
  g.events.unshift({ id: `${g.seed}-${g.eventSequence}`, at, text });
  g.events = g.events.slice(0, 200);
}
export function createGame(now: number, seed: number): Game {
  const sp = starters[Math.floor(rng(seed)() * starters.length)];
  return migrateGame({
    version: 0,
    name: "Meu cantinho",
    credits: CONFIG.credits,
    width: CONFIG.width,
    height: CONFIG.height,
    capacity: CONFIG.capacity,
    lastSimulated: now,
    lastIncome: now,
    food: CONFIG.freeFood,
    foodDay: Math.floor(now / 86400000),
    seed,
    bixins: [],
    items: kitKeys.map((key, i) => ({
      id: `kit-${i}`,
      key,
      placed: false,
      x: 0,
      y: 0,
      stock: items[key].stockMax,
      level: 1,
      rotation: 0,
    })),
    eggs: [
      {
        id: "first-egg",
        species: sp,
        readyAt: null,
        first: true,
        x: 0,
        y: 0,
        origin: species[sp].regionKey,
      },
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
  });
}
export function pathfind(g: Game, start: Point, end: Point): Point[] {
  const nav = navigation(g),
    blocked = nav.blocked;
  const key = (p: Point) => p.x + "," + p.y;
  const inside = (p: Point) =>
    p.x >= 0 && p.y >= 0 && p.x < g.width && p.y < g.height;
  if (!inside(start) || !inside(end) || blocked.has(key(end))) return [];
  let prev = nav.trees.get(key(start));
  if (!prev) {
    prev = new Map<string, Point>();
    const queue = [{ x: start.x, y: start.y }],
      visited = new Set([key(start)]);
    for (let n = 0; n < queue.length; n++) {
      const p = queue[n];
      for (const [dx, dy] of [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ]) {
        const q = { x: p.x + dx, y: p.y + dy };
        if (!inside(q) || blocked.has(key(q)) || visited.has(key(q))) continue;
        visited.add(key(q));
        prev.set(key(q), p);
        queue.push(q);
      }
    }
    nav.trees.set(key(start), prev);
  }
  if (key(start) !== key(end) && !prev.has(key(end))) return [];
  const route: Point[] = [];
  let q = end;
  for (let guard = 0; key(q) !== key(start); guard++) {
    if (guard >= g.width * g.height) return [];
    route.unshift({ ...q });
    const parent = prev.get(key(q));
    if (!parent) return [];
    q = parent;
  }
  return route;
}
export function validPlacement(
  g: Game,
  x: number,
  y: number,
  ignore?: string,
  key?: ItemKey,
  rotation: 0 | 1 = 0,
) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  const existing = g.items.find((i) => i.id === ignore);
  const candidate: OwnedItem = {
    id: "preview",
    key: key ?? existing?.key ?? "bed",
    placed: true,
    stock: 0,
    x,
    y,
    rotation,
  };
  const d = dimensions(candidate);
  if (x < 0 || y < 0 || x + d.width > g.width || y + d.height > g.height)
    return false;
  const positions = cells(candidate),
    blocked = blockedCells({
      ...g,
      items: g.items.filter((i) => i.id !== ignore),
    });
  const entrance = { x: Math.floor(g.width / 2), y: g.height - 1 };
  if (
    positions.some(
      (p) =>
        blocked.has(p.x + "," + p.y) ||
        (p.x === entrance.x && p.y === entrance.y) ||
        g.eggs.some((e) => e.readyAt !== null && e.x === p.x && e.y === p.y) ||
        g.bixins.some((b) => b.x === p.x && b.y === p.y),
    )
  )
    return false;
  const test = {
    ...g,
    items: [...g.items.filter((i) => i.id !== ignore), candidate],
  };
  const reachable = (p: Point) =>
    (p.x === entrance.x && p.y === entrance.y) ||
    pathfind(test, entrance, p).length > 0;
  const cx = Math.floor(g.width / 2),
    cy = Math.floor(g.height / 2);
  const interior = [
    { x: cx - 2, y: cy - 1 },
    { x: cx + 1, y: cy - 1 },
    { x: cx - 2, y: cy + 1 },
    { x: cx + 1, y: cy + 1 },
  ].some(reachable);
  return (
    interior &&
    test.items
      .filter((i) => i.placed)
      .every((i) => accessPoints(i).some(reachable)) &&
    test.bixins.every(reachable) &&
    test.eggs.filter((e) => e.readyAt !== null).every((e) => reachable(e))
  );
}
export function chooseActivity(g: Game, b: Bixin, at: number) {
  const candidates = g.items
    .filter((i) => {
      const used = g.bixins.filter(
        (o) => o.id !== b.id && o.targetId === i.id,
      ).length;
      const company =
        items[i.key].need !== "social" ||
        g.bixins.some(
          (other) =>
            other.id !== b.id && Math.hypot(other.x - i.x, other.y - i.y) <= 4,
        );
      return (
        i.placed &&
        company &&
        items[i.key].need !== null &&
        used < capacity(i) &&
        (!items[i.key].stockMax || i.stock > 0)
      );
    })
    .map((i) => {
      const reserved = new Set(
        g.bixins
          .filter((o) => o.id !== b.id && o.targetId === i.id)
          .map((o) => {
            const p = o.path.at(-1) ?? o;
            return p.x + "," + p.y;
          }),
      );
      const options = accessPoints(i)
        .filter((p) => !reserved.has(p.x + "," + p.y))
        .map((p) => ({ p, path: pathfind(g, b, p) }))
        .filter((o) => o.path.length || (o.p.x === b.x && o.p.y === b.y))
        .sort((a, c) => a.path.length - c.path.length);
      const need = items[i.key].need!;
      return {
        i,
        option: options[0],
        score:
          100 -
          b.needs[need] +
          (need === "hydration" && b.needs.hydration < 30 ? 100 : 0) +
          (species[b.species].trait === "Preguiçoso" && need === "energy"
            ? 8
            : 0) -
          (options[0]?.path.length ?? 0) * 0.25,
      };
    })
    .filter((c) => c.option)
    .sort((a, c) => c.score - a.score || a.i.id.localeCompare(c.i.id));
  const target = candidates[0];
  if (target && (target.score > 20 || Math.floor(at / 20000) % 4 === 0)) {
    b.targetId = target.i.id;
    b.path = target.option.path;
    b.activity = items[target.i.key].activity;
    return;
  }
  let hash = g.seed;
  for (const c of b.id) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0;
  const random = rng(hash + Math.floor(at / 20000));
  const p = {
    x: Math.floor(random() * g.width),
    y: Math.floor(random() * g.height),
  };
  b.targetId = undefined;
  b.path = pathfind(g, b, p);
  b.activity = "Passeando";
}
export function simulate(g: Game, now: number) {
  migrateGame(g);
  const end = Math.max(g.lastSimulated, now),
    stop = Math.min(end, g.lastSimulated + CONFIG.offlineHours * 3600000);
  let t = g.lastSimulated;
  const blocked = blockedCells(g);
  while (t + CONFIG.stepSeconds * 1000 <= stop) {
    t += CONFIG.stepSeconds * 1000;
    const h = CONFIG.stepSeconds / 3600;
    for (const b of g.bixins) {
      for (const n of Object.keys(decay) as Need[]) {
        const rate =
          n === "social" && species[b.species].trait === "Solitário"
            ? 0.5
            : decay[n];
        b.needs[n] = Math.max(0, Math.min(100, b.needs[n] - rate * h));
      }
      if (b.needs.satiety < 10 || b.needs.hydration < 10)
        b.needs.health = Math.max(35, b.needs.health - 2 * h);
      if (b.path.length) {
        const next = b.path.shift()!;
        if (!blocked.has(next.x + "," + next.y)) {
          b.x = next.x;
          b.y = next.y;
        } else {
          b.path = [];
          b.targetId = undefined;
        }
        continue;
      }
      const target = g.items.find((i) => i.id === b.targetId && i.placed);
      if (target && adjacent(target, b)) {
        const def = items[target.key],
          need = def.need;
        if (need && (!def.stockMax || target.stock > 0)) {
          if (def.stockMax) target.stock--;
          b.needs[need] = Math.min(
            100,
            b.needs[need] + def.effect + ((target.level ?? 1) - 1) * 10,
          );
          for (const [n, effect] of Object.entries(def.extra))
            b.needs[n as Need] = Math.min(100, b.needs[n as Need] + effect);
          if (
            need === "energy" &&
            g.items.some(
              (i) =>
                i.placed &&
                (i.key === "tree" || i.key === "bench") &&
                Math.hypot(i.x - target.x, i.y - target.y) <= 4,
            )
          )
            b.needs.comfort = Math.min(100, b.needs.comfort + 8);
          const text =
            need === "satiety"
              ? "saboreou um lanchinho"
              : need === "hydration"
                ? "bebeu água fresquinha"
                : need === "energy"
                  ? "tirou uma soneca"
                  : need === "hygiene"
                    ? "tomou um banho de bolhas"
                    : need === "social"
                      ? "descansou no Banco do encontro"
                      : need === "health"
                        ? "recebeu cuidados no postinho"
                        : "inventou uma brincadeira";
          event(g, `${b.name} ${text}.`, t);
        }
        b.targetId = undefined;
      }
      chooseActivity(g, b, t);
    }
  }
  g.lastSimulated = t;
  if (end > stop) {
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
        g.bixins.reduce((sum, b) => sum + wellbeing(b), 0) / g.bixins.length;
      const value =
        paid *
        Math.round(
          12 +
            3 * Math.min(g.bixins.length, 12) +
            0.08 * avg +
            0.03 * charm(g) +
            Math.min(8, g.discoveries.length) * 2,
        );
      g.credits += value;
      g.ledger.unshift({
        id: `income-${g.lastIncome}`,
        at: end,
        delta: value,
        balance: g.credits,
        kind: "Visitação",
      });
      if (avg >= 80) g.incomeCycles = (g.incomeCycles ?? 0) + paid;
      event(g, `Seu refúgio recebeu C$ ${value} em visitação.`, end);
    }
    g.lastIncome += hours * 3600000;
  }
  updateMissions(g, end);
  return g;
}
export function hatch(g: Game, id: string, now: number) {
  migrateGame(g);
  const e = g.eggs.find((e) => e.id === id);
  if (!e || e.readyAt === null || now < e.readyAt)
    throw Error("Esse ovo ainda está se preparando.");
  if (g.bixins.length >= g.capacity) throw Error("Seu refúgio está cheio.");
  const b: Bixin = {
    id: `bixin-${e.id}`,
    species: e.species,
    name: species[e.species].defaultName,
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
    origin: e.origin ?? species[e.species].regionKey,
  };
  g.bixins.push(b);
  g.eggs = g.eggs.filter((o) => o.id !== id);
  if (!g.discoveries.includes(e.species)) {
    g.discoveries.push(e.species);
    event(g, `${species[e.species].name} entrou para sua Bixinpédia.`, now);
  }
  g.discoveryCounts![e.species] = (g.discoveryCounts![e.species] ?? 0) + 1;
  event(g, `${b.name} nasceu! Que bom ter você por aqui.`, now);
  updateMissions(g, now);
  return b;
}

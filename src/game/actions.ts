import { z } from "zod";
import {
  CONFIG,
  items,
  species,
  regions,
  type ItemKey,
  type Species,
  type RegionKey,
} from "./config";
import { event, hatch, rng, validPlacement } from "./engine";
import { stockMax, upgradePrice } from "./geometry";
import {
  eggPrice,
  expeditionReward,
  migrateGame,
  missions,
  saleQuote,
  shopEggs,
  updateMissions,
} from "./progression";
import type { Game } from "./types";
const xy = {
  x: z.number().int().min(0).max(43),
  y: z.number().int().min(0).max(27),
};
const itemKeys = Object.keys(items) as [ItemKey, ...ItemKey[]],
  speciesKeys = Object.keys(species) as [Species, ...Species[]],
  regionKeys = Object.keys(regions) as [RegionKey, ...RegionKey[]];
export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sync") }),
  z.object({
    type: z.literal("place"),
    id: z.string().max(100),
    ...xy,
    rotation: z.union([z.literal(0), z.literal(1)]).optional(),
  }),
  z.object({ type: z.literal("store"), id: z.string().max(100) }),
  z.object({ type: z.literal("upgrade"), id: z.string().max(100) }),
  z.object({ type: z.literal("incubate"), id: z.string().max(100), ...xy }),
  z.object({ type: z.literal("hatch"), id: z.string().max(100) }),
  z.object({
    type: z.literal("rename"),
    id: z.string().max(100),
    name: z.string().trim().min(1).max(24),
  }),
  z.object({
    type: z.literal("care"),
    id: z.string().max(100),
    kind: z.enum(["pet", "snack", "bath"]),
  }),
  z.object({ type: z.literal("refill"), id: z.string().max(100) }),
  z.object({ type: z.literal("buy-food") }),
  z.object({ type: z.literal("buy"), key: z.enum(itemKeys) }),
  z.object({ type: z.literal("buy-egg"), species: z.enum(speciesKeys) }),
  z.object({ type: z.literal("expand") }),
  z.object({
    type: z.literal("claim-mission"),
    mission: z.enum(
      Object.keys(missions) as [
        keyof typeof missions,
        ...(keyof typeof missions)[],
      ],
    ),
  }),
  z.object({ type: z.literal("start-expedition"), region: z.enum(regionKeys) }),
  z.object({ type: z.literal("claim-expedition"), id: z.string().max(100) }),
  z.object({
    type: z.literal("sell"),
    id: z.string().max(100),
    expectedPrice: z.number().int().positive(),
  }),
]);
export type Action = z.infer<typeof actionSchema>;
function money(g: Game, delta: number, kind: string, now: number, id: string) {
  if (g.credits + delta < 0)
    throw Error("Ainda faltam créditos para essa ação.");
  g.credits += delta;
  g.ledger.unshift({ id, at: now, delta, balance: g.credits, kind });
}
export function applyAction(
  g: Game,
  a: Action,
  now: number,
  key: string,
  entropy?: number,
) {
  migrateGame(g);
  updateMissions(g, now);
  if (a.type === "buy-food") {
    if (g.food + CONFIG.foodPackSize > CONFIG.maxFoodReserve)
      throw Error("Sua reserva de ração já está cheia.");
    money(g, -CONFIG.foodPackPrice, "Ração básica", now, key);
    g.food += CONFIG.foodPackSize;
    event(
      g,
      `Mais ${CONFIG.foodPackSize} porções chegaram à reserva de ração.`,
      now,
    );
  }
  if (a.type === "place") {
    const i = g.items.find((i) => i.id === a.id);
    if (!i) throw Error("Objeto não encontrado.");
    const rotation = a.rotation ?? i.rotation ?? 0;
    if (!validPlacement(g, a.x, a.y, i.id, i.key, rotation))
      throw Error("Esse lugar está ocupado ou bloquearia um caminho.");
    Object.assign(i, { x: a.x, y: a.y, placed: true, rotation });
    for (const b of g.bixins) {
      b.path = [];
      b.targetId = undefined;
    }
    event(g, `${items[i.key].name} ganhou um cantinho no refúgio.`, now);
  }
  if (a.type === "store") {
    const i = g.items.find((i) => i.id === a.id);
    if (!i) throw Error("Objeto não encontrado.");
    i.placed = false;
    for (const b of g.bixins) {
      b.path = [];
      b.targetId = undefined;
    }
    event(g, `${items[i.key].name} voltou para a caixa.`, now);
  }
  if (a.type === "upgrade") {
    const i = g.items.find((i) => i.id === a.id);
    if (!i) throw Error("Objeto não encontrado.");
    if ((i.level ?? 1) >= 3) throw Error("Esse objeto já está encantado.");
    const price = upgradePrice(i);
    money(g, -price, `Melhoria: ${items[i.key].name}`, now, key);
    i.level = (i.level ?? 1) + 1;
    event(
      g,
      `${items[i.key].name} está ${i.level === 2 ? "melhorado" : "encantado"}!`,
      now,
    );
  }
  if (a.type === "incubate") {
    const e = g.eggs.find((e) => e.id === a.id);
    if (!e || e.readyAt !== null) throw Error("Esse ovo já está no ninho.");
    if (
      g.bixins.length + g.eggs.filter((e) => e.readyAt !== null).length >=
      g.capacity
    )
      throw Error("Seu refúgio está cheio.");
    if (!validPlacement(g, a.x, a.y))
      throw Error("Escolha um lugar livre para o ninho.");
    Object.assign(e, {
      x: a.x,
      y: a.y,
      readyAt:
        now + (e.first ? CONFIG.firstEggSeconds : CONFIG.eggSeconds) * 1000,
    });
    event(g, "O ninho está pronto. Tem alguém se mexendo aqui dentro!", now);
  }
  if (a.type === "hatch") hatch(g, a.id, now);
  if (a.type === "rename") {
    const b = g.bixins.find((b) => b.id === a.id);
    if (!b) throw Error("Bixin não encontrado.");
    b.name = a.name;
    event(
      g,
      `Agora nosso pequeno ${species[b.species].name} se chama ${a.name}.`,
      now,
    );
  }
  if (a.type === "care") {
    const b = g.bixins.find((b) => b.id === a.id);
    if (!b) throw Error("Bixin não encontrado.");
    if (now - b.careAt < CONFIG.careCooldown * 1000)
      throw Error("Espere um pouquinho antes do próximo cuidado.");
    if (a.kind === "snack") {
      if (g.food < 1) throw Error("Sua cota gratuita de ração volta amanhã.");
      g.food--;
      b.needs.satiety = Math.min(100, b.needs.satiety + 20);
    }
    if (a.kind === "pet") {
      b.needs.social = Math.min(100, b.needs.social + 15);
      b.needs.fun = Math.min(100, b.needs.fun + 5);
    }
    if (a.kind === "bath")
      b.needs.hygiene = Math.min(100, b.needs.hygiene + 20);
    b.careAt = now;
    g.careCount = (g.careCount ?? 0) + 1;
    event(
      g,
      `${b.name} recebeu ${a.kind === "pet" ? "um carinho" : a.kind === "bath" ? "um banho gostoso" : "um petisco"}.`,
      now,
    );
  }
  if (a.type === "refill") {
    const i = g.items.find((i) => i.id === a.id);
    if (!i || !items[i.key].stockMax) throw Error("Comedouro não encontrado.");
    const max = stockMax(i),
      count = Math.min(max - i.stock, g.food);
    if (count <= 0)
      throw Error(
        i.stock >= max
          ? "O comedouro já está cheio."
          : "Sua cota gratuita de ração volta amanhã.",
      );
    g.food -= count;
    i.stock += count;
    event(g, "Comedouro reabastecido. Hora do lanchinho!", now);
  }
  if (a.type === "buy") {
    if (g.items.length >= 60) throw Error("Sua caixa está cheia.");
    money(g, -items[a.key].price, `Compra: ${items[a.key].name}`, now, key);
    g.items.push({
      id: key,
      key: a.key,
      x: 0,
      y: 0,
      placed: false,
      stock: items[a.key].stockMax,
      level: 1,
      rotation: 0,
    });
    event(g, `${items[a.key].name} chegou à caixa de entregas.`, now);
  }
  if (a.type === "expand") {
    if ((g.level ?? 1) >= 2) throw Error("Seu Terreninho já está ampliado.");
    money(g, -CONFIG.expansionPrice, "Expansão: Terreninho", now, key);
    Object.assign(g, {
      width: CONFIG.expandedWidth,
      height: CONFIG.expandedHeight,
      capacity: CONFIG.expandedCapacity,
      level: 2,
    });
    event(g, "Seu quintal virou um Terreninho! Agora cabem dez Bixins.", now);
  }
  if (a.type === "claim-mission") {
    const state = g.missions![a.mission];
    if (state?.completedAt == null)
      throw Error("Esse objetivo ainda está a caminho.");
    if (state.claimedAt !== null)
      throw Error("Essa recompensa já está guardada com você.");
    state.claimedAt = now;
    g.xp = (g.xp ?? 0) + missions[a.mission].xp;
    money(
      g,
      missions[a.mission].reward,
      `Objetivo: ${missions[a.mission].title}`,
      now,
      `mission-${a.mission}`,
    );
    event(
      g,
      `Objetivo concluído: ${missions[a.mission].title}. Você recebeu C$ ${missions[a.mission].reward}.`,
      now,
    );
  }
  if (a.type === "buy-egg") {
    if (!shopEggs(g, now).includes(a.species))
      throw Error("Esse ovo não está no catálogo de hoje.");
    if (g.eggs.length + (g.expedition ? 1 : 0) >= CONFIG.maxEggs)
      throw Error(
        "A ovoteca está cheia. Uma expedição reserva espaço para seu achado.",
      );
    money(
      g,
      -eggPrice(a.species),
      `Ovo de ${species[a.species].name}`,
      now,
      key,
    );
    g.eggs.push({
      id: key,
      species: a.species,
      first: false,
      readyAt: null,
      x: 0,
      y: 0,
      origin: species[a.species].regionKey,
    });
    event(g, `Um ovo de ${species[a.species].name} chegou à sua ovoteca.`, now);
  }
  if (a.type === "start-expedition") {
    const r = regions[a.region];
    if (!r.active) throw Error("Esse caminho ainda está sendo preparado.");
    if ((g.level ?? 1) < r.level)
      throw Error("Amplie para o Terreninho para explorar o Cerrado.");
    if (g.expedition) throw Error("Sua equipe já está em uma expedição.");
    if (g.eggs.length >= CONFIG.maxEggs)
      throw Error("Prepare espaço na ovoteca antes de explorar.");
    money(g, -r.price, `Expedição: ${r.name}`, now, key);
    const seed = entropy ?? g.seed + g.version;
    const reward = expeditionReward(a.region, rng(seed)());
    g.expedition = {
      id: key,
      region: a.region,
      startedAt: now,
      endsAt: now + r.seconds * 1000,
      seed,
      reward,
    };
    event(g, `Uma expedição partiu para a ${r.name}. Boa descoberta!`, now);
  }
  if (a.type === "claim-expedition") {
    const e = g.expedition;
    if (!e || e.id !== a.id)
      throw Error("Essa expedição já foi resgatada ou não pertence a você.");
    if (now < e.endsAt) throw Error("Sua equipe ainda está explorando.");
    if (e.reward.species && g.eggs.length >= CONFIG.maxEggs)
      throw Error("Sua ovoteca precisa de um lugar livre.");
    if (e.reward.species)
      g.eggs.push({
        id: `egg-${e.id}`,
        species: e.reward.species,
        first: false,
        readyAt: null,
        x: 0,
        y: 0,
        origin: e.region,
      });
    if (e.reward.credits)
      money(
        g,
        e.reward.credits,
        `Achado: ${regions[e.region].name}`,
        now,
        `reward-${e.id}`,
      );
    if (e.reward.item && g.items.length < 60)
      g.items.push({
        id: `item-${e.id}`,
        key: e.reward.item,
        x: 0,
        y: 0,
        placed: false,
        stock: 0,
        level: 1,
        rotation: 0,
      });
    event(
      g,
      e.reward.species
        ? `A expedição voltou com um ovo de ${species[e.reward.species].name}! Ele está na ovoteca.`
        : "A expedição voltou com flores e C$ 25. O caminho também trouxe histórias.",
      now,
    );
    g.expedition = null;
    g.expeditionsCompleted = (g.expeditionsCompleted ?? 0) + 1;
  }
  if (a.type === "sell") {
    const b = g.bixins.find((b) => b.id === a.id);
    if (!b) throw Error("Esse Bixin não está mais no seu refúgio.");
    const quote = saleQuote(g, b, now);
    if (!quote.allowed) throw Error(quote.reason);
    if (quote.price !== a.expectedPrice)
      throw Error(
        "O valor mudou com o bem-estar. Sincronize e confirme a nova proposta.",
      );
    money(g, quote.price, `Transferência: ${b.name}`, now, key);
    g.transfers!.unshift({
      id: key,
      bixin: structuredClone(b),
      at: now,
      price: quote.price,
    });
    g.bixins = g.bixins.filter((o) => o.id !== a.id);
    event(
      g,
      `${b.name} seguiu para outro refúgio por C$ ${quote.price}. Sua história fica no diário.`,
      now,
    );
  }
  updateMissions(g, now);
}
export function publicSnapshot(g: Game): Game {
  if (!g.expedition) return g;
  return {
    ...g,
    expedition: { ...g.expedition, seed: 0, reward: { credits: 0 } },
  };
}

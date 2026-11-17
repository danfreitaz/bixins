import {
  CONFIG,
  items,
  rarities,
  species,
  type Species,
  type RegionKey,
  regions,
  expeditionChances,
} from "./config";
import type { Bixin, Game } from "./types";
export function migrateGame(g: Game): Game {
  g.schemaVersion = 2;
  g.xp ??= 0;
  g.level ??= g.width > 20 ? 2 : 1;
  g.missions ??= {};
  g.expedition ??= null;
  g.expeditionsCompleted ??= 0;
  g.careCount ??= 0;
  g.incomeCycles ??= 0;
  g.transfers ??= [];
  g.discoveryCounts ??= {};
  for (const i of g.items) {
    i.level ??= 1;
    i.rotation ??= 0;
  }
  return g;
}
export function wellbeing(b: Bixin) {
  const n = b.needs;
  return (
    n.health * 0.25 +
    n.satiety * 0.12 +
    n.hydration * 0.12 +
    n.energy * 0.12 +
    n.hygiene * 0.08 +
    n.social * 0.1 +
    n.fun * 0.1 +
    n.comfort * 0.11
  );
}
export function charm(g: Game) {
  const counts: Record<string, number> = {};
  return Math.min(
    100,
    g.items
      .filter((i) => i.placed)
      .reduce((sum, i) => {
        const n = counts[i.key] ?? 0;
        counts[i.key] = n + 1;
        return (
          sum + (items[i.key].charm + ((i.level ?? 1) - 1) * 2) / (1 + n * 0.6)
        );
      }, 0),
  );
}
export function stageOf(b: Bixin, now: number) {
  const h = Math.max(0, now - b.bornAt) / 3600000;
  return h < CONFIG.babyHours
    ? "Filhote"
    : h < CONFIG.adultHours
      ? "Juvenil"
      : h < CONFIG.veteranHours
        ? "Adulto"
        : "Veterano";
}
export function saleQuote(
  g: Game,
  b: Bixin,
  now: number,
): { allowed: boolean; reason: string; price: number } {
  const stage = stageOf(b, now);
  const condition = Math.min(
    1,
    Math.max(0.6, 0.6 + (0.4 * wellbeing(b)) / 100),
  );
  const price = Math.round(
    rarities[species[b.species].rarity].baseValue *
      condition *
      (stage === "Veterano" ? 0.9 : 1) *
      (b.variant === "aurora" ? 1.1 : 1) *
      0.55,
  );
  const reason =
    g.bixins.length <= 1
      ? "O último Bixin fica com você para continuar a história."
      : !["Adulto", "Veterano"].includes(stage)
        ? "Somente adultos e veteranos podem ir para outro refúgio."
        : b.needs.health < 65 ||
            b.needs.satiety < 30 ||
            b.needs.hydration < 30 ||
            wellbeing(b) < 65
          ? "Esse Bixin precisa de cuidados antes da transferência."
          : "";
  return { allowed: !reason, reason, price };
}
export const eggPrice = (s: Species) =>
  Math.round(rarities[species[s].rarity].baseValue * 1.4);
export function shopEggs(g: Game, now: number): Species[] {
  // Two daily, stable offers per unlocked region. The same day never rerolls.
  const day = Math.floor(now / 86400000);
  return (["mata", "caatinga", "cerrado"] as const).flatMap((region, r) => {
    if ((g.level ?? 1) < regions[region].level) return [];
    const list = (Object.keys(species) as Species[]).filter(
      (s) => species[s].regionKey === region,
    );
    const index = (day + r) % list.length;
    return [list[index], list[(index + 1) % list.length]];
  });
}
export function expeditionReward(region: RegionKey, roll: number) {
  const outcome = roll * 100;
  let cutoff = 0;
  let rarity: "common" | "uncommon" | "rare" | null = null;
  for (const key of ["common", "uncommon", "rare", "resources"] as const) {
    cutoff += expeditionChances[key];
    if (outcome < cutoff) {
      rarity = key === "resources" ? null : key;
      break;
    }
  }
  const found = (Object.keys(species) as Species[]).find(
    (s) => species[s].regionKey === region && species[s].rarity === rarity,
  );
  return found
    ? {
        species: found,
        credits: 0,
        item: rarity === "common" ? ("flowers" as const) : undefined,
      }
    : { credits: 25, item: "flowers" as const };
}
export const missions = {
  welcome: {
    title: "Um cantinho preparado",
    description: "Instale os quatro objetos do kit.",
    reward: 80,
    xp: 10,
  },
  hatch: {
    title: "Olá, pequeno mundo!",
    description: "Conheça seu primeiro Bixin.",
    reward: 60,
    xp: 10,
  },
  care: {
    title: "Carinho que fica",
    description: "Faça três cuidados diretos.",
    reward: 60,
    xp: 10,
  },
  pair: {
    title: "Companhia boa",
    description: "Tenha dois Bixins saudáveis.",
    reward: 120,
    xp: 20,
  },
  diversity: {
    title: "Um refúgio de descobertas",
    description: "Descubra três espécies.",
    reward: 150,
    xp: 20,
  },
  social: {
    title: "Senta aqui comigo",
    description: "Instale um Banco do encontro.",
    reward: 80,
    xp: 10,
  },
  wellbeing: {
    title: "Um lar confortável",
    description: "Receba visitação com bem-estar médio de 80.",
    reward: 100,
    xp: 10,
  },
  expedition: {
    title: "Além da cerca",
    description: "Resgate sua primeira expedição.",
    reward: 100,
    xp: 20,
  },
  expansion: {
    title: "Cabe mais carinho",
    description: "Amplie para o Terreninho.",
    reward: 200,
    xp: 30,
  },
} as const;
export type MissionKey = keyof typeof missions;
export function updateMissions(g: Game, now: number) {
  migrateGame(g);
  const goals: Record<MissionKey, boolean> = {
    welcome: ["kit-0", "kit-1", "kit-2", "kit-3"].every((id) =>
      g.items.some((i) => i.id === id && i.placed),
    ),
    hatch: g.discoveries.length > 0,
    care: g.careCount! >= 3,
    pair:
      g.bixins.filter((b) => b.needs.health >= 65 && wellbeing(b) >= 65)
        .length >= 2,
    diversity: g.discoveries.length >= 3,
    social: g.items.some((i) => i.key === "bench" && i.placed),
    wellbeing: (g.incomeCycles ?? 0) > 0,
    expedition: (g.expeditionsCompleted ?? 0) > 0,
    expansion: (g.level ?? 1) >= 2,
  };
  for (const key of Object.keys(missions) as MissionKey[]) {
    const m = (g.missions![key] ??= { completedAt: null, claimedAt: null });
    if (goals[key] && m.completedAt === null) m.completedAt = now;
  }
}

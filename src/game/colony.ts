import { CONFIG, species } from "./config";
import { adjacent } from "./geometry";
import type { Bixin, Game, Genome, Relationship } from "./types";

export const traits = [
  "Curioso",
  "Carinhoso",
  "Brincalhão",
  "Tímido",
  "Organizado",
  "Guloso",
  "Preguiçoso",
  "Solitário",
  "Brigão",
  "Corajoso",
];
export function stableRandom(seed: string | number) {
  let h = 2166136261;
  for (const c of String(seed))
    h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => (h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296;
}
export function initialGenome(id: string): Genome {
  const r = stableRandom(id);
  return {
    primary: Math.floor(r() * 3),
    secondary: Math.floor(r() * 3),
    pattern: ["liso", "pintado", "listrado"][
      Math.floor(r() * 3)
    ] as Genome["pattern"],
    size: ["pequeno", "médio", "fofucho"][
      Math.floor(r() * 3)
    ] as Genome["size"],
    ears: Math.floor(r() * 3),
    tail: Math.floor(r() * 3),
    crest: Math.floor(r() * 3),
    temperamentBias: Math.floor(r() * 5) - 2,
    energyBias: Math.floor(r() * 5) - 2,
  };
}
export function wildIdentity(sp: Bixin["species"], seed: string | number) {
  const random = stableRandom(seed);
  const secondary = [...traits].sort(
    (a, b) => stableRandom(`${seed}:${a}`)() - stableRandom(`${seed}:${b}`)(),
  );
  return {
    genome: initialGenome(String(seed)),
    role: random() < 0.5 ? ("A" as const) : ("B" as const),
    traits: [...new Set([species[sp].trait, ...secondary])].slice(0, 3),
  };
}
export function initializeColony(g: Game) {
  g.relationships ??= {};
  g.nest ??= null;
  g.milestones ??= [];
  for (const b of [...g.bixins, ...(g.transfers ?? []).map((t) => t.bixin)]) {
    b.genome ??= initialGenome(b.id);
    b.genderLabel ??= "Identidade livre";
    b.lastBredAt ??= 0;
  }
}
export const relationshipKey = (a: string, b: string) =>
  JSON.stringify([a, b].sort());
export const affinity = (g: Game, a: string, b: string) =>
  g.relationships?.[relationshipKey(a, b)]?.affinity ?? 0;
export function relation(g: Game, a: string, b: string): Relationship {
  g.relationships ??= {};
  return (g.relationships[relationshipKey(a, b)] ??= {
    a,
    b,
    affinity: 0,
    interactions: 0,
    lastAt: 0,
  });
}
export function related(a: Bixin, b: Bixin) {
  const parentsA = [a.parentA, a.parentB].filter(Boolean);
  const parentsB = [b.parentA, b.parentB].filter(Boolean);
  return (
    a.id === b.id ||
    parentsA.includes(b.id) ||
    parentsB.includes(a.id) ||
    parentsA.some((id) => parentsB.includes(id))
  );
}
export function compatibility(a: Bixin, b: Bixin) {
  const shared = a.traits.filter((t) => b.traits.includes(t)).length;
  return Math.max(
    -2,
    Math.min(
      4,
      shared +
        (a.traits.includes("Carinhoso") || b.traits.includes("Carinhoso")
          ? 1
          : 0) -
        (a.traits.includes("Brigão") || b.traits.includes("Brigão") ? 2 : 0) -
        (a.traits.includes("Solitário") && b.traits.includes("Brincalhão")
          ? 1
          : 0),
    ),
  );
}
export function breedingReason(g: Game, a?: Bixin, b?: Bixin, now = 0) {
  if (!a || !b || a.id === b.id) return "Escolha dois Bixins do seu refúgio.";
  if (a.species !== b.species) return "O casal precisa ser da mesma espécie.";
  if (a.role === b.role) return "A compatibilidade do casal requer A + B.";
  if (related(a, b)) return "Pais, filhos e irmãos não formam um casal.";
  if ([a, b].some((o) => now - o.bornAt < CONFIG.adultHours * 3600000))
    return "Os dois precisam ser adultos (24 horas reais).";
  if (
    [a, b].some(
      (o) => o.needs.health < 70 || Object.values(o.needs).some((n) => n < 50),
    )
  )
    return "O casal precisa de saúde 70 e todas as necessidades em pelo menos 50.";
  if (
    [a, b].some(
      (o) =>
        (o.lastBredAt ?? 0) > 0 &&
        now - o.lastBredAt! < CONFIG.breedingHours * 3600000,
    )
  )
    return "Depois de um ovo, cada progenitor descansa por 24 horas reais.";
  if (affinity(g, a.id, b.id) < CONFIG.breedingAffinity)
    return "O laço precisa chegar a 30 por meio de encontros.";
  const reserved = g.eggs.length + (g.expedition ? 1 : 0);
  if (reserved >= CONFIG.maxEggs) return "A ovoteca precisa de uma vaga livre.";
  if (g.bixins.length + reserved >= g.capacity)
    return "O refúgio precisa de espaço para acolher o filhote.";
  if (g.food < CONFIG.breedingFood)
    return "Reserve 12 porções de ração para o casal.";
  return "";
}
export function inherit(a: Bixin, b: Bixin, seed: number) {
  const random = stableRandom(seed),
    fresh = initialGenome(`offspring-${seed}`);
  const genome = {} as Genome;
  for (const k of Object.keys(fresh) as (keyof Genome)[]) {
    const roll = random();
    // Both parents are normalized on migration. Each locus has 45/45/10 odds.
    Object.assign(genome, {
      [k]:
        roll < CONFIG.inheritParentChance
          ? a.genome![k]
          : roll < CONFIG.inheritParentChance * 2
            ? b.genome![k]
            : fresh[k],
    });
  }
  const inheritedTraits: string[] = [];
  for (let i = 0; i < 3; i++) {
    const roll = random();
    const t =
      roll < CONFIG.inheritParentChance
        ? a.traits[i]
        : roll < CONFIG.inheritParentChance * 2
          ? b.traits[i]
          : traits[Math.floor(random() * traits.length)];
    if (t && !inheritedTraits.includes(t)) inheritedTraits.push(t);
  }
  for (const t of [species[a.species].trait, ...traits])
    if (inheritedTraits.length < 3 && !inheritedTraits.includes(t))
      inheritedTraits.push(t);
  return {
    genome,
    traits: inheritedTraits,
    variant: random() < CONFIG.specialVariantChance ? "aurora" : undefined,
    role: random() < 0.5 ? ("A" as const) : ("B" as const),
  };
}
type Narrate = (g: Game, text: string, at: number, milestone?: boolean) => void;
export function tickColony(g: Game, at: number, narrate: Narrate) {
  // Only a mutual encounter or shared reachable equipment can form a relationship.
  for (let i = 0; i < g.bixins.length; i++)
    for (let j = i + 1; j < g.bixins.length; j++) {
      const a = g.bixins[i],
        b = g.bixins[j];
      if (
        Math.hypot(a.x - b.x, a.y - b.y) > 2.2 ||
        a.path.length ||
        b.path.length
      )
        continue;
      const encounter = a.partnerId === b.id && b.partnerId === a.id;
      const shared =
        a.targetId &&
        a.targetId === b.targetId &&
        g.items.some(
          (o) =>
            o.id === a.targetId &&
            o.placed &&
            adjacent(o, a) &&
            adjacent(o, b) &&
            ["bench", "toy", "tunnel", "cushion", "house", "fruit"].includes(
              o.key,
            ),
        );
      if (!encounter && !shared) continue;
      const r = relation(g, a.id, b.id);
      if (at - r.lastAt < CONFIG.socialSeconds * 1000) continue;
      const random = stableRandom(`${g.seed}:${r.a}:${r.b}:${r.interactions}`);
      const toyNearby = g.items.some(
        (o) =>
          o.placed &&
          o.key === "toy" &&
          Math.hypot(a.x - o.x, a.y - o.y) <= 4 &&
          Math.hypot(b.x - o.x, b.y - o.y) <= 4,
      );
      const conflict =
        toyNearby &&
        (a.traits.includes("Brigão") || b.traits.includes("Brigão")) &&
        random() < 0.25;
      r.affinity = Math.max(
        -100,
        Math.min(100, r.affinity + (conflict ? -4 : 3 + compatibility(a, b))),
      );
      r.interactions++;
      r.lastAt = at;
      r.lastKind = conflict
        ? "Uma disputa pela bolinha"
        : r.affinity < 0
          ? "Reconciliação"
          : r.affinity >= 30
            ? "Companhia querida"
            : "Um encontro curioso";
      for (const o of [a, b]) {
        o.needs.social = Math.max(
          0,
          Math.min(100, o.needs.social + (conflict ? -3 : 12)),
        );
        o.needs.fun = Math.max(
          0,
          Math.min(100, o.needs.fun + (conflict ? -2 : 6)),
        );
        o.activity = conflict ? "Disputando a bolinha" : "Conversando";
        o.partnerId = undefined;
        o.path = [];
        o.targetId = undefined;
      }
      if (r.affinity >= 30 && !r.friendshipAt) {
        r.friendshipAt = at;
        narrate(g, `${a.name} e ${b.name} construíram uma amizade!`, at, true);
      } else if (conflict || r.interactions % 6 === 1) {
        narrate(
          g,
          conflict
            ? `${a.name} e ${b.name} disputaram a bolinha. No fim, ela ficou com a grama.`
            : `${a.name} e ${b.name} ${r.affinity < 0 ? "fizeram as pazes aos pouquinhos" : "compartilharam uma brincadeira"}.`,
          at,
        );
      }
    }
  const n = g.nest;
  if (!n) return;
  if (at < n.preparedAt) return;
  const a = g.bixins.find((b) => b.id === n.a),
    b = g.bixins.find((b) => b.id === n.b);
  const item = g.items.find(
    (i) => i.id === n.itemId && i.key === "nest" && i.placed,
  );
  if (!a || !b || !item) {
    g.nest = null;
    return;
  }
  if (
    breedingReason(g, a, b, at) ||
    !adjacent(item, a) ||
    !adjacent(item, b) ||
    a.path.length ||
    b.path.length
  ) {
    n.settledAt = null;
    return;
  }
  n.settledAt ??= at;
  a.activity = b.activity = "Aconchegando o ninho";
  if (at - n.settledAt < CONFIG.nestingSeconds * 1000) return;
  const parents = a.role === "A" ? [a, b] : [b, a];
  const egg = {
    id: `family-${n.preparedAt}-${n.seed}`,
    species: a.species,
    first: false,
    x: 0,
    y: 0,
    readyAt: null,
    origin: a.origin,
    parentA: parents[0].id,
    parentB: parents[1].id,
    ...inherit(parents[0], parents[1], n.seed),
  };
  g.food -= CONFIG.breedingFood;
  g.eggs.push(egg);
  a.lastBredAt = b.lastBredAt = at;
  a.targetId = b.targetId = undefined;
  g.nest = null;
  narrate(
    g,
    `${a.name} e ${b.name} prepararam um novo ovo! A história da família continua na ovoteca.`,
    at,
    true,
  );
}
export function environment(at: number) {
  const phase =
    ((Math.max(0, at) / 1000) % CONFIG.daySeconds) / CONFIG.daySeconds;
  const night = phase >= 0.65 || phase < 0.12;
  const rain = Math.floor(at / 600000) % 7 === 3;
  return {
    phase,
    night,
    rain,
    label: `${night ? "Noite de vagalumes" : phase < 0.3 ? "Manhã de descobertas" : "Tarde no cantinho"}${rain ? " · Chuvinha leve" : ""}`,
  };
}

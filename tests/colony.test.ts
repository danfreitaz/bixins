import { describe, it, expect } from "vitest";
import {
  createGame,
  hatch,
  simulate,
  chooseActivity,
  event,
} from "../src/game/engine";
import { applyAction, publicSnapshot } from "../src/game/actions";
import {
  affinity,
  breedingReason,
  environment,
  inherit,
  initialGenome,
  relation,
  related,
  tickColony,
  stableRandom,
} from "../src/game/colony";
import { CONFIG } from "../src/game/config";
import { migrateGame } from "../src/game/progression";
const now = 1800000000000;
function family() {
  const g = createGame(now, 124);
  g.eggs[0].readyAt = now;
  hatch(g, "first-egg", now);
  g.eggs.push({
    id: "second",
    species: g.bixins[0].species,
    first: false,
    readyAt: now,
    x: 8,
    y: 7,
  });
  hatch(g, "second", now);
  const [a, b] = g.bixins;
  Object.assign(a, { role: "A", bornAt: now - 25 * 3600000, x: 4, y: 5 });
  Object.assign(b, { role: "B", bornAt: now - 25 * 3600000, x: 5, y: 4 });
  for (const o of [a, b]) {
    for (const k of Object.keys(o.needs) as (keyof typeof o.needs)[])
      o.needs[k] = 95;
    o.traits = ["Carinhoso", "Curioso", "Organizado"];
  }
  relation(g, a.id, b.id).affinity = 40;
  g.items.push({ id: "nest", key: "nest", x: 5, y: 5, placed: true, stock: 0 });
  return g;
}
describe("Colônia autônoma e linhagem", () => {
  it("encontros surgem por rotas autônomas, não por uma ação de amizade do jogador", () => {
    const g = family();
    g.relationships = {};
    for (const b of g.bixins) b.needs.social = 40;
    simulate(g, now + 120000);
    expect(
      Object.values(g.relationships!).some((r) => r.interactions > 0),
    ).toBe(true);
  });
  it("disputas leves exigem brinquedo real, têm humor e não ferem", () => {
    const g = family();
    const [a, b] = g.bixins;
    a.traits = ["Brigão"];
    g.relationships = {};
    const r = relation(g, a.id, b.id);
    while (stableRandom(`${g.seed}:${r.a}:${r.b}:${r.interactions}`)() >= 0.25)
      r.interactions++;
    a.partnerId = b.id;
    b.partnerId = a.id;
    tickColony(g, now, event);
    expect(r.affinity).toBeGreaterThanOrEqual(0);
    const toy = g.items.find((i) => i.key === "toy")!;
    Object.assign(toy, { placed: true, x: 4, y: 4 });
    r.lastAt = 0;
    while (stableRandom(`${g.seed}:${r.a}:${r.b}:${r.interactions}`)() >= 0.25)
      r.interactions++;
    a.partnerId = b.id;
    b.partnerId = a.id;
    const health = a.needs.health;
    const before = r.affinity;
    tickColony(g, now, event);
    expect(r.affinity).toBe(before - 4);
    expect(a.needs.health).toBe(health);
    expect(g.events[0].text).toContain("bolinha");
  });
  it("migra sem refazer indivíduos, saldo ou vínculos existentes", () => {
    const g = family();
    const before = structuredClone(g.bixins);
    migrateGame(g);
    migrateGame(g);
    expect(g.bixins).toEqual(before);
    expect(g.schemaVersion).toBe(3);
    expect(g.credits).toBe(600);
    expect(affinity(g, g.bixins[0].id, g.bixins[1].id)).toBe(40);
  });
  it("proximidade sem interação não inventa amizades", () => {
    const g = family();
    g.relationships = {};
    tickColony(g, now, event);
    expect(Object.keys(g.relationships!)).toHaveLength(0);
  });
  it("encontro real melhora vínculo e respeita intervalo", () => {
    const g = family();
    const [a, b] = g.bixins;
    g.relationships = {};
    a.partnerId = b.id;
    b.partnerId = a.id;
    tickColony(g, now, event);
    expect(affinity(g, a.id, b.id)).toBeGreaterThan(0);
    const first = affinity(g, a.id, b.id);
    a.partnerId = b.id;
    tickColony(g, now + 20000, event);
    expect(affinity(g, a.id, b.id)).toBe(first);
  });
  it("uma amizade cria um marco persistente e não duplica após reload", () => {
    const g = family();
    const [a, b] = g.bixins;
    a.partnerId = b.id;
    b.partnerId = a.id;
    tickColony(g, now, event);
    expect(
      g.milestones?.filter((e) => e.text.includes("amizade")),
    ).toHaveLength(1);
    const reload = structuredClone(g);
    reload.bixins[0].partnerId = b.id;
    reload.bixins[1].partnerId = a.id;
    tickColony(reload, now + 300000, event);
    expect(
      reload.milestones?.filter((e) => e.text.includes("amizade")),
    ).toHaveLength(1);
  });
  it("uma necessidade urgente vence o convite social", () => {
    const g = family();
    const [a, b] = g.bixins;
    a.needs.hydration = 5;
    a.needs.social = 0;
    a.partnerId = b.id;
    g.items[1].placed = true;
    g.items[1].x = 2;
    g.items[1].y = 2;
    chooseActivity(g, a, now);
    expect(a.partnerId).toBeUndefined();
    expect(a.targetId).toBe(g.items[1].id);
  });
  it("preparar apenas convida; o ovo só surge após aconchego e usa uma reserva", () => {
    const g = family();
    const [a, b] = g.bixins;
    const food = g.food;
    applyAction(
      g,
      { type: "prepare-breeding", a: a.id, b: b.id, itemId: "nest" },
      now,
      "prepare",
      734,
    );
    expect(g.eggs).toHaveLength(0);
    expect(g.food).toBe(food);
    simulate(g, now + 620000);
    expect(g.eggs).toHaveLength(1);
    expect(g.food).toBe(food - 12);
    expect(g.nest).toBeNull();
    expect(g.eggs[0].parentA).toBe(a.id);
    expect(g.eggs[0].parentB).toBe(b.id);
    expect(g.eggs[0].traits).toHaveLength(3);
    expect(g.eggs[0].genome).toBeDefined();
    simulate(g, now + 640000);
    expect(g.eggs).toHaveLength(1);
  });
  it("o filhote conserva genoma e progenitores após incubar e recarregar", () => {
    const g = family();
    const [a, b] = g.bixins;
    applyAction(
      g,
      { type: "prepare-breeding", a: a.id, b: b.id, itemId: "nest" },
      now,
      "prepare",
      876,
    );
    simulate(g, now + 620000);
    const e = g.eggs[0];
    applyAction(
      g,
      { type: "incubate", id: e.id, x: 12, y: 9 },
      now + 620000,
      "incubate",
    );
    expect(() => hatch(g, e.id, e.readyAt! - 1)).toThrow();
    const born = hatch(g, e.id, e.readyAt!);
    const saved = JSON.parse(JSON.stringify(g));
    expect(saved.bixins[2].genome).toEqual(e.genome);
    expect(born.parentA).toBe(a.id);
    expect(related(born, b)).toBe(true);
  });
  it.each([
    "idade",
    "saúde",
    "necessidades",
    "papel",
    "espécie",
    "pais",
    "irmãos",
    "laço",
    "ração",
    "cooldown",
    "ovoteca",
    "população",
  ])("bloqueia reprodução sem requisito: %s", (kind) => {
    const g = family();
    const [a, b] = g.bixins;
    if (kind === "idade") a.bornAt = now;
    if (kind === "saúde") a.needs.health = 69;
    if (kind === "necessidades") b.needs.hydration = 49;
    if (kind === "papel") b.role = "A";
    if (kind === "espécie")
      b.species = a.species === "pedruxo" ? "musguito" : "pedruxo";
    if (kind === "pais") b.parentA = a.id;
    if (kind === "irmãos") {
      a.parentA = "ancestral";
      b.parentB = "ancestral";
    }
    if (kind === "laço") relation(g, a.id, b.id).affinity = 29;
    if (kind === "ração") g.food = 11;
    if (kind === "cooldown") a.lastBredAt = now - 3600000;
    if (kind === "ovoteca")
      g.eggs = [
        {
          id: "1",
          species: a.species,
          first: false,
          readyAt: null,
          x: 0,
          y: 0,
        },
        {
          id: "2",
          species: a.species,
          first: false,
          readyAt: null,
          x: 0,
          y: 0,
        },
      ];
    if (kind === "população") g.capacity = 2;
    expect(breedingReason(g, a, b, now)).not.toBe("");
    expect(() =>
      applyAction(
        g,
        { type: "prepare-breeding", a: a.id, b: b.id, itemId: "nest" },
        now,
        "invalid",
      ),
    ).toThrow();
    expect(g.nest).toBeNull();
  });
  it("a viagem reserva a última vaga de ovo e população", () => {
    const g = family();
    g.capacity = 3;
    g.expedition = {
      id: "trip",
      region: "mata",
      startedAt: now,
      endsAt: now + 30000,
      seed: 1,
      reward: { credits: 0 },
    };
    expect(
      breedingReason(
        g,
        ...(g.bixins as [(typeof g.bixins)[0], (typeof g.bixins)[0]]),
        now,
      ),
    ).toContain("espaço");
  });
  it("guardar ninho cancela intenção e não consome ração", () => {
    const g = family();
    const [a, b] = g.bixins;
    applyAction(
      g,
      { type: "prepare-breeding", a: a.id, b: b.id, itemId: "nest" },
      now,
      "p",
    );
    applyAction(g, { type: "store", id: "nest" }, now, "s");
    simulate(g, now + 620000);
    expect(g.nest).toBeNull();
    expect(g.eggs).toHaveLength(0);
    expect(g.food).toBe(48);
  });
  it("falta de recursos durante aconchego pausa, sem cobrar ou gerar ovo", () => {
    const g = family();
    const [a, b] = g.bixins;
    applyAction(
      g,
      { type: "prepare-breeding", a: a.id, b: b.id, itemId: "nest" },
      now,
      "p",
    );
    g.food = 0;
    simulate(g, now + 620000);
    expect(g.eggs).toHaveLength(0);
    expect(g.nest?.settledAt).toBeNull();
  });
  it("cooldown é individual: trocar de parceiro não antecipa outro ovo", () => {
    const g = family();
    const [a, b] = g.bixins;
    a.lastBredAt = now;
    expect(breedingReason(g, a, b, now + 86400000 - 1)).toContain("24 horas");
    expect(breedingReason(g, a, b, now + 86400000)).toBe("");
  });
  it("mascara semente futura sem alterar estado persistido", () => {
    const g = family();
    const [a, b] = g.bixins;
    applyAction(
      g,
      { type: "prepare-breeding", a: a.id, b: b.id, itemId: "nest" },
      now,
      "p",
      246,
    );
    expect(publicSnapshot(g).nest?.seed).toBe(0);
    expect(g.nest?.seed).toBe(246);
  });
  it("genética é estável, limitada, com herança 45/45/10 e aurora rara", () => {
    const g = family();
    const [a, b] = g.bixins;
    a.genome = { ...initialGenome("a"), primary: 0 };
    b.genome = { ...initialGenome("b"), primary: 1 };
    expect(inherit(a, b, 44)).toEqual(inherit(a, b, 44));
    const counts = [0, 0, 0];
    let special = 0;
    for (let i = 0; i < 20000; i++) {
      const child = inherit(a, b, i);
      counts[child.genome.primary]++;
      if (child.variant) special++;
      expect(Math.abs(child.genome.energyBias)).toBeLessThanOrEqual(2);
    }
    expect(counts[0] / 20000).toBeGreaterThan(0.44);
    expect(counts[1] / 20000).toBeGreaterThan(0.44);
    expect(counts[2] / 20000).toBeLessThan(0.06);
    expect(special / 20000).toBeGreaterThan(0.002);
    expect(special / 20000).toBeLessThan(0.009);
  });
  it("marcos resistem ao limite dos 200 eventos cotidianos", () => {
    const g = family();
    event(g, "Um nascimento", now, true);
    for (let i = 0; i < 205; i++) event(g, "Um lanchinho", now + i);
    expect(g.events).toHaveLength(200);
    expect(g.milestones?.some((e) => e.text === "Um nascimento")).toBe(true);
  });
  it("objetivo de família é persistente e a recompensa só é recolhida uma vez", () => {
    const g = family();
    const [a, b] = g.bixins;
    applyAction(
      g,
      { type: "prepare-breeding", a: a.id, b: b.id, itemId: "nest" },
      now,
      "p",
    );
    simulate(g, now + 620000);
    const credits = g.credits;
    applyAction(
      g,
      { type: "claim-mission", mission: "family" },
      now + 620000,
      "reward",
    );
    expect(g.credits).toBe(credits + 150);
    expect(() =>
      applyAction(
        g,
        { type: "claim-mission", mission: "family" },
        now + 620000,
        "again",
      ),
    ).toThrow();
  });
  it("dia/noite e chuva são cosméticos e dependem do horário do servidor", () => {
    expect(environment(0).night).toBe(true);
    expect(environment(CONFIG.daySeconds * 1000 * 0.4).night).toBe(false);
    expect(environment(1800000).rain).toBe(true);
    const g = family();
    const before = structuredClone(g);
    environment(now);
    expect(g).toEqual(before);
  });
});

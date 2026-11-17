import { describe, it, expect } from "vitest";
import {
  createGame,
  hatch,
  pathfind,
  simulate,
  validPlacement,
  chooseActivity,
  rng,
} from "../src/game/engine";
import { applyAction, publicSnapshot } from "../src/game/actions";
import {
  CONFIG,
  expeditionChances,
  items,
  regions,
  species,
  type Species,
} from "../src/game/config";
import {
  accessPoints,
  capacity,
  dimensions,
  stockMax,
} from "../src/game/geometry";
import {
  charm,
  eggPrice,
  expeditionReward,
  migrateGame,
  missions,
  saleQuote,
  shopEggs,
  stageOf,
  updateMissions,
} from "../src/game/progression";
const start = 1800000000000;
function born() {
  const g = createGame(start, 101);
  g.eggs[0].readyAt = start;
  hatch(g, "first-egg", start);
  return g;
}
describe("Fase 4 — construir e crescer", () => {
  it("compra ração por preço do servidor e bloqueia reserva cheia ou saldo insuficiente", () => {
    const g = createGame(start, 1);
    const before = g.food;
    applyAction(g, { type: "buy-food" }, start, "ration");
    expect(g.food).toBe(before + 12);
    expect(g.credits).toBe(590);
    g.credits = 0;
    expect(() =>
      applyAction(g, { type: "buy-food" }, start, "empty"),
    ).toThrow();
    g.food = CONFIG.maxFoodReserve;
    g.credits = 100;
    expect(() => applyAction(g, { type: "buy-food" }, start, "full")).toThrow();
    expect(g.credits).toBe(100);
  });

  it("não mantém referência mutável de um Bixin na árvore de caminhos", () => {
    const g = createGame(start, 1),
      origin = { x: 0, y: 0 };
    pathfind(g, origin, { x: 4, y: 4 });
    origin.x = 1;
    origin.y = 1;
    expect(pathfind(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it("invalida caminhos em cache quando um objeto ocupa a rota", () => {
    const g = createGame(start, 1);
    expect(pathfind(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toHaveLength(2);
    Object.assign(g.items[0], { placed: true, x: 1, y: 0 });
    expect(pathfind(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toHaveLength(4);
  });

  it("preserva uma propriedade 0.1 sem recriar kit, saldo ou Bixin", () => {
    const g = born();
    g.credits = 321;
    delete g.schemaVersion;
    delete g.missions;
    delete g.level;
    migrateGame(g);
    expect(g.credits).toBe(321);
    expect(g.bixins).toHaveLength(1);
    expect(g.items).toHaveLength(4);
    expect(g.schemaVersion).toBe(2);
  });
  it("mantém o kit com somente quatro objetos após ampliar o catálogo para 16", () => {
    expect(Object.keys(items)).toHaveLength(16);
    expect(createGame(start, 2).items).toHaveLength(4);
  });
  it("valida todas as células de uma estrutura grande e seus acessos", () => {
    const g = createGame(start, 2);
    g.credits = 4000;
    applyAction(g, { type: "buy", key: "house" }, start, "house");
    applyAction(g, { type: "place", id: "house", x: 4, y: 4 }, start, "place");
    expect(validPlacement(g, 6, 6)).toBe(false);
    expect(validPlacement(g, 18, 12, undefined, "house")).toBe(false);
    expect(
      pathfind(g, { x: 3, y: 5 }, { x: 7, y: 5 }).every(
        (p) => p.x < 4 || p.x > 6 || p.y < 4 || p.y > 6,
      ),
    ).toBe(true);
    expect(accessPoints(g.items.at(-1)!)).toHaveLength(12);
  });
  it("gira dimensões sem aceitar sobreposição", () => {
    const g = createGame(start, 2);
    g.credits = 1000;
    applyAction(g, { type: "buy", key: "bench" }, start, "bench");
    applyAction(
      g,
      { type: "place", id: "bench", x: 5, y: 5, rotation: 1 },
      start,
      "place",
    );
    expect(dimensions(g.items.at(-1)!)).toEqual({ width: 1, height: 2 });
    expect(validPlacement(g, 5, 6)).toBe(false);
  });
  it("melhora capacidade, estoque e eficiência sem cobrar a quarta melhoria", () => {
    const g = born();
    g.credits = 4000;
    const food = g.items[0];
    applyAction(g, { type: "upgrade", id: food.id }, start, "u1");
    expect(capacity(food)).toBe(2);
    expect(stockMax(food)).toBe(18);
    applyAction(g, { type: "upgrade", id: food.id }, start, "u2");
    const credits = g.credits;
    expect(() =>
      applyAction(g, { type: "upgrade", id: food.id }, start, "u3"),
    ).toThrow();
    expect(g.credits).toBe(credits);
  });
  it("objetos com dois lugares reservam acessos distintos", () => {
    const g = born();
    g.eggs.push({
      id: "two",
      species: "espinim",
      readyAt: start,
      first: false,
      x: 8,
      y: 8,
    });
    hatch(g, "two", start);
    g.items.push({
      id: "double",
      key: "doublefood",
      placed: true,
      x: 5,
      y: 5,
      stock: 24,
    });
    g.bixins.forEach((b, i) => {
      b.x = 4 + i * 4;
      b.y = 5;
      b.needs.satiety = 1;
      chooseActivity(g, b, start);
    });
    expect(g.bixins.every((b) => b.targetId === "double")).toBe(true);
    const ends = g.bixins.map((b) => b.path.at(-1) ?? b);
    expect(ends[0]).not.toMatchObject(ends[1]);
  });
  it("consome estoque e aplica efeito de um objeto novo", () => {
    const g = born();
    const b = g.bixins[0];
    g.items.push({
      id: "bath",
      key: "bath",
      placed: true,
      x: 5,
      y: 5,
      stock: 0,
    });
    b.x = 4;
    b.y = 5;
    b.path = [];
    b.targetId = "bath";
    b.needs.hygiene = 20;
    simulate(g, start + 20000);
    expect(b.needs.hygiene).toBeGreaterThan(40);
  });
  it("cada objetivo paga uma única vez, mesmo com outra chave", () => {
    const g = born();
    updateMissions(g, start);
    applyAction(g, { type: "claim-mission", mission: "hatch" }, start, "m1");
    expect(g.credits).toBe(600 + missions.hatch.reward);
    expect(() =>
      applyAction(
        g,
        { type: "claim-mission", mission: "hatch" },
        start + 1,
        "m2",
      ),
    ).toThrow();
    expect(g.ledger.filter((l) => l.id === "mission-hatch")).toHaveLength(1);
  });
  it("expansão cobra uma vez, preserva posições e libera 24×16/10 Bixins", () => {
    const g = born();
    g.credits = 2000;
    Object.assign(g.items[0], { placed: true, x: 4, y: 5 });
    const before = structuredClone(g.items);
    applyAction(g, { type: "expand" }, start, "expansion");
    expect([g.width, g.height, g.capacity, g.level, g.credits]).toEqual([
      24, 16, 10, 2, 200,
    ]);
    expect(g.items).toEqual(before);
    expect(() => applyAction(g, { type: "expand" }, start, "again")).toThrow();
    expect(g.credits).toBe(200);
  });
  it("charme de decorações é limitado e com retorno decrescente", () => {
    const g = born();
    for (let i = 0; i < 20; i++)
      g.items.push({
        id: "tree-" + i,
        key: "tree",
        placed: true,
        x: i,
        y: 2,
        stock: 0,
      });
    expect(charm(g)).toBeLessThanOrEqual(100);
    expect(charm(g)).toBeLessThan(20 * 15);
  });
});
describe("Fase 5 — explorar e colecionar", () => {
  it("há nove espécies, três raridades e três destinos ativos", () => {
    expect(Object.keys(species)).toHaveLength(9);
    expect(new Set(Object.values(species).map((s) => s.rarity)).size).toBe(3);
    expect(Object.values(regions).filter((r) => r.active)).toHaveLength(3);
    expect(Object.keys(regions)).toHaveLength(7);
  });
  it("as chances somam 100 e a região nunca devolve espécie de outra região", () => {
    expect(Object.values(expeditionChances).reduce((a, b) => a + b, 0)).toBe(
      100,
    );
    for (const r of ["mata", "caatinga", "cerrado"] as const)
      for (let n = 0; n < 100; n++) {
        const reward = expeditionReward(r, n / 100);
        if (reward.species) expect(species[reward.species].regionKey).toBe(r);
      }
  });
  it("sorteio tem distribuição determinística compatível com as probabilidades", () => {
    const random = rng(111),
      counts = { common: 0, uncommon: 0, rare: 0, resources: 0 };
    for (let n = 0; n < 20000; n++) {
      const reward = expeditionReward("mata", random());
      counts[reward.species ? species[reward.species].rarity : "resources"]++;
    }
    for (const key of Object.keys(counts) as (keyof typeof counts)[])
      expect(Math.abs(counts[key] / 200 - expeditionChances[key])).toBeLessThan(
        1.5,
      );
  });
  it("cobra viagem uma vez, bloqueia paralela e resgate antecipado", () => {
    const g = born();
    applyAction(
      g,
      { type: "start-expedition", region: "mata" },
      start,
      "trip",
      123,
    );
    expect(g.credits).toBe(510);
    expect(() =>
      applyAction(
        g,
        { type: "start-expedition", region: "caatinga" },
        start,
        "trip2",
      ),
    ).toThrow();
    expect(() =>
      applyAction(
        g,
        { type: "claim-expedition", id: "trip" },
        start + 479999,
        "claim",
      ),
    ).toThrow();
    expect(publicSnapshot(g).expedition?.seed).toBe(0);
    expect(publicSnapshot(g).expedition?.reward.species).toBeUndefined();
  });
  it("resgata o mesmo achado uma única vez e guarda a origem", () => {
    const g = born();
    applyAction(
      g,
      { type: "start-expedition", region: "caatinga" },
      start,
      "trip",
      123,
    );
    const expected = g.expedition!.reward;
    applyAction(
      g,
      { type: "claim-expedition", id: "trip" },
      start + 480000,
      "claim",
    );
    expect(g.expedition).toBeNull();
    expect(g.expeditionsCompleted).toBe(1);
    if (expected.species) {
      expect(g.eggs).toHaveLength(1);
      expect(g.eggs[0].species).toBe(expected.species);
      expect(g.eggs[0].origin).toBe("caatinga");
    }
    expect(() =>
      applyAction(
        g,
        { type: "claim-expedition", id: "trip" },
        start + 480000,
        "again",
      ),
    ).toThrow();
  });
  it("reserva uma vaga na ovoteca e bloqueia regiões futuras e Cerrado fechado", () => {
    const g = born();
    g.credits = 10000;
    applyAction(
      g,
      { type: "start-expedition", region: "mata" },
      start,
      "trip",
      123,
    );
    const offer = shopEggs(g, start)[0];
    applyAction(g, { type: "buy-egg", species: offer }, start, "egg");
    expect(() =>
      applyAction(g, { type: "buy-egg", species: offer }, start, "overflow"),
    ).toThrow();
    const fresh = born();
    expect(() =>
      applyAction(
        fresh,
        { type: "start-expedition", region: "cerrado" },
        start,
        "locked",
      ),
    ).toThrow();
    expect(() =>
      applyAction(
        fresh,
        { type: "start-expedition", region: "amazonia" },
        start,
        "future",
      ),
    ).toThrow();
  });
  it("loja rotativa é estável no dia, filtra desbloqueio e cobra o preço do servidor", () => {
    const g = born();
    g.credits = 10000;
    const offers = shopEggs(g, start);
    expect(shopEggs(g, start + 1000)).toEqual(offers);
    expect(offers.every((s) => species[s].regionKey !== "cerrado")).toBe(true);
    const s = offers[0];
    applyAction(g, { type: "buy-egg", species: s }, start, "egg");
    expect(g.credits).toBe(10000 - eggPrice(s));
    expect(g.bixins).toHaveLength(1);
    expect(g.eggs).toHaveLength(1);
  });
  it("ovo comum permanece 90 minutos no ninho e só então revela a espécie", () => {
    const g = born();
    g.eggs.push({
      id: "rare",
      species: "bromeluz",
      readyAt: null,
      first: false,
      x: 0,
      y: 0,
      origin: "mata",
    });
    applyAction(g, { type: "incubate", id: "rare", x: 4, y: 4 }, start, "nest");
    expect(g.eggs[0].readyAt).toBe(start + CONFIG.eggSeconds * 1000);
    expect(() =>
      hatch(g, "rare", start + CONFIG.eggSeconds * 1000 - 1),
    ).toThrow();
    hatch(g, "rare", start + CONFIG.eggSeconds * 1000);
    expect(g.discoveries).toContain("bromeluz");
    expect(g.discoveryCounts?.bromeluz).toBe(1);
  });
  it("as nove espécies nascem e possuem identidade e traços próprios", () => {
    for (const s of Object.keys(species) as Species[]) {
      const g = createGame(start, 3);
      g.eggs[0].species = s;
      g.eggs[0].readyAt = start;
      const b = hatch(g, "first-egg", start);
      expect(b.name).toBe(species[s].defaultName);
      expect(b.traits).toContain(species[s].trait);
    }
  });
  it("vende apenas adulto saudável, preserva histórico e impede o último", () => {
    const g = born(),
      first = g.bixins[0];
    expect(saleQuote(g, first, start).allowed).toBe(false);
    g.eggs.push({
      id: "adult",
      species: "pedruxo",
      readyAt: start,
      first: false,
      x: 5,
      y: 5,
    });
    const b = hatch(g, "adult", start);
    expect(saleQuote(g, b, start).allowed).toBe(false);
    b.bornAt = start - 24 * 3600000;
    expect(stageOf(b, start)).toBe("Adulto");
    b.needs.health = 10;
    expect(saleQuote(g, b, start).allowed).toBe(false);
    b.needs.health = 100;
    const quote = saleQuote(g, b, start);
    expect(quote.allowed).toBe(true);
    expect(quote.price).toBeLessThan(eggPrice(b.species));
    const credits = g.credits;
    applyAction(
      g,
      { type: "sell", id: b.id, expectedPrice: quote.price },
      start,
      "sale",
    );
    expect(g.credits).toBe(credits + quote.price);
    expect(g.bixins).toHaveLength(1);
    expect(g.transfers?.[0].bixin.id).toBe(b.id);
    expect(() =>
      applyAction(
        g,
        { type: "sell", id: b.id, expectedPrice: quote.price },
        start,
        "again",
      ),
    ).toThrow();
    expect(() =>
      applyAction(
        g,
        { type: "sell", id: first.id, expectedPrice: 100 },
        start,
        "last",
      ),
    ).toThrow();
  });
});

import { describe, it, expect } from "vitest";
import {
  createGame,
  hatch,
  pathfind,
  simulate,
  validPlacement,
  chooseActivity,
} from "../src/game/engine";
import { applyAction, actionSchema } from "../src/game/actions";
const start = 1800000000000;
function born() {
  const g = createGame(start, 123);
  g.eggs[0].readyAt = start;
  hatch(g, "first-egg", start);
  return g;
}
describe("primeiro ciclo do refúgio", () => {
  it("não permite fechar a entrada com objetos", () => {
    const g = createGame(start, 1);
    Object.assign(g.items[0], { placed: true, x: 9, y: 13 });
    Object.assign(g.items[1], { placed: true, x: 11, y: 13 });
    expect(validPlacement(g, 10, 12)).toBe(false);
  });
  it("inicia com terreno vazio, C$ 600 e kit guardado", () => {
    const g = createGame(start, 1);
    expect(g.bixins).toHaveLength(0);
    expect(g.items.every((i) => !i.placed)).toBe(true);
    expect(g.credits).toBe(600);
    expect(g.eggs).toHaveLength(1);
  });
  it("bloqueia nascimento antecipado e nascimento repetido", () => {
    const g = createGame(start, 1);
    applyAction(
      g,
      { type: "incubate", id: "first-egg", x: 8, y: 8 },
      start,
      "k",
    );
    expect(() => hatch(g, "first-egg", start + 59999)).toThrow();
    hatch(g, "first-egg", start + 60000);
    expect(g.bixins).toHaveLength(1);
    expect(() => hatch(g, "first-egg", start + 60000)).toThrow();
  });
  it("valida limites, ocupação e acesso ao terreno", () => {
    const g = createGame(start, 1);
    expect(validPlacement(g, -1, 0)).toBe(false);
    expect(validPlacement(g, 20, 5)).toBe(false);
    expect(validPlacement(g, 8, 8)).toBe(true);
    applyAction(g, { type: "place", id: "kit-0", x: 8, y: 8 }, start, "k");
    expect(validPlacement(g, 8, 8)).toBe(false);
    expect(validPlacement(g, 10, 13)).toBe(false);
  });
  it("calcula caminho sem atravessar objetos e cerca", () => {
    const g = createGame(start, 1);
    Object.assign(g.items[0], { placed: true, x: 1, y: 0 });
    const route = pathfind(g, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(route).toHaveLength(4);
    expect(route.some((p) => p.x === 1 && p.y === 0)).toBe(false);
    expect(pathfind(g, { x: 0, y: 0 }, { x: -1, y: 0 })).toHaveLength(0);
  });
  it("prioriza água quando hidratação é crítica", () => {
    const g = born();
    Object.assign(g.items[0], { placed: true, x: 5, y: 5 });
    Object.assign(g.items[1], { placed: true, x: 7, y: 5 });
    const b = g.bixins[0];
    Object.assign(b, { x: 5, y: 6 });
    b.needs.hydration = 5;
    chooseActivity(g, b, start);
    expect(b.targetId).toBe("kit-1");
    expect(b.activity).toBe("Bebendo");
  });
  it("mantém necessidades nos limites e saúde gentil após sete dias", () => {
    const g = born();
    simulate(g, start + 7 * 86400000);
    for (const value of Object.values(g.bixins[0].needs)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    expect(g.bixins[0].needs.health).toBeGreaterThanOrEqual(60);
  });
  it("gera resultados determinísticos e preserva progresso de syncs curtos", () => {
    const g = born();
    const a = structuredClone(g),
      b = structuredClone(g);
    simulate(a, start + 3600000);
    simulate(b, start + 3600000);
    expect(a).toEqual(b);
    const c = born();
    for (let s = 1; s <= 20; s++) simulate(c, start + s * 1000);
    expect(c.bixins[0].needs.satiety).toBeLessThan(85);
  });
  it("não paga uma hora duas vezes nem paga sem Bixins", () => {
    const g = born();
    simulate(g, start + 3600000);
    const balance = g.credits;
    expect(balance).toBeGreaterThan(600);
    simulate(g, start + 3600000);
    expect(g.credits).toBe(balance);
    const empty = createGame(start, 1);
    simulate(empty, start + 86400000);
    expect(empty.credits).toBe(600);
  });
  it("bloqueia compra sem saldo e item alheio", () => {
    const g = createGame(start, 1);
    g.credits = 10;
    expect(() =>
      applyAction(g, { type: "buy", key: "food" }, start, "buy"),
    ).toThrow();
    expect(g.credits).toBe(10);
    expect(() =>
      applyAction(g, { type: "place", id: "foreign", x: 2, y: 2 }, start, "k"),
    ).toThrow();
  });
  it("cuidado consome ração e respeita intervalo", () => {
    const g = born();
    const b = g.bixins[0];
    b.needs.satiety = 20;
    applyAction(g, { type: "care", id: b.id, kind: "snack" }, start, "care");
    expect(g.food).toBe(47);
    expect(b.needs.satiety).toBe(40);
    expect(() =>
      applyAction(
        g,
        { type: "care", id: b.id, kind: "snack" },
        start + 1000,
        "c",
      ),
    ).toThrow();
  });
  it("ação não aceita saldo nem horário fornecidos pelo navegador", () => {
    const result = actionSchema.parse({
      type: "sync",
      credits: 999999,
      now: 999999999,
    });
    expect(result).toEqual({ type: "sync" });
  });
  it("todas as três espécies podem nascer", () => {
    const g = born();
    for (const sp of ["musguito", "capinzim", "espinim"] as const) {
      g.eggs.push({
        id: sp,
        species: sp,
        readyAt: start,
        first: false,
        x: 3,
        y: 3,
      });
      hatch(g, sp, start);
    }
    expect(g.discoveries.sort()).toEqual(["capinzim", "espinim", "musguito"]);
  });
});

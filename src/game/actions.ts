import { z } from "zod";
import { CONFIG, items, species } from "./config";
import { event, hatch, validPlacement } from "./engine";
import type { Game } from "./types";
const xy = {
  x: z.number().int().min(0).max(43),
  y: z.number().int().min(0).max(27),
};
export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sync") }),
  z.object({ type: z.literal("place"), id: z.string().max(100), ...xy }),
  z.object({ type: z.literal("store"), id: z.string().max(100) }),
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
  z.object({
    type: z.literal("buy"),
    key: z.enum(["food", "water", "bed", "toy"]),
  }),
]);
export type Action = z.infer<typeof actionSchema>;
export function applyAction(g: Game, a: Action, now: number, key: string) {
  if (a.type === "sync") return;
  if (a.type === "place") {
    const i = g.items.find((i) => i.id === a.id);
    if (!i) throw Error("Objeto não encontrado.");
    if (!validPlacement(g, a.x, a.y, i.id))
      throw Error("Esse lugar está ocupado ou bloquearia um caminho.");
    Object.assign(i, { x: a.x, y: a.y, placed: true });
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
  if (a.type === "incubate") {
    const e = g.eggs.find((e) => e.id === a.id);
    if (!e || e.readyAt) throw Error("Esse ovo já está no ninho.");
    if (g.bixins.length + g.eggs.filter((e) => e.readyAt).length >= g.capacity)
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
    event(
      g,
      `${b.name} recebeu ${a.kind === "pet" ? "um carinho" : a.kind === "bath" ? "um banho gostoso" : "um petisco"}.`,
      now,
    );
  }
  if (a.type === "refill") {
    const i = g.items.find((i) => i.id === a.id && i.key === "food");
    if (!i) throw Error("Comedouro não encontrado.");
    const count = Math.min(12 - i.stock, g.food);
    if (count <= 0)
      throw Error(
        i.stock >= 12
          ? "O comedouro já está cheio."
          : "Sua cota gratuita de ração volta amanhã.",
      );
    g.food -= count;
    i.stock += count;
    event(g, "Comedouro reabastecido. Hora do lanchinho!", now);
  }
  if (a.type === "buy") {
    const price = items[a.key].price;
    if (g.items.length >= 60) throw Error("Sua caixa está cheia.");
    if (g.credits < price)
      throw Error("Ainda faltam créditos para esse objeto.");
    g.credits -= price;
    g.items.push({
      id: key,
      key: a.key,
      x: 0,
      y: 0,
      placed: false,
      stock: a.key === "food" ? 12 : 0,
    });
    g.ledger.unshift({
      id: key,
      at: now,
      delta: -price,
      balance: g.credits,
      kind: `Compra: ${items[a.key].name}`,
    });
    event(g, `${items[a.key].name} chegou à caixa de entregas.`, now);
  }
}

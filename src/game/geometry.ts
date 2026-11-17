import { items } from "./config";
import type { Game, OwnedItem, Point } from "./types";
export function dimensions(i: Pick<OwnedItem, "key" | "rotation">) {
  const def = items[i.key];
  return i.rotation
    ? { width: def.height, height: def.width }
    : { width: def.width, height: def.height };
}
export function cells(i: OwnedItem): Point[] {
  const d = dimensions(i);
  return Array.from({ length: d.width * d.height }, (_, n) => ({
    x: i.x + (n % d.width),
    y: i.y + Math.floor(n / d.width),
  }));
}
export function accessPoints(i: OwnedItem): Point[] {
  const d = dimensions(i);
  const p: Point[] = [];
  for (let x = 0; x < d.width; x++)
    p.push({ x: i.x + x, y: i.y - 1 }, { x: i.x + x, y: i.y + d.height });
  for (let y = 0; y < d.height; y++)
    p.push({ x: i.x - 1, y: i.y + y }, { x: i.x + d.width, y: i.y + y });
  return p;
}
export function contains(i: OwnedItem, p: Point) {
  const d = dimensions(i);
  return (
    p.x >= i.x && p.x < i.x + d.width && p.y >= i.y && p.y < i.y + d.height
  );
}
export function adjacent(i: OwnedItem, p: Point) {
  return accessPoints(i).some((q) => q.x === p.x && q.y === p.y);
}
export function capacity(i: OwnedItem) {
  const base = items[i.key].capacity;
  return base ? base + (i.level ?? 1) - 1 : 0;
}
export function stockMax(i: OwnedItem) {
  const base = items[i.key].stockMax;
  return base ? base + 6 * ((i.level ?? 1) - 1) : 0;
}
export function upgradePrice(i: OwnedItem) {
  return Math.round(items[i.key].price * (i.level ?? 1) * 1.2);
}
export function blockedCells(g: Game) {
  return new Set(
    g.items
      .filter((i) => i.placed)
      .flatMap(cells)
      .map((p) => p.x + "," + p.y),
  );
}
type Navigation = {
  signature: string;
  blocked: Set<string>;
  trees: Map<string, Map<string, Point>>;
};
const navigationCache = new WeakMap<Game, Navigation>();
export function navigation(g: Game) {
  const signature =
    g.width +
    "x" +
    g.height +
    g.items
      .filter((i) => i.placed)
      .map((i) => i.key + ":" + i.x + "," + i.y + "," + (i.rotation ?? 0))
      .join(";");
  let nav = navigationCache.get(g);
  if (!nav || nav.signature !== signature) {
    nav = { signature, blocked: blockedCells(g), trees: new Map() };
    navigationCache.set(g, nav);
  }
  return nav;
}

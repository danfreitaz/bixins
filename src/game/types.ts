import type { ItemKey, Need, Species } from "./config";
export type Point = { x: number; y: number };
export type Bixin = Point & {
  id: string;
  species: Species;
  name: string;
  bornAt: number;
  needs: Record<Need, number>;
  activity: string;
  path: Point[];
  targetId?: string;
  careAt: number;
  role: "A" | "B";
  traits: string[];
};
export type OwnedItem = Point & {
  id: string;
  key: ItemKey;
  placed: boolean;
  stock: number;
};
export type Egg = Point & {
  id: string;
  species: Species;
  readyAt: number | null;
  first: boolean;
};
export type GameEvent = { id: string; at: number; text: string };
export type Ledger = {
  id: string;
  at: number;
  delta: number;
  balance: number;
  kind: string;
};
export type Game = {
  version: number;
  name: string;
  credits: number;
  width: number;
  height: number;
  capacity: number;
  lastSimulated: number;
  lastIncome: number;
  food: number;
  foodDay: number;
  seed: number;
  bixins: Bixin[];
  items: OwnedItem[];
  eggs: Egg[];
  events: GameEvent[];
  ledger: Ledger[];
  discoveries: Species[];
};

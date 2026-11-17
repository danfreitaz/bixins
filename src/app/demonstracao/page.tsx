"use client";
import { useEffect, useState } from "react";
import Terrain from "@/components/Terrain";
import { createGame, hatch, chooseActivity, simulate } from "@/game/engine";
import { species, starters, type Species } from "@/game/config";
import type { Game } from "@/game/types";
function example(): Game {
  const now = Date.now();
  const g = createGame(now, 108);
  g.eggs = [];
  g.items.forEach((item, i) =>
    Object.assign(item, {
      placed: true,
      x: [7, 11, 7, 11][i],
      y: [5, 5, 9, 9][i],
    }),
  );
  starters.forEach((s, i) => {
    g.eggs.push({
      id: s,
      species: s,
      first: false,
      readyAt: now,
      x: 8 + i,
      y: 7,
    });
    const b = hatch(g, s, now);
    b.needs[(["satiety", "energy", "hydration"] as const)[i]] = 20;
    chooseActivity(g, b, now);
  });
  return g;
}
export default function Demo() {
  const [game, setGame] = useState<Game | null>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setGame(example());
    const id = setInterval(
      () =>
        setGame((g) => {
          if (!g) return g;
          const next = simulate(structuredClone(g), Date.now());
          next.version++;
          return next;
        }),
      20000,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <main className="app">
      <header className="topbar">
        <a href="/" className="brand">
          bixins<span>✿</span>
        </a>
        <span className="eyebrow">
          DEMONSTRAÇÃO VISUAL · SEM PROGRESSO SALVO
        </span>
        <a className="button small" style={{ marginLeft: "auto" }} href="/">
          Criar meu refúgio
        </a>
      </header>
      <div className="game-heading demo-heading">
        <div>
          <span className="eyebrow">CONHEÇA A PRIMEIRA COLEÇÃO</span>
          <h1>
            Três pequenos mundos, <em>um só cantinho.</em>
          </h1>
        </div>
        <button className="button small" onClick={() => setReduced(!reduced)}>
          {reduced ? "Ativar animações" : "Reduzir movimentos"}
        </button>
        <button
          className="button small"
          onClick={() =>
            setGame((g) =>
              g
                ? {
                    ...g,
                    width: g.width === 20 ? 24 : 20,
                    height: g.width === 20 ? 16 : 14,
                    capacity: g.width === 20 ? 10 : 6,
                    level: g.width === 20 ? 2 : 1,
                    version: g.version + 1,
                  }
                : g,
            )
          }
        >
          {game?.width === 24 ? "Ver Quintal" : "Ver Terreninho"}
        </button>
      </div>
      <section
        className="game-stage"
        style={{ height: "calc(100dvh - 250px)" }}
      >
        {game && (
          <Terrain
            game={game}
            placement={null}
            onPlace={() => {}}
            onSelect={() => {}}
            reduced={reduced}
            demo
          />
        )}
      </section>
      <footer className="game-footer">
        Demonstração local de arte e movimento. O jogo da sua conta começa com
        um terreno vazio. <a href="/arte">Ver prancha de arte →</a>
      </footer>
    </main>
  );
}

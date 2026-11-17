"use client";
import { useEffect, useRef, useState } from "react";
import type { Game, Point } from "@/game/types";
import { manifest } from "@/game/assets/manifest";
import { rng, validPlacement, pathfind } from "@/game/engine";
import { items, type ItemKey } from "@/game/config";
import { contains, dimensions } from "@/game/geometry";
import { ZoomIn, ZoomOut, LocateFixed } from "lucide-react";
import { environment } from "@/game/colony";
import { dataUri, portraitSvg } from "@/game/art";
export type Placement = {
  kind: "item" | "egg";
  id: string;
  key: ItemKey | "egg";
  rotation?: 0 | 1;
};
type Props = {
  game: Game;
  placement: Placement | null;
  onPlace: (p: Point) => void;
  onSelect: (id: string, kind: "bixin" | "item" | "egg") => void;
  reduced: boolean;
  demo?: boolean;
  battery?: boolean;
  now?: number;
};
export default function Terrain({
  game,
  placement,
  onPlace,
  onSelect,
  reduced,
  demo = false,
  battery = false,
  now = game.lastSimulated,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef({
    game,
    placement,
    onPlace,
    onSelect,
    reduced,
    battery,
    now,
  });
  latest.current = {
    game,
    placement,
    onPlace,
    onSelect,
    reduced,
    battery,
    now,
  };
  const camera = useRef({ zoom: 1, x: 0, y: 0 });
  const pointer = useRef<{
    x: number;
    y: number;
    sx: number;
    sy: number;
    drag: boolean;
  } | null>(null);
  const hover = useRef<Point | null>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let frame = 0;
    let alive = true;
    let last = 0;
    const imgs: Record<string, HTMLImageElement> = {};
    for (const [k, v] of Object.entries(manifest.creatures)) {
      for (const [state, uri] of Object.entries(v)) {
        const i = new Image();
        i.src = uri;
        imgs[`${k}-${state}`] = i;
      }
    }
    for (const [k, uri] of Object.entries(manifest.items)) {
      const i = new Image();
      i.src = uri;
      imgs[k] = i;
    }
    const random = rng(210);
    const details = Array.from({ length: 240 }, () => ({
      x: 150 + random() * 900,
      y: 130 + random() * 600,
      s: random(),
      r: random(),
    }));
    const visuals = new Map<
      string,
      {
        x: number;
        y: number;
        path: Point[];
        version: number;
        activity: string;
        routeKey: string;
      }
    >();
    const ellipse = (
      x: number,
      y: number,
      rx: number,
      ry: number,
      color: string,
    ) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    const line = (points: number[], color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2)
        ctx.lineTo(points[i], points[i + 1]);
      ctx.stroke();
    };
    const round = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      color: string,
    ) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    };
    const tree = (x: number, y: number, s: number, variant: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ellipse(3, 10, 47, 13, "#4c776b26");
      line([0, 0, -3, -69], "#957555", 14);
      line([-2, -41, 22, -66], "#957555", 7);
      ellipse(-25, -70, 31, 32, "#71966a");
      ellipse(25, -77, 35, 39, "#6b9667");
      ellipse(-12, -103, 39, 36, variant ? "#9dbb7a" : "#87ad72");
      ellipse(16, -109, 32, 30, variant ? "#b2c789" : "#98ba7d");
      ellipse(-37, -87, 24, 24, "#9aba7e");
      ellipse(-18, -119, 19, 12, "#bdd29a");
      for (let n = 0; n < 5; n++)
        ellipse(
          -29 + n * 13,
          -83 + (n % 2) * 18,
          3,
          4,
          variant ? "#f0d29a" : "#c5d795",
        );
      ctx.restore();
    };
    const pos = (p: Point) => ({
      x: 200 + (p.x + 0.5) * 40,
      y: 200 + (p.y + 0.5) * 32,
    });
    const image = (key: string, x: number, y: number, w: number, h: number) => {
      const i = imgs[key];
      if (i?.complete && i.naturalWidth) ctx.drawImage(i, x, y, w, h);
    };
    const scene = () => ({
      width: 1200 + (latest.current.game.width - 20) * 40,
      height: 850 + (latest.current.game.height - 14) * 32,
    });
    const screenPoint = (x: number, y: number) => {
      const size = scene();
      const box = canvas.getBoundingClientRect();
      const scale =
        Math.min(box.width / scene().width, box.height / scene().height) *
        camera.current.zoom;
      return {
        x:
          (x - box.left - box.width / 2 - camera.current.x) / scale +
          size.width / 2,
        y:
          (y - box.top - box.height / 2 - camera.current.y) / scale +
          size.height / 2,
      };
    };
    const hit = (e: PointerEvent) => {
      const p = screenPoint(e.clientX, e.clientY);
      return {
        x: Math.floor((p.x - 200) / 40),
        y: Math.floor((p.y - 200) / 32),
      };
    };
    const down = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointer.current = {
        x: e.clientX,
        y: e.clientY,
        sx: camera.current.x,
        sy: camera.current.y,
        drag: false,
      };
      hover.current = hit(e);
    };
    const move = (e: PointerEvent) => {
      hover.current = hit(e);
      const p = pointer.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 7) {
        p.drag = true;
        const box = canvas.getBoundingClientRect();
        camera.current.x = Math.max(
          -box.width * 0.4,
          Math.min(box.width * 0.4, p.sx + e.clientX - p.x),
        );
        camera.current.y = Math.max(
          -box.height * 0.4,
          Math.min(box.height * 0.4, p.sy + e.clientY - p.y),
        );
      }
    };
    const up = (e: PointerEvent) => {
      const drag = pointer.current?.drag;
      pointer.current = null;
      if (drag) return;
      const {
        game: g,
        placement: p,
        onPlace: place,
        onSelect: select,
      } = latest.current;
      const cell = hit(e);
      if (p) {
        place(cell);
        return;
      }
      const world = screenPoint(e.clientX, e.clientY);
      const b = g.bixins.find((b) => {
        const v = visuals.get(b.id);
        const pt = pos(v ?? b);
        return Math.hypot(pt.x - world.x, (pt.y - world.y) * 1.2) < 35;
      });
      if (b) {
        select(b.id, "bixin");
        return;
      }
      const item = g.items.find((i) => i.placed && contains(i, cell));
      if (item) {
        select(item.id, "item");
        return;
      }
      const egg = g.eggs.find(
        (i) => i.readyAt && i.x === cell.x && Math.abs(i.y - cell.y) <= 1,
      );
      if (egg) select(egg.id, "egg");
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.current.zoom = Math.min(
        1.8,
        Math.max(0.8, camera.current.zoom - e.deltaY * 0.001),
      );
      setZoom(camera.current.zoom);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    const cancel = () => {
      pointer.current = null;
    };
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("wheel", wheel, { passive: false });
    const draw = (ms: number) => {
      if (!alive) return;
      frame = requestAnimationFrame(draw);
      if (
        document.hidden ||
        ms - last <
          (latest.current.battery ? 83 : latest.current.reduced ? 90 : 32)
      )
        return;
      const dt = Math.min(0.12, (ms - last) / 1000);
      last = ms;
      const { game: g, placement: pl, reduced: quiet } = latest.current;
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(
        latest.current.battery ? 1 : 2,
        window.devicePixelRatio || 1,
      );
      if (
        canvas.width !== Math.round(box.width * dpr) ||
        canvas.height !== Math.round(box.height * dpr)
      ) {
        canvas.width = Math.round(box.width * dpr);
        canvas.height = Math.round(box.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);
      const bg = ctx.createLinearGradient(0, 0, 0, box.height);
      bg.addColorStop(0, "#dfebd6");
      bg.addColorStop(1, "#e9ecd9");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, box.width, box.height);
      const scale =
        Math.min(box.width / scene().width, box.height / scene().height) *
        camera.current.zoom;
      ctx.translate(
        box.width / 2 + camera.current.x,
        box.height / 2 + camera.current.y,
      );
      ctx.scale(scale, scale);
      const dx = (g.width - 20) * 40,
        dy = (g.height - 14) * 32,
        right = 1000 + dx,
        bottom = 648 + dy,
        gate = 600 + dx / 2;
      ctx.translate(-scene().width / 2, -scene().height / 2);
      ellipse(
        600 + dx / 2,
        510 + dy / 2,
        567 + dx / 2,
        294 + dy / 2,
        "#b4c99c",
      );
      ellipse(
        610 + dx / 2,
        530 + dy / 2,
        530 + dx / 2,
        260 + dy / 2,
        "#bfd19e",
      );
      // Layers of woodland frame the empty, buildable clearing.
      for (const [x, y, s, v] of [
        [125, 224, 1.25, 0],
        [220, 162, 1.35, 1],
        [350, 140, 1, 0],
        [960, 153, 1.4, 0],
        [1083, 265, 1.2, 1],
        [1020, 375, 0.8, 0],
        [86, 422, 0.9, 1],
        [136, 581, 1.2, 0],
      ])
        tree(x + (x > 800 ? dx : 0), y + (y > 600 ? dy : 0), s, v);
      round(190, 198, 820 + dx, 472 + dy, 33, "#829d6a");
      round(190, 181, 820, 472, 33, "#c4d79e");
      round(200, 192, 800 + dx, 456 + dy, 25, "#bbd493");
      const grass = ctx.createLinearGradient(0, 190, 0, 650);
      grass.addColorStop(0, "#c0d994");
      grass.addColorStop(0.6, "#b4d18b");
      grass.addColorStop(1, "#a9c784");
      round(202, 196, 796 + dx, 450 + dy, 25, grass as unknown as string);
      for (const original of details) {
        const d = {
          ...original,
          x: 200 + ((original.x - 200) * (800 + dx)) / 800,
          y: 200 + ((original.y - 200) * (448 + dy)) / 448,
        };
        if (d.x < 208 || d.x > right - 10 || d.y < 202 || d.y > bottom - 6)
          continue;
        if (d.s > 0.87) {
          ellipse(d.x, d.y, 4, 1.4, "#e3e8b257");
          line(
            [d.x - 2, d.y, d.x - 4, d.y - 4, d.x, d.y - 1, d.x + 3, d.y - 6],
            "#7eab6c70",
            1.5,
          );
        } else if (d.s > 0.7) {
          ellipse(d.x, d.y, 1.5, 1.5, d.r > 0.5 ? "#e8e7bb" : "#99bd75");
        }
      }
      const fence = (x: number, y: number, vertical = false) => {
        ctx.save();
        ctx.translate(x, y);
        if (vertical) {
          round(-2, -11, 6, 45, 2, "#ac8e63");
          round(2, -15, 6, 45, 2, "#dfc595");
        } else {
          round(0, -24, 44, 8, 3, "#b09369");
          round(0, -16, 44, 6, 2, "#ead1a0");
          round(0, -3, 44, 7, 2, "#c6a677");
        }
        ctx.beginPath();
        ctx.moveTo(-5, 15);
        ctx.lineTo(-5, -36);
        ctx.lineTo(0, -43);
        ctx.lineTo(6, -36);
        ctx.lineTo(6, 15);
        ctx.closePath();
        ctx.fillStyle = "#e7cda0";
        ctx.fill();
        line([-5, 15, 6, 15, 6, -35], "#b4956f", 2);
        ctx.restore();
      };
      for (let x = 200; x <= right; x += 40) fence(x, 204);
      for (let y = 236; y < bottom; y += 32) {
        fence(200, y, true);
        fence(right, y, true);
      }
      if (pl) {
        ctx.strokeStyle = "#5d886630";
        ctx.lineWidth = 1;
        for (let x = 200; x <= right; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 200);
          ctx.lineTo(x, bottom);
          ctx.stroke();
        }
        for (let y = 200; y <= bottom; y += 32) {
          ctx.beginPath();
          ctx.moveTo(200, y);
          ctx.lineTo(right, y);
          ctx.stroke();
        }
      }
      for (const egg of g.eggs.filter((e) => e.readyAt)) {
        const p = pos(egg);
        ctx.save();
        ctx.translate(p.x, p.y);
        if (!quiet) ctx.rotate(Math.sin(ms / 300) * 0.035);
        image(`${egg.species}-egg`, -35, -55, 70, 70);
        ctx.restore();
      }
      const drawables = [
        ...g.items
          .filter((i) => i.placed)
          .map((i) => ({
            y: i.y + dimensions(i).height,
            draw: () => {
              const d = dimensions(i),
                p = pos({
                  x: i.x + (d.width - 1) / 2,
                  y: i.y + (d.height - 1) / 2,
                }),
                size = Math.max(70, Math.max(d.width, d.height) * 34 + 12);
              ctx.save();
              ctx.translate(p.x, p.y);
              if (i.rotation) ctx.rotate(Math.PI / 2);
              image(i.key, -size / 2, -size * 0.8, size, size);
              ctx.restore();
              if ((i.level ?? 1) > 1) {
                ellipse(
                  p.x + size * 0.3,
                  p.y - 10,
                  4,
                  4,
                  (i.level ?? 1) === 3 ? "#ead289" : "#d6bfcc",
                );
              }
            },
          })),
        ...g.bixins.map((b) => ({
          y: b.y,
          draw: () => {
            const goal = b.path[b.path.length - 1] ?? { x: b.x, y: b.y };
            const routeKey = `${b.targetId ?? "wander"}:${goal.x},${goal.y}`;
            let v = visuals.get(b.id);
            if (!v) {
              v = {
                x: b.x,
                y: b.y,
                path: b.path.map((p) => ({ ...p })),
                version: g.version,
                activity: b.activity,
                routeKey,
              };
              visuals.set(b.id, v);
            } else if (v.version !== g.version) {
              if (v.routeKey !== routeKey) {
                const start = { x: Math.round(v.x), y: Math.round(v.y) };
                v.path = [start, ...pathfind(g, start, goal)];
                v.routeKey = routeKey;
              }
              v.version = g.version;
              v.activity = b.activity;
            }
            const next = v.path[0];
            let walking = false;
            if (next) {
              const dx = next.x - v.x,
                dy = next.y - v.y;
              const distance = Math.hypot(dx, dy);
              if (distance < 0.03) {
                v.x = next.x;
                v.y = next.y;
                v.path.shift();
              } else {
                const speed = Math.min(distance, dt * 0.65);
                v.x += (dx / distance) * speed;
                v.y += (dy / distance) * speed;
                walking = true;
              }
            }
            const p = pos(v);
            const sleeping = b.activity === "Dormindo" && !walking;
            const bounce = quiet
              ? 0
              : Math.sin(ms / (walking ? 110 : 550) + b.bornAt) *
                (walking ? 3 : 1.2);
            ctx.save();
            ctx.translate(p.x, p.y + bounce);
            const age = (latest.current.now - b.bornAt) / 3600000;
            const bodyScale =
              (age < 6 ? 0.8 : age < 24 ? 0.9 : 1) *
              (b.genome?.size === "fofucho"
                ? 1.07
                : b.genome?.size === "pequeno"
                  ? 0.94
                  : 1);
            ctx.scale(bodyScale, bodyScale);
            if (walking && next && next.x < v.x) ctx.scale(-1, 1);
            const action = walking
              ? "idle"
              : b.activity === "Comendo"
                ? "eat"
                : b.activity === "Bebendo"
                  ? "drink"
                  : b.activity === "Brincando"
                    ? "play"
                    : "idle";
            const artKey = `individual-${b.id}-${sleeping}-${action}`;
            if (!imgs[artKey]) {
              const im = new Image();
              im.src = dataUri(portraitSvg(b, sleeping, action));
              imgs[artKey] = im;
            }
            image(artKey, -34, -58, 68, 68);
            ctx.restore();
            ctx.font = '600 12px "Segoe UI",sans-serif';
            ctx.textAlign = "center";
            const nameWidth = ctx.measureText(b.name).width + 12;
            round(p.x - nameWidth / 2, p.y + 11, nameWidth, 18, 8, "#fff9e8dc");
            ctx.fillStyle = "#43583b";
            ctx.fillText(b.name, p.x, p.y + 24);
            if (sleeping) {
              ctx.font = "14px serif";
              ctx.fillText("z z", p.x + 28, p.y - 48);
            }
            if (
              [
                "Conversando",
                "Aconchegando o ninho",
                "Disputando a bolinha",
              ].includes(b.activity)
            ) {
              ctx.font = "18px serif";
              ctx.fillStyle = "#b66e80";
              ctx.fillText(
                b.activity === "Disputando a bolinha" ? "?!" : "♡",
                p.x + 24,
                p.y - 44,
              );
            }
          },
        })),
      ];
      drawables.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
      if (pl && hover.current) {
        const p = hover.current;
        const point = pos(p);
        const valid = validPlacement(
          g,
          p.x,
          p.y,
          pl.kind === "item" ? pl.id : undefined,
          pl.kind === "item" ? (pl.key as ItemKey) : undefined,
          pl.rotation ?? 0,
        );
        ctx.fillStyle = valid ? "#5d9b6d66" : "#d7727066";
        const d =
          pl.kind === "item"
            ? dimensions({ key: pl.key as ItemKey, rotation: pl.rotation })
            : { width: 1, height: 1 };
        ctx.fillRect(
          200 + p.x * 40,
          200 + p.y * 32,
          d.width * 40,
          d.height * 32,
        );
        ctx.globalAlpha = 0.6;
        if (pl.kind === "item")
          image(pl.key, point.x - 35, point.y - 50, 70, 70);
        else
          image(
            `${g.eggs.find((e) => e.id === pl.id)?.species ?? "musguito"}-egg`,
            point.x - 35,
            point.y - 50,
            70,
            70,
          );
        ctx.globalAlpha = 1;
      }
      for (let x = 200; x <= right; x += 40) {
        if (x >= gate - 40 && x <= gate + 40) continue;
        fence(x, bottom + 2);
      }
      // The gate and a little hand-painted name board.
      line(
        [
          gate - 41,
          bottom + 1,
          gate - 41,
          bottom - 40,
          gate + 40,
          bottom - 40,
          gate + 40,
          bottom + 1,
        ],
        "#b19468",
        6,
      );
      line(
        [
          gate - 35,
          bottom - 17,
          gate + 33,
          bottom - 17,
          gate - 32,
          bottom - 38,
          gate + 33,
          bottom + 1,
        ],
        "#e6cda0",
        6,
      );
      ellipse(gate + 33, bottom - 22, 3, 3, "#8a7457");
      for (let n = 0; n < 6; n++)
        ellipse(
          gate + Math.sin(n * 5) * 17,
          bottom + 24 + n * 17,
          14 + (n % 2) * 3,
          7,
          "#d1ccad",
        );
      for (const [x, y, s, v] of [
        [1080, 590, 1.3, 1],
        [1034, 732, 0.8, 0],
        [121, 718, 1.4, 1],
        [220, 782, 0.65, 0],
        [910, 804, 0.6, 1],
      ])
        tree(x + (x > 800 ? dx : 0), y + (y > 600 ? dy : 0), s, v);
      const flower = (x: number, y: number, c: string) => {
        line([x, y, x, y - 15], "#719566", 2);
        for (let k = 0; k < 5; k++)
          ellipse(
            x + Math.sin(k * 1.26) * 5,
            y - 18 + Math.cos(k * 1.26) * 5,
            4,
            4,
            c,
          );
        ellipse(x, y - 18, 3, 3, "#f7db88");
      };
      for (let n = 0; n < 25; n++) {
        const x = 170 + ((n * 97) % 900);
        const y = n % 2 ? 690 + ((n * 7) % 63) : 166 + ((n * 3) % 22);
        flower(
          x + (x > 800 ? dx : 0),
          y + (y > 600 ? dy : 0),
          n % 3 ? "#f3cfb4" : "#b4a4cf",
        );
      }
      if (!quiet && !latest.current.battery)
        for (let n = 0; n < 7; n++) {
          const x = 250 + (Math.sin(ms / 9000 + n * 4) * 0.5 + 0.5) * 700,
            y = 260 + (Math.cos(ms / 7000 + n * 5) * 0.5 + 0.5) * 290;
          ellipse(x, y, 2, 2, "#fff6c2a0");
        }
      const weather = environment(latest.current.now);
      if (weather.night) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#24375346";
        ctx.fillRect(0, 0, box.width, box.height);
        ctx.restore();
        ellipse(1000 + dx, 110, 24, 24, "#fff4c4");
        ellipse(1010 + dx, 103, 22, 22, "#879781");
      }
      if (weather.rain) {
        ellipse(355, 515, 27, 6, "#87b8c25c");
        ellipse(740 + dx, 400, 22, 5, "#87b8c25c");
        if (!quiet && !latest.current.battery)
          for (let n = 0; n < 45; n++) {
            const x = (n * 127 + ms * 0.025) % scene().width;
            const y = (n * 83 + ms * 0.14) % scene().height;
            line([x, y, x - 3, y + 10], "#6f9ba66b", 1.4);
          }
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("wheel", wheel);
    };
  }, []);
  return (
    <div className={`terrain ${placement ? "placing" : ""}`}>
      <canvas
        ref={ref}
        aria-label="Seu terreno ilustrado. Arraste para mover a câmera; use a lista de objetos para construir pelo teclado."
      />
      <div className="world-label">
        <span className="sun-dot" /> {environment(now).label} <span>·</span>{" "}
        {game.width > 20 ? "Terreninho" : "Quintal"}
      </div>
      {!demo && (
        <div className="camera-tools">
          <button
            title="Aproximar"
            aria-label="Aproximar"
            onClick={() => {
              camera.current.zoom = Math.min(1.8, zoom + 0.15);
              setZoom(camera.current.zoom);
            }}
          >
            <ZoomIn size={18} />
          </button>
          <button
            title="Afastar"
            aria-label="Afastar"
            onClick={() => {
              camera.current.zoom = Math.max(0.8, zoom - 0.15);
              setZoom(camera.current.zoom);
            }}
          >
            <ZoomOut size={18} />
          </button>
          <button
            title="Centralizar câmera"
            aria-label="Centralizar câmera"
            onClick={() => {
              camera.current = { zoom: 1, x: 0, y: 0 };
              setZoom(1);
            }}
          >
            <LocateFixed size={18} />
          </button>
        </div>
      )}
      <div className="terrain-caption">
        {placement
          ? "Toque em um lugar livre para posicionar"
          : "Arraste para passear pelo seu cantinho"}
      </div>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Egg,
  Heart,
  House,
  Leaf,
  LogOut,
  Map,
  PackageOpen,
  Plus,
  Settings,
  ShoppingBag,
  Shovel,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Droplets,
  Utensils,
  Sun,
} from "lucide-react";
import Terrain, { type Placement } from "./Terrain";
import {
  ConstructionPanel,
  ItemPanel,
  MissionsPanel,
  ShopPanel,
  CollectionPanel,
  ExplorationPanel,
  TransferControls,
} from "./PhasePanels";
import { charm, stageOf } from "@/game/progression";
import { dimensions } from "@/game/geometry";
import { authClient } from "@/lib/auth/client";
import {
  CONFIG,
  rarities,
  starters,
  items,
  species,
  needLabels,
  type ItemKey,
  type Species,
} from "@/game/config";
import { creatureSvg, dataUri, eggSvg, itemSvg } from "@/game/art";
import type { Bixin, Game } from "@/game/types";
import type { Action } from "@/game/actions";
const nav = [
  { id: "home", title: "Meu refúgio", icon: House },
  { id: "build", title: "Construir", icon: Shovel },
  { id: "eggs", title: "Ovinhos", icon: Egg },
  { id: "collection", title: "Bixinpédia", icon: BookOpen },
  { id: "diary", title: "Diário", icon: Leaf },
] as const;
type Tab =
  (typeof nav)[number]["id"] | "settings" | "shop" | "explore" | "missions";
function Art({
  src,
  alt = "",
  className = "",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  return <img src={src} alt={alt} className={className} draggable={false} />;
}
function audioPing() {
  try {
    const context = new AudioContext();
    const o = context.createOscillator();
    const gain = context.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(660, context.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.14);
    gain.gain.setValueAtTime(0.07, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
    o.connect(gain);
    gain.connect(context.destination);
    o.start();
    o.stop(context.currentTime + 0.3);
    o.onended = () => void context.close();
  } catch {}
}
export default function GameClient() {
  const [game, setGame] = useState<Game | null>(null),
    [loading, setLoading] = useState(true),
    [signed, setSigned] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [tab, setTab] = useState<Tab>("home"),
    [placement, setPlacement] = useState<Placement | null>(null),
    [selected, setSelected] = useState<{
      id: string;
      kind: "bixin" | "item" | "egg";
    } | null>(null),
    [reduced, setReduced] = useState(false),
    [sound, setSound] = useState(false),
    [now, setNow] = useState(0),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [signup, setSignup] = useState(false),
    [authError, setAuthError] = useState(""),
    [rename, setRename] = useState(""),
    [kx, setKx] = useState(8),
    [ky, setKy] = useState(7),
    [birth, setBirth] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const offset = useRef(0),
    inFlight = useRef(false),
    soundRef = useRef(sound);
  soundRef.current = sound;
  const retry = useRef<Record<string, string>>({});
  const act = useCallback(async (action: Action, quiet = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      const fingerprint = JSON.stringify(action);
      const key = retry.current[fingerprint] ?? crypto.randomUUID();
      retry.current[fingerprint] = key;
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, idempotencyKey: key }),
      });
      const result = await res.json();
      if (!res.ok) {
        delete retry.current[JSON.stringify(action)];
        if (res.status === 401) setSigned(false);
        throw Error(result.error || "Não foi possível guardar a ação.");
      }
      delete retry.current[JSON.stringify(action)];
      offset.current = result.serverTime - Date.now();
      setNow(result.serverTime);
      setGame((old) =>
        !old || result.state.version >= old.version ? result.state : old,
      );
      if (!quiet) {
        setMessage(
          action.type === "hatch"
            ? "Nasceu! Que bom ter você no nosso mundinho."
            : "Prontinho. Seu refúgio está guardado.",
        );
        if (soundRef.current) audioPing();
      }
      if (action.type === "hatch") {
        setBirth(true);
        setSelected({ id: `bixin-${action.id}`, kind: "bixin" });
        setTimeout(() => setBirth(false), 5000);
      }
      return true;
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Sua conexão cochilou. Tente novamente.",
      );
      return false;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);
  useEffect(() => {
    setReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        localStorage.getItem("bixins-reduced") === "true",
    );
    setSound(localStorage.getItem("bixins-sound") === "true");
    authClient
      .getSession()
      .then(async ({ data, error }) => {
        if (error) {
          setAuthError(
            "Não foi possível verificar sua sessão. Recarregue para tentar novamente.",
          );
          return;
        }
        if (data?.user) {
          setSigned(true);
          await act({ type: "sync" }, true);
        }
      })
      .catch(() =>
        setAuthError(
          "Não foi possível conectar. Recarregue para tentar novamente.",
        ),
      )
      .finally(() => setLoading(false));
  }, [act]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset.current), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!signed) return;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    const sync = async () => {
      if (!document.hidden) {
        const ok = await act({ type: "sync" }, true);
        failures = ok ? 0 : Math.min(4, failures + 1);
      }
      timer = setTimeout(sync, CONFIG.syncSeconds * 1000 * 2 ** failures);
    };
    timer = setTimeout(sync, CONFIG.syncSeconds * 1000);
    const visible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void sync();
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [signed, act]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPlacement(null);
        setSelected(null);
        setTab("home");
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setAuthError("");
    try {
      const result = signup
        ? await authClient.signUp.email({
            email,
            password,
            name: name || "Cuidador",
          })
        : await authClient.signIn.email({ email, password });
      if (result.error)
        throw Error(result.error.message || "Confira seu e-mail e sua senha.");
      if (!result.data?.user)
        throw Error("Confira seu e-mail para concluir o cadastro.");
      setSigned(true);
      setPending(false);
      await act({ type: "sync" }, true);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    if (!(
      (tab !== "home" && !placement) ||
      selected?.kind === "bixin" ||
      selected?.kind === "item"
    ))
      return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input:not(:disabled)",
        ),
      );
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [tab, placement, selected]);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(
      () => setMessage((current) => (current === message ? "" : current)),
      7000,
    );
    return () => clearTimeout(id);
  }, [message]);
  const choose = (id: string, kind: "bixin" | "item" | "egg") => {
    setSelected({ id, kind });
    if (kind === "bixin")
      setRename(game?.bixins.find((b) => b.id === id)?.name ?? "");
    if (kind === "egg") setTab("eggs");
  };
  const place = async (p: { x: number; y: number }) => {
    if (!placement) return;
    const ok = await act(
      placement.kind === "egg"
        ? { type: "incubate", id: placement.id, ...p }
        : {
            type: "place",
            id: placement.id,
            rotation: placement.rotation ?? 0,
            ...p,
          },
    );
    if (ok) {
      setPlacement(null);
      setTab("home");
    }
  };
  const bixin =
    selected?.kind === "bixin"
      ? game?.bixins.find((b) => b.id === selected.id)
      : undefined;
  const selectedItem =
    selected?.kind === "item"
      ? game?.items.find((i) => i.id === selected.id)
      : undefined;
  const remaining = (at: number) => Math.max(0, Math.ceil((at - now) / 1000));
  const remainingLabel = (at: number) =>
    remaining(at) < 60
      ? remaining(at) + "s"
      : Math.ceil(remaining(at) / 60) + " min";
  const stage = (b: Bixin) => stageOf(b, now);
  if (loading)
    return (
      <main className="loading">
        <span className="brand">
          bixins<span>✿</span>
        </span>
        <div className="egg-loader">
          <Art src={dataUri(eggSvg("musguito"))} />
        </div>
        <p>Preparando seu pedacinho de mundo…</p>
      </main>
    );
  if (!signed)
    return (
      <main className="welcome">
        <div className="welcome-brand brand">
          bixins<span>✿</span>
        </div>
        <section className="welcome-copy">
          <span className="eyebrow">
            <Leaf size={15} /> UM PEQUENO MUNDO. MUITO CARINHO.
          </span>
          <h1>
            Tem vida nova
            <br />
            no seu <em>cantinho.</em>
          </h1>
          <p>
            Um terreninho, muitos ovinhos e um mundão de Bixins para cuidar. Seu
            refúgio começa com você.
          </p>
          <div className="welcome-creatures">
            {starters.map((s) => (
              <Art
                key={s}
                src={dataUri(creatureSvg(s))}
                alt={species[s].name}
              />
            ))}
          </div>
          <span className="handwritten">
            pequenos, fantásticos e cheios de personalidade.
          </span>
        </section>
        <section className="auth-card">
          <span className="leaf-badge">
            <Leaf size={25} />
          </span>
          <h2>
            {signup ? "Seu mundo começa aqui." : "Seu cantinho está esperando."}
          </h2>
          <p>
            {signup
              ? "Vamos preparar um refúgio só seu?"
              : "Entre e deixe a vida acontecer."}
          </p>
          <form onSubmit={login}>
            {signup && (
              <label>
                Como podemos te chamar?
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  required
                />
              </label>
            )}
            <label>
              E-mail
              <input
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder="Pelo menos 8 caracteres"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {authError && (
              <p role="alert" className="error">
                {authError}
              </p>
            )}
            <button className="button primary" disabled={pending}>
              {pending
                ? "Preparando…"
                : signup
                  ? "Criar meu refúgio"
                  : "Entrar no meu refúgio"}
              <ArrowRight size={18} />
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setSignup(!signup);
              setAuthError("");
            }}
          >
            {signup
              ? "Já tenho um cantinho. Entrar"
              : "Primeira visita? Crie seu refúgio"}
          </button>
          <p className="auth-note">
            Feito para cuidar, descobrir e ir no seu ritmo.
          </p>
        </section>
        <footer>BIXINS · Criaturas fantásticas. Carinho de verdade.</footer>
      </main>
    );
  if (!game)
    return (
      <main className="loading">
        <h1>Seu refúgio está quase pronto.</h1>
        <p role="alert">{message || "Não conseguimos abrir seu terreno."}</p>
        <button
          className="button primary"
          disabled={pending}
          onClick={() => act({ type: "sync" })}
        >
          Tentar novamente
        </button>
      </main>
    );
  const avg = game.bixins.length
    ? Math.round(
        game.bixins.reduce(
          (a, b) => a + Object.values(b.needs).reduce((x, y) => x + y, 0) / 8,
          0,
        ) / game.bixins.length,
      )
    : 0;
  const activeEgg = game.eggs.find((e) => e.readyAt);
  return (
    <main className={`app ${reduced ? "reduced" : ""}`}>
      <header className="topbar">
        <a href="/" aria-label="BIXINS início" className="brand">
          bixins<span>✿</span>
        </a>
        <div className="divider" />
        <div className="refuge-title">
          <span>SEU PEQUENO MUNDO</span>
          <strong>
            {game.name}
            <Leaf size={13} />
          </strong>
        </div>
        <div className="top-resources">
          <span className="credit">
            <span className="coin">
              <Leaf size={14} />
            </span>{" "}
            C$ {game.credits.toLocaleString("pt-BR")}
          </span>
          <button className="egg-resource" onClick={() => setTab("eggs")}>
            <Egg size={19} />
            <span>
              {game.eggs.length} {game.eggs.length === 1 ? "ovinho" : "ovinhos"}
            </span>
          </button>
        </div>
        <button
          className="icon-button settings"
          aria-label="Configurações"
          onClick={() => setTab("settings")}
        >
          <Settings size={20} />
        </button>
        <button
          className="avatar"
          title="Sair"
          aria-label="Sair da conta"
          onClick={async () => {
            await authClient.signOut();
            setSigned(false);
            setGame(null);
          }}
        >
          <LogOut size={17} />
        </button>
      </header>
      <div className="game-heading">
        <div>
          <span className="eyebrow">UM DIA BONITO PARA CUIDAR</span>
          <h1>
            Seu cantinho, <em>do seu jeitinho.</em>
          </h1>
        </div>
        <span className="save-state">
          <span className={pending ? "sync-dot pending" : "sync-dot"} />
          {pending ? "Guardando…" : "Progresso guardado"}
        </span>
      </div>
      <section className="game-stage">
        <aside className="left-hud">
          <div className="level-label">
            <span className="level-icon">
              <House size={19} />
            </span>
            <div>
              <span>NÍVEL {game.level ?? 1}</span>
              <strong>
                {(game.level ?? 1) >= 2 ? "Terreninho" : "Pequeno refúgio"}
              </strong>
            </div>
          </div>
          <div className="colony-stats">
            <span>
              <Heart size={16} /> Bem-estar{" "}
              <strong>{game.bixins.length ? `${avg}%` : "—"}</strong>
            </span>
            <span>
              <Leaf size={16} /> Bixins{" "}
              <strong>
                {game.bixins.length}/{game.capacity}
              </strong>
            </span>
          </div>
          <div className="hud-charm">
            <Sparkles size={14} /> Charme{" "}
            <strong>{Math.round(charm(game))}/100</strong>
          </div>
          <div className="mission">
            <span className="eyebrow">PEQUENOS COMEÇOS</span>
            <h3>O primeiro de muitos.</h3>
            <button className="mission-open" onClick={() => setTab("missions")}>
              Objetivos e recompensas <ArrowRight size={13} />
            </button>
            <p>Cada cantinho começa com um pouquinho de carinho.</p>
            <button onClick={() => setTab("build")}>
              <span
                className={
                  game.items.filter((i) => i.placed && i.id.startsWith("kit-"))
                    .length >= 4
                    ? "task-check done"
                    : "task-check"
                }
              >
                {game.items.filter((i) => i.placed).length >= 4 ? (
                  <Check size={12} />
                ) : null}
              </span>{" "}
              Instalar o kit de boas-vindas{" "}
              <small>{game.items.filter((i) => i.placed).length}/4</small>
            </button>
            <button onClick={() => setTab("eggs")}>
              <span
                className={
                  game.bixins.length ? "task-check done" : "task-check"
                }
              >
                {game.bixins.length ? <Check size={12} /> : null}
              </span>{" "}
              Conhecer seu primeiro Bixin{" "}
              <small>{game.bixins.length ? "1/1" : "0/1"}</small>
            </button>
            <div className="mission-progress">
              <i
                style={{
                  width: `${Math.min(100, ((Math.min(4, game.items.filter((i) => i.placed).length) + (game.bixins.length ? 1 : 0)) / 5) * 100)}%`,
                }}
              />
            </div>
          </div>
          <button className="delivery-hint" onClick={() => setTab("build")}>
            <PackageOpen size={24} />
            <span>
              <strong>Sua caixa chegou!</strong>
              <small>
                {game.items.filter((i) => !i.placed).length} objetos esperando
                um lugar
              </small>
            </span>
            <ChevronRight size={15} />
          </button>
        </aside>
        <Terrain
          game={game}
          placement={placement}
          onPlace={place}
          onSelect={choose}
          reduced={reduced}
        />
        {!game.bixins.length && !activeEgg && !placement && (
          <div className="first-egg-note">
            <Art src={dataUri(eggSvg(game.eggs[0]?.species ?? "musguito"))} />
            <div>
              <span>OLÁ, NOVO COMEÇO!</span>
              <h2>Esse pedacinho de mundo é seu.</h2>
              <p>Vamos dar um lar ao seu primeiro ovinho?</p>
              <button
                className="button primary small"
                onClick={() => setTab("eggs")}
              >
                Abrir minha caixinha <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
        {activeEgg && !placement && (
          <button className="incubation-note" onClick={() => setTab("eggs")}>
            <Egg size={18} />
            {remaining(activeEgg.readyAt!) > 0
              ? `Um novo amigo chega em ${remainingLabel(activeEgg.readyAt!)}`
              : "Tem alguém pronto para conhecer você!"}
            <ChevronRight size={16} />
          </button>
        )}
        <div className="season-note">
          <Sun size={17} />
          <span>
            PRIMEIROS DIAS
            <br />
            <strong>Uma nova história começa.</strong>
          </span>
        </div>
        {birth && (
          <div className="birth-banner" role="status">
            <Sparkles /> Nasceu! O mundo ficou um pouquinho mais fofo.{" "}
            <Sparkles />
          </div>
        )}
      </section>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {nav.map((n) => (
          <button
            key={n.id}
            className={tab === n.id ? "active" : ""}
            onClick={() => {
              setTab(n.id);
              setSelected(null);
              setPlacement(null);
            }}
          >
            <n.icon size={21} />
            <span>{n.title}</span>
            {n.id === "eggs" && game.eggs.length > 0 && <i />}
          </button>
        ))}
        <div className="nav-divider" />
        <button
          onClick={() => setTab("shop")}
          className={tab === "shop" ? "active" : ""}
        >
          <ShoppingBag size={21} />
          <span>Lojinha</span>
        </button>
        <button
          onClick={() => setTab("missions")}
          className={tab === "missions" ? "active" : ""}
        >
          <Check size={21} />
          <span>Objetivos</span>
        </button>
        <button onClick={() => setTab("explore")}>
          <Map size={21} />
          <span>Explorar</span>
        </button>
      </nav>
      <footer className="game-footer">
        <Leaf size={13} />
        <span>Sem pressa. Seu mundinho cresce no seu ritmo.</span>
        <button
          onClick={() => {
            setSound(!sound);
            localStorage.setItem("bixins-sound", String(!sound));
            if (!sound) audioPing();
          }}
          aria-label={sound ? "Desativar som" : "Ativar som"}
        >
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </footer>
      {game.bixins.length > 0 && tab === "home" && !bixin && !selectedItem && (
        <div className="bixin-strip">
          {game.bixins.map((b) => (
            <button key={b.id} onClick={() => choose(b.id, "bixin")}>
              <Art src={dataUri(creatureSvg(b.species))} />
              <span>
                {b.name}
                <small>{b.activity}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button aria-label="Fechar mensagem" onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {placement && (
        <section className="placement-bar">
          <span>
            <strong>
              {placement.kind === "egg"
                ? "Escolha o cantinho do ninho"
                : `Posicionar ${items[placement.key as ItemKey].name}`}
            </strong>
            <small>Toque no terreno ou informe a célula.</small>
          </span>
          <label>
            Coluna
            <input
              aria-label="Coluna"
              type="number"
              min="0"
              max={game.width - 1}
              value={kx}
              onChange={(e) => setKx(Number(e.target.value))}
            />
          </label>
          <label>
            Linha
            <input
              aria-label="Linha"
              type="number"
              min="0"
              max={game.height - 1}
              value={ky}
              onChange={(e) => setKy(Number(e.target.value))}
            />
          </label>
          {placement.kind === "item" &&
            items[placement.key as ItemKey].width !==
              items[placement.key as ItemKey].height && (
              <button
                className="button small"
                onClick={() =>
                  setPlacement({
                    ...placement,
                    rotation: placement.rotation ? 0 : 1,
                  })
                }
              >
                Girar 90°
              </button>
            )}
          <button
            className="button primary small"
            disabled={pending}
            onClick={() => place({ x: kx, y: ky })}
          >
            Colocar
          </button>
          <button
            className="icon-button"
            aria-label="Cancelar construção"
            onClick={() => setPlacement(null)}
          >
            <X size={18} />
          </button>
        </section>
      )}
      {((tab !== "home" && !placement) || bixin || selectedItem) && (
        <div
          className="panel-shade"
          onClick={() => {
            setTab("home");
            setSelected(null);
          }}
        >
          <section
            ref={panelRef}
            className="game-panel"
            role="dialog"
            aria-modal="true"
            aria-label={
              bixin
                ? "Ficha do Bixin"
                : selectedItem
                  ? "Objeto do terreno"
                  : tab
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="panel-close icon-button"
              aria-label="Fechar painel"
              onClick={() => {
                setTab("home");
                setSelected(null);
              }}
            >
              <X size={20} />
            </button>
            {bixin ? (
              <>
                <div className="bixin-portrait">
                  <Art
                    src={dataUri(
                      creatureSvg(bixin.species, bixin.activity === "Dormindo"),
                    )}
                  />
                </div>
                <span className="eyebrow">
                  {species[bixin.species].name} ·{" "}
                  {rarities[species[bixin.species].rarity].label.toUpperCase()}
                </span>
                <h2>{bixin.name}</h2>
                <p>
                  {stage(bixin)} ·{" "}
                  {Math.max(0, (now - bixin.bornAt) / 14400000).toFixed(1)} dias
                  Bixin · {species[bixin.species].region}
                </p>
                <p className="bixin-mood">
                  {bixin.activity} · {bixin.traits.join(" · ")}
                </p>
                <div className="need-list">
                  {Object.entries(needLabels).map(([key, label]) => (
                    <div key={key}>
                      <span>{label}</span>
                      <div>
                        <i
                          style={{
                            width: `${bixin.needs[key as keyof typeof needLabels]}%`,
                          }}
                        />
                      </div>
                      <strong>
                        {Math.round(
                          bixin.needs[key as keyof typeof needLabels],
                        )}
                        %
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="care-buttons">
                  <button
                    disabled={pending}
                    onClick={() =>
                      act({ type: "care", id: bixin.id, kind: "pet" })
                    }
                  >
                    <Heart size={18} />
                    Carinho
                  </button>
                  <button
                    disabled={pending}
                    onClick={() =>
                      act({ type: "care", id: bixin.id, kind: "snack" })
                    }
                  >
                    <Utensils size={18} />
                    Petisco
                  </button>
                  <button
                    disabled={pending}
                    onClick={() =>
                      act({ type: "care", id: bixin.id, kind: "bath" })
                    }
                  >
                    <Droplets size={18} />
                    Banho
                  </button>
                </div>
                <form
                  className="rename-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await act({ type: "rename", id: bixin.id, name: rename });
                  }}
                >
                  <label>
                    Um nome cheio de carinho
                    <input
                      value={rename}
                      maxLength={24}
                      onChange={(e) => setRename(e.target.value)}
                      required
                    />
                  </label>
                  <button className="button primary small" disabled={pending}>
                    Renomear
                  </button>
                </form>
                <button
                  className="text-button"
                  onClick={() =>
                    setRename(
                      ["Pingo", "Pitoco", "Xodó", "Fubá", "Pipoca", "Cacau"][
                        Math.floor(Math.random() * 6)
                      ],
                    )
                  }
                >
                  Me surpreenda com um nome
                </button>
                <TransferControls
                  game={game}
                  bixin={bixin}
                  now={now}
                  pending={pending}
                  act={act}
                  onSold={() => {
                    setSelected(null);
                    setTab("home");
                  }}
                />
                <p className="fineprint">
                  Compatibilidade reprodutiva: {bixin.role} · Reprodução em uma
                  próxima etapa.
                </p>
              </>
            ) : selectedItem ? (
              <ItemPanel
                item={selectedItem}
                game={game}
                pending={pending}
                act={act}
                onPlace={(p) => {
                  setPlacement(p);
                  setSelected(null);
                  setTab("home");
                }}
                onStored={() => setSelected(null)}
              />
            ) : (
              <>
                {tab === "missions" && (
                  <MissionsPanel
                    game={game}
                    now={now}
                    pending={pending}
                    act={act}
                  />
                )}
                {tab === "build" && (
                  <ConstructionPanel
                    game={game}
                    onPlace={(p) => {
                      setPlacement(p);
                      setTab("home");
                      setSelected(null);
                    }}
                    onSelect={(id) => choose(id, "item")}
                    openShop={() => setTab("shop")}
                  />
                )}
                {tab === "eggs" && (
                  <>
                    <span className="eyebrow">PEQUENAS GRANDES SURPRESAS</span>
                    <h2>Tem vida nova a caminho.</h2>
                    <p>
                      O primeiro ovo leva um minuto; os demais, 90 minutos. O
                      ninho é por nossa conta.
                    </p>
                    {game.eggs.map((e) => (
                      <div className="egg-card" key={e.id}>
                        <Art
                          className={e.readyAt && !reduced ? "sway" : ""}
                          src={dataUri(eggSvg(e.species))}
                        />
                        <h3>
                          {e.first
                            ? "Ovo de boas-vindas"
                            : `Ovo de ${species[e.species].name}`}
                        </h3>
                        <span>
                          {species[e.species].region} ·{" "}
                          {rarities[species[e.species].rarity].label}
                        </span>
                        {!e.readyAt ? (
                          <button
                            className="button primary"
                            onClick={() => {
                              setPlacement({
                                kind: "egg",
                                id: e.id,
                                key: "egg",
                              });
                              setTab("home");
                            }}
                          >
                            Preparar um ninho <Leaf size={16} />
                          </button>
                        ) : (
                          <>
                            <div className="incubation-progress">
                              <i
                                style={{
                                  width: `${Math.min(100, 100 * (1 - remaining(e.readyAt) / (e.first ? CONFIG.firstEggSeconds : CONFIG.eggSeconds)))}%`,
                                }}
                              />
                            </div>
                            <p>
                              {remaining(e.readyAt) > 0
                                ? `Tem alguém se mexendo aqui dentro… ${remainingLabel(e.readyAt)}`
                                : "Parece que está na hora!"}
                            </p>
                            <button
                              disabled={pending || remaining(e.readyAt) > 0}
                              className="button primary"
                              onClick={() => act({ type: "hatch", id: e.id })}
                            >
                              Conhecer meu Bixin <Sparkles size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    {!game.eggs.length && (
                      <div className="empty-note">
                        <Egg size={32} />
                        <p>
                          Seu primeiro ovinho já virou uma história. Cuide bem
                          do seu novo amigo!
                        </p>
                      </div>
                    )}
                  </>
                )}
                {tab === "collection" && <CollectionPanel game={game} />}
                {tab === "diary" && (
                  <>
                    <span className="eyebrow">
                      AS HISTÓRIAS DO SEU CANTINHO
                    </span>
                    <h2>A vida acontecendo.</h2>
                    <p>
                      Nascimentos, pequenas descobertas e carinhos que ficam.
                    </p>
                    <ol className="timeline">
                      {game.events.map((e) => (
                        <li key={e.id}>
                          <span className="timeline-dot">
                            <Leaf size={13} />
                          </span>
                          <div>
                            <small>
                              {new Date(e.at).toLocaleString("pt-BR", {
                                timeZone: "America/Bahia",
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </small>
                            <p>{e.text}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <h3>Créditos do refúgio</h3>
                    {game.ledger.length ? (
                      game.ledger.slice(0, 15).map((l) => (
                        <p className="ledger" key={l.id}>
                          {l.kind}
                          <strong>
                            {l.delta > 0 ? "+" : ""} C$ {l.delta}
                          </strong>
                        </p>
                      ))
                    ) : (
                      <p>
                        Ainda não há movimentações. Você começou com C$ 600.
                      </p>
                    )}
                  </>
                )}
                {tab === "shop" && (
                  <ShopPanel
                    game={game}
                    now={now}
                    pending={pending}
                    act={act}
                  />
                )}
                {tab === "explore" && (
                  <ExplorationPanel
                    game={game}
                    now={now}
                    pending={pending}
                    act={act}
                  />
                )}
                {tab === "settings" && (
                  <>
                    <span className="eyebrow">DO SEU JEITINHO</span>
                    <h2>Pequenos ajustes.</h2>
                    <p>Deixe seu cantinho confortável também para você.</p>
                    <label className="toggle">
                      <span>
                        <strong>Sons delicados</strong>
                        <small>
                          Confirmações curtas, sem música automática.
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={sound}
                        onChange={(e) => {
                          setSound(e.target.checked);
                          localStorage.setItem(
                            "bixins-sound",
                            String(e.target.checked),
                          );
                          if (e.target.checked) audioPing();
                        }}
                      />
                    </label>
                    <label className="toggle">
                      <span>
                        <strong>Reduzir movimentos</strong>
                        <small>Desativa balanços, pulinhos e partículas.</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={reduced}
                        onChange={(e) => {
                          setReduced(e.target.checked);
                          localStorage.setItem(
                            "bixins-reduced",
                            String(e.target.checked),
                          );
                        }}
                      />
                    </label>
                    <button
                      className="button"
                      onClick={() => {
                        const url = URL.createObjectURL(
                          new Blob([JSON.stringify(game, null, 2)], {
                            type: "application/json",
                          }),
                        );
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "meu-refugio-bixins.json";
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Exportar meu refúgio em JSON
                    </button>
                    <p className="fineprint">
                      BIXINS · Versão 0.2 · Construção e descobertas. Seus dados
                      ficam guardados na sua conta. A exportação serve para
                      consulta.
                    </p>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

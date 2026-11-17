"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Compass,
  Leaf,
  Lock,
  PackageOpen,
  Plus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  CONFIG,
  items,
  rarities,
  regions,
  species,
  type ItemKey,
  type Species,
  type RegionKey,
} from "@/game/config";
import { dataUri, creatureSvg, eggSvg, itemSvg } from "@/game/art";
import { regionSvg } from "@/game/art-expansion";
import { capacity, dimensions, stockMax, upgradePrice } from "@/game/geometry";
import {
  charm,
  eggPrice,
  missions,
  saleQuote,
  shopEggs,
  stageOf,
  type MissionKey,
} from "@/game/progression";
import type { Action } from "@/game/actions";
import type { Bixin, Game, OwnedItem } from "@/game/types";
import type { Placement } from "./Terrain";
type Shared = {
  game: Game;
  now: number;
  pending: boolean;
  act: (a: Action) => Promise<boolean | undefined>;
};
const money = (n: number) => "C$ " + n.toLocaleString("pt-BR");
const duration = (seconds: number) =>
  seconds >= 3600
    ? Math.ceil(seconds / 3600) + " h"
    : seconds >= 60
      ? Math.ceil(seconds / 60) + " min"
      : Math.max(0, seconds) + " s";
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
function Rarity({ s }: { s: Species }) {
  const r = rarities[species[s].rarity];
  return (
    <span className="rarity-badge" style={{ color: r.color }}>
      <Sparkles size={12} />
      {r.label}
    </span>
  );
}
export function ConstructionPanel({
  game,
  onPlace,
  onSelect,
  openShop,
}: {
  game: Game;
  onPlace: (p: Placement) => void;
  onSelect: (id: string) => void;
  openShop: () => void;
}) {
  return (
    <>
      <span className="eyebrow">DEIXE COM A SUA CARA</span>
      <h2>Um lugar para cada carinho.</h2>
      <p>
        Escolha um objeto da caixa. Cada estrutura tem seu tamanho e precisa de
        um caminho livre ao redor.
      </p>
      <div className="item-grid">
        {game.items
          .filter((i) => !i.placed)
          .map((i) => {
            const d = dimensions(i);
            return (
              <button
                className="item-card"
                key={i.id}
                onClick={() =>
                  onPlace({
                    kind: "item",
                    id: i.id,
                    key: i.key,
                    rotation: i.rotation ?? 0,
                  })
                }
              >
                <Art src={dataUri(itemSvg(i.key))} />
                <strong>{items[i.key].name}</strong>
                <span>
                  {d.width} × {d.height} · {items[i.key].category}
                </span>
                <small>
                  Colocar no terreno <Plus size={14} />
                </small>
              </button>
            );
          })}
      </div>
      {!game.items.some((i) => !i.placed) && (
        <p className="empty-note">
          Tudo encontrou seu lugar. Toque em um objeto no terreno para mover,
          guardar ou melhorar.
        </p>
      )}
      <h3>Já no seu cantinho</h3>
      <div className="object-list">
        {game.items
          .filter((i) => i.placed)
          .map((i) => (
            <button key={i.id} onClick={() => onSelect(i.id)}>
              <Art src={dataUri(itemSvg(i.key))} />
              <span>
                {items[i.key].name}
                <small>
                  Célula {i.x}, {i.y} · Nível {i.level ?? 1}
                </small>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
      </div>
      <button className="text-button" onClick={openShop}>
        Visitar a lojinha <ArrowRight size={15} />
      </button>
    </>
  );
}
export function ItemPanel({
  item,
  game,
  pending,
  act,
  onPlace,
  onStored,
}: {
  item: OwnedItem;
  game: Game;
  pending: boolean;
  act: Shared["act"];
  onPlace: (p: Placement) => void;
  onStored: () => void;
}) {
  const d = dimensions(item),
    def = items[item.key],
    level = item.level ?? 1;
  return (
    <>
      <Art className="panel-art" src={dataUri(itemSvg(item.key))} />
      <span className="eyebrow">
        {def.category} · {["", "BÁSICO", "MELHORADO", "ENCANTADO"][level]}
      </span>
      <h2>{def.name}</h2>
      <p>{def.description}</p>
      <div className="feature-facts">
        <span>
          {d.width} × {d.height} células
        </span>
        <span>
          {capacity(item) ? capacity(item) + " Bixins por vez" : "Decoração"}
        </span>
        {def.charm > 0 && <span>+{def.charm + (level - 1) * 2} charme</span>}
      </div>
      {def.stockMax > 0 && (
        <>
          <p>
            Ração: {item.stock}/{stockMax(item)} · Reserva: {game.food}
          </p>
          {game.food === 0 && (
            <p className="notice">
              A reserva está vazia. Há porções por créditos na Lojinha, além da
              cota diária gratuita.
            </p>
          )}
          <button
            className="button primary"
            disabled={
              pending || item.stock >= stockMax(item) || game.food === 0
            }
            onClick={() => act({ type: "refill", id: item.id })}
          >
            Reabastecer com ração básica
          </button>
        </>
      )}
      <div className="panel-actions">
        <button
          className="button"
          onClick={() =>
            onPlace({
              kind: "item",
              id: item.id,
              key: item.key,
              rotation: item.rotation ?? 0,
            })
          }
        >
          Mover / girar
        </button>
        <button
          className="button"
          disabled={pending}
          onClick={async () => {
            if (await act({ type: "store", id: item.id })) onStored();
          }}
        >
          Guardar
        </button>
      </div>
      {level < 3 ? (
        <button
          className="button upgrade-button"
          disabled={pending || game.credits < upgradePrice(item)}
          onClick={() => act({ type: "upgrade", id: item.id })}
        >
          <Sparkles size={16} />
          Melhorar · {money(upgradePrice(item))}
        </button>
      ) : (
        <p className="fineprint">Este objeto já está encantado.</p>
      )}
      <p className="fineprint">
        Melhorias aumentam a eficiência e a capacidade dos objetos funcionais.
        Decorações melhoradas contribuem com mais charme, até o limite de 100.
      </p>
    </>
  );
}
export function MissionsPanel({ game, pending, act }: Shared) {
  const done = Object.values(game.missions ?? {}).filter(
    (m) => m.claimedAt !== null,
  ).length;
  return (
    <>
      <span className="eyebrow">PASSINHOS QUE VIRAM HISTÓRIA</span>
      <h2>Objetivos sem pressa.</h2>
      <p>
        {done} de {Object.keys(missions).length} recompensas recolhidas ·{" "}
        {game.xp ?? 0} XP. Não há sequência diária nem prazo para perder.
      </p>
      <div className="mission-cards">
        {(Object.keys(missions) as MissionKey[]).map((key) => {
          const m = missions[key],
            state = game.missions?.[key],
            completed = state?.completedAt != null,
            claimed = state?.claimedAt != null;
          return (
            <article key={key} className={claimed ? "claimed" : ""}>
              <span className="mission-symbol">
                {claimed ? <Check size={20} /> : <Leaf size={20} />}
              </span>
              <div>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
                <strong>{money(m.reward)}</strong>
              </div>
              <button
                className="button small"
                disabled={pending || !completed || claimed}
                onClick={() => act({ type: "claim-mission", mission: key })}
              >
                {claimed
                  ? "Recolhido"
                  : completed
                    ? "Recolher"
                    : "Em andamento"}
              </button>
            </article>
          );
        })}
      </div>
      <ExpansionCard game={game} pending={pending} act={act} />
    </>
  );
}
function ExpansionCard({
  game,
  pending,
  act,
}: {
  game: Game;
  pending: boolean;
  act: Shared["act"];
}) {
  return (
    <article className="expansion-card">
      <PackageOpen size={28} />
      <span className="eyebrow">CABE MAIS CARINHO</span>
      <h3>
        {(game.level ?? 1) >= 2
          ? "Seu Terreninho cresceu!"
          : "Do Quintal ao Terreninho"}
      </h3>
      <p>
        {(game.level ?? 1) >= 2
          ? "24 × 16 células e espaço para dez Bixins."
          : "Amplie de 20 × 14 para 24 × 16 células. A capacidade cresce de seis para dez Bixins e o Cerrado fica acessível."}
      </p>
      <button
        className="button primary"
        disabled={
          pending ||
          (game.level ?? 1) >= 2 ||
          game.credits < CONFIG.expansionPrice
        }
        onClick={() => act({ type: "expand" })}
      >
        {(game.level ?? 1) >= 2
          ? "Expansão concluída"
          : "Ampliar · " + money(CONFIG.expansionPrice)}
      </button>
      <small>Os objetos e ninhos mantêm suas coordenadas.</small>
    </article>
  );
}
export function ShopPanel({ game, now, pending, act }: Shared) {
  const [category, setCategory] = useState("Todos");
  const categories = [
    "Todos",
    ...new Set(Object.values(items).map((i) => i.category)),
  ];
  const offers = shopEggs(game, now),
    eggFull = game.eggs.length + (game.expedition ? 1 : 0) >= CONFIG.maxEggs;
  return (
    <>
      <span className="eyebrow">COISINHAS PARA SEU CANTINHO</span>
      <h2>A lojinha do refúgio.</h2>
      <p>
        Saldo: {money(game.credits)} · Charme: {Math.round(charm(game))}/100
      </p>
      <h3>Ovinhos de hoje</h3>
      <p className="panel-copy">
        Ofertas mudam à meia-noite UTC. Cada ovo revela a espécie e a raridade;
        a incubação comum leva 90 minutos. Não há variante especial sorteada
        nesta etapa.
      </p>
      {eggFull && (
        <p className="notice">
          Ovoteca cheia: são dois ovos pendentes. Expedições em curso reservam
          um lugar.
        </p>
      )}
      <div className="item-grid egg-offers">
        {offers.map((s) => (
          <article className="item-card" key={s}>
            <Art src={dataUri(eggSvg(s))} />
            <strong>Ovo de {species[s].name}</strong>
            <Rarity s={s} />
            <span>{species[s].region}</span>
            <button
              className="button primary small"
              disabled={pending || eggFull || game.credits < eggPrice(s)}
              onClick={() => act({ type: "buy-egg", species: s })}
            >
              Adotar ovo · {money(eggPrice(s))}
            </button>
          </article>
        ))}
      </div>
      <h3>Objetos do refúgio</h3>
      <article className="food-supply">
        <div>
          <strong>Reserva de ração</strong>
          <p>
            {game.food} porções · cota diária gratuita de {CONFIG.freeFood}{" "}
            porções.
          </p>
        </div>
        <button
          className="button small"
          disabled={
            pending ||
            game.credits < CONFIG.foodPackPrice ||
            game.food + CONFIG.foodPackSize > CONFIG.maxFoodReserve
          }
          onClick={() => act({ type: "buy-food" })}
        >
          Repor {CONFIG.foodPackSize} · {money(CONFIG.foodPackPrice)}
        </button>
      </article>
      <div
        className="category-tabs"
        role="group"
        aria-label="Categorias da lojinha"
      >
        {categories.map((c) => (
          <button
            className={category === c ? "active" : ""}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="item-grid">
        {(Object.keys(items) as ItemKey[])
          .filter(
            (key) => category === "Todos" || items[key].category === category,
          )
          .map((key) => {
            const d = items[key];
            return (
              <article className="item-card" key={key}>
                <Art src={dataUri(itemSvg(key))} />
                <strong>{d.name}</strong>
                <span>
                  {d.width} × {d.height} ·{" "}
                  {d.capacity ? d.capacity + " Bixins" : "Decoração"}
                </span>
                <p>{d.description}</p>
                <button
                  className="button primary small"
                  disabled={pending || game.credits < d.price}
                  onClick={() => act({ type: "buy", key })}
                >
                  Comprar · {money(d.price)}
                </button>
              </article>
            );
          })}
      </div>
      <ExpansionCard game={game} pending={pending} act={act} />
      <h3>Outro refúgio, a mesma história</h3>
      <p className="panel-copy">
        Na ficha de um Bixin adulto saudável, você pode conferir e confirmar uma
        transferência responsável. O último Bixin sempre permanece com você.
      </p>
      {!!game.transfers?.length && (
        <div className="transfer-history">
          {game.transfers.map((t) => (
            <p key={t.id}>
              <strong>{t.bixin.name}</strong> · {species[t.bixin.species].name}
              <span>{money(t.price)}</span>
            </p>
          ))}
        </div>
      )}
    </>
  );
}
export function CollectionPanel({ game }: { game: Game }) {
  const [region, setRegion] = useState("all");
  return (
    <>
      <span className="eyebrow">CADA UM, UM MUNDINHO</span>
      <h2>Sua Bixinpédia.</h2>
      <p>
        {game.discoveries.length} de {Object.keys(species).length} espécies
        descobertas. Cada nascimento revela uma nova história.
      </p>
      <div
        className="category-tabs"
        role="group"
        aria-label="Regiões da coleção"
      >
        <button
          className={region === "all" ? "active" : ""}
          onClick={() => setRegion("all")}
        >
          Todas
        </button>
        {(["mata", "caatinga", "cerrado"] as const).map((r) => (
          <button
            key={r}
            className={region === r ? "active" : ""}
            onClick={() => setRegion(r)}
          >
            {regions[r].name}
          </button>
        ))}
      </div>
      <div className="collection-grid">
        {(Object.keys(species) as Species[])
          .filter((s) => region === "all" || species[s].regionKey === region)
          .map((s) => {
            const known = game.discoveries.includes(s);
            return (
              <article key={s}>
                <Art
                  className={known ? "" : "undiscovered"}
                  src={dataUri(creatureSvg(s))}
                  alt={
                    known
                      ? species[s].name
                      : "Silhueta de uma espécie desconhecida"
                  }
                />
                <span className="eyebrow">{species[s].region}</span>
                <h3>{known ? species[s].name : "Um novo mistério"}</h3>
                <p>
                  {known
                    ? species[s].description
                    : "Um dia, um ovinho vai apresentar vocês."}
                </p>
                <small>
                  {known ? (
                    <>
                      <Rarity s={s} /> · {game.discoveryCounts?.[s] ?? 1}{" "}
                      nascimento(s)
                    </>
                  ) : (
                    "Ainda não descoberto"
                  )}
                </small>
              </article>
            );
          })}
      </div>
    </>
  );
}
const pins: Record<RegionKey, { left: string; top: string }> = {
  amazonia: { left: "25%", top: "24%" },
  sertao: { left: "67%", top: "33%" },
  caatinga: { left: "77%", top: "43%" },
  cerrado: { left: "46%", top: "50%" },
  pantanal: { left: "25%", top: "59%" },
  mata: { left: "59%", top: "74%" },
  litoral: { left: "78%", top: "65%" },
};
export function ExplorationPanel({ game, now, pending, act }: Shared) {
  const [selected, setSelected] = useState<RegionKey>("mata"),
    r = regions[selected],
    e = game.expedition,
    seconds = e ? Math.max(0, Math.ceil((e.endsAt - now) / 1000)) : 0;
  return (
    <>
      <span className="eyebrow">UM BRASIL DE POSSIBILIDADES</span>
      <h2>Além da nossa cerca.</h2>
      <p>
        Expedições encontram ovos de criaturas fantásticas. O caminho continua
        mesmo quando você fecha o jogo.
      </p>
      {e && (
        <article className="journey">
          <img
            src={dataUri(regionSvg(e.region))}
            alt="Paisagem da região em exploração"
          />
          <div>
            <span className="eyebrow">
              SUA EQUIPE ESTÁ EM {regions[e.region].name.toUpperCase()}
            </span>
            <h3>
              {seconds
                ? "Um achado pode estar logo ali."
                : "Sua equipe voltou!"}
            </h3>
            <div className="incubation-progress">
              <i
                style={{
                  width:
                    Math.min(
                      100,
                      (100 * (now - e.startedAt)) / (e.endsAt - e.startedAt),
                    ) + "%",
                }}
              />
            </div>
            <p>
              {seconds
                ? "Faltam " +
                  duration(seconds) +
                  ". Seu lugar na ovoteca está reservado."
                : "Está na hora de abrir a caixinha da viagem."}
            </p>
            <button
              className="button primary"
              disabled={pending || seconds > 0}
              onClick={() => act({ type: "claim-expedition", id: e.id })}
            >
              Recolher achados
            </button>
          </div>
        </article>
      )}
      <div
        className="brazil-map"
        aria-label="Mapa estilizado das sete regiões de exploração"
      >
        <svg viewBox="0 0 400 360" aria-hidden="true">
          <path
            d="M65 35 130 18 185 35 222 25 251 47 308 49 347 91 325 130 338 154 304 177 297 224 264 252 250 290 210 327 183 337 165 303 176 267 145 242 127 218 98 209 98 171 61 155 42 116 55 87Z"
            fill="#dce6c7"
            stroke="#b0c39b"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M67 112Q167 122 206 68M127 218Q197 167 297 224M176 267Q222 220 250 290"
            fill="none"
            stroke="#c1d1ad"
            strokeWidth="2"
            strokeDasharray="5 6"
          />
          <circle cx="143" cy="108" r="24" fill="#baceaa" opacity=".65" />
          <circle cx="249" cy="154" r="18" fill="#e5d9b3" opacity=".75" />
          <path
            d="m303 179 10 10m-22 16 10 10"
            stroke="#a8c8bb"
            strokeWidth="4"
          />
        </svg>
        {(Object.keys(regions) as RegionKey[]).map((key) => (
          <button
            style={pins[key]}
            key={key}
            className={
              (selected === key ? "active " : "") +
              (!regions[key].active ? "future" : "")
            }
            onClick={() => setSelected(key)}
            aria-label={"Explorar " + regions[key].name}
          >
            <span>
              {regions[key].active ? <Compass size={15} /> : <Lock size={12} />}
            </span>
            <small>{regions[key].name}</small>
          </button>
        ))}
        <span className="map-note">Mapa artístico · regiões de exploração</span>
      </div>
      <div className="region-picker" role="group" aria-label="Escolher destino">
        {(Object.keys(regions) as RegionKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={selected === key ? "active" : ""}
          >
            {regions[key].name}
            {!regions[key].active && " · em breve"}
          </button>
        ))}
      </div>
      <article className="destination">
        <img
          src={dataUri(regionSvg(selected))}
          alt={"Paisagem ilustrada: " + r.name}
        />
        <div>
          <span className="eyebrow">
            {r.active ? "CAMINHO DE DESCOBERTAS" : "CAMINHO EM PREPARAÇÃO"}
          </span>
          <h3>{r.name}</h3>
          <p>{r.description}</p>
          {r.active ? (
            <>
              <div className="feature-facts">
                <span>{money(r.price)}</span>
                <span>{duration(r.seconds)}</span>
                <span>Nível {r.level}</span>
              </div>
              <div className="destination-species">
                {(Object.keys(species) as Species[])
                  .filter((s) => species[s].regionKey === selected)
                  .map((s) => (
                    <span key={s}>
                      <Art
                        src={dataUri(creatureSvg(s))}
                        className={
                          game.discoveries.includes(s) ? "" : "undiscovered"
                        }
                      />
                      <small>
                        {game.discoveries.includes(s) ? species[s].name : "???"}
                      </small>
                    </span>
                  ))}
              </div>
              <button
                className="button primary"
                disabled={
                  pending ||
                  !!e ||
                  game.credits < r.price ||
                  (game.level ?? 1) < r.level ||
                  game.eggs.length >= CONFIG.maxEggs
                }
                onClick={() =>
                  act({ type: "start-expedition", region: selected })
                }
              >
                {(game.level ?? 1) < r.level
                  ? "Amplie para desbloquear"
                  : e
                    ? "Uma expedição já está em curso"
                    : "Enviar expedição · " + money(r.price)}
              </button>
              <p className="fineprint">
                Chances: 61% comum, 25% incomum, 10% raro, 4% recursos sem ovo.
                Sem garantia de lucro.
              </p>
            </>
          ) : (
            <p className="notice">
              Este destino ainda não aceita expedições. Não há cobrança ou
              desbloqueio pago disponível.
            </p>
          )}
        </div>
      </article>
    </>
  );
}
export function TransferControls({
  game,
  bixin,
  now,
  pending,
  act,
  onSold,
}: {
  game: Game;
  bixin: Bixin;
  now: number;
  pending: boolean;
  act: Shared["act"];
  onSold: () => void;
}) {
  const [confirm, setConfirm] = useState(false),
    quote = saleQuote(game, bixin, now);
  return (
    <div className="transfer-controls">
      <h3>Um novo refúgio</h3>
      <p>
        {quote.allowed
          ? "Uma transferência responsável mantém a história deste Bixin guardada no diário."
          : quote.reason}
      </p>
      {confirm && quote.allowed ? (
        <div
          className="sale-confirmation"
          role="group"
          aria-label="Confirmar transferência"
        >
          <TriangleAlert size={20} />
          <p>
            Transferir <strong>{bixin.name}</strong> para outro refúgio por{" "}
            <strong>{money(quote.price)}</strong>? A transferência não pode ser
            desfeita.
          </p>
          <button
            className="button primary"
            disabled={pending}
            onClick={async () => {
              if (
                await act({
                  type: "sell",
                  id: bixin.id,
                  expectedPrice: quote.price,
                })
              )
                onSold();
              else await act({ type: "sync" });
            }}
          >
            Confirmar transferência · {money(quote.price)}
          </button>
          <button className="text-button" onClick={() => setConfirm(false)}>
            Ficar com {bixin.name}
          </button>
        </div>
      ) : (
        <button
          className="button"
          disabled={pending || !quote.allowed}
          onClick={() => setConfirm(true)}
        >
          Ver proposta · {money(quote.price)}
        </button>
      )}
    </div>
  );
}

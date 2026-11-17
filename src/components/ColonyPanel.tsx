"use client";
import { useState } from "react";
import type { Bixin, Game } from "@/game/types";
import type { Action } from "@/game/actions";
import { affinity, breedingReason, compatibility } from "@/game/colony";
import { CONFIG, species } from "@/game/config";
import { dataUri, portraitSvg } from "@/game/art";

export function FamilyCard({ game, bixin }: { game: Game; bixin: Bixin }) {
  const known = [...game.bixins, ...(game.transfers ?? []).map((t) => t.bixin)];
  const name = (id?: string) =>
    known.find((b) => b.id === id)?.name ??
    (id ? "Progenitor em outro refúgio" : "Origem silvestre");
  const relations = Object.values(game.relationships ?? {})
    .filter((r) => r.a === bixin.id || r.b === bixin.id)
    .sort((a, b) => b.affinity - a.affinity);
  const children = known.filter(
    (b) => b.parentA === bixin.id || b.parentB === bixin.id,
  );
  return (
    <section className="family-card" aria-label="Relações e linhagem">
      <h3>Laços que ficam</h3>
      <p>
        {bixin.genderLabel ?? "Identidade livre"} · Compatibilidade {bixin.role}
        . Identidade e compatibilidade são independentes.
      </p>
      <dl className="family-tree">
        <div>
          <dt>Progenitor A</dt>
          <dd>{name(bixin.parentA)}</dd>
        </div>
        <div>
          <dt>Progenitor B</dt>
          <dd>{name(bixin.parentB)}</dd>
        </div>
      </dl>
      {children.length > 0 && (
        <p>
          Filhotes: {children.map((b) => b.name).join(", ")}. A família
          permanece registrada mesmo após uma transferência.
        </p>
      )}
      <p className="genome-note">
        Pelagem {bixin.genome?.pattern ?? "liso"} · Porte{" "}
        {bixin.genome?.size ?? "médio"}
        {bixin.variant === "aurora" ? " · Variante aurora ✨" : ""}
      </p>
      {relations.length ? (
        <ul className="relationship-list">
          {relations.map((r) => {
            const other = known.find(
              (b) => b.id === (r.a === bixin.id ? r.b : r.a),
            );
            return (
              <li key={r.a + r.b}>
                {other && <img src={dataUri(portraitSvg(other))} alt="" />}
                <span>
                  <strong>{other?.name ?? "Companhia de outro refúgio"}</strong>
                  <small>
                    {r.affinity >= 30
                      ? "Amizade"
                      : r.affinity < 0
                        ? "Ainda se entendendo"
                        : "Conhecendo aos poucos"}{" "}
                    · {r.interactions} encontros
                  </small>
                </span>
                <b aria-label={`Afinidade ${r.affinity}`}>
                  {r.affinity > 0 ? "+" : ""}
                  {r.affinity}
                </b>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty-note">
          Os laços crescem em encontros e brincadeiras reais. Companhia não tem
          pressa.
        </p>
      )}
    </section>
  );
}
export default function ColonyPanel({
  game,
  now,
  pending,
  act,
}: {
  game: Game;
  now: number;
  pending: boolean;
  act: (a: Action) => Promise<boolean | undefined>;
}) {
  const [first, setFirst] = useState(game.bixins[0]?.id ?? ""),
    [second, setSecond] = useState(""),
    [nestId, setNestId] = useState("");
  const a = game.bixins.find((b) => b.id === first),
    b = game.bixins.find((b) => b.id === second);
  const nests = game.items.filter((i) => i.key === "nest" && i.placed);
  const chosenNest = nests.find((i) => i.id === nestId) ?? nests[0];
  const reason = breedingReason(game, a, b, now);
  const intention = game.nest;
  const pairingReason = intention
    ? breedingReason(
        game,
        game.bixins.find((b) => b.id === intention.a),
        game.bixins.find((b) => b.id === intention.b),
        now,
      )
    : "";
  const wait = intention?.settledAt
    ? Math.max(
        0,
        Math.ceil(
          (intention.settledAt + CONFIG.nestingSeconds * 1000 - now) / 60000,
        ),
      )
    : null;
  return (
    <>
      <span className="eyebrow">UM CANTINHO, MUITAS HISTÓRIAS</span>
      <h2>Laços da colônia.</h2>
      <p>
        Traços diferentes criam encontros, amizades e pequenas disputas pela
        bolinha. Filhotes reconhecem a família.
      </p>
      <div className="colony-portraits">
        {game.bixins.map((b) => (
          <article key={b.id}>
            <img src={dataUri(portraitSvg(b))} alt={species[b.species].name} />
            <strong>{b.name}</strong>
            <small>{b.traits.join(" · ")}</small>
          </article>
        ))}
      </div>
      {!game.bixins.length && (
        <p className="empty-note">
          Sua primeira história começa na ovoteca. Prepare o ovo de boas-vindas.
        </p>
      )}
      <section className="nest-card">
        <h3>Um ninho, no tempo deles</h3>
        <p>
          Dois adultos da mesma espécie, A + B, sem parentesco próximo. Saúde ≥
          70, necessidades ≥ 50 e afinidade ≥ 30. Cada progenitor descansa 24
          horas entre ovos.
        </p>
        {intention ? (
          <>
            <p>
              <strong>
                {game.bixins.find((b) => b.id === intention.a)?.name} e{" "}
                {game.bixins.find((b) => b.id === intention.b)?.name}
              </strong>
            </p>
            <p role="status">
              {pairingReason ||
                (wait === null
                  ? "O casal está escolhendo a hora de visitar o ninho."
                  : wait
                    ? `Aconchego no ninho · cerca de ${wait} min`
                    : "O casal está concluindo o aconchego. Sincronize para acompanhar.")}
            </p>
            <button
              className="button small"
              disabled={pending}
              onClick={() => act({ type: "sync" })}
            >
              Acompanhar o ninho
            </button>{" "}
            <button
              className="text-button"
              disabled={pending}
              onClick={() => act({ type: "cancel-breeding" })}
            >
              Cancelar preparo
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chosenNest)
                void act({
                  type: "prepare-breeding",
                  a: first,
                  b: second,
                  itemId: chosenNest.id,
                });
            }}
          >
            <div className="pair-selectors">
              <label>
                Primeiro Bixin
                <select
                  aria-label="Primeiro Bixin"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                >
                  <option value="">Escolher</option>
                  {game.bixins.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} · {species[b.species].name} · {b.role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Companhia
                <select
                  aria-label="Companhia"
                  value={second}
                  onChange={(e) => setSecond(e.target.value)}
                >
                  <option value="">Escolher</option>
                  {game.bixins
                    .filter((b) => b.id !== first)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} · {species[b.species].name} · {b.role}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {a && b && (
              <p>
                Afinidade {affinity(game, a.id, b.id)} / 100 · Sintonia de
                traços {compatibility(a, b) >= 0 ? "+" : ""}
                {compatibility(a, b)}
              </p>
            )}
            <label>
              Ninho instalado
              <select
                aria-label="Ninho instalado"
                value={chosenNest?.id ?? ""}
                onChange={(e) => setNestId(e.target.value)}
              >
                <option value="">Escolher</option>
                {nests.map((i) => (
                  <option key={i.id} value={i.id}>
                    Ninho · coluna {i.x}, linha {i.y}
                  </option>
                ))}
              </select>
            </label>
            <p className="fineprint">
              {reason ||
                (!chosenNest
                  ? "Compre o Ninho aconchegante na categoria Reprodução da lojinha e instale no terreno."
                  : "Tudo preparado para convidar o casal.")}
            </p>
            <button
              className="button primary"
              disabled={pending || !!reason || !chosenNest}
            >
              Preparar o ninho
            </button>
          </form>
        )}
        <p className="fineprint">
          O preparo é um convite. Após 10 minutos juntos no ninho, são usadas 12
          porções da reserva e chega um ovo à ovoteca. Sem espaço, recursos ou
          bem-estar, o aconchego pausa. Cancelar não consome ração.
        </p>
      </section>
      {game.bixins.map((b) => (
        <article className="colony-family" key={b.id}>
          <h3>{b.name}</h3>
          <FamilyCard game={game} bixin={b} />
        </article>
      ))}
    </>
  );
}

"use client";
import { creatureSvg, dataUri, eggSvg, itemSvg } from "@/game/art";
import { species, items, type Species, type ItemKey } from "@/game/config";
export default function ArtPage() {
  return (
    <main
      className="art-page"
      style={{ maxWidth: 1100, margin: "auto", padding: 50 }}
    >
      <a className="brand" href="/">
        bixins<span>✿</span>
      </a>
      <h1 style={{ margin: "35px 0 10px" }}>
        Pequenos, fantásticos e autorais.
      </h1>
      <p>Prancha visual · Primeira coleção · Versão 1.0</p>
      <div
        className="item-grid"
        style={{ gridTemplateColumns: "repeat(3,1fr)" }}
      >
        {(Object.keys(species) as Species[]).map((s) => (
          <article className="item-card" key={s}>
            <img
              width={180}
              height={180}
              src={dataUri(creatureSvg(s))}
              alt={species[s].name}
            />
            <h2>{species[s].name}</h2>
            <p>{species[s].description}</p>
            <img
              width={100}
              height={100}
              src={dataUri(eggSvg(s))}
              alt={`Ovo de ${species[s].name}`}
            />
            <img
              width={100}
              height={100}
              src={dataUri(creatureSvg(s, true))}
              alt={`${species[s].name} dormindo`}
            />
          </article>
        ))}
      </div>
      <div
        className="item-grid building-art-grid"
        style={{ gridTemplateColumns: "repeat(4,1fr)" }}
      >
        {(Object.keys(items) as ItemKey[]).map((k) => (
          <article className="item-card" key={k}>
            <img
              width={130}
              height={130}
              src={dataUri(itemSvg(k))}
              alt={items[k].name}
            />
            <h3>{items[k].name}</h3>
          </article>
        ))}
      </div>
      <a className="button primary" href="/">
        Voltar para meu refúgio
      </a>
    </main>
  );
}

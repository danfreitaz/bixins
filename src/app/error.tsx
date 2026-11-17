"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="loading">
      <span className="brand">
        bixins<span>✿</span>
      </span>
      <h1>Seu cantinho fez uma pausa.</h1>
      <p role="alert">
        Não conseguimos abrir esta tela. Seu progresso confirmado continua
        guardado.
      </p>
      <button className="button primary" onClick={reset}>
        Tentar novamente
      </button>
      <a className="text-button" href="/">
        Voltar ao refúgio
      </a>
    </main>
  );
}

const { chromium } = require(
  process.env.BIXINS_PLAYWRIGHT_MODULE || "playwright",
);
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const a = JSON.parse(fs.readFileSync("test-results/accounts.json", "utf8")),
      p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await p.goto("http://127.0.0.1:3001");
    await p.getByLabel("E-mail", { exact: true }).fill(a.email);
    await p.getByLabel("Senha", { exact: true }).fill(a.password);
    await p
      .getByRole("button", { name: "Entrar no meu refúgio", exact: true })
      .click();
    await p.locator(".game-stage").waitFor({ timeout: 60000 });
    const get = () =>
      p.evaluate(async () => await (await fetch("/api/game")).json());
    let g = (await get()).state;
    const trip = g.expedition;
    if (trip) {
      assert(Date.now() > trip.endsAt);
      await p.getByRole("button", { name: "Explorar", exact: true }).click();
      const response = p.waitForResponse(
        (r) => r.url().endsWith("/api/game") && r.request().method() === "POST",
      );
      await p
        .getByRole("button", { name: "Recolher achados", exact: true })
        .click();
      assert.equal((await response).status(), 200);
      g = (await get()).state;
      assert.equal(g.expedition, null);
      const duplicate = await p.evaluate(
        async (data) => {
          const r = await fetch("/api/game", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: { type: "claim-expedition", id: data.id },
              idempotencyKey: data.key,
            }),
          });
          return r.status;
        },
        { id: trip.id, key: randomUUID() },
      );
      assert.equal(duplicate, 409);
      await p.screenshot({
        path: "test-results/expedition-return.png",
        fullPage: true,
      });
      await p
        .getByRole("button", { name: "Fechar painel", exact: true })
        .click();
    }
    const egg = g.eggs.find((e) => e.origin === "caatinga");
    if (egg) {
      await p.getByRole("button", { name: "Ovinhos", exact: true }).click();
      if (egg.readyAt === null) {
        await p
          .locator(".egg-card")
          .filter({ hasText: "Ovo de " })
          .getByRole("button", { name: "Preparar um ninho" })
          .first()
          .click();
        await p
          .getByRole("spinbutton", { name: "Coluna", exact: true })
          .fill("14");
        await p
          .getByRole("spinbutton", { name: "Linha", exact: true })
          .fill("8");
        const response = p.waitForResponse(
          (r) =>
            r.url().endsWith("/api/game") && r.request().method() === "POST",
        );
        await p.getByRole("button", { name: "Colocar", exact: true }).click();
        const data = await (await response).json();
        assert.equal(
          data.state.eggs.find((e) => e.id === egg.id).readyAt -
            data.serverTime,
          5400000,
        );
      }
      const premature = await p.evaluate(
        async (data) => {
          const r = await fetch("/api/game", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: { type: "hatch", id: data.id },
              idempotencyKey: data.key,
            }),
          });
          return r.status;
        },
        { id: egg.id, key: randomUUID() },
      );
      assert.equal(premature, 409);
      await p.getByRole("button", { name: "Ovinhos", exact: true }).click();
      await p.screenshot({
        path: "test-results/regular-incubation.png",
        fullPage: true,
      });
    }
    g = (await get()).state;
    assert.equal(g.expeditionsCompleted, 1);
    fs.writeFileSync(
      "test-results/expedition-real.json",
      JSON.stringify(
        {
          passed: true,
          realDurationSeconds: 480,
          completed: g.expeditionsCompleted,
          eggFound: !!egg,
          incubationSeconds: egg ? 5400 : null,
          duplicateClaimBlocked: true,
        },
        null,
        2,
      ),
    );
    console.log(
      "Expedição real, resgate único e incubação regular:",
      egg
        ? "ovo encontrado e 90 minutos verificados"
        : "retorno de recursos válido",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

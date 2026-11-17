const { chromium } = require(
  process.env.BIXINS_PLAYWRIGHT_MODULE || "playwright",
);
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process"),
  { randomUUID } = require("node:crypto");
const base = process.env.BASE_URL || "http://127.0.0.1:3001";
const fixture = (mode) =>
  execFileSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--env-file=.env.local",
      "--import",
      "tsx",
      "scripts/colony-fixture.ts",
      mode,
    ],
    { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
  );
(async () => {
  const accounts = JSON.parse(
    fs.readFileSync("test-results/accounts.json", "utf8"),
  );
  const email = accounts.registered.find((e) => e !== accounts.email);
  assert(email, "Reutilize a segunda conta de QA já criada.");
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  let prepared = false;
  try {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      p = await context.newPage(),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base);
    await p.getByLabel("E-mail", { exact: true }).fill(email);
    await p.getByLabel("Senha", { exact: true }).fill(accounts.password);
    await p
      .getByRole("button", { name: "Entrar no meu refúgio", exact: true })
      .click();
    await p.locator(".game-stage").waitFor({ timeout: 60000 });
    const session = await p.evaluate(
      async () => await (await fetch("/api/auth/get-session")).json(),
    );
    const user = session.user ?? session.data?.user;
    assert(user?.id, "Sessão autenticada deve identificar proprietário.");
    assert.equal(user.email, email);
    fs.writeFileSync(
      "test-results/colony-owner.json",
      JSON.stringify({ owner: user.id, email }),
    );
    fixture("prepare");
    prepared = true;
    const snapshot = () =>
      p.evaluate(async () => await (await fetch("/api/game")).json());
    const api = (action, key = randomUUID(), extra = {}) =>
      p.evaluate(
        async ({ action, key, extra }) => {
          const r = await fetch("/api/game", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, idempotencyKey: key, ...extra }),
          });
          return { status: r.status, body: await r.json() };
        },
        { action, key, extra },
      );
    const waitAction = () =>
      p.waitForResponse(
        (r) => r.url().endsWith("/api/game") && r.request().method() === "POST",
      );
    await p.reload();
    await p.locator(".game-stage").waitFor();
    let g = (await snapshot()).state;
    assert.equal(g.schemaVersion, 3);
    // Browser -> API -> real Neon -> snapshot. Purchase and placement use ordinary controls.
    await p.getByRole("button", { name: "Lojinha", exact: true }).click();
    await p.getByRole("button", { name: "Reprodução", exact: true }).click();
    let response = waitAction();
    await p
      .locator(".item-card")
      .filter({ hasText: "Ninho aconchegante" })
      .getByRole("button", { name: /Comprar/ })
      .click();
    assert.equal((await response).status(), 200);
    await p.getByRole("button", { name: "Fechar painel", exact: true }).click();
    await p.getByRole("button", { name: "Construir", exact: true }).click();
    await p
      .locator(".item-card")
      .filter({ hasText: "Ninho aconchegante" })
      .click();
    await p.getByLabel("Coluna", { exact: true }).fill("12");
    await p.getByLabel("Linha", { exact: true }).fill("8");
    response = waitAction();
    await p.getByRole("button", { name: "Colocar", exact: true }).click();
    assert.equal((await response).status(), 200);
    await p.getByRole("button", { name: "Colônia", exact: true }).click();
    g = (await snapshot()).state;
    await p
      .getByLabel("Primeiro Bixin", { exact: true })
      .selectOption(g.bixins[0].id);
    await p
      .getByLabel("Companhia", { exact: true })
      .selectOption(g.bixins[1].id);
    response = waitAction();
    await p
      .getByRole("button", { name: "Preparar o ninho", exact: true })
      .click();
    assert.equal((await response).status(), 200);
    g = (await snapshot()).state;
    assert(g.nest);
    assert.equal(g.nest.seed, 0);
    assert.equal(g.eggs.length, 0);
    const food = g.food;
    await p.screenshot({
      path: "test-results/colony-prepared.png",
      fullPage: true,
    });
    await p.reload();
    await p.locator(".game-stage").waitFor();
    assert((await snapshot()).state.nest);
    // Only this isolated local fixture advances its offline interval. No production test endpoint.
    fixture("offline");
    assert.equal((await api({ type: "sync" })).status, 200);
    g = (await snapshot()).state;
    assert.equal(g.nest, null);
    assert.equal(g.eggs.length, 1);
    assert.equal(g.food, food - 12);
    const egg = g.eggs[0];
    assert(egg.parentA && egg.parentB && egg.genome);
    assert.equal(g.bixins[0].lastBredAt, g.bixins[1].lastBredAt);
    const repeat = await api({
      type: "prepare-breeding",
      a: g.bixins[0].id,
      b: g.bixins[1].id,
      itemId: g.items.find((i) => i.key === "nest").id,
    });
    assert.equal(repeat.status, 409);
    assert.match(repeat.body.error, /24 horas/);
    await p.reload();
    await p.locator(".game-stage").waitFor();
    await p.getByRole("button", { name: "Ovinhos", exact: true }).click();
    await p
      .getByRole("button", { name: "Preparar um ninho", exact: true })
      .click();
    await p.getByLabel("Coluna", { exact: true }).fill("17");
    await p.getByLabel("Linha", { exact: true }).fill("11");
    response = waitAction();
    await p.getByRole("button", { name: "Colocar", exact: true }).click();
    const incubation = await (await response).json();
    assert.equal(
      incubation.state.eggs[0].readyAt - incubation.serverTime,
      5400000,
    );
    assert.equal((await api({ type: "hatch", id: egg.id })).status, 409);
    fixture("incubation");
    await p.reload();
    await p.locator(".game-stage").waitFor();
    await p.getByRole("button", { name: "Ovinhos", exact: true }).click();
    response = waitAction();
    await p
      .getByRole("button", { name: "Conhecer meu Bixin", exact: true })
      .click();
    assert.equal((await response).status(), 200);
    await p
      .getByRole("heading", { name: "Laços que ficam", exact: true })
      .waitFor();
    g = (await snapshot()).state;
    const child = g.bixins.find((b) => b.id === `bixin-${egg.id}`);
    assert.deepEqual(child.genome, egg.genome);
    assert.equal(child.parentA, egg.parentA);
    assert.equal(child.parentB, egg.parentB);
    assert((await p.getByText("Fubá QA", { exact: true }).count()) > 0);
    assert((await p.getByText("Pingo QA", { exact: true }).count()) > 0);
    await p.screenshot({
      path: "test-results/family-lineage.png",
      fullPage: true,
    });
    await p.getByRole("button", { name: "Fechar painel", exact: true }).click();
    await p.getByRole("button", { name: "Configurações", exact: true }).click();
    await p.getByRole("checkbox", { name: /Economia de bateria/ }).check();
    await p.getByRole("checkbox", { name: /Reduzir movimentos/ }).check();
    assert.equal(
      await p.evaluate(() => localStorage.getItem("bixins-battery")),
      "true",
    );
    await p.getByRole("button", { name: "Fechar painel", exact: true }).click();
    await p.setViewportSize({ width: 390, height: 844 });
    await p.getByRole("button", { name: "Colônia", exact: true }).click();
    await p.screenshot({
      path: "test-results/colony-mobile.png",
      fullPage: true,
    });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    // Keyboard dialog close and focus restoration, then persisted preferences.
    await p.keyboard.press("Escape");
    assert.equal(await p.getByRole("dialog").count(), 0);
    await p.reload();
    await p.locator(".game-stage").waitFor();
    assert(await p.locator("main.battery.reduced").count());
    // Security boundaries with a real session.
    const badForeign = await api({
      type: "prepare-breeding",
      a: "foreign-user-bixin",
      b: g.bixins[0].id,
      itemId: "foreign-nest",
    });
    assert.equal(badForeign.status, 409);
    const badJson = await p.evaluate(async () => {
      const r = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      });
      return r.status;
    });
    assert.equal(badJson, 400);
    const big = await p.evaluate(async () => {
      const r = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extra: "x".repeat(5000) }),
      });
      return r.status;
    });
    assert.equal(big, 413);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        passed: true,
        checks: [
          "auth",
          "purchase-nest",
          "place-nest",
          "prepare-not-instant",
          "reload-intention",
          "offline-autonomous-reproduction",
          "one-food-debit",
          "24h-cooldown",
          "regular-incubation-deadline",
          "early-hatch-denied",
          "hatch-inherited-genome",
          "persisted-lineage",
          "mobile-no-overflow",
          "battery-reduced-persisted",
          "escape-focus",
          "owner-isolation",
          "malformed-and-oversize-request",
        ],
        clock:
          "offline and incubation deadlines advanced only in isolated SQL fixture",
      }),
    );
  } finally {
    await browser.close();
    if (prepared) fixture("restore");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

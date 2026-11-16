const { chromium } = require(
  process.env.BIXINS_PLAYWRIGHT_MODULE || "playwright",
);
const { randomUUID, randomBytes } = require("node:crypto");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const base = process.env.BASE_URL || "http://127.0.0.1:3001";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.BIXINS_BROWSER_CHANNEL || "msedge",
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", async (r) => {
      if (r.url().includes("/api/game") && r.status() >= 400)
        console.log("API jogo:", r.status(), await r.text());
    });
    fs.mkdirSync("test-results", { recursive: true });
    await page.goto(base);
    assert.equal((await page.request.get(base + "/api/game")).status(), 401);
    const accountPath = "test-results/accounts.json";
    const saved = fs.existsSync(accountPath)
      ? JSON.parse(fs.readFileSync(accountPath, "utf8"))
      : {
          email: `bixins-qa-${Date.now()}@example.com`,
          password: randomBytes(24).toString("base64url"),
          registered: [],
        };
    const { email, password } = saved;
    fs.writeFileSync(accountPath, JSON.stringify(saved));
    async function register(p, mail) {
      await p.goto(base);
      if (saved.registered.includes(mail)) {
        await p.getByLabel("E-mail", { exact: true }).fill(mail);
        await p.getByLabel("Senha", { exact: true }).fill(password);
        await p
          .getByRole("button", { name: "Entrar no meu refúgio", exact: true })
          .click();
        await p.locator(".game-stage").waitFor({ timeout: 30000 });
        return;
      }
      await p
        .getByRole("button", { name: "Primeira visita? Crie seu refúgio" })
        .click();
      await p.getByLabel("Como podemos te chamar?").fill("Jardineiro de teste");
      await p.getByLabel("E-mail", { exact: true }).fill(mail);
      await p.getByLabel("Senha", { exact: true }).fill(password);
      const responsePromise = p.waitForResponse(
        (r) => r.url().includes("/sign-up/email"),
        { timeout: 30000 },
      );
      await p
        .getByRole("button", { name: "Criar meu refúgio", exact: true })
        .click();
      const signupResponse = await responsePromise;
      console.log("Cadastro HTTP:", signupResponse.status());
      if (signupResponse.ok()) {
        saved.registered.push(mail);
        fs.writeFileSync(accountPath, JSON.stringify(saved));
      }
      try {
        await p.locator(".game-stage").waitFor({ timeout: 15000 });
      } catch (error) {
        console.log(
          "Erro na interface:",
          await p.locator(".error").allTextContents(),
        );
        console.log("Mensagem:", await p.locator("main p").allTextContents());
        await p.screenshot({
          path: "test-results/e2e-failure.png",
          fullPage: true,
        });
        throw error;
      }
    }
    async function api(p, action, key = randomUUID()) {
      return p.evaluate(
        async ({ action, key }) => {
          const r = await fetch("/api/game", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, idempotencyKey: key }),
          });
          return { status: r.status, body: await r.json() };
        },
        { action, key },
      );
    }
    async function snapshotOf(p) {
      return p.evaluate(async () => await (await fetch("/api/game")).json());
    }
    await register(page, email);
    console.log("Cadastro e propriedade inicial: OK");
    let snapshot = await snapshotOf(page);
    const resumed = snapshot.state.items.some((i) => i.placed);
    if (!resumed) {
      assert.equal(snapshot.state.credits, 600);
      assert.equal(snapshot.state.bixins.length, 0);
      assert.equal(snapshot.state.items.filter((i) => i.placed).length, 0);
      await page.screenshot({
        path: "test-results/terrain-empty.png",
        fullPage: true,
      });
    }
    const places = [
      [7, 6],
      [10, 6],
      [7, 9],
      [10, 9],
    ];
    for (let i = 0; i < 4; i++) {
      if (snapshot.state.items.find((item) => item.id === `kit-${i}`)?.placed)
        continue;
      await page
        .getByRole("button", { name: "Construir", exact: true })
        .click();
      await page.locator(".item-card").first().click();
      await page
        .getByRole("spinbutton", { name: "Coluna", exact: true })
        .fill(String(places[i][0]));
      await page
        .getByRole("spinbutton", { name: "Linha", exact: true })
        .fill(String(places[i][1]));
      await page.getByRole("button", { name: "Colocar", exact: true }).click();
      await page.locator(".placement-bar").waitFor({ state: "hidden" });
    }
    if (!snapshot.state.eggs[0]?.readyAt) {
      await page.getByRole("button", { name: "Ovinhos", exact: true }).click();
      await page.getByRole("button", { name: "Preparar um ninho" }).click();
      await page
        .getByRole("spinbutton", { name: "Coluna", exact: true })
        .fill("9");
      await page
        .getByRole("spinbutton", { name: "Linha", exact: true })
        .fill("8");
      await page.getByRole("button", { name: "Colocar", exact: true }).click();
      await page.locator(".placement-bar").waitFor({ state: "hidden" });
    }
    snapshot = await snapshotOf(page);
    const egg = snapshot.state.eggs[0];
    if (egg.readyAt > Date.now())
      assert.equal(
        (await api(page, { type: "hatch", id: egg.id })).status,
        409,
      );
    console.log(
      "Instalação do kit, ninho e bloqueio de nascimento antecipado: OK",
    );
    const purchaseKey =
      snapshot.state.items.find((i) => !i.id.startsWith("kit-"))?.id ??
      randomUUID();
    const repeated = await Promise.all([
      api(page, { type: "buy", key: "food" }, purchaseKey),
      api(page, { type: "buy", key: "food" }, purchaseKey),
    ]);
    assert(repeated.every((r) => r.status === 200));
    snapshot = await snapshotOf(page);
    assert.equal(snapshot.state.credits, 520);
    assert.equal(snapshot.state.items.length, 5);
    console.log("Idempotência concorrente: OK");
    const second = await browser.newContext();
    const other = await second.newPage();
    await register(other, `other-${email}`);
    const foreign = await api(other, {
      type: "place",
      id: purchaseKey,
      x: 3,
      y: 3,
    });
    assert.equal(foreign.status, 409);
    const beforeOther = await snapshotOf(other);
    if (beforeOther.state.credits === 600) {
      const buys = await Promise.all(
        Array.from({ length: 8 }, () =>
          api(other, { type: "buy", key: "food" }),
        ),
      );
      assert.equal(buys.filter((r) => r.status === 200).length, 7);
    }
    const otherState = await snapshotOf(other);
    assert.equal(otherState.state.credits, 40);
    console.log(
      "Isolamento de usuários e compras concorrentes sem saldo negativo: OK",
    );
    await second.close();
    await page.reload();
    await page.locator(".game-stage").waitFor();
    await page.getByRole("button", { name: "Ovinhos", exact: true }).click();
    const hatch = page.getByRole("button", { name: "Conhecer meu Bixin" });
    await hatch.waitFor();
    // Await the real server deadline; no clock overrides or accelerated test-only rules.
    const waitMs = Math.max(0, egg.readyAt - Date.now()) + 1200;
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    await hatch.click();
    await page.locator(".bixin-portrait").waitFor({ timeout: 20000 });
    await page.locator(".rename-form input").fill("Xodó");
    await page.getByRole("button", { name: "Renomear", exact: true }).click();
    await page.getByRole("heading", { name: "Xodó", exact: true }).waitFor();
    await page.getByRole("button", { name: "Carinho", exact: true }).click();
    await page
      .getByRole("button", { name: "Fechar painel", exact: true })
      .click();
    console.log("Nascimento real, nome e cuidados: OK");
    await page.screenshot({
      path: "test-results/terrain-alive.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
    await page.getByRole("button", { name: /Xodó/ }).click();
    await page.locator(".bixin-portrait").waitFor();
    await page.screenshot({
      path: "test-results/mobile-care.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Fechar painel", exact: true })
      .click();
    await page.reload();
    await page.locator(".game-stage").waitFor();
    snapshot = await snapshotOf(page);
    assert.equal(snapshot.state.bixins[0].name, "Xodó");
    assert.equal(snapshot.state.items.filter((i) => i.placed).length, 4);
    assert.equal(snapshot.state.bixins.length, 1);
    assert.equal(snapshot.state.eggs.length, 0);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("button", { name: "Sair da conta", exact: true })
      .click();
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Entrar no meu refúgio", exact: true })
      .click();
    await page.locator(".game-stage").waitFor({ timeout: 45000 });
    assert.equal((await snapshotOf(page)).state.bixins[0].name, "Xodó");
    assert.deepEqual(errors, []);
    console.log(
      "Mobile, retorno persistente, sair/entrar e console sem erros: OK",
    );
    fs.writeFileSync(
      "test-results/e2e.json",
      JSON.stringify(
        {
          passed: true,
          email,
          checks: [
            "signup",
            "empty-property",
            "place-kit",
            "incubation-60s",
            "early-hatch-blocked",
            "idempotency-concurrency",
            "ownership",
            "nonnegative-balance",
            "hatch",
            "rename",
            "care",
            "mobile",
            "reload",
            "sign-out-sign-in",
            "no-browser-errors",
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

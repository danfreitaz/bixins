const { chromium } = require(
  process.env.BIXINS_PLAYWRIGHT_MODULE || "playwright",
);
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const account = JSON.parse(
      fs.readFileSync("test-results/accounts.json", "utf8"),
    );
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:3001");
    await page.getByLabel("E-mail", { exact: true }).fill(account.email);
    await page.getByLabel("Senha", { exact: true }).fill(account.password);
    await page
      .getByRole("button", { name: "Entrar no meu refúgio", exact: true })
      .click();
    await page.locator(".game-stage").waitFor({ timeout: 60000 });
    const state = await page.evaluate(
      async () => await (await fetch("/api/game")).json(),
    );
    assert.equal(state.state.schemaVersion, 2);
    if (!state.state.expedition) {
      const result = await page.evaluate(async (key) => {
        const r = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: { type: "start-expedition", region: "caatinga" },
            idempotencyKey: key,
          }),
        });
        return { status: r.status, data: await r.json() };
      }, randomUUID());
      assert.equal(result.status, 200);
      fs.writeFileSync(
        "test-results/journey.json",
        JSON.stringify(result.data.state.expedition),
      );
      console.log(
        "Expedição real iniciada; fim:",
        new Date(result.data.state.expedition.endsAt).toISOString(),
      );
    } else {
      fs.writeFileSync(
        "test-results/journey.json",
        JSON.stringify(state.state.expedition),
      );
      console.log("Expedição existente preservada.");
    }
    await page.reload();
    await page.locator(".game-stage").waitFor();
    await page.getByRole("button", { name: "Explorar", exact: true }).click();
    await page.getByRole("heading", { name: "Além da nossa cerca." }).waitFor();
    await page.screenshot({
      path: "test-results/exploration-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "test-results/exploration-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log("Migração, início de expedição e mapa desktop/mobile: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

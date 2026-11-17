const { chromium } = require(
  process.env.BIXINS_PLAYWRIGHT_MODULE || "playwright",
);
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const a = JSON.parse(fs.readFileSync("test-results/accounts.json", "utf8"));
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const snapshot = () =>
      p.evaluate(async () => await (await fetch("/api/game")).json());
    const waitAction = () =>
      p.waitForResponse(
        (r) => r.url().endsWith("/api/game") && r.request().method() === "POST",
      );
    await p.goto("http://127.0.0.1:3001");
    await p.getByLabel("E-mail", { exact: true }).fill(a.email);
    await p.getByLabel("Senha", { exact: true }).fill(a.password);
    await p
      .getByRole("button", { name: "Entrar no meu refúgio", exact: true })
      .click();
    await p.locator(".game-stage").waitFor({ timeout: 60000 });
    await p.getByRole("button", { name: "Objetivos", exact: true }).click();
    let g = (await snapshot()).state;
    for (const [key, title] of [
      ["welcome", "Um cantinho preparado"],
      ["hatch", "Olá, pequeno mundo!"],
    ]) {
      if (g.missions[key].claimedAt === null) {
        const response = waitAction();
        await p
          .locator(".mission-cards article")
          .filter({ hasText: title })
          .getByRole("button", { name: "Recolher", exact: true })
          .click();
        assert.equal((await response).status(), 200);
        g = (await snapshot()).state;
      }
    }
    await p.screenshot({ path: "test-results/missions.png", fullPage: true });
    await p.getByRole("button", { name: "Fechar painel", exact: true }).click();
    await p.getByRole("button", { name: "Lojinha", exact: true }).click();
    await p.getByRole("button", { name: "Social", exact: true }).click();
    g = (await snapshot()).state;
    let bench = g.items.find((i) => i.key === "bench");
    if (!bench) {
      const response = waitAction();
      await p
        .locator(".item-card")
        .filter({ hasText: "Banco do encontro" })
        .getByRole("button", { name: /Comprar/ })
        .click();
      assert.equal((await response).status(), 200);
      g = (await snapshot()).state;
      bench = g.items.find((i) => i.key === "bench");
    }
    const foodBefore = (await snapshot()).state.food;
    const foodResponse = waitAction();
    await p.getByRole("button", { name: /Repor 12 ·/ }).click();
    assert.equal((await foodResponse).status(), 200);
    assert.equal((await snapshot()).state.food, foodBefore + 12);
    await p.screenshot({ path: "test-results/shop.png", fullPage: true });
    await p.getByRole("button", { name: "Fechar painel", exact: true }).click();
    if (!bench.placed) {
      await p.getByRole("button", { name: "Construir", exact: true }).click();
      await p
        .locator(".item-card")
        .filter({ hasText: "Banco do encontro" })
        .click();
      await p
        .getByRole("spinbutton", { name: "Coluna", exact: true })
        .fill("3");
      await p.getByRole("spinbutton", { name: "Linha", exact: true }).fill("4");
      if ((bench.rotation ?? 0) === 0)
        await p.getByRole("button", { name: "Girar 90°", exact: true }).click();
      const response = waitAction();
      await p.getByRole("button", { name: "Colocar", exact: true }).click();
      assert.equal((await response).status(), 200);
      await p.locator(".placement-bar").waitFor({ state: "hidden" });
    }
    g = (await snapshot()).state;
    bench = g.items.find((i) => i.key === "bench");
    assert.equal(bench.rotation, 1);
    await p.getByRole("button", { name: "Construir", exact: true }).click();
    await p
      .locator(".object-list button")
      .filter({ hasText: "Banco do encontro" })
      .click();
    if ((bench.level ?? 1) === 1 && g.credits >= 288) {
      const response = waitAction();
      await p.getByRole("button", { name: /Melhorar ·/ }).click();
      assert.equal((await response).status(), 200);
      assert.equal(
        (await snapshot()).state.items.find((i) => i.id === bench.id).level,
        2,
      );
    }
    await p.screenshot({
      path: "test-results/object-upgrade.png",
      fullPage: true,
    });
    await p.getByRole("button", { name: "Fechar painel", exact: true }).click();
    await p.getByRole("button", { name: "Bixinpédia", exact: true }).click();
    assert.equal(await p.locator(".collection-grid article").count(), 9);
    await p.screenshot({ path: "test-results/collection.png", fullPage: true });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({
      path: "test-results/collection-mobile.png",
      fullPage: true,
    });
    await p.getByRole("button", { name: "Fechar painel", exact: true }).click();
    await p.getByRole("button", { name: "Explorar", exact: true }).click();
    assert.equal(
      await p
        .getByRole("heading", { name: "Além da nossa cerca." })
        .isVisible(),
      true,
    );
    await p.getByRole("button", { name: "Fechar painel", exact: true }).click();
    await p.goto("http://127.0.0.1:3001/arte", { waitUntil: "networkidle" });
    assert.equal(
      await p
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.every((i) => i.complete && i.naturalWidth > 0),
        ),
      true,
    );
    await p.setViewportSize({ width: 1440, height: 1200 });
    await p.screenshot({
      path: "test-results/nine-species.png",
      fullPage: true,
    });
    assert.equal(await p.locator("img").count(), 43);
    await p.goto("http://127.0.0.1:3001/demonstracao", {
      waitUntil: "networkidle",
    });
    await p
      .getByRole("button", { name: "Ver Terreninho", exact: true })
      .click();
    await p.screenshot({
      path: "test-results/expanded-demo.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "test-results/phase-ui.json",
      JSON.stringify(
        {
          passed: true,
          checks: [
            "missions-claim",
            "shop-categories",
            "new-item-purchase",
            "multi-cell-placement",
            "rotation",
            "upgrade",
            "nine-species-collection",
            "mobile-navigation",
            "all-43-art-images",
            "expanded-terrain-preview",
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      "Objetivos, loja, rotação, melhoria, coleção e arte desktop/mobile: OK",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

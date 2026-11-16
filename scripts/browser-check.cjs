const { chromium } = require(
  process.env.BIXINS_PLAYWRIGHT_MODULE || "playwright",
);
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    fs.mkdirSync("test-results", { recursive: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.BASE_URL || "http://127.0.0.1:3001";
    await page.goto(base, {
      waitUntil: "networkidle",
    });
    await page.screenshot({ path: "test-results/welcome.png", fullPage: true });
    assert.equal((await page.request.get(base + "/api/game")).status(), 401);
    await page
      .getByRole("button", { name: "Primeira visita? Crie seu refúgio" })
      .click();
    assert.equal(
      await page.getByLabel("Como podemos te chamar?").isVisible(),
      true,
    );
    await page.goto(base + "/arte", { waitUntil: "networkidle" });
    await page.screenshot({
      path: "test-results/art-sheet.png",
      fullPage: true,
    });
    assert.equal(
      await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.every((i) => i.complete && i.naturalWidth > 0),
        ),
      true,
    );
    await page.goto(base + "/demonstracao", { waitUntil: "networkidle" });
    await page.locator("canvas").waitFor();
    await page.screenshot({
      path: "test-results/demo-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "test-results/demo-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        title: await page.title(),
        headings: await page.locator("h1").allTextContents(),
        errors,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

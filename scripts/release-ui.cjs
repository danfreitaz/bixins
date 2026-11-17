const{chromium}=require(process.env.BIXINS_PLAYWRIGHT_MODULE||"playwright");
const assert=require("node:assert/strict");
(async()=>{const browser=await chromium.launch({headless:true,channel:"msedge"});try{
const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on("pageerror",e=>errors.push(e.message));const base=process.env.BASE_URL||"http://127.0.0.1:3001";
const response=await p.goto(base);assert.equal(response.headers()["x-content-type-options"],"nosniff");assert(response.headers()["content-security-policy"].includes("object-src 'none'"));
const api=await p.request.get(base+"/api/game");assert.equal(api.status(),401);assert(api.headers()["cache-control"].includes("no-store"));
await p.goto(base+"/arte");await p.waitForLoadState("networkidle");assert.equal(await p.locator("img").count(),44);assert(await p.locator("img").evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
await p.goto(base+"/demonstracao");await p.locator("canvas").waitFor();await p.getByLabel("Ambiente da demonstração").selectOption("day");await p.waitForTimeout(120);await p.screenshot({path:"test-results/release-day.png",fullPage:true});assert(await p.locator(".world-label").textContent().then(t=>t.includes("Tarde")));
await p.getByLabel("Ambiente da demonstração").selectOption("night");await p.waitForTimeout(120);await p.screenshot({path:"test-results/release-night.png",fullPage:true});assert(await p.locator(".world-label").textContent().then(t=>t.includes("Noite")));
await p.getByLabel("Ambiente da demonstração").selectOption("rain");await p.waitForTimeout(120);await p.screenshot({path:"test-results/release-rain.png",fullPage:true});assert(await p.locator(".world-label").textContent().then(t=>t.includes("Chuvinha")));
for(const width of[360,390,768]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
const missing=await p.goto(base+"/caminho-que-nao-existe");assert.equal(missing.status(),404);assert(await p.getByRole("link",{name:"Voltar ao meu cantinho"}).count());assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:true,checks:["security-headers","unauthenticated-api-no-cache","44-images","day-night-rain","360-390-768-responsive","friendly-404","no-JavaScript-errors"]}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

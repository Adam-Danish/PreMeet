// Run against a local production server: node scripts/ui-smoke.mjs [base URL].
// Uses the repo's browser inspector; API fixtures never reach the real backend.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Browser, sleep } from "../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const base = process.argv[2] || "http://127.0.0.1:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a local preview server.");
const output = fileURLToPath(new URL("../../.taste-skill/flows/", import.meta.url));
mkdirSync(output, { recursive: true });
const profiles = JSON.parse(readFileSync(new URL("../../data/profiles.json", import.meta.url), "utf8"));
const plan = profiles.slice(0, 5).map((person, index) => ({ ...person, rank: index + 1, why: person.looking_for, opener: `I would love to hear more about ${person.org}. What are you working on next?` }));
const browser = await Browser.launch();
const page = await browser.newPage();
const checks = [];
async function check(name, condition) { assert(condition, name); checks.push(name); }
async function waitFor(predicate) {
  for (let i = 0; i < 80; i++) { if (await page.eval(predicate)) return; await sleep(100); }
  throw new Error(`Timed out: ${predicate}`);
}
async function click(text, selector = "button") {
  const found = await page.eval(({ text, selector }) => {
    const el = [...document.querySelectorAll(selector)].find((node) => node.textContent.trim() === text && !node.disabled);
    if (!el) return false;
    el.click(); return true;
  }, { text, selector });
  assert(found, `Control exists: ${text}`);
  await sleep(150);
}
async function input(selector, value) {
  await page.eval(({ selector, value }) => {
    const el = document.querySelector(selector);
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, { selector, value });
  await sleep(100);
}
async function screenshot(name) { await page.screenshot({ path: `${output}${name}.png`, format: "png", fullPage: true }); }
async function fits() { return page.eval(() => document.documentElement.scrollWidth <= innerWidth); }

try {
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__ui = { failPlan: false, failSave: false, failDashboard: false, outcomes: {}, requests: [] };
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, options = {}) => {
      const path = new URL(typeof url === 'string' ? url : url.url, location.href).pathname;
      if (!path.startsWith('/api/')) return originalFetch(url, options);
      window.__ui.requests.push({ path, body: options.body && JSON.parse(options.body) });
      await new Promise(resolve => setTimeout(resolve, 450));
      let data;
      if (path === '/api/plan') {
        if (window.__ui.failPlan) return new Response('{}', { status: 503 });
        data = ${JSON.stringify(plan)};
      } else if (path === '/api/outcomes' && options.method === 'POST') {
        if (window.__ui.failSave) return new Response('{}', { status: 503 });
        const body = JSON.parse(options.body); window.__ui.outcomes[body.id] = body.stage; data = { ok: true };
      } else if (path === '/api/outcomes') data = window.__ui.outcomes;
      else if (path === '/api/dashboard') {
        if (window.__ui.failDashboard) return new Response('{}', { status: 503 });
        data = { contacts: 5, meetings: 1, pilots: 0, deals: 0 };
      } else return new Response('{}', { status: 404 });
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    };
  ` });
  await page.goto(base);
  await check("Desktop has no horizontal overflow", await fits());
  await input("#name", "");
  await input("#needs", "");
  await page.eval(() => document.querySelectorAll(".choice input:checked").forEach((el) => el.click()));
  await click("Build my game plan");
  await check("Invalid submission focuses a summary with four field links", await page.eval(() => document.activeElement.getAttribute("role") === "alert" && document.activeElement.querySelectorAll("a").length === 4));
  await check("Invalid submission never calls the API", await page.eval(() => window.__ui.requests.length === 0));
  await screenshot("validation");
  await input("#name", "Aina");
  await input("#needs", "Plantation pilots and seed funding");
  await page.eval(() => { document.querySelectorAll(".choice input")[0].click(); document.querySelectorAll(".choice input")[7].click(); });
  await click("Build my game plan");
  await check("Generation exposes a disabled loading control", await page.eval(() => document.querySelector(".generate-button").disabled && !!document.querySelector(".loading-recommendations[role=status]")));
  await waitFor(() => document.querySelectorAll(".person-card").length === 5);
  await check("Plan keeps the original API contract", await page.eval(() => { const body = window.__ui.requests[0].body; return body.name === "Aina" && body.target_countries[0] === "Indonesia" && body.wants[0] === "investor"; }));
  await screenshot("plan-desktop");
  await page.eval(() => { window.__ui.failPlan = true; });
  await click("Regenerate my game plan");
  await waitFor(() => !!document.querySelector(".profile-form [role=alert]"));
  await check("Failed regeneration retains the existing five contacts", await page.eval(() => document.querySelectorAll(".person-card").length === 5));
  await click("Outcome log");
  await waitFor(() => !!document.querySelector(".outcome-button:not(:disabled)"));
  await click("Meeting", ".outcome-button");
  await waitFor(() => document.querySelector(".saved-state")?.textContent === "Saved: Meeting");
  await check("Outcome save sends the original id and stage contract", await page.eval(() => window.__ui.outcomes.p01 === "meeting"));
  await page.eval(() => { window.__ui.failSave = true; });
  await click("Pilot", ".outcome-button");
  await waitFor(() => !!document.querySelector(".outcome-panel [role=alert]"));
  await check("Failed save preserves the previously confirmed stage", await page.eval(() => document.querySelector('.outcome-actions button[aria-pressed="true"]')?.textContent === "Meeting"));
  await screenshot("outcomes");
  await click("Dashboard");
  await waitFor(() => document.querySelectorAll(".metric-card").length === 4);
  await check("Dashboard displays real response values including zeros", await page.eval(() => [...document.querySelectorAll(".metric-card strong")].map((el) => el.textContent).join() === "5,1,0,0"));
  await screenshot("dashboard");
  await page.eval(() => { window.__ui.failDashboard = true; });
  await click("Refresh dashboard");
  await waitFor(() => !!document.querySelector(".main > section > [role=alert]"));
  await check("Dashboard failure provides a retry", await page.eval(() => [...document.querySelectorAll("button")].some((el) => el.textContent.trim() === "Try again")));
  await page.eval(() => { window.__ui.failDashboard = false; });
  await click("Try again");
  await waitFor(() => document.querySelectorAll(".metric-card").length === 4);
  await page.goto(`${base}/events`);
  await waitFor(() => document.querySelectorAll("article").length === 2);
  await check("Events disclose sample data", await page.eval(() => document.body.textContent.includes("These are sample events")));
  await screenshot("events-desktop");
  await input('input[type="search"]', "no-such-event");
  await check("Empty search offers a clear recovery", await page.eval(() => document.body.textContent.includes("No events found.")));
  await click("Clear search");
  await waitFor(() => document.querySelectorAll("article").length === 2);
  await click("View details");
  await waitFor(() => document.querySelectorAll("dl dd").length === 6);
  await check("Event details receive keyboard focus", await page.eval(() => document.activeElement.tagName === "H2"));
  await screenshot("event-details");
  await click("Back to events");
  await check("Back returns focus to the selected event", await page.eval(() => document.activeElement.id === "event-demo-hack-day"));
  await click("History");
  await check("History retains all four outcome counts", await page.eval(() => document.body.textContent.includes("Startup Mixer") && document.querySelectorAll("article strong").length === 4));
  await screenshot("history");
  await click("Event details", "article button");
  await click("Back to history");
  await check("History detail returns to history", await page.eval(() => !!document.querySelector("#history-heading")));
  for (const [width, height] of [[768, 1024], [375, 812], [812, 375]]) {
    await page.setViewport({ width, height });
    await page.goto(`${base}/events`);
    await waitFor(() => document.querySelectorAll("article").length === 2);
    await check(`Events fit ${width}×${height}`, await fits());
    await screenshot(`events-${width}`);
    await page.goto(base);
    await check(`Game plan fits ${width}×${height}`, await fits());
    await click("Open navigation", 'button[aria-label="Open navigation"]');
    await check(`Menu opens at ${width}px`, await page.eval(() => document.querySelector('[aria-controls="workspace-navigation"]').getAttribute("aria-expanded") === "true"));
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await check(`Escape closes menu and restores focus at ${width}px`, await page.eval(() => document.activeElement.getAttribute("aria-label") === "Open navigation" && document.activeElement.getAttribute("aria-expanded") === "false"));
    await screenshot(`home-${width}`);
  }
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await click("Build my game plan");
  await check("Reduced motion removes the loading animation", await page.eval(() => getComputedStyle(document.querySelector(".spin")).animationName === "none"));
  await waitFor(() => document.querySelectorAll(".person-card").length === 5);
  await check("No uncaught browser errors", page.consoleErrors.length === 0);
  console.log(`PASS: ${checks.length} browser checks\n${checks.map((name) => `  ✓ ${name}`).join("\n")}\nScreenshots: ${output}`);
} finally { await browser.close(); }

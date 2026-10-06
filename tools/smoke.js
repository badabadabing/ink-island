#!/usr/bin/env node
/* Headless smoke test: boots INK ISLAND, fast-forwards one full battle royale with an invulnerable player, checks the match resolves and nothing errors.
   Usage:  node tools/smoke.js            (starts its own static server on a free port)
   Needs playwright (or playwright-core with a Chromium). Set PLAYWRIGHT=/path/to/playwright-core if it is not resolvable. */
const path = require('path'), http = require('http'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
function loadPW() { for (const p of [process.env.PLAYWRIGHT, 'playwright', 'playwright-core', '/Users/bing/Developer/codex-tools/npm-global/lib/node_modules/@playwright/cli/node_modules/playwright-core'].filter(Boolean)) { try { return require(p); } catch (e) { } } console.error('playwright not found'); process.exit(2); }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise(ok => server.listen(0, ok)); const url = `http://localhost:${server.address().port}/?auto`;
  const { chromium } = loadPW(), browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--use-gl=angle', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/pointer lock|Pointer Lock|AudioContext/i.test(m.text())) errors.push('console: ' + m.text()); if (m.type() === 'warning' && /\[INV\]/.test(m.text())) errors.push('inventory invariant: ' + m.text()); });
  await page.goto(url); await page.waitForFunction(() => document.getElementById('menu').classList.contains('on'), null, { timeout: 90000 });
  const res = await page.evaluate(() => {
    const out = {}; G.manualStep = true; startMatch(); const pl = G.player; pl.spawnProtectedUntil = 1e9; pl.hp = 1e6;
    const t0 = performance.now(); let frames = 0; while (G.state === 'live' && G.now < 900 && performance.now() - t0 < 120000) { frame(1 / 30); frames++; }
    const alive = G.ents.filter(e => e.alive).length, byW = G.killLog.reduce((m, k) => (m[k[1]] = (m[k[1]] || 0) + 1, m), {});
    out.match = { state: G.state, seconds: Math.round(G.now), frames, msPerFrame: +((performance.now() - t0) / frames).toFixed(2), alive, zonePhase: ZONE.ph, byWeapon: byW, zoneDeaths: byW.zone || 0, firstMinuteDeaths: G.killLog.filter(k => k[0] < 60).length };
    out.loot = { spots: LOOT.spots.length, items: LOOT.items.length };
    out.unreachable = TOWNS.filter(t => !MAP.reach[navSnap(t.x, t.z + 8)]).map(t => t.id); out.pathsFromArmory = TOWNS.slice(1).map(t => { G.frameNo = (G.frameNo || 0) + 1; const r = routeToward(TOWNS[0].x, TOWNS[0].z + 20, t.x, t.z); const p = r && navPath(TOWNS[0].x, TOWNS[0].z + 20, r.x, r.z); return [t.id, !!p]; });
    out.landed = G.bots.filter(b => b.landT !== undefined).length;
    let badSpots = 0; for (const sp of LOOT.spots) { const onFloor = MAP.floorAtY(sp.x, sp.z, sp.y), c = navSnap(sp.x, sp.z); if (!(onFloor || (MAP.reach[c] && Math.abs(MAP.fh[c] - sp.y) < 1.2))) badSpots++; } out.badSpots = badSpots;
    return out;
  });
  await browser.close(); server.close();
  const fails = [];
  if (errors.length) fails.push('console/page errors:\n  ' + [...new Set(errors)].slice(0, 10).join('\n  '));
  if (res.match.state !== 'end') fails.push('match did not resolve (state ' + res.match.state + ' at ' + res.match.seconds + ' s)');
  if (res.match.alive !== 1) fails.push('expected exactly one survivor, got ' + res.match.alive);
  if (res.match.zoneDeaths > 10) fails.push('too many zone deaths: ' + res.match.zoneDeaths);
  if (res.match.firstMinuteDeaths > 12) fails.push('first minute too lethal: ' + res.match.firstMinuteDeaths);
  if (res.loot.items < 150) fails.push('too little loot: ' + res.loot.items);
  if (res.landed !== 23) fails.push('bots that landed: ' + res.landed);
  if (res.badSpots > 5) fails.push('loot spots bots cannot reach: ' + res.badSpots);
  if (res.pathsFromArmory.some(p => !p[1])) fails.push('routing failed: ' + res.pathsFromArmory.filter(p => !p[1]).map(p => p[0]));
  console.log(JSON.stringify(res, null, 2));
  if (fails.length) { console.error('\nSMOKE FAIL\n- ' + fails.join('\n- ')); process.exit(1); } console.log('\nSMOKE OK');
})().catch(e => { console.error(e); server.close(); process.exit(1); });

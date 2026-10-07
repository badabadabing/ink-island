/* Real-browser playtest autopilot (dev only, never loaded by index.html, not deployed).
   Inject in a running page:  const s = document.createElement('script'); s.src = 'tools/autopilot.js?' + Date.now(); document.head.appendChild(s);
   It drives the real input path (keyboard and mouse events on window), parachutes to a town, loots a gun, fights what it can see,
   walks into the white circle, unsticks itself, heals with H, and logs per second to AP.log plus events to AP.ev. AP.on = false stops it. */
(() => {
  const AP = window.AP = { on: true, log: [], ev: [], keys: {}, t0: performance.now(), lastPos: null, stuckT: 0, fireT: 0, mode: '', frames: [], fl: performance.now() };
  (function loop() { const n = performance.now(); AP.frames.push(n - AP.fl); AP.fl = n; if (AP.frames.length > 600) AP.frames.shift(); requestAnimationFrame(loop); })();
  window.addEventListener('error', e => AP.ev.push(['ERR', String(e.message).slice(0, 160)]));
  const key = (c, d) => { if (!!AP.keys[c] === d) return; AP.keys[c] = d; dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', { code: c, bubbles: true })); };
  const tap = c => { dispatchEvent(new KeyboardEvent('keydown', { code: c, bubbles: true })); setTimeout(() => dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true })), 60); };
  const mouse = (d, b = 0) => dispatchEvent(new MouseEvent(d ? 'mousedown' : 'mouseup', { button: b, bubbles: true }));
  const yawTo = (dx, dz) => Math.atan2(-dx, -dz), near = (P, L) => L.reduce((b, t) => Math.hypot(t.x - P.x, t.z - P.z) < Math.hypot(b.x - P.x, b.z - P.z) ? t : b, L[0]);
  const los = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz); const h = rayWorld(a.x, a.y, a.z, dx / L, dy / L, dz / L, L); return !h || h.t > L - .4; };
  AP.step = () => { if (!AP.on) { for (const c in AP.keys) key(c, false); return; } const pl = G.player; if (!pl) return; const now = (performance.now() - AP.t0) / 1000;
    if (G.state !== 'live' || !pl.alive) { for (const c in AP.keys) key(c, false); mouse(false); AP.mode = 'idle:' + G.state; return; }
    const P = pl.pos;
    if (pl.air === 'plane') { AP.mode = 'plane'; const t = AP.town || near(P, TOWNS); if (planeOverLand() && Math.hypot(t.x - P.x, t.z - P.z) < 90) { tap('Space'); AP.ev.push([+now.toFixed(0), 'jump', t.id]); AP.town = t; } return; }
    if (pl.air) { AP.mode = pl.air; const t = AP.town || near(P, TOWNS); pl.yaw = yawTo(t.x - P.x, t.z - P.z); key('KeyW', true); return; }
    if (pl.hp < 55 && !pl.heal && now - (AP.healT || 0) > 3) { AP.healT = now; tap('KeyH'); AP.ev.push([+now.toFixed(0), 'heal', Math.round(pl.hp)]); }
    const eye = { x: P.x, y: P.y + 1.5, z: P.z }; let foe = null, fd = 70; for (const b of G.bots) { if (!b.alive || b.air) continue; const d = Math.hypot(b.pos.x - P.x, b.pos.z - P.z); if (d < fd && los(eye, { x: b.pos.x, y: b.pos.y + 1.2, z: b.pos.z })) { fd = d; foe = b; } }
    const hasGun = !!(pl.inv[1] || pl.inv[2]);
    if (foe && (hasGun || fd < 3)) { AP.mode = 'fight'; if (hasGun && WEAPONS[pl.cur] && WEAPONS[pl.cur].melee) tap(pl.inv[1] ? 'Digit1' : 'Digit2'); const dx = foe.pos.x - P.x, dz = foe.pos.z - P.z, dy = foe.pos.y + 1.15 - (P.y + 1.55); pl.yaw = yawTo(dx, dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); key('KeyW', fd > 25); key('ShiftLeft', false); if (now - AP.fireT > .35) { AP.fireT = now; mouse(true); setTimeout(() => mouse(false), 180); } return; }
    mouse(false); let goal = null;
    if (!hasGun) { const it = lootNearest(pl, i => ITEMS[i.k].kind === 'gun' && !i.apSkip && Math.abs(i.y - P.y) < 2.5, 90); if (it) { goal = it; AP.mode = 'gun'; } }
    if (!goal) { const it = lootNearest(pl, i => !i.apSkip && lootUse(pl, i).auto && Math.abs(i.y - P.y) < 2.5, 35); if (it) { goal = it; AP.mode = 'loot'; } }
    if (ZONE.on && ZONE.white) { const W = ZONE.white, d0 = Math.hypot(W.x - P.x, W.z - P.z); if (hasGun && d0 > W.r * .8 && (!goal || d0 > W.r)) { goal = { x: W.x, z: W.z }; AP.mode = 'zone'; } }
    if (!goal) { const t = near(P, TOWNS); goal = AP.wander || (AP.wander = { x: t.x + (Math.random() - .5) * 60, z: t.z + (Math.random() - .5) * 60 }); AP.mode = 'wander'; if (Math.hypot(goal.x - P.x, goal.z - P.z) < 4) AP.wander = null; }
    const dx = goal.x - P.x, dz = goal.z - P.z, d = Math.hypot(dx, dz); pl.yaw = yawTo(dx, dz); pl.pitch = -.12; key('KeyW', d > .6); key('ShiftLeft', d > 8);
    if (goal.k && d < 1.6) tap('KeyF');
    if (goal !== AP.g) { AP.g = goal; AP.gT = now; } else if (goal.k && now - AP.gT > 9) { goal.apSkip = true; AP.ev.push([+now.toFixed(0), 'skip', goal.k]); }
    const lp = AP.lastPos; if (lp && Math.hypot(P.x - lp.x, P.z - lp.z) < .25 && AP.keys.KeyW) AP.stuckT += .15; else AP.stuckT = 0; AP.lastPos = { x: P.x, z: P.z };
    if (AP.stuckT > 1.5) { tap('Space'); AP.ev.push([+now.toFixed(0), 'stuck', AP.mode, +P.x.toFixed(1), +P.z.toFixed(1)]); AP.stuckT = 0; if (goal.k) goal.apSkip = true; AP.wander = null; } };
  clearInterval(window.__apI); window.__apI = setInterval(() => { try { AP.step(); } catch (e) { AP.ev.push(['ERR', e.message]); } }, 150);
  clearInterval(window.__apL); window.__apL = setInterval(() => { const pl = G.player; if (!pl) return; const f = AP.frames.slice(-60); AP.log.push([+((performance.now() - AP.t0) / 1000).toFixed(0), AP.mode, Math.round(pl.hp), pl.kills, G.ents.filter(e => e.alive).length, pl.cur, Math.round(Math.max(...f)), +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1)]); if (AP.log.length > 900) AP.log.shift(); }, 1000);
})();

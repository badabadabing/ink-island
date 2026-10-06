'use strict';
/* ============ INK ISLAND · crate: what the fallen carried waits in a paper box; open it and take what you want ============ */
const CRATES = { list: [], fm: null, lm: null };
function crateSpawn(e) {
  if (!CRATES.fm) { CRATES.fm = fillMat({ objSpace: false, freq: 30, hatch: .7, hw: .12, fog: .003 }); CRATES.lm = lineMat({ width: 1.3 }); }
  const off = typeof SKIN !== 'undefined' && SKIN.on ? .9 : 0, fd = e.yaw || 0, x = e.pos.x - Math.sin(fd + Math.PI / 2) * off, z = e.pos.z - Math.cos(fd + Math.PI / 2) * off, y = MAP.floorAt(x, z), items = [];
  const put = (k, qty) => { const it = lootSpawn(k, x, y, z, qty); it.inCrate = true; items.push(it); };
  for (const s of [1, 2]) if (e.inv[s]) put(e.inv[s]); for (const t in e.pool) if (e.pool[t] >= 5) put('a' + t, e.pool[t]); for (const k in e.meds) for (let i = 0; i < e.meds[k]; i++) put(k);
  if (e.vestLv) { put('vest' + e.vestLv); items[items.length - 1].dur = e.armor; } if (e.helmLv) put('helm' + e.helmLv); if (e.bagLv) put('bag' + e.bagLv); if (e.ghillie) put('ghillie'); if (e.scope) put(e.scope); for (const k in e.nades) for (let i = 0; i < e.nades[k]; i++) put(k); for (const k in e.att) if (e.att[k]) put(k === 'mag' ? 'xmag' : k);
  if (!items.length) return null;
  const s = new Sk('sun'), yaw = rand(6.28), M = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
  s.box(1.0, .56, .68, 0, .28, 0, { m: M, tint: WOOD, tone: .33 }); s.box(1.04, .06, .72, 0, .59, 0, { m: M, tint: WOOD, tone: .66 }); s.line([-.5, .3, -.35, .5, .3, -.35, -.5, .3, .35, .5, .3, .35, -.45, .62, -.3, .45, .62, .3, -.45, .62, .3, .45, .62, -.3], M); s.box(.3, .02, .2, .2, .63, .1, { m: M, tone: 0 }); s.line([.08, .645, .05, .32, .645, .05, .08, .645, .12, .3, .645, .12], M);
  const g = s.bake(CRATES.fm, CRATES.lm); g.traverse(o => o.frustumCulled = false); scene.add(g); const c = { x, y, z, items, g, name: e.name, by: e.killedBy || '' }; CRATES.list.push(c); return c;
}
function crateClear() { for (const c of CRATES.list) { scene.remove(c.g); c.g.traverse(o => o.geometry && o.geometry.dispose()); } CRATES.list.length = 0; }
function crateNear(e, r = 2.3) { let best = null, bd = r; for (const c of CRATES.list) { const d = Math.hypot(c.x - e.pos.x, c.z - e.pos.z); if (d < bd && Math.abs(c.y - e.pos.y) < 1.8) { bd = d; best = c; } } return best; }
function crateTidy(c) { c.items = c.items.filter(i => i.alive); if (!c.items.length) { scene.remove(c.g); c.g.traverse(o => o.geometry && o.geometry.dispose()); CRATES.list.splice(CRATES.list.indexOf(c), 1); return false; } return true; }
/* the box panel: one row per item, take one or take everything that fits */
function crateOpen(c) { G.crate = c; G.crateOpen = true; $('crate').classList.add('on'); clearInput(); unlockUI(); crateDraw(); }
function crateClose() { G.crateOpen = false; G.crate = null; $('crate').classList.remove('on'); clearInput(); lock(); }
function crateDraw(note) { const c = G.crate; if (!c || !crateTidy(c)) { crateClose(); return; } $('crateT').textContent = `${c.name} · 遗物`; $('crateT2').textContent = note || (c.by ? `被你用 ${c.by} 击杀` : ''); const groups = new Map(); c.items.forEach((it, i) => { const g = groups.get(it.k) || { k: it.k, n: 0, qty: 0, first: i }; g.n++; g.qty += it.qty || 1; groups.set(it.k, g); });
  $('crateList').innerHTML = [...groups.values()].map(g => invRow(g.k, null, ITEMS[g.k].name + (typeof invBetter === 'function' && invBetter(G.player, g.k) ? '<span class="up">↑ 升级</span>' : ''), ITEMS[g.k].kind === 'ammo' ? `×${g.qty}` : (g.n > 1 ? `×${g.n} · ` : '') + invDesc(g.k), `<button data-k="${g.k}" class="drop${invBetter(G.player, g.k) ? ' pri' : ''}">拿取${g.n > 1 ? ' 全部' : ''}</button>`)).join(''); }
function crateTake(i) { const c = G.crate; if (!c) return; const it = c.items[i]; if (!it || !it.alive) return crateDraw(); const r = invTake(G.player, it); if (r) { SFX.click(1400, .2); } else { SFX.deny(); combatNotice('放不下 · ' + ITEMS[it.k].name); } crateDraw(); }
function crateTakeKind(k) { const c = G.crate; if (!c) return; let n = 0, fail = 0; for (const it of c.items.slice()) if (it.alive && it.k === k) { if (invTake(G.player, it)) n++; else fail++; } if (n) SFX.click(1400, .2); else SFX.deny(); crateDraw(fail ? `放不下 ${ITEMS[k].name}${fail > 1 ? ' ×' + fail : ''}（负重满或已有更好的）` : ''); }
function crateTakeAll() { const c = G.crate; if (!c) return; let n = 0; const left = {}; for (const it of c.items.slice()) if (it.alive) { if (invTake(G.player, it)) n++; else left[it.k] = (left[it.k] || 0) + (ITEMS[it.k].kind === 'ammo' ? it.qty : 1); } if (n) SFX.click(1400, .2); else SFX.deny(); const L = Object.entries(left); crateDraw(L.length ? '剩下：' + L.map(([k, q]) => ITEMS[k].name + (q > 1 ? ' ×' + q : '')).join('、') + '（放不下或已有更好的）' : ''); }

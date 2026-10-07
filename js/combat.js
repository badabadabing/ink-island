'use strict';
/* ============ INK ISLAND · combat: travelling bullets with drop, throwables, smoke and flash, attachments on the gun, red zone, compass and map markers ============ */
/* ---------------- projectiles: every shot is a bullet that flies, falls and is swept against the world each frame ---------------- */
const BULLETS = [], BSPEED = { pistol: 380, deagle: 430, smg: 420, shotgun: 340, rifle: 760, m4: 800, awp: 900, bow: 95 }, BGRAV = 9.8;
const _bp0 = new V3(), _bseg = new V3();
function fireBullet(sh, ox, oy, oz, dx, dy, dz, w, mx, my, mz, noTracer) {
  const L = Math.hypot(dx, dy, dz); if (L < 1e-8) return; dx /= L; dy /= L; dz /= L;
  if (w.bolt && typeof botOnShot === 'function') botOnShot(sh, sh.weapon, new V3(ox, oy, oz), new V3(dx, dy, dz));
  const sp = BSPEED[w.snd] || 700; if (BULLETS.length > 180) BULLETS.shift();
  BULLETS.push({ sh, w, p: new V3(ox, oy, oz), v: new V3(dx * sp, dy * sp, dz * sp), d: 0, range: w.range || 320, pen: 0, mul: 1, noTracer, mx, my, mz, first: true });
}
function stepBullet(b, dt) {
  _bp0.copy(b.p); b.v.y -= BGRAV * dt; b.p.addScaledVector(b.v, dt); _bseg.copy(b.p).sub(_bp0); const len = _bseg.length(); if (len < 1e-6) return true;
  const dx = _bseg.x / len || 1e-9, dy = _bseg.y / len || 1e-9, dz = _bseg.z / len || 1e-9, w = b.w, sh = b.sh; b.d += len;
  let best = null, be = null; for (const e of G.ents) { if (!e.alive || e === sh || e.team === sh.team) continue; const r = rayEnt(_bp0.x, _bp0.y, _bp0.z, dx, dy, dz, e); if (r && r.t <= len && (!best || r.t < best.t)) { best = r; be = e; } }
  const h = rayWorld(_bp0.x, _bp0.y, _bp0.z, dx, dy, dz, len), tx = b.first ? b.mx : _bp0.x, ty = b.first ? b.my : _bp0.y, tz = b.first ? b.mz : _bp0.z; b.first = false;
  if (best && (!h || best.t < h.t)) { const partMul = best.part === 'head' && w.headMult ? w.headMult : best.mul, dmg = w.dmg * partMul * b.mul * weaponFalloff(w, b.d); if (!b.noTracer || !sh.isPlayer) FX.tracer(tx, ty, tz, _bp0.x + dx * best.t, _bp0.y + dy * best.t, _bp0.z + dz * best.t);
    if (dmg > 0) hurt(be, dmg, sh, sh.weapon, best.part, { x: dx, y: dy, z: dz }, { x: _bp0.x + dx * best.t, y: _bp0.y + dy * best.t, z: _bp0.z + dz * best.t }); return false; }
  if (typeof vehBulletHit === 'function' && vehBulletHit(b.p.x, b.p.y, b.p.z, w.dmg, _bp0.x, _bp0.y, _bp0.z, sh, h ? h.t / len : 1)) { if (!b.noTracer || !sh.isPlayer) FX.tracer(tx, ty, tz, b.p.x, b.p.y, b.p.z); return false; }
  if (h && h.s && h.s.glass) { breakGlass(h.s.win, sh); b.p.set(_bp0.x + dx * (h.t + .1), _bp0.y + dy * (h.t + .1), _bp0.z + dz * (h.t + .1)); if (!b.noTracer || !sh.isPlayer) FX.tracer(tx, ty, tz, b.p.x, b.p.y, b.p.z); return b.d < b.range; }
  if (h) { const ix = _bp0.x + dx * h.t, iy = _bp0.y + dy * h.t, iz = _bp0.z + dz * h.t, thin = h.s && (h.tx - h.t) < .5;
    FX.decal(ix, iy, iz, h.nx, h.ny, h.nz, rand(.13, .24) * (w.dmg > 50 ? 1.5 : 1), INK); FX.burst(ix, iy, iz, h.nx, h.ny, h.nz, 4, INK, 2.5, .018); if (sh.isPlayer || Math.random() < .4) SFX.impact({ x: ix, y: iy, z: iz }); if (!b.noTracer || !sh.isPlayer) FX.tracer(tx, ty, tz, ix, iy, iz);
    if (thin && w.penetration !== 0 && b.pen === 0) { b.pen = 1; b.mul = w.penetration === undefined ? .55 : w.penetration; const ex = _bp0.x + dx * (h.tx + .02), ey = _bp0.y + dy * (h.tx + .02), ez = _bp0.z + dz * (h.tx + .02); FX.decal(ex, ey, ez, -h.nx, -h.ny, -h.nz, .2, INK); b.p.set(ex, ey, ez); b.v.multiplyScalar(.8); return b.d < b.range; } return false; }
  if (!b.noTracer || !sh.isPlayer) FX.tracer(tx, ty, tz, b.p.x, b.p.y, b.p.z);
  return b.d < b.range && b.p.y > MAP.sea - 30;
}
function updateBullets(dt) { for (let i = BULLETS.length - 1; i >= 0; i--) { const b = BULLETS[i], sub = Math.max(1, Math.ceil(b.v.length() * dt / 12)); let alive = true; for (let k = 0; k < sub && alive; k++) alive = stepBullet(b, dt / sub); if (!alive) BULLETS.splice(i, 1); } }

/* ---------------- throwables (from INK STRIKE): ink bomb, overexpose flash, smoke wash ---------------- */
let _nadeLm = null, _smokeFm = null, _smokeLm = null;
function throwNade(e, kind = 'he') { const cp = Math.cos(e.pitch), dx = -Math.sin(e.yaw) * cp, dy = Math.sin(e.pitch), dz = -Math.cos(e.yaw) * cp; if (!G.nadeFm) { G.nadeFm = fillMat({ objSpace: true, freq: 60 }); _nadeLm = lineMat({ width: 1.3 }); }
  const m = worldGun(kind, G.nadeFm, _nadeLm); m.scale.setScalar(1.6); scene.add(m); G.nades.push({ owner: e, m, p: new V3(e.pos.x + dx * .5, e.pos.y + eyeY(e) - .05, e.pos.z + dz * .5), v: new V3(dx * 17 + e.vel.x * .6, dy * 17 + 3.2, dz * 17 + e.vel.z * .6), t: WEAPONS[kind].fuse, kind }); if (e.isPlayer) SFX.swish(); }
function updateNades(dt) { for (let i = G.nades.length - 1; i >= 0; i--) { const n = G.nades[i]; n.t -= dt; n.v.y -= GRAV * dt; const sp = n.v.length(), d = sp * dt;
    if (sp > .01) { const h = rayWorld(n.p.x, n.p.y, n.p.z, n.v.x / sp || 1e-9, n.v.y / sp || 1e-9, n.v.z / sp || 1e-9, d + .08); if (h && n.kind === 'fire') { scene.remove(n.m); G.nades.splice(i, 1); fireSpawn(n.p.x + h.nx * .2, Math.max(MAP.floorAt(n.p.x, n.p.z), n.p.y - 1.5), n.p.z + h.nz * .2, n.owner); continue; }
    if (h) { const dot = n.v.x * h.nx + n.v.y * h.ny + n.v.z * h.nz; n.v.x -= 2 * dot * h.nx; n.v.y -= 2 * dot * h.ny; n.v.z -= 2 * dot * h.nz; n.v.multiplyScalar(.42); if (sp > 2) SFX.impact(n.p); if (h.ny > .5 && Math.abs(n.v.y) < 1) { n.v.y = 0; n.v.x *= .8; n.v.z *= .8; } } else n.p.addScaledVector(n.v, dt); }
    const fl = MAP.floorAt(n.p.x, n.p.z); if (n.p.y < fl + .08) { n.p.y = fl + .08; if (n.v.y < 0) n.v.y = 0; } n.m.position.copy(n.p); n.m.rotation.x += dt * sp; n.m.rotation.z += dt * sp * .7;
    if (n.t <= 0 && n.kind !== 'he') { scene.remove(n.m); G.nades.splice(i, 1); n.kind === 'smoke' ? smokeSpawn(n.p.x, fl, n.p.z) : flashBang(n.p.x, n.p.y + .25, n.p.z); continue; }
    if (n.t <= 0) { scene.remove(n.m); G.nades.splice(i, 1); FX.explode(n.p.x, n.p.y, n.p.z); SFX.boom(n.p); const pd = G.player.pos.distanceTo(n.p); G.shake += clamp(1.4 - pd / 14, 0, 1.2); botHear(n.p, 'x', 60, 'shot');
      for (const e of G.ents) { if (!e.alive || e.air) continue; const dd = Math.hypot(e.pos.x - n.p.x, e.pos.y + .9 - n.p.y, e.pos.z - n.p.z); if (dd > 7.5 || !segClear(n.p.x, n.p.y + .3, n.p.z, e.pos.x, e.pos.y + 1, e.pos.z)) continue;
        const dir = { x: (e.pos.x - n.p.x) / (dd || 1), y: .3, z: (e.pos.z - n.p.z) / (dd || 1) }; hurt(e, Math.round(105 * Math.pow(1 - dd / 7.5, 1.3)), n.owner, 'he', 'chest', dir, { x: e.pos.x, y: e.pos.y + 1, z: e.pos.z }); } } } }
function smokeSpawn(x, y, z) {
  if (!_smokeFm) { _smokeFm = fillMat({ freq: 3.2, hatch: .55, hw: .12 }); _smokeLm = lineMat({ width: 1.1, color: 0x55534e }); }
  const s = new Sk('sun'); for (let i = 0; i < 20; i++) { const a = rand(6.28), r = Math.sqrt(Math.random()) * 3.3, h = rand(.5, 3.4); s.sph(rand(1.3, 2.3) * (1 - h / 9), Math.cos(a) * r, h, Math.sin(a) * r, { ws: 7, hs: 5, r: [rand(3), rand(3), 0], ea: 38 }); }
  const g = s.bake(_smokeFm, _smokeLm); g.position.set(x, y, z); g.scale.setScalar(.05); g.traverse(o => o.frustumCulled = false); scene.add(g); SMOKES.push({ p: new V3(x, y + 1.6, z), r: 4.7, t: 16, g, age: 0 }); SFX.hiss({ x, y, z });
}
function smokeUpdate(dt) { for (let i = SMOKES.length - 1; i >= 0; i--) { const s = SMOKES[i]; s.t -= dt; s.age += dt; const k = Math.min(1, s.age / 1.1) * Math.min(1, s.t / 1.8); s.g.scale.setScalar(Math.max(.02, k)); s.g.rotation.y += dt * .07; s.live = k > .75; if (s.t <= 0) { scene.remove(s.g); s.g.traverse(o => o.geometry && o.geometry.dispose()); SMOKES.splice(i, 1); } } }
function smokeClear() { for (const s of SMOKES) { scene.remove(s.g); s.g.traverse(o => o.geometry && o.geometry.dispose()); } SMOKES.length = 0; }
function smokeBlocks(ax, ay, az, bx, by, bz) { for (const s of SMOKES) { if (!s.live) continue; const dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz || 1, t = clamp(((s.p.x - ax) * dx + (s.p.y - ay) * dy + (s.p.z - az) * dz) / l2, 0, 1), qx = ax + dx * t - s.p.x, qy = (ay + dy * t - s.p.y) * .8, qz = az + dz * t - s.p.z; if (qx * qx + qy * qy + qz * qz < s.r * s.r * .8) return true; } return false; }
const inSmoke = p => { for (const s of SMOKES) if (s.live) { const d = Math.hypot(p.x - s.p.x, (p.y - s.p.y) * .8, p.z - s.p.z); if (d < s.r) return clamp((s.r - d) / 1.2, 0, 1); } return 0; };
function flashBang(x, y, z) {
  FX.flash(x, y, z, 3.2); FX.burst(x, y, z, 0, 1, 0, 26, AMBER, 8, .04); SFX.bang({ x, y, z });
  for (const e of G.ents) { if (!e.alive) continue; const ey = e.pos.y + eyeY(e), d = Math.hypot(e.pos.x - x, ey - y, e.pos.z - z); if (d > 32 || !segClear(x, y, z, e.pos.x, ey, e.pos.z) || smokeBlocks(x, y, z, e.pos.x, ey, e.pos.z)) continue;
    const cp = Math.cos(e.pitch), fx = -Math.sin(e.yaw) * cp, fy = Math.sin(e.pitch), fz = -Math.cos(e.yaw) * cp, dot = ((x - e.pos.x) * fx + (y - ey) * fy + (z - e.pos.z) * fz) / (d || 1), f = clamp((dot + .35) / 1.2, .12, 1), dur = (3.4 * (1 - d / 32) + .5) * f;
    if (e.isPlayer) { G.flashT = Math.max(G.flashT || 0, dur); G.flashMax = Math.max(1.1, G.flashT); SFX.ring(dur); } else { e.blindT = G.now + dur * .9; e.target = null; } }
}

/* ---------------- attachments: suppressor, extended magazine, vertical grip; drawn onto the first-person gun ---------------- */
const magCap = (e, w) => (w.mag || 0) + (e.att && e.att.mag && !w.pellets && !w.bolt && !w.crank ? 10 : 0);
function attachVisuals() { const c = VM.cur; if (!c) return; if (c.attG) { c.group.remove(c.attG); c.attG = null; } const pl = G.player, w = WEAPONS[VM.key]; if (!pl || !pl.att || w.melee || w.nade || w.crank) return;
  const s = new Sk('under'), mz = c.meta.muzzle, lh = c.meta.lh, pistol = c.meta.pistol; let any = false;
  if (pl.att.sup) { s.cyl(pistol ? .012 : .017, pistol ? .012 : .017, pistol ? .09 : .15, 10, 0, mz[1], -mz[0] - (pistol ? .045 : .075), { ax: 'z', tone: .66, ea: 40 }); s.line([-.012, mz[1] + .012, -mz[0] - .02, .012, mz[1] + .012, -mz[0] - .02]); any = true; }
  if (pl.att.grip && lh && !pistol) { inkBlock(s, .028, .07, .03, 0, lh[1] - .03, -lh[0] - .03, { tone: .66, bevel: .25 }); any = true; }
  if (pl.att.comp) { inkBlock(s, .03, .03, .06, 0, mz[1], -mz[0] - .03, { tone: .66, bevel: .25 }); s.line([-.016, mz[1] + .01, -mz[0] - .02, .016, mz[1] + .01, -mz[0] - .02, -.016, mz[1] + .01, -mz[0] - .045, .016, mz[1] + .01, -mz[0] - .045]); any = true; }
  if (pl.att.stock && !pistol) { inkBlock(s, .034, .06, .1, 0, .005, .4, { tone: .33, bevel: .25 }); s.line([-.017, -.02, .36, -.017, -.02, .45, .017, -.02, .36, .017, -.02, .45]); any = true; }
  if (pl.att.dot && !w.optic && !w.adsFov && !pistol) { inkBlock(s, .024, .018, .05, 0, (c.meta.opticY || .06) + .01, -.08, { tone: 1 }); s.add(new THREE.TorusGeometry(.016, .003, 5, 12), new THREE.Matrix4().makeTranslation(0, (c.meta.opticY || .06) + .034, -.08), { tone: .33, ea: 40 }); any = true; }
  if (pl.att.mag && !w.pellets && !w.bolt) { const gp = c.meta.grip; inkBlock(s, pistol ? .02 : .034, .06, pistol ? .024 : .05, 0, (gp ? gp[1] : -.08) - .11, pistol ? .0 : -.06 - (gp ? gp[0] : 0), { tone: .33, bevel: .2 }); any = true; }
  if (!any) return; c.attG = s.bake(VM.fm, VM.lm); c.attG.traverse(o => o.frustumCulled = false); c.group.add(c.attG); }

/* ---------------- red zone: a bombardment circle inside the blue, called a few seconds ahead ---------------- */
const REDZ = { on: false, warn: 0, t: 0, x: 0, z: 0, r: 55, next: 110, tick: 0 };
function redUpdate(dt) {
  if (!ZONE.on || ZONE.stage === 'done') return; if (!REDZ.on) { REDZ.next -= dt; if (REDZ.next <= 0) { REDZ.next = rand(90, 150); if (ZONE.blue.r < 70) return; const p = landPointIn(ZONE.blue.x, ZONE.blue.z, ZONE.blue.r * .8); REDZ.on = true; REDZ.warn = 9; REDZ.t = 26; REDZ.x = p.x; REDZ.z = p.z; REDZ.r = Math.min(55, ZONE.blue.r * .35); REDZ.tick = 0; if (G.player.alive) { banner('红区', `${MAP.zoneAt(p.x, p.z) || '野外'} · 9 秒后轰炸`, 'lose'); setTimeout(() => $('banner').classList.remove('on'), 2400); } SFX.beep(null, true); } return; }
  if (REDZ.warn > 0) { REDZ.warn -= dt; return; } REDZ.t -= dt; REDZ.tick -= dt; if (REDZ.t <= 0) { REDZ.on = false; return; }
  if (REDZ.tick <= 0) { REDZ.tick = .42; const a = rand(6.2832), d = Math.sqrt(Math.random()) * REDZ.r, x = REDZ.x + Math.cos(a) * d, z = REDZ.z + Math.sin(a) * d, y = Math.max(MAP.floorAt(x, z), MAP.sea); FX.explode(x, y + .4, z); FX.burst(x, y + .5, z, 0, 1, 0, 22, INK, 6, .06); SFX.boom({ x, y, z }); const pd = Math.hypot(G.player.pos.x - x, G.player.pos.z - z); G.shake += clamp(1.2 - pd / 40, 0, .9);
    for (const e of G.ents) { if (!e.alive || e.air) continue; const dd = Math.hypot(e.pos.x - x, e.pos.z - z); if (dd > 8) continue; if (rayWorld(e.pos.x, e.pos.y + 1.7, e.pos.z, 1e-9, 1, 1e-9, 30)) continue;   // a roof overhead keeps you safe
      hurt(e, Math.round(130 * (1 - dd / 8)), null, 'he', 'chest', { x: (e.pos.x - x) / (dd || 1), y: .4, z: (e.pos.z - z) / (dd || 1) }, { x: e.pos.x, y: e.pos.y + 1, z: e.pos.z }); } }
}
function drawRedOn(g, k) { if (!REDZ.on) return; g.save(); g.strokeStyle = UIC('#d42a2a'); g.fillStyle = 'rgba(212,42,42,.18)'; g.lineWidth = 2; g.beginPath(); g.arc((REDZ.x - MAP.ox) * k, (REDZ.z - MAP.oz) * k, REDZ.r * k, 0, 6.2832); g.fill(); g.stroke(); g.restore(); }

/* ---------------- compass strip and the map marker ---------------- */
function drawCompass(g, W, pl) { const cx = W / 2, y = typeof SKIN !== 'undefined' && SKIN.on ? 98 : 64, span = 150, pxPerDeg = 2.2, yawDeg = (((-pl.yaw - (pl.fy || 0)) * 180 / Math.PI) % 360 + 360) % 360;
  g.save(); const SKC = typeof SKIN !== 'undefined' && SKIN.on; if (SKC) { g.fillStyle = '#2e3a59'; g.beginPath(); g.roundRect(cx - span * pxPerDeg / 2, y - 14 + 4, span * pxPerDeg, 30, 12); g.fill(); g.fillStyle = '#fff8ec'; g.strokeStyle = '#2e3a59'; g.lineWidth = 3; g.beginPath(); g.roundRect(cx - span * pxPerDeg / 2, y - 14, span * pxPerDeg, 30, 12); g.fill(); g.stroke(); } else { g.fillStyle = UIC('rgba(245,242,234,.85)'); g.fillRect(cx - span * pxPerDeg / 2, y - 14, span * pxPerDeg, 30); g.strokeStyle = UIC('#16161c'); g.lineWidth = 1.5; g.strokeRect(cx - span * pxPerDeg / 2, y - 14, span * pxPerDeg, 30); }
  g.beginPath(); g.rect(cx - span * pxPerDeg / 2, y - 14, span * pxPerDeg, 30); g.clip(); g.fillStyle = UIC('#16161c'); g.font = SKC ? '900 12px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif' : 'bold 12px "IBM Plex Mono", monospace'; g.textAlign = 'center';
  for (let d = -span / 2 - 15; d <= span / 2 + 15; d += 15) { const deg = (((Math.round((yawDeg + d) / 15) * 15) % 360) + 360) % 360, x = cx + (deg - yawDeg + 540) % 360 * pxPerDeg - 180 * pxPerDeg; if (Math.abs(x - cx) > span * pxPerDeg / 2 + 10) continue; const big = deg % 90 === 0; g.fillRect(x - .5, y + 4, 1, big ? 8 : 4); if (big) g.fillText(['N', 'E', 'S', 'W'][deg / 90], x, y); else if (deg % 45 === 0) g.fillText(String(deg), x, y); }
  const bearing = (tx, tz, color, shape) => { const b = ((Math.atan2(tx - pl.pos.x, -(tz - pl.pos.z)) * 180 / Math.PI) % 360 + 360) % 360, x = cx + ((b - yawDeg + 540) % 360 - 180) * pxPerDeg; if (Math.abs(x - cx) > span * pxPerDeg / 2) return; g.fillStyle = color; g.beginPath(); if (shape === 'circle') g.arc(x, y - 7, 4, 0, 6.2832); else if (shape === 'square') g.rect(x - 4, y - 11, 8, 8); else { g.moveTo(x, y - 12); g.lineTo(x + 5, y - 7); g.lineTo(x, y - 2); g.lineTo(x - 5, y - 7); g.closePath(); } g.fill(); };
  if (ZONE.on && ZONE.white.r > 0 && ZONE.stage !== 'done') bearing(ZONE.white.x, ZONE.white.z, UIC('#2d6cb3'), 'circle'); for (const d of ZONE.drops) if (d.falling || d.smokeT > 0) bearing(d.x, d.z, UIC('#d42a2a'), 'square'); if (G.marker) bearing(G.marker.x, G.marker.z, UIC('#e9a520'), 'diamond'); g.restore();
  g.fillStyle = typeof SKIN !== 'undefined' && SKIN.on ? '#ff5a4e' : UIC('#16161c'); g.beginPath(); g.moveTo(cx, y + 14); g.lineTo(cx - 4, y + 20); g.lineTo(cx + 4, y + 20); g.closePath(); g.fill(); }
function drawMarkerOn(g, k, ox = 0, oz = 0) { const m = G.marker; if (!m) return; const x = (m.x - ox - MAP.ox) * k, y = (m.z - oz - MAP.oz) * k; g.save(); g.fillStyle = UIC('#e9a520'); g.strokeStyle = UIC('#16161c'); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 7, y); g.lineTo(x, y + 9); g.lineTo(x - 7, y); g.closePath(); g.fill(); g.stroke(); g.restore(); }

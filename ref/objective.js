'use strict';
/* ============ INK STRIKE · objective: ink-core (bomb) plant/defuse, smoke & flash utility, ladders, surfaces ============ */
const SITES = MAP.sites;
const PLANT_T = 3.2, DEFUSE_T = 6, BOMB_T = 40;
const BOMB = { state: 'none', carrier: null, pos: new V3(), t: 0, mesh: null, light: null, beepT: 0, site: null, defuser: null };
const siteAt = p => { for (const k in SITES) { const s = SITES[k]; if (p.x > s.x1 && p.x < s.x2 && p.z > s.z1 && p.z < s.z2 && Math.abs(p.y - s.y) < .5) return k; } return null; };

function bombInit(scene) {
  const s = new Sk('under'); s.box(.36, .1, .26, 0, .05, 0, { tone: .33 }); for (let i = 0; i < 3; i++) s.cyl(.045, .045, .3, 8, -.1 + i * .1, .15, 0, { ax: 'x', tone: 1, r: [0, Math.PI / 2, 0] });
  s.box(.12, .06, .08, .1, .21, 0); s.line([-.1, .2, .05, 0, .26, .08, 0, .26, .08, .08, .24, .03, -.1, .2, -.05, .02, .27, -.07, .02, .27, -.07, .1, .24, -.03]);
  const g = BOMB.mesh = s.bake(fillMat({ objSpace: true, freq: 60 }), lineMat({ width: 1.6 })); g.scale.setScalar(1.25);
  BOMB.light = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: AMBER })); BOMB.light.position.set(.1, .26, 0); g.add(BOMB.light); g.visible = false; scene.add(g);
}
function bombReset() {
  BOMB.state = 'none'; BOMB.carrier = null; BOMB.defuser = null; BOMB.site = null; if (BOMB.mesh) BOMB.mesh.visible = false; for (const e of G.ents) e.act = null;
  G.order = null; G.danger = { red: [], blue: [] }; G.utilityT = { red: {}, blue: {} }; G.intel = { red: null, blue: null }; const slots = { red: 0, blue: 0 }, shift = Math.random() < .5 ? 0 : 1;
  for (const b of G.bots) { const i = slots[b.team]++; b.slot = i; b.squad = Math.floor(i / 3); b.lane = i % 3 - 1; b.rot = Math.random(); b.role = b.team === 'red' ? ['entry', 'support', 'flank', 'support'][i % 4] : i % 5 === 4 ? 'rotate' : 'anchor'; b.holdSite = i % 5 === 4 ? 'MID' : ['A', 'B'][(i + shift) % 2]; b.holdYaw = null; b.holdPos = null; b.routeReady = false; b.respondedT = -9; b.tacticalT = G.now + i * .025; b.orderToken = 0; b.lastVisualT = b.heardT = -9; b.flashAvoidT = 0; b.targetVis = false; b.intent = '部署'; b.fireClear = true; b.saving = false; b.waitT = G.now + (G.state === 'freeze' ? G.timer : 0) + .012 + (i + (b.team === 'blue' ? .5 : 0)) * .02; }
  if (G.mode !== 'comp') return; const reds = G.ents.filter(e => e.team === 'red'); BOMB.carrier = reds.find(e => e.isPlayer && Math.random() < .4) || pick(reds.filter(e => !e.isPlayer)); BOMB.state = 'carried'; if (BOMB.carrier && !BOMB.carrier.isPlayer) BOMB.carrier.role = 'carrier';
  G.plan = { site: Math.random() < .5 ? 'A' : 'B' };

}
const canPlant = e => BOMB.state === 'carried' && BOMB.carrier === e && e.onGround && G.state === 'live' && siteAt(e.pos);
const canDefuse = e => BOMB.state === 'planted' && e.team === 'blue' && G.state === 'live' && e.pos.distanceTo(BOMB.pos) < 1.9 && segClear(e.pos.x, e.pos.y + eyeY(e), e.pos.z, BOMB.pos.x, BOMB.pos.y + .16, BOMB.pos.z);
function entInteract(e, want, dt) {
  const type = canPlant(e) ? 'plant' : canDefuse(e) ? 'defuse' : null;
  if (!want || !type) { if (e.act) { if (BOMB.defuser === e) BOMB.defuser = null; e.act = null; } return; }
  if (!e.act || e.act.type !== type) { if (type === 'defuse' && BOMB.defuser && BOMB.defuser !== e && BOMB.defuser.alive && BOMB.defuser.act) return; e.act = { type, t: 0 }; if (type === 'defuse') BOMB.defuser = e; SFX.click(1300, .4); if (e.team === G.team && !e.isPlayer) RADIO.say('cover', e.name, true); }
  e.act.t += dt; e.vel.x *= .6; e.vel.z *= .6; if (((e.act.t * 3) | 0) !== (((e.act.t - dt) * 3) | 0)) SFX.tick(e.isPlayer ? null : e.pos);
  if (e.act.t >= (type === 'plant' ? PLANT_T : DEFUSE_T)) { e.act = null; type === 'plant' ? bombPlant(e) : bombDefuse(e); }
}
function bombPlant(e) {
  let fx = e.pos.x - Math.sin(e.yaw) * .45, fz = e.pos.z - Math.cos(e.yaw) * .45; const site = siteAt(e.pos), near = MAP.near(fx, fz), probe = { pos: new V3(fx, e.pos.y, fz), hw: .29, hgt: .38 }; if (siteAt(probe.pos) !== site || entOverlap(probe, fx, e.pos.y + .01, fz, near) || Math.abs(supportY(probe, near) - e.pos.y) > .08) { fx = e.pos.x; fz = e.pos.z; } BOMB.state = 'planted'; BOMB.site = site; BOMB.pos.set(fx, e.pos.y, fz); BOMB.t = BOMB_T; BOMB.carrier = null; BOMB.beepT = 0;
  BOMB.mesh.position.copy(BOMB.pos); BOMB.mesh.rotation.y = e.yaw; BOMB.mesh.visible = true; e.money = Math.min(16000, e.money + 300); PROG.rstat(e).plant = 1;
  banner('墨核已安放', `${SITES[BOMB.site].name} · ${BOMB_T} 秒后引爆`, G.team === 'red' ? 'go' : 'lose'); SFX.plant(); RADIO.say(G.team === 'red' ? 'plant_red' : 'plant_blue', '', true); for (const b of G.bots) { b.path = null; b.waitT = G.now + (b.slot || 0) * .02; b.holdYaw = null; }
}
function bombDefuse(e) { if (e.team === G.team) RADIO.say('defused', e.isPlayer ? '你' : e.name, true); BOMB.state = 'defused'; BOMB.defuser = null; e.money = Math.min(16000, e.money + 300); PROG.rstat(e).defuse = 1; BOMB.light.visible = false; endRound('blue', `${e.name} 拆除了墨核`); }
function bombUpdate(dt) {
  if (G.mode !== 'comp' || BOMB.state === 'none') return;
  if (BOMB.state === 'carried' && BOMB.carrier && !BOMB.carrier.alive) { const c = BOMB.carrier; BOMB.state = 'dropped'; BOMB.carrier = null; BOMB.pos.set(c.pos.x, MAP.floorAt(c.pos.x, c.pos.z), c.pos.z); BOMB.mesh.position.copy(BOMB.pos); BOMB.mesh.visible = true; if (G.team === 'red') banner('墨核掉落', '捡起它继续进攻', 'lose'); }
  if (BOMB.state === 'dropped' && G.state !== 'roundEnd') for (const e of G.ents) if (e.alive && e.team === 'red' && Math.hypot(e.pos.x - BOMB.pos.x, e.pos.z - BOMB.pos.z) < 1.1) { BOMB.state = 'carried'; BOMB.carrier = e; BOMB.mesh.visible = false; if (e.isPlayer) { banner('已拾取墨核', '带到 A 点或 B 点 · 按住 E 安放', 'go'); SFX.buy(); } break; }
  if (BOMB.state === 'planted') { BOMB.t -= dt; BOMB.beepT -= dt; if (BOMB.beepT <= 0) { BOMB.beepT = clamp(.12 + BOMB.t / BOMB_T * .95, .12, 1.1); SFX.beep(BOMB.pos, BOMB.t < 8); BOMB.blink = .09; } BOMB.blink = (BOMB.blink || 0) - dt; BOMB.light.visible = BOMB.blink > 0;
    if (BOMB.t <= 0) { BOMB.state = 'exploded'; BOMB.mesh.visible = false; const p = BOMB.pos; for (const [ox, oz] of [[0, 0], [3, 1], [-2, 3], [1, -3.5], [-3.5, -2]]) FX.explode(p.x + ox, p.y, p.z + oz); SFX.boom(p); SFX.boom(p); G.shake += clamp(2.2 - G.player.pos.distanceTo(p) / 25, 0, 2);
      endRound('red', '墨核引爆');
      for (const e of G.ents) { if (!e.alive) continue; const d = e.pos.distanceTo(p); if (d < 17) hurt(e, 420 * Math.pow(1 - d / 17, 1.4), null, null, 'chest', { x: (e.pos.x - p.x) / (d || 1), y: .4, z: (e.pos.z - p.z) / (d || 1) }, { x: e.pos.x, y: e.pos.y + 1, z: e.pos.z }); } } }
  for (const e of G.ents) if (e.alive && e.isPlayer) entInteract(e, !!G.keys.KeyE, dt);
}

function issueOrder(kind) { const pl = G.player; if (!pl || !pl.alive || G.mode !== 'comp' || !['freeze', 'live'].includes(G.state) || !['A', 'B', 'rally', 'auto'].includes(kind)) return false;
  for (const b of G.bots) if (b.team === pl.team) { b.orderToken = 0; b.path = null; b.waitT = G.now; }
  if (kind === 'auto') { G.order = null; return true; } const site = SITES[kind], x = site ? (site.x1 + site.x2) / 2 : pl.pos.x, z = site ? (site.z1 + site.z2) / 2 : pl.pos.z, token = (G.orderSerial || 0) + 1; G.orderSerial = token;
  const squad = G.bots.filter(b => b.alive && b.team === pl.team && b !== BOMB.carrier && !b.act).sort((a, b) => a.pos.distanceToSquared(pl.pos) - b.pos.distanceToSquared(pl.pos)).slice(0, 3); G.order = { kind, team: pl.team, x, z, until: G.now + 12, token, count: squad.length }; for (const b of squad) b.orderToken = token; return true; }
function passCore() { const pl = G.player; if (!pl || !pl.alive || G.mode !== 'comp' || G.state !== 'live' || BOMB.state !== 'carried' || BOMB.carrier !== pl || pl.act) return false;
  const mates = G.bots.filter(b => b.alive && b.team === pl.team && b.pos.distanceTo(pl.pos) <= 5 && !b.act && botSee(pl, b)).sort((a, b) => a.pos.distanceToSquared(pl.pos) - b.pos.distanceToSquared(pl.pos)); if (!mates.length) return false; const b = mates[0]; BOMB.carrier = b; b.role = 'carrier'; b.path = null; b.waitT = G.now; b.orderToken = 0; b.intent = '接管携核'; if (G.order && G.order.until > G.now && SITES[G.order.kind]) G.plan.site = G.order.kind; return true; }
function botOrderGoal(b, now) { const o = G.order; if (!o || o.team !== b.team || o.until <= now || b.orderToken !== o.token || BOMB.carrier === b) return null; b.intent = o.kind === 'rally' ? '小队集合' : '小队前往 ' + o.kind; const site = SITES[o.kind]; return botCoverGoal(b, site || { x1: o.x - 4, x2: o.x + 4, z1: o.z - 4, z2: o.z + 4 }, { x: o.x, z: o.z }); }

/* ---------------- bot objective brain (comp mode) ---------------- */
function randIn(r, tries = 40) { for (let k = 0; k < tries; k++) { const x = rand(r.x1, r.x2), z = rand(r.z1, r.z2), c = navIdx(x, z); if (MAP.reach[c] && (r.y === undefined || Math.abs(MAP.fh[c] - r.y) < .3)) return { x, z, cover: MAP.pen[c] }; } return { x: (r.x1 + r.x2) / 2, z: (r.z1 + r.z2) / 2 }; }
function botDangerDetour(b, gx, gz, now) { const list = G.danger && G.danger[b.team]; if (!list || !list.length || BOMB.state === 'planted' && b.team === 'blue' && BOMB.t < DEFUSE_T + 7) return null; const dx = gx - b.pos.x, dz = gz - b.pos.z, length = Math.hypot(dx, dz); if (length < 8) return null;
  for (const event of list) { if (now - event.t > 8 || b.detourEventId === event.id) continue; const k = ((event.x - b.pos.x) * dx + (event.z - b.pos.z) * dz) / (length * length); if (k < .02 || k > .95 || Math.hypot(event.x - b.pos.x - k * dx, event.z - b.pos.z - k * dz) > 3.5) continue; const side = ((b.slot || G.ents.indexOf(b)) % 2 ? 1 : -1), spread = 6 + ((b.slot || 0) % 3) * 1.5;
    for (const sign of [side, -side]) { const p = navPos(navSnap(event.x - dz / length * spread * sign, event.z + dx / length * spread * sign)); if (Math.hypot(p.x - event.x, p.z - event.z) < 4 || !navPath(b.pos.x, b.pos.z, p.x, p.z)) continue; b.detourEventId = event.id; b.intent = '绕开队友倒地区域'; return p; } } return null; }
function botCoverGoal(b, r, face, minDist = 0) { let best = null, score = -1e9; for (let k = 0; k < 8; k++) { const p = randIn(r, 18), c = navIdx(p.x, p.z); if (!MAP.reach[c] || (face && Math.hypot(p.x - face.x, p.z - face.z) < minDist)) continue; let q = (p.cover || 0) * 2 - Math.hypot(p.x - b.pos.x, p.z - b.pos.z) * .025; for (const event of G.danger && G.danger[b.team] || []) if (G.now - event.t < 8) q -= Math.max(0, 6 - Math.hypot(event.x - p.x, event.z - p.z)) * 2;
    for (const o of G.bots) if (o !== b && o.alive && o.team === b.team) { const h = o.holdPos || o.pos, d = Math.hypot(h.x - p.x, h.z - p.z); if (d < 5) q -= (5 - d) * 2; } if (face && segClear(p.x, MAP.fh[c] + 1.3, p.z, face.x, (face.y || 0) + 1, face.z)) q += 1.5; if (q > score) { best = p; score = q; } }
  if (!best) best = navPos(navSnap((r.x1 + r.x2) / 2, (r.z1 + r.z2) / 2)); b.holdPos = best; return { ...best, hold: true, face }; }
function botObjective(b, now) {
  if (G.mode !== 'comp' || BOMB.state === 'none') return null; const planted = BOMB.state === 'planted', plan = SITES[G.plan.site];
  if (b.team === 'red') {
    if (BOMB.state === 'dropped') { let best = null, bd = 1e9; for (const o of G.bots) if (o.alive && o.team === 'red') { const d = o.pos.distanceToSquared(BOMB.pos); if (d < bd) { bd = d; best = o; } } if (best === b) { b.intent = '回收墨核'; return { x: BOMB.pos.x, z: BOMB.pos.z }; } }
    if (planted) { b.intent = '交叉守核'; const p = BOMB.pos; return botCoverGoal(b, { x1: p.x - 13, x2: p.x + 13, z1: p.z - 13, z2: p.z + 13 }, p, 4); }
    if (BOMB.carrier === b) { b.intent = '携核推进'; return randIn(plan); } const ordered = botOrderGoal(b, now); if (ordered) return ordered;
    const carrier = BOMB.carrier; if (b.role === 'support' && carrier && carrier.alive && Math.hypot(b.pos.x - carrier.pos.x, b.pos.z - carrier.pos.z) > 12 && G.timer > 35) { b.intent = '护送携核'; const p = navPos(navSnap(carrier.pos.x + b.lane * 3, carrier.pos.z + 4)); return p; }
    if (b.role === 'flank' && !b.routeReady && G.timer > 45) { const point = MAP.points.find(p => p.n === (G.plan.site === 'A' ? 'SHORT' : 'MARKET')); if (b.pos.z < -10 || Math.hypot(b.pos.x - point.x, b.pos.z - point.z) < 5) b.routeReady = true; else { b.intent = '侧翼推进'; return { x: point.x + b.lane * 2, z: point.z }; } }
    b.intent = b.role === 'support' ? '掩护进点' : '前出清点'; return botCoverGoal(b, plan, { x: (plan.x1 + plan.x2) / 2, z: plan.z1 - 8, y: plan.y });
  }
  if (planted) { let def = BOMB.defuser && BOMB.defuser.alive && BOMB.defuser.act && BOMB.defuser.act.type === 'defuse' ? BOMB.defuser : null, bd = 1e9; if (!def) for (const o of G.bots) if (o.alive && o.team === 'blue') { const d = o.pos.distanceToSquared(BOMB.pos) + (o.targetVis ? 16 : 0); if (d < bd) { bd = d; def = o; } } if (def === b || BOMB.t < DEFUSE_T + 4) { b.intent = '回防拆核'; return { x: BOMB.pos.x, z: BOMB.pos.z }; } b.intent = '掩护拆核'; const p = BOMB.pos; return botCoverGoal(b, { x1: p.x - 9, x2: p.x + 9, z1: p.z - 9, z2: p.z + 9 }, p, 3); }
  const ordered = botOrderGoal(b, now); if (ordered) return ordered;
  const mine = G.ents.filter(e => e.alive && e.team === 'blue').length, foes = G.ents.filter(e => e.alive && e.team === 'red').length;
  if (mine === 1 && foes >= 3 && G.timer < 45 && !b.isPlayer) { b.saving = true; b.intent = '保存装备'; return navRandomIn(MAP.spawn.blue); }
  const it = G.intel && G.intel.blue; if (it && now - it.t < 4 && (b.role === 'rotate' || b.slot % 3 === 0) && Math.hypot(it.x - b.pos.x, it.z - b.pos.z) > 18) { b.intent = '响应报点'; b.respondedT = now; return navPos(navSnap(it.x + b.lane * 3, it.z - 3)); }
  b.intent = '交叉架点'; if (b.holdSite === 'MID') return botCoverGoal(b, MAP.midHold, MAP.midHold.face);
  const r = SITES[b.holdSite]; return botCoverGoal(b, r, { x: (r.x1 + r.x2) / 2, z: r.z2 + 14, y: r.y });
}
function botHoldYaw(b, face) {          // pre-aim: look down the route the enemy is most likely to arrive from
  if (face) return Math.atan2(-(face.x - b.pos.x), -(face.z - b.pos.z)); const s = MAP.spawn[b.team === 'red' ? 'blue' : 'red'], p = navPath(b.pos.x, b.pos.z, (s.x1 + s.x2) / 2, (s.z1 + s.z2) / 2); if (!p || p.length < 2) return b.yaw;
  let acc = 0, i = 1; for (; i < p.length - 1; i++) { acc += Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z); if (acc > 9) break; } return Math.atan2(-(p[i].x - b.pos.x), -(p[i].z - b.pos.z));
}

/* ---------------- utility grenades ---------------- */
const SMOKES = []; let _smokeFm = null, _smokeLm = null;
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
/* ---------------- ladders & surfaces ---------------- */
function ladderAt(p) { for (const l of MAP.ladders) if (p.x > l.x1 && p.x < l.x2 && p.z > l.z1 && p.z < l.z2 && p.y < l.y2 + .05 && p.y > l.y1 - .1) return l; return null; }
function surfaceAt(p) { const x = p.x, y = p.y, z = p.z; for (const q of MAP.surfaces || []) if (x > q[0] && z > q[1] && x < q[2] && z < q[3]) return q[4]; if (MAP.id !== 'papertown') return y > .15 ? 'wood' : 'concrete'; if (y > 4.5 && x > -42.4 && x < -30 && z > -36.4 && z < -21.6) return 'metal'; if (y < .3 && x > -41 && x < -8 && z > -13 && z < 13) return 'tile'; if (y > .2 && x > -44 && x < -37 && z > 20 && z < 38) return 'wood'; if (y > .7 && y < 1.3 && x > 32 && x < 54 && z > -38 && z < -22) return 'stone'; if (y > .15) return 'wood'; return 'concrete'; }

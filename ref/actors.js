'use strict';
/* ============ INK STRIKE · actors: soldier models, hitboxes, bot AI ============ */
const DIFFS = [{ n: '新兵', react: .85, err: 2.9, turn: .75, head: .05, see: 48 }, { n: '老兵', react: .5, err: 1.75, turn: .95, head: .16, see: 64 }, { n: '精英', react: .3, err: 1.05, turn: 1.25, head: .34, see: 78 }];
const BOT_NAMES = ['墨鸦', '砚台', '宣纸', '狼毫', '朱砂', '飞白', '留白', '皴法', '勾线', '泼墨', '篆刻', '淡彩', '枯笔', '浓墨', '拓片', '镇纸', '印泥', '走笔'];
const ACTOR_STYLES = [{ id: 'scribe', name: '折锋', desc: '分片护盔 · 通讯耳机 · 轻装胸挂' }, { id: 'scout', name: '巡纸', desc: '折沿软帽 · 双镜护目 · 短围巾' }, { id: 'warden', name: '守砚', desc: '封面护盔 · 窄缝面罩 · 加宽护肩' }];
let ACTOR_LM = null; const _skGeo = {}, TEAM_INK = { red: 0x9e1c1c, blue: 0x1e4f8c };

function makeEnt(team, name, isPlayer) {
  return { team, name, isPlayer: !!isPlayer, pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, hp: 100, armor: 0, helmet: false, alive: false, hw: .32, hgt: 1.8, onGround: true, stepSmooth: 0, crouchAmt: 0,
    money: 800, kills: 0, deaths: 0, weapon: 'p9', mag: 12, spottedT: -9, stepAcc: 0, hitWall: false, landed: 0 };
}
const eyeY = e => 1.62 - .47 * e.crouchAmt;

function soldierParts(team, styleId = 'scribe') {
  const cacheKey = team + ':' + styleId; if (_skGeo[cacheKey]) return _skGeo[cacheKey];
  const col = team === 'red' ? RED : BLUE, U = new Sk('sun'), Hd = new Sk('sun'), Th = new Sk('sun'), Sh = new Sk('sun'), Ft = new Sk('sun'), C = { tint: col, tone: 0 };
  inkBlock(U, .34, .19, .23, 0, .055, 0, { tone: .33 }); inkBlock(U, .42, .43, .25, 0, .35, .015); inkBlock(U, .425, .355, .285, 0, .37, -.005, C);
  inkBlock(U, .305, .26, .032, 0, .395, -.157, { ...C, bevel: .24 }); inkBlock(U, .36, .06, .25, 0, .11, 0, { tone: 1 }); inkBlock(U, .065, .052, .024, 0, .11, -.14, { tone: .33 });
  for (const x of [-.155, .155]) { inkLimb(U, [x, .55, -.105], [x, .22, -.15], .04, .02, { tone: .33 }); inkBlock(U, .052, .035, .027, x, .48, -.14, { tone: 1 }); }
  for (let i = 0; i < 3; i++) { const x = -.11 + i * .11; inkBlock(U, .094, .125, .052, x, .24, -.174, { tone: .33 }); U.line([x - .034, .284, -.203, x + .034, .284, -.203, x - .027, .236, -.203, x + .027, .236, -.203]); }
  inkBlock(U, .3, .285, .13, 0, .365, .195, { tone: .33 }); inkBlock(U, .19, .18, .025, 0, .365, .27, C); U.line([-.075, .385, .284, .075, .385, .284, -.075, .35, .284, .075, .35, .284]);
  inkBlock(U, .115, .075, .065, 0, .59, 0, { tone: .33 }); for (const x of [-.245, .245]) { inkBlock(U, .145, .115, .18, x, .535, 0, { ...C, r: [0, 0, x > 0 ? -.18 : .18] }); inkBlock(U, .025, .045, .09, x * 1.21, .527, 0, { tone: 0 }); }
  inkLimb(U, [.245, .49, 0], [.285, .27, -.13], .13, .13); inkBlock(U, .135, .10, .13, .285, .28, -.14, { tone: .33 }); inkLimb(U, [.285, .27, -.14], [.145, .33, -.37], .105, .11, { tone: .33 }); inkBlock(U, .092, .088, .12, .13, .34, -.4, { tone: 1 });
  inkLimb(U, [-.245, .49, 0], [-.26, .275, -.24], .13, .13); inkBlock(U, .13, .105, .13, -.26, .275, -.24, { tone: .33 }); inkLimb(U, [-.26, .275, -.24], [.08, .37, -.64], .105, .105, { tone: .33 }); inkBlock(U, .095, .075, .12, .10, .38, -.675, { tone: 1 });
  inkBlock(U, .07, .10, .033, -.105, .46, -.18, { tone: .33 }); U.line([-.135, .46, -.198, -.085, .46, -.198, -.124, .445, -.198, -.096, .445, -.198]);
  Hd.add(new THREE.SphereGeometry(.5, 10, 6).scale(.21, .25, .225), new THREE.Matrix4().makeTranslation(0, .13, 0), { tone: team === 'red' ? .33 : 0, ea: 40 });
  if (styleId !== 'scout') { Hd.add(new THREE.SphereGeometry(.5, 12, 6).scale(.285, .19, .29), new THREE.Matrix4().makeTranslation(0, .225, .005), { ...C, ea: 40 }); inkBlock(Hd, .28, .032, .3, 0, .18, -.012, { tone: 1 }); inkBlock(Hd, .21, .069, .035, 0, .135, -.116, { tint: GLASS, tone: .33 }); inkBlock(Hd, .022, .072, .038, 0, .134, -.118, C); inkBlock(Hd, .145, .075, .055, 0, .067, -.092, { tone: .33 });
    for (const x of [-.133, .133]) { Hd.cyl(.047, .047, .036, 8, x, .146, .01, { ax: 'x', tone: .33 }); Hd.line([x, .165, .02, x * .6, .035, -.07]); } Hd.poly([[.14, .13, -.015], [.14, .05, -.105], [.085, .05, -.145]]); inkBlock(Hd, .045, .025, .025, .066, .05, -.145, { tone: 1 });
  } else { Hd.add(new THREE.SphereGeometry(.5, 10, 5).scale(.29, .105, .27), Hd._m(.012, .267, .008, [0, 0, -.15]), { ...C, ea: 40 }); inkBlock(Hd, .224, .035, .238, 0, .226, 0, C); inkBlock(Hd, .174, .035, .021, 0, .155, -.114, { tone: 1 }); for (const x of [-.044, .044]) inkBlock(Hd, .061, .016, .008, x, .157, -.128, { tone: 0 });
    inkBlock(Hd, .207, .085, .24, 0, .065, .005, { ...C, bevel: .22 }); Hd.line([-.083, .082, -.119, .084, .039, -.119, -.083, .043, -.119, .073, .076, -.119]); inkLimb(Hd, [.09, .04, .08], [.135, -.09, .10], .06, .025, C); inkBlock(Hd, .026, .036, .012, -.048, .253, -.128, { tone: 0 }); }
  if (styleId === 'scout') { for (const x of [-.052, .052]) { inkBlock(Hd, .088, .052, .03, x, .158, -.142, { tint: GLASS, tone: .33 }); inkBlock(Hd, .09, .012, .038, x, .19, -.141, { tone: 1 }); } inkLimb(U, [.105, .58, .17], [.19, .37, .2], .085, .028, { ...C, tone: .33 }); }
  if (styleId === 'warden') { inkBlock(Hd, .237, .123, .06, 0, .073, -.121, { tone: .33 }); inkBlock(Hd, .205, .025, .026, 0, .139, -.159, { tint: GLASS, tone: 1 }); for (const x of [-.245, .245]) inkBlock(U, .17, .145, .2, x, .56, 0, { ...C, tone: .33, bevel: .24 }); inkBlock(U, .16, .048, .03, 0, .495, -.197, { tone: 1 }); }
  inkLimb(Th, [0, -.01, 0], [0, -.39, 0], .185, .21); inkBlock(Th, .105, .13, .055, .087, -.2, .01, { tone: .33 });
  inkBlock(Sh, .165, .132, .063, 0, -.025, -.092, { tone: .33 }); inkBlock(Sh, .105, .088, .025, 0, -.025, -.13, C); inkLimb(Sh, [0, -.07, 0], [0, -.395, 0], .153, .17, { tone: .33 });
  inkBlock(Ft, .172, .105, .275, 0, -.02, -.035, { tone: 1 }); inkBlock(Ft, .179, .028, .286, 0, -.076, -.04, { tone: .33 }); for (let i = 0; i < 3; i++) Ft.line([-.045, .023 - i * .014, -.103 - i * .01, .045, .023 - i * .014, -.103 - i * .01]);
  return _skGeo[cacheKey] = { U, Hd, Th, Sh, Ft };
}
function buildSoldier(team, styleId = 'scribe') {
  if (!ACTOR_STYLES.some(s => s.id === styleId)) styleId = 'scribe';
  if (!ACTOR_LM) ACTOR_LM = { red: lineMat({ width: 1.35, color: TEAM_INK.red, fog: false }), blue: lineMat({ width: 1.35, color: TEAM_INK.blue, fog: false }) };
  const lm = ACTOR_LM[team], src = soldierParts(team, styleId), fm = fillMat({ objSpace: true, freq: 24, hatch: .7, hw: .12, fog: .0045 }), key = '_b' + team; fm.uniforms.uInk.value.set(INK);
  if (!src[key]) src[key] = { U: src.U.bake(fm, lm), Hd: src.Hd.bake(fm, lm), Th: src.Th.bake(fm, lm), Sh: src.Sh.bake(fm, lm), Ft: src.Ft.bake(fm, lm) };
  const inst = b => { const g = new THREE.Group(); g.add(new THREE.Mesh(b.fill.geometry, fm)); g.add(new LineSegments2(b.ink.geometry, lm)); return g; };
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const leg = () => { const g = inst(src[key].Th), shin = inst(src[key].Sh), foot = inst(src[key].Ft); shin.position.y = -.405; foot.position.y = -.405; shin.add(foot); g.add(shin); g.shin = shin; g.foot = foot; return g; }, upper = inst(src[key].U), head = inst(src[key].Hd), legL = leg(), legR = leg(), gun = new THREE.Group();
  upper.position.y = .9; head.position.y = .62; upper.add(head); gun.position.set(.13, .42, -.38); upper.add(gun);
  legL.position.set(-.11, .9, 0); legR.position.set(.11, .9, 0); root.add(upper, legL, legR);
  const mark = new THREE.Mesh(new THREE.ConeGeometry(.11, .2, 3), new THREE.MeshBasicMaterial({ color: team === 'red' ? RED : BLUE, depthTest: true, transparent: true, opacity: .85 })); mark.rotation.x = Math.PI; mark.position.y = 2.2; mark.renderOrder = 4; mark.visible = false; root.add(mark);
  return { root, upper, head, legL, legR, gun, fm, lm, mark, styleId, phase: rand(6), shadowSlot: -1, lineLOD: null };
}
function disposeBotModel(b) { if (!b.model) return; const m = b.model; m.root.removeFromParent(); if (ACTOR_SHADOW && m.shadowSlot >= 0) { ACTOR_SHADOW.alpha.setX(m.shadowSlot, 0); ACTOR_SHADOW.alpha.needsUpdate = true; ACTOR_SHADOW.free.push(m.shadowSlot); } m.fm.dispose(); m.mark.geometry.dispose(); m.mark.material.dispose(); b.model = null; }
function setActorStyle(id) { if (!ACTOR_STYLES.some(s => s.id === id)) return false; G.set.actorStyle = id; localStorage.setItem('inkstrike', JSON.stringify(G.set)); if (G.player) G.player.styleId = id;
  for (const b of G.bots) if (b.team === G.team && b.model) { const old = b.model, parent = old.root.parent, visible = old.root.visible; disposeBotModel(b); b.styleId = id; b.model = buildSoldier(b.team, id); if (parent) parent.add(b.model.root); b.model.root.visible = visible; b.model.mark.visible = b.alive; b.model.gun.add(worldGun(b.weapon, b.model.fm, b.model.lm)); animSoldier(b, 0); } if (G.player && VM.cur) { const pose = { reloadT: VM.reloadT, drawT: VM.drawT, atk: VM.atk, insp: VM.insp, cyc: VM.cyc }; VM.show(G.player.cur); Object.assign(VM, pose); } return true; }
function makeActorPreviews(targetRenderer) { const result = {}, size = targetRenderer.getSize(new THREE.Vector2()), ratio = targetRenderer.getPixelRatio(), color = targetRenderer.getClearColor(new THREE.Color()), alpha = targetRenderer.getClearAlpha(), auto = targetRenderer.autoClear, lineSizes = LINE_MATS.map(m => [m, m.resolution.clone()]);
  try { const stage = new THREE.Scene(), cam = new THREE.PerspectiveCamera(31, .8, .1, 20); cam.position.set(2.35, 1.65, -4.3); cam.lookAt(0, .92, 0); targetRenderer.setPixelRatio(1); targetRenderer.setSize(240, 300, false); targetRenderer.setClearColor(PAPER, 1); targetRenderer.autoClear = true;
    for (const style of ACTOR_STYLES) { const model = buildSoldier(G.team || 'blue', style.id); try { for (const lm of LINE_MATS) lm.resolution.set(240, 300); model.mark.visible = false; model.gun.add(worldGun('m4', model.fm, model.lm)); model.root.rotation.y = -.12; model.root.traverse(o => o.frustumCulled = false); stage.add(model.root); targetRenderer.clear(); targetRenderer.render(stage, cam); result[style.id] = targetRenderer.domElement.toDataURL('image/png'); } finally { disposeBotModel({ model }); } }
  } finally { targetRenderer.autoClear = auto; targetRenderer.setPixelRatio(ratio); targetRenderer.setSize(size.x, size.y, false); targetRenderer.setClearColor(color, alpha); for (const [m, resolution] of lineSizes) m.resolution.copy(resolution); for (const m of LINE_MATS) if (!lineSizes.some(q => q[0] === m)) m.resolution.set(innerWidth, innerHeight); } return result; }
function setEntWeapon(e, key) { e.weapon = key; const w = WEAPONS[key]; e.mag = w.mag || 0; e.reloadT = 0; if (e.model) { const g = e.model.gun; while (g.children.length) g.remove(g.children[0]); g.add(worldGun(key, e.model.fm, e.model.lm)); } }
function animSoldier(e, dt) {
  const m = e.model, c = e.crouchAmt; m.root.position.copy(e.pos); m.root.rotation.y = e.yaw;
  if (!e.alive) { m.fm.uniforms.uFlash.value = damp(m.fm.uniforms.uFlash.value, 0, 14, dt); e.deathT += dt; const k = 1 - Math.pow(1 - Math.min(1, e.deathT / .55), 2); m.root.rotation.x = k * 1.5 * e.fallDir; m.root.position.y = e.pos.y + k * .13; m.legL.rotation.x = k * .25; m.legR.rotation.x = -k * .3; m.upper.rotation.x = 0; actorContact(e); if (e.deathT > 14) m.root.visible = false; return; }
  // Gait from real ground displacement (never from wished velocity), in the model's local frame so strafes and backpedals step the right way.
  const lp = m.lastP || (m.lastP = { x: e.pos.x, z: e.pos.z, yaw: e.yaw }), idt = dt > 1e-4 ? 1 / dt : 0; let vx = (e.pos.x - lp.x) * idt, vz = (e.pos.z - lp.z) * idt; if (vx * vx + vz * vz > 100) vx = vz = 0;
  const yawRate = angDiff(e.yaw, lp.yaw) * idt; lp.x = e.pos.x; lp.z = e.pos.z; lp.yaw = e.yaw; m.vx = damp(m.vx || 0, vx, 12, dt); m.vz = damp(m.vz || 0, vz, 12, dt);
  const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw); let lx = cy * m.vx - sy * m.vz, lz = sy * m.vx + cy * m.vz, sp = Math.hypot(lx, lz);
  if (sp < .35 && Math.abs(yawRate) > 1.6) { sp = Math.min(1.1, Math.abs(yawRate) * .35); lx = -Math.sign(yawRate) * sp; lz = 0; }   // turning on the spot shuffles the feet
  // Stance foot travels exactly 2A while the body covers 2A: cadence = speed * duty / 2A, so planted feet never skate. Runs get a flight phase (lower duty).
  const run = clamp((sp - 2.9) / 1.7, 0, 1), cr = 1 - c * .35, gw = clamp((sp - .12) / .55, 0, 1), A = clamp(.22 + sp * .03, .22, .37) * cr, duty = .62 - .3 * run, air = e.onGround === false;
  if (!air && sp > .05) m.gait = ((m.gait || 0) + sp * duty / (2 * A) * dt) % 1; const g = m.gait || 0;
  const hip = Math.min(.9 - .405 * c, Math.sqrt(.6561 - (A * gw) ** 2) + .075) - gw * (.018 + .028 * run) * (.5 + .5 * Math.cos((g - .12 * run) * 4 * Math.PI)) - (air ? .06 : 0);
  const dX = sp > 1e-3 ? lx / sp : 0, dZ = sp > 1e-3 ? lz / sp : -1;
  const step = (off, rest) => { const t = (g + off) % 1; let p, lift = 0, roll = 0;
    if (t < duty) { const u = t / duty; p = A * (1 - 2 * u); if (u > .72) roll = -(u - .72) / .28 * .42; }
    else { const u = (t - duty) / (1 - duty), k = u * u * (3 - 2 * u); p = -A + 2 * A * k; lift = Math.sin(Math.PI * u) * (.08 + .1 * run) * cr; roll = u < .35 ? -.42 * (1 - u / .35) : u > .72 ? (u - .72) / .28 * .28 : 0; }
    if (air) return [0, rest - .04, .22 + rest, .15]; return [dX * p * gw, dZ * p * gw + rest * (1 - gw), lift * gw, roll * gw]; };
  const pose = (leg, [ox, oz, lift, roll]) => { const dy = hip - .09 - lift, v = Math.hypot(dy, ox), d = Math.min(.8099, Math.hypot(v, oz)), bend = Math.acos(clamp(d / .81, 0, 1)), aim = Math.atan2(-oz, v), side = Math.atan2(ox, dy);
    leg.position.y = hip; leg.scale.y = 1; leg.rotation.set(aim + bend, 0, side, 'ZXY'); leg.shin.rotation.x = -2 * bend; leg.foot.rotation.set(-aim + bend + roll, 0, -side, 'XZY'); };   // side swing outermost keeps full lateral reach
  pose(m.legL, step(0, -.09)); pose(m.legR, step(.5, .06));
  const fwd = sp > 1e-3 ? -lz / sp : 0, sw = Math.sin(g * 2 * Math.PI) * gw, lean = (.04 + .08 * run) * gw * fwd;
  m.upper.position.y = hip; m.upper.rotation.set(e.pitch * .7 + (e.flinch || 0) * .3 - lean, sw * .045 * (1 - c * .5), -sw * .03); m.head.rotation.set(e.pitch * .25 + lean * .8, -sw * .035, sw * .02); if (e.flinch) e.flinch = damp(e.flinch, 0, 10, dt); actorContact(e); actorLineLOD(e);
  m.fm.uniforms.uFlash.value = damp(m.fm.uniforms.uFlash.value, 0, 14, dt);
}

let ACTOR_SHADOW = null; const _actorFar = new WeakMap(), _actorSM = new THREE.Matrix4(), _actorSP = new V3(), _actorSS = new V3(), _actorSQ = new THREE.Quaternion(), _actorUp = new V3(0, 1, 0);
function actorContact(e) { const m = e.model; if (!ACTOR_SHADOW) { const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2); const alpha = new THREE.InstancedBufferAttribute(new Float32Array(64), 1); geo.setAttribute('contactAlpha', alpha); const mat = new THREE.ShaderMaterial({ uniforms: { ink: { value: new THREE.Color(INK) } }, vertexShader: 'attribute float contactAlpha; varying vec2 q; varying float a; void main(){q=uv*2.0-1.0;a=contactAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}', fragmentShader: 'uniform vec3 ink; varying vec2 q; varying float a; void main(){float k=pow(max(0.0,1.0-dot(q,q)),1.8)*a*.29;if(k<.003)discard;gl_FragColor=vec4(ink,k);}', transparent: true, depthWrite: false, depthTest: true }); const mesh = new THREE.InstancedMesh(geo, mat, 64); mesh.frustumCulled = false; mesh.renderOrder = 1; scene.add(mesh); ACTOR_SHADOW = { mesh, alpha, free: Array.from({ length: 64 }, (_, i) => 63 - i) }; }
  if (m.shadowSlot < 0) m.shadowSlot = ACTOR_SHADOW.free.pop(); if (m.shadowSlot === undefined) return; const p = e.pos;
  if (!m.contactPos || Math.hypot(p.x - m.contactPos.x, p.y - m.contactPos.y, p.z - m.contactPos.z) > .22) { const h = rayWorld(p.x, p.y + .12, p.z, 1e-9, -1, 1e-9, 3); m.contactY = Math.max(MAP.floorAt(p.x, p.z), h && h.ny > .5 ? p.y + .12 - h.t : -99); m.contactPos = { x: p.x, y: p.y, z: p.z }; }
  const height = Math.max(0, p.y - m.contactY), fade = clamp(1 - height * 1.65, 0, 1) * (e.alive ? 1 : clamp(1 - e.deathT / 2, 0, 1)); _actorSP.set(p.x, m.contactY + .014, p.z); _actorSS.set(.42 + height * .15, 1, .29 + height * .1); _actorSQ.setFromAxisAngle(_actorUp, e.yaw); _actorSM.compose(_actorSP, _actorSQ, _actorSS); ACTOR_SHADOW.mesh.setMatrixAt(m.shadowSlot, _actorSM); ACTOR_SHADOW.mesh.instanceMatrix.needsUpdate = true; ACTOR_SHADOW.alpha.setX(m.shadowSlot, fade); ACTOR_SHADOW.alpha.needsUpdate = true; }
function actorLineLOD(e) { const m = e.model, far = e.pos.distanceToSquared(camera.position) > 22 * 22; if (m.lineLOD === far && m.lineGun === e.weapon) return; m.lineLOD = far; m.lineGun = e.weapon;
  m.root.traverse(o => { if (!o.isLineSegments2) return; if (!o.userData.actorNear) o.userData.actorNear = o.geometry; const near = o.userData.actorNear; if (!far) { o.geometry = near; return; } let simple = _actorFar.get(near); if (!simple) { const a = near.attributes.instanceStart, b = near.attributes.instanceEnd, points = []; for (let i = 0; i < a.count; i++) { const dx = a.getX(i) - b.getX(i), dy = a.getY(i) - b.getY(i), dz = a.getZ(i) - b.getZ(i); if (dx * dx + dy * dy + dz * dz >= .0081) points.push(a.getX(i), a.getY(i), a.getZ(i), b.getX(i), b.getY(i), b.getZ(i)); } simple = new LineSegmentsGeometry(); simple.setPositions(points.length ? points : [0, 0, 0, 0, 0, 0]); _actorFar.set(near, simple); } o.geometry = simple; }); }

/* ---------------- hitboxes ---------------- */
function rayBox(ox, oy, oz, dx, dy, dz, x1, y1, z1, x2, y2, z2) {
  let t1 = (x1 - ox) / dx, t2 = (x2 - ox) / dx, tn = Math.min(t1, t2), tf = Math.max(t1, t2); t1 = (y1 - oy) / dy; t2 = (y2 - oy) / dy; tn = Math.max(tn, Math.min(t1, t2)); tf = Math.min(tf, Math.max(t1, t2));
  t1 = (z1 - oz) / dz; t2 = (z2 - oz) / dz; tn = Math.max(tn, Math.min(t1, t2)); tf = Math.min(tf, Math.max(t1, t2)); return (tn <= tf && tf > 0) ? Math.max(tn, 0) : -1;
}
function rayEnt(ox, oy, oz, dx, dy, dz, e) {
  const p = e.pos, k = 1 - .27 * e.crouchAmt; let bt = 1e9, part = null;
  const hx = p.x - ox, hy = p.y + eyeY(e) + .03 - oy, hz = p.z - oz, b = hx * dx + hy * dy + hz * dz, c2 = hx * hx + hy * hy + hz * hz - .17 * .17, disc = b * b - c2;
  if (disc > 0 && b > 0) { const t = b - Math.sqrt(disc); if (t > 0) { bt = t; part = 'head'; } }
  const tests = [['legs', 0, .8 * k, .2, .75], ['stomach', .8 * k, 1.05 * k, .24, 1.25], ['chest', 1.05 * k, 1.47 * k, .27, 1]];
  for (const q of tests) { const t = rayBox(ox, oy, oz, dx, dy, dz, p.x - q[3], p.y + q[1], p.z - q[3], p.x + q[3], p.y + q[2], p.z + q[3]); if (t >= 0 && t < bt) { bt = t; part = q[0]; } }
  return part ? { t: bt, part, mul: part === 'head' ? 4 : part === 'legs' ? .75 : part === 'stomach' ? 1.25 : 1 } : null;
}

/* ---------------- bots ---------------- */
function makeBot(team, name, scene) {
  const b = makeEnt(team, name, false), serial = Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0); b.styleId = team === G.team ? G.set.actorStyle || 'scribe' : ACTOR_STYLES[serial % ACTOR_STYLES.length].id; b.model = buildSoldier(team, b.styleId); scene.add(b.model.root); b.model.root.visible = false;
  Object.assign(b, { target: null, targetVis: false, lastSeen: new V3(), lastSeenT: -9, reactT: 0, aimErr: .07, aimHead: false, nextThink: rand(.2), nextFire: 0, burstN: 0, burstLen: 4, burstPause: 0, strafeDir: 0, strafeT: 0,
    path: null, pi: 0, waitT: 0, alertT: -9, alertYaw: 0, stuckT: 0, reloadT: 0, deathT: 0, fallDir: 1, state: 'roam', repathT: 0, lookT: 0, lookYaw: 0, jumpT: 0 });
  return b;
}
function resetBotAwareness(b) { b.target = null; b.targetVis = false; b.lastSeen.copy(b.pos); b.lastSeenT = b.lastVisualT = b.heardT = b.alertT = -9; b.heard = null; b.flashAvoidT = 0; b.utilitySolution = null; b.yielding = false; b.fireClear = true; b.state = 'roam'; b.holdGoal = b.holdYaw = b.holdPos = null; b.orderToken = 0; b.saving = false; b.reactT = 0; b.aimErr = .07; b.nextThink = G.now + rand(.1); b.strafeT = b.strafeDir = b.crouchHold = b.stuckT = b.jumpT = 0; b.alertYaw = b.yaw; b.lastAimY = b.pos.y + 1.2; b.intent = '部署'; b.threat = b.coverPlan = null; b.underFireUntil = b.threatReactT = b.coverThinkT = b.coverNext = b.sniperObserveT = b.casualtyT = 0; b.detourEventId = 0; if (b.model) b.model.contactPos = null; }
function botCanObserve(b, e) { if (!b || !e || !b.alive || G.now < (b.blindT || 0)) return false; const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z, d = Math.hypot(dx, dz); return d < DIFFS[G.diff].see && (d < 3.5 || Math.abs(angDiff(Math.atan2(-dx, -dz), b.yaw)) < 1.05) && botSee(b, e); }
function botThreat(b, source, kind, seen, now = G.now) { if (!b || !b.alive || b.dummy) return; const old = b.threat, p = source.pos || source; let x = p.x, z = p.z, y = p.y === undefined ? MAP.floorAt(x, z) + 1.5 : p.y + (source.pos ? eyeY(source) : 0);
  if (!seen) { const a = Math.atan2(p.x - b.pos.x, p.z - b.pos.z) + rand(-.2, .2), distance = 16 + (b.slot || 0) % 4; x = b.pos.x + Math.sin(a) * distance; z = b.pos.z + Math.cos(a) * distance; y = b.pos.y + 1.5; }
  b.threat = { x, y, z, t: now, until: now + (kind === 'sniper' ? 7 : 4), kind, exact: !!seen }; b.threatReactT = now + .08 + DIFFS[G.diff].react * .2; if (!old || now - old.t > .7) b.coverThinkT = Math.min(b.coverThinkT || 0, now + .12); }
function botOnDamage(victim, attacker, wkey) { if (!victim || victim.isPlayer || victim.dummy || !victim.alive || victim.hp <= 0 || !attacker || attacker.team === victim.team || G.state !== 'live') return; const seen = botCanObserve(victim, attacker), sniper = WEAPONS[wkey] && WEAPONS[wkey].bolt; botThreat(victim, attacker, sniper ? 'sniper' : 'hit', seen); victim.underFireUntil = G.now + 2.2; victim.intent = '受击寻找掩体'; }
function botOnDeath(victim, attacker, wkey) { if (!victim || G.state !== 'live' || G.mode === 'range') return 0; let witnesses = 0; for (const b of G.bots) { if (b === victim || !b.alive || b.team !== victim.team || b.pos.distanceTo(victim.pos) > 25 || !botCanObserve(b, victim)) continue; witnesses++; b.casualtyT = G.now; const seen = attacker && attacker.alive && attacker.team !== b.team && botCanObserve(b, attacker); if (seen) botThreat(b, attacker, WEAPONS[wkey] && WEAPONS[wkey].bolt ? 'sniper' : 'casualty', true); else { b.threat = { x: victim.pos.x, y: victim.pos.y + 1.4, z: victim.pos.z, t: G.now, until: G.now + 4, kind: 'casualty', exact: false }; b.threatReactT = G.now + DIFFS[G.diff].react * .4; } b.coverThinkT = 0; b.path = null; b.waitT = G.now + .12; }
  if (witnesses) { const lists = G.danger || (G.danger = { red: [], blue: [] }), list = lists[victim.team] || (lists[victim.team] = []); list.push({ x: victim.pos.x, z: victim.pos.z, t: G.now, id: (G.dangerSerial = (G.dangerSerial || 0) + 1) }); while (list.length > 6) list.shift(); } return witnesses; }
function botOnShot(shooter, wkey, origin, direction) { const w = WEAPONS[wkey]; if (!w || !w.bolt || !shooter || G.state !== 'live' || G.mode === 'range') return 0; const o = origin || new V3(shooter.pos.x, shooter.pos.y + eyeY(shooter), shooter.pos.z), cp = Math.cos(shooter.pitch), d = direction ? direction.clone().normalize() : new V3(-Math.sin(shooter.yaw) * cp, Math.sin(shooter.pitch), -Math.cos(shooter.yaw) * cp), hit = rayWorld(o.x, o.y, o.z, d.x || 1e-9, d.y || 1e-9, d.z || 1e-9, 85), limit = hit ? hit.t : 85; let count = 0;
  for (const b of G.bots) { if (!b.alive || b.dummy || b.team === shooter.team || b.pos.distanceTo(shooter.pos) < 12) continue; const dx = b.pos.x - o.x, dy = b.pos.y + 1.2 - o.y, dz = b.pos.z - o.z, along = dx * d.x + dy * d.y + dz * d.z; if (along < 0 || along > limit + .1 || Math.hypot(dx - d.x * along, dy - d.y * along, dz - d.z * along) > 2.4) continue; botThreat(b, shooter, 'sniper', botCanObserve(b, shooter)); b.underFireUntil = G.now + 2; count++; } return count; }
function botCoverOccluded(threat, p, y, crouch) { const top = eyeY({ crouchAmt: crouch ? 1 : 0 }) + .03 + .17, chest = 1.26 * (crouch ? .73 : 1); return !segClear(threat.x, threat.y, threat.z, p.x, y + top, p.z) && !segClear(threat.x, threat.y, threat.z, p.x, y + chest, p.z); }
function botUrgentDefuse(b, now) { const urgent = G.state === 'live' && G.mode === 'comp' && b.team === 'blue' && BOMB.state === 'planted' && BOMB.t < DEFUSE_T + 5; if (urgent && b.coverPlan) { b.coverPlan = b.path = b.holdGoal = b.holdYaw = null; b.waitT = now - .001; } return urgent; }
function botFindCover(b, threat, now) { const candidates = [], current = b.pos, offset = (b.slot || G.ents.indexOf(b)) * .63; for (const radius of [2.5, 5, 8]) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + offset, p = navPos(navSnap(current.x + Math.sin(a) * radius, current.z + Math.cos(a) * radius)), cell = navIdx(p.x, p.z), distance = Math.hypot(p.x - current.x, p.z - current.z); if (!MAP.reach[cell] || distance < 1.3 || distance > 10 || Math.abs(MAP.fh[cell] - current.y) > 1.2) continue;
    const y = MAP.fh[cell], hidden = botCoverOccluded(threat, p, y, false), crouch = botCoverOccluded(threat, p, y, true); let score = (hidden ? 16 : crouch ? 8 : 0) - distance * .65 + Math.min(3, Math.hypot(p.x - threat.x, p.z - threat.z) - Math.hypot(current.x - threat.x, current.z - threat.z)) * .25;
    for (const mate of G.bots) if (mate !== b && mate.alive && mate.team === b.team) { const q = mate.coverPlan ? mate.coverPlan.goal : mate.pos, sep = Math.hypot(p.x - q.x, p.z - q.z); if (sep < 3) score -= (3 - sep) * 3; } if (hidden || crouch) candidates.push({ p, score, crouch: !hidden && crouch }); }
  candidates.sort((a, b) => b.score - a.score); for (const q of candidates.slice(0, 5)) { const path = navPath(current.x, current.z, q.p.x, q.p.z); if (!path || path.length < 2 || path.length > 30) continue; b.coverPlan = { path, pi: 1, goal: q.p, crouch: q.crouch, until: now + 4.2, settled: 0 }; b.coverNext = now + 3.5; b.intent = threat.kind === 'sniper' ? '避开狙击线' : '受压转移掩体'; return true; } return false; }
function botTacticalMotion(b, now) { if (b.act || G.state !== 'live' || b.dummy || now < (b.blindT || 0) || botUrgentDefuse(b, now)) return null;
  if (b.targetVis && b.target && b.target.alive && WEAPONS[b.target.weapon] && WEAPONS[b.target.weapon].bolt && b.pos.distanceTo(b.target.pos) > 16 && now > b.reactT && now > (b.sniperObserveT || 0) && botCanObserve(b, b.target)) { b.sniperObserveT = now + .6; botThreat(b, b.target, 'sniper', true, now); }
  const danger = b.threat; if (!b.coverPlan && danger && now < danger.until && now >= (b.threatReactT || 0) && now >= (b.coverThinkT || 0) && now >= (b.coverNext || 0)) { b.coverThinkT = now + .75 + (b.slot || 0) % 3 * .08; botFindCover(b, danger, now); }
  const plan = b.coverPlan; if (!plan) return null; if (now > plan.until) { b.coverPlan = null; b.path = null; b.waitT = now; b.coverNext = now + .8; return null; }
  let p = plan.path[plan.pi]; while (p && Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < .5) p = plan.path[++plan.pi]; if (!p) { if (!plan.settled) { plan.settled = now; plan.until = now + 1 + (b.slot || 0) % 3 * .35; } b.intent = '掩体停留 · 准备换侧'; return { x: 0, z: 0, hold: true, crouch: plan.crouch }; } const dx = p.x - b.pos.x, dz = p.z - b.pos.z, d = Math.hypot(dx, dz); b.intent = danger && danger.kind === 'sniper' ? '避开狙击线' : '受压转移掩体'; return { x: dx / d, z: dz / d, hold: false, crouch: false }; }
// A grid snap can land across a thin door when collision leaves a Bot in an outside corner.
// Only stalled routes scan nearby entry cells; every approach is swept with the real body.
function botRecoverPath(b, gx, gz) { const from = b.pos, fy = supportY(b, MAP.near(from.x, from.z)), candidates = [], ci = Math.floor(from.x), cj = Math.floor(from.z);
  for (let x = ci - 3; x <= ci + 3; x++) for (let z = cj - 3; z <= cj + 3; z++) { const px = x + .5, pz = z + .5, c = navIdx(px, pz), y = MAP.fh[c], d = Math.hypot(px - from.x, pz - from.z); if (!MAP.reach[c] || d < .2 || d > 3.5 || Math.abs(y - fy) > .56) continue; let clear = true; for (let k = 1, n = Math.ceil(d / .15); k <= n; k++) { const t = k / n, sx = lerp(from.x, px, t), sz = lerp(from.z, pz, t); if (entOverlap(b, sx, lerp(fy, y, t) + .01, sz, MAP.near(sx, sz))) { clear = false; break; } } if (clear) candidates.push({ x: px, z: pz, score: d + Math.hypot(gx - px, gz - pz) * .02 }); }
  candidates.sort((a, b) => a.score - b.score); for (const p of candidates) { const route = navPath(p.x, p.z, gx, gz); if (route) return [{ x: from.x, z: from.z, y: fy }, ...route]; } return null; }
function botGoal(b, now) {
  let gx, gz; b.holdGoal = null; const obj = botObjective(b, now);
  if (obj && !(b.state === 'hunt' && now - b.lastSeenT < 4 && BOMB.carrier !== b && BOMB.state !== 'planted')) { gx = obj.x; gz = obj.z; b.holdGoal = obj.hold ? obj : null; b.state = 'roam'; }
  else
  if (b.state === 'hunt' && now - b.lastSeenT < 6) { gx = b.lastSeen.x; gz = b.lastSeen.z; b.state = 'roam'; b.intent = '搜查最后目击点'; }
  if (gx === undefined) { let tot = 0; for (const p of MAP.points) tot += G.mode === 'dm' ? 1 : p[b.team]; let r = Math.random() * tot, sel = MAP.points[0]; for (const p of MAP.points) { r -= G.mode === 'dm' ? 1 : p[b.team]; if (r <= 0) { sel = p; break; } } gx = sel.x + rand(-3, 3); gz = sel.z + rand(-3, 3); }
  const detour = botDangerDetour(b, gx, gz, now); if (detour) { gx = detour.x; gz = detour.z; b.holdGoal = null; } b.path = navPath(b.pos.x, b.pos.z, gx, gz); b.pi = 1; b.repathT = now + 12; if (!b.path) b.waitT = now + .5; if (b.intent === '护送携核') b.repathT = now + 2.5;
}
function markSpotted(e, team, now) { e.spottedT = now; (e.spottedBy || (e.spottedBy = {}))[team] = { x: e.pos.x, z: e.pos.z, t: now }; }
function botSee(b, e) { const ey = b.pos.y + eyeY(b); if (SMOKES.length && smokeBlocks(b.pos.x, ey, b.pos.z, e.pos.x, e.pos.y + 1.3, e.pos.z)) return false; return segClear(b.pos.x, ey, b.pos.z, e.pos.x, e.pos.y + eyeY(e), e.pos.z) || segClear(b.pos.x, ey, b.pos.z, e.pos.x, e.pos.y + .9, e.pos.z); }
function botLineClear(b, t) { const dx = t.pos.x - b.pos.x, dz = t.pos.z - b.pos.z, l2 = dx * dx + dz * dz; if (l2 < 1) return true; for (const o of G.ents) { if (o === b || !o.alive || o.team !== b.team) continue; const k = ((o.pos.x - b.pos.x) * dx + (o.pos.z - b.pos.z) * dz) / l2; if (k > .015 && k < .98 && Math.abs(o.pos.y - b.pos.y) < 1.3 && Math.hypot(o.pos.x - b.pos.x - dx * k, o.pos.z - b.pos.z - dz * k) < .48) return false; } return true; }
function botThink(b, now) {
  if (now < (b.blindT || 0)) { b.target = null; b.targetVis = false; return; }
  let best = null, bs = 1e9; const D = DIFFS[G.diff];
  for (const e of G.ents) { if (!e.alive || e.team === b.team || now < (e.spawnProtectedUntil || 0)) continue; const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z, d = Math.hypot(dx, dz); if (d > D.see * (WEAPONS[b.weapon].scope ? 1.5 : 1)) continue;
    const ang = Math.abs(angDiff(Math.atan2(-dx, -dz), b.yaw)); if (!(d < 3.5 || ang < 1.0 || (now < b.alertT && ang < 1.9))) continue;
    if (!botSee(b, e)) continue; { const was = e.spottedBy && e.spottedBy[b.team]; if (b.team === G.team && G.state === 'live' && (!was || now - was.t > 6)) RADIO.say('spot', b.name); } markSpotted(e, b.team, now); const s = d * (e === b.target ? .6 : 1); if (s < bs) { bs = s; best = e; } }
  if (best) { if (b.target !== best || !b.targetVis) { b.target = best; b.reactT = now + D.react * rand(.8, 1.3) * (WEAPONS[b.weapon].scope ? 1.3 : 1); b.aimErr = .075; b.aimHead = Math.random() < D.head; b.burstN = 0; }
    b.targetVis = true; b.fireClear = botLineClear(b, best); b.lastSeen.copy(best.pos); b.lastSeenT = b.lastVisualT = now; b.lastAimY = best.pos.y + (b.aimHead ? eyeY(best) : 1.12 * (1 - .27 * best.crouchAmt)); b.path = null; b.intent = b.fireClear ? '压制目视目标' : '让开友军火线'; if (G.intel) G.intel[b.team] = { x: best.pos.x, z: best.pos.z, t: now }; }
  else if (b.target) { b.targetVis = false; b.intent = '预瞄最后目击点'; if (now - b.lastSeenT > .5 || !b.target.alive) { const alive = b.target.alive; b.target = null; if (alive) { b.state = 'hunt'; botGoal(b, now); } } }
}
function botHear(pos, team, radius, kind = 'shot') { const now = G.now; for (const b of G.bots) { if (!b.alive || b.team === team || b.target || now < (b.blindT || 0) || now - (b.heardT || -9) < .18) continue; const d = b.pos.distanceTo(pos); if (d > radius) continue;
  const clear = segClear(b.pos.x, b.pos.y + eyeY(b), b.pos.z, pos.x, pos.y + (kind === 'step' ? .3 : 1.3), pos.z), reach = radius * (clear ? 1 : .48); if (d > reach) continue;
  const err = (clear ? .7 : 2.1) + d * (kind === 'step' ? .1 : .045), x = pos.x + rand(-err, err), z = pos.z + rand(-err, err); b.heardT = now; b.heard = { x, z, t: now, kind, occluded: !clear }; b.alertT = now + 2.8; b.alertYaw = Math.atan2(-(x - b.pos.x), -(z - b.pos.z));
  if (d < reach * .72 && now - b.lastSeenT > .7) { b.lastSeen.set(x, pos.y, z); b.lastSeenT = now; b.state = 'hunt'; b.path = null; b.waitT = 0; b.intent = '调查声源方向'; } } }
function botNadeLanding(b, kind, yaw, pitch) { const cp = Math.cos(pitch), dx = -Math.sin(yaw) * cp, dy = Math.sin(pitch), dz = -Math.cos(yaw) * cp, p = new V3(b.pos.x + dx * .5, b.pos.y + eyeY(b) - .05, b.pos.z + dz * .5), v = new V3(dx * 17 + b.vel.x * .6, dy * 17 + 3.2, dz * 17 + b.vel.z * .6), dt = 1 / 30, frames = Math.ceil(WEAPONS[kind].fuse / dt);
  for (let i = 0; i < frames; i++) { v.y -= GRAV * dt; const speed = v.length(); if (speed > .01) { const h = rayWorld(p.x, p.y, p.z, v.x / speed || 1e-9, v.y / speed || 1e-9, v.z / speed || 1e-9, speed * dt + .08); if (h) { const dot = v.x * h.nx + v.y * h.ny + v.z * h.nz; v.x -= 2 * dot * h.nx; v.y -= 2 * dot * h.ny; v.z -= 2 * dot * h.nz; v.multiplyScalar(.42); if (h.ny > .5 && Math.abs(v.y) < 1) { v.y = 0; v.x *= .8; v.z *= .8; } } else p.addScaledVector(v, dt); } if (p.y < .08) { p.y = .08; if (v.y < 0) v.y = 0; } } return p; }
function botUtilityPlan(b, now) { if (!b.nade || now < (b.nadeCd || 0) || now < (b.blindT || 0) || b.act || b.targetVis || G.state !== 'live' || BOMB.carrier === b) return null; const kind = b.nade, times = G.utilityT && G.utilityT[b.team]; if (times && now < (times[kind] || 0)) return null;
  const recent = now - (b.lastVisualT || -9) > .7 && now - (b.lastVisualT || -9) < 3.2, approach = G.mode === 'comp' && b.team === 'red' && BOMB.state === 'carried' && (b.role === 'support' || b.role === 'entry'), site = approach && SITES[G.plan.site]; let x, z;
  if (kind === 'he') { if (!recent) return null; x = b.lastSeen.x; z = b.lastSeen.z; }
  else if (kind === 'smoke') { if (SMOKES.some(q => q.t > 4 && Math.hypot(q.p.x - b.pos.x, q.p.z - b.pos.z) < 18)) return null; if (recent && (b.hp < 45 || b.reloadT > 0)) { const dx = b.lastSeen.x - b.pos.x, dz = b.lastSeen.z - b.pos.z, d = Math.hypot(dx, dz), k = Math.min(.65, 9 / d); x = b.pos.x + dx * k; z = b.pos.z + dz * k; } else if (site) { x = (site.x1 + site.x2) / 2; z = site.z2 - 4; } else return null; }
  else { if (recent) { x = b.lastSeen.x; z = b.lastSeen.z; } else if (site) { x = (site.x1 + site.x2) / 2; z = site.z2 - 3; } else return null; }
  const dx = x - b.pos.x, dz = z - b.pos.z, d = Math.hypot(dx, dz); if (d < (kind === 'smoke' ? 8 : 9) || d > 25) return null; const y = MAP.floorAt(x, z) + 1.5;
  for (const o of G.ents) { if (!o.alive || o.team !== b.team || o === b) continue; const q = Math.hypot(x - o.pos.x, z - o.pos.z); if (kind === 'he' && q < 7.5) return null; if (kind === 'smoke' && q < 5.5) return null; if (kind === 'flash' && q < 15 && segClear(x, y, z, o.pos.x, o.pos.y + eyeY(o), o.pos.z)) { const facing = (-Math.sin(o.yaw) * (x - o.pos.x) - Math.cos(o.yaw) * (z - o.pos.z)) / (q || 1); if (q < 6 || facing > -.2) return null; } }
  const yaw = Math.atan2(-dx, -dz); if (!segClear(b.pos.x, b.pos.y + eyeY(b), b.pos.z, b.pos.x + dx / d * 3, b.pos.y + eyeY(b) + 1.1, b.pos.z + dz / d * 3)) return null;
  let solution = b.utilitySolution; if (!solution || solution.kind !== kind || now - solution.t > .45 || Math.hypot(solution.x - x, solution.z - z) > 1 || Math.hypot(solution.bx - b.pos.x, solution.bz - b.pos.z) > .5 || Math.hypot(solution.vx - b.vel.x, solution.vz - b.vel.z) > .6) { let best = null, error = 1e9; for (let i = 0; i <= 12; i++) { const pitch = -.68 + i * .12, p = botNadeLanding(b, kind, yaw, pitch), score = Math.hypot(p.x - x, p.z - z); if (score < error) { error = score; best = { pitch, p }; } } solution = b.utilitySolution = { kind, t: now, x, z, bx: b.pos.x, bz: b.pos.z, vx: b.vel.x, vz: b.vel.z, ...best, error }; }
  if (solution.error > 5 || Math.hypot(solution.p.x - b.pos.x, solution.p.z - b.pos.z) < (kind === 'smoke' ? 6.5 : 8)) return null;
  for (const o of G.ents) if (o !== b && o.alive && o.team === b.team) { const d = o.pos.distanceTo(solution.p); if (d < (kind === 'he' ? 7.5 : kind === 'smoke' ? 5.5 : 15) && (kind !== 'flash' || segClear(solution.p.x, solution.p.y + .25, solution.p.z, o.pos.x, o.pos.y + eyeY(o), o.pos.z))) return null; }
  return { kind, x, z, yaw, pitch: solution.pitch, landing: solution.p, error: solution.error, intent: kind === 'smoke' ? '封线掩护' : kind === 'flash' ? '闪光准备' : '爆弹清理' }; }
function groundMove(e, wx, wz, maxSp, dt, accel = 13, fric = 8.5) {
  const v = e.vel;
  if (e.onGround) { const sp = Math.hypot(v.x, v.z); if (sp > .001) { const drop = Math.max(sp, 1.6) * fric * dt, k = Math.max(0, sp - drop) / sp; v.x *= k; v.z *= k; }
    const cur = v.x * wx + v.z * wz, add = maxSp - cur; if (add > 0) { const a = Math.min(accel * maxSp * dt, add); v.x += wx * a; v.z += wz * a; } }
  else { const ws = Math.min(maxSp, .8), cur = v.x * wx + v.z * wz, add = ws - cur; if (add > 0) { const a = Math.min(14 * maxSp * dt, add); v.x += wx * a; v.z += wz * a; } }
}
function updateBot(b, dt, now) {
  if (!b.alive) { if (b.model.root.visible) animSoldier(b, dt); return; }
  if (b.dummy) { b.vel.set(0, 0, 0); animSoldier(b, dt); return; }
  if (now >= b.nextThink) { botThink(b, now); b.nextThink = now + .09 + Math.random() * .06; }
  const w = WEAPONS[b.weapon], D = DIFFS[G.diff], frozen = G.state !== 'live'; let wx = 0, wz = 0, wantYaw = b.yaw, wantPitch = 0, sp = 4.4 * w.speed, wantCrouch = 0, dist = 0;
  botUrgentDefuse(b, now); const blind = now < (b.blindT || 0), avoidingFlash = now < (b.flashAvoidT || 0), t = blind || avoidingFlash ? null : b.target;
  if (now >= (b.tacticalT || 0)) { b.tacticalT = now + .4; const it = G.intel && G.intel[b.team]; if (!t && G.mode === 'comp' && it && now - it.t < 3 && now - (b.respondedT || -9) > 4 && (b.role === 'rotate' || b.slot % 3 === 0) && Math.hypot(it.x - b.pos.x, it.z - b.pos.z) > 18) { b.path = null; b.waitT = now + (b.slot % 5) * .02; b.respondedT = now; } }

  if (G.mode === 'comp' && G.state === 'live') entInteract(b, (canPlant(b) && (!b.targetVis || (b.act && b.act.t > 1.4))) || (canDefuse(b) && (!b.targetVis || BOMB.t < DEFUSE_T + 3 || (b.act && b.act.t > 3.5))), dt);
  if (t && t.alive) {
    const observed = b.targetVis ? t.pos : b.lastSeen, ty = b.targetVis ? t.pos.y + (b.aimHead ? eyeY(t) : 1.12 * (1 - .27 * t.crouchAmt)) : b.lastAimY || b.lastSeen.y + 1.2, dx = observed.x - b.pos.x, dz = observed.z - b.pos.z, dy = ty - (b.pos.y + eyeY(b)); dist = Math.hypot(dx, dz);
    wantYaw = Math.atan2(-dx, -dz); wantPitch = Math.atan2(dy, dist); b.aimErr = damp(b.aimErr, .02, 1.5, dt);
    if (now > b.strafeT) { b.strafeT = now + rand(.65, 1.35); b.strafeDir = dist > 30 && !(b.threat && b.threat.kind === 'sniper' && now < b.threat.until) && Math.random() < .5 ? 0 : pick([-1, 1]); if (Math.random() < .15 && dist > 12) wantCrouch = 1; b.crouchHold = wantCrouch ? now + rand(.6, 1.4) : 0; }
    if (b.threat && b.threat.kind === 'sniper' && now < b.threat.until && !b.strafeDir) b.strafeDir = (b.slot || 0) % 2 ? 1 : -1;
    const rx = Math.cos(b.yaw), rz = -Math.sin(b.yaw), fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw); let f = dist > 38 ? .7 : dist < 5 ? -.6 : 0; if (w.scope) f = dist < 14 ? -.7 : 0; if (w.pellets) f = dist > 8 ? .85 : dist < 3 ? -.5 : 0; if ((b.hp < 35 || b.reloadT > 0) && dist < 18) { f = -.7; if (b.team === G.team && b.targetVis && G.state === 'live') RADIO.say('cover', b.name); } if (!b.fireClear) b.strafeDir = b.lane >= 0 ? 1 : -1;
    wx = rx * b.strafeDir + fx * f; wz = rz * b.strafeDir + fz * f; if (now < b.burstPause - .05 || b.burstN > 0 || (b.targetVis && b.fireClear && now > b.reactT - .12 && b.hp >= 35)) { if ((dist > 11 && !w.pellets || w.scope) && !(b.threat && b.threat.kind === 'sniper' && now < b.threat.until)) { wx *= .15; wz *= .15; } }
    if (now < (b.crouchHold || 0)) wantCrouch = 1;
    if (Math.abs(b.strafeDir) > 0 && !navLine(b.pos.x, b.pos.z, b.pos.x + rx * b.strafeDir * .9, b.pos.z + rz * b.strafeDir * .9)) { wx -= rx * b.strafeDir; wz -= rz * b.strafeDir; b.strafeDir *= -1; }
    // fire control
    if (!frozen && !b.act && b.targetVis && b.fireClear && (!w.range || Math.hypot(dist, dy) < w.range) && now > b.reactT && Math.abs(angDiff(wantYaw, b.yaw)) < .12 && b.reloadT <= 0) {
      if (b.mag <= 0) b.reloadT = w.reload;
      else if (now >= b.nextFire && now >= b.burstPause) {
        const sig = (b.aimErr + dist * .00045 + b.burstN * (w.auto ? .0035 : .002) + Math.hypot(t.vel.x, t.vel.z) * .0028 + Math.hypot(b.vel.x, b.vel.z) * .004) * D.err * (w.scope ? .45 : 1) * (t.isPlayer && t.crouchAmt > .5 ? 1.2 : 1);
        const yw = wantYaw + gauss() * sig, pt = wantPitch + gauss() * sig * .8, cp = Math.cos(pt);
        G.botShoot(b, -Math.sin(yw) * cp, Math.sin(pt), -Math.cos(yw) * cp); b.mag--; b.nextFire = now + w.rate * (w.auto ? 1 : rand(1.4, 2.4)); b.burstN++;
        if (b.burstN >= b.burstLen) { b.burstN = 0; b.burstLen = w.auto ? (dist < 10 ? 10 : dist > 28 ? 2 + (Math.random() * 2 | 0) : 4 + (Math.random() * 3 | 0)) : w.scope ? 1 : 1 + (Math.random() * 2 | 0); b.burstPause = now + rand(.22, .55) * clamp(dist / 22, .5, 1.6); }
      }
    }
  } else if (!frozen) {
    if (!b.coverPlan && !b.path && now > b.waitT) botGoal(b, now);
    if (b.path) { let n = b.path[b.pi]; if (!n) { b.path = null; b.lookT = 0; if (b.holdGoal) { b.waitT = now + (BOMB.state === 'planted' ? rand(3, 6) : rand(6, 11)); b.holdYaw = botHoldYaw(b, b.holdGoal.face); b.holdCrouch = Math.random() < .35; } else { b.waitT = now + rand(.8, 3.5) * (G.huntAll ? .2 : 1); b.holdYaw = null; } }
      else { const dx = n.x - b.pos.x, dz = n.z - b.pos.z, d = Math.hypot(dx, dz); if (d < .55) b.pi++; else { wx = dx / d; wz = dz / d; wantYaw = Math.atan2(-dx, -dz); const ahead = b.path[Math.min(b.path.length - 1, b.pi + 2)], hd = b.heard && now - b.heard.t < 4 ? b.heard : null, it = G.intel && G.intel[b.team], intel = !hd && it && now - it.t < 3 && Math.hypot(it.x - b.pos.x, it.z - b.pos.z) < 35 ? it : null, look = hd || intel || (ahead && Math.hypot(ahead.x - b.pos.x, ahead.z - b.pos.z) > 1.2 ? ahead : null); if (look) { const ly = Math.atan2(-(look.x - b.pos.x), -(look.z - b.pos.z)); if (Math.abs(angDiff(ly, wantYaw)) < (hd || intel ? 2.2 : 1.3)) wantYaw = ly; } } if (now > b.repathT) b.path = null; } }
    else if (now > b.lookT) { b.lookT = now + rand(.7, 1.6); b.lookYaw = b.yaw + rand(-1.6, 1.6); }
    if (!b.path) { wantYaw = b.lookYaw; if (b.holdYaw !== null && b.holdYaw !== undefined) { wantYaw = b.holdYaw + Math.sin(now * .7 + b.rot * 9) * .35; if (b.holdCrouch) wantCrouch = 1; const it = G.intel && G.intel[b.team]; if (it && now - it.t < 1.5 && b.rot < .5 && BOMB.state !== 'planted' && Math.hypot(it.x - b.pos.x, it.z - b.pos.z) > 20) b.waitT = 0; } } if (now < b.alertT && !b.path) wantYaw = b.alertYaw;
    if (blind) { wantYaw = b.yaw + Math.sin(now * 5 + b.rot * 7) * .8; wx = wz = 0; }
    const utility = !blind && !avoidingFlash && botUtilityPlan(b, now); if (utility) { wantYaw = utility.yaw; wx = wz = 0; b.intent = utility.intent; if (Math.abs(angDiff(wantYaw, b.yaw)) < .06 && Math.hypot(b.vel.x, b.vel.z) < .6) { const py = b.pitch; b.pitch = utility.pitch; throwNade(b, utility.kind); b.pitch = py; b.nade = null; b.nadeCd = now + 5; ((G.utilityT || (G.utilityT = {}))[b.team] || (G.utilityT[b.team] = {}))[utility.kind] = now + (utility.kind === 'smoke' ? 6 : utility.kind === 'flash' ? 3 : 1.2); if (utility.kind === 'flash') { b.flashAvoidT = now + WEAPONS.flash.fuse + .35; b.flashAvoidYaw = b.yaw + Math.PI; } } }
    if (b.mag < (w.mag || 0) * .4 && b.reloadT <= 0 && !w.melee) b.reloadT = w.reload;
  }
  if (b.reloadT > 0) { b.reloadT -= dt; if (b.reloadT <= 0) b.mag = w.mag; }
  const tactical = !frozen && !avoidingFlash && botTacticalMotion(b, now); if (tactical) { wx = tactical.x; wz = tactical.z; wantCrouch = tactical.crouch ? 1 : 0; if (!tactical.hold && !b.targetVis) wantYaw = Math.atan2(-wx, -wz); }
  // separation
  b.yielding = false; const bi = G.ents.indexOf(b), moveLen = Math.hypot(wx, wz), priority = b.act ? -3 : BOMB.carrier === b ? -2 : bi;
  for (let ei = 0; ei < G.ents.length; ei++) { const e = G.ents[ei]; if (e === b || !e.alive || Math.abs(e.pos.y - b.pos.y) > 1) continue; let dx = b.pos.x - e.pos.x, dz = b.pos.z - e.pos.z, d2 = dx * dx + dz * dz;
    if (d2 < .0001) { const a = (Math.min(bi, ei) + 1) * 2.399, sign = bi < ei ? 1 : -1; dx = Math.cos(a) * sign * .01; dz = Math.sin(a) * sign * .01; d2 = .0001; } const d = Math.sqrt(d2); if (d2 < .8) { wx += dx / d * 1.2; wz += dz / d * 1.2; }
    if (!b.targetVis && !b.act && e.team === b.team && d < 1.9 && moveLen > .1 && (e.act ? -3 : BOMB.carrier === e ? -2 : ei) < priority && (-dx * wx - dz * wz) / (d * (Math.hypot(wx, wz) || 1)) > .25) { const sx = -wz / (Math.hypot(wx, wz) || 1) * (bi % 2 ? 1 : -1), sz = wx / (Math.hypot(wx, wz) || 1) * (bi % 2 ? 1 : -1); wx *= .12; wz *= .12; if (navLine(b.pos.x, b.pos.z, b.pos.x + sx * .7, b.pos.z + sz * .7)) { wx += sx * .65; wz += sz * .65; } b.yielding = true; } }
  if (avoidingFlash) { wantYaw = b.flashAvoidYaw; wantPitch = -.35; wx = wz = 0; }
  if (b.act) { wx = wz = 0; wantCrouch = 1; }
  const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; } if (frozen) { wx = wz = 0; }
  b.crouchAmt = damp(b.crouchAmt, wantCrouch, 10, dt); if (b.crouchAmt > .5) sp *= .45;
  b.yaw += clamp(angDiff(wantYaw, b.yaw), -7.5 * D.turn * dt, 7.5 * D.turn * dt); b.pitch = damp(b.pitch, wantPitch, 10, dt);
  groundMove(b, wx, wz, wl > .05 ? sp : 0, dt);
  const px = b.pos.x, pz = b.pos.z; moveEntity(b, dt);
  if (wl > .3 && Math.hypot(b.pos.x - px, b.pos.z - pz) < sp * dt * .25) { b.stuckT += dt; if (b.stuckT > .5 && b.onGround && now > b.jumpT) { b.vel.y = 5.9; b.onGround = false; b.jumpT = now + .8; } if (b.stuckT > 1.6) { const goal = b.path && b.path[b.path.length - 1]; b.stuckT = 0; b.path = goal ? botRecoverPath(b, goal.x, goal.z) : null; b.pi = 1; b.repathT = now + 12; b.strafeDir *= -1; } } else b.stuckT = Math.max(0, b.stuckT - dt * 2);
  if (b.onGround) { b.stepAcc += Math.hypot(b.pos.x - px, b.pos.z - pz); if (b.stepAcc > 2.3) { b.stepAcc = 0; SFX.step(b.pos, .2, surfaceAt(b.pos)); if (Math.hypot(b.vel.x, b.vel.z) > 3 && b.crouchAmt < .5) botHear(b.pos, b.team, 11, 'step'); } }
  animSoldier(b, dt);
}

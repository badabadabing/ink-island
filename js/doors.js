'use strict';
/* ============ SALTY ISLE · doors: every door leaf registered in towns.js (MAP.doors) swings open when someone walks up and closes behind them; three instanced meshes, visual only (doorways never block) ============ */
const DOORS = { list: [], leaf: null, pan: null, knob: null, t: 0 };
function doorsBuild() { if (DOORS.leaf) { for (const m of [DOORS.leaf, DOORS.pan, DOORS.knob]) { scene.remove(m); m.geometry.dispose(); } DOORS.leaf = null; } const L = MAP.doors || []; DOORS.list = L; if (!L.length) return;
  const box = new THREE.BoxGeometry(1, 1, 1).translate(.5, .5, 0), lam = () => new THREE.MeshLambertMaterial({ color: 0xffffff }), n = L.length;
  DOORS.leaf = new THREE.InstancedMesh(box, lam(), n); DOORS.pan = new THREE.InstancedMesh(box.clone(), lam(), n * 2); DOORS.knob = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), lam(), n);
  const c = new THREE.Color(); L.forEach((d, i) => { d.a = 0; d.tgt = 0; d.len = d.w * .92; d.hx = d.ax === 'x' ? d.s0 + .02 : d.f + d.sd * .15; d.hz = d.ax === 'x' ? d.f + d.sd * .15 : d.s0 + .02; d.cx = d.ax === 'x' ? d.s0 + d.w / 2 : d.f; d.cz = d.ax === 'x' ? d.f : d.s0 + d.w / 2; DOORS.leaf.setColorAt(i, c.set(d.c)); const pc = typeof SKIN !== 'undefined' && SKIN.dark ? SKIN.dark(d.c, .82) : d.c; DOORS.pan.setColorAt(i * 2, c.set(pc)); DOORS.pan.setColorAt(i * 2 + 1, c.set(pc)); DOORS.knob.setColorAt(i, c.set(0xd9a441)); doorPose(d, i); });
  for (const m of [DOORS.leaf, DOORS.pan, DOORS.knob]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); } }
const _dM = new THREE.Matrix4(), _dR = new THREE.Matrix4(), _dT = new THREE.Matrix4(), _dS = new THREE.Matrix4();
function doorPose(d, i) { const th = d.a * d.a * (3 - 2 * d.a) * 1.83, psi = d.ax === 'x' ? -d.sd * th : -Math.PI / 2 + d.sd * th, base = new THREE.Matrix4().makeTranslation(d.hx, d.yb + .01, d.hz).multiply(_dR.makeRotationY(psi)), L = d.len, H = d.h - .06;
  DOORS.leaf.setMatrixAt(i, _dM.copy(base).multiply(_dS.makeScale(L, H, .06)));
  [.32, .72].forEach((py, j) => { const ph = H * .3; DOORS.pan.setMatrixAt(i * 2 + j, _dM.copy(base).multiply(_dT.makeTranslation(L * .19, d.h * py - ph / 2, 0)).multiply(_dS.makeScale(L * .62, ph, .078))); });
  DOORS.knob.setMatrixAt(i, _dM.copy(base).multiply(_dT.makeTranslation(L - .13, d.h * .47, 0)).multiply(_dS.makeScale(.045, .045, .11))); }
function doorsUpdate(dt) { if (!DOORS.leaf) return; const ents = []; const pl = G.player; if (pl && pl.alive && !pl.air) ents.push(pl); for (const b of G.bots || []) if (b.alive && !b.air) ents.push(b); let moved = false;
  DOORS.list.forEach((d, i) => { let near = false; for (const e of ents) { if (Math.abs(e.pos.x - d.cx) < 2.4 && Math.abs(e.pos.z - d.cz) < 2.4 && Math.hypot(e.pos.x - d.cx, e.pos.z - d.cz) < 2.3 && Math.abs(e.pos.y - d.yb) < 1.7) { near = true; break; } } const tg = near ? 1 : 0;
    if (tg && !d.tgt && d.a < .05 && pl && Math.hypot(pl.pos.x - d.cx, pl.pos.z - d.cz) < 16) { try { SFX.tone(150, 95, .28, .07, SFX.out({ x: d.cx, z: d.cz }, 1), 'sawtooth'); } catch (er) { } }
    d.tgt = tg; if (d.a !== tg) { d.a = tg ? Math.min(1, d.a + dt * 3.6) : Math.max(0, d.a - dt * 1.6); doorPose(d, i); moved = true; } });
  if (moved) for (const m of [DOORS.leaf, DOORS.pan, DOORS.knob]) m.instanceMatrix.needsUpdate = true; }
(() => { const _f = frame; frame = function (dt) { _f(dt); if (!DOORS.leaf && MAP.doors && MAP.doors.length && typeof scene !== 'undefined') doorsBuild(); doorsUpdate(dt); }; })();

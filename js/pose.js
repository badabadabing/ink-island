'use strict';
/* ============ SALTY ISLE · pose: two-bone arm IK for the islander rig (upper arm + forearm hanging down in rest pose); every arm pose is a hand target in upper-body space plus an elbow hint, damped so stances blend ============ */
const POSE = { A: .3, B: .32, _s: new THREE.Vector3(), _t: new THREE.Vector3(), _p: new THREE.Vector3(), _e: new THREE.Vector3(), _u: new THREE.Vector3(), _f: new THREE.Vector3(), _q: new THREE.Quaternion(), _qi: new THREE.Quaternion(), _down: new THREE.Vector3(0, -1, 0), _v: new THREE.Vector3(), _m: new THREE.Matrix4() };
/* solve one arm: target and pole are in upper-body space; writes the shoulder quaternion and the elbow quaternion */
function islArmIK(arm, tx, ty, tz, px, py, pz) { if (!arm || !arm.elbow) return; const P = POSE, S = P._s.copy(arm.position), T = P._t.set(tx, ty, tz), a = P.A, b = P.B;
  const d0 = P._v.subVectors(T, S), dl = Math.max(1e-4, d0.length()), d = Math.min(a + b - .002, Math.max(Math.abs(a - b) + .02, dl)); const dir = d0.multiplyScalar(1 / dl); T.copy(S).addScaledVector(dir, d);
  const pole = P._p.set(px, py, pz); pole.addScaledVector(dir, -pole.dot(dir)); if (pole.lengthSq() < 1e-6) pole.set(0, 0, 1).addScaledVector(dir, -dir.z); pole.normalize();
  const ca = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))), sa = Math.sqrt(1 - ca * ca), E = P._e.copy(S).addScaledVector(dir, a * ca).addScaledVector(pole, a * sa);
  const u = P._u.subVectors(E, S).normalize(); arm.quaternion.setFromUnitVectors(P._down, u);
  const f = P._f.subVectors(T, E).normalize(); P._qi.copy(arm.quaternion).invert(); f.applyQuaternion(P._qi); arm.elbow.quaternion.setFromUnitVectors(P._down, f); }
/* damped target holder per arm so poses blend instead of snapping */
function poseArm(m, side, tx, ty, tz, px, py, pz, dt, rate = 14) { const k = side > 0 ? 'pR' : 'pL', arm = side > 0 ? m.armR : m.armL; let s = m[k]; if (!s) s = m[k] = { t: new THREE.Vector3(tx, ty, tz), p: new THREE.Vector3(px, py, pz) }; const f = dt ? 1 - Math.exp(-rate * dt) : 1; s.t.x += (tx - s.t.x) * f; s.t.y += (ty - s.t.y) * f; s.t.z += (tz - s.t.z) * f; s.p.x += (px - s.p.x) * f; s.p.y += (py - s.p.y) * f; s.p.z += (pz - s.p.z) * f; islArmIK(arm, s.t.x, s.t.y, s.t.z, s.p.x, s.p.y, s.p.z); }
/* a point of the held gun in upper-body space (meta pairs are [forward, up]) */
function poseGunPt(m, fw, up) { const g = m.gun, c = g.children[0]; g.updateMatrix(); const v = POSE._v.set(0, up, -fw); if (c) { c.updateMatrix(); v.applyMatrix4(c.matrix); } return v.applyMatrix4(g.matrix); }
/* the hand position (upper space) after IK, for things carried in the hand */
function poseHand(m, side) { const arm = side > 0 ? m.armR : m.armL; arm.updateMatrix(); arm.elbow.updateMatrix(); return new THREE.Vector3(0, -POSE.B, 0).applyMatrix4(arm.elbow.matrix).applyMatrix4(arm.matrix); }
function poseDamp(o, k, v, r, dt) { o[k] += (v - o[k]) * (1 - Math.exp(-r * dt)); }
(() => { if (typeof SKIN === 'undefined' || !SKIN.on) return; const _anim = animSoldier;
  animSoldier = function (e, dt) { _anim(e, dt); const m = e.model; if (!m || !m.armR || !m.armR.elbow) return; if (m.ghillie && m.gear) { m.gear.hat.visible = false; m.gear.hatBack.visible = false; for (const k of ['helm', 'vest', 'bag']) m.gear[k].forEach(o => o.visible = false); m.gear.key = -1; } const t = (typeof G !== 'undefined' ? G.now : 0) + (m.phase || 0), R = m.armR.position, L = m.armL.position, w = WEAPONS[e.weapon] || {}, g = m.gun, meta = g.children[0] && g.children[0].userData.meta || {};
    const sp = Math.hypot(m.vx || 0, m.vz || 0), gw = Math.min(1, Math.max(0, (sp - .12) / .55)), run = Math.min(1, Math.max(0, (sp - 2.9) / 1.7)), ph = (m.gait || 0) * 6.2832, sw = Math.sin(ph) * gw;
    /* dead: arms go limp where they are */
    if (!e.alive) { poseArm(m, 1, R.x + .35, R.y - .25, R.z + .1, 1, 0, .3, dt, 9); poseArm(m, -1, L.x - .35, L.y - .25, L.z + .1, -1, 0, .3, dt, 9); return; }
    /* swimming: body flat at the surface, pivoting at the hips so the hitbox and camera stay put; front crawl arms, flutter kick, head up */
    if (!e.veh && !e.air && !e.climb && typeof inWater === 'function' && inWater(e)) { const th = -1.2, fy = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), off = .9 * Math.sin(-th); m.root.rotation.set(th, e.yaw, 0, 'YXZ'); m.root.position.set(e.pos.x - fy * off, Math.max(e.pos.y, MAP.sea - .5), e.pos.z - fz * off); g.visible = false; m.head.rotation.set(-1.0, 0, 0); m.upper.rotation.set(0, Math.sin(t * 3.2) * .12, 0);
      const sw2 = t * 3.2; for (const [side, a] of [[1, sw2], [-1, sw2 + Math.PI]]) { const S = side > 0 ? R : L, c = Math.cos(a), s2 = Math.sin(a); poseArm(m, side, S.x + side * (.06 + .1 * Math.max(0, -s2)), S.y + .25 + .32 * c, S.z - .08 + .26 * Math.max(0, s2), side * .5, .2, 1, dt, 20); }
      for (const [Lg, ph2] of [[m.legL, 0], [m.legR, Math.PI]]) { Lg.rotation.set(Math.sin(t * 9 + ph2) * .28, 0, 0, 'ZXY'); Lg.shin.rotation.x = -.15 - Math.max(0, Math.sin(t * 9 + ph2)) * .3; Lg.foot.rotation.set(.9, 0, 0, 'XZY'); } m.wasSwim = true; return; }
    if (m.wasSwim) { m.wasSwim = false; g.visible = true; m.root.rotation.x = 0; m.root.rotation.z = 0; }
    /* ladder: hands on the rails, alternating rungs */
    if (e.climb) { const a = Math.sin((e.climb.phase || 0) * 2.6); g.visible = false; poseArm(m, 1, .2, .9 + a * .14, -.3, .6, -.3, .4, dt, 18); poseArm(m, -1, -.2, .9 - a * .14, -.3, -.6, -.3, .4, dt, 18); return; }
    /* vehicles: wheel, handlebars, or a hand on the tiller */
    if (e.veh) { const v = e.veh, st = v.steer || 0; if (v.t.lean) { poseArm(m, 1, .3, .26 - st * .03, -.48, .8, -.2, .2, dt); poseArm(m, -1, -.3, .26 + st * .03, -.48, -.8, -.2, .2, dt); } else if (v.t.water) { poseArm(m, 1, .34, .12, .18, .6, -.5, .3, dt); poseArm(m, -1, -.12, .02, -.32, -.6, -.6, .2, dt); } else { const c = Math.cos(st * .9), s = Math.sin(st * .9); poseArm(m, 1, .17 * c, .3 + .17 * s, -.44, .7, -.5, .2, dt); poseArm(m, -1, -.17 * c, .3 - .17 * s, -.44, -.7, -.5, .2, dt); } return; }
    /* parachute and free fall */
    if (e.air === 'chute') { poseArm(m, 1, .2, 1.02, .02, .8, 0, .3, dt); poseArm(m, -1, -.2, 1.02, .02, -.8, 0, .3, dt); return; }
    if (e.air === 'fall' || e.air === 'plane') { poseArm(m, 1, .62, .48, .05, 0, -1, .3, dt, 8); poseArm(m, -1, -.62, .48, .05, 0, -1, .3, dt, 8); return; }
    const airborne = e.onGround === false, reload = e.isPlayer ? (e.reloadEnd >= 0 && G.now < e.reloadEnd) : (e.reloadT > 0), gun = !!(e.weapon && WEAPONS[e.weapon] && !w.melee && !w.nade && meta.grip && g.visible !== false), sprint = run > .2 && !e.scoped && !(e.isPlayer && G.fire);
    if (!m.gp) m.gp = { x: .13, y: .42, z: -.3, rx: 0, ry: 0, rz: 0 }; const gp = m.gp; { const cr = Math.min(1, e.crouchAmt || 0); if (cr > .05 && (e.crouchAmt || 0) < 1.2) m.upper.rotation.x += .42 * cr; }
    if (gun) { const pist = !!meta.pistol, low = sprint ? run : airborne ? .5 : 0; let tx = pist ? .03 : .13, ty = pist ? .42 : .42, tz = pist ? -.6 : -.3, rx = pist ? 0 : -.1, ry = 0, rz = 0;
      if (low) { tx = lerp(tx, .02, low); ty = lerp(ty, .46, low); tz = lerp(tz, -.16, low); rx = .15 * low; ry = .75 * low; } if (reload) { const k = Math.sin(t * 9) * .5 + .5; rx = -.26; rz = .55; ty = .32; tz = -.26; tx = .08; ry = .1 * k; m.head.rotation.x += .26; }
      for (const [k, v] of [['x', tx], ['y', ty], ['z', tz], ['rx', rx], ['ry', ry], ['rz', rz]]) poseDamp(gp, k, v, 10, dt); g.position.set(gp.x, gp.y, gp.z + (e.recoilT || 0) * .04); g.rotation.set(gp.rx, gp.ry, gp.rz);
      const gr = poseGunPt(m, meta.grip[0], meta.grip[1]); poseArm(m, 1, gr.x, gr.y, gr.z, low ? .2 : pist ? .3 : .45, -1, low ? .6 : pist ? .2 : .3, dt, 30);
      if (reload) { const mg = poseGunPt(m, .12, -.14 - Math.abs(Math.sin(t * 9)) * .1); poseArm(m, -1, mg.x, mg.y, mg.z, -.6, -1, .3, dt, 18); }
      else if (pist) { const h = poseGunPt(m, meta.grip[0] + .01, meta.grip[1] - .005); poseArm(m, -1, h.x - .03, h.y - .03, h.z + .01, -.3, -1, .2, dt, 30); }
      else { const lh = meta.lh || [.3, -.035], h = poseGunPt(m, lh[0], lh[1] - .015); poseArm(m, -1, h.x, h.y, h.z, -.35, -1, .05, dt, 30); }
      return; }
    /* knife / grenade in hand, or empty hands: relaxed hang that swings with the stride, elbows bend more as the hand comes forward; sprinting pumps at ninety degrees */
    g.rotation.set(0, 0, 0); const pump = run, atk = e.atkAnim > 0 ? Math.sin(Math.min(1, 1 - e.atkAnim / .32) * Math.PI) : 0, idleB = Math.sin(t * 1.6) * .006;
    const fr = sw, fl = -sw; const hang = (side, f) => { const S = side > 0 ? R : L, fwd = f * (f > 0 ? .23 : .19) + f * .08 * pump, up = Math.max(0, f) * .08; return [S.x + side * (.04 - .02 * pump), S.y - .58 + up + pump * (.2 + Math.max(0, f) * .08) + idleB, S.z - fwd - pump * .08 + .03]; };
    let r = hang(1, fr), l = hang(-1, fl);
    if (w.melee || w.nade) { r = [R.x + .04, R.y - .46 + sw * .02, R.z - .1 - Math.max(0, sw) * .04]; if (pump) r = hang(1, fr); if (atk) r = [lerp(r[0], R.x - .16, atk), lerp(r[1], R.y - .08, atk), lerp(r[2], R.z - .56, atk)]; }
    if (airborne) { r = [R.x + .22, R.y - .25, R.z - .08]; l = [L.x - .22, L.y - .25, L.z - .08]; }
    poseArm(m, 1, r[0], r[1], r[2], .3, -.3, 1, dt, 16); poseArm(m, -1, l[0], l[1], l[2], -.3, -.3, 1, dt, 16);
    if (w.melee || w.nade) { const hp = poseHand(m, 1), gripF = meta.grip ? meta.grip[0] : 0, gripU = meta.grip ? meta.grip[1] : 0; g.rotation.set(w.melee ? -.9 + atk * .75 : 0, 0, 0); g.updateMatrix(); const off = new THREE.Vector3(0, gripU, -gripF).applyQuaternion(g.quaternion); g.position.set(hp.x - off.x - .01, hp.y - off.y, hp.z - off.z); }
  };
})();
/* vehicles pose after animSoldier, so the hands are placed again once the ride pose has run */
function poseVeh(e, v, dt) { const m = e.model; if (!m || !m.armR || !m.armR.elbow) return; const st = v.steer || 0; if (v.t.lean) { poseArm(m, 1, .3, .26 - st * .03, -.48, .8, -.2, .2, dt); poseArm(m, -1, -.3, .26 + st * .03, -.48, -.8, -.2, .2, dt); } else if (v.t.water) { poseArm(m, 1, .34, .12, .18, .6, -.5, .3, dt); poseArm(m, -1, -.12, .02, -.32, -.6, -.6, .2, dt); } else { const c = Math.cos(st * .9), s = Math.sin(st * .9); poseArm(m, 1, .17 * c, .3 + .17 * s, -.44, .7, -.5, .2, dt); poseArm(m, -1, -.17 * c, .3 - .17 * s, -.44, -.7, -.5, .2, dt); } }
(() => { if (typeof SKIN === 'undefined' || !SKIN.on) return;
  if (typeof ridePose === 'function') { const _rp = ridePose; ridePose = function (e, v) { _rp(e, v); poseVeh(e, v, 1 / 60); }; }
  /* the winner's finale poses, re-authored for the IK rig (kneel keeps the gun hold from the live pose) */
  if (typeof POSES !== 'undefined') { const A = (m, s, x, y, z, px, py, pz) => islArmIK(s > 0 ? m.armR : m.armL, x, y, z, px, py, pz), wrap = (k, f) => { const o = POSES[k].fn; POSES[k].fn = (m, t) => { o(m, t); if (m.armR && m.armR.elbow) f(m, t); }; };
    wrap('cheer', (m, t) => { const b = Math.max(0, Math.sin(t * 5.2)) * .06; A(m, 1, .4, 1.04 + b, -.04, 1, 0, .4); A(m, -1, -.4, 1.04 + b, -.04, -1, 0, .4); });
    wrap('salute', (m, t) => { A(m, 1, .03, .37, -.3, 1, -.6, .3); A(m, -1, -.04, .36, -.31, -1, -.6, .3); });
    wrap('wave', (m, t) => { A(m, 1, .4 + Math.sin(t * 6.5) * .09, .96, -.08, 1, -.3, .3); A(m, -1, -.28, -.08, .04, -.2, -.3, 1); });
    wrap('bow', (m, t) => { A(m, 1, .27, -.08, .0, .2, -.2, 1); A(m, -1, -.27, -.08, .0, -.2, -.2, 1); });
    wrap('kneel', (m, t) => { const meta = m.gun.children[0] && m.gun.children[0].userData.meta; if (!meta || !meta.grip || !meta.lh) { A(m, 1, .2, .02, -.32, .8, -.4, .3); A(m, -1, -.22, .05, -.3, -.8, -.4, .3); return; } m.gun.position.set(.13, .42, -.3); m.gun.rotation.set(-.4, .3, 0); const gr = poseGunPt(m, meta.grip[0], meta.grip[1]); A(m, 1, gr.x, gr.y, gr.z, .9, -.6, .5); const h = poseGunPt(m, meta.lh[0], meta.lh[1] - .015); A(m, -1, h.x, h.y, h.z, -.7, -1, .1); });
  }
})();
/* prone (d26): body flat on the ground and tilted to the slope, chest propped on the elbows, gun held level along the view, frog-kick crawl driven by real movement */
function poseProne(e, dt, kk) { const m = e.model, fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), gy = (x, z) => { const f = MAP.floorAt(x, z); return Math.abs(f - e.pos.y) < 1.1 ? f : e.pos.y; };
  const hH = gy(e.pos.x + fx * 1.5, e.pos.z + fz * 1.5), slope = Math.max(-.45, Math.min(.45, Math.atan2(hH - e.pos.y, 1.5))); m.pSlope = m.pSlope === undefined ? slope : m.pSlope + (slope - m.pSlope) * Math.min(1, dt * 8);
  const rx = (-1.52 + m.pSlope) * kk; m.root.rotation.set(rx, e.yaw, 0, 'YXZ'); m.root.position.set(e.pos.x, e.pos.y + .13 * kk, e.pos.z);
  const sp = Math.hypot(e.vel ? e.vel.x : 0, e.vel ? e.vel.z : 0); m.crawl = (m.crawl || 0) + Math.min(sp, 2) * dt * 4.2; const c = Math.sin(m.crawl), mov = Math.min(1, sp / .6);
  m.upper.position.y = .9; const uRx = .55 * kk; m.upper.rotation.set(uRx, c * .07 * mov, c * .05 * mov); m.head.rotation.set(.62 * kk + (e.pitch || 0) * .25, 0, 0);
  for (const [L, s, ph] of [[m.legL, -1, 0], [m.legR, 1, Math.PI]]) { const k = Math.max(0, Math.sin(m.crawl + ph)) * mov; L.position.y = .9; L.scale.y = 1; L.rotation.set(-.04 * kk, 0, s * (.14 + k * .2) * kk, 'ZXY'); L.shin.rotation.x = -(.1 + k * .35) * kk; L.foot.rotation.set(1.3 * kk, 0, 0, 'XZY'); }
  const g = m.gun, meta = g.children[0] && g.children[0].userData.meta || {}, w = WEAPONS[e.weapon] || {}, gun = !!(meta.grip && !w.melee && !w.nade && g.visible !== false);
  if (gun) { const tot = rx + uRx; g.position.set(.1, .5, -.32); g.rotation.set((e.pitch || 0) - tot, 0, 0); const gr = poseGunPt(m, meta.grip[0], meta.grip[1]); islArmIK(m.armR, gr.x, gr.y, gr.z, .6, -.2, .8); if (meta.pistol) { const h = poseGunPt(m, meta.grip[0] + .01, meta.grip[1] - .005); islArmIK(m.armL, h.x - .03, h.y - .03, h.z + .01, -.6, -.2, .8); } else { const lh = meta.lh || [.3, -.035], h = poseGunPt(m, lh[0], lh[1] - .015); islArmIK(m.armL, h.x, h.y, h.z, -.6, -.2, .8); } }
  else { for (const [s, ph] of [[1, 0], [-1, Math.PI]]) { const k = Math.sin(m.crawl + ph) * mov, S = s > 0 ? m.armR.position : m.armL.position; islArmIK(s > 0 ? m.armR : m.armL, S.x + s * .05, S.y + .12 + k * .12, S.z - .42, s * .7, -.2, .6); } } }

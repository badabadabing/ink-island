'use strict';
/* ============ INK STRIKE · fx: ink decals, particles, tracers, flashes, explosions ============ */
const FX = {
  decals: [], pools: [], parts: [], tracers: [], flashes: [], rings: [], nums: [],
  init(scene) {
    const pg = new THREE.PlaneGeometry(1, 1), zero = new THREE.Matrix4().makeScale(0, 0, 0), white = new THREE.Color(1, 1, 1);
    for (let k = 0; k < 4; k++) { const m = new THREE.InstancedMesh(pg, new THREE.MeshBasicMaterial({ map: splatTex(11 + k * 7), transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 110);
      for (let i = 0; i < 110; i++) { m.setMatrixAt(i, zero); m.setColorAt(i, white); } m.frustumCulled = false; m.userData.i = 0; scene.add(m); this.decals.push(m); }
    const pm = this.pm = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1), new THREE.MeshBasicMaterial(), 420); for (let i = 0; i < 420; i++) { pm.setMatrixAt(i, zero); pm.setColorAt(i, white); } pm.frustumCulled = false; pm.count = 0; scene.add(pm);
    const tg = this.tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 6), 3)); tg.setDrawRange(0, 0);
    const tl = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0x55534e, transparent: true, opacity: .75 })); tl.frustumCulled = false; scene.add(tl);
    const sh = new THREE.Shape(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832, r = i % 2 ? .35 : 1; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const sg = new THREE.ShapeGeometry(sh), smat = new THREE.MeshBasicMaterial({ color: AMBER, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(sg, smat); f.visible = false; f.userData.t = 0; scene.add(f); this.flashes.push(f); }
    const rp = []; for (let i = 0; i <= 40; i++) rp.push(Math.cos(i / 40 * 6.2832), 0, Math.sin(i / 40 * 6.2832)); const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    for (let i = 0; i < 9; i++) { const r = new THREE.Line(rg, new THREE.LineBasicMaterial({ color: INK, transparent: true })); r.visible = false; r.userData = { t: 1, d: 0, max: 1 }; scene.add(r); this.rings.push(r); }
  },
  _q: new THREE.Quaternion(), _q2: new THREE.Quaternion(), _m: new THREE.Matrix4(), _v: new V3(), _s: new V3(), _n: new V3(), _Z: new V3(0, 0, 1), _c: new THREE.Color(),
  decal(x, y, z, nx, ny, nz, size, color, grow) {
    const k = (Math.random() * 4) | 0, m = this.decals[k], i = m.userData.i = (m.userData.i + 1) % 110;
    this._n.set(nx, ny, nz); this._q.setFromUnitVectors(this._Z, this._n); this._q2.setFromAxisAngle(this._Z, Math.random() * 6.2832); this._q.multiply(this._q2);
    this._v.set(x + nx * .02, y + ny * .02, z + nz * .02); const s0 = grow ? size * .25 : size; this._m.compose(this._v, this._q, this._s.set(s0, s0, 1)); m.setMatrixAt(i, this._m); m.setColorAt(i, this._c.set(color)); m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
    if (grow) this.pools.push({ m, i, p: this._v.clone(), q: this._q.clone(), s: s0, to: size });
  },
  burst(x, y, z, dx, dy, dz, n, color, speed, size, blood) {
    for (let i = 0; i < n && this.parts.length < 420; i++) this.parts.push({ x, y, z, vx: dx * speed * rand(.2, 1) + gauss() * speed * .3, vy: dy * speed * rand(.2, 1) + gauss() * speed * .3 + 1.2, vz: dz * speed * rand(.2, 1) + gauss() * speed * .3, life: rand(.5, 1.3), s: size * rand(.5, 1.4), c: color, blood, r: rand(6) });
  },
  shell(x, y, z, vx, vy, vz) { if (this.parts.length < 420) this.parts.push({ x, y, z, vx, vy, vz, life: 1.2, s: .014, c: AMBER, r: rand(6) }); },
  tracer(ax, ay, az, bx, by, bz) { const d = Math.hypot(bx - ax, by - ay, bz - az); if (d < 3 || this.tracers.length >= 48) return; this.tracers.push({ ax, ay, az, dx: (bx - ax) / d, dy: (by - ay) / d, dz: (bz - az) / d, d, h: Math.min(2, d * .2) }); },
  flash(x, y, z, s) { const f = this.flashes.find(f => !f.visible) || this.flashes[0]; f.position.set(x, y, z); f.scale.setScalar(s * rand(.8, 1.2)); f.userData.a = rand(6.28); f.userData.t = .05; f.visible = true; },
  explode(x, y, z) {
    let n = 0; for (const r of this.rings) if (!r.visible && n < 3) { r.visible = true; r.position.set(x, y + .1 + n * .5, z); r.userData = { t: 0, d: n * .06, max: 7 - n * 1.5 }; n++; }
    this.burst(x, y + .3, z, 0, 1, 0, 70, INK, 9, .06); this.burst(x, y + .3, z, 0, 1, 0, 20, AMBER, 7, .05); this.flash(x, y + .6, z, 2.2);
    this.decal(x, MAP.floorAt(x, z) + .0, z, 0, 1, 0, 4.5, INK); for (let i = 0; i < 6; i++) { const a = rand(6.28), r = rand(1.5, 3.5); this.decal(x + Math.cos(a) * r, MAP.floorAt(x + Math.cos(a) * r, z + Math.sin(a) * r), z + Math.sin(a) * r, 0, 1, 0, rand(.6, 1.6), INK); }
  },
  clearDecals() { const z = new THREE.Matrix4().makeScale(0, 0, 0); for (const m of this.decals) { for (let i = 0; i < 110; i++) m.setMatrixAt(i, z); m.instanceMatrix.needsUpdate = true; } this.pools.length = 0; },
  num(pos, val, head) { this.nums.push({ x: pos.x + rand(-.15, .15), y: pos.y, z: pos.z, val, head, t: 0 }); if (this.nums.length > 14) this.nums.shift(); },
  update(dt, cam) {
    for (let i = this.pools.length - 1; i >= 0; i--) { const p = this.pools[i]; p.s = Math.min(p.to, p.s + dt * p.to * .5); this._m.compose(p.p, p.q, this._s.set(p.s, p.s, 1)); p.m.setMatrixAt(p.i, this._m); p.m.instanceMatrix.needsUpdate = true; if (p.s >= p.to) this.pools.splice(i, 1); }
    const P = this.parts, pm = this.pm; let n = 0;
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.life -= dt; p.vy -= 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; const fl = MAP.floorAt(p.x, p.z);
      if (p.y < fl + .01 && p.vy < 0) { if (p.blood && Math.random() < .55) this.decal(p.x, fl, p.z, 0, 1, 0, rand(.08, .3), RED); else if (!p.blood && p.c === INK && Math.random() < .2) this.decal(p.x, fl, p.z, 0, 1, 0, rand(.1, .35), INK); p.life = 0; }
      if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); } }
    for (const p of P) { p.r += dt * 9; this._q.setFromAxisAngle(this._Z, p.r); this._v.set(p.x, p.y, p.z); this._m.compose(this._v, this._q, this._s.set(p.s, p.s, p.s)); pm.setMatrixAt(n, this._m); pm.setColorAt(n, this._c.set(p.c)); n++; }
    pm.count = n; pm.instanceMatrix.needsUpdate = true; if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
    const T = this.tracers, a = this.tg.attributes.position.array; let k = 0;
    for (let i = T.length - 1; i >= 0; i--) { const t = T[i]; t.h += 320 * dt; const tail = Math.max(0, t.h - 9), head = Math.min(t.d, t.h); if (tail >= t.d) { T.splice(i, 1); continue; }
      a[k++] = t.ax + t.dx * tail; a[k++] = t.ay + t.dy * tail; a[k++] = t.az + t.dz * tail; a[k++] = t.ax + t.dx * head; a[k++] = t.ay + t.dy * head; a[k++] = t.az + t.dz * head; }
    this.tg.setDrawRange(0, k / 3); this.tg.attributes.position.needsUpdate = true;
    for (const f of this.flashes) if (f.visible) { f.userData.t -= dt; f.quaternion.copy(cam.quaternion); f.rotateZ(f.userData.a); if (f.userData.t <= 0) f.visible = false; }
    for (const r of this.rings) if (r.visible) { const u = r.userData; if (u.d > 0) { u.d -= dt; continue; } u.t += dt * 2.2; const e = 1 - Math.pow(1 - Math.min(u.t, 1), 3); r.scale.setScalar(.2 + e * u.max); r.material.opacity = 1 - u.t; if (u.t >= 1) r.visible = false; }
    for (let i = this.nums.length - 1; i >= 0; i--) { const q = this.nums[i]; q.t += dt; q.y += dt * .7; if (q.t > .9) this.nums.splice(i, 1); }
  }
};

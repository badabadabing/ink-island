'use strict';
/* ============ INK ISLAND · island: terrain heightfield, sea, contours, vegetation, roads, collision, raycast, navigation ============ */
/* World frame: x/z in metres, origin at island centre. Terrain is a (W+1)x(H+1) corner heightfield with `cell` metre spacing; solids are axis boxes on top. */
const MAP = {
  id: 'inkisland', name: '墨岛', en: 'INK ISLAND', size: 640, cell: 1, tc: 2, BS: 8, sea: 0,
  solids: [], buckets: [], ladders: [], surfaces: [], zones: [], points: [], sites: {}, spawn: {}, hmax: 0, flat: false,
  root: null, renderLayers: [], mini: null, menuCamera: { x: -40, y: 70, z: 190, tx: 0, ty: 0, tz: 0 }, contours: [], roads: [], chunks: []
};
MAP.ox = MAP.oz = -MAP.size / 2; MAP.W = MAP.H = MAP.size / MAP.cell; MAP.TW = MAP.size / MAP.tc; MAP.BW = MAP.BH = Math.ceil(MAP.size / MAP.BS);
MAP.bounds = { x1: MAP.ox + 1, x2: -MAP.ox - 1, z1: MAP.oz + 1, z2: -MAP.oz - 1 };
MAP.hf = new Float32Array((MAP.TW + 1) * (MAP.TW + 1));
/* Named places. `pad` is the flattened build height (0.25 m graded), filled in by genTerrain. */
const TOWNS = [
  { id: 'armory', name: '军械库', en: 'ARMORY', x: -96, z: -10, r: 36, pad: 0 },
  { id: 'yard', name: '晒纸场', en: 'DRYING YARD', x: 18, z: -158, r: 32, pad: 0 },
  { id: 'light', name: '灯塔渔村', en: 'LANTERN COVE', x: 158, z: 150, r: 30, pad: 0 },
  { id: 'farm', name: '墨池农庄', en: 'INK POND FARM', x: -144, z: 128, r: 36, pad: 0 },
  { id: 'obs', name: '山顶观测站', en: 'HILLTOP POST', x: 166, z: -138, r: 22, pad: 0 },
  { id: 'print', name: '废弃印厂', en: 'OLD PRINT WORKS', x: 122, z: 8, r: 36, pad: 0 },
  { id: 'wharf', name: '码头货栈', en: 'WHARF', x: -192, z: -120, r: 30, pad: 0 },
  { id: 'bridge', name: '断桥村', en: 'BROKEN BRIDGE', x: -20, z: 40, r: 30, pad: 0 },
  { id: 'quarry', name: '石矿场', en: 'QUARRY', x: 40, z: 178, r: 32, pad: 0 }
];
const RIVER = [[-54, -318], [-46, -226], [-40, -106], [-22, -14], [-40, 66], [-106, 186], [-160, 318]];

/* bilinear terrain height; below MAP.sea is water */
MAP.terrainY = (x, z) => {
  const W = MAP.TW, H = MAP.TW, c = MAP.tc, fx = (x - MAP.ox) / c, fz = (z - MAP.oz) / c, i = clamp(Math.floor(fx), 0, W - 1), j = clamp(Math.floor(fz), 0, H - 1), u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1), hf = MAP.hf, r = W + 1;
  const a = hf[j * r + i], b = hf[j * r + i + 1], d = hf[(j + 1) * r + i], e = hf[(j + 1) * r + i + 1];
  return a + (b - a) * u + (d - a) * v + (a - b - d + e) * u * v;
};
MAP.terrainN = (x, z, out) => { const s = .5, hl = MAP.terrainY(x - s, z), hr = MAP.terrainY(x + s, z), hd = MAP.terrainY(x, z - s), hu = MAP.terrainY(x, z + s); out.set(hl - hr, 2 * s, hd - hu).normalize(); return out; };
MAP.townAt = (x, z) => { for (const t of TOWNS) if (Math.hypot(x - t.x, z - t.z) < t.r + 6) return t; return null; };
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
const polyDist = (px, pz, P) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, segDist(px, pz, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1])); return d; };
const sstep = (a, b, t) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

/* ---------------- value noise ---------------- */
function mkNoise(seed) { const R = rng(seed), p = new Uint8Array(512); for (let i = 0; i < 256; i++) p[i] = i; for (let i = 255; i > 0; i--) { const j = (R() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; } for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  const h = (x, y) => p[(p[x & 255] + y) & 511] / 255, sm = t => t * t * (3 - 2 * t);
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi), a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  return (x, y, oct = 4) => { let s = 0, a = .5, f = 1, norm = 0; for (let o = 0; o < oct; o++) { s += a * n(x * f, y * f); norm += a; f *= 2.03; a *= .5; } return s / norm; }; }

/* ---------------- terrain ---------------- */
function genTerrain() {
  const W = MAP.TW, H = MAP.TW, r = W + 1, hf = MAP.hf, c = MAP.tc, N1 = mkNoise(7), N2 = mkNoise(31), N3 = mkNoise(99);
  const link = (a, b, via) => { const P = [[a.x, a.z]]; if (via) P.push(via); P.push([b.x, b.z]); MAP.roads.push(P); };
  link(TOWNS[0], TOWNS[1], [-40, -94]); link(TOWNS[0], TOWNS[7], [-60, 10]); link(TOWNS[7], TOWNS[5], [50, 20]); link(TOWNS[0], TOWNS[3], [-128, 62]); link(TOWNS[5], TOWNS[2], [150, 80]); link(TOWNS[5], TOWNS[4], [158, -66]); link(TOWNS[1], TOWNS[4], [100, -165]); link(TOWNS[3], TOWNS[8], [-50, 190]); link(TOWNS[8], TOWNS[2], [110, 180]); link(TOWNS[0], TOWNS[6], [-150, -70]); link(TOWNS[6], TOWNS[1], [-90, -170]); link(TOWNS[7], TOWNS[8], [10, 120]);
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
    const x = MAP.ox + i * c, z = MAP.oz + j * c, R0 = MAP.size / 2, nx = x / R0, nz = z / R0;
    const d = Math.hypot(nx * 1.02, nz * .96) + (N1(x / 220 + 3, z / 220 + 3, 3) - .5) * .42;          // perturbed coast
    const land = 1 - sstep(.62, .92, d);
    let h = -9 + land * 13 + (N2(x / 115, z / 115, 5) - .45) * 26 * land + (N3(x / 22, z / 22, 3) - .5) * 2.2 * land;
    h += Math.exp(-((x - 166) ** 2 + (z + 138) ** 2) / (92 * 92)) * 36 * land;                           // the hill
    h += Math.exp(-((x + 200) ** 2 + (z + 40) ** 2) / (70 * 70)) * 11 * land + Math.exp(-((x - 60) ** 2 + (z - 120) ** 2) / (60 * 60)) * 9 * land;                              // western rise
    const rv = polyDist(x, z, RIVER); if (rv < 16) { const k = 1 - sstep(4, 16, rv), ford = MAP.roadDist(x, z) < 9; h = Math.min(h, lerp(h, ford ? .6 : -2.4, k)); }   // roads cross the river on shallow fords
    hf[j * r + i] = h;
  }
  // flatten town pads (0.25 m graded) and remember them
  for (const t of TOWNS) { let s = 0, n = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { s += MAP.terrainY(t.x + a * t.r * .5, t.z + b * t.r * .5); n++; } t.pad = Math.max(1.5, Math.round(s / n * 4) / 4);
    for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) { const x = MAP.ox + i * c, z = MAP.oz + j * c, dd = Math.hypot(x - t.x, z - t.z); if (dd > t.r + 18) continue; if (t.id === 'bridge' && polyDist(x, z, RIVER) < 11) continue; const k = 1 - sstep(t.r, t.r + 18, dd); hf[j * r + i] = lerp(hf[j * r + i], t.pad, k); } }   // the bridge village keeps its river
  // roads: smooth corridors between towns, slightly cut into slopes
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) { const x = MAP.ox + i * c, z = MAP.oz + j * c; let best = 1e9; for (const P of MAP.roads) best = Math.min(best, polyDist(x, z, P)); if (best < 9) { const k = (1 - sstep(3, 9, best)) * .35; let hh = hf[j * r + i]; const avg = (MAP.terrainY(x - 6, z) + MAP.terrainY(x + 6, z) + MAP.terrainY(x, z - 6) + MAP.terrainY(x, z + 6)) / 4; hf[j * r + i] = lerp(hh, avg, k); } }
  let hmax = 0; for (let i = 0; i < hf.length; i++) hmax = Math.max(hmax, hf[i]); MAP.hmax = hmax + .01;
}
MAP.roadDist = (x, z) => { let d = 1e9; for (const P of MAP.roads) d = Math.min(d, polyDist(x, z, P)); return d; };

/* terrain mesh: indexed grid, tone from slope vs sun, sand and seabed tints; contour lines by marching squares */
function buildTerrainMesh(root) {
  const W = MAP.TW, H = MAP.TW, r = W + 1, c = MAP.tc, hf = MAP.hf, pos = new Float32Array(r * r * 3), tone = new Float32Array(r * r), tint = new Float32Array(r * r * 3), sand = tintOf(0xece4cf), sea = tintOf(GLASS), paper = tintOf(PAPER), deep = tintOf(0xc5d6de);
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) { const k = j * r + i, x = MAP.ox + i * c, z = MAP.oz + j * c, h = hf[k]; pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    const hl = hf[j * r + Math.max(0, i - 1)], hr = hf[j * r + Math.min(W, i + 1)], hd = hf[Math.max(0, j - 1) * r + i], hu = hf[Math.min(H, j + 1) * r + i], nx = (hl - hr) / (2 * c), nz = (hd - hu) / (2 * c), slope = Math.hypot(nx, nz), lit = nx * SUN.x + nz * SUN.z;
    let t = slope > .55 ? .66 : (lit > .07 && slope > .12) ? .33 : 0; let col = paper; if (h < .5) { col = h < -.6 ? (h < -4 ? deep : sea) : sand; t = h < -.6 ? 0 : t; } else if (h < 1.6) col = sand;
    tone[k] = t; tint[k * 3] = col.r; tint[k * 3 + 1] = col.g; tint[k * 3 + 2] = col.b; }
  const idx = new Uint32Array(W * H * 6); let q = 0; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const a = j * r + i, b = a + 1, d = a + r, e = d + 1; idx[q++] = a; idx[q++] = d; idx[q++] = b; idx[q++] = b; idx[q++] = d; idx[q++] = e; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('tone', new THREE.BufferAttribute(tone, 1)); g.setAttribute('tint', new THREE.BufferAttribute(tint, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, fillMat({ freq: 3, hatch: .55, hw: .09, fog: WORLD_FOG })); root.add(mesh);
  // sea sheet
  const sk = new Sk('none'), S = MAP.size / 2 + 400; sk.quad([-S, MAP.sea - .02, -S], [-S, MAP.sea - .02, S], [S, MAP.sea - .02, S], [S, MAP.sea - .02, -S], 0, GLASS);
  const R = rng(5), waves = []; for (let i = 0; i < 4200; i++) { const x = (R() - .5) * (MAP.size - 10), z = (R() - .5) * (MAP.size - 10), h = MAP.terrainY(x, z); if (h > -.2 || h < -9) continue; const l = R() * 1.6 + .6; waves.push(x - l, MAP.sea + .01, z, x + l, MAP.sea + .01, z, x + l + .4, MAP.sea + .01, z + .15, x + l + 1.1, MAP.sea + .01, z + .15); }
  for (let i = 0; i < 1400; i++) { const x = (R() - .5) * 1200, z = (R() - .5) * 1200, h = MAP.terrainY(x, z); if (h > -5) continue; const l = R() * 2 + 1; waves.push(x - l, MAP.sea + .01, z, x + l, MAP.sea + .01, z); }
  sk.line(waves); const seaG = sk.bake(fillMat({ freq: 2, fog: WORLD_FOG }), lineMat({ width: 1, color: 0x7f9bb0 })); root.add(seaG);
  // contours: every 2 m from 2 m, plus the 0.5 m shoreline; segments kept for the minimap
  const L = [], levels = [.5]; for (let v = 2; v < MAP.hmax; v += 2) levels.push(v); MAP.contours = [];
  for (const lv of levels) { const segs = []; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const a = hf[j * r + i], b = hf[j * r + i + 1], d = hf[(j + 1) * r + i], e = hf[(j + 1) * r + i + 1], m = (a >= lv ? 8 : 0) | (b >= lv ? 4 : 0) | (e >= lv ? 2 : 0) | (d >= lv ? 1 : 0); if (!m || m === 15) continue;
      const x0 = MAP.ox + i * c, z0 = MAP.oz + j * c, pt = { t: [x0 + c * (lv - a) / (b - a || 1e-9), z0], rt: [x0 + c, z0 + c * (lv - b) / (e - b || 1e-9)], bt: [x0 + c * (lv - d) / (e - d || 1e-9), z0 + c], lt: [x0, z0 + c * (lv - a) / (d - a || 1e-9)] };
      const E = { 1: ['lt', 'bt'], 2: ['bt', 'rt'], 3: ['lt', 'rt'], 4: ['t', 'rt'], 5: ['t', 'lt', 'bt', 'rt'], 6: ['t', 'bt'], 7: ['t', 'lt'], 8: ['t', 'lt'], 9: ['t', 'bt'], 10: ['t', 'rt', 'bt', 'lt'], 11: ['t', 'rt'], 12: ['lt', 'rt'], 13: ['bt', 'rt'], 14: ['lt', 'bt'] }[m];
      for (let k = 0; k < E.length; k += 2) { const p = pt[E[k]], q = pt[E[k + 1]]; segs.push(p[0], p[1], q[0], q[1]); L.push(p[0], lv + .04, p[1], q[0], lv + .04, q[1]); } }
    MAP.contours.push({ lv, segs }); }
  const lg = new LineSegmentsGeometry(); lg.setPositions(L); const lines = new LineSegments2(lg, lineMat({ width: .9, color: 0x5a584f })); lines.computeLineDistances(); root.add(lines);
  MAP.renderLayers.push(mesh, seaG, lines);
}
const WORLD_FOG = .0042;

/* ---------------- world construction ---------------- */
function buildMap(scene) {
  if (MAP.root) { scene.remove(MAP.root); MAP.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  MAP.solids.length = 0; MAP.roads.length = 0; MAP.renderLayers = []; MAP.root = new THREE.Group(); scene.add(MAP.root);
  genTerrain(); buildTerrainMesh(MAP.root); buildBuckets(); buildWorld(MAP.root); buildBuckets(); buildNav(); drawMini();
}
const CH = 64, NCH = Math.ceil(MAP.size / CH);
function buildWorld(root) {
  const R = rng(20261005), chunks = MAP.chunks = []; for (let i = 0; i < NCH * NCH; i++) chunks.push({ sk: new Sk('sun'), det: new Sk('sun') });
  const ci = (x, z) => clamp(Math.floor((z - MAP.oz) / CH), 0, NCH - 1) * NCH + clamp(Math.floor((x - MAP.ox) / CH), 0, NCH - 1);
  const skAt = (x, z) => chunks[ci(x, z)].sk, detAt = (x, z) => chunks[ci(x, z)].det, S = MAP.solids, tY = MAP.terrainY;
  const solid = (x1, z1, x2, z2, y0, y1, o = {}) => { S.push({ x1, z1, x2, z2, y1: y0, y2: y1, slab: !!o.slab, stair: !!o.stair, terrace: !!o.terrace, veg: !!o.veg }); if (o.vis !== false) skAt((x1 + x2) / 2, (z1 + z2) / 2).bx(x1, y0, z1, x2, y1, z2, { tint: o.tint ?? PAPER, tone: o.tone ?? -1 }); };
  const rr = (a, b) => a + R() * (b - a);
  /* roads: paper wash strip + two broken edge lines that follow the terrain */
  for (const P of MAP.roads) { for (let s = 0; s < P.length - 1; s++) { const [ax, az] = P[s], [bx, bz] = P[s + 1], len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 2), ux = (bx - ax) / len, uz = (bz - az) / len, px = -uz, pz = ux; let prev = null;
    for (let k = 0; k <= n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, w = 2.4 + Math.sin(k * 1.7) * .2, l = [x + px * w, tY(x + px * w, z + pz * w) + .03, z + pz * w], rgt = [x - px * w, tY(x - px * w, z - pz * w) + .03, z - pz * w];
      if (prev) { const sk = skAt(x, z); sk.quad(prev[0], prev[1], rgt, l, -.09, PAPER); if (k % 3 !== 0) sk.line([prev[0][0], prev[0][1] + .01, prev[0][2], l[0], l[1] + .01, l[2]]); if (k % 4 !== 1) sk.line([prev[1][0], prev[1][1] + .01, prev[1][2], rgt[0], rgt[1] + .01, rgt[2]]); } prev = [l, rgt]; } } }
  /* vegetation */
  const N = mkNoise(77); let trees = 0;
  const pine = (x, z, h) => { const sk = skAt(x, z), y = tY(x, z); sk.cyl(.11, .18, h * .4, 5, x, y + h * .2, z, { edges: false, tone: .33 }); sk.line([x - .1, y, z, x - .07, y + h * .4, z, x + .1, y, z, x + .07, y + h * .4, z]);
    for (let k = 0; k < 3; k++) { const yb = y + h * (.28 + k * .22), rad = h * (.22 - k * .05), hh = h * .3; sk.cone(rad, hh, 6, x, yb + hh / 2, z, { edges: false, tone: k === 2 ? 0 : .33 }); const pts = []; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832 + k * .5; pts.push([x + Math.cos(a) * rad, yb + (i % 2 ? .12 : 0), z + Math.sin(a) * rad]); } sk.poly(pts, true); sk.line([x + Math.cos(k) * rad, yb, z + Math.sin(k) * rad, x, yb + hh, z, x + Math.cos(k + 2.6) * rad, yb, z + Math.sin(k + 2.6) * rad, x, yb + hh, z]); }
    solid(x - .22, z - .22, x + .22, z + .22, y, y + h * .5, { vis: false, veg: true }); trees++; };
  const broad = (x, z, h) => { const sk = skAt(x, z), y = tY(x, z), rad = h * .34; sk.cyl(.13, .2, h * .5, 5, x, y + h * .25, z, { edges: false, tone: .33 }); sk.line([x - .12, y, z, x - .08, y + h * .5, z, x + .12, y, z, x + .08, y + h * .5, z, x + .08, y + h * .5, z, x + .5, y + h * .62, z + .2]);
    sk.add(new THREE.SphereGeometry(rad, 7, 5).scale(1, .8, 1), new THREE.Matrix4().makeTranslation(x, y + h * .68, z), { edges: false, tone: .33 });
    const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.2832; pts.push([x + Math.cos(a) * rad * (.9 + (i % 2) * .18), y + h * .68 + Math.sin(i * 2.1) * rad * .25, z + Math.sin(a) * rad * (.9 + (i % 2) * .18)]); } sk.poly(pts, true);
    const arc = []; for (let i = 0; i <= 6; i++) { const a = i / 6 * 2.2 + .4; arc.push([x + Math.cos(a) * rad * .7, y + h * .68 + rad * .55 - Math.abs(3 - i) * .06, z + Math.sin(a) * rad * .7]); } sk.poly(arc); solid(x - .25, z - .25, x + .25, z + .25, y, y + h * .5, { vis: false, veg: true }); trees++; };
  const rock = (x, z, s) => { const sk = skAt(x, z), y = tY(x, z); sk.add(new THREE.DodecahedronGeometry(s, 0).scale(1, .62, .8), new THREE.Matrix4().makeRotationY(rr(0, 3)).setPosition(x, y + s * .3, z), { tone: .33, ea: 30 }); if (s > .8) solid(x - s * .7, z - s * .6, x + s * .7, z + s * .6, y, y + s * .85, { vis: false, veg: true }); };
  const grass = (x, z) => { const sk = detAt(x, z), y = tY(x, z), a = []; for (let i = 0; i < 4; i++) { const dx = rr(-.4, .4), dz = rr(-.4, .4), h = rr(.25, .5); a.push(x + dx, y, z + dz, x + dx + rr(-.1, .1), y + h, z + dz); } sk.line(a); };
  const EX = MAP.size / 2 - 4; for (let i = 0; i < 46000; i++) { const x = rr(-EX, EX), z = rr(-EX, EX), y = tY(x, z); if (y < 1.4 || y > 30) continue; const town = MAP.townAt(x, z) || TOWNS.some(t => Math.hypot(x - t.x, z - t.z) < t.r + 12); if (town || MAP.roadDist(x, z) < 4.5 || polyDist(x, z, RIVER) < 8) continue;
    const slope = Math.abs(tY(x + 1, z) - tY(x - 1, z)) + Math.abs(tY(x, z + 1) - tY(x, z - 1)), dens = N(x / 48 + 9, z / 48 + 9, 3); if (slope > 1.4) { if (R() < .04) rock(x, z, rr(.5, 1.6)); continue; }
    if (dens > .56 && R() < (dens - .5) * 1.8 && trees < 2900) { if (y > 12 || N(x / 30, z / 30, 2) > .55) pine(x, z, rr(5, 9)); else broad(x, z, rr(4.5, 7.5)); } else if (R() < .03) rock(x, z, rr(.35, 1.2)); else if (R() < .12) grass(x, z); }
  // river boulders and the shoreline stones
  for (let i = 0; i < 260; i++) { const x = rr(-EX, EX), z = rr(-EX, EX), y = tY(x, z); if (y > -.3 && y < .9 && R() < .5) rock(x, z, rr(.4, 1.1)); }
  LOOT.spots.length = 0; MAP.floors = []; MAP.ladders = []; MAP.windows = []; MAP.buildings = []; const kit = { building: b => MAP.buildings.push(b), solid, skAt, detAt, rr, R, tY, rock, spot: (x, z, y) => LOOT.spots.push({ x, z, y }), floor: f => MAP.floors.push(f), ladder: L => MAP.ladders.push(L), win: w => { const t = .06, sol = w.axis === 'x' ? { x1: w.s0, z1: w.fixed - t, x2: w.s1, z2: w.fixed + t, y1: w.yb, y2: w.yt } : { x1: w.fixed - t, z1: w.s0, x2: w.fixed + t, z2: w.s1, y1: w.yb, y2: w.yt }; sol.glass = true; sol.win = w; w.solid = sol; w.broken = false; S.push(sol); MAP.windows.push(w); }, sign: (text, x, y, z, ry, w, h, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(text, o), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.position.set(x, y, z); if (o.flat) { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; } else m.rotation.y = ry; root.add(m); return m; } };
  buildTowns(kit); buildGlass(root); { const keep = []; for (const sp of LOOT.spots) { let inside = false; for (const s of S) if (!s.glass && !s.veg && sp.x > s.x1 && sp.x < s.x2 && sp.z > s.z1 && sp.z < s.z2 && s.y1 <= sp.y + .3 && s.y2 > sp.y + .3) { inside = true; break; } if (!inside) keep.push(sp); } LOOT.spots.length = 0; LOOT.spots.push(...keep); }
  const fmW = fillMat({ fog: WORLD_FOG }), lmW = lineMat({ width: 1.4 }), lmD = lineMat({ width: 1.0 });
  chunks.forEach((c, i) => { const a = c.sk.bake(fmW, lmW), b = c.det.bake(fmW, lmD); c.g = a; c.gd = b; c.cx = MAP.ox + (i % NCH + .5) * CH; c.cz = MAP.oz + (Math.floor(i / NCH) + .5) * CH; for (const g of [a, b]) { g.traverse(o => { if (o.isLineSegments2) { o.geometry.computeBoundingSphere(); } }); root.add(g); MAP.renderLayers.push(g); } });
  MAP.zones = TOWNS.map(t => [t.x - t.r, t.z - t.r, t.x + t.r, t.z + t.r, t.name]);
  MAP.points = TOWNS.map(t => ({ n: t.id, x: t.x, z: t.z, red: 1, blue: 1 }));
  MAP.spawn = { player: { x: TOWNS[0].x, z: TOWNS[0].z + 27 } }; MAP.menuCamera = { x: -60, y: 90, z: 260, tx: 0, ty: 0, tz: 0 };
}
/* distance LOD, chosen per quality tier: grass and other fine detail fades out first, then the ink lines of far chunks (the paper fill stays, so the silhouette never vanishes) */
const LOD = { grass: 150, lines: 420, tiers: { low: [90, 220], balanced: [150, 420], high: [260, 1e9] } };
MAP.setDetail = q => { const t = LOD.tiers[q] || LOD.tiers.balanced; LOD.grass = t[0]; LOD.lines = t[1]; };
MAP.lod = (cx, cz) => { const g2 = LOD.grass * LOD.grass, l2 = LOD.lines * LOD.lines; for (const c of MAP.chunks) { if (!c.g) continue; const d2 = (c.cx - cx) ** 2 + (c.cz - cz) ** 2; c.gd.visible = d2 < g2; if (c.g.ink) c.g.ink.visible = d2 < l2; } };
/* window panes: one instanced sheet of glass, hidden pane by pane as they break */
function buildGlass(root) { const n = MAP.windows.length; if (!n) return; const geo = new THREE.PlaneGeometry(1, 1), mat = new THREE.MeshBasicMaterial({ color: GLASS, transparent: true, opacity: .62, side: THREE.DoubleSide, depthWrite: false }), m = new THREE.InstancedMesh(geo, mat, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new V3(), sc = new V3();
  MAP.windows.forEach((w, i) => { w.idx = i; const cx = w.axis === 'x' ? (w.s0 + w.s1) / 2 : w.fixed, cz = w.axis === 'x' ? w.fixed : (w.s0 + w.s1) / 2; p.set(cx, (w.yb + w.yt) / 2, cz); q.setFromAxisAngle(new V3(0, 1, 0), w.axis === 'x' ? 0 : Math.PI / 2); sc.set(w.s1 - w.s0, w.yt - w.yb, 1); M.compose(p, q, sc); m.setMatrixAt(i, M); }); m.frustumCulled = false; m.renderOrder = 2; root.add(m); MAP.glassMesh = m; }
function breakGlass(w, by) { if (!w || w.broken) return; w.broken = true; const s = w.solid; s.x1 = s.x2 = 1e6; s.z1 = s.z2 = 1e6; MAP.glassMesh.setMatrixAt(w.idx, new THREE.Matrix4().makeScale(0, 0, 0)); MAP.glassMesh.instanceMatrix.needsUpdate = true;
  const cx = w.axis === 'x' ? (w.s0 + w.s1) / 2 : w.fixed, cz = w.axis === 'x' ? w.fixed : (w.s0 + w.s1) / 2, cy = (w.yb + w.yt) / 2; FX.burst(cx, cy, cz, w.axis === 'x' ? 0 : 1, .2, w.axis === 'x' ? 1 : 0, 18, GLASS, 3.5, .05); FX.burst(cx, cy, cz, w.axis === 'x' ? 0 : -1, .2, w.axis === 'x' ? -1 : 0, 12, GLASS, 2.5, .04); SFX.impact({ x: cx, y: cy, z: cz }); SFX.shellDrop(3); if (typeof botHear === 'function') botHear({ x: cx, y: cy, z: cz }, by ? by.team : 'x', 26, 'shot'); }
function windowAhead(e, fx, fz) { for (const w of MAP.windows) { const nx = w.axis === 'x' ? 0 : 1, nz = w.axis === 'x' ? 1 : 0; if (Math.abs(fx * nx + fz * nz) < .6) continue; const cx = w.axis === 'x' ? (w.s0 + w.s1) / 2 : w.fixed, cz = w.axis === 'x' ? w.fixed : (w.s0 + w.s1) / 2; const dx = cx - e.pos.x, dz = cz - e.pos.z; if (Math.abs(dx) > 2 || Math.abs(dz) > 2) continue; const along = w.axis === 'x' ? Math.abs(e.pos.x - cx) : Math.abs(e.pos.z - cz), across = w.axis === 'x' ? dz : dx; if (along > (w.s1 - w.s0) / 2 + .1 || Math.abs(across) > 1.1 || across * (w.axis === 'x' ? fz : fx) < 0) continue; if (w.yb - e.pos.y < .3 || w.yb - e.pos.y > 1.5) continue; return w; } return null; }

/* ---------------- collision ---------------- */
function buildBuckets() {
  const B = MAP.buckets = [], BS = MAP.BS; for (let i = 0; i < MAP.BW * MAP.BH; i++) B.push([]);
  let rid = 0; for (const s of MAP.solids) { s.rayId = rid++; s.rayStamp = 0; const i1 = clamp(Math.floor((s.x1 - 1.5 - MAP.ox) / BS), 0, MAP.BW - 1), i2 = clamp(Math.floor((s.x2 + 1.5 - MAP.ox) / BS), 0, MAP.BW - 1), j1 = clamp(Math.floor((s.z1 - 1.5 - MAP.oz) / BS), 0, MAP.BH - 1), j2 = clamp(Math.floor((s.z2 + 1.5 - MAP.oz) / BS), 0, MAP.BH - 1);
    for (let i = i1; i <= i2; i++) for (let j = j1; j <= j2; j++) B[j * MAP.BW + i].push(s); }
}
MAP.near = (x, z) => MAP.buckets[clamp(Math.floor((z - MAP.oz) / MAP.BS), 0, MAP.BH - 1) * MAP.BW + clamp(Math.floor((x - MAP.ox) / MAP.BS), 0, MAP.BW - 1)];
function entOverlap(e, x, y, z, list) { const w = e.hw; for (let i = 0; i < list.length; i++) { const s = list[i]; if (x + w > s.x1 && x - w < s.x2 && z + w > s.z1 && z - w < s.z2 && y + e.hgt > s.y1 && y < s.y2) return s; } return null; }
const SWIM_Y = -1.25;   // feet depth while afloat: eyes just clear the water
function supportY(e, list) { const p = e.pos, w = e.hw; let y = Math.max(MAP.terrainY(p.x, p.z), MAP.sea + SWIM_Y); for (let i = 0; i < list.length; i++) { const s = list[i]; if (p.x + w > s.x1 && p.x - w < s.x2 && p.z + w > s.z1 && p.z - w < s.z2 && s.y2 <= p.y + .02 && s.y2 > y) y = s.y2; } return y; }
const inWater = e => MAP.terrainY(e.pos.x, e.pos.z) < MAP.sea - .35 && e.pos.y < MAP.sea + .2;
const GRAV = 17;
function moveEntity(e, dt) {
  const p = e.pos, v = e.vel, near = MAP.near(p.x, p.z); e.hitWall = false; e.landed = 0;
  for (const ax of ['x', 'z']) {
    const d = v[ax] * dt; if (!d) continue; const old = p[ax]; p[ax] += d;
    for (let k = 0; k < 4; k++) {
      const s = entOverlap(e, p.x, p.y, p.z, near); if (!s) break;
      // everything under the footprint that rises at most a step is a stair: climb to the highest tread; anything taller, or hanging over the feet, is a wall
      let top = 0, wall = false; for (let i = 0; i < near.length; i++) { const q = near[i]; if (!(p.x + e.hw > q.x1 && p.x - e.hw < q.x2 && p.z + e.hw > q.z1 && p.z - e.hw < q.z2 && p.y + e.hgt > q.y1 && p.y < q.y2)) continue; if (q.y1 > p.y + .3 || q.y2 - p.y > .56) { wall = true; break; } if (q.y2 > top) top = q.y2; }
      if (e.onGround && !wall && top > p.y) { e.stepSmooth -= top - p.y; p.y = top + .001; continue; }
      p[ax] = d > 0 ? s[ax + '1'] - e.hw - .001 : s[ax + '2'] + e.hw + .001; v[ax] = 0; e.hitWall = true;
      if (k === 3 && entOverlap(e, p.x, p.y, p.z, near)) p[ax] = old;
    }
  }
  const b = MAP.bounds; p.x = clamp(p.x, b.x1, b.x2); p.z = clamp(p.z, b.z1, b.z2);
  const sup = supportY(e, near);
  if (e.onGround && v.y <= 0 && p.y - sup <= .31) { e.stepSmooth += p.y - sup; p.y = sup; v.y = 0; }
  else {
    v.y -= GRAV * dt; const ny = p.y + v.y * dt;
    if (v.y <= 0 && ny <= sup) { e.landed = -v.y; p.y = sup; v.y = 0; e.onGround = true; }
    else { p.y = ny; e.onGround = false; if (v.y > 0) { const s = entOverlap(e, p.x, p.y, p.z, near); if (s) { p.y = s.y1 - e.hgt - .001; v.y = 0; } } }
  }
}

/* ray vs world. returns hit record (shared) or null */
const _hit = { t: 0, tx: 0, nx: 0, ny: 0, nz: 0, s: null }, _tn = new V3();
/* terrain intersection: coarse march then bisection; skipped entirely while the ray stays above the highest point */
function rayTerrain(ox, oy, oz, dx, dy, dz, maxT) {
  if (MAP.flat) { if (dy >= 0) return -1; const t = -oy / dy; return t < maxT ? t : -1; }
  let t0 = 0; if (oy > MAP.hmax) { if (dy >= 0) return -1; t0 = (oy - MAP.hmax) / -dy; if (t0 >= maxT) return -1; }
  const step = 1.2; let t = t0; if (oy + dy * t - MAP.terrainY(ox + dx * t, oz + dz * t) <= 0) return t0;
  while (t < maxT) { t = Math.min(maxT, t + step); const h = oy + dy * t - MAP.terrainY(ox + dx * t, oz + dz * t); if (h <= 0) { let a = t - step, b = t; for (let k = 0; k < 7; k++) { const m = (a + b) / 2; if (oy + dy * m - MAP.terrainY(ox + dx * m, oz + dz * m) <= 0) b = m; else a = m; } return b; } if (t >= maxT) break; }
  return -1;
}
function rayWorldLinear(ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT, bs = null, bn = 0, btx = 0; const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz, S = MAP.solids;
  for (let i = 0; i < S.length; i++) { const s = S[i]; if (_ignoreGlass && s.glass) continue;
    let t1 = (s.x1 - ox) * ix, t2 = (s.x2 - ox) * ix, tn, tf, ax = 0; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } tn = t1; tf = t2;
    t1 = (s.y1 - oy) * iy; t2 = (s.y2 - oy) * iy; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 1; } if (t2 < tf) tf = t2; if (tn > tf) continue;
    t1 = (s.z1 - oz) * iz; t2 = (s.z2 - oz) * iz; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 2; } if (t2 < tf) tf = t2;
    if (tn > tf || tn < 0 || tn >= best) continue; best = tn; bs = s; bn = ax; btx = tf; }
  return finishRay(ox, oy, oz, dx, dy, dz, best, bs, bn, btx);
}
function finishRay(ox, oy, oz, dx, dy, dz, best, bs, bn, btx) {
  const tt = rayTerrain(ox, oy, oz, dx, dy, dz, best); if (tt >= 0) { MAP.terrainN(ox + dx * tt, oz + dz * tt, _tn); _hit.t = tt; _hit.tx = tt + 99; _hit.nx = _tn.x; _hit.ny = _tn.y; _hit.nz = _tn.z; _hit.s = null; return _hit; }
  if (!bs) return null;
  _hit.t = best; _hit.tx = btx; _hit.s = bs; _hit.nx = bn === 0 ? -Math.sign(dx) : 0; _hit.ny = bn === 1 ? -Math.sign(dy) : 0; _hit.nz = bn === 2 ? -Math.sign(dz) : 0; return _hit;
}
let _raySeq = 0, _ignoreGlass = false;
function rayWorld(ox, oy, oz, dx, dy, dz, maxT) {
  if (!dx || !dy || !dz) return rayWorldLinear(ox, oy, oz, dx, dy, dz, maxT);
  let best = maxT, bs = null, bn = 0, btx = 0, bid = Infinity, lo = 0, hi = maxT; const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz, stamp = ++_raySeq, BS = MAP.BS, X0 = MAP.ox, Z0 = MAP.oz, X1 = X0 + MAP.BW * BS, Z1 = Z0 + MAP.BH * BS;
  let a = (X0 - ox) * ix, b = (X1 - ox) * ix; if (a > b) { const q = a; a = b; b = q; } lo = Math.max(lo, a); hi = Math.min(hi, b);
  a = (Z0 - oz) * iz; b = (Z1 - oz) * iz; if (a > b) { const q = a; a = b; b = q; } lo = Math.max(lo, a); hi = Math.min(hi, b);
  if (lo <= hi) {
    let ci = clamp(Math.floor((ox + dx * lo - X0) / BS), 0, MAP.BW - 1), cj = clamp(Math.floor((oz + dz * lo - Z0) / BS), 0, MAP.BH - 1), t = lo;
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1, txd = Math.abs(BS * ix), tzd = Math.abs(BS * iz); let tx = (X0 + (ci + (sx > 0 ? 1 : 0)) * BS - ox) * ix, tz = (Z0 + (cj + (sz > 0 ? 1 : 0)) * BS - oz) * iz;
    while (ci >= 0 && cj >= 0 && ci < MAP.BW && cj < MAP.BH && t <= hi && t <= best) {
      const near = MAP.buckets[cj * MAP.BW + ci];
      for (let i = 0; i < near.length; i++) { const s = near[i]; if (s.rayStamp === stamp) continue; s.rayStamp = stamp; if (_ignoreGlass && s.glass) continue;
        let t1 = (s.x1 - ox) * ix, t2 = (s.x2 - ox) * ix, tn, tf, ax = 0; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } tn = t1; tf = t2;
        t1 = (s.y1 - oy) * iy; t2 = (s.y2 - oy) * iy; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 1; } if (t2 < tf) tf = t2; if (tn > tf) continue;
        t1 = (s.z1 - oz) * iz; t2 = (s.z2 - oz) * iz; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 2; } if (t2 < tf) tf = t2;
        if (tn > tf || tn < 0 || tn > best || (tn === best && (!bs || s.rayId >= bid))) continue; best = tn; bs = s; bn = ax; btx = tf; bid = s.rayId;
      }
      if (tx < tz) { t = tx; tx += txd; ci += sx; } else if (tz < tx) { t = tz; tz += tzd; cj += sz; } else { t = tx; tx += txd; tz += tzd; ci += sx; cj += sz; }
    }
  }
  return finishRay(ox, oy, oz, dx, dy, dz, best, bs, bn, btx);
}
function segClear(ax, ay, az, bx, by, bz) { const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz); if (d < .01) return true; _ignoreGlass = true; const h = rayWorld(ax, ay, az, dx / d || 1e-9, dy / d || 1e-9, dz / d || 1e-9, d - .05); _ignoreGlass = false; return !h; }

/* ---------------- navigation grid (cell metres) + A* ---------------- */
const NAV_STEP = .6;   // max floor change between neighbouring 1 m cells (stairs are .25 per .5 m)
function buildNav() {
  const W = MAP.W, H = MAP.H, c = MAP.cell, fh = MAP.fh = new Float32Array(W * H), ok = MAP.ok = new Uint8Array(W * H), b = MAP.bounds;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = MAP.ox + (i + .5) * c, z = MAP.oz + (j + .5) * c; let h = MAP.terrainY(x, z);
    const near = MAP.near(x, z).slice().sort((a, b) => a.y2 - b.y2), t0 = h; for (const s of near) if (!s.slab && !s.glass && !s.stair && x >= s.x1 && x <= s.x2 && z >= s.z1 && z <= s.z2 && (s.y2 <= t0 + 1.75 || (s.terrace && s.y2 <= h + 1.6)) && s.y2 > h) h = s.y2;
    { let lo = 1e9, hi = -1e9; for (const s of near) if (s.stair && x >= s.x1 && x <= s.x2 && z >= s.z1 && z <= s.z2) { lo = Math.min(lo, s.y2); hi = Math.max(hi, s.y2); } if (hi > h && lo <= h + 1.5) h = hi; }   // plinths and low steps are ground; floor slabs are ceilings, upper floors come from the floor registry
    let blocked = x < b.x1 || x > b.x2 || z < b.z1 || z > b.z2 || MAP.terrainY(x, z) < MAP.sea - .3;
    if (!blocked) for (const s of near) if (x + .42 > s.x1 && x - .42 < s.x2 && z + .42 > s.z1 && z - .42 < s.z2 && h + 1.75 > s.y1 && h + .6 < s.y2) { blocked = true; break; }
    fh[j * W + i] = h; ok[j * W + i] = blocked ? 0 : 1; }
  const reach = MAP.reach = new Uint8Array(W * H), sp = MAP.spawn.player, st = [navIdx(sp.x, sp.z)]; reach[st[0]] = 1; buildCoarse(); 
  while (st.length) { const q = st.pop(), ci = q % W, cj = (q / W) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const n = nj * W + ni; if (!ok[n] || reach[n] || Math.abs(fh[n] - fh[q]) > NAV_STEP) continue; reach[n] = 1; st.push(n); } }
  const pen = MAP.pen = new Float32Array(W * H);
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) { let n = 0; for (let a = -1; a <= 1; a++) for (let d = -1; d <= 1; d++) if (!reach[(j + d) * W + i + a]) n++; pen[j * W + i] = n * .45; }
}
/* coarse 6 m grid for long rotations: a cell is open when a third of its fine cells are reachable */
const CC = 6; let CW = 0;
function buildCoarse() { CW = Math.ceil(MAP.size / CC); const ok = MAP.cok = new Uint8Array(CW * CW); for (let j = 0; j < CW; j++) for (let i = 0; i < CW; i++) { let n = 0, t = 0; for (let b = 0; b < CC; b++) for (let a = 0; a < CC; a++) { const fi = i * CC + a, fj = j * CC + b; if (fi >= MAP.W || fj >= MAP.H) continue; t++; if (MAP.ok[fj * MAP.W + fi] && Math.abs(MAP.fh[fj * MAP.W + fi] - MAP.terrainY(MAP.ox + fi + .5, MAP.oz + fj + .5)) < 1) n++; } ok[j * CW + i] = t && n / t > .34 ? 1 : 0; } }
const _cnav = { g: null, from: null, stamp: null, n: 0 };
/* coarse A*; returns the first waypoint about `ahead` metres along the route (world coords), or null */
function routeToward(x0, z0, x1, z1, ahead = 42) {
  const N = CW * CW; if (!_cnav.g) { _cnav.g = new Float32Array(N); _cnav.from = new Int32Array(N); _cnav.stamp = new Uint32Array(N); } const g = _cnav.g, from = _cnav.from, stamp = _cnav.stamp, id = ++_cnav.n, ok = MAP.cok;
  const ci = x => clamp(Math.floor((x - MAP.ox) / CC), 0, CW - 1), s = ci(z0) * CW + ci(x0), t = ci(z1) * CW + ci(x1), ti = t % CW, tj = (t / CW) | 0; if (!ok[t]) { let best = -1, bd = 1e9; for (let r = 1; r < 6 && best < 0; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { const i = ti + a, j = tj + b; if (i < 0 || j < 0 || i >= CW || j >= CW || !ok[j * CW + i]) continue; const d = a * a + b * b; if (d < bd) { bd = d; best = j * CW + i; } } if (best < 0) return null; return routeToward(x0, z0, MAP.ox + (best % CW + .5) * CC, MAP.oz + (((best / CW) | 0) + .5) * CC, ahead); }
  const heap = [], hk = []; const push = (c, f) => { let i = heap.length; heap.push(c); hk.push(f); while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= f) break; heap[i] = heap[p]; hk[i] = hk[p]; heap[p] = c; hk[p] = f; i = p; } };
  const pop = () => { const top = heap[0], lc = heap.pop(), lf = hk.pop(); if (heap.length) { let i = 0; heap[0] = lc; hk[0] = lf; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && hk[l] < hk[m]) m = l; if (r < heap.length && hk[r] < hk[m]) m = r; if (m === i) break; const c = heap[i], f = hk[i]; heap[i] = heap[m]; hk[i] = hk[m]; heap[m] = c; hk[m] = f; i = m; } } return top; };
  g[s] = 0; stamp[s] = id; from[s] = -1; push(s, 0); let found = false; const closed = new Set();
  while (heap.length) { const c = pop(); if (closed.has(c)) continue; closed.add(c); if (c === t) { found = true; break; } const i0 = c % CW, j0 = (c / CW) | 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const i = i0 + a, j = j0 + b; if (i < 0 || j < 0 || i >= CW || j >= CW) continue; const n = j * CW + i; if (!ok[n] || closed.has(n)) continue; if (a && b && (!ok[j0 * CW + i] || !ok[j * CW + i0])) continue; const ng = g[c] + (a && b ? 1.414 : 1); if (stamp[n] === id && g[n] <= ng) continue; g[n] = ng; stamp[n] = id; from[n] = c; push(n, ng + Math.hypot(i - ti, j - tj)); } }
  if (!found) return null; const out = []; for (let c = t; c !== -1; c = from[c]) out.push(c); out.reverse(); let acc = 0, pick = out[out.length - 1];
  for (let i = 1; i < out.length; i++) { acc += CC * ((out[i] % CW !== out[i - 1] % CW) && (((out[i] / CW) | 0) !== ((out[i - 1] / CW) | 0)) ? 1.414 : 1); pick = out[i]; if (acc >= ahead) break; } return { x: MAP.ox + (pick % CW + .5) * CC, z: MAP.oz + (((pick / CW) | 0) + .5) * CC, far: out.length * CC > ahead + CC };
}
function navIdx(x, z) { return clamp(Math.floor((z - MAP.oz) / MAP.cell), 0, MAP.H - 1) * MAP.W + clamp(Math.floor((x - MAP.ox) / MAP.cell), 0, MAP.W - 1); }
MAP.floorAt = (x, z) => Math.max(MAP.fh[navIdx(x, z)], MAP.terrainY(x, z));
function navSnap(x, z) { const W = MAP.W; let c = navIdx(x, z); if (MAP.reach[c]) return c; const ci = c % W, cj = (c / W) | 0;
  for (let r = 1; r < 14; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue; const i = ci + a, j = cj + b; if (i < 0 || j < 0 || i >= W || j >= MAP.H) continue; if (MAP.reach[j * W + i]) return j * W + i; } return c; }
const navPos = c => ({ x: MAP.ox + ((c % MAP.W) + .5) * MAP.cell, z: MAP.oz + (((c / MAP.W) | 0) + .5) * MAP.cell, y: MAP.fh[c] });
function navLine(x0, z0, x1, z1) { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / (MAP.cell * .4)); let ph = MAP.fh[navIdx(x0, z0)];
  for (let i = 1; i <= n; i++) { const c = navIdx(lerp(x0, x1, i / n), lerp(z0, z1, i / n)); if (!MAP.reach[c] || MAP.pen[c] > 1.3 || Math.abs(MAP.fh[c] - ph) > NAV_STEP) return false; ph = MAP.fh[c]; } return true; }
const _nav = { g: null, from: null, stamp: null, closed: null, n: 0 };
let _navFrame = -1, _navCalls = 0;
function navPath(x0, z0, x1, z1) {
  if (typeof G !== 'undefined') { if (G.frameNo !== _navFrame) { _navFrame = G.frameNo; _navCalls = 0; } if (++_navCalls > 1) return null; }   // one fine search per frame keeps the shrink phase smooth
  const W = MAP.W, H = MAP.H, N = W * H; if (!_nav.g) { _nav.g = new Float32Array(N); _nav.from = new Int32Array(N); _nav.stamp = new Uint32Array(N); _nav.closed = new Uint32Array(N); }
  const g = _nav.g, from = _nav.from, stamp = _nav.stamp, closed = _nav.closed, id = ++_nav.n, s = navSnap(x0, z0), t = navSnap(x1, z1), ti = t % W, tj = (t / W) | 0;
  const heap = [], hk = []; const push = (c, f) => { let i = heap.length; heap.push(c); hk.push(f); while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= f) break; heap[i] = heap[p]; hk[i] = hk[p]; heap[p] = c; hk[p] = f; i = p; } };
  const pop = () => { const top = heap[0], lc = heap.pop(), lf = hk.pop(); if (heap.length) { let i = 0; heap[0] = lc; hk[0] = lf; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && hk[l] < hk[m]) m = l; if (r < heap.length && hk[r] < hk[m]) m = r; if (m === i) break; const c = heap[i], f = hk[i]; heap[i] = heap[m]; hk[i] = hk[m]; heap[m] = c; hk[m] = f; i = m; } } return top; };
  g[s] = 0; stamp[s] = id; from[s] = -1; push(s, 0); let found = false, iter = 0;
  while (heap.length && iter < 9000) { const c = pop(); if (closed[c] === id) continue; closed[c] = id; iter++; if (c === t) { found = true; break; } const ci = c % W, cj = (c / W) | 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const ni = ci + a, nj = cj + b; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const n = nj * W + ni;
      if (!MAP.reach[n] || closed[n] === id || Math.abs(MAP.fh[n] - MAP.fh[c]) > NAV_STEP) continue; if (a && b && (!MAP.reach[cj * W + ni] || !MAP.reach[nj * W + ci] || Math.abs(MAP.fh[cj * W + ni] - MAP.fh[c]) > NAV_STEP || Math.abs(MAP.fh[nj * W + ci] - MAP.fh[c]) > NAV_STEP)) continue;
      const ng = g[c] + (a && b ? 1.414 : 1) + MAP.pen[n] + Math.abs(MAP.fh[n] - MAP.fh[c]) * .6; if (stamp[n] === id && g[n] <= ng) continue; g[n] = ng; stamp[n] = id; from[n] = c; push(n, ng + Math.hypot(ni - ti, nj - tj)); } }
  if (!found) return null; const out = []; for (let c = t; c !== -1; c = from[c]) out.push(navPos(c)); out.reverse();
  const sm = [out[0]]; let i = 0; while (i < out.length - 1) { let j = Math.min(out.length - 1, i + 10); while (j > i + 1 && !navLine(out[i].x, out[i].z, out[j].x, out[j].z)) j--; sm.push(out[j]); i = j; } return sm;
}
function navRandomIn(r) { for (let k = 0; k < 60; k++) { const x = rand(r.x1, r.x2), z = rand(r.z1, r.z2), c = navIdx(x, z); if (MAP.reach[c] && MAP.pen[c] < .5) return navPos(c); } return navPos(navSnap((r.x1 + r.x2) / 2, (r.z1 + r.z2) / 2)); }
/* which registered upper floor (if any) an entity stands on */
MAP.floorOf = e => { for (const f of MAP.floors) if (e.pos.x >= f.x1 - .3 && e.pos.x <= f.x2 + .3 && e.pos.z >= f.z1 - .3 && e.pos.z <= f.z2 + .3 && Math.abs(e.pos.y - f.y) < .7) return f; return null; };
MAP.floorAtY = (x, z, y) => { for (const f of MAP.floors) if (x >= f.x1 - .3 && x <= f.x2 + .3 && z >= f.z1 - .3 && z <= f.z2 + .3 && y - f.y > -.7 && y - f.y < 1.6) return f; return null; };
MAP.zoneAt = (x, z) => { const t = MAP.townAt(x, z); if (t) return t.name; const h = MAP.terrainY(x, z); return h < MAP.sea - .3 ? '海' : h > 20 ? '高地' : polyDist(x, z, RIVER) < 10 ? '河谷' : ''; };

/* ---------------- minimap base: elevation washes, contours, roads, buildings, names ---------------- */
function drawMini() {
  const k = 2, c = MAP.mini = document.createElement('canvas'); c.width = c.height = MAP.size * k; const g = c.getContext('2d'), W = MAP.TW, r = W + 1, cs = MAP.tc * k;
  for (let j = 0; j < MAP.TW; j++) for (let i = 0; i < W; i++) { const h = MAP.hf[j * r + i]; g.fillStyle = h < -.6 ? (h < -4 ? '#c9d8df' : '#dbe8ee') : h < 1.6 ? '#ece4cf' : h > 24 ? '#e4e0d4' : h > 12 ? '#ebe8dd' : '#f3f0e6'; g.fillRect(i * cs, j * cs, cs, cs); }
  g.lineWidth = 1; for (const ct of MAP.contours) { g.strokeStyle = ct.lv < 1 ? '#7f9bb0' : (ct.lv / 2) % 5 === 0 ? '#8c877a' : '#c2bdae'; g.beginPath(); const s = ct.segs; for (let i = 0; i < s.length; i += 4) { g.moveTo((s[i] - MAP.ox) * k, (s[i + 1] - MAP.oz) * k); g.lineTo((s[i + 2] - MAP.ox) * k, (s[i + 3] - MAP.oz) * k); } g.stroke(); }
  g.strokeStyle = '#8c7b5a'; g.lineWidth = 2.5; g.setLineDash([6, 4]); for (const P of MAP.roads) { g.beginPath(); P.forEach((p, i) => i ? g.lineTo((p[0] - MAP.ox) * k, (p[1] - MAP.oz) * k) : g.moveTo((p[0] - MAP.ox) * k, (p[1] - MAP.oz) * k)); g.stroke(); } g.setLineDash([]);
  g.lineWidth = 1; for (const s of MAP.solids.slice().sort((a, b) => a.y2 - b.y2)) { if (s.y2 - s.y1 < 1.5 || s.x2 - s.x1 < .6) continue; g.fillStyle = s.y2 - s.y1 > 5 ? '#b9b3a4' : '#d8d3c6'; g.strokeStyle = '#16161c'; const x = (s.x1 - MAP.ox) * k, y = (s.z1 - MAP.oz) * k; g.fillRect(x, y, (s.x2 - s.x1) * k, (s.z2 - s.z1) * k); g.strokeRect(x + .5, y + .5, (s.x2 - s.x1) * k, (s.z2 - s.z1) * k); }
  g.fillStyle = '#16161c'; g.font = 'bold 22px "IBM Plex Mono", monospace'; g.textAlign = 'center'; for (const t of TOWNS) { const x = (t.x - MAP.ox) * k, y = (t.z - MAP.oz) * k - t.r * k - 6; g.fillStyle = '#f5f2ea'; g.fillRect(x - 70, y - 20, 140, 26); g.fillStyle = '#16161c'; g.fillText(t.name, x, y); }
  MAP.miniScale = k;
}

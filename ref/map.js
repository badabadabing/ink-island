'use strict';
/* ============ INK STRIKE · map "PAPER TOWN 纸镇": geometry, collision, navigation ============ */
const MAP_CATALOG = {
  papertown: { id:'papertown',name:'纸镇',en:'PAPER TOWN',description:'街巷与市集交错，立体点位与多线轮转。',siteNames:{A:'刻度台',B:'印运仓'} },
  warehouse: { id:'warehouse',name:'折页货场',en:'STACK DEPOT',description:'工业货场：A 在带天窗的装运大厅，B 在龙门吊集装箱场，中路 Z 形屏障与闸门。',siteNames:{A:'东装运台',B:'西封签区'} },
  dunes: { id:'dunes',name:'双井沙城',en:'DUNE COURT',description:'经典沙城节奏：长道双门、中路拱门与猫道、上下隧道、2 米高台 A 点与井院 B 点。',siteNames:{A:'日晷庭',B:'井院'} }
};
const MAP = {
  id:'papertown',name:'纸镇',en:'PAPER TOWN',bounds:{x1:-60.4,x2:60.4,z1:-52.4,z2:52.4},
  sites:{A:{x1:32.5,z1:-37.5,x2:53.5,z2:-22.5,y:1,name:'A 点'},B:{x1:-53.5,z1:-37.5,x2:-30.5,z2:-20.5,y:0,name:'B 点'}},
  rangePlayer:{x:0,y:0,z:39.5},rangeSpots:[{x:0,z:49.5,d:10},{x:-13,z:47,d:15},{x:22,z:46,d:23},{x:-34,z:45,d:35},{x:52,z:45,d:52}],
  menuCamera:{x:57,y:37,z:60,tx:0,ty:1,tz:-12},midHold:{x1:-6,x2:6,z1:-37,z2:-28,face:{x:0,z:-6}},surfaces:[],

  solids: [], W: 128, H: 112, ox: -64, oz: -56, buckets: [], BW: 18, BH: 16,
  spawn: { red: { x1: -16, x2: 16, z1: 41, z2: 50 }, blue: { x1: -16, x2: 16, z1: -50, z2: -41 } },
  points: [
    { n: 'A', x: 44, z: -29, red: 3, blue: 3 }, { n: 'ALONG', x: 48, z: 12, red: 2, blue: 1.5 }, { n: 'B', x: -40, z: -29, red: 3, blue: 3 },
    { n: 'BLANE', x: -48, z: 12, red: 2, blue: 1.5 }, { n: 'MID', x: 0, z: -4, red: 2, blue: 2 }, { n: 'MIDN', x: 0, z: -32, red: 2, blue: 1 },
    { n: 'MIDS', x: 0, z: 30, red: 1, blue: 2 }, { n: 'MARKET', x: -24, z: 2, red: 1.5, blue: 1.5 }, { n: 'SHORT', x: 16, z: 0, red: 1.5, blue: 1.5 },
    { n: 'NE', x: 30, z: -45, red: 2, blue: .5 }, { n: 'NW', x: -30, z: -45, red: 2, blue: .5 }, { n: 'SE', x: 30, z: 45, red: .5, blue: 2 },
    { n: 'SW', x: -30, z: 45, red: .5, blue: 2 }, { n: 'NEST', x: -39.5, z: 27, red: .6, blue: .8 }, { n: 'PIT', x: 57, z: 7, red: .6, blue: .8 },
    { n: 'NALLEY', x: 20, z: -17, red: 1, blue: 1 }, { n: 'SALLEY', x: -18, z: 17, red: 1, blue: 1 }
  ],
  zones: [
    [32, -38, 54, -20, 'A 点 · 刻度台'], [-54, -38, -30, -20, 'B 点 · 印运仓'], [-42, -14, -7, 14, '市集大厅'], [14, -14, 18, 14, '窄巷'],
    [-7, -38, 7, -26, '折页门'], [-7, -26, 7, 38, '中路'], [42, -20, 54, 38, 'A 大道'], [54, 2, 60, 12, '东侧回廊'], [-54, -20, -42, 38, 'B 长廊'],
    [-44, 20, -37, 38, '狙击台'], [-26, 20, -22, 38, '西隧道'], [22, 20, 26, 38, '东隧道'], [-42, 14, 42, 20, '南巷'], [-42, -20, 42, -14, '北巷'],
    [-60, 38, 60, 52, '红方街区'], [-60, -52, 60, -38, '蓝方街区']
  ]
};

function buildWorld(scene) {
  const R = rng(20260921), main = new Sk('sun'), detail = new Sk('sun'), skyline = new Sk('sun'), sh = new Sk('none'), far = new Sk('none'), S = MAP.solids, BLD = []; let sk = main;
  const KX = SUN.x / -SUN.y, KZ = SUN.z / -SUN.y;
  const rr = (a, b) => a + R() * (b - a);

  function hull(pts) {
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  function shadow(x1, z1, x2, z2, y0, y1) {
    const pts = []; for (const y of [y0, y1]) for (const x of [x1, x2]) for (const z of [z1, z2]) pts.push([x + KX * y, z + KZ * y]);
    const h = hull(pts); for (let i = 1; i < h.length - 1; i++) sh.tri([h[0][0], .012, h[0][1]], [h[i][0], .012, h[i][1]], [h[i + 1][0], .012, h[i + 1][1]], 0.33);
  }
  function solid(x1, z1, x2, z2, y0, y1, o = {}) {
    if (o.vis === false && MAP.id !== 'papertown') { const sn = (a, b) => { let p = Math.round(a), q = Math.round(b); if (q <= p) { p = Math.floor((a + b) / 2); q = p + 1; } return [p, q]; }; [x1, x2] = sn(x1, x2); [z1, z2] = sn(z1, z2); y1 = Math.max(.25, Math.round(y1 * 4) / 4); }   // prop collision snaps to the 1m nav grid off Paper Town
    const s = { x1, y1: y0, z1, x2, y2: y1, z2, thin: !!o.thin }; S.push(s);
    if (o.vis !== false) sk.bx(x1, y0, z1, x2, y1, z2, o);
    if (o.shadow !== false && y1 > 0.4) shadow(x1, z1, x2, z2, y0, y1);
    return s;
  }
  const inSolid = (x, y, z) => { for (const s of S) if (x > s.x1 && x < s.x2 && z > s.z1 && z < s.z2 && y > s.y1 && y < s.y2) return true; return false; };
  const faces = (x1, z1, x2, z2) => [
    { px: x1, pz: z2, ux: 1, uz: 0, nx: 0, nz: 1, len: x2 - x1 }, { px: x2, pz: z1, ux: -1, uz: 0, nx: 0, nz: -1, len: x2 - x1 },
    { px: x2, pz: z2, ux: 0, uz: -1, nx: 1, nz: 0, len: z2 - z1 }, { px: x1, pz: z1, ux: 0, uz: 1, nx: -1, nz: 0, len: z2 - z1 }];
  const faceM = (f, y = 0) => new THREE.Matrix4().makeBasis(new V3(f.ux, 0, f.uz), new V3(0, 1, 0), new V3(f.nx, 0, f.nz)).setPosition(f.px, y, f.pz);
  const fpt = (f, t, out) => [f.px + f.ux * t + f.nx * out, f.pz + f.uz * t + f.nz * out];

  /* ---------- facade vocabulary ---------- */
  function windowAt(M, t, y, w, h, kind) {
    sk.box(w, h, .05, t + w / 2, y + h / 2, .01, { m: M, tint: GLASS, tone: 0 });
    sk.box(w + .3, .08, .2, t + w / 2, y - .04, .08, { m: M });
    sk.line([t + w / 2, y, .045, t + w / 2, y + h, .045, t, y + h * .6, .045, t + w, y + h * .6, .045,
      t + w * .12, y + h * .3, .046, t + w * .34, y + h * .52, .046, t + w * .2, y + h * .22, .046, t + w * .42, y + h * .44, .046], M);
    if (kind === 1) { for (const sx of [t - .5, t + w]) { sk.box(.5, h, .05, sx + .25, y + h / 2, .03, { m: M, tone: .33 }); } }
    else if (kind === 2) { sk.box(w + .5, .06, .7, t + w / 2, y + h + .3, .33, { m: M, r: [.5, 0, 0], tint: AMBER, tone: 0 }); }
    else if (kind === 3) { sk.box(w + .7, .1, .6, t + w / 2, y - .2, .3, { m: M }); const a = []; for (let i = 0; i <= 5; i++) { const x = t - .3 + (w + .6) * i / 5; a.push(x, y - .15, .58, x, y + .55, .58); } a.push(t - .3, y + .55, .58, t + w + .3, y + .55, .58); sk.line(a, M); }
    else if (kind === 4) { sk.box(.7, .45, .4, t + w / 2, y - .5, .2, { m: M, tone: .33 }); }
  }
  function doorAt(M, t) {
    sk.box(1.3, 2.3, .08, t + .65, 1.15, .02, { m: M, tone: .66 }); sk.box(1.7, .16, .22, t + .65, 2.42, .08, { m: M }); sk.box(1.7, .12, .5, t + .65, .06, .25, { m: M }); sk.box(1.42, .13, .10, t + .65, 1.06, .10, { m: M, tint: WOOD, tone: .33 }); sk.box(.18, .24, .06, t + .65, 1.04, .18, { m: M, tone: .66 });
    sk.line([t + .2, .3, .07, t + .2, 2.0, .07, t + .2, 2.0, .07, t + 1.1, 2.0, .07, t + 1.1, 2.0, .07, t + 1.1, .3, .07, t + 1.1, .3, .07, t + .2, .3, .07, t + 1.0, 1.1, .08, t + 1.08, 1.1, .08], M);
  }
  function decorate(b) {
    faces(b.x1, b.z1, b.x2, b.z2).forEach(f => {
      let open = 0; for (const k of [.25, .5, .75]) { const [x, z] = fpt(f, f.len * k, 1.2); if (!inSolid(x, 2.2, z) && x > MAP.bounds.x1 - .6 && x < MAP.bounds.x2 + .6 && z > MAP.bounds.z1 - .6 && z < MAP.bounds.z2 + .6) open++; }
      if (!open) return;
      const M = faceM(f), h = b.h, L = f.len, free = (t, y) => { const [x, z] = fpt(f, t, .5), [x2, z2] = fpt(f, t, 1.4); return !inSolid(x, y, z) && !inSolid(x2, y, z2); };
      sk.line([0, .45, .02, L, .45, .02, 0, h - .4, .02, L, h - .4, .02], M);
      if (!b.o.bare) { let t = rr(1, 2.2); while (t < L - 2.4) { const r = R(); if (free(t + .6, 1.5)) { if (r < .2 && !b.o.noDoor) doorAt(M, t); else if (r < .85) windowAt(M, t, 1.15, 1.1, 1.4, r < .4 ? 1 : r < .5 ? 4 : 0); } t += rr(3.2, 5.5); } }
      for (let y = 4.2; y + 1.9 < h; y += 3.1) { let t = rr(.8, 2); while (t < L - 2) { const r = R(); if (free(t + .6, y + .7) && r < .85) windowAt(M, t, y, 1.1, 1.5, r < .25 ? 1 : r < .38 ? 2 : r < .5 ? 3 : 0); t += rr(2.6, 4.2); } }
      for (let i = 0; i < L / 9; i++) { const t = rr(.5, L - 1.5), y = rr(2.6, Math.max(2.7, h - 1)), a = []; for (let k = 0; k < 3; k++) { const ox = rr(0, 1.2), oy = k * .16; a.push(t + ox, y + oy, .02, t + ox + rr(.25, .5), y + oy, .02); } sk.line(a, M); }
      if (R() < .5) { const t = rr(.4, L - .4); sk.line([t, 0, .08, t, h, .08, t + .1, 0, .08, t + .1, h, .08], M); }
    });
  }
  function roof(x1, z1, x2, z2, h) {
    const o = { shadow: false }; sk.bx(x1, h, z1, x2, h + .45, z1 + .25); sk.bx(x1, h, z2 - .25, x2, h + .45, z2); sk.bx(x1, h, z1, x1 + .25, h + .45, z2); sk.bx(x2 - .25, h, z1, x2, h + .45, z2);
    const cx = rr(x1 + 1.5, x2 - 1.5), cz = rr(z1 + 1.5, z2 - 1.5), r = R();
    if (r < .3) { sk.cyl(.9, .9, 1.4, 10, cx, h + 1.9, cz, { tone: -1 }); for (const [dx, dz] of [[-.6, -.6], [.6, -.6], [.6, .6], [-.6, .6]]) sk.line([cx + dx, h, cz + dz, cx + dx, h + 1.2, cz + dz]); sk.cone(1, .5, 10, cx, h + 2.85, cz); }
    else if (r < .55) { sk.line([cx, h, cz, cx, h + 3.2, cz, cx - .5, h + 2.6, cz, cx + .5, h + 2.6, cz, cx - .35, h + 2.2, cz, cx + .35, h + 2.2, cz, cx, h + 3.0, cz - .3, cx, h + 3.0, cz + .3]); }
    else if (r < .75) { sk.box(1.8, 2, 1.8, cx, h + 1, cz); }
    else if (r < .9) { sk.box(1.1, .6, .8, cx, h + .3, cz, { tone: .33 }); }
  }
  function building(x1, z1, x2, z2, h, o = {}) { solid(x1, z1, x2, z2, 0, h, o); BLD.push({ x1, z1, x2, z2, h, o }); if (!o.noRoof) roof(x1, z1, x2, z2, h); }
  function block(x1, z1, x2, z2, hmin, hmax, o = {}) {
    const alongX = (x2 - x1) >= (z2 - z1); let a = alongX ? x1 : z1; const end = alongX ? x2 : z2;
    while (a < end) { let len = Math.round(rr(8, 13)); if (end - (a + len) < 6) len = end - a; const b = a + len;
      alongX ? building(a, z1, b, z2, Math.round(rr(hmin, hmax) * 2) / 2, o) : building(x1, a, x2, b, Math.round(rr(hmin, hmax) * 2) / 2, o); a = b; }
  }

  /* ---------- props ---------- */
  function crate(x, z, s = 1.2, y0 = 0, tint) {
    solid(x - s / 2, z - s / 2, x + s / 2, z + s / 2, y0, y0 + s, { tint: tint ?? (R() < .4 ? WOOD : PAPER) });
    faces(x - s / 2, z - s / 2, x + s / 2, z + s / 2).forEach((f, i) => { const M = faceM(f, y0), k = .13 * s, e = .015;
      sk.line([k, k, e, s - k, k, e, s - k, k, e, s - k, s - k, e, s - k, s - k, e, k, s - k, e, k, s - k, e, k, k, e, k, i % 2 ? k : s - k, e, s - k, i % 2 ? s - k : k, e], M); });
    const t = y0 + s + .012; sk.line([x - s / 2 + .13, t, z - s / 2 + .13, x + s / 2 - .13, t, z + s / 2 - .13, x - s / 2, t, z, x + s / 2, t, z]);
  }
  function barrel(x, z, tint) { solid(x - .33, z - .33, x + .33, z + .33, 0, 1.05, { vis: false }); sk.cyl(.36, .36, 1.05, 10, x, .525, z, { tint: tint ?? PAPER });
    for (const y of [.3, .75]) { const p = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832; p.push([x + Math.cos(a) * .375, y, z + Math.sin(a) * .375]); } sk.poly(p, true); } }
  function sandbags(x1, z1, x2, z2, h = .95) {
    solid(x1, z1, x2, z2, 0, h, { vis: false }); const ax = (x2 - x1) > (z2 - z1), L = ax ? x2 - x1 : z2 - z1, Wd = ax ? z2 - z1 : x2 - x1, rows = Math.round(h / .24);
    for (let r = 0; r < rows; r++) { const n = Math.floor(L / .62), off = r % 2 ? .31 : 0;
      for (let i = 0; i < n; i++) { const c = (ax ? x1 : z1) + off + .31 + i * .62; if (c + .3 > (ax ? x2 : z2) + .05) continue; const y = .12 + r * .24;
        ax ? sk.box(.6, .23, Wd, c, y, (z1 + z2) / 2, { tone: r % 2 ? .33 : 0, tint: WOOD }) : sk.box(Wd, .23, .6, (x1 + x2) / 2, y, c, { tone: r % 2 ? .33 : 0, tint: WOOD }); } }
  }
  const PM = (x, z, rot) => new THREE.Matrix4().makeRotationY(rot * Math.PI / 2).setPosition(x, 0, z);
  function car(x, z, rot = 0) {
    const M = PM(x, z, rot), hx = rot % 2 ? .9 : 2.1, hz = rot % 2 ? 2.1 : .9; solid(x - hx, z - hz, x + hx, z + hz, 0, 1.35, { vis: false });
    sk.box(4.2, .62, 1.75, 0, .6, 0, { m: M }); sk.box(2.1, .55, 1.6, -.2, 1.18, 0, { m: M, tint: GLASS, tone: 0 }); sk.box(2.2, .05, 1.64, -.2, 1.47, 0, { m: M, tone: .33 });
    for (const wx of [-1.35, 1.35]) for (const wz of [-.82, .82]) sk.cyl(.34, .34, .22, 10, wx, .34, wz, { m: M, ax: 'z', tone: .66 });
    sk.line([-.2, .3, .885, -.2, .9, .885, .85, .3, .885, .85, .9, .885, 2.11, .7, -.6, 2.11, .7, -.3, 2.11, .7, .3, 2.11, .7, .6, -2.11, .72, -.7, -2.11, .72, .7], M);
  }
  function truck(x, z, rot = 0, tint = PAPER) {
    const M = PM(x, z, rot), hx = rot % 2 ? 1.25 : 3.3, hz = rot % 2 ? 3.3 : 1.25; solid(x - hx, z - hz, x + hx, z + hz, 0, 2.9, { vis: false });
    sk.box(4.4, 2.2, 2.4, -1.05, 1.8, 0, { m: M, tint }); sk.box(1.9, 1.7, 2.3, 2.3, 1.45, 0, { m: M }); sk.box(1.0, .7, 2.1, 2.6, 1.85, 0, { m: M, tint: GLASS, tone: 0 }); sk.box(6.4, .25, 2.2, 0, .62, 0, { m: M, tone: .66 });
    for (const wx of [-2.2, -1.2, 2.2]) for (const wz of [-1.1, 1.1]) sk.cyl(.48, .48, .3, 10, wx, .48, wz, { m: M, ax: 'z', tone: .66 });
    const a = []; for (let i = 0; i < 6; i++) { const px = -3.1 + i * .8; a.push(px, .75, 1.21, px, 2.88, 1.21, px, .75, -1.21, px, 2.88, -1.21); } sk.line(a, M);
  }
  function bus(x, z) {
    solid(x - 1.3, z - 5, x + 1.3, z + 5, 0, 3, { vis: false }); sk.box(2.6, 2.5, 10, x, 1.7, z); sk.box(2.64, .8, 9, x, 2.2, z, { tint: GLASS, tone: 0 }); sk.box(2.66, .22, 10.02, x, 1.2, z, { tint: AMBER, tone: 0 });
    for (const wz of [-3.4, 3.4]) for (const wx of [-1.25, 1.25]) sk.cyl(.5, .5, .3, 10, x + wx, .5, z + wz, { ax: 'x', tone: .66 });
    const a = []; for (let i = -4; i <= 4; i++) a.push(x + 1.33, 1.8, z + i * 1.0, x + 1.33, 2.6, z + i * 1.0, x - 1.33, 1.8, z + i, x - 1.33, 2.6, z + i); sk.line(a);
  }
  function palm(x, z) {
    solid(x - .22, z - .22, x + .22, z + .22, 0, 6, { vis: false, shadow: false }); const H = rr(6, 8.5), lean = rr(-.6, .6), lz = rr(-.5, .5); let px = x, pz = z;
    for (let i = 0; i < 6; i++) { const t = (i + .5) / 6; px = x + lean * t * t; pz = z + lz * t * t; sk.cyl(.17 - i * .012, .2 - i * .012, H / 6, 7, px, H * t, pz, { ea: 50 }); }
    const n = 9; for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + rr(0, .4), len = rr(2.6, 3.6), pts = [], lf = [];
      for (let j = 0; j <= 7; j++) { const u = j / 7, r = len * u, y = H + .2 + Math.sin(u * 2.2) * 1.0 - u * u * 2.0; pts.push([px + Math.cos(a) * r, y, pz + Math.sin(a) * r]);
        if (j > 1) { const q = pts[j]; lf.push(q[0], q[1], q[2], q[0] - Math.sin(a) * .35, q[1] - .5, q[2] + Math.cos(a) * .35, q[0], q[1], q[2], q[0] + Math.sin(a) * .35, q[1] - .5, q[2] - Math.cos(a) * .35); } }
      sk.poly(pts); sk.line(lf); }
    const sp = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832, r = i % 2 ? 1.2 : 2.9; sp.push([x + KX * H + Math.cos(a) * r, z + KZ * H + Math.sin(a) * r]); }
    for (let i = 0; i < 12; i++) sh.tri([x + KX * H, .012, z + KZ * H], [sp[i][0], .012, sp[i][1]], [sp[(i + 1) % 12][0], .012, sp[(i + 1) % 12][1]], .33);
  }
  function lamp(x, z, dx, dz) { sk.cyl(.06, .09, 4.6, 6, x, 2.3, z, { ea: 50 }); sk.line([x, 4.6, z, x + dx * .9, 4.9, z + dz * .9]); sk.box(.34, .4, .34, x + dx * .9, 4.65, z + dz * .9, { tint: AMBER, tone: 0 }); sk.cone(.3, .2, 4, x + dx * .9, 4.95, z + dz * .9); }
  function stall(x, z, rot = 0) {
    const M = PM(x, z, rot), hx = rot % 2 ? .5 : 1.6, hz = rot % 2 ? 1.6 : .5; solid(x - hx, z - hz, x + hx, z + hz, 0, 1.0, { vis: false });
    sk.box(3.2, 1.0, 1.0, 0, .5, 0, { m: M, tint: WOOD }); for (const px of [-1.6, 1.6]) for (const pz of [-.9, .9]) sk.line([px, 0, pz, px, pz < 0 ? 2.9 : 2.3, pz], M);
    for (let i = 0; i < 8; i++) sk.box(.43, .05, 2.1, -1.5 + i * .43, 2.6, 0, { m: M, r: [.29, 0, 0], tint: i % 2 ? PAPER : AMBER, tone: 0 });
    for (let i = 0; i < 5; i++) sk.sph(.13, -1.1 + i * .5 + rr(-.1, .1), 1.12, rr(-.25, .25), { m: M, tint: i % 2 ? RED : AMBER, tone: 0, ws: 6, hs: 4 });
  }
  function bunting(x1, y1, z1, x2, y2, z2) {
    const n = 16, pts = [], cols = [AMBER, PAPER, BLUE, PAPER, RED, PAPER]; for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(x1, x2, u), lerp(y1, y2, u) - Math.sin(u * Math.PI) * 1.1, lerp(z1, z2, u)]); }
    sk.poly(pts); for (let i = 0; i < n; i++) { const a = pts[i], b = pts[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - .5, (a[2] + b[2]) / 2], q = [lerp(a[0], b[0], .8), lerp(a[1], b[1], .8), lerp(a[2], b[2], .8)];
      sk.tri(a, q, m, 0, cols[i % 6]); sk.line([a[0], a[1], a[2], m[0], m[1], m[2], m[0], m[1], m[2], q[0], q[1], q[2]]); }
  }
  function archLines(x1, x2, z, y, axisZ) { for (const off of [-.52, .52]) { const pts = [], c = (x1 + x2) / 2, r = (x2 - x1) / 2; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; const u = c - Math.cos(a) * r, v = y - .02 + Math.sin(a) * .0; pts.push(axisZ ? [z + off, y - 1 + Math.sin(a) * 1.0, u] : [u, y - 1 + Math.sin(a) * 1.0, z + off]); } sk.poly(pts); } }
  function stairs(x1, z1, x2, z2, dir, n, y0 = 0) { // dir: '+x','-x','+z','-z' = direction of ascent
    for (let i = 0; i < n; i++) { const top = y0 + .25 * (i + 1), d = .5;
      if (dir === '+x') solid(x1 + i * d, z1, x1 + (i + 1) * d, z2, y0, top, { shadow: false }); else if (dir === '-x') solid(x2 - (i + 1) * d, z1, x2 - i * d, z2, y0, top, { shadow: false });
      else if (dir === '+z') solid(x1, z1 + i * d, x2, z1 + (i + 1) * d, y0, top, { shadow: false }); else solid(x1, z2 - (i + 1) * d, x2, z2 - i * d, y0, top, { shadow: false }); }
  }
  MAP.ladders = [];
  function ladder(x, z, y0, y1, ax, side) {   // climbable volume sits on `side` of the rails
    const a = [], top = y1 + 1.0; for (const o of [-.28, .28]) a.push(x + o, y0, z, x + o, top, z); for (let y = y0 + .3; y < top - .1; y += .33) a.push(x - .28, y, z, x + .28, y, z); sk.line(a);
    for (const o of [-.28, .28]) sk.cyl(.03, .03, top - y0, 6, x + o, (y0 + top) / 2, z, { ea: 60 });
    MAP.ladders.push(side < 0 ? { x1: x - .7, x2: x + .7, z1: z - .75, z2: z + .12, y1: y0, y2: y1 } : { x1: x - .7, x2: x + .7, z1: z - .12, z2: z + .75, y1: y0, y2: y1 });
  }
  function targetSign(x, y, z, ry, size) { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, 512, 512); g.strokeStyle = '#16161c'; g.lineWidth = 3;
    for (let i = 1; i <= 8; i++) { g.beginPath(); g.arc(256, 256, i * 30, 0, 6.2832); g.stroke(); } g.beginPath(); g.moveTo(0, 256); g.lineTo(512, 256); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke(); g.fillStyle = '#d42a2a'; g.beginPath(); g.arc(256, 256, 9, 0, 6.2832); g.fill(); g.strokeRect(2, 2, 508, 508);
    g.fillStyle = '#16161c'; g.font = 'bold 22px monospace'; g.fillText('SPRAY CHECK · 12m', 14, 32); const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); }
  function sign(text, x, y, z, ry, w, h, o = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(text, o), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.set(x, y, z); if (o.flat) { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; } else m.rotation.y = ry; scene.add(m);
  }

  /* ================= LAYOUT ================= */
  sk.quad([-400, 0, -400], [-400, 0, 400], [400, 0, 400], [400, 0, -400], 0, PAPER);
  // Paper washes distinguish traversable street, interior floor and contact edges without extra texture noise.
  const wash = (x1, z1, x2, z2, tone, y = .005) => sk.quad([x1, y, z1], [x1, y, z2], [x2, y, z2], [x2, y, z1], -tone);
  if (MAP.id !== 'papertown') MAP_LAYOUTS[MAP.id]({ sk, sh, solid, building, block, roof, crate, barrel, sandbags, car, truck, palm, lamp, stall, bunting, archLines, ladder, sign, wash, rr, R, BLD, inSolid, faces, faceM, windowAt, doorAt });
  else {
  for (const q of [[-6,-38,6,38],[-54,-19,54,-15],[-54,15,54,19],[43,-20,53,38],[-53,-20,-43,38],[-59,42,59,48],[-59,-48,59,-42]]) wash(...q,.055);
  wash(-41,-13,-8,13,.10); wash(-42,-36,-30,-22,.12); wash(32,-38,54,-22,.045,1.006);
  for (let z = -36; z <= 36; z += 6) sk.line([-6,.008,z,-4,.008,z,4,.008,z,6,.008,z]);
  for (const x of [-41,-8]) sk.line([x,.008,-13,x,.008,13]);
  // perimeter
  block(-64, -38, -54, 38, 6, 10); block(54, -38, 64, 2, 6, 10); block(54, 12, 64, 38, 6, 10); building(60, 2, 64, 12, 7);
  block(-64, 52, 64, 56, 6, 9, { bare: true }); block(-64, -56, 64, -52, 6, 9, { bare: true });
  building(-64, 38, -60, 52, 8); building(60, 38, 64, 52, 7); building(-64, -52, -60, -38, 7); building(60, -52, 64, -38, 8);
  // WS block: sniper nest + west tunnel
  solid(-42, 20, -37, 38, 0, 3); BLD.push({ x1: -42, z1: 20, x2: -37, z2: 38, h: 3, o: { bare: true } });
  solid(-42, 20, -41.7, 28, 3, 3.95); solid(-42, 31, -41.7, 38, 3, 3.95); solid(-42, 20, -40.3, 20.3, 3, 3.95); solid(-38.7, 20, -37, 20.3, 3, 3.95); solid(-42, 37.7, -37, 38, 3, 3.95);
  ladder(-39.5, 19.9, 0, 3.0, 'z', -1); ladder(-35, -21.5, 0, 4.9, 'z', 1);
  stairs(-44, 31, -42, 37, '-z', 12); solid(-44, 28, -42, 31, 0, 3);
  sk.line([-44, 1.0, 37, -44, 4.0, 31, -44, 4.0, 31, -44, 4.0, 28, -44, 0, 37, -44, 1.0, 37, -44, 3, 31, -44, 4, 31, -44, 3, 28, -44, 4, 28, -44, 2.5, 34, -44, 1.5, 34]);
  building(-37, 20, -26, 38, 7.5); building(-22, 20, -7, 38, 6.5); solid(-26, 20, -22, 38, 3.4, 7); archLines(-26, -22, 38, 3.4); archLines(-26, -22, 20, 3.4);
  // ES block + east tunnel
  building(7, 20, 22, 38, 7); building(26, 20, 42, 38, 8); solid(22, 20, 26, 38, 3.4, 6.5); archLines(22, 26, 38, 3.4); archLines(22, 26, 20, 3.4);
  // Market hall (hollow)
  const mh = 6, wall = (x1, z1, x2, z2, y0 = 0, y1 = mh) => { solid(x1, z1, x2, z2, y0, y1); if (!y0) BLD.push({ x1, z1, x2, z2, h: y1, o: { noDoor: true } }); };
  wall(-42, -14, -41, -2); wall(-42, 2, -41, 14); wall(-42, -2, -41, 2, 3, mh); wall(-8, -14, -7, -3); wall(-8, 3, -7, 14); wall(-8, -3, -7, 3, 3.2, mh);
  wall(-41, 13, -26, 14); wall(-22, 13, -8, 14); wall(-26, 13, -22, 14, 3, mh); wall(-41, -14, -18, -13); wall(-14, -14, -8, -13); wall(-18, -14, -14, -13, 3, mh);
  solid(-42, -14, -7, 14, mh, mh + .5); roof(-42, -14, -7, 14, mh + .5);
  for (const px of [-30, -18]) for (const pz of [-6, 6]) { solid(px - .5, pz - .5, px + .5, pz + .5, 0, mh); sk.box(1.4, .3, 1.4, px, mh - .15, pz); sk.box(1.3, .25, 1.3, px, .125, pz); }
  solid(-37, -10.5, -31, -9.5, 0, 1.05, { tint: WOOD }); solid(-20, 8.5, -13, 9.5, 0, 1.05, { tint: WOOD }); crate(-11, -10.5, 1.3); crate(-11, -9.1, 1.0); crate(-38.5, 10.5, 1.4); crate(-24, -5, 1.2); crate(-24.1, -5, .8, 1.2);
  // EC block with narrow alley
  building(7, -14, 14, 14, 7.5); building(18, -14, 42, 0, 8.5); building(18, 0, 42, 14, 6.5); solid(14, -14, 18, -13, 3.5, 5.5); solid(14, 13, 18, 14, 3.5, 5.5); archLines(14, 18, 13.5, 3.5); archLines(14, 18, -13.5, 3.5); crate(14.6, 3, 1.0);
  // north blocks
  block(-30, -38, -7, -20, 6, 9); block(7, -38, 28, -20, 6, 9);
  // Site B: cargo shed
  for (const [px, pz] of [[-41.5, -35.5], [-30.5, -35.5], [-41.5, -22.5]]) { solid(px - .4, pz - .4, px + .4, pz + .4, 0, 4.5); sk.box(1.1, .25, 1.1, px, 4.37, pz); }
  solid(-42.4, -36.4, -30, -21.6, 4.5, 4.9); const rl = []; for (let i = 0; i <= 12; i++) rl.push(-42.4 + i * 1.03, 4.92, -36.4, -42.4 + i * 1.03, 4.92, -21.6); sk.line(rl);
  sh.quad([-42, .013, -36], [-42, .013, -22], [-30, .013, -22], [-30, .013, -36], .33);
  crate(-36, -30, 1.4); crate(-36, -28.5, 1.0); crate(-35.9, -30, .9, 1.4); crate(-47, -24, 1.3); crate(-33, -34.5, 1.2); barrel(-44.5, -34, RED); barrel(-45.3, -34.4); truck(-50.8, -32, 1);
  // Site A: raised platform
  solid(32, -38, 54, -22, 0, 1); stairs(42, -22, 54, -20, '-z', 4); stairs(30, -34, 32, -26, '+x', 4); stairs(38, -40, 48, -38, '+z', 4);
  solid(32, -22.35, 42, -22, 1, 1.95); solid(32, -38, 32.35, -34, 1, 1.95); solid(32, -26, 32.35, -22, 1, 1.95); solid(32, -38, 38, -37.65, 1, 1.95); solid(48, -38, 54, -37.65, 1, 1.95);
  crate(40, -30, 1.4, 1); crate(41.4, -30.2, 1.0, 1); crate(40.1, -30, .9, 2.4); crate(50, -34, 1.4, 1); crate(46, -25, 1.2, 1); barrel(35, -35.5, AMBER); barrel(35.8, -35.2);
  { const a = []; for (let x = 34; x <= 52; x += 2) a.push(x, 1.014, -37.6, x, 1.014, -22); for (let z = -36; z <= -24; z += 2) a.push(32.4, 1.014, z, 54, 1.014, z); sk.line(a); }
  // Mid
  solid(-7, -26.5, -2, -25.5, 0, 4.2); solid(2, -26.5, 7, -25.5, 0, 4.2); solid(-2, -26.5, 2, -25.5, 3, 4.2); solid(-2, -26.15, -1, -25.95, 0, 3, { thin: true, tint: WOOD, tone: .33 }); solid(1.8, -27.5, 2, -26.5, 0, 3, { thin: true, tint: WOOD, tone: .33 });
  solid(-2, 2, 2, 6, 0, .75, { vis: false }); sk.cyl(2.3, 2.5, .75, 8, 0, .375, 4); sk.cyl(1.9, 1.9, .1, 8, 0, .62, 4, { tint: GLASS, tone: 0 }); sk.cyl(.3, .45, 1.7, 8, 0, .85, 4); sk.cyl(.9, .2, .25, 8, 0, 1.8, 4);
  { const a = []; for (let i = 0; i < 8; i++) { const an = i / 8 * 6.2832; a.push(Math.cos(an) * .8, 1.9, 4 + Math.sin(an) * .8, Math.cos(an) * 1.4, .7, 4 + Math.sin(an) * 1.4); } sk.line(a); }
  crate(-5.6, -9, 1.4); crate(-5.7, -7.6, 1.0); crate(5.8, 22, 1.3); sandbags(1, -15.6, 5.4, -14.8); sandbags(-5.4, 25, -1, 25.8); barrel(6.2, -3, BLUE); barrel(6.3, -3.9);
  // Four authored press stacks make exposed crossings deliberate; all footprints are on the metre grid.
  function press(x1, z1, x2, z2) { solid(x1,z1,x2,z2,0,2,{tone:.33}); const cx=(x1+x2)/2,cz=(z1+z2)/2,w=x2-x1,d=z2-z1; sk.box(w+.08,.16,d+.08,cx,.10,cz,{tone:.66}); sk.box(w+.08,.13,d+.08,cx,1.88,cz,{tone:.33});
    for(const y of [.48,.91,1.34]) sk.line([x1-.012,y,z1-.012,x2+.012,y,z1-.012,x2+.012,y,z1-.012,x2+.012,y,z2+.012,x2+.012,y,z2+.012,x1-.012,y,z2+.012]); for(const x of [x1+.22,x2-.22]) sk.box(.16,1.75,d+.10,x,1.02,cz,{tint:WOOD,tone:.66}); }
  press(-2,-20,2,-18); press(-2,14,2,16); press(8,-18,10,-16); press(-12,16,-10,18);
  sign('印务',0,1.18,-17.94,0,1.4,.52,{bg:'#f5f2ea',border:4,font:'bold 64px sans-serif'}); sign('装订',0,1.18,16.06,0,1.4,.52,{bg:'#f5f2ea',border:4,font:'bold 64px sans-serif'});
  // A long (east lane)
  solid(42, 23.5, 46, 24.5, 0, 5); solid(50, 23.5, 54, 24.5, 0, 5); solid(46, 23.5, 50, 24.5, 3.5, 5); archLines(46, 50, 24, 3.5); bus(44.4, 9);
  crate(52.6, -6, 1.6); crate(52.9, -4.4, 1.0); crate(43, -14.5, 1.3); crate(52.8, 30, 1.3); crate(51.5, 30.2, 1.0); barrel(58.8, 3, RED); barrel(59, 10.8); crate(59, 7, 1.4); sandbags(47, -2.4, 50.5, -1.6);
  // B lane (west)
  solid(-54, 7.5, -50, 8.5, 0, 5); solid(-46, 7.5, -42, 8.5, 0, 5); solid(-50, 7.5, -46, 8.5, 3.5, 5); archLines(-50, -46, 8, 3.5);
  crate(-52.9, -3, 1.5); crate(-52.9, -1.5, 1.0); crate(-43, 17, 1.3); solid(-43.6, -12, -42.2, -9.6, 0, 1.3, { tone: .33 }); sk.box(1.5, .08, 2.5, -42.9, 1.36, -10.8, { r: [0, 0, .12] }); sandbags(-53.5, 20, -50, 20.8); crate(-47, -12, 1.2);
  // alleys
  crate(-30, 15, 1.3); crate(-31.3, 14.8, 1.0); solid(27, 18.4, 29.6, 19.8, 0, 1.3, { tone: .33 }); crate(30, -15, 1.3); crate(-16, -19.2, 1.2); crate(-15, -19.3, .8); crate(34, 15, 1.2);
  // spawn streets
  truck(-26, 49.5, 0, WOOD); crate(10, 39.6, 1.4); crate(11.5, 39.4, 1.0); sandbags(-7, 39.6, -2.6, 40.4); stall(30, 50.4, 0); stall(-44, 50.4, 0); car(33, 40, 0); crate(-57, 45, 1.5); crate(57, 47, 1.5); barrel(56, 40);
  truck(24, -49.5, 0, WOOD); crate(-10, -39.6, 1.4); crate(-11.5, -39.4, 1.0); sandbags(2.6, -40.4, 7, -39.6); stall(-32, -50.4, 0); stall(18, -39.2, 0); car(-36, -40.3, 0); crate(57, -45, 1.5); crate(-57, -47, 1.5); barrel(-56, -40);
  for (const x of [-52, -36, -12, 14, 40, 56]) { palm(x, 51); palm(x + 5, -51); }
  palm(-53, -19); palm(53, 37); palm(6, 37);
  for (const [x, z, dx, dz] of [[-20, 38.4, 0, 1], [20, 38.4, 0, 1], [-20, -38.4, 0, -1], [20, -38.4, 0, -1], [-7.3, 0, 1, 0], [7.3, -20, -1, 0], [41.7, 0, 1, 0], [-41.7, -17, -1, 0], [54.3, -12, -1, 0], [-54.3, 28, 1, 0]]) lamp(x, z, dx, dz);
  bunting(-7, 5.6, 10, 7, 5.2, 10); bunting(-7, 5.2, -10, 7, 5.8, -10); bunting(-20, 5.5, 14, -20, 5.2, 20); bunting(30, 5.5, 14, 30, 5.8, 20); bunting(42, 5.6, 0, 54, 5.4, 0); bunting(-54, 5.4, -4, -42, 5.2, -4); bunting(-10, 5.4, -20, -10, 5.6, -14); bunting(-60, 6, 45, -30, 6.5, 38); bunting(30, 6, -38, 60, 6.5, -45);
  // District silhouettes sit inside existing wall footprints; combat lanes stay open.
  solid(54, -36, 62, -28, 0, 15); sk.box(8.5, .35, 8.5, 58, 10, -32); sk.box(8.5, .35, 8.5, 58, 15, -32); sk.cone(5.3, 2.7, 4, 58, 16.5, -32, { r: [0, Math.PI / 4, 0] });
  for (const z of [-35.5, -28.5]) sk.box(.14, 5, .28, 53.92, 12.5, z, { tone: .33 });
  sk.cyl(1.75, 1.75, .16, 32, 53.83, 12.4, -32, { ax: 'x', tone: 0 });
  { const a = []; for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2, r = i % 3 ? 1.44 : 1.28; a.push(53.73, 12.4 + Math.cos(t) * r, -32 + Math.sin(t) * r, 53.73, 12.4 + Math.cos(t) * 1.6, -32 + Math.sin(t) * 1.6); } a.push(53.72, 12.4, -32, 53.72, 13.38, -32.48, 53.72, 12.4, -32, 53.72, 11.82, -31.12); sk.line(a); }
  solid(-30, -36, -20, -22, 0, 10); sk.box(.16, .3, 14.5, -30.1, 9.5, -29, { tone: .33 });
  for (const z of [-36, -29]) { sk.quad([-30, 10, z], [-20, 10, z], [-20, 12, z + 6], [-30, 12, z + 6], .33); sk.quad([-30, 12, z + 6], [-20, 12, z + 6], [-20, 10, z + 6], [-30, 10, z + 6], 0, GLASS); sk.tri([-30, 10, z], [-30, 12, z + 6], [-30, 10, z + 6], .33); sk.tri([-20, 10, z], [-20, 10, z + 6], [-20, 12, z + 6], .33); sk.poly([[-30, 10, z], [-30, 12, z + 6], [-20, 12, z + 6], [-20, 10, z]], true); sk.line([-30, 10, z + 6, -30, 12, z + 6, -20, 10, z + 6, -20, 12, z + 6]); }
  for (const z of [-35.8, -22.2]) { sk.box(.3, .4, 12.4, -36.2, 4.2, z, { r: [0, Math.PI / 2, 0], tone: .33 }); sk.line([-42, 4.0, z, -39, 4.5, z, -39, 4.5, z, -36, 4, z, -36, 4, z, -33, 4.5, z, -33, 4.5, z, -30, 4, z]); }
  solid(-7, -27, 7, -25, 4.2, 7); sk.box(14.5, .3, 2.5, 0, 7.1, -26); sk.box(1, 4.2, .1, -5.5, 2.1, -25.44); sk.box(1, 4.2, .1, 5.5, 2.1, -25.44);
  sk.poly([[-2, 7.3, -25], [0, 8.4, -25], [0, 7.3, -25], [2, 8.4, -25], [2, 7.3, -25]], false);
  // A readable front fascia survives the warehouse pillar occlusion from the south approach.
  sk.box(12.6,.38,.22,-36.2,4.34,-21.40,{tone:.66}); sk.box(8.8,1.20,.13,-36.2,3.86,-21.28,{tone:.33});
  sign('B · 印运仓',-36.2,3.86,-21.20,0,8.35,1.01,{bg:'#f5f2ea',border:5,color:'#e9a520',font:'bold 68px sans-serif'});
  for(const x of [-41.5,-30.5]) { sk.box(1.12,.28,1.12,x,.14,-22.5,{tone:.66}); sk.box(.86,.14,.86,x,2.82,-22.5,{tone:.33}); }
  for(const x of [-39,-33]) { sk.line([x,4.12,-21.37,x,3.2,-21.37]); sk.box(.55,.14,.32,x,3.18,-21.37,{tint:AMBER,tone:0}); }
  // One coherent wayfinding system: large site identity, then route confirmation.
  sign('A · 刻度台', 53.77, 8.5, -32, -Math.PI / 2, 6.6, 1.2, { bg: '#f5f2ea', border: 5, color: '#e9a520', font: 'bold 68px sans-serif' });
  sign('B · 印运仓', -30.15, 7.8, -29, -Math.PI / 2, 7, 1.3, { bg: '#f5f2ea', border: 5, color: '#e9a520', font: 'bold 68px sans-serif' });
  sign('A →', 15, 3, 38.07, 0, 3.8, 1.2, { bg: '#f5f2ea', border: 5, color: '#e9a520' }); sign('← B', -15, 3, 38.07, 0, 3.8, 1.2, { bg: '#f5f2ea', border: 5, color: '#e9a520' });
  sign('← A', 14, 3.2, -38.07, Math.PI, 3.8, 1.2, { bg: '#f5f2ea', border: 5, color: '#e9a520' }); sign('B →', -15, 3.2, -38.07, Math.PI, 3.8, 1.2, { bg: '#f5f2ea', border: 5, color: '#e9a520' });
  sign('A · 刻度台', 48, 4.3, 24.57, 0, 4.6, .9, { bg: '#f5f2ea', border: 5, color: '#e9a520', font: 'bold 66px sans-serif' }); sign('B · 印运仓', -48, 4.3, 8.57, 0, 4.6, .9, { bg: '#f5f2ea', border: 5, color: '#e9a520', font: 'bold 66px sans-serif' });
  sign('折页市集', -24, 4.7, 14.07, 0, 5.4, 1, { bg: '#f5f2ea', border: 5 });
  // signs & painted marks
  sign('A', 28.06, 3.6, -29, Math.PI / 2, 2.6, 2.6, { w: 256, h: 256, color: '#e9a520', stencil: 40 }); sign('B', -30.06, 2.9, -29, -Math.PI / 2, 2.4, 2.4, { w: 256, h: 256, color: '#e9a520', stencil: 40 });
  sign('A', 45, 1.03, -30, 0, 5, 5, { w: 256, h: 256, color: '#e9a520', flat: true, stencil: 40 }); sign('B', -37, .03, -26, 0, 5, 5, { w: 256, h: 256, color: '#e9a520', flat: true, stencil: 40 });
  sign('市集 MARKET', -6.94, 4.3, 0, Math.PI / 2, 5.2, 1.0, { border: 6, bg: '#f5f2ea' }); sign('← A', 6.94, 2.6, -22, -Math.PI / 2, 1.6, .6, { w: 256, h: 96, color: '#e9a520' });
  targetSign(0, 2.3, 51.94, Math.PI, 4.2);
  sign('折页门', 0, 5.65, -24.94, 0, 4.8, 1.1, { border: 6, bg: '#f5f2ea' }); sign('PAPER TOWN', 0, 5.65, -27.06, Math.PI, 5.5, 1.0, { border: 6, bg: '#f5f2ea', font: 'bold 60px sans-serif' }); sign('B →', -6.94, 2.6, -22, Math.PI / 2, 1.6, .6, { w: 256, h: 96, color: '#e9a520' });
  { const a = []; for (let x = -58; x < 58; x += 5) { a.push(x, .015, 45, x + 2, .015, 45, x, .015, -45, x + 2, .015, -45); } for (const [cx, cz, y, r] of [[45, -30, 1.016, 3.4], [-37, -26, .016, 3.4]]) for (let i = 0; i < 24; i++) { const p = i / 24 * 6.2832, q = (i + .6) / 24 * 6.2832; a.push(cx + Math.cos(p) * r, y, cz + Math.sin(p) * r, cx + Math.cos(q) * r, y, cz + Math.sin(q) * r); }
    for (let i = 0; i < 280; i++) { const x = rr(-60, 60), z = rr(-52, 52); if (inSolid(x, .2, z)) continue; const an = rr(0, 6.28), l = rr(.06, .3); a.push(x, .015, z, x + Math.cos(an) * l, .015, z + Math.sin(an) * l); if (R() < .15) a.push(x, .015, z, x + rr(-.8, .8), .015, z + rr(-.8, .8)); } sk.line(a); }
  }
  // Contact strips are rendered at every quality; no quality setting changes collision or cover.
  for(const q of BLD) { wash(q.x1-.13,q.z1-.13,q.x2+.13,q.z1,.13,.009); wash(q.x1-.13,q.z2,q.x2+.13,q.z2+.13,.13,.009); wash(q.x1-.13,q.z1,q.x1,q.z2,.13,.009); wash(q.x2,q.z1,q.x2+.13,q.z2,.13,.009); }
  sk = detail; BLD.forEach(decorate); sk = skyline;
  // skyline beyond the walls
  for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832 + rr(0, .1), r = rr(82, 135), w = rr(8, 16), h = rr(9, 24), x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r; sk.box(w, h, w, x, h / 2, z);
    const wl = []; for (let y = 3; y < h - 1; y += 3) for (let k = -w / 2 + 1; k < w / 2 - 1; k += 2.2) { const s = Math.abs(x) > Math.abs(z); const fx = s ? x - Math.sign(x) * (w / 2 + .05) : x + k, fz = s ? z + k : z - Math.sign(z) * (w / 2 + .05); wl.push(fx, y, fz, fx, y + 1.2, fz); } sk.line(wl); }
  for (const [x, z, h] of [[-74, -66, 30], [78, 60, 26]]) { sk.cyl(2.2, 2.8, h, 8, x, h / 2, z); sk.cyl(3.2, 3.2, .5, 8, x, h * .78, z); sk.cyl(1.6, 1.6, 4, 8, x, h + 2, z); sk.sph(2, x, h + 4.5, z, { ws: 8, hs: 4 }); sk.line([x, h + 6.4, z, x, h + 9, z]); }
  { const x = 80, z = -70; sk.line([x, 0, z, x, 38, z, x + 1.5, 0, z, x + 1.5, 38, z, x - 9, 38, z, x + 30, 38, z, x - 9, 38, z, x, 42, z, x, 42, z, x + 30, 38, z, x + 24, 38, z, x + 24, 22, z]); const a = []; for (let y = 0; y < 38; y += 3) a.push(x, y, z, x + 1.5, y + 3, z, x + 1.5, y, z, x, y + 3, z); sk.line(a); sk.box(1.6, 1.6, 1.6, x + 24, 21, z, { tone: .66 }); }
  // far scenery: mountains, clouds, sun
  for (const [rad, hmul, seed] of [[360, 1, 3], [470, 1.7, 9]]) { const Q = rng(seed), pts = []; let h = 30; for (let i = 0; i <= 90; i++) { h = clamp(h + (Q() - .5) * 38, 12, 95); pts.push([Math.cos(i / 90 * 6.2832) * rad, i === 90 ? pts[0][1] : h * hmul, Math.sin(i / 90 * 6.2832) * rad]); }
    far.poly(pts); const a = []; pts.forEach((p, i) => { if (i % 2 === 0 && p[1] > 40) a.push(p[0], p[1], p[2], p[0] * .995 + 6, p[1] * .45, p[2] * .995, p[0], p[1], p[2], p[0] * .99 - 9, p[1] * .6, p[2] * .99); }); far.line(a); }
  for (let i = 0; i < 14; i++) { const a = rr(0, 6.28), r = rr(250, 420), y = rr(110, 190), cx = Math.cos(a) * r, cz = Math.sin(a) * r, w = rr(30, 70), pts = [], tx = -Math.sin(a), tz = Math.cos(a);
    for (let k = 0; k <= 5; k++) for (let j = 0; j <= 6; j++) { const u = (k + j / 6) / 5.0 - .5; pts.push([cx + tx * u * w, y + Math.sin(j / 6 * Math.PI) * w * .07 * (1 + (k % 2) * .6), cz + tz * u * w]); } pts.push([cx - tx * w * .5, y, cz - tz * w * .5]); far.poly(pts); }
  { const c = SUN.clone().multiplyScalar(-600), M = new THREE.Matrix4().lookAt(c, new V3(), new V3(0, 1, 0)).setPosition(c), pts = [], a = []; for (let i = 0; i < 32; i++) { const an = i / 32 * 6.2832; pts.push([Math.cos(an) * 38, Math.sin(an) * 38, 0]); if (i % 2 === 0) a.push(Math.cos(an) * 48, Math.sin(an) * 48, 0, Math.cos(an) * (i % 4 ? 60 : 74), Math.sin(an) * (i % 4 ? 60 : 74), 0); } far.poly(pts, true, M); far.line(a, M); }

  const world = main.bake(fillMat(),lineMat({width:1.45})), trim = detail.bake(fillMat(),lineMat({width:1.05})), sky = skyline.bake(fillMat(),lineMat({color:GREY,width:1.05})); scene.add(world,trim,sky);
  scene.add(sh.bake(fillMat({ offset: 0 }), lineMat()));
  const fg = far.bake(null, lineMat({ color: GREY, width: 1.1, fog: false })); fg.traverse(o => o.frustumCulled = false); scene.add(fg);
  MAP.renderLayers = { world, trim, sky, far: fg }; MAP.setDetail = quality => { trim.ink.visible = quality !== 'low'; sky.visible = quality !== 'low'; fg.visible = quality !== 'low'; };

  buildBuckets(); buildNav(); drawMini();
}

/* Map metadata is updated in place: objective and training keep these shared references. */
const PAPER_LAYOUT = JSON.parse(JSON.stringify({spawn:MAP.spawn,points:MAP.points,zones:MAP.zones,sites:MAP.sites,rangePlayer:MAP.rangePlayer,rangeSpots:MAP.rangeSpots,bounds:MAP.bounds,menuCamera:MAP.menuCamera,midHold:MAP.midHold}));
function configureMap(id) {
  id = MAP_CATALOG[id] ? id : 'papertown'; const meta=MAP_CATALOG[id], paper=id==='papertown', wh=id==='warehouse';
  Object.assign(MAP,{id,name:meta.name,en:meta.en,description:meta.description,siteNames:meta.siteNames});
  const data=paper?JSON.parse(JSON.stringify(PAPER_LAYOUT)):wh?{
    bounds:{x1:-49.4,x2:49.4,z1:-43.4,z2:43.4},spawn:{red:{x1:-14,x2:14,z1:35,z2:40},blue:{x1:-16,x2:16,z1:-42,z2:-37}},
    sites:{A:{x1:24,x2:43,z1:-40,z2:-20,y:0,name:'A 点'},B:{x1:-46,x2:-29,z1:-39,z2:-24,y:0,name:'B 点'}},
    points:[['A',32,-35,3,3],['B',-36,-26,3,3],['ALONG',32,10,2,1.5],['BLANE',-42,6,2,1.5],['MID',0,4,2,2],['MIDN',0,-24,2,1],['MIDS',0,28,1,2],['MARKET',-13,-23,1.5,1.5],['SHORT',13,-21,1.5,1.5],['NE',46,-30,2,.5],['NW',-46,-34,2,.5],['SE',44,36,.5,2],['SW',-40,34,.5,2],['PACK',15,7,1.5,1],['CTYARD',-8,-35,.5,2]],
    zones:[[21,-43,49,-11,'A 点 · 装运大厅'],[-49,-43,-20,-14,'B 点 · 集装箱场'],[6,4,24,10,'装箱间'],[6,-24,20,-18,'A 侧廊'],[-20,-26,-6,-20,'B 连廊'],[-20,-43,20,-28,'守方堆场'],[-6,-28,6,32,'中路'],[24,-10,49,32,'A 主道'],[-49,-14,-36,32,'B 主道'],[-49,32,49,43,'南卸货场']],
    rangePlayer:{x:-4,y:0,z:30},rangeSpots:[{x:-1,z:24},{x:3,z:20},{x:-5,z:10},{x:-4,z:-2},{x:-2,z:-20}],menuCamera:{x:44,y:24,z:40,tx:0,ty:0,tz:-10},midHold:{x1:-10,x2:10,z1:-42,z2:-36,face:{x:0,z:-28}}
  }:{
    bounds:{x1:-58.4,x2:58.4,z1:-50.4,z2:50.4},spawn:{red:{x1:-14,x2:14,z1:43,z2:49},blue:{x1:-4,x2:18,z1:-49,z2:-44}},
    sites:{A:{x1:30,x2:56,z1:-48,z2:-28,y:2,name:'A 点'},B:{x1:-56,x2:-30,z1:-43,z2:-22,y:0,name:'B 点'}},
    points:[['A',42,-34,3,3],['B',-44,-30,3,3],['ALONG',52,6,2,1.5],['BLANE',-39,20,2,1.5],['MID',0,4,2,2],['MIDN',-6,-34,2,1],['MIDS',0,34,1,2],['MARKET',-20,2,1.5,1.5],['SHORT',8,-10,1.5,1.5],['NE',52,-46,2,.5],['NW',-54,-47,2,.5],['SE',52,42,.5,2],['SW',-39,43,.5,2],['TUNNEL',-39,-8,1.5,1],['CROSS',34,42,1.5,1.5]],
    zones:[[28,-50,58,-24,'A 点 · 日晷庭'],[-58,-50,-26,-20,'B 点 · 井院'],[46,-24,58,-16,'A 长坡'],[20,-50,28,-42,'守方坡道'],[11,-24,28,-18,'A 小道'],[5,-24,11,14,'猫道'],[-5,-26,5,-24,'中门'],[-14,-42,5,-26,'守方中路'],[-14,-50,20,-42,'守方出生点'],[-26,-38,-14,-30,'B 门廊'],[-44,-20,-34,46,'B 上隧道'],[-34,0,-5,4,'下隧道'],[-34,40,-24,46,'隧道入口'],[-5,24,5,38,'中路拱门'],[-5,-24,5,24,'中路'],[46,-16,58,28,'A 长道'],[46,28,58,50,'长道门'],[24,38,46,46,'长道外廊'],[-24,38,24,50,'进攻方广场']],
    rangePlayer:{x:0,y:0,z:44},rangeSpots:[{x:0,z:36},{x:-3,z:28},{x:3,z:22},{x:-2,z:10},{x:2,z:-6}],menuCamera:{x:44,y:30,z:56,tx:0,ty:0,tz:-12},midHold:{x1:-12,x2:4,z1:-40,z2:-32,face:{x:0,z:-22}}
  };
  for(const k of ['spawn','bounds','rangePlayer','menuCamera','midHold']) Object.assign(MAP[k],data[k]);
  MAP.menuCamera.pos=[data.menuCamera.x,data.menuCamera.y,data.menuCamera.z];MAP.menuCamera.target=[data.menuCamera.tx,data.menuCamera.ty,data.menuCamera.tz];
  for(const k of ['A','B']) Object.assign(MAP.sites[k],data.sites[k]);
  MAP.points.splice(0,MAP.points.length,...data.points.map(q=>Array.isArray(q)?{n:q[0],x:q[1],z:q[2],red:q[3],blue:q[4]}:q)); MAP.zones.splice(0,MAP.zones.length,...data.zones);
  MAP.rangeSpots.splice(0,MAP.rangeSpots.length,...data.rangeSpots.map(q=>({...q,d:q.d||Math.round(Math.hypot(q.x-MAP.rangePlayer.x,q.z-MAP.rangePlayer.z))})));
  MAP.surfaces = paper?[]:wh?[[21,-43,49,-11,'concrete'],[6,4,24,10,'wood'],[6,-24,20,-18,'metal']]:[[-44,-20,-5,46,'stone'],[5,-24,28,6,'wood'],[28,-50,58,-18,'stone']];
}
function buildMap(scene,id='papertown') {
  if(MAP.root){const mats=new Set(),geo=new Set(),tex=new Set();MAP.root.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){mats.add(m);if(m.map)tex.add(m.map);}});MAP.root.removeFromParent();for(const m of MAP.lineMaterials||[])if(!mats.has(m)){const i=LINE_MATS.indexOf(m);if(i>=0)LINE_MATS.splice(i,1);m.dispose();}geo.forEach(g=>g.dispose());tex.forEach(t=>t.dispose());mats.forEach(m=>{const i=LINE_MATS.indexOf(m);if(i>=0)LINE_MATS.splice(i,1);m.dispose();});}
  configureMap(id);MAP.solids.length=0;MAP.ladders=[];MAP.buckets=[];_raySeq=0;_hit.s=null;Object.assign(_nav,{g:null,from:null,stamp:null,closed:null,n:0});
  const root=MAP.root=new THREE.Group(),lineStart=LINE_MATS.length;root.name='map-'+MAP.id;scene.add(root);
  buildWorld(root);MAP.lineMaterials=LINE_MATS.slice(lineStart);
  return MAP;
}
/* ---------------- authored layouts: share Paper Town's facade / prop / shadow kit through buildWorld ---------------- */
/* Structure coordinates stay on the 1m nav grid; heights use 0.25m steps so ramps read as stairs and remain walkable. */
function layoutKit(K) {
  const { sk, solid } = K, e = .014;
  const frame = (x1, z1, x2, z2, y0, h, k = .12, diag = true) => { const a = [], y1 = y0 + k, y2 = y0 + h - k;
    for (const z of [z1 - e, z2 + e]) { a.push(x1 + k, y1, z, x2 - k, y1, z, x2 - k, y1, z, x2 - k, y2, z, x2 - k, y2, z, x1 + k, y2, z, x1 + k, y2, z, x1 + k, y1, z); if (diag) a.push(x1 + k, y1, z, x2 - k, y2, z); }
    for (const x of [x1 - e, x2 + e]) { a.push(x, y1, z1 + k, x, y1, z2 - k, x, y1, z2 - k, x, y2, z2 - k, x, y2, z2 - k, x, y2, z1 + k, x, y2, z1 + k, x, y1, z1 + k); if (diag) a.push(x, y2, z1 + k, x, y1, z2 - k); }
    a.push(x1 + k, y0 + h + e, z1 + k, x2 - k, y0 + h + e, z2 - k, x1 + k, y0 + h + e, z2 - k, x2 - k, y0 + h + e, z1 + k); sk.line(a); };
  const crateB = (x1, z1, x2, z2, y0 = 0, h = 1, tint = WOOD) => { solid(x1, z1, x2, z2, y0, y0 + h, { tint, shadow: y0 === 0 }); frame(x1, z1, x2, z2, y0, h); };
  const ramp = (x1, z1, x2, z2, dir, y0, y1, o = {}) => { const n = Math.round((y1 - y0) / .25), a = [];   // dir = direction of ascent, one 1m tread per 0.25m rise
    for (let i = 0; i < n; i++) { const t = y0 + .25 * (i + 1), q = dir === '+x' ? [x1 + i, z1, x1 + i + 1, z2] : dir === '-x' ? [x2 - i - 1, z1, x2 - i, z2] : dir === '+z' ? [x1, z1 + i, x2, z1 + i + 1] : [x1, z2 - i - 1, x2, z2 - i];
      solid(q[0], q[1], q[2], q[3], 0, t, { shadow: false, tone: i % 2 ? .15 : undefined, ...o }); if (dir[1] === 'x') a.push(q[0], t + e, q[1] + .1, q[0], t + e, q[3] - .1); else a.push(q[0] + .1, t + e, q[1], q[2] - .1, t + e, q[1]); } sk.line(a); };
  const wall = (x1, z1, x2, z2, h, o = {}) => { solid(x1, z1, x2, z2, o.y0 || 0, h, o); sk.bx(x1 - .08, h, z1 - .08, x2 + .08, h + .2, z2 + .08, { tint: o.tint, tone: .33 }); };
  const leaf = (x, y, z, len, h, ang, o = {}) => { const M = new THREE.Matrix4().makeRotationY(ang).setPosition(x, y, z), a = []; sk.box(len, h, .1, len / 2, h / 2, 0, { m: M, tint: o.tint ?? WOOD, tone: o.tone ?? .33 });
    for (let k = .3; k < len - .1; k += .3) a.push(k, .05, .06, k, h - .05, .06, k, .05, -.06, k, h - .05, -.06); a.push(.08, .3, .07, len - .08, h * .5, .07, .08, h * .5, .07, len - .08, h - .3, .07, .05, .4, .07, len - .05, .4, .07, .05, h - .4, .07, len - .05, h - .4, .07); sk.line(a, M); };
  const arch = (a1, a2, b1, b2, y, alongZ, rise = .9) => { for (const b of [b1 - .02, b2 + .02]) { const p = []; for (let i = 0; i <= 14; i++) { const an = i / 14 * Math.PI, u = (a1 + a2) / 2 - Math.cos(an) * (a2 - a1) / 2, v = y - rise + Math.sin(an) * rise; p.push(alongZ ? [b, v, u] : [u, v, b]); } sk.poly(p);
    const k = [], c = (a1 + a2) / 2, r = (a2 - a1) / 2; for (let i = 1; i < 14; i += 2) { const an = i / 14 * Math.PI, u = c - Math.cos(an) * r, v = y - rise + Math.sin(an) * rise, u2 = c - Math.cos(an) * (r + .45), v2 = y - rise + Math.sin(an) * (rise + .45); k.push(...(alongZ ? [b, v, u, b, v2, u2] : [u, v, b, u2, v2, b])); } sk.line(k); } };
  const beams = (x1, z1, x2, z2, y, alongX, step = 4) => { if (alongX) for (let x = x1 + 1; x < x2; x += step) { sk.bx(x - .15, y - .35, z1, x + .15, y, z2, { tint: WOOD, tone: .66 }); } else for (let z = z1 + 1; z < z2; z += step) sk.bx(x1, y - .35, z - .15, x2, y, z + .15, { tint: WOOD, tone: .66 }); };
  const hang = (x, y, z) => { sk.line([x, y, z, x, y - .7, z]); sk.cone(.28, .22, 6, x, y - .8, z, { tone: .66 }); sk.box(.16, .16, .16, x, y - .95, z, { tint: AMBER, tone: 0 }); };
  return { frame, crateB, ramp, wall, leaf, arch, beams, hang };
}
const MAP_LAYOUTS = { dunes: layoutDunes, warehouse: layoutDepot };

function layoutDunes(K) {   // desert bomb-defusal flow: T south, long / mid-catwalk / tunnels, raised A court, walled B well-yard
  const { sk, solid, building, block, crate, barrel, sandbags, car, truck, palm, lamp, stall, bunting, sign, wash, rr, R } = K, { crateB, ramp, wall, leaf, arch, beams, hang } = layoutKit(K), SAND = { tint: WOOD };
  const bld = (x1, z1, x2, z2, h, o = {}) => building(x1, z1, x2, z2, h, { tint: WOOD, ...o }), SG = { bg: '#f5f2ea', border: 5, color: '#e9a520', font: 'bold 66px sans-serif' };
  // streets are sand-washed; roofed tunnels sit in a heavier shade wash so their mouths read from distance
  for (const q of [[-24,38,24,50],[-5,-24,5,38],[-14,-50,20,-26],[24,38,46,46],[46,-16,58,50],[-58,-50,-26,-20],[-26,-38,-14,-30]]) wash(...q, .05);
  for (const q of [[-44,-20,-34,46],[-34,40,-24,46],[-34,0,-5,4]]) wash(...q, .2);
  wash(28, -50, 58, -24, .06, 2.006); wash(28, -24, 46, -18, .06, 2.006); wash(11, -24, 28, -18, .1, 2.006); wash(5, -24, 11, 6, .1, 2.006);
  // perimeter streets of sand houses
  block(-64, -56, -58, 56, 7, 11, SAND); block(58, -56, 64, 56, 7, 11, SAND); block(-58, -56, 58, -50, 7, 10, SAND); block(-58, 50, 58, 56, 6, 9, SAND);
  // east quarter: catwalk shoulder, short link and the long wall
  bld(11, -18, 28, -2, 8); bld(11, -2, 28, 14, 7); bld(5, 14, 28, 26, 7.5); bld(5, 26, 28, 38, 6.5); bld(28, -18, 46, 6, 9); bld(28, 6, 46, 28, 8); bld(28, 28, 46, 38, 7); bld(24, 46, 46, 50, 6); bld(5, -42, 28, -24, 9);
  // west quarter: tunnel blocks and the B wall
  bld(-24, 26, -5, 38, 7); bld(-34, 26, -24, 40, 6.5); bld(-44, 46, -24, 50, 6); bld(-34, 4, -20, 26, 8); bld(-20, 4, -5, 26, 7); bld(-26, -30, -14, 0, 8); bld(-14, -26, -5, 0, 7.5);
  bld(-38, -20, -26, -6, 7); bld(-34, -6, -26, 0, 6); bld(-58, -20, -44, 8, 9); bld(-58, 8, -44, 30, 7.5); bld(-58, 30, -44, 50, 8); bld(-28, -50, -14, -38, 9);
  for (const [x, z, r] of [[37, 17, 3.2], [-27, 15, 3], [16, -33, 2.6]]) { sk.sph(r, x, (x === 37 ? 8 : x < 0 ? 8 : 9), z, { tint: WOOD, ws: 12, hs: 6 }); sk.cyl(.12, .12, 1.6, 5, x, (x === 37 ? 8 : x < 0 ? 8 : 9) + r + .7, z); }
  // T court: palms, market awnings, carts
  for (const [x, z] of [[-20.5, 48.5], [-10.5, 39.5], [11.5, 39.5], [21.5, 48.5], [-2.5, 49.5]]) palm(x, z);
  stall(-14, 49.5, 0); stall(14, 49.5, 0); crate(-22, 40, 2); crate(-22.5, 42.5, 1); crate(22, 40, 2); truck(3, 45, 1, WOOD); sandbags(-8, 44, -5, 45);
  bunting(-24, 5.6, 38.2, 24, 5.8, 38.2); lamp(-5.4, 38.6, 1, 0); lamp(5.4, 38.6, -1, 0);
  sign('↑ 中路', 0, 5.2, 38.07, 0, 3, .9, SG); sign('A 长道 →', 20, 3.4, 38.07, 0, 4.4, 1, SG); sign('← B 隧道', -20, 3.4, 38.07, 0, 4.4, 1, SG);
  // top mid arch and mid street
  solid(-5, 24, 5, 26, 4, 7, SAND); arch(-5, 5, 24, 26, 4, false, 1.2); sk.bx(-5.2, 7, 23.8, 5.2, 7.3, 26.2, { tint: WOOD, tone: .33 });
  wall(-5, 30, -2, 31, 1.25, SAND); crateB(-4, 16, -2, 18, 0, 1.25); crateB(-4, 17, -3, 18, 1.25, 1); barrel(3.5, 20.5); barrel(4.5, 21.5, AMBER); crateB(2, -12, 4, -10, 0, 1.5); crate(-4.5, -20.5, 1);
  lamp(-4.6, 12, 1, 0); lamp(4.6, -16, -1, 0); bunting(-5, 5.6, -8, 5, 5.2, -8);
  // mid doors: offset leaves leave a deliberate crack; a CT screen behind denies spawn-to-spawn sight
  solid(-5, -26, -1, -24, 0, 6, SAND); solid(2, -26, 5, -24, 0, 6, SAND); solid(-1, -26, 2, -24, 3.5, 6, SAND); arch(-1, 2, -26, -24, 3.5, false, .6);
  leaf(-1, 0, -24, 1.5, 3.3, -1.9); leaf(2, 0, -24, 1.5, 3.3, Math.PI + .5); sign('中门', .5, 4.7, -23.93, 0, 2.4, .8, SG);
  crateB(-2, -36, 1, -34, 0, 2); crateB(1, -36, 4, -35, 0, 2.25); crateB(-1, -36, 0, -35, 2, 1); sandbags(4, -36, 7, -35); barrel(-2.5, -33.5);
  // catwalk: stairs from lower mid, raised walk overlooking mid, arch into the short link
  ramp(5, 6, 11, 14, '-z', 0, 2, SAND); solid(5, -24, 11, 6, 0, 2, SAND); solid(11, -24, 28, -18, 0, 2, SAND);
  wall(5, -22, 6, -12, 3, { ...SAND, y0: 2 }); wall(5, -6, 6, 2, 3, { ...SAND, y0: 2 }); crateB(19, -24, 21, -22, 2, 1); crateB(9, -24, 11, -22, 2, 1);
  solid(26, -24, 28, -18, 5.5, 8, SAND); arch(-24, -18, 26, 28, 5.5, true); sign('A 小道', 26.93, 6.6, -21, Math.PI / 2, 3, .8, SG);
  // A court (raised 2m): CT ramp, long ramp, sundial, stacked cover and the NE nook
  solid(28, -50, 58, -24, 0, 2, SAND); solid(28, -24, 46, -18, 0, 2, SAND); ramp(20, -50, 28, -42, '+x', 0, 2, SAND); ramp(46, -24, 58, -16, '-z', 0, 2, SAND);
  wall(20, -42, 28, -41, 3, SAND); wall(46, -17, 47, -16, 3, SAND);
  solid(37, -41, 39, -39, 2, 3, { tint: WOOD, tone: .33 }); sk.cyl(1.25, 1.25, .12, 16, 38, 3.06, -40, { tint: PAPER, tone: 0 }); sk.poly([[38, 3.12, -40.9], [38, 4.7, -40.9], [38, 3.12, -39.1]], true);
  { const a = []; for (let i = 0; i < 12; i++) { const an = i / 12 * 6.2832; a.push(38 + Math.cos(an) * .9, 3.13, -40 + Math.sin(an) * .9, 38 + Math.cos(an) * 1.18, 3.13, -40 + Math.sin(an) * 1.18); } sk.line(a); }
  crateB(44, -38, 46, -36, 2, 2); crateB(44, -36, 45, -35, 2, 1); crateB(32, -32, 34, -30, 2, 1.25); crateB(50, -30, 52, -27, 2, 1.5); crateB(54, -50, 56, -48, 2, 2); crateB(52, -50, 54, -49, 2, 1); crateB(30, -48, 32, -46, 2, 1);
  { const q = []; for (let x = 30; x < 58; x += 2) q.push(x, 2.012, -50, x, 2.012, -24); for (let z = -48; z < -24; z += 2) q.push(28, 2.012, z, 58, 2.012, z); for (let x = 30; x < 46; x += 2) q.push(x, 2.012, -24, x, 2.012, -18); for (let z = -22; z < -18; z += 2) q.push(28, 2.012, z, 46, 2.012, z); sk.line(q); }
  sandbags(40, -28, 44, -27); barrel(56.5, -33.5); barrel(56.5, -34.5, AMBER);
  sign('A · 日晷庭', 43, 6.4, -49.93, 0, 7, 1.3, SG); sign('A', 41, 2.03, -36, 0, 5, 5, { w: 256, h: 256, color: '#e9a520', flat: true, stencil: 40 }); sign('A', 46.06, 4.6, -10, Math.PI / 2, 2.4, 2.4, { w: 256, h: 256, color: '#e9a520', stencil: 40 });
  // long: double doors, pit nook, car and barrels on the approach
  solid(46, 28, 50, 30, 0, 6, SAND); solid(53, 28, 58, 30, 0, 6, SAND); solid(50, 28, 53, 30, 3.75, 6, SAND); arch(50, 53, 28, 30, 3.75, false, .7);
  leaf(50, 0, 28, 1.5, 3.5, 1.2); leaf(53, 0, 28, 1.5, 3.5, Math.PI - 1.35); sign('长道门', 51.5, 4.9, 30.07, 0, 3, .8, SG);
  crateB(54, 32, 56, 34, 0, 2); crateB(56, 32, 58, 33, 0, 1); wall(52, 36, 58, 37, 1.25, SAND); car(51, -4, 1); barrel(56.5, 20.5); barrel(56.5, 19.5, AMBER); crateB(47, 12, 49, 16, 0, 1.25);
  bunting(46, 5.8, 10, 58, 5.4, 10); lamp(57.4, 0, -1, 0); lamp(46.6, 24, 1, 0); for (const [x, z] of [[56.5, 46.5], [47.5, 48.5]]) palm(x, z);
  stall(34, 45.5, 2); crate(26, 40, 2); crate(26.5, 42.5, 1); bunting(24, 5.2, 42, 46, 5.6, 42); sign('长道 →', 45.93, 3.4, 42, -Math.PI / 2, 3.4, .9, SG);
  // upper / lower tunnels: shaded roofs, timber frames, hanging lamps
  solid(-44, -20, -34, 46, 4, 4.5, { ...SAND, shadow: false }); solid(-34, 40, -24, 46, 4, 4.5, { ...SAND, shadow: false }); solid(-34, 0, -5, 4, 4, 4.5, { ...SAND, shadow: false });
  beams(-44, -20, -34, 46, 4, false, 5); beams(-34, 0, -5, 4, 4, true, 5); beams(-34, 40, -24, 46, 4, true, 5);
  for (const z of [-14, -2, 10, 22, 34]) hang(-39, 3.6, z); hang(-20, 3.6, 2); hang(-29, 3.6, 43);
  arch(0, 4, -5.02, -5, 4, true, .7); arch(40, 46, -24.02, -24, 4, true, .7); arch(-44, -38, -20.02, -20, 4, false, .7);
  crateB(-43, 14, -41, 16, 0, 1.5); barrel(-35.5, 30.5); barrel(-35.5, 29.5); crateB(-42, -12, -40, -10, 0, 1.25); crateB(-16, 0, -14, 1, 0, 1); barrel(-9.5, 3.5);
  sign('B 隧道', -34.07, 3.2, 43, -Math.PI / 2, 3, .8, SG); sign('下隧道', -5.07, 3.2, 2, -Math.PI / 2, 2.6, .8, SG);
  // B well-yard: back platform, burnt cart, the well, doors and a window to CT
  solid(-58, -50, -48, -44, 0, 1, SAND); ramp(-48, -50, -44, -44, '-x', 0, 1, SAND); crateB(-58, -44, -56, -42, 0, 2); crateB(-52, -50, -50, -48, 1, 1);
  solid(-46, -40, -42, -36, 0, 1, { tint: WOOD, tone: .33 }); sk.cyl(1.55, 1.55, .12, 12, -44, 1.06, -38, { tint: GLASS, tone: 0 });
  for (const [x, z] of [[-45.7, -39.7], [-42.3, -36.3]]) sk.cyl(.1, .1, 2.6, 6, x, 2.3, z, { tint: WOOD }); sk.line([-45.7, 3.6, -39.7, -42.3, 3.6, -36.3, -44, 3.6, -38, -44, 1.2, -38]); sk.cyl(.18, .18, .5, 8, -44, 3.6, -38, { ax: 'z', tint: WOOD });
  car(-50, -26, 0); crateB(-38, -44, -36, -42, 0, 2); crateB(-36, -44, -35, -43, 0, 1); crateB(-40, -28, -38, -26, 0, 1.25); crateB(-32, -24, -30, -22, 0, 1.5); crateB(-56, -32, -54, -28, 0, 1.25); sandbags(-36, -30, -33, -29);
  solid(-28, -38, -26, -37, 0, 6, SAND); solid(-28, -34, -26, -32, 0, 6, SAND); solid(-28, -37, -26, -34, 3.5, 6, SAND); solid(-28, -32, -26, -30, 0, 1.25, SAND); solid(-28, -32, -26, -30, 2.5, 6, SAND);
  leaf(-26, 0, -37, 1.4, 3.3, -1.3); leaf(-26, 0, -34, 1.4, 3.3, 1.35); sk.bx(-28.1, 1.25, -32, -25.9, 1.4, -30, { tint: WOOD, tone: .66 }); arch(-37, -34, -28, -26, 3.5, true, .6);
  crateB(-20, -38, -18, -36, 0, 1.5); crateB(-12, -34, -10, -32, 0, 1.25); crate(-6.5, -40.5, 1); truck(-2, -47, 0, WOOD); sandbags(6, -44, 10, -43); crateB(14, -50, 16, -48, 0, 2);
  sign('B · 井院', -27.93, 5, -44, Math.PI / 2, 6, 1.2, SG); sign('B', -44, .03, -30, 0, 5, 5, { w: 256, h: 256, color: '#e9a520', flat: true, stencil: 40 }); sign('B', -44.07, 2.8, -12, -Math.PI / 2, 2.2, 2.2, { w: 256, h: 256, color: '#e9a520', stencil: 40 });
  sign('← B 门', -14.07, 3.2, -35, -Math.PI / 2, 3, .8, SG); sign('A 坡 →', 19.93, 3.2, -46, Math.PI / 2, 3, .8, SG); lamp(-13.4, -45, -1, 0); lamp(4.6, -34, -1, 0);
  sign('双井沙城 · DUNE COURT', 0, 6, 49.93, Math.PI, 16, 1.6, { bg: '#f5f2ea', border: 5 });
  // wind-blown sand strokes on open ground
  const a = []; for (let i = 0; i < 320; i++) { const x = rr(-58, 58), z = rr(-50, 50); if (K.inSolid(x, .2, z)) continue; const an = rr(-.4, .4), l = rr(.2, .9), y = K.inSolid(x, 1.9, z) ? 2.015 : .015; a.push(x, y, z, x + Math.cos(an) * l, y, z + Math.sin(an) * l * .3); } sk.line(a);
}

function layoutDepot(K) {   // industrial yard: A inside the loading hall, B in the container yard, mid with a Z-screen
  const { sk, solid, building, block, crate, barrel, sandbags, truck, lamp, sign, wash, rr, R } = K, { frame, crateB, ramp, wall, leaf, arch, beams, hang } = layoutKit(K);
  const SG = { bg: '#f5f2ea', border: 5, color: '#e9a520', font: 'bold 66px sans-serif' }, HALL = { tint: PAPER, tone: undefined };
  let tag = 0; const TAGS = ['K-07', 'INK-24', 'S-13', 'P-02', 'K-31', 'D-19'];
  const container = (x1, z1, x2, z2, y0 = 0, tint = WOOD) => { const h = 2.75, lx = x2 - x1 >= z2 - z1, a = []; solid(x1, z1, x2, z2, y0, y0 + h, { tint, shadow: y0 === 0 });
    sk.bx(x1 - .04, y0 + h - .12, z1 - .04, x2 + .04, y0 + h, z2 + .04, { tint, tone: .33 }); sk.bx(x1 - .04, y0, z1 - .04, x2 + .04, y0 + .12, z2 + .04, { tint, tone: .33 });
    if (lx) { for (let x = x1 + .35; x < x2 - .2; x += .38) for (const z of [z1 - e2, z2 + e2]) a.push(x, y0 + .15, z, x, y0 + h - .15, z); for (const x of [x1 - e2, x2 + e2]) { const m = (z1 + z2) / 2; a.push(x, y0 + .15, m, x, y0 + h - .15, m); for (const z of [z1 + .5, m - .4, m + .4, z2 - .5]) a.push(x, y0 + .2, z, x, y0 + h - .2, z); } }
    else { for (let z = z1 + .35; z < z2 - .2; z += .38) for (const x of [x1 - e2, x2 + e2]) a.push(x, y0 + .15, z, x, y0 + h - .15, z); for (const z of [z1 - e2, z2 + e2]) { const m = (x1 + x2) / 2; a.push(m, y0 + .15, z, m, y0 + h - .15, z); for (const x of [x1 + .5, m - .4, m + .4, x2 - .5]) a.push(x, y0 + .2, z, x, y0 + h - .2, z); } }
    sk.line(a); if (tag < TAGS.length && y0 === 0 && R() < .6) { const t = TAGS[tag++], o = { bg: null, border: 0, color: '#16161c', font: 'bold 150px sans-serif', w: 512, h: 256 }; lx ? sign(t, (x1 + x2) / 2, 1.9, z2 + .03, 0, 2.2, 1.1, o) : sign(t, x2 + .03, 1.9, (z1 + z2) / 2, Math.PI / 2, 2.2, 1.1, o); } }, e2 = .014;
  const forklift = (x, z, rot = 0) => { const M = new THREE.Matrix4().makeRotationY(rot * Math.PI / 2).setPosition(x, 0, z); solid(x - (rot % 2 ? 1.5 : 1), z - (rot % 2 ? 1 : 1.5), x + (rot % 2 ? 1.5 : 1), z + (rot % 2 ? 1 : 1.5), 0, 2.2, { vis: false });
    sk.box(1.3, .9, 1.9, 0, .75, .2, { m: M, tint: AMBER, tone: 0 }); sk.box(1.2, .5, .6, 0, 1.4, .8, { m: M, tone: .66 }); for (const px of [-.55, .55]) { sk.box(.08, 1.6, .08, px, 2.0, -.2, { m: M }); sk.box(.1, 2.3, .12, px, 1.15, -.85, { m: M, tone: .66 }); sk.box(.12, .06, 1.1, px * .6, .12, -1.35, { m: M, tone: .66 }); }
    sk.box(1.3, .08, 1.3, 0, 2.8, .1, { m: M, tone: .33 }); for (const wx of [-.6, .6]) for (const wz of [-.5, .8]) sk.cyl(.3, .3, .22, 10, wx, .3, wz, { m: M, ax: 'x', tone: .66 }); sk.line([0, 1.5, .1, 0, 1.2, -.3], M); };
  const pallets = (x1, z1, x2, z2, h = 1.25, y0 = 0) => { crateB(x1, z1, x2, z2, y0, h, WOOD); const a = []; for (let y = y0 + .14; y < y0 + h; y += .42) for (const z of [z1 - e2, z2 + e2]) a.push(x1, y, z, x2, y, z); sk.line(a); };
  const shutter = (x1, x2, z, y0, y1, open) => { const a = [], yo = y1 - (y1 - y0) * (1 - open); sk.bx(x1, yo, z - .08, x2, y1, z + .08, { tone: .33 }); for (let y = yo + .18; y < y1; y += .18) a.push(x1, y, z - .09, x2, y, z - .09, x1, y, z + .09, x2, y, z + .09); sk.line(a);
    for (const x of [x1, x2]) sk.bx(x - .12, y0, z - .15, x + .12, y1 + .3, z + .15, { tone: .66 }); sk.bx(x1 - .2, y1, z - .35, x2 + .2, y1 + .6, z + .35, { tone: .33 }); const h = []; for (let x = x1; x < x2; x += .9) h.push(x, y0 + .02, z - .5, x + .45, y0 + .02, z + .5); sk.line(h); };
  const hazard = (x1, z1, x2, z2, y) => { const a = []; for (let x = x1; x < x2 - .3; x += .6) sk.bx(x, y, z1, x + .3, y + .012, z2, { tint: AMBER, tone: 0 }); };
  const corrugate = (x1, z1, x2, z2, y0, y1, step = .5) => { const a = []; if (x2 - x1 > z2 - z1) { for (let x = x1 + step; x < x2; x += step) a.push(x, y0, z1 - e2, x, y1, z1 - e2, x, y0, z2 + e2, x, y1, z2 + e2); } else for (let z = z1 + step; z < z2; z += step) a.push(x1 - e2, y0, z, x1 - e2, y1, z, x2 + e2, y0, z, x2 + e2, y1, z); sk.line(a); };

  // ground: asphalt yards, a darker hall floor with skylight patches, painted lanes
  for (const q of [[-49,32,49,43],[-49,-14,-36,32],[24,-10,49,32],[-6,-28,6,32],[-20,-43,20,-32],[-49,-43,-20,-14],[-20,-26,-6,-20]]) wash(...q, .06);
  for (let z = -43; z < -10; z += 7) { wash(21, z, 49, Math.min(-11, z + 4), .17); if (z + 7 < -10) wash(21, z + 4, 49, z + 7, .05); } wash(6, 4, 24, 10, .2); wash(6, -24, 20, -18, .2);
  { const a = []; for (const x of [-45, -40]) a.push(x, .012, -12, x, .012, 30); for (const z of [-34, 36]) for (let x = -46; x < 46; x += 3) a.push(x, .012, z, x + 1.5, .012, z); for (let z = -8; z < 30; z += 3) a.push(0, .012, z, 0, .012, z + 1.5); sk.line(a); }
  // perimeter depots
  block(-56, -50, -49, 50, 8, 12); block(49, -8, 56, 50, 8, 11); solid(49, -50, 56, -8, 0, 12, HALL); block(-49, -50, 20, -43, 8, 11); solid(20, -50, 49, -43, 0, 12, HALL); block(-49, 43, 49, 50, 7, 10);
  // interior blocks: sorting offices west of mid, packing sheds east
  building(-36, -14, -20, 10, 8); building(-36, 10, -20, 32, 7); building(-20, -20, -6, 6, 7.5); building(-20, 6, -6, 32, 6.5); building(-20, -32, -6, -26, 7);
  building(6, -32, 20, -24, 7); building(6, -18, 20, -10, 8); building(6, -10, 24, 4, 7); building(6, 10, 24, 32, 7.5);
  // loading hall shell: west + south walls with doors, roof slats with skylight gaps, crane rail
  solid(20, -43, 21, -41, 0, 10, HALL); solid(20, -37, 21, -23, 0, 10, HALL); solid(20, -19, 21, -11, 0, 10, HALL); solid(20, -41, 21, -37, 3.5, 10, HALL); solid(20, -23, 21, -19, 3.5, 10, HALL);
  solid(20, -11, 32, -10, 0, 10, HALL); solid(40, -11, 49, -10, 0, 10, HALL); solid(32, -11, 40, -10, 5, 10, HALL); shutter(32, 40, -10.5, 0, 5, .45);
  for (let z = -43; z < -10; z += 7) solid(20, z, 49, Math.min(-10, z + 4), 10, 10.5, { ...HALL, shadow: false }); for (let z = -39; z < -10; z += 7) { sk.bx(20, 10.3, z, 49, 10.35, Math.min(-10, z + 3), { tint: GLASS, tone: 0 }); }
  corrugate(20, -43, 21, -11, .3, 9.6); corrugate(20, -11, 49, -10, .3, 9.6); for (const x of [26, 33, 40, 46]) { sk.bx(x - .2, 0, -10.6, x + .2, 10, -10.35, { tone: .66 }); sk.bx(x - .2, 9, -43, x + .2, 9.6, -11, { tone: .66 }); }
  for (const z of [-40, -30, -20]) sk.bx(21, 7.8, z - .2, 49, 8.1, z + .2, { tone: .66 }); sk.bx(24, 7.6, -31, 25, 7.8, -29, { tint: AMBER, tone: 0 }); sk.line([24.5, 7.6, -30, 24.5, 5.4, -30]); sk.box(.5, .3, .3, 24.5, 5.3, -30, { tone: .66 });
  for (const [x, z] of [[27, -36], [35, -26], [42, -18], [30, -16]]) { sk.box(2.2, .12, .3, x, 8.8, z, { tint: GLASS, tone: 0 }); sk.line([x - 1, 8.86, z, x - 1, 9.6, z, x + 1, 8.86, z, x + 1, 9.6, z]); }
  sign('装运大厅 · 02', 36, 6.6, -9.93, 0, 8, 1.3, { bg: '#f5f2ea', border: 5 }); sign('A · 东装运台', 35, 6.2, -42.93, 0, 8, 1.4, SG);
  // hall interior: raised dock with hazard edge, stacked containers, hanging load, pallet cover
  solid(44, -43, 49, -16, 0, 1.25, { tint: PAPER, tone: .33 }); ramp(44, -16, 49, -11, '-z', 0, 1.25); hazard(44, -16.1, 49, -16, 1.25); for (let z = -42; z < -16; z += 1.2) sk.bx(43.9, .9, z, 44, 1.2, z + .6, { tint: AMBER, tone: 0 });
  container(22, -42, 28, -39); container(22, -42, 28, -39, 2.75, PAPER); container(34, -31, 37, -25, 0, GLASS); container(24, -18, 30, -15, 0, PAPER); container(45, -42, 48, -36, 1.25, WOOD);
  solid(38, -35, 44, -32, 5.5, 8.25, { tint: WOOD, shadow: false }); sk.line([38.5, 8.25, -33.5, 39, 9, -33.5, 43.5, 8.25, -33.5, 43, 9, -33.5, 41, 9, -33.5, 41, 7.8, -30]); corrugate(38, -35, 44, -32, 5.6, 8.1);
  pallets(28, -31, 30, -29); pallets(28, -30, 29, -29, 1, 1.25); pallets(40, -24, 42, -22, 1.5); pallets(24, -26, 26, -24); crateB(30, -38, 32, -36, 0, 1.5); forklift(41, -38, 1); barrel(25.5, -34.5); barrel(25.5, -33.5, AMBER); barrel(47.5, -13.5);
  sign('A', 33, .03, -33, 0, 5, 5, { w: 256, h: 256, color: '#e9a520', flat: true, stencil: 40 }); sign('A', 36, 3.2, -24.97, 0, 2.2, 2.2, { w: 256, h: 256, color: '#e9a520', stencil: 40 });
  // A main yard: truck bay, container lanes, jersey barriers
  truck(30, 18, 1, PAPER); container(38, 4, 44, 7); container(38, 4, 44, 7, 2.75, GLASS); container(44, 16, 47, 22, 0, PAPER); container(26, -2, 29, 4); pallets(34, 26, 36, 28); crateB(46, 28, 48, 30, 0, 2); crateB(25, 28, 27, 30, 0, 1.25);
  for (const [x1, z1, x2, z2] of [[33, -4, 37, -3], [40, 12, 42, 13]]) { solid(x1, z1, x2, z2, 0, 1, { tint: PAPER, tone: .33 }); hazard(x1, z1 - .01, x2, z1, 1); }
  sign('A 主道 ↑', 24.07, 3.4, 20, Math.PI / 2, 3.6, .9, SG); lamp(48.4, 10, -1, 0); lamp(24.6, -6, 1, 0);
  // packing room and side corridor (roofed), with shutters marking their mouths
  solid(6, 4, 24, 10, 4, 4.5, { tint: PAPER, shadow: false }); solid(6, -24, 20, -18, 4, 4.5, { tint: PAPER, shadow: false }); beams(6, 4, 24, 10, 4, true, 4); beams(6, -24, 20, -18, 4, true, 4);
  for (const x of [10, 18]) hang(x, 3.6, 7); hang(13, 3.6, -21); pallets(12, 4, 14, 6); crateB(18, 8, 20, 10, 0, 1.25); barrel(8.5, -19.5); crateB(15, -24, 17, -23, 0, 1);
  sign('装箱间', 6.07, 3.1, 7, Math.PI / 2, 2.6, .8, SG); sign('A 侧廊 →', 6.07, 3.1, -21, Math.PI / 2, 3, .8, SG);
  // mid: Z-screen container splits the lane; gate to CT with a half-dropped shutter and a CT screen behind it
  container(-3, 12, 3, 15, 0, PAPER); pallets(-6, -6, -4, -3); crateB(3, -2, 5, 0, 0, 1.5); forklift(3, -16, 0); barrel(-5.5, 24.5); barrel(-4.5, 24.5, AMBER); pallets(2, 24, 4, 26, 1);
  solid(-6, -32, -2, -28, 0, 7, HALL); solid(2, -32, 6, -28, 0, 7, HALL); solid(-2, -32, 2, -28, 3, 7, HALL); shutter(-2, 2, -28.5, 0, 3, .75); crateB(-3, -35, 0, -33, 0, 2); crateB(0, -35, 3, -33, 0, 2);
  sign('中路闸门', 0, 4.6, -27.93, 0, 3.6, .9, SG); lamp(-5.6, 0, 1, 0); lamp(5.6, 18, -1, 0);
  // B container yard: gantry crane frame, stacked boxes in a U around the plant zone
  for (const [x, z] of [[-47, -41], [-47, -16], [-23, -41], [-23, -16]]) solid(x, z, x + 1, z + 1, 0, 9, { tint: AMBER, tone: .33 });
  for (const x of [-46.5, -22.5]) sk.bx(x - .4, 9, -41, x + .4, 9.6, -15, { tint: AMBER, tone: .33 }); sk.bx(-47, 9.6, -29.4, -22, 10.2, -28.6, { tint: AMBER, tone: .33 }); sk.box(2, 1.2, 1.6, -35, 9.4, -29, { tone: .66 }); sk.line([-35, 8.8, -29, -35, 5, -29]); sk.cone(.25, .5, 5, -35, 4.8, -29, { r: [Math.PI, 0, 0], tone: .66 });
  container(-49, -43, -43, -40); container(-49, -43, -43, -40, 2.75, GLASS); container(-43, -43, -37, -40, 0, PAPER); container(-28, -40, -25, -34, 0, WOOD); container(-28, -40, -25, -34, 2.75, PAPER);
  container(-40, -32, -34, -29, 0, GLASS); container(-49, -28, -46, -22, 0, PAPER); pallets(-32, -24, -30, -22); crateB(-44, -22, -42, -20, 0, 1.5); crateB(-44, -21, -43, -20, 1.5, 1); forklift(-26, -26, 1);
  barrel(-20.5, -41.5); barrel(-21.5, -41.5, AMBER); sign('B · 西封签区', -34, 6, -42.93, 0, 8, 1.4, SG); sign('B', -36, .03, -36, 0, 5, 5, { w: 256, h: 256, color: '#e9a520', flat: true, stencil: 40 });
  // B lane: containers pinch the approach, jersey barriers at the mouth
  container(-49, 8, -46, 14); container(-39, -4, -36, 2, 0, PAPER); container(-49, 22, -46, 28, 0, GLASS); container(-49, 22, -46, 28, 2.75, WOOD);
  for (const [x1, z1, x2, z2] of [[-46, -10, -42, -9], [-40, 16, -36, 17]]) { solid(x1, z1, x2, z2, 0, 1, { tint: PAPER, tone: .33 }); hazard(x1, z1 - .01, x2, z1, 1); }
  sign('← B 主道', -35.93, 3.4, 26, -Math.PI / 2, 3.6, .9, SG); lamp(-48.4, 0, 1, 0); lamp(-36.6, 20, -1, 0); sign('B 连廊', -6.07, 3.1, -23, -Math.PI / 2, 2.6, .8, SG);
  // CT yard and T yard
  truck(-12, -38, 1, PAPER); container(8, -43, 14, -40, 0, WOOD); crateB(-18, -43, -16, -41, 0, 2); sandbags(4, -36, 8, -35); crateB(14, -36, 16, -34, 0, 1.25);
  container(-30, 34, -24, 37, 0, WOOD); container(24, 34, 30, 37, 0, GLASS); container(38, 38, 44, 41); container(38, 38, 44, 41, 2.75, PAPER); container(-44, 37, -38, 40, 0, PAPER); truck(0, 41, 0, WOOD); pallets(-12, 34, -10, 36); pallets(16, 40, 18, 42, 1.5);
  sign('折页货场 · STACK DEPOT', 0, 6, 42.93, Math.PI, 16, 1.6, { bg: '#f5f2ea', border: 5 }); sign('A →', 20, 3.4, 32.07, 0, 3, .9, SG); sign('← B', -18, 3.4, 32.07, 0, 3, .9, SG);
  const a = []; for (let i = 0; i < 260; i++) { const x = rr(-49, 49), z = rr(-43, 43); if (K.inSolid(x, .2, z)) continue; const an = rr(0, 6.28), l = rr(.1, .5); a.push(x, .015, z, x + Math.cos(an) * l, .015, z + Math.sin(an) * l); } sk.line(a);
}

/* ---------------- collision ---------------- */
function buildBuckets() {
  const B = MAP.buckets = []; for (let i = 0; i < MAP.BW * MAP.BH; i++) B.push([]);
  let rid = 0; for (const s of MAP.solids) { s.rayId = rid++; s.rayStamp = 0; const i1 = clamp(Math.floor((s.x1 - 1.5 + 72) / 8), 0, MAP.BW - 1), i2 = clamp(Math.floor((s.x2 + 1.5 + 72) / 8), 0, MAP.BW - 1), j1 = clamp(Math.floor((s.z1 - 1.5 + 64) / 8), 0, MAP.BH - 1), j2 = clamp(Math.floor((s.z2 + 1.5 + 64) / 8), 0, MAP.BH - 1);
    for (let i = i1; i <= i2; i++) for (let j = j1; j <= j2; j++) B[j * MAP.BW + i].push(s); }
}
MAP.near = (x, z) => MAP.buckets[clamp(Math.floor((z + 64) / 8), 0, MAP.BH - 1) * MAP.BW + clamp(Math.floor((x + 72) / 8), 0, MAP.BW - 1)];
function entOverlap(e, x, y, z, list) { const w = e.hw; for (let i = 0; i < list.length; i++) { const s = list[i]; if (x + w > s.x1 && x - w < s.x2 && z + w > s.z1 && z - w < s.z2 && y + e.hgt > s.y1 && y < s.y2) return s; } return null; }
function supportY(e, list) { const p = e.pos, w = e.hw; let y = 0; for (let i = 0; i < list.length; i++) { const s = list[i]; if (p.x + w > s.x1 && p.x - w < s.x2 && p.z + w > s.z1 && p.z - w < s.z2 && s.y2 <= p.y + .02 && s.y2 > y) y = s.y2; } return y; }
const GRAV = 17;
function moveEntity(e, dt) {
  const p = e.pos, v = e.vel, near = MAP.near(p.x, p.z); e.hitWall = false; e.landed = 0;
  for (const ax of ['x', 'z']) {
    const d = v[ax] * dt; if (!d) continue; const old = p[ax]; p[ax] += d;
    for (let k = 0; k < 3; k++) {
      const s = entOverlap(e, p.x, p.y, p.z, near); if (!s) break;
      const up = s.y2 - p.y;
      if (e.onGround && up > 0 && up <= .56 && !entOverlap(e, p.x, s.y2 + .001, p.z, near)) { e.stepSmooth -= up; p.y = s.y2 + .001; break; }
      p[ax] = d > 0 ? s[ax + '1'] - e.hw - .001 : s[ax + '2'] + e.hw + .001; v[ax] = 0; e.hitWall = true;
      if (k === 2 && entOverlap(e, p.x, p.y, p.z, near)) p[ax] = old;
    }
  }
  p.x = clamp(p.x, -63, 63); p.z = clamp(p.z, -55, 55);
  const sup = supportY(e, near);
  if (e.onGround && v.y <= 0 && p.y - sup <= .31) { e.stepSmooth += p.y - sup; p.y = sup; v.y = 0; }
  else {
    v.y -= GRAV * dt; const ny = p.y + v.y * dt;
    if (v.y <= 0 && ny <= sup) { e.landed = -v.y; p.y = sup; v.y = 0; e.onGround = true; }
    else { p.y = ny; e.onGround = false; if (v.y > 0) { const s = entOverlap(e, p.x, p.y, p.z, near); if (s) { p.y = s.y1 - e.hgt - .001; v.y = 0; } } }
  }
}
/* ray vs world. returns hit record (shared) or null */
const _hit = { t: 0, tx: 0, nx: 0, ny: 0, nz: 0, s: null };
function rayWorldLinear(ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT, bs = null, bn = 0, btx = 0; const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz, S = MAP.solids;
  for (let i = 0; i < S.length; i++) { const s = S[i];
    let t1 = (s.x1 - ox) * ix, t2 = (s.x2 - ox) * ix, tn, tf, ax = 0; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } tn = t1; tf = t2;
    t1 = (s.y1 - oy) * iy; t2 = (s.y2 - oy) * iy; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 1; } if (t2 < tf) tf = t2; if (tn > tf) continue;
    t1 = (s.z1 - oz) * iz; t2 = (s.z2 - oz) * iz; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 2; } if (t2 < tf) tf = t2;
    if (tn > tf || tn < 0 || tn >= best) continue; best = tn; bs = s; bn = ax; btx = tf; }
  if (dy < 0) { const t = -oy / dy; if (t < best) { _hit.t = t; _hit.tx = t + 99; _hit.nx = 0; _hit.ny = 1; _hit.nz = 0; _hit.s = null; return _hit; } }
  if (!bs) return null;
  _hit.t = best; _hit.tx = btx; _hit.s = bs; _hit.nx = bn === 0 ? -Math.sign(dx) : 0; _hit.ny = bn === 1 ? -Math.sign(dy) : 0; _hit.nz = bn === 2 ? -Math.sign(dz) : 0; return _hit;
}
let _raySeq = 0;
function rayWorld(ox, oy, oz, dx, dy, dz, maxT) {
  // Preserve legacy slab behavior for exactly parallel rays, including face-boundary ties.
  if (!dx || !dy || !dz) return rayWorldLinear(ox, oy, oz, dx, dy, dz, maxT);
  let best = maxT, bs = null, bn = 0, btx = 0, bid = Infinity, lo = 0, hi = maxT; const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz, stamp = ++_raySeq;
  let a = (-72 - ox) * ix, b = (72 - ox) * ix; if (a > b) { const q = a; a = b; b = q; } lo = Math.max(lo, a); hi = Math.min(hi, b);
  a = (-64 - oz) * iz; b = (64 - oz) * iz; if (a > b) { const q = a; a = b; b = q; } lo = Math.max(lo, a); hi = Math.min(hi, b);
  if (lo <= hi) {
    let ci = clamp(Math.floor((ox + dx * lo + 72) / 8), 0, MAP.BW - 1), cj = clamp(Math.floor((oz + dz * lo + 64) / 8), 0, MAP.BH - 1), t = lo;
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1, txd = Math.abs(8 * ix), tzd = Math.abs(8 * iz); let tx = (-72 + (ci + (sx > 0 ? 1 : 0)) * 8 - ox) * ix, tz = (-64 + (cj + (sz > 0 ? 1 : 0)) * 8 - oz) * iz;
    while (ci >= 0 && cj >= 0 && ci < MAP.BW && cj < MAP.BH && t <= hi && t <= best) {
      const near = MAP.buckets[cj * MAP.BW + ci];
      for (let i = 0; i < near.length; i++) { const s = near[i]; if (s.rayStamp === stamp) continue; s.rayStamp = stamp;
        let t1 = (s.x1 - ox) * ix, t2 = (s.x2 - ox) * ix, tn, tf, ax = 0; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } tn = t1; tf = t2;
        t1 = (s.y1 - oy) * iy; t2 = (s.y2 - oy) * iy; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 1; } if (t2 < tf) tf = t2; if (tn > tf) continue;
        t1 = (s.z1 - oz) * iz; t2 = (s.z2 - oz) * iz; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } if (t1 > tn) { tn = t1; ax = 2; } if (t2 < tf) tf = t2;
        if (tn > tf || tn < 0 || tn > best || (tn === best && (!bs || s.rayId >= bid))) continue; best = tn; bs = s; bn = ax; btx = tf; bid = s.rayId;
      }
      if (tx < tz) { t = tx; tx += txd; ci += sx; } else if (tz < tx) { t = tz; tz += tzd; cj += sz; } else { t = tx; tx += txd; tz += tzd; ci += sx; cj += sz; }
    }
  }
  if (dy < 0) { const t = -oy / dy; if (t < best) { _hit.t = t; _hit.tx = t + 99; _hit.nx = 0; _hit.ny = 1; _hit.nz = 0; _hit.s = null; return _hit; } }
  if (!bs) return null; _hit.t = best; _hit.tx = btx; _hit.s = bs; _hit.nx = bn === 0 ? -Math.sign(dx) : 0; _hit.ny = bn === 1 ? -Math.sign(dy) : 0; _hit.nz = bn === 2 ? -Math.sign(dz) : 0; return _hit;
}
function segClear(ax, ay, az, bx, by, bz) { const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz); if (d < .01) return true; return !rayWorld(ax, ay, az, dx / d || 1e-9, dy / d || 1e-9, dz / d || 1e-9, d - .05); }

/* ---------------- navigation grid + A* ---------------- */
function buildNav() {
  const W = MAP.W, H = MAP.H, fh = MAP.fh = new Float32Array(W * H), ok = MAP.ok = new Uint8Array(W * H), S = MAP.solids;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = MAP.ox + i + .5, z = MAP.oz + j + .5; let h = 0;
    for (const s of S) if (x >= s.x1 && x <= s.x2 && z >= s.z1 && z <= s.z2 && s.y2 <= 3.2 && s.y2 > h) h = s.y2;
    const b = MAP.bounds; let blocked = x < b.x1 || x > b.x2 || z < b.z1 || z > b.z2;
    if (!blocked) for (const s of S) if (x + .42 > s.x1 && x - .42 < s.x2 && z + .42 > s.z1 && z - .42 < s.z2 && h + 1.75 > s.y1 && h + .6 < s.y2) { blocked = true; break; }
    fh[j * W + i] = h; ok[j * W + i] = blocked ? 0 : 1; }
  // reachability flood from red spawn
  const reach = MAP.reach = new Uint8Array(W * H), r = MAP.spawn.red, st = [navIdx((r.x1+r.x2)/2, (r.z1+r.z2)/2)]; reach[st[0]] = 1;
  while (st.length) { const c = st.pop(), ci = c % W, cj = (c / W) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const n = nj * W + ni; if (!ok[n] || reach[n] || Math.abs(fh[n] - fh[c]) > .56) continue; reach[n] = 1; st.push(n); } }
  const pen = MAP.pen = new Float32Array(W * H);
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) { let c = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (!reach[(j + b) * W + i + a]) c++; pen[j * W + i] = c * .45; }
}
function navIdx(x, z) { return clamp(Math.floor(z - MAP.oz), 0, MAP.H - 1) * MAP.W + clamp(Math.floor(x - MAP.ox), 0, MAP.W - 1); }
MAP.floorAt = (x, z) => MAP.fh[navIdx(x, z)];
function navSnap(x, z) { const W = MAP.W; let c = navIdx(x, z); if (MAP.reach[c]) return c; const ci = c % W, cj = (c / W) | 0;
  for (let r = 1; r < 14; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue; const i = ci + a, j = cj + b; if (i < 0 || j < 0 || i >= W || j >= MAP.H) continue; if (MAP.reach[j * W + i]) return j * W + i; } return c; }
const navPos = c => ({ x: MAP.ox + (c % MAP.W) + .5, z: MAP.oz + ((c / MAP.W) | 0) + .5, y: MAP.fh[c] });
function navLine(x0, z0, x1, z1) { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / .4); let ph = MAP.fh[navIdx(x0, z0)];
  for (let i = 1; i <= n; i++) { const c = navIdx(lerp(x0, x1, i / n), lerp(z0, z1, i / n)); if (!MAP.reach[c] || MAP.pen[c] > 1.3 || Math.abs(MAP.fh[c] - ph) > .56) return false; ph = MAP.fh[c]; } return true; }
const _nav = { g: null, from: null, stamp: null, closed: null, n: 0 };
function navPath(x0, z0, x1, z1) {
  const W = MAP.W, H = MAP.H, N = W * H; if (!_nav.g) { _nav.g = new Float32Array(N); _nav.from = new Int32Array(N); _nav.stamp = new Uint32Array(N); _nav.closed = new Uint32Array(N); }
  const g = _nav.g, from = _nav.from, stamp = _nav.stamp, closed = _nav.closed, id = ++_nav.n, s = navSnap(x0, z0), t = navSnap(x1, z1), ti = t % W, tj = (t / W) | 0;
  const heap = [], hk = []; const push = (c, f) => { let i = heap.length; heap.push(c); hk.push(f); while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= f) break; heap[i] = heap[p]; hk[i] = hk[p]; heap[p] = c; hk[p] = f; i = p; } };
  const pop = () => { const top = heap[0], lc = heap.pop(), lf = hk.pop(); if (heap.length) { let i = 0; heap[0] = lc; hk[0] = lf; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && hk[l] < hk[m]) m = l; if (r < heap.length && hk[r] < hk[m]) m = r; if (m === i) break; const c = heap[i], f = hk[i]; heap[i] = heap[m]; hk[i] = hk[m]; heap[m] = c; hk[m] = f; i = m; } } return top; };
  g[s] = 0; stamp[s] = id; from[s] = -1; push(s, 0); let found = false, iter = 0;
  while (heap.length && iter < 20000) { const c = pop(); if (closed[c] === id) continue; closed[c] = id; iter++; if (c === t) { found = true; break; } const ci = c % W, cj = (c / W) | 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const ni = ci + a, nj = cj + b; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const n = nj * W + ni;
      if (!MAP.reach[n] || closed[n] === id || Math.abs(MAP.fh[n] - MAP.fh[c]) > .56) continue; if (a && b && (!MAP.reach[cj * W + ni] || !MAP.reach[nj * W + ci] || MAP.fh[cj * W + ni] !== MAP.fh[c] || MAP.fh[nj * W + ci] !== MAP.fh[c])) continue;
      const ng = g[c] + (a && b ? 1.414 : 1) + MAP.pen[n]; if (stamp[n] === id && g[n] <= ng) continue; g[n] = ng; stamp[n] = id; from[n] = c; push(n, ng + Math.hypot(ni - ti, nj - tj)); } }
  if (!found) return null; const out = []; for (let c = t; c !== -1; c = from[c]) out.push(navPos(c)); out.reverse();
  // string-pull
  const sm = [out[0]]; let i = 0; while (i < out.length - 1) { let j = Math.min(out.length - 1, i + 10); while (j > i + 1 && !navLine(out[i].x, out[i].z, out[j].x, out[j].z)) j--; sm.push(out[j]); i = j; } return sm;
}
function navRandomIn(r) { for (let k = 0; k < 60; k++) { const x = rand(r.x1, r.x2), z = rand(r.z1, r.z2), c = navIdx(x, z); if (MAP.reach[c] && MAP.pen[c] < .5) return navPos(c); } return navPos(navSnap((r.x1 + r.x2) / 2, (r.z1 + r.z2) / 2)); }
MAP.zoneAt = (x, z) => { for (const q of MAP.zones) if (x >= q[0] && x <= q[2] && z >= q[1] && z <= q[3]) return q[4]; return ''; };

/* ---------------- minimap base ---------------- */
function drawMini() {
  const k = 4, c = MAP.mini = document.createElement('canvas'); c.width = 128 * k; c.height = 112 * k; const g = c.getContext('2d');
  g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, c.width, c.height); g.lineWidth = 1;
  const S = MAP.solids.slice().sort((a, b) => a.y2 - b.y2);
  // Raised floors (courts, catwalks, stair treads) are drawn as ground with a light rim, not as obstacles.
  const walkTop = s => { if (s.y2 > 3.2) return false; let n = 0, ok = 0; for (let z = Math.floor(s.z1) + .5; z < s.z2; z++) for (let x = Math.floor(s.x1) + .5; x < s.x2; x++) { n++; const c = navIdx(x, z); if (MAP.reach[c] && Math.abs(MAP.fh[c] - s.y2) < .05) ok++; } return n && ok / n > .3; };
  for (const s of S) { if (s.y2 < .7 || s.y1 > 2.5) continue; const x = (s.x1 + 64) * k, y = (s.z1 + 56) * k, w = (s.x2 - s.x1) * k, h = (s.z2 - s.z1) * k;
    if (walkTop(s)) { g.fillStyle = '#ede7d8'; g.fillRect(x, y, w, h); g.strokeStyle = '#b9b3a4'; g.strokeRect(x + .5, y + .5, w, h); continue; }
    g.fillStyle = s.y2 > 3.3 ? '#cfcabd' : '#e6e2d6'; g.fillRect(x, y, w, h); g.strokeStyle = '#16161c'; g.strokeRect(x + .5, y + .5, w, h); }
  g.fillStyle = '#e9a520'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; for (const n of ['A','B']) { const q=MAP.sites[n]; g.fillText(n, ((q.x1+q.x2)/2+64)*k, ((q.z1+q.z2)/2+56)*k+13); }
}

'use strict';
/* ============ INK STRIKE · core: palette, math, ink materials, sketch builder, audio ============ */
const PAPER = 0xf5f2ea, INK = 0x16161c, RED = 0xd42a2a, AMBER = 0xe9a520, BLUE = 0x2d6cb3,
      GLASS = 0xdbe8ee, WOOD = 0xead9b6, GREY = 0x9a978f;
const V3 = THREE.Vector3;
const SUN = new V3(-0.55, -1, -0.35).normalize();          // direction the light travels
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
const angDiff = (a, b) => { let d = (a - b) % 6.283185; if (d > Math.PI) d -= 6.283185; if (d < -Math.PI) d += 6.283185; return d; };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- materials ---------------- */
const LINE_MATS = [];
function lineMat(o = {}) {
  const m = new LineMaterial({ color: o.color ?? INK, linewidth: o.width ?? 1.5, worldUnits: false });
  m.fog = o.fog !== false;
  if (o.depthTest === false) m.depthTest = false;
  if (o.opacity !== undefined) { m.transparent = true; m.opacity = o.opacity; }
  m.resolution.set(innerWidth, innerHeight);
  LINE_MATS.push(m);
  return m;
}
const FOG_D = 0.0105;
function fillMat(o = {}) {
  const obj = !!o.objSpace;
  return new THREE.ShaderMaterial({
    uniforms: {
      uPaper: { value: new THREE.Color(PAPER) }, uInk: { value: new THREE.Color(INK) },
      uFreq: { value: o.freq ?? 4.0 }, uHatch: { value: o.hatch ?? 0.5 }, uHw: { value: o.hw ?? 0.1 }, uFog: { value: o.fog ?? FOG_D }, uFlash: { value: 0 }, uFlashC: { value: new THREE.Color(RED) }
    },
    vertexShader: `
      attribute float tone; attribute vec3 tint;
      varying float vTone; varying vec3 vTint; varying vec3 vP; varying float vDist;
      void main(){ vTone=tone; vTint=tint; vec4 wp=modelMatrix*vec4(position,1.0);
        vP=${obj ? 'position' : 'wp.xyz'}; vec4 mv=viewMatrix*wp; vDist=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `
      uniform vec3 uPaper,uInk,uFlashC; uniform float uFreq,uFog,uFlash,uHatch,uHw;
      varying float vTone; varying vec3 vTint; varying vec3 vP; varying float vDist;
      float hl(float v,float hw){ float w=fwidth(v)*2.0; float d=abs(fract(v)-0.5)*2.0;
        float a=1.0-smoothstep(hw-w,hw+w,d); return mix(a,hw,clamp(w*3.2-0.15,0.0,1.0)); }
      void main(){ float a=0.0;
        if(vTone>0.9) a=1.0;
        else if(vTone>0.15){ a=hl(dot(vP,vec3(0.577))*uFreq,uHw);
          if(vTone>0.5) a=max(a,hl(dot(vP,vec3(0.62,-0.62,0.2))*uFreq,uHw)); a*=uHatch; }
        float wash=vTone<0.0?clamp(-vTone,0.0,0.5):(vTone>0.15&&vTone<0.9?min(vTone*0.19,0.13):0.0); vec3 base=mix(vTint,uInk,wash); vec3 c=mix(base,uInk,a);
        float f=1.0-exp(-vDist*vDist*uFog*uFog); c=mix(c,uPaper,clamp(f,0.0,1.0));
        c=mix(c,uFlashC,uFlash); gl_FragColor=vec4(c,1.0); }`,
    side: THREE.DoubleSide, polygonOffset: true,
    polygonOffsetFactor: o.offset ?? 1, polygonOffsetUnits: o.offset ?? 1
  });
}

/* ---------------- Sketch builder: accumulates filled geometry + ink edges, bakes to 2 draw calls ---------------- */
const _tintCache = {};
const tintOf = hex => _tintCache[hex] || (_tintCache[hex] = new THREE.Color(hex));
class Sk {
  constructor(auto = 'sun') { this.P = []; this.T = []; this.C = []; this.L = []; this.auto = auto; }
  _tone(nx, ny, nz) {
    if (this.auto === 'none') return 0;
    if (ny < -0.5) return 0.33;
    if (this.auto === 'under' || ny > 0.5) return 0;
    return (nx * SUN.x + nz * SUN.z) > 0.2 ? 0.33 : 0;
  }
  _m(x, y, z, r, pm) {
    const m = new THREE.Matrix4();
    if (r) m.makeRotationFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ'));
    m.setPosition(x, y, z);
    return pm ? pm.clone().multiply(m) : m;
  }
  add(g, M, o = {}) {
    if (M) g.applyMatrix4(M);
    if (o.fill !== false) {
      const ng = g.index ? g.toNonIndexed() : g, p = ng.attributes.position.array, n = ng.attributes.normal.array;
      const c = tintOf(o.tint ?? PAPER), tone = o.tone ?? -1;
      for (let i = 0; i < p.length; i += 3) {
        this.P.push(p[i], p[i + 1], p[i + 2]);
        this.T.push(tone < 0 ? this._tone(n[i], n[i + 1], n[i + 2]) : tone);
        this.C.push(c.r, c.g, c.b);
      }
    }
    if (o.edges !== false) {
      const e = new THREE.EdgesGeometry(g, o.ea ?? 25).attributes.position.array;
      for (let i = 0; i < e.length; i++) this.L.push(e[i]);
    }
    return this;
  }
  box(w, h, d, x, y, z, o = {}) { return this.add(new THREE.BoxGeometry(w, h, d), this._m(x, y, z, o.r, o.m), o); }
  bx(x1, y1, z1, x2, y2, z2, o = {}) { return this.box(x2 - x1, y2 - y1, z2 - z1, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, o); }
  cyl(r1, r2, len, seg, x, y, z, o = {}) {
    const g = new THREE.CylinderGeometry(r1, r2, len, seg, 1, !!o.open);
    if (o.ax === 'z') g.rotateX(Math.PI / 2); else if (o.ax === 'x') g.rotateZ(Math.PI / 2);
    return this.add(g, this._m(x, y, z, o.r, o.m), o);
  }
  cone(r, len, seg, x, y, z, o = {}) { return this.add(new THREE.ConeGeometry(r, len, seg), this._m(x, y, z, o.r, o.m), o); }
  sph(r, x, y, z, o = {}) { return this.add(new THREE.SphereGeometry(r, o.ws ?? 8, o.hs ?? 5), this._m(x, y, z, o.r, o.m), o); }
  /* side profile [forward, up] extruded across X (gun convention: forward = -Z) */
  prof(pts, thick, o = {}) {
    const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
    const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
    const m = new THREE.Matrix4().makeBasis(new V3(0, 0, -1), new V3(0, 1, 0), new V3(1, 0, 0)).setPosition((o.x || 0) - thick / 2, 0, 0);
    return this.add(g, o.m ? o.m.clone().multiply(m) : m, o);
  }
  limb(a, b, w, d, o = {}) {
    const A = new V3(...a), B = new V3(...b), dir = B.clone().sub(A), len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir.normalize());
    const m = new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), q, new V3(1, 1, 1));
    return this.add(new THREE.BoxGeometry(w, len, d), o.m ? o.m.clone().multiply(m) : m, o);
  }
  line(arr, M) {
    if (M) { const v = new V3(); for (let i = 0; i < arr.length; i += 3) { v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(M); this.L.push(v.x, v.y, v.z); } }
    else for (let i = 0; i < arr.length; i++) this.L.push(arr[i]);
    return this;
  }
  poly(pts, closed, M) {
    const a = []; const n = pts.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) { const p = pts[i], q = pts[(i + 1) % n]; a.push(p[0], p[1], p[2], q[0], q[1], q[2]); }
    return this.line(a, M);
  }
  tri(a, b, c, tone = 0, tint = PAPER, M) {
    const col = tintOf(tint), v = new V3();
    for (const p of [a, b, c]) { v.set(p[0], p[1], p[2]); if (M) v.applyMatrix4(M); this.P.push(v.x, v.y, v.z); this.T.push(tone); this.C.push(col.r, col.g, col.b); }
    return this;
  }
  quad(a, b, c, d, tone, tint, M) { this.tri(a, b, c, tone, tint, M); return this.tri(a, c, d, tone, tint, M); }
  bake(fm, lm) {
    const grp = new THREE.Group();
    if (this.P.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
      g.setAttribute('tone', new THREE.Float32BufferAttribute(this.T, 1));
      g.setAttribute('tint', new THREE.Float32BufferAttribute(this.C, 3));
      g.computeBoundingSphere();
      grp.add(grp.fill = new THREE.Mesh(g, fm));
    }
    if (this.L.length) {
      const lg = new LineSegmentsGeometry(); lg.setPositions(this.L);
      grp.add(grp.ink = new LineSegments2(lg, lm));
    }
    return grp;
  }
}

/* ---------------- procedural textures ---------------- */
function splatTex(seed) {
  const R = rng(seed), c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.translate(64, 64);
  const n = 26, base = 17 + R() * 6; g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * 6.2832, spike = R() < 0.3 ? 1.5 + R() * 1.3 : 0.8 + R() * 0.35, r = base * spike;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (!i) g.moveTo(x, y); else { const am = a - 3.1416 / n, rm = base * 0.72; g.quadraticCurveTo(Math.cos(am) * rm, Math.sin(am) * rm, x, y); }
  }
  g.fill();
  for (let i = 0; i < 12; i++) { const a = R() * 6.2832, r = base * (1.5 + R() * 1.7); g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 0.8 + R() * 2.6, 0, 6.2832); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function textTex(text, o = {}) {
  const w = o.w || 512, h = o.h || 128, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
  if (o.border) { g.strokeStyle = o.color || '#16161c'; g.lineWidth = o.border; g.strokeRect(o.border, o.border, w - 2 * o.border, h - 2 * o.border); }
  g.fillStyle = o.color || '#16161c'; g.font = o.font || `bold ${h * 0.62}px "Arial Black", Impact, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + h * 0.04);
  if (o.stencil) { g.globalCompositeOperation = 'destination-out'; for (let x = 0; x < w; x += o.stencil) g.fillRect(x, 0, 3, h); }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}

/* ---------------- synthesized audio ---------------- */
const SFX = {
  ctx: null, vol: 0.7, L: { x: 0, z: 0, yaw: 0 },
  init() {
    if (this.ctx) return;
    const C = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = C.createGain(); this.master.gain.value = this.vol;
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    this.master.connect(comp); comp.connect(C.destination);
    const ir = C.createBuffer(2, C.sampleRate * 1.9, C.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const a = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < a.length; i++) { const t = i / C.sampleRate, k = Math.min(.92, .25 + t * .55); lp = lp * k + (Math.random() * 2 - 1) * (1 - k); a[i] = lp * Math.exp(-t * 3.0) * 2.4; }
      for (const [ms, amp] of [[47, .8], [83, .6], [131, .5], [197, .35], [283, .25]]) { const i0 = ((ms + ch * 7) / 1000 * C.sampleRate) | 0; for (let j = 0; j < 90; j++) a[i0 + j] += (Math.random() * 2 - 1) * amp * (1 - j / 90); } }
    this.verb = C.createConvolver(); this.verb.buffer = ir; const vg = C.createGain(); vg.gain.value = .55; this.verb.connect(vg); vg.connect(this.master);
    const nb = this.nb = C.createBuffer(1, C.sampleRate, C.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  /* output bus: distance attenuation + air absorption (lowpass) + speed-of-sound delay + pan + reverb send */
  out(pos, vol = 1, rev = 0) {
    const C = this.ctx, g = C.createGain(); let v = vol, pan = 0, d = 0;
    if (pos) {
      const dx = pos.x - this.L.x, dz = pos.z - this.L.z; d = Math.hypot(dx, dz);
      v *= 1 / (1 + Math.pow(d / 10, 1.7));
      if (d > 0.5) pan = clamp((dx * Math.cos(this.L.yaw) - dz * Math.sin(this.L.yaw)) / d, -1, 1) * 0.75;
    }
    this.dly = Math.min(.3, d / 340); g.gain.value = v; let node = g;
    if (d > 6) { const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(650, 17000 / Math.pow(1 + d / 9, 1.25)); g.connect(lp); node = lp; }
    let last = node;
    if (C.createStereoPanner) { const p = C.createStereoPanner(); p.pan.value = pan; node.connect(p); last = p; }
    last.connect(this.master);
    if (rev > 0 && this.verb) { const s = C.createGain(); s.gain.value = rev * (1 + Math.min(1.5, d / 30)); last.connect(s); s.connect(this.verb); }
    return g;
  },
  noise(dur, f0, f1, vol, out, type = 'lowpass', q = 0.8, delay = 0) {
    const C = this.ctx, t = C.currentTime + (this.dly || 0) + delay, s = C.createBufferSource(); s.buffer = this.nb; s.loop = true; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = C.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.0015); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },
  tone(f0, f1, dur, vol, out, type = 'sine', delay = 0) {
    const C = this.ctx, t = C.currentTime + (this.dly || 0) + delay, o = C.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = C.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  },
  /* metallic action sound: two detuned high-Q resonances + tick */
  mech(freq, vol, out, delay = 0) { this.noise(.035, freq, freq * .9, vol * 2.2, out, 'bandpass', 14, delay); this.noise(.05, freq * 1.62, freq * 1.5, vol * 1.3, out, 'bandpass', 18, delay + .004); this.tone(freq * .25, freq * .18, .03, vol * .5, out, 'square', delay); },
  /* per-weapon acoustic profiles.  crack:[vol,hpHz,dur]  body:[vol,f0,f1,dur,Q]  thump:[vol,f0,f1,dur]  mech:[vol,Hz,delay]  tail:[vol,Hz,dur]  drive, rev, gain */
  SHOT: {
    pistol:  { crack: [.9, 4200, .018], body: [1.0, 2600, 500, .09, .9],  thump: [.7, 210, 70, .07],  mech: [.16, 3400, .045], tail: [.2, 1500, .32],  drive: 2.2, rev: .22, gain: 3.3 },
    deagle:  { crack: [1.0, 3000, .03], body: [1.2, 1500, 220, .2, .7],   thump: [1.1, 130, 38, .2],  mech: [.2, 2300, .07],   tail: [.34, 850, .7],   drive: 3.6, rev: .4,  gain: 3.0 },
    smg:     { crack: [.8, 5200, .012], body: [.9, 3300, 900, .06, 1.3],  thump: [.45, 250, 110, .045], mech: [.2, 4300, .028], tail: [.13, 2100, .2],  drive: 1.8, rev: .15, gain: 4.0 },
    rifle:   { crack: [1.0, 3600, .022], body: [1.15, 1900, 300, .15, .8], thump: [.95, 155, 46, .14], mech: [.24, 2700, .05],  tail: [.3, 1000, .6],   drive: 3.0, rev: .36, gain: 3.4 },
    m4:      { crack: [.1, 2500, .01],  body: [.85, 1000, 280, .085, .6], thump: [.35, 170, 80, .06], mech: [.34, 3700, .022], tail: [.07, 650, .22],  drive: 1.0, rev: .08, gain: 4.0 },
    awp:     { crack: [1.2, 2600, .04], body: [1.4, 1250, 110, .36, .6],  thump: [1.4, 100, 26, .42], mech: [0, 0, 0],         tail: [.6, 600, 1.7],   drive: 4.2, rev: .7,  gain: 2.1 },
    shotgun: { crack: [1.0, 2700, .035], body: [1.4, 1500, 160, .25, .5], thump: [1.2, 120, 32, .26], mech: [0, 0, 0],         tail: [.42, 750, .95],  drive: 3.8, rev: .5,  gain: 2.6 }
  },
  shot(kind, pos, indoor) {
    if (!this.ctx) return; const p = this.SHOT[kind] || this.SHOT.rifle, C = this.ctx, v = .94 + Math.random() * .12;
    const o = this.out(pos, p.gain, p.rev * (indoor ? 2.1 : 1)), sh = C.createWaveShaper(); sh.curve = this.curve(p.drive); sh.connect(o);
    this.noise(p.crack[2], 9000, p.crack[1], p.crack[0], sh, 'highpass', .7);
    this.noise(p.body[3], p.body[1] * v, p.body[2], p.body[0], sh, 'bandpass', p.body[4]); this.noise(p.body[3] * .8, p.body[1] * .45 * v, 120, p.body[0] * .7, sh, 'lowpass', .7);
    this.tone(p.thump[1] * v, p.thump[2], p.thump[3], p.thump[0], sh);
    this.noise(p.tail[2], p.tail[1], 140, p.tail[0], o, 'lowpass', .5, .012);
    if (p.mech[0]) this.mech(p.mech[1] * v, p.mech[0], o, p.mech[2]);
    if (!indoor && p.rev > .2) { this.noise(.22, p.tail[1] * .8, 200, p.tail[0] * .33, o, 'lowpass', .5, .13 + Math.random() * .03); this.noise(.3, p.tail[1] * .6, 160, p.tail[0] * .2, o, 'lowpass', .5, .27 + Math.random() * .05); }
  },
  curve(k) { const key = 'c' + k; if (this[key]) return this[key]; const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return this[key] = c; },
  bolt(delay) { if (!this.ctx) return; const o = this.out(null, .42); this.mech(1700, .3, o, delay); this.mech(1250, .34, o, delay + .2); this.mech(1500, .34, o, delay + .46); this.mech(2100, .3, o, delay + .62); },
  pump(delay) { if (!this.ctx) return; const o = this.out(null, .5); this.mech(1100, .4, o, delay); this.noise(.07, 900, 400, .5, o, 'bandpass', 2, delay + .01); this.mech(1350, .42, o, delay + .17); this.noise(.06, 1200, 500, .45, o, 'bandpass', 2, delay + .18); },
  shellDrop(n = 1) { if (!this.ctx) return; const o = this.out(null, .1); for (let i = 0; i < n; i++) { const f = 3800 + Math.random() * 2600, d = .42 + Math.random() * .25 + i * .07; this.tone(f, f * .97, .09, .5, o, 'sine', d); this.tone(f * 1.51, f * 1.48, .06, .25, o, 'sine', d); this.tone(f * 1.02, f, .07, .3, o, 'sine', d + .085); } },
  reload(kind, dur) { if (!this.ctx) return; const o = this.out(null, .5), pistol = kind === 'pistol' || kind === 'deagle';
    this.mech(pistol ? 1900 : 1300, .3, o, dur * .2); this.noise(.09, 700, 250, .35, o, 'bandpass', 1.5, dur * .22);
    this.noise(.06, 500, 200, .5, o, 'lowpass', 1, dur * .6); this.mech(pistol ? 2300 : 1600, .4, o, dur * .62);
    this.mech(pistol ? 2800 : 2000, .36, o, dur * .86); this.mech(pistol ? 3300 : 2400, .42, o, dur * .93); },
  shellIn(delay) { if (!this.ctx) return; const o = this.out(null, .4); this.mech(1500, .3, o, delay); this.noise(.05, 600, 300, .4, o, 'lowpass', 1, delay + .02); },
  click(f = 1800, vol = 0.3, delay = 0) { if (!this.ctx) return; const o = this.out(null, vol); this.mech(f, .5, o, delay); },
  step(pos, vol = 0.25, mat = 'concrete') { if (!this.ctx) return; const o = this.out(pos, vol);
    if (mat === 'metal') { this.noise(.05, 1800, 700, .7, o, 'bandpass', 3); this.noise(.16, 880 + rand(60), 840, .5, o, 'bandpass', 22); this.tone(140, 80, .05, .4, o); }
    else if (mat === 'wood') { this.noise(.06, 420 + rand(120), 140, 1, o); this.tone(190, 85, .09, .9, o); this.noise(.03, 1500, 700, .25, o, 'bandpass', 2); }
    else if (mat === 'tile') { this.noise(.035, 2600 + rand(500), 1200, .8, o, 'bandpass', 2.5); this.tone(120, 70, .04, .4, o); }
    else if (mat === 'stone') { this.noise(.06, 900 + rand(200), 250, .9, o); this.tone(105, 55, .06, .5, o); }
    else { this.noise(0.07, 650 + rand(250), 160, 0.9, o); this.tone(95, 50, 0.06, 0.5, o); } },
  tick(pos) { if (!this.ctx) return; const o = this.out(pos, .3); this.mech(2600, .3, o); },
  plant() { if (!this.ctx) return; const o = this.out(null, .5); this.tone(880, 880, .09, .6, o, 'square'); this.tone(880, 880, .09, .6, o, 'square', .14); this.tone(1320, 1320, .22, .6, o, 'square', .28); },
  beep(pos, fast) { if (!this.ctx) return; const o = this.out(pos, .55); this.tone(fast ? 2300 : 1900, fast ? 2300 : 1900, .07, .7, o, 'square'); },
  hiss(pos) { if (!this.ctx) return; const o = this.out(pos, .7); this.noise(.12, 1500, 500, .9, o); this.noise(2.6, 5200, 1800, .45, o, 'bandpass', .6, .05); },
  bang(pos) { if (!this.ctx) return; const o = this.out(pos, 1.2, .6); this.noise(.04, 9000, 3000, 1.2, o, 'highpass', .7); this.noise(.22, 3000, 400, 1, o, 'bandpass', .6); this.tone(180, 50, .2, .9, o); },
  ring(dur) { if (!this.ctx) return; const o = this.out(null, .22); this.tone(3300, 3250, Math.max(.6, dur * 1.1), .8, o, 'sine'); this.tone(4700, 4650, Math.max(.4, dur * .8), .3, o, 'sine'); },
  streak(n) { if (!this.ctx) return; const o = this.out(null, .42), base = [0, 0, 523, 587, 659, 784][n] || 784; for (let i = 0; i < n; i++) this.tone(base * Math.pow(1.122, i), base * Math.pow(1.122, i), .16, .55, o, 'triangle', i * .075); this.tone(base * 2, base * 2, .4, .35, o, 'sine', n * .075); },
  land(pos) { if (!this.ctx) return; const o = this.out(pos, 0.5); this.noise(0.14, 500, 100, 1, o); this.tone(80, 35, 0.14, 0.9, o); },
  hit() { if (!this.ctx) return; const o = this.out(null, 0.4); this.noise(0.05, 2400, 900, 0.9, o, 'bandpass', 1.5); this.tone(520, 300, 0.05, 0.4, o, 'triangle'); },
  head() { if (!this.ctx) return; const o = this.out(null, 0.5); this.tone(1900, 1750, 0.22, 0.6, o, 'sine'); this.tone(2850, 2600, 0.16, 0.3, o, 'sine'); this.noise(0.04, 6000, 3000, 0.5, o, 'highpass'); },
  kill() { if (!this.ctx) return; const o = this.out(null, 0.5); this.tone(330, 330, 0.09, 0.6, o, 'triangle'); this.tone(495, 495, 0.16, 0.6, o, 'triangle', 0.08); },
  hurt() { if (!this.ctx) return; const o = this.out(null, 0.55); this.noise(0.12, 900, 200, 1, o); this.tone(140, 60, 0.15, 0.8, o, 'sawtooth'); },
  impact(pos) { if (!this.ctx) return; const o = this.out(pos, 0.25); this.noise(0.05, 3000, 600, 1, o, 'bandpass', 1); },
  flesh(pos) { if (!this.ctx) return; const o = this.out(pos, 0.4); this.noise(0.08, 700, 200, 1, o); },
  swish() { if (!this.ctx) return; const o = this.out(null, 0.35); this.noise(0.16, 900, 3800, 0.8, o, 'bandpass', 1.2); },
  boom(pos) { if (!this.ctx) return; const o = this.out(pos, 1.3, .8); this.noise(0.9, 1400, 60, 1, o); this.tone(90, 25, 0.7, 1, o); this.noise(1.6, 500, 80, 0.35, o); },
  radio(len = 1.3) { if (!this.ctx) return; const o = this.out(null, 0.32); this.noise(.07, 2600, 2100, .5, o, 'bandpass', 1.4); this.tone(1800, 1450, .03, .22, o, 'square'); this.noise(.13, 2400, 1700, .32, o, 'bandpass', 1.2, len); this.tone(1350, 1050, .04, .18, o, 'square', len); },   // team-radio squelch open / close
  // Radio chatter (adult male: 92-118 Hz glottal saw, vowel formants ~12% below neutral): wordless voice-like syllables, telephone band, light clipping and hiss. Meaning lives in the subtitle.
  chatter(syl, delay = .1) { if (!this.ctx) return 0; const C = this.ctx, o = this.out(null, 0.42), t0 = C.currentTime + (this.dly || 0) + delay, hp = C.createBiquadFilter(), lp = C.createBiquadFilter(), ws = C.createWaveShaper(), cv = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; cv[i] = Math.tanh(x * 2.2); } ws.curve = cv; hp.type = 'highpass'; hp.frequency.value = 420; lp.type = 'lowpass'; lp.frequency.value = 2900; hp.connect(lp); lp.connect(ws); ws.connect(o);
    const V = [[640, 960], [470, 1620], [250, 2020], [500, 740], [390, 900], [580, 1510]], base = 92 + Math.random() * 26; let t = t0;
    for (let i = 0; i < syl; i++) { const d = .085 + Math.random() * .07, v = V[Math.random() * V.length | 0], f0 = base * (1 + (Math.random() - .5) * .12) * (i === syl - 1 ? .9 : 1), s = C.createOscillator(), g = C.createGain(); s.type = 'sawtooth'; s.frequency.setValueAtTime(f0 * 1.04, t); s.frequency.linearRampToValueAtTime(f0 * .96, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.55, t + .018); g.gain.setValueAtTime(.5, t + d * .7); g.gain.exponentialRampToValueAtTime(0.0005, t + d); s.connect(g);
      for (const [f, q, a] of [[v[0], 6, 1], [v[1], 9, .55]]) { const b = C.createBiquadFilter(), k = C.createGain(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; k.gain.value = a * 2.2; g.connect(b); b.connect(k); k.connect(hp); }
      s.start(t); s.stop(t + d + .02); t += d + .025 + (Math.random() < .18 ? .07 : 0); }
    this.noise(t - t0 + .05, 2600, 2400, .045, o, 'bandpass', .6, delay); return t - t0; },
  ui(f = 900) { if (!this.ctx) return; const o = this.out(null, 0.2); this.tone(f, f * 1.25, 0.06, 0.6, o, 'triangle'); },
  buy() { if (!this.ctx) return; const o = this.out(null, 0.3); this.tone(660, 660, 0.06, 0.6, o, 'square'); this.tone(990, 990, 0.1, 0.6, o, 'square', 0.06); },
  deny() { if (!this.ctx) return; const o = this.out(null, 0.25); this.tone(200, 150, 0.14, 0.7, o, 'square'); },
  bell(win) { if (!this.ctx) return; const o = this.out(null, 0.4); const n = win ? [523, 659, 784, 1046] : [392, 330, 262, 196]; n.forEach((f, i) => this.tone(f, f, 0.3, 0.5, o, 'triangle', i * 0.11)); }
};

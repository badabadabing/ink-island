'use strict';
/* ============ INK ISLAND · guns2: the marksman rifle and the machine gun, more attachments, more medicine, the fire bottle ============ */
Object.assign(WEAPONS, {
  dmr: { name: '断墨 连狙', en: 'BROKEN INK DMR', slot: 1, dmg: 56, arm: .9, rate: .3, auto: false, mag: 10, res: 40, reload: 2.9, spread: .0012, moveSp: .09, sprayInc: .004, up: .028, side: .007, vm: .11, speed: .9, draw: .7, reward: 300, price: 0, snd: 'rifle', fall: .98, adsFov: 38 },
  lmg: { name: '浓墨 机枪', en: 'THICK INK LMG', slot: 1, dmg: 33, arm: .8, rate: .092, auto: true, mag: 75, res: 150, reload: 5.2, spread: .0048, moveSp: .1, sprayInc: .0013, up: .0115, side: .009, vm: .07, speed: .84, draw: .9, reward: 300, price: 0, snd: 'rifle', fall: .95 },
  fire: { name: '燃烧瓶', en: 'INK FIRE', slot: 4, speed: .98, draw: .4, price: 0, reward: 0, nade: true, rate: 1, fuse: 6, impact: true }
});
WEAPONS.dmr.pat = mkPat(.028, .006, 10, 1, .3); WEAPONS.lmg.pat = mkPat(.0118, .0094, 30, -1, .9);
Object.assign(AMMO, { dmr: '762', lmg: '556' });
Object.assign(GUNS, {
  /* a long semi-auto: slim receiver, long barrel with a flash cone, wooden stock with a cheek rest, short box magazine */
  dmr(p) { const b = p.body;
    b.box(.04, .056, .3, 0, .006, -.06); b.prof([[-.08, .03], [.22, .03], [.22, .046], [.18, .058], [-.05, .058], [-.08, .046]], .034); b.box(.02, .018, .06, 0, .066, -.16);
    b.prof([[.24, -.032], [.5, -.024], [.5, .012], [.24, .012]], .044, { tint: WOOD, tone: .33 }); b.cyl(.0085, .0085, .62, 6, 0, .01, -.56, { ax: 'z', ea: 50 }); b.cyl(.013, .017, .05, 8, 0, .01, -.87, { ax: 'z', tone: .33 });
    b.prof([[.71, .012], [.75, .012], [.74, .08], [.72, .08]], .012); b.line([0, -.006, -.5, 0, -.006, -.85, .02, .03, -.27, .02, .03, -.45, -.02, .03, -.27, -.02, .03, -.45]);
    b.prof([[-.08, .03], [-.08, -.03], [-.15, -.05], [-.4, -.1], [-.41, -.1], [-.41, .0], [-.25, .04], [-.2, .04]], .042, { tint: WOOD, tone: .33 }); b.prof([[-.3, .04], [-.4, .02], [-.4, .06], [-.3, .07]], .04, { tint: WOOD, tone: .66 });
    b.prof([[-.005, -.03], [.04, -.03], [.016, -.13], [-.04, -.124]], .032, { tint: WOOD, tone: .66 }); b.poly([[0, -.03, -.04], [0, -.075, -.05], [0, -.075, -.095], [0, -.03, -.1]]); b.line([0, -.035, -.068, 0, -.06, -.062]);
    p.mag.prof([[.1, -.03], [.17, -.03], [.18, -.12], [.11, -.126]], .028, { tone: .66 }); p.bolt.box(.03, .012, .026, .032, .036, -.12);
    return { muzzle: [.9, .01], eject: [.04, .045, -.1], lh: [.36, -.034], grip: [0, -.085] }; },
  /* a belt-fed gun: fat receiver, thick barrel with a carry handle, bipod legs folded under the handguard, drum below */
  lmg(p) { const b = p.body;
    b.box(.056, .07, .36, 0, .0, -.05); b.prof([[-.1, .035], [.26, .035], [.26, .055], [.22, .07], [-.06, .07], [-.1, .055]], .05); b.box(.02, .03, .1, 0, .09, -.1, { tone: .33 }); b.line([-.01, .1, -.05, -.01, .1, -.15, .01, .1, -.05, .01, .1, -.15]);
    b.prof([[.28, -.04], [.5, -.032], [.5, .02], [.28, .02]], .052, { tone: .33 }); b.cyl(.014, .014, .5, 8, 0, .006, -.6, { ax: 'z', ea: 50 }); b.cyl(.011, .011, .54, 6, 0, .006, -.6, { ax: 'z', ea: 50 }); b.cyl(.02, .02, .06, 8, 0, .006, -.85, { ax: 'z', tone: .33 });
    for (const x of [-.028, .028]) { b.cyl(.006, .006, .24, 5, x, -.06, -.42, { ax: 'z', tone: .66 }); b.line([x, -.06, -.52, x, -.14, -.46]); }
    b.prof([[-.1, .035], [-.1, -.035], [-.16, -.05], [-.36, -.09], [-.37, -.09], [-.37, .0], [-.2, .03]], .046, { tone: .33 });
    b.prof([[-.005, -.03], [.045, -.03], [.02, -.14], [-.04, -.13]], .034, { tone: .66 }); b.poly([[0, -.035, -.045], [0, -.08, -.055], [0, -.08, -.1], [0, -.035, -.105]]); b.line([0, -.04, -.072, 0, -.065, -.066]);
    p.mag.cyl(.07, .07, .09, 10, 0, -.1, -.14, { ax: 'x', tone: .66 }); p.mag.line([-.045, -.1, -.21, .045, -.1, -.21, -.045, -.1, -.07, .045, -.1, -.07]); p.bolt.box(.034, .014, .03, .036, .04, -.13);
    return { muzzle: [.88, .006], eject: [.045, .04, -.12], lh: [.4, -.04], grip: [0, -.09], support: true }; },
  fire(p) { const b = p.body; b.cyl(.03, .034, .1, 8, 0, -.01, 0, { tint: GLASS, tone: .33 }); b.cyl(.012, .012, .05, 6, 0, .07, 0, { tint: GLASS, tone: .33 }); b.box(.02, .06, .006, .014, .11, 0, { tint: AMBER, tone: 0 }); b.line([0, .095, 0, .03, .14, .01]); return { muzzle: [0, 0], lh: null, grip: [0, 0], nade: true }; }
});
SFX.SHOT.dmr = SFX.SHOT.rifle;
Object.assign(ITEMS, {
  dmr: { kind: 'gun', name: '断墨 连狙', w: 1 }, lmg: { kind: 'gun', name: '浓墨 机枪', w: 1 },
  comp: { kind: 'att', name: '补偿器', slot: 'comp' }, stock: { kind: 'att', name: '枪托', slot: 'stock' }, dot: { kind: 'att', name: '红点 镜', slot: 'dot' },
  medkit: { kind: 'med', name: '医疗箱', t: 8, heal: 100, cap: 100, w: 2 }, drink: { kind: 'med', name: '墨汁饮料', t: 4, boost: 40, w: 1 }, adren: { kind: 'med', name: '肾上腺素', t: 6, boost: 100, w: 2 },
  fire: { kind: 'nade', name: '燃烧瓶', w: 1 }
});
ITEMS.pill.boost = 60;
LOOT_TABLE.push(['dmr', 1.2], ['lmg', .9], ['comp', 1.3], ['stock', 1.2], ['dot', 1.6], ['medkit', .8], ['drink', 2.6], ['adren', .5], ['fire', 1.2]);
const MED_KEYS = { Digit7: 'band', Digit8: 'kit', Digit9: 'medkit', Digit0: 'pill', Minus: 'drink', Equal: 'adren' };

/* ---------- fire bottles: shatter on the first touch and leave a burning patch ---------- */
const FIRES = [];
function fireSpawn(x, y, z, owner) { FIRES.push({ x, y, z, r: 3.8, t: 9, owner, tick: 0 }); FX.burst(x, y + .3, z, 0, 1, 0, 30, AMBER, 5, .07); FX.decal(x, y + .02, z, 0, 1, 0, 3.2, INK, true); SFX.hiss({ x, y, z }); SFX.boom({ x, y, z }); if (typeof botHear === 'function') botHear({ x, y, z }, owner ? owner.team : 'x', 40, 'shot'); }
function firesUpdate(dt) { for (let i = FIRES.length - 1; i >= 0; i--) { const f = FIRES[i]; f.t -= dt; f.tick -= dt; const k = Math.min(1, f.t / 2); for (let n = 0; n < 3; n++) { if (Math.random() < .9 * k) { const a = rand(6.28), d = Math.sqrt(Math.random()) * f.r; FX.burst(f.x + Math.cos(a) * d, f.y + .1, f.z + Math.sin(a) * d, rand(-.2, .2), 1, rand(-.2, .2), 1, Math.random() < .3 ? INK : AMBER, rand(1.5, 3.2), rand(.08, .2)); } }
    if (f.tick <= 0) { f.tick = .5; for (const e of G.ents) { if (!e.alive || e.air) continue; const d = Math.hypot(e.pos.x - f.x, e.pos.z - f.z); if (d < f.r && Math.abs(e.pos.y - f.y) < 2.2) { hurt(e, 5, f.owner, 'fire', 'legs', { x: 0, y: 1, z: 0 }, { x: e.pos.x, y: e.pos.y + .6, z: e.pos.z }); if (!e.isPlayer) { e.hurtT = G.now; e.fleeFire = f; } if (e.isPlayer) G.burnT = .6; } } }
    if (f.t <= 0) FIRES.splice(i, 1); } if (G.burnT > 0) G.burnT -= dt; }
const inFire = e => { for (const f of FIRES) if (Math.hypot(e.pos.x - f.x, e.pos.z - f.z) < f.r + 1.5 && Math.abs(e.pos.y - f.y) < 2.2) return f; return null; };

/* ---------- the crossbow: one bolt, a slow arc, no bang — nobody hears it ---------- */
WEAPONS.bow = { name: '墨矢 弩', en: 'INK BOLT', slot: 1, dmg: 92, arm: .84, rate: .9, auto: false, mag: 1, res: 20, reload: 3.4, spread: .0008, moveSp: .14, sprayInc: 0, up: .02, side: .005, vm: .1, speed: .9, draw: .8, reward: 300, price: 0, snd: 'bow', fall: 1, range: 120, silent: true, crank: true };
WEAPONS.bow.pat = mkPat(.02, .005, 1, 1, 0); AMMO.bow = 'bolt';
GUNS.bow = p => { const b = p.body;
  /* a wooden stock with a flat rail on top, the prod across the nose, the string drawn back to the latch, one bolt lying in the groove */
  b.prof([[-.08, .02], [.3, .02], [.3, .05], [-.05, .05], [-.08, .04]], .04, { tint: WOOD, tone: .33 }); b.box(.028, .012, .5, 0, .056, -.1, { tone: .66 }); b.line([-.014, .063, .15, -.014, .063, -.35, .014, .063, .15, .014, .063, -.35]);
  b.prof([[-.08, .02], [-.08, -.03], [-.15, -.05], [-.4, -.1], [-.41, -.1], [-.41, 0], [-.25, .04], [-.2, .04]], .042, { tint: WOOD, tone: .33 }); b.prof([[-.3, .04], [-.4, .02], [-.4, .06], [-.3, .07]], .04, { tint: WOOD, tone: .66 });
  b.prof([[-.005, -.03], [.04, -.03], [.016, -.13], [-.04, -.124]], .032, { tint: WOOD, tone: .66 }); b.poly([[0, -.03, -.04], [0, -.075, -.05], [0, -.075, -.095], [0, -.03, -.1]]); b.line([0, -.035, -.068, 0, -.06, -.062]);
  for (const q of [-1, 1]) { b.add(new THREE.BoxGeometry(.19, .009, .018), new THREE.Matrix4().makeRotationY(q * .3).setPosition(q * .11, .042, -.345), { tone: .33 }); b.line([q * .2, .042, -.31, q * .215, .042, -.29]); }
  b.line([-.21, .042, -.3, 0, .042, -.05, .21, .042, -.3]); b.line([-.21, .042, -.3, -.21, .042, -.33, .21, .042, -.3, .21, .042, -.33]);
  b.cyl(.0045, .0045, .36, 5, 0, .066, -.17, { ax: 'z', tone: 1, edges: false }); b.cyl(.004, .011, .025, 5, 0, .066, -.355, { ax: 'z', tone: 1 }); b.line([0, .066, .0, .02, .08, .03, 0, .066, .0, -.02, .08, .03, 0, .066, .0, 0, .09, .03]);
  b.line([0, .005, -.32, 0, -.05, -.33, .03, -.07, -.33, -.03, -.07, -.33, 0, -.05, -.33]);
  p.mag.box(.03, .02, .03, 0, .066, -.03, { tone: .33 }); p.bolt.box(.016, .016, .05, .03, .035, -.06, { tone: .33 });
  return { muzzle: [.36, .066], lh: [.2, -.03], grip: [0, -.085] }; };
Object.assign(ITEMS, { bow: { kind: 'gun', name: '墨矢 弩', w: 1 }, abolt: { kind: 'ammo', t: 'bolt', name: '墨矢', qty: 5, unit: 5 }, ghillie: { kind: 'suit', name: '纸絮 伪装衣', w: 0 } });
LOOT_TABLE.push(['bow', 1.1], ['abolt', 2.4], ['ghillie', .35]);
SFX.twang = function (pos) { if (!this.ctx) return; const o = this.out(pos, .9); this.noise(.05, 2600, 700, 1.1, o, 'bandpass', 3); this.tone(240, 70, .2, .6, o, 'triangle'); this.mech(1100, .3, o, .04); };
/* ---------- the paper-shred suit: strips of torn paper hung over the torso and hood; a bot sees its wearer at .6× range (.3× when prone) ---------- */
function ghillieWear(e) { const m = e.model; if (!m || m.ghillie || !e.ghillie) return; const g = new THREE.Group(), mk = (parent, y0, y1, r0, n) => { const s = new Sk('sun'); for (let i = 0; i < n; i++) { const a = rand(6.28), r = r0 * rand(.9, 1.15), y = rand(y0, y1), L = rand(.08, .2), w = rand(.02, .045), t = rand(-.5, .5), x = Math.cos(a) * r, z = Math.sin(a) * r, dx = Math.cos(a + t) * .02, dz = Math.sin(a + t) * .02; s.quad([x - dz, y, z + dx], [x + dz, y, z - dx], [x + dz + dx * 2, y - L, z - dx + dz * 2], [x - dz + dx * 2, y - L, z + dx + dz * 2], i % 3 ? .33 : .66, PAPER); if (i % 2) s.line([x - dz, y, z + dx, x - dz + dx * 2, y - L, z + dx + dz * 2]); } const b = s.bake(m.fm, m.lm); b.traverse(o => o.frustumCulled = false); parent.add(b); return b; };
  g.add(mk(g, .05, .62, .27, 90)); m.upper.add(g); const h = new THREE.Group(); mk(h, .02, .3, .19, 40); m.head.add(h); m.ghillie = { torso: g, hood: h }; }
function ghillieStrip(e) { const m = e.model; if (!m || !m.ghillie) return; for (const k of ['torso', 'hood']) { m.ghillie[k].removeFromParent(); m.ghillie[k].traverse(o => o.geometry && o.geometry.dispose()); } m.ghillie = null; }

'use strict';
/* ============ INK STRIKE · arsenal: stats, line-art gun models, first-person viewmodel ============ */
const WEAPONS = {
  knife:  { name: '刻刀', en: 'ETCHER', slot: 3, dmg: 40, dmg2: 65, arm: .85, rate: .42, rate2: .9, range: 2.0, speed: 1.0, draw: .35, reward: 1500, melee: true, price: 0 },
  p9:     { name: 'P9 速写', en: 'P9 SKETCH', slot: 2, dmg: 30, arm: .52, rate: .14, auto: false, mag: 12, res: 48, reload: 1.9, spread: .0035, moveSp: .022, sprayInc: .004, up: .016, side: .004, vm: .05, speed: .98, draw: .4, reward: 300, price: 200, snd: 'pistol', fall: .82 },
  deagle: { name: '重墨 .50', en: 'HEAVY INK .50', slot: 2, dmg: 58, arm: .93, rate: .27, auto: false, mag: 7, res: 35, reload: 2.1, spread: .0025, moveSp: .04, sprayInc: .03, up: .05, side: .012, vm: .11, speed: .95, draw: .5, reward: 300, price: 700, snd: 'deagle', fall: .85 },
  viper:  { name: '飞白 冲锋枪', en: 'DRYBRUSH SMG', slot: 1, dmg: 25, arm: .6, rate: .072, auto: true, mag: 30, res: 120, reload: 2.2, spread: .008, moveSp: .012, sprayInc: .0012, up: .0085, side: .0055, vm: .035, speed: .97, draw: .5, reward: 600, price: 1250, snd: 'smg', fall: .75, optic: 'reflex', adsFov: 70 },
  nova:   { name: '泼墨 霰弹枪', en: 'SPLASH SHOTGUN', slot: 1, dmg: 20, pellets: 9, arm: .5, rate: .85, auto: false, mag: 8, res: 32, reload: 2.6, spread: .045, moveSp: .01, sprayInc: 0, up: .07, side: .015, vm: .16, speed: .93, draw: .6, reward: 900, price: 1050, snd: 'shotgun', fall: .55, fallStart: 6, range: 24, headMult: 2, penetration: 0, pump: true },
  ak:     { name: 'AK 焦墨', en: 'AK CHARCOAL', slot: 1, dmg: 36, arm: .78, rate: .1, auto: true, mag: 30, res: 90, reload: 2.4, spread: .0022, moveSp: .05, sprayInc: .0011, up: .0135, side: .0085, vm: .06, speed: .9, draw: .6, reward: 300, price: 2700, snd: 'rifle', fall: .95 },
  m4:     { name: 'M4 工笔', en: 'M4 FINELINE', slot: 1, dmg: 31, arm: .7, rate: .092, auto: true, mag: 30, res: 90, reload: 2.7, spread: .0018, moveSp: .045, sprayInc: .0009, up: .0105, side: .006, vm: .045, speed: .92, draw: .6, reward: 300, price: 3100, snd: 'm4', fall: .95, optic: 'holo', adsFov: 64 },
  awp:    { name: '一笔 狙击枪', en: 'ONE STROKE', slot: 1, dmg: 115, arm: .97, rate: 1.65, auto: false, mag: 5, res: 25, reload: 3.3, spread: .0004, noScope: .08, moveSp: .16, sprayInc: 0, up: .06, side: .01, vm: .2, speed: .82, draw: .9, reward: 100, price: 4750, snd: 'awp', fall: 1, scope: true, bolt: true },
  he:     { name: '墨爆弹', en: 'INK BOMB', slot: 4, speed: .98, draw: .4, price: 300, reward: 300, nade: true, rate: 1, fuse: 1.7 },
  flash:  { name: '曝光弹', en: 'OVEREXPOSE', slot: 4, speed: .98, draw: .4, price: 200, reward: 300, nade: true, rate: 1, fuse: 1.45 },
  smoke:  { name: '烟墨弹', en: 'SMOKE WASH', slot: 4, speed: .98, draw: .4, price: 300, reward: 300, nade: true, rate: 1, fuse: 2.3 }
};
/* A pellet keeps close-range power, then loses energy quadratically; other guns keep their existing distance curve. */
function weaponFalloff(w, distance) { if (w.range && distance >= w.range) return 0; return w.fallStart === undefined ? Math.pow(w.fall, distance / 28) : Math.pow(Math.max(0, Math.min(1, (w.range - distance) / (w.range - w.fallStart))), 2); }
/* fixed, learnable spray patterns: [pitchKick, yawKick] per shot (radians). Same every time — pull the opposite way to control it. */
function mkPat(up, side, n, dir, q) { const a = []; for (let i = 0; i < n; i++) { let dy, dx; if (i < 8) { dy = up * (i ? 1 : .55); dx = side * .16 * Math.sin(i * 1.3 + q) * dir; } else if (i < 16) { dy = up * .24; dx = -side * (.55 + .4 * Math.sin((i - 8) * .5)) * dir; } else if (i < 24) { dy = up * .12; dx = side * (.75 + .35 * Math.sin((i - 16) * .6)) * dir; } else { dy = up * .08; dx = -side * .7 * dir; } a.push([dy, dx]); } return a; }
WEAPONS.ak.pat = mkPat(.0142, .0098, 30, 1, .4); WEAPONS.m4.pat = mkPat(.0108, .0068, 30, -1, 1.2); WEAPONS.viper.pat = mkPat(.0088, .0062, 30, -1, 2.1);
WEAPONS.p9.pat = mkPat(.016, .003, 12, 1, 0); WEAPONS.deagle.pat = mkPat(.05, .008, 7, 1, .7); WEAPONS.nova.pat = mkPat(.07, .01, 8, 1, 0); WEAPONS.awp.pat = mkPat(.06, .004, 5, 1, 0);
const BUY_LIST = ['deagle', 'viper', 'nova', 'ak', 'm4', 'awp', 'armor', 'he', 'flash', 'smoke'];

/* Chamfered kit geometry, merged by Sk; reused by equipment and soldier silhouettes. */
function inkBlock(s, w, h, d, x, y, z, o = {}) { const v = Math.min(w, h, d) * (o.bevel ?? .16), sh = new THREE.Shape(), a = w / 2 - v, b = h / 2 - v; sh.moveTo(-a, -b); sh.lineTo(a, -b); sh.lineTo(a, b); sh.lineTo(-a, b); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.001, d - v * 2), bevelEnabled: true, bevelSize: v, bevelThickness: v, bevelSegments: 1, steps: 1 }); g.translate(0, 0, -d / 2 + v); if (o.taper) { const a = g.attributes.position; for (let i = 0; i < a.count; i++) { const k = 1 - o.taper * (a.getY(i) / h + .5); a.setX(i, a.getX(i) * k); a.setZ(i, a.getZ(i) * k); } g.computeVertexNormals(); } return s.add(g, s._m(x, y, z, o.r, o.m), o); }
function inkLimb(s, a, b, w, d, o = {}) { const A = new V3(...a), B = new V3(...b), v = B.clone().sub(A), len = v.length(), q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), v.normalize()), m = new THREE.Matrix4().compose(A.add(B).multiplyScalar(.5), q, new V3(1, 1, 1)); return inkBlock(s, w, len, d, 0, 0, 0, { taper: .18, ...o, m: o.m ? o.m.clone().multiply(m) : m }); }

/* ---- gun geometry. profile coords are [forward, up]; forward = -Z ---- */
const GUNS = {
  ak(p) { const b = p.body;
    b.box(.042, .062, .32, 0, 0, -.06); b.prof([[-.10, .031], [.2, .031], [.2, .046], [.16, .06], [-.06, .06], [-.10, .046]], .036);
    b.box(.02, .02, .05, 0, .068, -.17); b.prof([[.22, -.036], [.44, -.026], [.44, .012], [.22, .012]], .048, { tint: WOOD, tone: .33 });
    b.prof([[.235, .018], [.42, .018], [.42, .05], [.235, .05]], .036, { tint: WOOD, tone: .33 }); b.cyl(.008, .008, .16, 6, 0, .04, -.5, { ax: 'z', ea: 50 });
    b.box(.022, .052, .03, 0, .024, -.57); b.cyl(.0078, .0078, .54, 6, 0, .008, -.49, { ax: 'z', ea: 50 }); b.prof([[.665, .015], [.705, .015], [.695, .078], [.675, .078]], .012);
    b.cyl(.0115, .0115, .05, 8, 0, .008, -.785, { ax: 'z' }); b.line([0, -.006, -.45, 0, -.006, -.74, .019, .03, -.27, .019, .03, -.39, -.019, .03, -.27, -.019, .03, -.39, .0215, .0, .07, .0215, -.015, -.0, .0215, -.02, -.12, .0215, .02, -.12]);
    b.prof([[-.005, -.03], [.042, -.03], [.016, -.135], [-.042, -.128]], .032, { tint: WOOD, tone: .66 });
    b.prof([[-.10, .03], [-.10, -.03], [-.16, -.046], [-.365, -.10], [-.375, -.10], [-.375, .0], [-.2, .026]], .04, { tint: WOOD, tone: .33 });
    b.poly([[0, -.03, -.042], [0, -.078, -.052], [0, -.078, -.098], [0, -.03, -.102]]); b.line([0, -.035, -.07, 0, -.06, -.064]);
    p.mag.prof([[.10, -.03], [.172, -.03], [.19, -.10], [.222, -.168], [.262, -.222], [.205, -.258], [.168, -.2], [.138, -.13], [.116, -.08]], .028, { tone: .66 });
    p.bolt.box(.03, .012, .026, .033, .036, -.115); p.bolt.box(.006, .03, .09, .0215, .038, -.06, { tone: .33 });
    return { muzzle: [.81, .008], eject: [.04, .045, -.09], lh: [.33, -.036], grip: [0, -.085] }; },
  m4(p) { const b = p.body;
    b.box(.042, .048, .22, 0, .022, -.02); b.prof([[-.09, 0], [.10, 0], [.10, -.036], [.05, -.042], [-.02, -.042], [-.09, -.02]], .038);
    b.box(.022, .012, .2, 0, .052, -.02); { const a = []; for (let i = 0; i < 10; i++) a.push(-.011, .059, .07 - i * .02, .011, .059, .07 - i * .02); b.line(a); }
    b.box(.03, .036, .05, 0, .076, -.07, { tone: .33 });
    b.prof([[.13, -.026], [.40, -.02], [.40, .046], [.13, .046]], .048); { const a = []; for (let i = 0; i < 6; i++) { const z = -.16 - i * .04; a.push(.0245, .0, z, .0245, .03, z - .012, -.0245, .0, z, -.0245, .03, z - .012); } b.line(a); }
    b.prof([[.405, .0], [.45, .0], [.432, .088], [.42, .088]], .012); b.cyl(.008, .008, .16, 6, 0, .012, -.46, { ax: 'z', ea: 50 }); b.cyl(.019, .019, .2, 8, 0, .012, -.62, { ax: 'z', tone: .33 });
    b.prof([[-.06, -.02], [-.012, -.03], [-.046, -.132], [-.098, -.12]], .03, { tone: .66 }); b.cyl(.014, .014, .22, 8, 0, .02, .2, { ax: 'z' });
    b.prof([[-.20, .042], [-.335, .046], [-.34, -.072], [-.30, -.078], [-.27, -.012], [-.20, -.004]], .036, { tone: .33 });
    b.poly([[0, -.04, -.0], [0, -.082, -.006], [0, -.082, -.05], [0, -.04, -.05]]); b.line([0, -.045, -.022, 0, -.068, -.018, .0215, .02, -.06, .0215, .02, .02, .0215, .035, -.085, .0215, .005, -.085]);
    p.mag.prof([[.03, -.036], [.086, -.036], [.103, -.2], [.046, -.206]], .026, { tone: .66 }); p.bolt.box(.034, .01, .03, 0, .05, .09);
    return { muzzle: [.72, .012], eject: [.04, .03, -.04], lh: [.28, -.028], grip: [-.055, -.08] }; },
  viper(p) { const b = p.body;
    b.box(.05, .066, .27, 0, .02, -.06); b.box(.012, .02, .012, 0, .062, -.18); b.box(.03, .018, .012, 0, .06, .06); b.cyl(.021, .021, .17, 8, 0, .022, -.28, { ax: 'z', tone: .33 }); b.cyl(.011, .011, .03, 8, 0, .022, -.205, { ax: 'z' });
    b.prof([[-.03, -.012], [.026, -.012], [.014, -.13], [-.046, -.125]], .038, { tone: .66 }); b.poly([[0, -.013, -.026], [0, -.055, -.034], [0, -.055, -.082], [0, -.013, -.086]]); b.line([0, -.02, -.05, 0, -.045, -.046]);
    b.poly([[0, -.013, -.15], [0, -.075, -.145], [0, -.075, -.17], [0, -.013, -.175]]); b.line([.0255, .04, .07, .0255, .04, -.19, .0255, .0, .07, .0255, .0, -.19, .0255, .03, -.02, .0255, .03, -.08, .0255, .045, -.02, .0255, .045, -.08]);
    for (const s of [-.02, .02]) b.line([s, .03, .075, s, .03, .3, s, .03, .3, s, -.06, .31]); b.line([-.02, -.06, .31, .02, -.06, .31, -.02, .03, .3, .02, .03, .3]);
    p.mag.prof([[-.024, -.12], [.012, -.12], [.0, -.255], [-.038, -.25]], .026, { tone: .33 }); p.bolt.box(.018, .022, .026, 0, .064, -.1);
    return { muzzle: [.37, .022], eject: [.035, .04, -.06], lh: [.14, -.04], grip: [-.012, -.075] }; },
  p9(p) { const b = p.body;
    b.box(.026, .024, .17, 0, -.013, -.012); b.prof([[-.085, 0], [-.03, 0], [-.052, -.118], [-.112, -.108]], .03, { tone: .66 }); b.poly([[0, -.025, -.028], [0, -.055, -.024], [0, -.06, .025], [0, -.025, .03]]); b.line([0, -.028, -.002, 0, -.05, .002]);
    b.cyl(.006, .006, .02, 6, 0, .018, -.108, { ax: 'z' }); p.mag.prof([[-.105, -.102], [-.05, -.113], [-.053, -.13], [-.109, -.12]], .028, { tone: .33 });
    p.bolt.prof([[-.085, 0], [.10, 0], [.10, .028], [.088, .037], [-.085, .037]], .029); p.bolt.box(.006, .008, .008, 0, .041, -.09); p.bolt.box(.016, .008, .008, 0, .041, .075);
    { const a = []; for (let i = 0; i < 5; i++) a.push(.0148, .006, .04 + i * .008, .0148, .03, .045 + i * .008, -.0148, .006, .04 + i * .008, -.0148, .03, .045 + i * .008); p.bolt.line(a); }
    return { muzzle: [.12, .018], eject: [.02, .04, -.02], lh: [-.06, -.07], grip: [-.072, -.065], pistol: true }; },
  deagle(p) { const b = p.body;
    b.box(.032, .03, .2, 0, -.016, -.03); b.prof([[-.10, 0], [-.035, 0], [-.06, -.14], [-.132, -.128]], .036, { tone: .66 }); b.poly([[0, -.03, -.035], [0, -.066, -.03], [0, -.07, .03], [0, -.03, .035]]); b.line([0, -.034, -.004, 0, -.06, .0]);
    p.mag.prof([[-.125, -.12], [-.058, -.135], [-.062, -.153], [-.13, -.14]], .032, { tone: .33 });
    p.bolt.prof([[-.10, 0], [.158, 0], [.158, .03], [.07, .047], [-.10, .047]], .035); p.bolt.box(.012, .008, .2, 0, .05, -.04); p.bolt.box(.006, .012, .008, 0, .058, -.145); p.bolt.box(.02, .01, .008, 0, .052, .09);
    { const a = []; for (let i = 0; i < 6; i++) a.push(.018, .008, .05 + i * .008, .018, .04, .056 + i * .008, -.018, .008, .05 + i * .008, -.018, .04, .056 + i * .008); a.push(.018, .012, -.15, .018, .012, -.02, -.018, .012, -.15, -.018, .012, -.02); p.bolt.line(a); }
    return { muzzle: [.175, .02], eject: [.025, .05, -.02], lh: [-.07, -.085], grip: [-.085, -.075], pistol: true }; },
  awp(p) { const b = p.body;
    b.box(.044, .05, .27, 0, .012, -.03); b.cyl(.009, .0115, .7, 8, 0, .014, -.47, { ax: 'z' }); b.box(.03, .028, .065, 0, .014, -.85); b.line([.0155, .02, -.835, .0155, .008, -.835, .0155, .02, -.855, .0155, .008, -.855, .0155, .02, -.87, .0155, .008, -.87]);
    b.prof([[-.43, .036], [-.43, -.10], [-.37, -.112], [-.21, -.052], [-.125, -.06], [-.105, -.125], [-.05, -.122], [-.03, -.036], [.30, -.03], [.345, -.012], [.345, .0], [-.12, .0], [-.2, .036]], .046, { tone: .33 });
    b.box(.03, .02, .12, 0, .048, .3, { tone: .66 }); b.poly([[.0235, -.02, .15], [.0235, -.075, .2], [.0235, -.03, .23]], true); b.poly([[-.0235, -.02, .15], [-.0235, -.075, .2], [-.0235, -.03, .23]], true);
    b.cyl(.017, .017, .30, 8, 0, .082, -.07, { ax: 'z' }); b.cyl(.017, .03, .08, 8, 0, .082, -.26, { ax: 'z' }); b.cyl(.03, .03, .03, 8, 0, .082, -.315, { ax: 'z', tone: .66 }); b.cyl(.025, .017, .05, 8, 0, .082, .105, { ax: 'z' }); b.cyl(.025, .025, .025, 8, 0, .082, .14, { ax: 'z', tone: .66 });
    b.cyl(.011, .011, .03, 6, 0, .11, -.06); b.cyl(.011, .011, .03, 6, .028, .082, -.06, { ax: 'x' }); for (const z of [-.14, .02]) b.box(.022, .03, .025, 0, .05, z);
    b.line([0, -.032, -.2, 0, -.05, -.34, .01, -.032, -.2, .02, -.05, -.34, -.01, -.032, -.2, -.02, -.05, -.34]); b.poly([[0, -.036, -.03], [0, -.072, -.036], [0, -.072, -.085], [0, -.036, -.09]]);
    p.mag.box(.03, .045, .075, 0, -.052, -.13, { tone: .66 }); p.bolt.cyl(.006, .006, .05, 6, .045, .02, .07, { ax: 'x' }); p.bolt.sph(.012, .075, .02, .07, { tone: 1, ws: 6, hs: 4 });
    return { muzzle: [.89, .014], eject: [.04, .04, -.0], lh: [.2, -.034], grip: [-.078, -.085] }; },
  nova(p) { const b = p.body;
    b.prof([[-.10, -.03], [.12, -.03], [.12, .036], [-.06, .036], [-.10, .01]], .042); b.cyl(.011, .011, .52, 8, 0, .02, -.38, { ax: 'z' }); b.cyl(.012, .012, .44, 8, 0, -.012, -.34, { ax: 'z' }); b.box(.006, .01, .006, 0, .036, -.63); b.box(.03, .05, .016, 0, .004, -.55);
    b.prof([[-.10, .01], [-.10, -.03], [-.16, -.05], [-.385, -.10], [-.385, .0], [-.2, .022]], .038, { tone: .33 }); b.prof([[-.09, -.03], [-.04, -.03], [-.072, -.122], [-.124, -.112]], .032, { tone: .66 });
    b.poly([[0, -.03, -.035], [0, -.07, -.04], [0, -.07, .02], [0, -.03, .03]]); b.line([0, -.035, -.01, 0, -.058, -.006, .0215, .015, -.0, .0215, .015, -.09, .0215, -.005, 0, .0215, -.005, -.09]);
    p.bolt.cyl(.025, .025, .19, 8, 0, -.012, -.31, { ax: 'z', tone: .33 }); p.mag.cyl(.01, .01, .06, 8, 0, -.06, -.05, { ax: 'z', tint: RED, tone: 0 });
    return { muzzle: [.64, .02], eject: [.04, .02, -.04], lh: [.31, -.03], grip: [-.082, -.078], lhOnBolt: true }; },
  knife(p) { const b = p.body;
    b.prof([[.02, 0], [.2, 0], [.25, .024], [.2, .038], [.02, .038]], .005); b.line([.003, .026, -.04, .003, .026, -.19, -.003, .026, -.04, -.003, .026, -.19]); b.box(.036, .078, .014, 0, .019, -.014);
    b.prof([[-.115, .002], [.008, .002], [.008, .035], [-.115, .035]], .026, { tone: 1 }); b.box(.03, .045, .014, 0, .018, .12, { tone: .33 });
    return { muzzle: [.25, .02], lh: null, grip: [-.055, .018], knife: true }; },
  he(p) { const b = p.body; b.cyl(.036, .036, .07, 8, 0, 0, 0, { tone: .33 }); b.sph(.036, 0, .035, 0, { ws: 8, hs: 4 }); b.sph(.036, 0, -.035, 0, { ws: 8, hs: 4, tone: .66 }); b.cyl(.014, .014, .03, 6, 0, .08, 0); b.box(.012, .07, .006, .03, .04, 0, { tint: AMBER, tone: 0 });
    { const pts = []; for (let i = 0; i < 8; i++) pts.push([-.03 + Math.cos(i / 8 * 6.28) * .016, .09 + Math.sin(i / 8 * 6.28) * .016, 0]); b.poly(pts, true); }
    return { muzzle: [0, 0], lh: null, grip: [0, -.0], nade: true }; },
  flash(p) { const b = p.body; b.cyl(.03, .03, .1, 8, 0, 0, 0); b.cyl(.033, .033, .012, 8, 0, .056, 0, { tone: 1 }); b.cyl(.033, .033, .012, 8, 0, -.056, 0, { tone: 1 }); b.cyl(.012, .012, .03, 6, 0, .08, 0); b.box(.01, .08, .006, .028, .04, 0, { tint: AMBER, tone: 0 });
    { const a = []; for (let i = 0; i < 8; i++) { const an = i / 8 * 6.2832; a.push(Math.cos(an) * .031, -.03, Math.sin(an) * .031, Math.cos(an) * .031, .03, Math.sin(an) * .031); } b.line(a); } return { muzzle: [0, 0], lh: null, grip: [0, 0], nade: true }; },
  smoke(p) { const b = p.body; b.cyl(.034, .034, .13, 8, 0, 0, 0, { tone: .33 }); b.cyl(.036, .036, .025, 8, 0, .02, 0, { tint: GREY, tone: 0 }); b.cyl(.012, .012, .03, 6, 0, .085, 0); b.box(.01, .09, .006, .032, .04, 0, { tint: AMBER, tone: 0 }); return { muzzle: [0, 0], lh: null, grip: [0, 0], nade: true }; }
};

/* Functional layers remain in each moving part, so slides, magazines and pumps keep their choreography. */
function finishGun(key, p) { const meta = GUNS[key](p), b = p.body, w = WEAPONS[key];
  if (w.melee) { b.line([.012, .0, -.09, .012, .006, -.20, -.012, .0, -.09, -.012, .006, -.20]); return meta; }
  if (w.nade) { b.cyl(.023, .023, .015, 8, 0, -.035, 0, { tone: 1 }); inkBlock(b, .027, .04, .008, 0, .005, -.035, { tone: 0 }); b.line([-.008, .0, -.04, .008, .0, -.04, -.008, .009, -.04, .008, .009, -.04]); return meta; }
  const mz = meta.muzzle; b.cyl(meta.pistol ? .0044 : .0055, meta.pistol ? .0044 : .0055, .0015, 10, 0, mz[1], -mz[0] - .001, { ax: 'z', tone: 1, edges: false });
  if (meta.pistol) { const x = key === 'p9' ? .015 : .018, z = key === 'p9' ? -.019 : -.035; inkBlock(p.bolt, .004, .017, .037, x + .001, .016, z, { tone: 1 }); inkBlock(p.bolt, .004, .012, .026, x + .003, .016, z + .002, { tone: .33 });
    for (const q of [-1, 1]) { inkBlock(b, .004, .064, .035, q * (x + .001), -.064, .07, { tone: .33 }); b.line([q * (x + .004), -.041, .063, q * (x + .004), -.080, .079, q * (x + .004), -.043, .076, q * (x + .004), -.072, .087]); } b.box(.004, .009, .024, x + .002, -.004, .041, { tone: 1 });
  } else { const z = key === 'viper' ? -.055 : -.04; inkBlock(b, .004, .022, .073, .0255, .02, z, { tone: 1 }); inkBlock(b, .007, .011, .077, .029, .009, z, { tone: .33 }); b.cyl(.009, .009, .008, 8, -.026, -.004, .012, { ax: 'x', tone: .33 }); b.line([-.031, -.004, .012, -.031, -.021, -.001]);
    if (key === 'm4' || key === 'viper') { const z0 = key === 'm4' ? -.145 : -.083, n = key === 'm4' ? 7 : 4; for (let i = 0; i < n; i++) { const z = z0 - i * .031; b.box(.054, .009, .012, 0, key === 'm4' ? .051 : .055, z, { tone: .33 }); if (key === 'm4') for (const x of [-.026, .026]) inkBlock(b, .003, .014, .018, x, .012, z, { tone: 1 }); } }
    if (key === 'm4') { inkBlock(b, .047, .121, .024, 0, -.012, .339, { tone: .66 }); b.box(.022, .012, .06, 0, -.027, .255, { tone: 1 }); b.line([.02, .015, .22, .02, .015, .305, .02, -.012, .28, .02, -.057, .31]); }
    if (key === 'ak') { inkBlock(b, .047, .109, .018, 0, -.05, .374, { tone: .66 }); for (const x of [-.025, .025]) { b.line([x, -.017, -.255, x, -.01, -.401, x, .003, -.258, x, .006, -.405]); for (let i = 0; i < 3; i++) inkBlock(b, .003, .009, .026, x, .026, -.269 - i * .045, { tone: 1 }); } b.line([.023, .018, .071, .023, .022, -.141, .023, -.006, -.02, .023, -.012, -.111]); }
    if (key === 'nova') { for (let i = 0; i < 6; i++) p.bolt.cyl(.026, .026, .006, 8, 0, -.012, -.243 - i * .027, { ax: 'z', tone: .66 }); inkBlock(b, .045, .11, .018, 0, -.05, .39, { tone: .66 }); for (let i = 0; i < 4; i++) b.cyl(.008, .008, .048, 6, -.03, -.005, -.015 + i * .019, { tone: .33 }); }
    if (key === 'awp') { for (const z of [.13, -.29]) { b.cyl(.028, .028, .008, 12, 0, .082, z, { ax: 'z', tone: .33 }); } inkBlock(b, .054, .15, .018, 0, -.036, .438, { tone: .66 }); b.cyl(.010, .010, .025, 8, .033, .048, .276, { ax: 'x', tone: 1 }); }
  }
  if (['ak', 'm4', 'viper'].includes(key)) { const x = key === 'ak' ? .0145 : .0135; for (const q of [-1, 1]) { const a = key === 'ak' ? [[.135, -.066], [.165, -.154], [.217, -.218]] : key === 'm4' ? [[.048, -.076], [.055, -.174]] : [[-.012, -.15], [-.021, -.224]]; for (let i = 0; i < 3; i++) p.mag.poly(a.map(([f, u]) => [q * x, u, -f - i * .011])); } }
  if (w.optic) { const oy = .118, z = -.07; meta.opticY = oy; b.box(.055,.008,.055,0,oy-.025,z,{tone:.66}); for(const x of [-.026,.026]) b.box(.007,.047,.032,x,oy,z,{tone:.66}); b.box(.055,.007,.032,0,oy+.023,z,{tone:.66}); b.cyl(.008,.008,.014,8,.039,oy-.013,z,{ax:'x',tone:1}); }
  return meta;
}
function viewSleeve(s, a, b, r1, r2, tone) { const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize()), m = new THREE.Matrix4().compose(A.add(B).multiplyScalar(.5), q, new V3(1, 1, .86)); s.add(new THREE.CylinderGeometry(r2, r1, d.length(), 7, 1), m, { ...(tone === undefined ? {} : { tone }), ea: 35 }); }
function viewGlove(s, f, u, support, pistol) { const z = -f, side = support ? -1 : 1, x = support && pistol ? -.028 : .006;
  inkBlock(s,.050,.058,.047,x,u-.006,z+.011,{tone:.33,r:[.12,0,support&&pistol?-.12:0],bevel:.24});
  if(support&&!pistol) { inkBlock(s,.068,.033,.076,0,u-.024,z,{tone:.33,bevel:.24}); for(let i=0;i<4;i++) { const q=z-.028+i*.018; inkLimb(s,[.030,u-.023,q],[.036,u+.001,q-.003],.015,.016,{tone:.33}); inkLimb(s,[.036,u+.001,q-.003],[.022,u+.016,q-.006],.014,.015,{tone:.33}); } inkLimb(s,[-.026,u-.015,z+.016],[-.030,u+.014,z-.011],.021,.019,{tone:.33});
  } else if(support&&pistol) { for(let i=0;i<3;i++) { const y=u+.004-i*.017; inkLimb(s,[-.045,y,z+.014],[-.042,y-.003,z-.020],.015,.018,{tone:.33}); inkLimb(s,[-.042,y-.003,z-.020],[.005,y-.006,z-.023],.014,.017,{tone:.33}); } inkLimb(s,[-.042,u+.014,z+.014],[-.039,u+.023,z-.022],.018,.019,{tone:.33});
  } else { for(let i=0;i<3;i++) { const y=u+.004-i*.017; inkLimb(s,[.030,y,z+.006],[.029,y-.004,z-.025],.016,.018,{tone:.33}); inkLimb(s,[.029,y-.004,z-.025],[-.012,y-.008,z-.027],.014,.017,{tone:.33}); } inkLimb(s,[-.021,u+.009,z+.006],[-.024,u+.021,z-.014],.020,.019,{tone:.33}); inkLimb(s,[-.024,u+.021,z-.014],[-.010,u+.018,z-.031],.017,.018,{tone:.33}); inkLimb(s,[.030,u+.021,z+.008],[.028,u+.023,z-.038],.015,.016,{tone:.33}); inkLimb(s,[.028,u+.023,z-.038],[.008,u+.015,z-.045],.014,.015,{tone:.33}); }
  const wrist=[x+side*.010,u-.028,z+.046],elbow=support?[-.11,u-.17,z+.25]:[.10,u-.19,z+.28],shoulder=support?[-.155,u-.35,z+.48]:[.18,u-.36,z+.47];
  viewSleeve(s,elbow,wrist,.050,.031,.33); viewSleeve(s,shoulder,elbow,.062,.051,.33); const cuff=wrist.map((v,i)=>v*.77+elbow[i]*.23); viewSleeve(s,cuff,wrist,.038,.035,.66); const style = G.set.actorStyle || 'scribe'; if(style==='scout') for(let i=0;i<3;i++) { const t=.15+i*.13,a=wrist.map((v,j)=>v*(1-t)+elbow[j]*t),b=wrist.map((v,j)=>v*(1-t-.04)+elbow[j]*(t+.04)); viewSleeve(s,b,a,.041,.04,1); } if(style==='warden') { inkBlock(s,.073,.068,.022,x,u-.007,z+.044,{tone:1,bevel:.25}); inkBlock(s,.064,.030,.020,cuff[0],cuff[1],cuff[2]-.035,{tone:.66,bevel:.22}); }
  inkBlock(s,.060,.062,.045,elbow[0],elbow[1],elbow[2]-.026,{tone:.66,r:[.42,0,support?-.25:.22],bevel:.25});
}

/* world (third-person / icon) model: everything merged */
const _wgCache = {};
function worldGun(key, fm, lm) {
  let c = _wgCache[key]; if (!c) { const s = new Sk('under'); const meta = finishGun(key, { body: s, mag: s, bolt: s }); c = _wgCache[key] = { src: s.bake(fm, lm), meta }; }
  const g = new THREE.Group(); if (c.src.fill) g.add(new THREE.Mesh(c.src.fill.geometry, fm)); if (c.src.ink) g.add(new LineSegments2(c.src.ink.geometry, lm)); g.userData.meta = c.meta; return g;
}

/* ---------------- first-person viewmodel ---------------- */
const VM = { off: {},
  models: {}, cur: null, key: null, kick: 0, kickR: 0, boltT: 0, cyc: 1, swX: 0, swY: 0, drawT: 1, reloadT: -1, atk: 1, atkKind: 0, insp: 1, flashT: 0, dip: 0,
  init(aspect) {
    this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(54, aspect, .01, 10);
    this.fm = fillMat({ objSpace: true, freq: 75, fog: 0, hatch: .8, hw: .13 }); this.lm = lineMat({ width: 1.7, fog: false });
    this.root = new THREE.Group(); this.scene.add(this.root);
    const sh = new THREE.Shape(); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, r = i % 2 ? .35 : 1; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const fg = new THREE.ShapeGeometry(sh); this.flash = new THREE.Group(); this.flash.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: AMBER, depthTest: false, side: THREE.DoubleSide })));
    const fl = new Sk('none'); const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, r = i % 2 ? .35 : 1; pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]); } fl.poly(pts, true);
    this.flash.add(fl.bake(null, lineMat({ width: 1.6, fog: false, depthTest: false }))); this.flash.visible = false; this.flash.traverse(o => { o.frustumCulled = false; o.renderOrder = 5; });
  },
  mats(i) { this._m = this._m || {}; if (!i) return { fm: this.fm, lm: this.lm }; if (!this._m[i]) { const fm = fillMat({ objSpace: true, freq: 75, fog: 0, hatch: .85, hw: .13 }); fm.uniforms.uInk.value.set(SKINS[i].ink); this._m[i] = { fm, lm: lineMat({ width: SKINS[i].w, fog: false, color: SKINS[i].ink }) }; } return this._m[i]; },
  build(key, skin = 0) {
    const parts = { body: new Sk('under'), mag: new Sk('under'), bolt: new Sk('under'), handR: new Sk('sun'), handL: new Sk('sun') }, meta = finishGun(key, parts);
    viewGlove(parts.handR, meta.grip[0], meta.grip[1], false, meta.pistol); if (meta.lh) viewGlove(parts.handL, meta.lh[0], meta.lh[1], true, meta.pistol);
    const g = new THREE.Group(), m = { group: g, meta, parts: {} };
    const sm = this.mats(skin); for (const k in parts) { const hand = k === 'handR' || k === 'handL', b = parts[k].bake(hand ? this.fm : sm.fm, hand ? this.lm : sm.lm); b.traverse(o => o.frustumCulled = false); g.add(b); m.parts[k] = b; }
    if (key === 'nova') m.parts.mag.visible = false;
    return m;
  },
  show(key) { if (this.cur) this.root.remove(this.cur.group); const sk = PROG.skin(key), id = key + sk + ':' + (G.set.actorStyle || 'scribe'); this.cur = this.models[id] || (this.models[id] = this.build(key, sk)); this.key = key; this.root.add(this.cur.group);
    this.cur.group.add(this.flash); const mz = this.cur.meta.muzzle; this.flash.position.set(0, mz[1], -mz[0] - .03); this.drawT = 0; this.reloadT = -1; this.atk = 1; this.insp = 1; this.cyc = 1; },
  fire(w) { this.kick = Math.min(this.kick + w.vm, .22); this.kickR = Math.min(this.kickR + w.vm * 1.6, .4); this.boltT = 1; this.flashT = .05; this.flash.rotation.z = rand(6.28); this.flash.scale.setScalar(rand(.05, .085) * (w.snd === 'm4' ? .5 : 1)); if (w.bolt || w.pump) this.cyc = 0; this.insp = 1; },
  update(dt, pl, w, mdx, mdy) {
    const c = this.cur; if (!c) return; const meta = c.meta, P = c.parts, r = this.root;
    this.kick = damp(this.kick, 0, 13, dt); this.kickR = damp(this.kickR, 0, 11, dt); this.boltT = damp(this.boltT, 0, 28, dt); this.dip = damp(this.dip, 0, 9, dt);
    this.swX = damp(this.swX, clamp(-mdx * .0004, -.02, .02), 11, dt); this.swY = damp(this.swY, clamp(mdy * .0004, -.018, .018), 11, dt);
    this.drawT = Math.min(1, this.drawT + dt / w.draw); if (this.flashT > 0) this.flashT -= dt; this.flash.visible = this.flashT > 0;
    const sp = Math.hypot(pl.vel.x, pl.vel.z) / 5, a = pl.onGround ? Math.min(sp, 1) : 0, ph = pl.bobPhase, e = 1 - Math.pow(1 - this.drawT, 3);
    const O = VM.off, narrow = this.cam.aspect < 1.4, compact = innerHeight < 500; let x = O.x ?? (narrow ? .12 : .22), y = O.y ?? -.185, z = O.z ?? (compact ? -.86 : -.82), rx = 0, ry = .11, rz = -.025;
    if (meta.pistol) { x = O.x ?? (narrow ? .07 : .12); y = O.y ?? -.15; z = O.z ?? -.61; ry = .035; rz = -.018; } if (meta.knife) { x = .13; y = -.13; z = -.3; rx = .5; ry = .7; rz = -.4; } if (meta.nade) { x = .13; y = -.12; z = -.3; }
    x += Math.sin(ph) * .0065 * a + this.swX * .5; y += -Math.abs(Math.cos(ph)) * .007 * a + .004 * a - this.swY * .4 - this.dip - pl.crouchAmt * .012 + clamp(pl.vel.y, -6, 6) * -.0035;
    z += this.kick; rx += this.kickR * .55 + this.swY * .6; ry += this.swX * .8; rz += this.swX * -.9 + Math.sin(ph) * .01 * a;
    rx -= (1 - e) * 1.0; y -= (1 - e) * .22;
    // reload choreography
    let magY = 0, magVis = true, lhX = 0, lhY = 0, lhZ = 0;
    if (this.reloadT >= 0) { const t = this.reloadT, env = Math.min(1, t / .14) * Math.min(1, (1 - t) / .14); rz += env * (meta.pistol ? -.5 : .42); rx += env * .22; y -= env * .03; x -= env * .02;
      const mo = t < .2 ? 0 : t < .4 ? (t - .2) / .2 : t < .58 ? 1 : t < .78 ? 1 - (t - .58) / .2 : 0; magY = -mo * .3; magVis = !(t > .4 && t < .58) ; lhY = magY * .9; lhZ = mo * .06;
      if (this.key === 'nova') { const k = (t * 5) % 1; magVis = t > .1 && t < .9; magY = 0; lhY = -.05 + Math.sin(k * Math.PI) * .04; lhZ = .22 - Math.sin(k * Math.PI) * .05; P.mag.position.set(0, .03 + Math.sin(k * Math.PI) * .02, .1 - k * .1); }
      if (t > .84 && t < .97) { const k = Math.sin((t - .84) / .13 * Math.PI); P.bolt.position.z = k * .05; if (!meta.pistol && !meta.lhOnBolt) { lhX = .05 * k; lhY += .06 * k; lhZ = .2 * k; } } }
    if (this.key !== 'nova') { P.mag.position.y = magY; } P.mag.visible = this.key === 'nova' ? (this.reloadT >= 0 && magVis) : magVis;
    if (this.reloadT < 0 || this.reloadT <= .84) P.bolt.position.z = this.boltT * (meta.pistol ? .035 : .03);
    // bolt / pump cycle
    if (this.cyc < 1) { this.cyc = Math.min(1, this.cyc + dt / (w.bolt ? 1.0 : .55)); const k = Math.sin(clamp((this.cyc - .25) / .6, 0, 1) * Math.PI);
      if (w.bolt) { rz += k * .22; rx += k * .08; P.bolt.position.z = k * .07; P.bolt.rotation.z = k * .6; } else { P.bolt.position.z = k * .085; lhZ = k * .085; } }
    P.handL.position.set(lhX, lhY, lhZ);
    // knife / grenade swings
    if (this.atk < 1) { this.atk = Math.min(1, this.atk + dt / (this.atkKind ? .5 : .3)); const k = Math.sin(this.atk * Math.PI);
      if (meta.nade) { z -= k * .22; y += k * .1; rx -= k * .8; } else if (this.atkKind) { z -= k * .28; rx -= k * .3; ry -= k * .5; } else { x -= k * .2; ry += k * 1.0; rz += k * .6; z -= k * .08; } }
    if (this.insp < 1) { this.insp = Math.min(1, this.insp + dt / 2.6); const k = Math.sin(this.insp * Math.PI), q = Math.sin(this.insp * 6.2832); ry += k * .95; rz += q * .4; x -= k * .06; y += k * .025; rx += k * .15; }
    this.ads = damp(this.ads || 0, pl.scoped && w.optic ? 1 : 0, 18, dt); const ad = this.ads; x *= 1 - ad; y = y * (1 - ad) + (-(meta.opticY || .118) - this.kick * .04) * ad; z = z * (1 - ad) - .44 * ad; rx *= 1 - ad * .9; ry *= 1 - ad; rz *= 1 - ad; r.position.set(x, y, z); r.rotation.set(rx, ry, rz, 'YXZ'); r.visible = !(pl.scoped > 0 && w.scope) && pl.alive;
  }
};

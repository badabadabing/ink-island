'use strict';
/* ============ INK ISLAND · loot: item table, ground spawns, pickup, inventory, healing, death drops ============ */
const AMMO = { m4: '556', viper: '9mm', p9: '9mm', ak: '762', nova: '12g', deagle: '45', awp: '300' };
const ITEMS = {
  m4: { kind: 'gun', name: 'M4 工笔', w: 1 }, ak: { kind: 'gun', name: 'AK 焦墨', w: 1 }, viper: { kind: 'gun', name: '飞白 冲锋枪', w: 1 }, nova: { kind: 'gun', name: '泼墨 霰弹枪', w: 1 }, awp: { kind: 'gun', name: '一笔 狙击枪', w: 1 }, p9: { kind: 'gun', name: 'P9 速写', w: 1 }, deagle: { kind: 'gun', name: '重墨 .50', w: 1 },
  a556: { kind: 'ammo', t: '556', name: '5.56 弹', qty: 30, unit: 30 }, a762: { kind: 'ammo', t: '762', name: '7.62 弹', qty: 30, unit: 30 }, a9mm: { kind: 'ammo', t: '9mm', name: '9 mm 弹', qty: 30, unit: 30 }, a12g: { kind: 'ammo', t: '12g', name: '12 号霰弹', qty: 10, unit: 10 }, a45: { kind: 'ammo', t: '45', name: '.45 弹', qty: 14, unit: 14 }, a300: { kind: 'ammo', t: '300', name: '.300 弹', qty: 5, unit: 5 },
  vest1: { kind: 'vest', lv: 1, name: '一级 纸甲', ap: 30 }, vest2: { kind: 'vest', lv: 2, name: '二级 纸甲', ap: 50 }, vest3: { kind: 'vest', lv: 3, name: '三级 纸甲', ap: 70 },
  helm1: { kind: 'helm', lv: 1, name: '一级 纸盔' }, helm2: { kind: 'helm', lv: 2, name: '二级 纸盔' }, helm3: { kind: 'helm', lv: 3, name: '三级 纸盔' },
  bag1: { kind: 'bag', lv: 1, name: '一级 书包' }, bag2: { kind: 'bag', lv: 2, name: '二级 书包' }, bag3: { kind: 'bag', lv: 3, name: '三级 书包' },
  band: { kind: 'med', name: '绷带', t: 4, heal: 10, cap: 75, w: 1 }, kit: { kind: 'med', name: '急救包', t: 6, heal: 75, cap: 75, w: 2 }, pill: { kind: 'med', name: '止痛药', t: 6, boost: 1, w: 1 },
  s2: { kind: 'scope', name: '二倍 镜', fov: 36, lv: 2 }, s4: { kind: 'scope', name: '四倍 镜', fov: 20, lv: 4 },
  he: { kind: 'nade', name: '墨爆弹', w: 1 }, flash: { kind: 'nade', name: '曝光弹', w: 1 }, smoke: { kind: 'nade', name: '烟墨弹', w: 1 },
  sup: { kind: 'att', name: '消音器', slot: 'sup' }, xmag: { kind: 'att', name: '扩容弹匣', slot: 'mag' }, grip: { kind: 'att', name: '垂直握把', slot: 'grip' }
};
const ITEM_W = k => { const it = ITEMS[k]; return it.kind === 'gun' || it.kind === 'vest' || it.kind === 'helm' || it.kind === 'bag' || it.kind === 'scope' || it.kind === 'att' ? 0 : it.w || 1; };
const BAG_CAP = lv => [8, 12, 16, 20][lv || 0];
/* spawn weights: common ammo and meds, guns less, armour tiers rarer */
const LOOT_TABLE = [['a556', 9], ['a762', 8], ['a9mm', 9], ['a12g', 4], ['a45', 3], ['a300', 2], ['band', 9], ['kit', 3], ['pill', 4], ['m4', 3], ['ak', 3], ['viper', 4], ['nova', 3], ['p9', 4], ['deagle', 2], ['awp', 1],
  ['vest1', 4], ['vest2', 2.2], ['vest3', .9], ['helm1', 4], ['helm2', 2.2], ['helm3', .9], ['bag1', 3], ['bag2', 1.6], ['bag3', .7], ['s2', 1.6], ['s4', .8], ['he', 2.2], ['flash', 1.4], ['smoke', 1.8], ['sup', 1.1], ['xmag', 1.6], ['grip', 1.4]];
const LOOT = { items: [], inst: {}, icons: {}, spots: [], _m: new THREE.Matrix4(), _q: new THREE.Quaternion(), _s: new V3(1, 1, 1), _p: new V3(), _zero: new THREE.Matrix4().makeScale(0, 0, 0) };
const _lootPaper = '#f5f2ea', _lootInk = '#16161c';

/* ---- icons: a paper tag per item kind, drawn once on a canvas ---- */
function lootIcon(k) {
  if (LOOT.icons[k]) return LOOT.icons[k]; const it = ITEMS[k], c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d');
  g.fillStyle = _lootPaper; g.fillRect(0, 0, 256, 192); g.strokeStyle = _lootInk; g.lineWidth = 5; g.strokeRect(6, 6, 244, 180); g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.fillStyle = _lootInk;
  const line = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); };
  if (it.kind === 'gun') { if (G.icons && G.icons[k]) { const im = new Image(); im.src = G.icons[k]; im.onload = () => { g.drawImage(im, 20, 30, 216, 78); tex.needsUpdate = true; }; } }
  else if (it.kind === 'ammo') { for (let i = 0; i < 4; i++) { const x = 70 + i * 32; g.beginPath(); g.moveTo(x, 120); g.lineTo(x, 70); g.quadraticCurveTo(x + 9, 48, x + 18, 70); g.lineTo(x + 18, 120); g.closePath(); g.stroke(); g.fillRect(x, 108, 18, 12); } }
  else if (it.kind === 'vest') { line([[90, 40], [110, 60], [146, 60], [166, 40], [190, 60], [180, 130], [76, 130], [66, 60], [90, 40]]); for (let i = 0; i < it.lv; i++) g.fillRect(104 + i * 18, 84, 10, 30); }
  else if (it.kind === 'helm') { g.beginPath(); g.arc(128, 96, 48, Math.PI, 0); g.lineTo(176, 112); g.lineTo(80, 112); g.closePath(); g.stroke(); for (let i = 0; i < it.lv; i++) g.fillRect(108 + i * 16, 118, 8, 8); }
  else if (it.kind === 'bag') { g.strokeRect(84, 56, 88, 84); g.strokeRect(100, 36, 56, 20); line([[84, 92], [172, 92]]); for (let i = 0; i < it.lv; i++) g.fillRect(100 + i * 20, 106, 12, 12); }
  else if (it.kind === 'med') { if (it.boost) { g.beginPath(); g.ellipse(128, 96, 54, 28, -.6, 0, 6.3); g.stroke(); line([[100, 116], [156, 76]]); } else { g.strokeRect(70, 56, 116, 80); g.fillRect(118, 70, 20, 52); g.fillRect(102, 86, 52, 20); if (it.heal < 20) { g.fillStyle = _lootPaper; g.fillRect(74, 60, 108, 72); g.fillStyle = _lootInk; line([[80, 70], [176, 122]]); line([[80, 122], [176, 70]]); } } }
  else if (it.kind === 'scope') { g.beginPath(); g.arc(128, 96, 42, 0, 6.3); g.stroke(); line([[86, 96], [170, 96]]); line([[128, 54], [128, 138]]); g.font = 'bold 34px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillText(it.lv + 'x', 200, 150); }
  g.font = 'bold 22px "IBM Plex Mono", "PingFang SC", monospace'; g.textAlign = 'center'; g.fillText(it.name, 128, 174);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8; return LOOT.icons[k] = tex;
}
function lootInit() { lgInit(); }
function lootClear() { LOOT.items.length = 0; lgClearAll(); }
function lootHide(it) { it.alive = false; lgMark(it); }
function lootSpawn(k, x, y, z, qty) { const item = { k, x, y, z, alive: true, qty: qty || ITEMS[k].qty || 1, yaw: rand(6.28) }; LOOT.items.push(item); lgMark(item); if (LOOT.items.length > 2400) LOOT.items = LOOT.items.filter(i => i.alive); return item; }
function lootNearList(e, radius = 2.6) { const out = []; for (const it of LOOT.items) { if (!it.alive || it.inCrate) continue; const d = Math.hypot(it.x - e.pos.x, it.z - e.pos.z); if (d < radius && Math.abs(it.y - e.pos.y) < 1.6) out.push([d, it]); } out.sort((a, b) => a[0] - b[0]); return out.map(o => o[1]); }
/* d18: what an item is (sticker colour + one-character glyph) and whether this entity should take it; lootUse mirrors every refusal in invTake */
const LOOT_CAT = k => { const K = (ITEMS[k] || {}).kind; return K === 'gun' ? ['gun', '#ff8a3d', '枪'] : K === 'ammo' ? ['ammo', '#f2b33d', '弹'] : K === 'med' ? ['med', '#33b877', '药'] : K === 'nade' ? ['nade', '#ff5a6e', '投'] : K === 'scope' || K === 'att' ? ['mod', '#9b6ef0', '配'] : ['gear', '#3f8fe0', '装']; };
const MED_AUTO = { band: 10, kit: 3, medkit: 2, pill: 3, drink: 3, adren: 2 };
function lootUse(e, it) { const d = ITEMS[it.k]; if (!d || !e.inv) return { ok: false, tag: '' }; const fits = w => invLoad(e) + w <= BAG_CAP(e.bagLv) + .01, nm = k => ITEMS[k] ? ITEMS[k].name : k;
  if (d.kind === 'gun') { const sl = WEAPONS[it.k].slot, had = e.inv[sl]; return had === it.k ? { ok: false, tag: '已有' } : !had ? { ok: true, auto: true, up: true, tag: '空槽' } : { ok: true, tag: '换掉 ' + nm(had) }; }
  if (d.kind === 'ammo') { const mine = [1, 2].some(q => e.inv[q] && AMMO[e.inv[q]] === d.t), f = fits(it.qty / 30); return { ok: f, auto: f && mine, up: mine && f, tag: !f ? '装不下' : mine ? '能用' : '' }; }
  if (d.kind === 'med') { const f = fits(d.w); return { ok: f, auto: f && (e.meds[it.k] || 0) < (MED_AUTO[it.k] || 2), tag: f ? '' : '装不下' }; }
  if (d.kind === 'nade') { const n = e.nades[it.k] || 0, f = n < 3 && fits(1); return { ok: f, auto: f && n < 2, tag: n >= 3 ? '满了' : f ? '' : '装不下' }; }
  if (d.kind === 'vest') { const dur = it.dur ?? d.ap, ok = !e.vestLv || dur > e.armor + .5; return { ok, auto: ok, up: ok, tag: !e.vestLv ? '可穿' : ok ? `更耐打 ${Math.ceil(dur)} > ${Math.ceil(e.armor)}` : '不如身上的' }; }
  if (d.kind === 'helm') { const ok = d.lv > e.helmLv; return { ok, auto: ok, up: ok, tag: ok ? (e.helmLv ? '更好' : '可戴') : '不如身上的' }; }
  if (d.kind === 'bag') { const ok = d.lv > e.bagLv; return { ok, auto: ok, up: ok, tag: ok ? (e.bagLv ? '更大' : '可背') : '不如身上的' }; }
  if (d.kind === 'scope') { const ok = !e.scope || ITEMS[e.scope].lv < d.lv; return { ok, auto: ok, up: ok, tag: ok ? '更好' : '已有' }; }
  if (d.kind === 'att') { const ok = !e.att[d.slot]; return { ok, auto: ok, up: ok, tag: ok ? '可装' : '已有' }; }
  if (d.kind === 'suit') { const ok = !e.ghillie; return { ok, auto: ok, up: ok, tag: ok ? '可穿' : '已有' }; }
  return { ok: false, tag: '' }; }
/* nearby items with the takeable ones first (each group still nearest first): F and the pickup list both read this */
function lootNearSorted(e, r) { const L = lootNearList(e, r), u = new Map(L.map(i => [i, lootUse(e, i)])); return L.filter(i => u.get(i).up).concat(L.filter(i => u.get(i).ok && !u.get(i).up), L.filter(i => !u.get(i).ok)); }
const lootPick = () => { let tot = 0; for (const [, w] of LOOT_TABLE) tot += w; let r = Math.random() * tot; for (const [k, w] of LOOT_TABLE) { r -= w; if (r <= 0) return k; } return 'band'; };
/* fill every recorded spot with 1–3 items; towns get the spots in towns.js */
function lootPopulate() { lootClear(); for (const s of LOOT.spots) { const n = Math.random() < .25 ? 0 : 1 + (Math.random() < .5 ? 1 : 0) + (Math.random() < .25 ? 1 : 0); for (let i = 0; i < n; i++) { const a = rand(6.28), r = rand(.2, .8); lootSpawn(lootPick(), s.x + Math.cos(a) * r, s.y, s.z + Math.sin(a) * r); } } }
function lootNear(e, radius = 1.8) { let best = null, bd = radius; for (const it of LOOT.items) { if (!it.alive || it.inCrate) continue; const d = Math.hypot(it.x - e.pos.x, it.z - e.pos.z); if (d < bd && Math.abs(it.y - e.pos.y) < 1.6) { bd = d; best = it; } } return best; }
function lootNearest(e, filter, radius = 60) { let best = null, bd = radius; for (const it of LOOT.items) { if (!it.alive || !filter(it)) continue; const d = Math.hypot(it.x - e.pos.x, it.z - e.pos.z); if (d < bd) { bd = d; best = it; } } return best; }

/* ---- inventory on an entity: inv{1,2}, pool{ammo type}, meds{}, vestLv, helmLv, bagLv, scope ---- */
function invInit(e) { e.inv = { 1: null, 2: null }; e.ammo = {}; e.pool = {}; e.meds = { band: 0, kit: 0, pill: 0, medkit: 0, drink: 0, adren: 0 }; e.nades = { he: 0, flash: 0, smoke: 0, fire: 0 }; e.att = { sup: 0, mag: 0, grip: 0, comp: 0, stock: 0, dot: 0 }; e.modes = {}; e.vestLv = 0; e.helmLv = 0; e.bagLv = 0; e.scope = null; e.armor = 0; e.helmet = false; e.boost = 0; e.heal = null; e.ghillie = false; if (e.model && e.model.ghillie) ghillieStrip(e); }
function invLoad(e) { let w = 0; for (const t in e.pool) w += e.pool[t] / 30; for (const k in e.meds) w += e.meds[k] * ITEMS[k].w; for (const k in e.nades) w += e.nades[k]; return w; }
/* the bag's invariants: every gun in a slot has an ammo record, no ammo record without its gun, the weapon in hand is in the bag (or the knife / a grenade); violations are repaired and logged so the smoke test can fail on them */
function invCheck(e, where) { if (!e || !e.inv) return 0; let bad = 0; const warn = m => { bad++; console.warn('[INV] ' + (e.name || '?') + ' @' + where + ': ' + m); };
  for (const s of [1, 2]) { const k = e.inv[s]; if (!k) continue; if (!WEAPONS[k] || WEAPONS[k].slot !== s) { warn('slot ' + s + ' holds ' + k); e.inv[s] = null; continue; } if (e.isPlayer && !e.ammo[k]) { warn('no ammo record for ' + k); const w = WEAPONS[k]; e.ammo[k] = { mag: 0, get res() { return e.pool[AMMO[k]] || 0; }, set res(v) { e.pool[AMMO[k]] = v; } }; } }
  if (e.isPlayer) { for (const k in e.ammo) if (e.inv[1] !== k && e.inv[2] !== k) { warn('orphan ammo record ' + k); delete e.ammo[k]; } const c = e.cur; if (c && c !== 'knife' && !(WEAPONS[c] && WEAPONS[c].nade) && e.inv[1] !== c && e.inv[2] !== c) { warn('holding ' + c + ' which is not in the bag'); if (typeof switchTo === 'function') switchTo(e.inv[1] || e.inv[2] || 'knife'); } }
  else if (e.weapon && e.weapon !== 'knife' && !(WEAPONS[e.weapon] && WEAPONS[e.weapon].nade) && e.inv[1] !== e.weapon && e.inv[2] !== e.weapon) { warn('bot holds ' + e.weapon + ' which is not in the bag'); if (typeof setEntWeapon === 'function') setEntWeapon(e, e.inv[1] || e.inv[2] || 'knife'); }
  return bad; }
function invGive(e, k) { const w = WEAPONS[k]; e.inv[w.slot] = k; e.ammo[k] = { mag: w.mag, get res() { return e.pool[AMMO[k]] || 0; }, set res(v) { e.pool[AMMO[k]] = v; } }; }
/* take an item; returns a message, or false when it does not fit */
function invTake(e, it) {
  const d = ITEMS[it.k], isPl = e.isPlayer, give = (k, q) => { if (isPl) banner('', '', ''); };
  if (d.kind === 'gun') { const slot = WEAPONS[it.k].slot, had = e.inv[slot]; if (had === it.k) return false; if (had) { lootDrop(e, had, it.x, it.z, it.y); delete e.ammo[had]; } invGive(e, it.k); if (isPl) { lootHide(it); switchTo(it.k); invCheck(e, 'take'); return `拾取 ${d.name}`; } else setEntWeapon(e, it.k); lootHide(it); invCheck(e, 'take'); return d.name; }
  if (d.kind === 'ammo') { if (invLoad(e) + it.qty / 30 > BAG_CAP(e.bagLv) + .01) return false; e.pool[d.t] = (e.pool[d.t] || 0) + it.qty; lootHide(it); return `${d.name} ×${it.qty}`; }
  if (d.kind === 'med') { if (invLoad(e) + d.w > BAG_CAP(e.bagLv) + .01) return false; e.meds[it.k]++; lootHide(it); return d.name; }
  if (d.kind === 'vest') { const dur = it.dur ?? d.ap; if (e.vestLv && dur <= e.armor + .5) return false; if (e.vestLv && e.armor > 0) lootDrop(e, 'vest' + e.vestLv, it.x, it.z, it.y).dur = e.armor; e.vestLv = d.lv; e.armor = dur; lootHide(it); return d.name; }
  if (d.kind === 'helm') { if (e.helmLv >= d.lv) return false; if (e.helmLv) lootDrop(e, 'helm' + e.helmLv, it.x, it.z, it.y); e.helmLv = d.lv; e.helmet = true; lootHide(it); return d.name; }
  if (d.kind === 'bag') { if (e.bagLv >= d.lv) return false; if (e.bagLv) lootDrop(e, 'bag' + e.bagLv, it.x, it.z, it.y); e.bagLv = d.lv; lootHide(it); return d.name; }
  if (d.kind === 'suit') { if (e.ghillie) return false; e.ghillie = true; ghillieWear(e); lootHide(it); return d.name; }
  if (d.kind === 'nade') { if (e.nades[it.k] >= 3 || invLoad(e) + 1 > BAG_CAP(e.bagLv) + .01) return false; e.nades[it.k]++; if (!e.isPlayer) e.nade = it.k; lootHide(it); return d.name; }
  if (d.kind === 'att') { if (e.att[d.slot]) return false; e.att[d.slot] = 1; lootHide(it); if (e.isPlayer && typeof attachVisuals === 'function') attachVisuals(); return d.name; }
  if (d.kind === 'scope') { if (e.scope && ITEMS[e.scope].lv >= d.lv) return false; if (e.scope) lootDrop(e, e.scope, it.x, it.z, it.y); e.scope = it.k; lootHide(it); return d.name; }
  return false;
}
function lootDrop(e, k, x, z, y) { const a = rand(6.28); let px = x + Math.cos(a) * .5, pz = z + Math.sin(a) * .5; if (y === undefined && MAP.reach && !MAP.reach[navIdx(px, pz)]) { const p = navPos(navSnap(px, pz)); if (Math.hypot(p.x - px, p.z - pz) < 6) { px = p.x; pz = p.z; } } return lootSpawn(k, px, y !== undefined ? y : MAP.floorAt(px, pz), pz); }
/* everything the dead carried, scattered around the body */
function lootDropAll(e) { const x = e.pos.x, z = e.pos.z, y = MAP.floorAt(x, z); for (const s of [1, 2]) if (e.inv[s]) { lootDrop(e, e.inv[s], x, z, y); } for (const t in e.pool) if (e.pool[t] >= 5) { const k = 'a' + t; lootDrop(e, k, x, z, y).qty = e.pool[t]; } for (const k in e.meds) for (let i = 0; i < Math.min(3, e.meds[k]); i++) lootDrop(e, k, x, z, y); if (e.vestLv) lootDrop(e, 'vest' + e.vestLv, x, z, y).dur = e.armor; if (e.helmLv) lootDrop(e, 'helm' + e.helmLv, x, z, y); if (e.scope) lootDrop(e, e.scope, x, z, y); for (const k in e.nades) for (let i = 0; i < e.nades[k]; i++) lootDrop(e, k, x, z, y); for (const k in e.att) if (e.att[k]) lootDrop(e, k === 'mag' ? 'xmag' : k, x, z, y); }
/* drop one unit of something from the inventory at the feet */
function invDropN(e, k, n) { const d = ITEMS[k]; if (!d || d.kind !== 'ammo' || !(e.pool[d.t] > 0)) return false; n = Math.min(e.pool[d.t], n); e.pool[d.t] -= n; lootDrop(e, k, e.pos.x, e.pos.z, e.pos.y).qty = n; return true; }
function invDrop(e, k) { const y = e.pos.y, x = e.pos.x, z = e.pos.z, d = ITEMS[k]; if (!d) return false;
  if (d.kind === 'gun') { const slot = WEAPONS[k].slot; if (e.inv[slot] !== k) return false; e.inv[slot] = null; delete e.ammo[k]; lootDrop(e, k, x, z, y); if (e.isPlayer && e.cur === k) switchTo(e.inv[1] || e.inv[2] || 'knife'); else if (!e.isPlayer && e.weapon === k && typeof setEntWeapon === 'function') setEntWeapon(e, e.inv[1] || e.inv[2] || 'knife'); invCheck(e, 'drop'); return true; }
  if (d.kind === 'ammo') { const n = Math.min(e.pool[d.t] || 0, d.qty); if (!n) return false; e.pool[d.t] -= n; lootDrop(e, k, x, z, y).qty = n; return true; }
  if (d.kind === 'med') { if (!e.meds[k]) return false; e.meds[k]--; lootDrop(e, k, x, z, y); return true; } if (d.kind === 'nade') { if (!e.nades[k]) return false; e.nades[k]--; lootDrop(e, k, x, z, y); return true; }
  if (d.kind === 'att') { if (!e.att[d.slot]) return false; e.att[d.slot] = 0; lootDrop(e, k, x, z, y); if (e.isPlayer) attachVisuals(); return true; } if (d.kind === 'scope') { if (e.scope !== k) return false; e.scope = null; lootDrop(e, k, x, z, y); return true; }
  if (d.kind === 'vest') { if (!e.vestLv) return false; const ar = e.armor; e.vestLv = 0; e.armor = 0; lootDrop(e, k, x, z, y).dur = ar; return true; } if (d.kind === 'helm') { if (!e.helmLv) return false; e.helmLv = 0; e.helmet = false; lootDrop(e, k, x, z, y); return true; } if (d.kind === 'bag') { if (!e.bagLv) return false; e.bagLv = 0; lootDrop(e, k, x, z, y); return true; } if (d.kind === 'suit') { if (!e.ghillie) return false; e.ghillie = false; ghillieStrip(e); lootDrop(e, k, x, z, y); return true; } return false; }

/* ---- healing: a timed action, cancelled by damage ---- */
function healStart(e, k) { const d = ITEMS[k]; if (!e.meds[k] || e.heal || (d.heal && e.hp >= d.cap) || (d.boost && e.boost > 100 - d.boost * .5)) return false; e.heal = { k, t: 0, dur: d.t }; if (e.isPlayer) SFX.click(900, .2); return true; }
function healUpdate(e, dt) { if (e.heal) { const h = e.heal; h.t += dt; if (h.t >= h.dur) { const d = ITEMS[h.k]; e.meds[h.k]--; if (d.heal) e.hp = Math.min(d.cap, Math.max(e.hp, Math.min(d.cap, e.hp + d.heal))); if (d.boost) e.boost = Math.min(100, e.boost + d.boost); e.heal = null; if (e.isPlayer) SFX.ui(1200); } }
  if (e.boost > 0) { e.boost -= dt * 1.6; if (e.hp < 100) e.hp = Math.min(100, e.hp + dt * (e.boost > 50 ? 2.2 : 1.2)); } }
function healCancel(e) { if (e.heal) { e.heal = null; if (e.isPlayer) SFX.deny(); if (e.act && e.act.type === 'heal') e.act = null; } }
const adsFovFor = e => { const w = WEAPONS[e.cur || e.weapon]; if (w.scope) return 26; if (e.scope && !w.melee && !w.pellets) return ITEMS[e.scope].fov; if (e.att && e.att.dot && !w.optic && !w.adsFov) return 56; return Math.min(G.set.fov * .84, w.adsFov || 62); };

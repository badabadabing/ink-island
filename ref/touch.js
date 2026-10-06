'use strict';
/* ============ INK STRIKE · touch: twin-thumb controls, aim friction, auto-fire ============ */
const TOUCH = { on: false, move: { x: 0, y: 0 }, joy: null, looks: new Map(), btns: new Map(), aimOn: false, aimT: 0, aimCheck: 0, crouch: false, auto: false };
function touchHeld(k) { for (const b of TOUCH.btns.values()) if (b.dataset.b === k) return true; return false; }
function touchReset() { if (TOUCH.layoutCancel) TOUCH.layoutCancel(); TOUCH.btns.clear(); TOUCH.looks.clear(); TOUCH.joy = null; TOUCH.move.x = TOUCH.move.y = 0; TOUCH.crouch = TOUCH.aimOn = TOUCH.auto = false; TOUCH.aimT = TOUCH.aimCheck = 0; G.fire = G.alt = G.fireEdge = G.altEdge = false; G.keys.Space = G.keys.KeyE = G.keys.KeyC = false; document.querySelectorAll('#touch .dn, #touch .lock').forEach(b => b.classList.remove('dn', 'lock')); if ($('joyBase')) $('joyBase').style.display = 'none'; }

function initTouch() {
  TOUCH.on = true; G.noLock = true; document.body.classList.add('touch');
  if (G.set.autoFire === undefined) G.set.autoFire = true; if (G.set.tsens === undefined) G.set.tsens = 1; if (G.set.touchAccel === undefined) G.set.touchAccel = false;
  const L = $('touch'), knob = $('joyKnob'), base = $('joyBase'); document.querySelectorAll('#tTop [data-b]').forEach(b => { if (!b.id) b.id = 't' + b.dataset.b[0].toUpperCase() + b.dataset.b.slice(1); });
  const btnOf = el => el && el.closest ? el.closest('[data-b]') : null;
  const press = (b, down) => {
    const k = b.dataset.b, held = down || touchHeld(k); if (G.player && !G.player.alive && ['fire', 'alt', 'jump', 'use', 'crouch', 'reload', 'swap'].includes(k)) { if (down && (k === 'fire' || k === 'alt') && typeof cycleSpectator === 'function') cycleSpectator(k === 'fire' ? 1 : -1); return; } if (k !== 'crouch') b.classList.toggle('dn', down || [...TOUCH.btns.values()].includes(b));
    if (k === 'fire') { G.fire = held || TOUCH.auto; if (down) G.fireEdge = true; }
    else if (k === 'alt') { G.alt = held; if (down) G.altEdge = true; }
    else if (k === 'jump') G.keys.Space = held;
    else if (k === 'use') G.keys.KeyE = held;
    else if (!down) return;
    else if (k === 'crouch') { TOUCH.crouch = !TOUCH.crouch; G.keys.KeyC = TOUCH.crouch; b.classList.toggle('dn', TOUCH.crouch); }
    else if (k === 'reload') onKey('KeyR');
    else if (k === 'swap') { const pl = G.player; if (pl && pl.alive) { const order = weaponOrder(pl); switchTo(order[(order.indexOf(pl.cur) + 1) % order.length]); } }
    else if (k === 'buy') toggleBuy();
    else if (k === 'map') toggleMap();
    else if (k === 'pause') setPause(true);
    else if (k === 'board') { const on = !$('board').classList.contains('on'); if (on) drawBoard(); $('board').classList.toggle('on', on); }
  };
  L.addEventListener('touchstart', e => { e.preventDefault(); if (TOUCH.edit || G.paused || G.buyOpen || G.mapOpen || G.state === 'menu' || G.state === 'matchEnd') return; SFX.init();
    for (const t of e.changedTouches) { const b = btnOf(t.target);
      if (b) { TOUCH.btns.set(t.identifier, b); press(b, true); if (G.player && G.player.alive && (b.dataset.b === 'fire' || b.dataset.b === 'alt')) TOUCH.looks.set(t.identifier, { x: t.clientX, y: t.clientY }); }
      else if (!TOUCH.joy && (t.clientX < innerWidth * .42 || (G.set.joyPos && Math.hypot(t.clientX - layoutJoyCenter().x, t.clientY - layoutJoyCenter().y) < 62 * layoutJoyScale()))) { const c = G.set.joyPos ? layoutJoyCenter() : { x: t.clientX, y: t.clientY }; TOUCH.joy = { id: t.identifier, x: c.x, y: c.y }; base.style.display = 'block'; base.style.left = c.x + 'px'; base.style.top = c.y + 'px'; knob.style.transform = 'translate(-50%,-50%)'; }
      else TOUCH.looks.set(t.identifier, { x: t.clientX, y: t.clientY }); } }, { passive: false });
  L.addEventListener('touchmove', e => { e.preventDefault(); if (TOUCH.edit) return; if (G.paused || G.buyOpen || G.mapOpen) { touchReset(); return; } const pl = G.player;
    for (const t of e.changedTouches) {
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) { const R = 58 * layoutJoyScale(); let dx = t.clientX - TOUCH.joy.x, dy = t.clientY - TOUCH.joy.y; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } TOUCH.move.x = d < R * .12 ? 0 : dx / R; TOUCH.move.y = d < R * .12 ? 0 : dy / R; knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; }
      const lk = TOUCH.looks.get(t.identifier);
      if (lk && pl && !G.paused) { const dx = t.clientX - lk.x, dy = t.clientY - lk.y; lk.x = t.clientX; lk.y = t.clientY; const sp = Math.hypot(dx, dy), acc = G.set.touchAccel ? 1 + Math.min(1.2, sp * .035) : 1, k = .0046 * G.set.tsens * (camera.fov / G.set.fov) * acc * (TOUCH.aimOn ? .5 : 1);
        pl.yaw -= dx * k; pl.pitch = clamp(pl.pitch - dy * k * .8, -1.54, 1.54); G.mdx += dx * 2; G.mdy += dy * 2; } } }, { passive: false });
  const end = e => { e.preventDefault(); for (const t of e.changedTouches) { const b = TOUCH.btns.get(t.identifier); if (b) { TOUCH.btns.delete(t.identifier); press(b, false); }
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) { TOUCH.joy = null; TOUCH.move.x = TOUCH.move.y = 0; base.style.display = 'none'; } TOUCH.looks.delete(t.identifier); } };
  L.addEventListener('touchend', end, { passive: false }); L.addEventListener('touchcancel', e => { e.preventDefault(); touchReset(); }, { passive: false });
  $('board').onclick = () => $('board').classList.remove('on');
  const af = $('sAuto'); af.checked = G.set.autoFire; af.onchange = () => { G.set.autoFire = af.checked; if (!af.checked && TOUCH.auto) { TOUCH.auto = false; G.fire = touchHeld('fire'); } localStorage.setItem('inkstrike', JSON.stringify(G.set)); };
  const ac = $('sAccel'); if (ac) { ac.checked = G.set.touchAccel; ac.onchange = () => { G.set.touchAccel = ac.checked; localStorage.setItem('inkstrike', JSON.stringify(G.set)); }; }
  const ts = $('sTs'), tl = $('sTsV'); ts.value = G.set.tsens; tl.textContent = G.set.tsens; ts.oninput = () => { G.set.tsens = +ts.value; tl.textContent = ts.value; localStorage.setItem('inkstrike', JSON.stringify(G.set)); };
  layoutApply(); $('layoutBtn').onclick = () => layoutEdit(true); $('layoutDone').onclick = () => layoutEdit(false); $('layoutReset').onclick = () => { for (const k of ['layout', 'btnSizes', 'joyScale', 'joyPos']) delete G.set[k]; G.set.btnScale = 1; layoutSave(); layoutApply(); };
  const bs = $('sBtn'), bl = $('sBtnV'); bs.value = G.set.btnScale || 1; bl.textContent = bs.value; bs.oninput = () => { G.set.btnScale = +bs.value; bl.textContent = bs.value; layoutSave(); layoutApply(); };
  const target = $('layoutTarget'), size = $('layoutSize'), joy = $('layoutJoy'); if (target) { target.replaceChildren(); document.querySelectorAll('#touch .tb[id]').forEach(b => { const o = document.createElement('option'); o.value = b.id; o.textContent = b.id === 'tFire' ? '主开火' : b.id === 'tFire2' ? '副开火' : b.textContent; target.appendChild(o); }); const o = document.createElement('option'); o.value = 'joyBase'; o.textContent = '左摇杆圆环'; target.appendChild(o); target.onchange = () => layoutSelect(target.value); }
  if (size) size.oninput = () => { const id = TOUCH.layoutSelected || 'tFire'; if (id === 'joyBase') return; (G.set.btnSizes = G.set.btnSizes || {})[id] = clamp(+size.value, .6, 1.8); layoutSave(); layoutApply(); };
  if (joy) joy.oninput = () => { G.set.joyScale = clamp(+joy.value, .65, 1.6); layoutSave(); layoutApply(); };
  if ($('layoutSelectedReset')) $('layoutSelectedReset').onclick = () => { const id = TOUCH.layoutSelected || 'tFire'; if (id === 'joyBase') { delete G.set.joyPos; delete G.set.joyScale; } else { if (G.set.layout) delete G.set.layout[id]; if (G.set.btnSizes) delete G.set.btnSizes[id]; } layoutSave(); layoutApply(); }; layoutSelect('tFire');
  const rot = () => { const portrait = innerHeight > innerWidth * 1.05; touchReset(); if (portrait && !TOUCH.edit && G.state !== 'menu' && G.state !== 'matchEnd') setPause(true); layoutApply(); $('rotate').classList.toggle('on', portrait); }; addEventListener('resize', rot); rot();
  const suspend = () => { touchReset(); if (TOUCH.edit) { G.paused = true; $('pause').classList.remove('on'); layoutApply(); } else if (G.state !== 'menu' && G.state !== 'matchEnd') setPause(true); }; addEventListener('blur', suspend); document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
}
function touchStartMatch() { const el = document.documentElement; try { const p = (el.requestFullscreen || el.webkitRequestFullscreen || (() => { })).call(el); if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { })).catch(() => { }); } catch (e) { } }

/* per-frame: aim friction probe + auto-fire */
function updateTouch(dt) {
  const pl = G.player; if (!pl || G.paused || G.buyOpen || G.mapOpen || TOUCH.edit) { touchReset(); return; } if (!pl.alive) { if (TOUCH.wasAlive !== false) touchReset(); TOUCH.wasAlive = false; return; } TOUCH.wasAlive = true;
  TOUCH.aimCheck -= dt;
  if (TOUCH.aimCheck <= 0) { TOUCH.aimCheck = .05; const py = pl.pitch + pl.recP, yw = pl.yaw + pl.recY, cp = Math.cos(py), dx = -Math.sin(yw) * cp || 1e-9, dy = Math.sin(py) || 1e-9, dz = -Math.cos(yw) * cp || 1e-9, ey = pl.pos.y + eyeY(pl); let bt = 1e9;
    for (const e of G.ents) if (e.alive && e.team !== pl.team) { const r = rayEnt(pl.pos.x, ey, pl.pos.z, dx, dy, dz, e); if (r && r.t < bt) bt = r.t; }
    const w = bt < 1e9 ? rayWorld(pl.pos.x, ey, pl.pos.z, dx, dy, dz, bt) : null; TOUCH.aimOn = bt < 1e9 && !w && !(G.flashT > .15) && !smokeBlocks(pl.pos.x, ey, pl.pos.z, pl.pos.x + dx * bt, ey + dy * bt, pl.pos.z + dz * bt); }
  TOUCH.aimT = TOUCH.aimOn ? TOUCH.aimT + dt : 0;
  const w = WEAPONS[pl.cur], manual = touchHeld('fire'), wasAuto = TOUCH.auto;
  TOUCH.auto = !!(G.set.autoFire && !(G.mode === 'range' && TRAIN.active) && !manual && !w.nade && !w.melee && TOUCH.aimT > (w.scope ? .25 : .1) && (!w.scope || pl.scoped > 0) && G.state === 'live');
  if (TOUCH.auto) { G.fire = true; if (G.now >= pl.nextFire) G.fireEdge = true; } else if (wasAuto && !manual) G.fire = G.fireEdge = false;
  $('tFire').classList.toggle('lock', TOUCH.aimOn); $('tUse').style.display = (canPlant(pl) || canDefuse(pl)) ? 'flex' : 'none';
}

/* ---------------- movable button layout ---------------- */
function layoutSave() { localStorage.setItem('inkstrike', JSON.stringify(G.set)); }
function layoutJoyScale() { const n = Number(G.set.joyScale ?? 1); return Math.max(.1, Math.min(Number.isFinite(n) ? clamp(n, .65, 1.6) : 1, (innerHeight - 16) / 124, (innerWidth * .42 - 16) / 124)); }
function layoutButtonScale(b) { const all = Number(G.set.btnScale ?? 1), own = Number((G.set.btnSizes || {})[b.id] ?? 1), sc = (Number.isFinite(all) ? clamp(all, .7, 1.6) : 1) * (Number.isFinite(own) ? clamp(own, .6, 1.8) : 1); return Math.min(sc, (innerWidth - 16) / (b.offsetWidth || 62), (innerHeight - 16) / (b.offsetHeight || 62)); }
function layoutJoyCenter(pos = G.set.joyPos) { const r = 62 * layoutJoyScale(), x = pos && Number.isFinite(pos[0]) ? pos[0] * innerWidth : innerWidth * .18, y = pos && Number.isFinite(pos[1]) ? pos[1] * innerHeight : innerHeight * .74, maxX = Math.max(r + 8, innerWidth * .42 - r - 8); return { x: clamp(x, r + 8, maxX), y: clamp(y, r + 8, Math.max(r + 8, innerHeight - r - 8)) }; }
function layoutSelect(id) { TOUCH.layoutSelected = id; document.querySelectorAll('#touch .layout-selected').forEach(b => b.classList.remove('layout-selected')); const b = $(id); if (b && TOUCH.edit) b.classList.add('layout-selected'); const target = $('layoutTarget'), size = $('layoutSize'), sv = $('layoutSizeV'), joy = $('layoutJoy'), jv = $('layoutJoyV'); if (target) target.value = id; if (size) { size.disabled = id === 'joyBase'; size.value = (G.set.btnSizes || {})[id] || 1; } if (sv) sv.textContent = id === 'joyBase' ? '下方圆环' : Math.round(((G.set.btnSizes || {})[id] || 1) * 100) + '%'; if (joy) joy.value = layoutJoyScale(); if (jv) jv.textContent = Math.round(layoutJoyScale() * 100) + '%'; if ($('sBtn')) $('sBtn').value = G.set.btnScale || 1; if ($('sBtnV')) $('sBtnV').textContent = G.set.btnScale || 1; }
function layoutPlace(b, x, y) { const sc = layoutButtonScale(b), st = getComputedStyle(b), w = b.offsetWidth || parseFloat(st.width) || 62, h = b.offsetHeight || parseFloat(st.height) || 62, mx = (sc - 1) * w / 2, my = (sc - 1) * h / 2, xmin = Math.max(0, (8 + mx) / innerWidth), ymin = Math.max(0, (8 + my) / innerHeight); x = clamp(x, xmin, Math.max(xmin, 1 - (8 + w + mx) / innerWidth)); y = clamp(y, ymin, Math.max(ymin, 1 - (8 + h + my) / innerHeight)); if (b.closest('#tTop')) { b.style.position = 'fixed'; b.style.margin = '0'; } b.style.left = x * 100 + '%'; b.style.top = y * 100 + '%'; b.style.right = b.style.bottom = 'auto'; return [x, y]; }
function layoutApply() {
  const L = G.set.layout || {}, buttons = Array.from(document.querySelectorAll('#touch .tb[id]'));
  // Restore every flex sibling before measuring; fixing one button must not move the next one's anchor.
  buttons.forEach(b => { const sc = layoutButtonScale(b); b.style.transform = `scale(${sc})`; if (b.closest('#tTop')) { b.style.position = ''; b.style.margin = `${Math.max(0, (sc - 1) * b.offsetHeight / 2)}px ${Math.max(0, (sc - 1) * b.offsetWidth / 2)}px`; } b.style.left = b.style.top = b.style.right = b.style.bottom = ''; });
  const positions = buttons.map(b => ({ b, p: L[b.id], r: b.getBoundingClientRect() }));
  positions.forEach(({ b, p, r }) => { if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) layoutPlace(b, p[0], p[1]); else if (r.width && (r.left < 8 || r.top < 8 || r.right > innerWidth - 8 || r.bottom > innerHeight - 8)) layoutPlace(b, (r.left + (r.width - b.offsetWidth) / 2) / innerWidth, (r.top + (r.height - b.offsetHeight) / 2) / innerHeight); });
  const base = $('joyBase'), knob = $('joyKnob'), sc = layoutJoyScale(); if (base) { base.style.width = base.style.height = 124 * sc + 'px'; base.style.margin = -62 * sc + 'px 0 0 ' + -62 * sc + 'px'; base.style.pointerEvents = TOUCH.edit ? 'auto' : 'none'; knob.style.width = knob.style.height = 54 * sc + 'px'; if (TOUCH.edit) { const c = layoutJoyCenter(); base.style.display = 'block'; base.style.left = c.x + 'px'; base.style.top = c.y + 'px'; knob.style.transform = 'translate(-50%,-50%)'; } }
  layoutSelect(TOUCH.layoutSelected || 'tFire');
}
function layoutEdit(on) {
  touchReset(); if (!on && TOUCH.edit) layoutSave(); TOUCH.edit = on; document.body.classList.toggle('layoutEdit', on); $('layoutBar').classList.toggle('on', on);
  if (on) { setPause(false); G.paused = true; $('pause').classList.remove('on'); $('hud').classList.add('on'); }
  else { $('pause').classList.add('on'); } layoutApply();
}
(() => {
  let drag = null; TOUCH.layoutCancel = () => { drag = null; };
  document.addEventListener('touchstart', e => { if (!TOUCH.edit || drag) return; const b = e.target.closest && e.target.closest('#touch .tb[id], #joyBase'); if (!b) return; e.preventDefault(); e.stopPropagation(); layoutSelect(b.id); const r = b.getBoundingClientRect(), t = e.changedTouches[0]; drag = { b, id: t.identifier, dx: t.clientX - (r.left + r.width / 2), dy: t.clientY - (r.top + r.height / 2) }; }, { capture: true, passive: false });
  document.addEventListener('touchmove', e => { if (!drag || !TOUCH.edit) { drag = null; return; } e.preventDefault(); e.stopPropagation(); for (const t of e.changedTouches) if (t.identifier === drag.id) { if (drag.b.id === 'joyBase') { const c = layoutJoyCenter([(t.clientX - drag.dx) / innerWidth, (t.clientY - drag.dy) / innerHeight]); G.set.joyPos = [c.x / innerWidth, c.y / innerHeight]; drag.b.style.left = c.x + 'px'; drag.b.style.top = c.y + 'px'; } else { const x = (t.clientX - drag.dx - drag.b.offsetWidth / 2) / innerWidth, y = (t.clientY - drag.dy - drag.b.offsetHeight / 2) / innerHeight; (G.set.layout = G.set.layout || {})[drag.b.id] = layoutPlace(drag.b, x, y); } } }, { capture: true, passive: false });
  const end = e => { if (!drag || ![...e.changedTouches].some(t => t.identifier === drag.id)) return; e.preventDefault(); e.stopPropagation(); drag = null; layoutSave(); };
  document.addEventListener('touchend', end, { capture: true, passive: false }); document.addEventListener('touchcancel', end, { capture: true, passive: false });
})();

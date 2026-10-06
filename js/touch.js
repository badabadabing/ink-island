'use strict';
/* ============ INK ISLAND · touch: twin-thumb phone controls — left thumb walks, right thumb looks, paper buttons for the rest ============ */
const TOUCH = { on: false, joy: null, looks: new Map(), btns: new Map(), move: { x: 0, y: 0 }, sprint: false, crouch: false, aim: false };
TOUCH.held = k => [...TOUCH.btns.values()].some(b => b.dataset.b === k);
const touchWanted = () => /[?&]touch/.test(location.search) || (matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0);
function touchReset() { TOUCH.btns.clear(); TOUCH.looks.clear(); TOUCH.joy = null; TOUCH.move.x = TOUCH.move.y = 0; TOUCH.sprint = TOUCH.crouch = TOUCH.aim = false; document.querySelectorAll('#touch .dn').forEach(b => b.classList.remove('dn')); $('joyBase').style.display = 'none'; }
/* the stick becomes WASD + shift: a push past 92 % of the ring is a sprint */
function touchApplyMove() { if (!TOUCH.on) return; const k = G.keys, m = TOUCH.move, d = Math.hypot(m.x, m.y), w = G.player && WEAPONS[G.player.cur]; if (TOUCH.aim && w && (w.melee || w.nade)) { TOUCH.aim = false; $('tAim').classList.remove('dn'); } G.alt = TOUCH.aim; k.KeyW = m.y < -.3; k.KeyS = m.y > .3; k.KeyD = m.x > .3; k.KeyA = m.x < -.3; k.ShiftLeft = d > .92 || (TOUCH.sprint && d > .3); if (d < .3 && TOUCH.sprint) { TOUCH.sprint = false; $('tSprint').classList.remove('dn'); } k.KeyC = TOUCH.crouch; }
function initTouch() {
  TOUCH.on = true; G.noLock = true; document.body.classList.add('touch'); if (!G.set.touchSeen) { G.set.touchSeen = 1; G.set.quality = 'low'; saveSet(); applyQuality(); }
  const L = $('touch'), knob = $('joyKnob'), base = $('joyBase'), btnOf = el => el && el.closest ? el.closest('[data-b]') : null, held = TOUCH.held;
  const press = (b, down) => { const k = b.dataset.b, pl = G.player; if (b.classList.contains('off')) return; if (['fire', 'jump', 'use'].includes(k)) b.classList.toggle('dn', down || held(k)); else if (down && !['sprint', 'crouch', 'aim'].includes(k)) { b.classList.add('dn'); setTimeout(() => b.classList.remove('dn'), 140); }
    if (k === 'fire') { G.fire = down || held('fire'); if (down) G.fireEdge = true; }
    else if (k === 'jump') { G.keys.Space = down || held('jump'); }
    else if (k === 'use') { if (down) onKey('KeyF'); }
    else if (!down) return;
    else if (k === 'aim') { TOUCH.aim = !TOUCH.aim; G.alt = TOUCH.aim; if (TOUCH.aim) G.altEdge = true; b.classList.toggle('dn', TOUCH.aim); }
    else if (k === 'sprint') { TOUCH.sprint = !TOUCH.sprint; b.classList.toggle('dn', TOUCH.sprint); }
    else if (k === 'crouch') { if (pl && pl.prone) { onKey('KeyZ'); TOUCH.crouch = false; } else TOUCH.crouch = !TOUCH.crouch; b.classList.toggle('dn', TOUCH.crouch); }
    else if (k === 'prone') { onKey('KeyZ'); TOUCH.crouch = false; $('tCrouch').classList.remove('dn'); }
    else if (k === 'reload') onKey('KeyR');
    else if (k === 'swap') { if (pl && pl.alive) { const o = [pl.inv[1], pl.inv[2], 'knife'].filter(Boolean), i = o.indexOf(pl.cur); switchTo(o[(i + 1) % o.length]); } }
    else if (k === 'nade') onKey('Digit4');
    else if (k === 'throw') { G.fireEdge = true; G.fire = true; TOUCH.throwN = 4; }
    else if (k === 'mode') onKey('KeyB');
    else if (k === 'band') { if (pl && pl.alive) { if (typeof quickHeal === 'function') quickHeal(); else healStart(pl, pl.meds.kit > 0 && pl.hp < 60 ? 'kit' : 'band'); } }
    else if (k === 'pill') { if (pl && pl.alive) healStart(pl, pl.meds.drink > 0 ? 'drink' : 'pill'); }
    else if (k === 'map') toggleMap();
    else if (k === 'bag') toggleInv();
    else if (k === 'pause') setPause(true); };
  L.addEventListener('touchstart', e => { e.preventDefault(); if (G.state !== 'live' || G.paused || G.mapOpen || G.invOpen || G.crateOpen) return; SFX.init();
    for (const t of e.changedTouches) { const b = btnOf(t.target);
      if (b) { TOUCH.btns.set(t.identifier, b); press(b, true); if (b.dataset.b === 'fire') TOUCH.looks.set(t.identifier, { x: t.clientX, y: t.clientY }); }
      else if (!TOUCH.joy && t.clientX < innerWidth * .45) { TOUCH.joy = { id: t.identifier, x: t.clientX, y: t.clientY }; base.style.display = 'block'; base.style.left = t.clientX + 'px'; base.style.top = t.clientY + 'px'; knob.style.transform = 'translate(-50%,-50%)'; }
      else TOUCH.looks.set(t.identifier, { x: t.clientX, y: t.clientY }); } }, { passive: false });
  L.addEventListener('touchmove', e => { e.preventDefault(); const pl = G.player; if (G.paused || G.mapOpen || G.invOpen) { touchReset(); return; }
    for (const t of e.changedTouches) {
      if (TOUCH.joy && t.identifier === TOUCH.joy.id) { const R = 58; let dx = t.clientX - TOUCH.joy.x, dy = t.clientY - TOUCH.joy.y; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } TOUCH.move.x = d < R * .12 ? 0 : dx / R; TOUCH.move.y = d < R * .12 ? 0 : dy / R; knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; }
      const lk = TOUCH.looks.get(t.identifier);
      if (lk && pl && pl.alive) { const dx = t.clientX - lk.x, dy = t.clientY - lk.y; lk.x = t.clientX; lk.y = t.clientY; const k = .0048 * G.set.sens * (camera.fov / G.set.fov); const free = G.keys.AltLeft; if (free) { pl.fy = (pl.fy || 0) - dx * k; pl.fp = clamp((pl.fp || 0) - dy * k * .8, -1.2, 1.2); } else { pl.yaw -= dx * k; pl.pitch = clamp(pl.pitch - dy * k * .8, -1.54, 1.54); } G.mdx += dx * 2; G.mdy += dy * 2; } } }, { passive: false });
  const end = e => { e.preventDefault(); for (const t of e.changedTouches) { const b = TOUCH.btns.get(t.identifier); if (b) { TOUCH.btns.delete(t.identifier); press(b, false); } TOUCH.looks.delete(t.identifier); if (TOUCH.joy && t.identifier === TOUCH.joy.id) { TOUCH.joy = null; TOUCH.move.x = TOUCH.move.y = 0; base.style.display = 'none'; } } };
  L.addEventListener('touchend', end, { passive: false }); L.addEventListener('touchcancel', end, { passive: false });
  /* the crate and bag panels are tapped like any page; the pause panel's ESC hint makes no sense on a phone */
  $('pause').querySelector('p').textContent = '点 继续 回到对局';
}
/* per-frame: keep the stick's keys fresh, show the layer only in a live match, fade buttons that mean nothing right now */
function touchUpdate() { if (!TOUCH.on) return; const pl = G.player, live = G.state === 'live' && !G.paused && !G.mapOpen && !G.invOpen && !G.crateOpen; $('touch').classList.toggle('on', G.state === 'live' && !!pl && pl.alive); if (G.state !== 'live' && (TOUCH.btns.size || TOUCH.looks.size || TOUCH.joy)) touchReset(); if (!live) return; touchApplyMove(); if (TOUCH.throwN && --TOUCH.throwN === 0 && !TOUCH.held('fire')) G.fire = false; if (!pl) return;
  const w = WEAPONS[pl.cur], air = !!pl.air, veh = !!pl.veh, cls = (id, c, on) => $(id).classList.toggle(c, on);
  cls('tJump', 'hint', air); $('tJump').textContent = air ? (pl.air === 'plane' ? '跳伞' : '开伞') : '跳'; $('tUse').textContent = veh ? '下车' : crateNear(pl) ? '开箱' : '拾取';
  for (const [id, off] of [['tFire', air], ['tAim', air || veh || w.melee || w.nade], ['tReload', air || veh || w.melee || w.nade], ['tMode', air || veh || !w.auto], ['tThrow', !w.nade], ['tSprint', air || veh], ['tCrouch', air || veh], ['tProne', air || veh]]) cls(id, 'off', off);
  const n = pl.inv[1] || pl.inv[2]; $('tSwap').textContent = n ? '切枪' : '刻刀'; $('tBand').textContent = pl.meds.kit > 0 && pl.hp < 60 ? '急救 ' + pl.meds.kit : '绷带 ' + (pl.meds.band || 0); $('tPill').textContent = pl.meds.drink > 0 ? '饮料 ' + pl.meds.drink : '止痛 ' + (pl.meds.pill || 0); }

'use strict';
/* ============ INK ISLAND · compat: stubs for the inkstrike modules we do not ship (bomb objective, radio, progression, touch) ============ */
const $ = id => document.getElementById(id);
const SKINS = [{ n: '素描', need: 0, ink: INK, w: 1.7 }];
const PROG = { skin: () => 0, onHurt() {}, onKill() {}, resetStreak() {}, bind() {}, report() {} };
const TRAIN = { onShot() {}, onHit() {}, onKill() {}, update() {}, label: () => '', reset() {}, setMoving() {}, moving: false };
const RADIO = { say() {}, preload() {}, stop() {} };
const BOMB = { state: 'none', carrier: null, pos: new V3(), t: 0, site: null, defuser: null }, DEFUSE_T = 6, PLANT_T = 3.2;
const canPlant = () => false, canDefuse = () => false, entInteract = () => {}, botDangerDetour = () => null, botOrderGoal = () => null;
const SMOKES = [], ladderAt = () => null;
const surfaceAt = p => p.y > .3 ? 'wood' : 'concrete';
const isIndoor = e => !!rayWorld(e.pos.x, e.pos.y + 1.7, e.pos.z, 1e-9, 1, 1e-9, 9);
function touchReset() {}

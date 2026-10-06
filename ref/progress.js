'use strict';
/* ============ INK STRIKE · progress: multi-kills, MVP, damage report, weapon mastery & stroke skins ============ */
const SKINS = [{ n: '素描', need: 0, ink: INK, w: 1.7 }, { n: '朱砂', need: 10, ink: 0xa81f1f, w: 1.8 }, { n: '靛青', need: 30, ink: 0x1f4f8f, w: 1.8 }, { n: '鎏金', need: 75, ink: 0x9a6a00, w: 2.1 }];
const STREAK = ['', '', '双杀 · 连笔', '三杀 · 行云', '四杀 · 泼墨', '五杀 · 一气呵成', '六杀 · 破阵', '七杀 · 飞墨', '八杀 · 横扫', '九杀 · 狂澜'];
const streakTitle = n => STREAK[n] || `超神 · ${n} 连杀`;
/* Team radio: squelch + recorded male call-outs (local VoxCPM, radio-processed, audio/radio/*.m4a) + subtitle. Builds without audio files fall back to wordless chatter. */
const RADIO_AUDIO = 'audio/radio/';
const RADIO_LINES = { start_red: [['Go Go Go！', 'start']], start_blue: [['Go Go Go！', 'start']], cover: [['掩护我！', 'cover']], spot: [['发现敌人！', 'spot1'], ['前面有人！', 'spot2'], ['看到一个！', 'spot3']], he: [['墨爆弹，注意！', 'he']], flash: [['闪光，转头！', 'flash']], smoke: [['烟墨封线。', 'smoke']], plant_red: [['墨核已安放，守住！', 'plant_red']], plant_blue: [['墨核已安放，快回防！', 'plant_blue']], defused: [['墨核已拆除。', 'defused']], down: [['倒了一个！', 'down']], last: [['只剩你了，稳住。', 'last']] };
const RADIO_LEN = { start: 1.59, cover: 1.35, spot1: 1.04, spot2: 1.1, spot3: 1.23, he: 1.73, flash: 1.69, smoke: 1.55, plant_red: 2.83, plant_blue: 2.47, defused: 1.8, down: .84, last: 2.17 };
const RADIO = { t: -9, cd: {}, hideT: 0, buf: {}, raw: null, src: null, loading: false,
  preload() { if (!RADIO_AUDIO || typeof fetch !== 'function') return; if (!this.raw) { this.raw = {}; for (const k in RADIO_LEN) this.raw[k] = fetch(RADIO_AUDIO + k + '.m4a').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null); } const C = SFX.ctx; if (!C || this.loading) return; this.loading = true; for (const k in RADIO_LEN) this.raw[k].then(b => b && new Promise((ok, no) => C.decodeAudioData(b, ok, no))).then(d => { if (d) this.buf[k] = d; }).catch(() => { }); },   // download at page load, decode once audio is unlocked
  say(key, who, urgent) { if (G.set.radio === false || G.mode === 'range' || G.state === 'menu' || G.manualStep) return; const lines = RADIO_LINES[key], now = performance.now() / 1000; if (!lines || now < (this.cd[key] || 0) || (!urgent && now - this.t < 1.6)) return;
    this.t = now; this.cd[key] = now + ({ spot: 7, down: 3, he: 3, flash: 3, smoke: 4, cover: 8 }[key] || 6); const [text, name] = lines[Math.random() * lines.length | 0], d = SFX.ctx && this.buf[name];
    if (d) { SFX.radio(.14 + d.duration); try { if (this.src) this.src.stop(); } catch (e) { } const n = this.src = SFX.ctx.createBufferSource(); n.buffer = d; n.connect(SFX.out(null, .95)); n.start(SFX.ctx.currentTime + .09); }
    else { const syl = (text.match(/[\u4e00-\u9fff]|[A-Za-z]+/g) || []).length, len = SFX.ctx ? SFX.chatter(syl) : 0; SFX.radio(.16 + len); } this.show(who, text); },
  show(who, text) { const el = $('radio'); if (!el) return; el.textContent = (who ? who + ' · ' : '') + text; el.className = 'on ' + (G.team || 'blue'); clearTimeout(this.hideT); this.hideT = setTimeout(() => { el.className = ''; }, 2800); },
  stop() { clearTimeout(this.hideT); const el = $('radio'); if (el) el.className = ''; try { if (this.src) this.src.stop(); } catch (e) { } } };
const PROG = {
  data: Object.assign({ kills: {}, skin: {}, mvp: 0 }, JSON.parse(localStorage.getItem('inkstrike_prog') || '{}')), dmg: {}, rs: new Map(), streakN: 0, streakT: -9, streakEpoch: 0, streakTimer: 0,
  save() { try { localStorage.setItem('inkstrike_prog', JSON.stringify(this.data)); this.savedAt = Date.now(); } catch (e) { this.savedAt = 0; } },
  saveNote() { const t = this.savedAt; return t ? `已存档 ${new Date(t).toTimeString().slice(0, 5)} · 本机` : '击倒后自动存档到本机'; },
  tier(k) { const n = this.data.kills[k] || 0; let t = 0; SKINS.forEach((s, i) => { if (n >= s.need) t = i; }); return t; },
  skin(k) { const t = this.tier(k), s = this.data.skin[k]; return s === undefined ? t : Math.min(s, t); },
  rstat(e) { let r = this.rs.get(e); if (!r) this.rs.set(e, r = { k: 0, dmg: 0, plant: 0, defuse: 0 }); return r; },
  resetStreak() { clearTimeout(this.streakTimer); this.streakTimer = 0; this.streakN = 0; this.streakT = -9; this.streakEpoch++; },
  cancelNotices() { this.resetStreak(); },
  resetRound() { this.rs.clear(); this.dmg = {}; this.resetStreak(); $('report').classList.remove('on'); },
  onHurt(e, dmg, by, wkey) { botOnDamage(e, by, wkey); if (!by || by === e) return; this.rstat(by).dmg += dmg; const pl = G.player; if (by === pl) { const r = this.dmg[e.name] || (this.dmg[e.name] = { team: e.team, dealt: 0, hits: 0, taken: 0, thits: 0 }); r.dealt += dmg; r.hits++; } else if (e === pl) { const r = this.dmg[by.name] || (this.dmg[by.name] = { team: by.team, dealt: 0, hits: 0, taken: 0, thits: 0 }); r.taken += dmg; r.thits++; } },
  onKill(e, by, wkey) {
    botOnDeath(e, by, wkey); if (e.isPlayer) this.resetStreak(); if (!by || by === e) return; this.rstat(by).k++; if (!by.isPlayer) return;
    const now = G.now, owner = by, epoch = this.streakEpoch; if (owner.alive && G.mode !== 'range') { this.streakN = (G.mode === 'comp' || now - this.streakT < 4.5) ? this.streakN + 1 : 1; this.streakT = now; const n = this.streakN; clearTimeout(this.streakTimer); if (n >= 2) this.streakTimer = setTimeout(() => { this.streakTimer = 0; if (epoch !== this.streakEpoch || owner !== G.player || !owner.alive || G.state === 'menu' || G.state === 'matchEnd') return; combatNotice(streakTitle(n), `连续击倒 ×${n}`, 'go'); SFX.streak(Math.min(8, n)); }, 350); }
    if (wkey && WEAPONS[wkey] && G.mode !== 'range') { const before = this.tier(wkey); this.data.kills[wkey] = (this.data.kills[wkey] || 0) + 1; const after = this.tier(wkey); this.save();
      if (after > before) { delete this.data.skin[wkey]; this.save(); setTimeout(() => { if (epoch !== this.streakEpoch || owner !== G.player || G.state === 'menu' || G.state === 'matchEnd') return; combatNotice(`解锁「${SKINS[after].n}」笔触`, `${WEAPONS[wkey].name} · 熟练度 ${this.data.kills[wkey]} 击倒`, 'go'); SFX.bell(true); if (G.player.cur === wkey) { const pose = { reloadT: VM.reloadT, drawT: VM.drawT, atk: VM.atk, insp: VM.insp, cyc: VM.cyc }; VM.show(wkey); Object.assign(VM, pose); } }, 1500); } }
  },
  mvp(win) { let best = null, bs = -1; for (const [e, r] of this.rs) { if (e.team !== win) continue; const s = r.k * 100 + r.dmg + (r.plant + r.defuse) * 160; if (s > bs) { bs = s; best = e; } } if (!best) return ''; best.mvps = (best.mvps || 0) + 1; if (best.isPlayer) { this.data.mvp++; this.save(); } const r = this.rs.get(best); return `MVP · ${best.name}(${r.defuse ? '拆除墨核 · ' : r.plant ? '安放墨核 · ' : ''}${r.k} 击倒 / ${Math.round(r.dmg)} 伤害)`; },
  report(title) {
    const rows = Object.entries(this.dmg).sort((a, b) => (b[1].dealt + b[1].taken) - (a[1].dealt + a[1].taken)).slice(0, 6); if (!rows.length) return;
    $('reportIn').innerHTML = `<h4>${title}</h4>` + rows.map(([n, r]) => `<div><span class="${r.team}">${n}</span><em class="o">${r.dealt ? `造成 ${Math.round(r.dealt)} · ${r.hits} 次` : '—'}</em><em class="i">${r.taken ? `受到 ${Math.round(r.taken)} · ${r.thits} 次` : '—'}</em></div>`).join(''); $('report').classList.add('on');
  },
  drawArmory() {
    const keys = Object.keys(WEAPONS).filter(k => !WEAPONS[k].nade);
    $('armoryGrid').innerHTML = keys.map(k => { const n = this.data.kills[k] || 0, t = this.tier(k), s = this.skin(k), next = SKINS[t + 1], pct = next ? Math.min(100, (n - SKINS[t].need) / (next.need - SKINS[t].need) * 100) : 100;
      return `<div class="card" data-k="${k}"><img class="ico" src="${G.icons[k]}"><div class="nm">${WEAPONS[k].name}</div><div class="en">${n} 击倒 · ${next ? `距「${next.n}」还差 ${next.need - n}` : '已满级'}</div><div class="bar"><i class="hatch" style="width:${pct}%"></i></div><div class="sk">${SKINS.map((q, i) => `<span class="${i === s ? 'cur' : ''} ${i > t ? 'lock' : ''}" style="--c:#${q.ink.toString(16).padStart(6, '0')}">${q.n}</span>`).join('')}</div></div>`; }).join('');
    $('armoryMvp').textContent = `生涯 MVP ×${this.data.mvp} · ${this.saveNote()}`;
  },
  bind() { $('armoryGrid').addEventListener('click', e => { const c = e.target.closest('.card'); if (!c) return; const k = c.dataset.k, t = this.tier(k); this.data.skin[k] = (this.skin(k) + 1) % (t + 1); this.save(); this.drawArmory(); SFX.init(); SFX.ui(); });
    $('armoryBtn').onclick = () => { this.drawArmory(); $('armory').classList.add('on'); }; $('armoryClose').onclick = () => $('armory').classList.remove('on'); }
};

/* ---------------- measured range drills ---------------- */
const TRAIN = {
  moving: false, active: false, left: 30, shots: 0, hits: 0, heads: 0, kills: 0, damage: 0, hitShot: false, headShot: false, completed: false,
  reset(start) { if (G.mode !== 'range' || !G.player || G.state !== 'live') return false; this.active = !!start; this.completed = false; this.left = 30; this.shots = this.hits = this.heads = this.kills = this.damage = 0; this.hitShot = this.headShot = false; this.started = G.now; for (const b of G.bots) if (b.dummy) spawnEnt(b); const p = G.player, a = p.ammo[p.cur]; if (a) { a.mag = WEAPONS[p.cur].mag; a.res = WEAPONS[p.cur].res; } p.reloadEnd = -1; p.pending = null; clearInput(); if (start) combatNotice('训练开始', TOUCH.on ? '30 秒 · 自动开火暂停，请手动射击' : '30 秒 · 先稳住准星，再加快节奏'); },
  setMoving(on) { if (G.mode !== 'range' || !G.player || G.state !== 'live') return false; this.moving = !!on; if (G.mode === 'range') this.reset(false); $('trainMotion').textContent = this.moving ? '横移靶：开' : '横移靶：关'; combatNotice(this.moving ? '横移训练' : '静止训练', '按 T 或地图内按钮开始计时'); },
  onShot() { if (G.mode !== 'range' || !this.active) return; this.shots++; this.hitShot = this.headShot = false; },
  onHit(damage, head, weapon) { if (G.mode !== 'range' || !this.active || !WEAPONS[weapon] || WEAPONS[weapon].melee || WEAPONS[weapon].nade) return; if (!this.hitShot) { this.hits++; this.hitShot = true; } if (head && !this.headShot) { this.heads++; this.headShot = true; } this.damage += damage; },
  onKill(weapon) { if (G.mode === 'range' && this.active && WEAPONS[weapon] && !WEAPONS[weapon].melee && !WEAPONS[weapon].nade) this.kills++; },
  update(dt) { if (G.mode !== 'range' || G.mapOpen || G.buyOpen) return; if (this.active) { this.left = Math.max(0, this.left - dt); if (!this.left) { this.active = false; this.completed = true; combatNotice('训练完成', `${this.kills} 击倒 · 命中率 ${this.accuracy()}% · 爆头 ${this.heads}`); } } if (this.moving) for (const b of G.bots) { if (!b.alive || !b.dummy) continue; const p = RANGE_SPOTS[b.rangeI], x = p.x + Math.sin((G.now - (this.started || 0)) * 1.5 + b.rangeI) * 1.8; if (navLine(p.x, p.z, x, p.z)) { b.pos.x = x; b.pos.z = p.z; b.pos.y = MAP.floorAt(x, p.z); } } },
  accuracy() { return this.shots ? Math.min(100, Math.round(this.hits / this.shots * 100)) : 0; },
  snapshot() { return { active: this.active, completed: this.completed, moving: this.moving, seconds: +this.left.toFixed(1), shots: this.shots, hits: this.hits, headshots: this.heads, kills: this.kills, damage: Math.round(this.damage), accuracy: this.accuracy() }; },
  label() { if (TOUCH.on) return `${this.moving ? '横移' : '静止'} · ${this.active ? this.left.toFixed(1) + 's' : this.completed ? '完成' : '待开始'} · ${this.hits}/${this.shots} 中\n命中 ${this.accuracy()}% · 爆头 ${this.heads} · 击倒 ${this.kills}`; return `${this.moving ? '横移' : '静止'}训练 · ${this.active ? this.left.toFixed(1) + 's' : this.completed ? '已完成' : '待开始'}
${this.shots} 发 / ${this.hits} 中 · ${this.accuracy()}% · 爆头 ${this.heads}
击倒 ${this.kills} · 伤害 ${Math.round(this.damage)}
${TOUCH.on ? '地图 → 训练设置' : 'T 开始 / 重来 · Y 切换横移'}`; }
};

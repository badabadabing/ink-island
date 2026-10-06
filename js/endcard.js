'use strict';
/* ============ SALTY ISLE · endcard: the end / death screen as a fish-market prize ticket: rank medal, stat tiles, a match title, the kill list, the gear you wore; × (or Esc) folds it into a pill so the finale can be watched ============ */
(() => { const css = document.createElement('style'); css.textContent = `
body.skin #end .panel,body.skin #dead .panel{width:min(560px,calc(100vw - 24px));max-width:none;min-width:0;text-align:left;padding:58px 26px 20px !important}
#end .panel,#dead .panel{position:relative}
.ecX{position:absolute;top:14px;right:14px;width:38px;height:38px;padding:0 !important;border-radius:50% !important;font:900 22px/1 ui-rounded,sans-serif !important;display:grid;place-items:center;z-index:2;letter-spacing:0 !important}
.ecHead{display:flex;align-items:center;gap:16px;margin:2px 0 10px}
.ecMedal{flex:none;width:92px;height:92px;border-radius:50%;background:var(--mc,#ffd23f);border:4px solid var(--ink,#2e3a59);box-shadow:0 5px 0 var(--ink,#2e3a59),inset 0 -8px 0 rgba(0,0,0,.12),inset 0 0 0 6px rgba(255,255,255,.45);display:grid;place-items:center;position:relative;transform:rotate(-6deg)}
.ecMedal b{font:900 34px/1 ui-rounded,"Arial Rounded MT Bold",sans-serif;color:var(--ink,#2e3a59);margin-top:-6px}
.ecMedal small{position:absolute;bottom:14px;font:900 12px/1 ui-rounded,sans-serif;color:var(--ink,#2e3a59);opacity:.75}

.ecHead h2{margin:0 !important;text-align:left}
.ecChips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.ecChips span{padding:3px 11px;border:2.5px solid var(--ink,#2e3a59);border-radius:999px;background:#fff;font-size:13px;box-shadow:0 2px 0 var(--ink,#2e3a59)}
.ecChips span:first-child{background:var(--sun,#ffd23f)}
.ecTiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 10px}
.ecTile{border:3px solid var(--ink,#2e3a59);border-radius:14px;background:#fff;box-shadow:0 3px 0 var(--ink,#2e3a59);padding:5px 10px 4px;position:relative;overflow:hidden;min-width:0}
.ecTile::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:var(--tc)}
.ecTile b{display:block;font:900 25px/1.05 ui-rounded,"Arial Rounded MT Bold",sans-serif;color:var(--ink,#2e3a59);margin-top:6px;white-space:nowrap}
.ecTile b small{font-size:13px;margin-left:2px;opacity:.7}
.ecTile span{font-size:13px;color:var(--tc);filter:brightness(.8)}
.ecTitle{display:flex;align-items:center;gap:12px;border:3px dashed var(--ink,#2e3a59);border-radius:16px;background:#fff1d6;padding:5px 14px;margin:0 0 10px}
.ecTitle i{font-style:normal;font-size:12px;letter-spacing:4px;color:var(--teal,#2fa6a0)}
.ecTitle b{font-family:"Ma Shan Zheng","LXGW WenKai",serif;font-weight:400;font-size:25px;color:var(--red,#ff5a4e);-webkit-text-stroke:.18em var(--ink,#2e3a59);paint-order:stroke fill;letter-spacing:2px}
.ecTitle small{margin-left:auto;font-size:12px;opacity:.75;text-align:right}
.ecKills{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;font-size:12.5px;max-height:96px;overflow-y:auto}
.ecKills div{display:flex;align-items:center;gap:5px;padding:2px 10px 2px 4px;border:2px solid var(--ink,#2e3a59);border-radius:999px;background:#fff}
.ecKills div b{font:900 11px ui-rounded,sans-serif;background:#ffe3df;border-radius:999px;padding:1px 6px}.ecKills img{height:16px;opacity:1;filter:brightness(0) invert(17%) sepia(30%) saturate(900%) hue-rotate(195deg)}.ecKills em{display:none}
.ecGear{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;font-size:12px}
.ecGear span{display:flex;align-items:center;gap:4px;padding:2px 9px 2px 3px;border-radius:999px;background:#e9eef5;border:2px solid var(--ink,#2e3a59)}
.ecGear img{height:20px}
.ecSub{font-size:12px;letter-spacing:.2em;color:#2a8a82;margin:0 0 5px !important}
.ecPill{display:none;position:fixed;right:20px;bottom:24px;gap:8px;align-items:center;padding:8px 10px 8px 16px;border:3px solid var(--ink,#2e3a59);border-radius:999px;background:var(--paper,#fff8ec);box-shadow:0 5px 0 var(--ink,#2e3a59);pointer-events:auto;font-size:15px}
.ecPill button{padding:6px 14px !important;font-size:14px !important;-webkit-text-stroke:0 !important;letter-spacing:1px !important}
.ov.ecMin{background:transparent !important;pointer-events:none}.ov.ecMin>.panel{display:none}.ov.ecMin .ecPill{display:flex}
@media (max-width:520px){.ecTiles{grid-template-columns:repeat(2,1fr)}.ecMedal{width:74px;height:74px}.ecMedal b{font-size:27px}}
#endHist{max-width:100%}
#end.on>.panel{margin:auto 0 auto auto}body.touch #end.on>.panel{margin:auto}`; document.head.appendChild(css); })();
const EC = { min: false };
function ecRank() { const pl = G.player, win = G.state === 'end' && pl.alive; return win ? 1 : G.rank || G.ents.filter(e => e.alive).length + (pl.alive ? 0 : 1); }
function ecTitle(pl, sl, rank) { const k = pl.kills || 0, L = [[rank === 1 && k >= 6, '鱼塘霸主', `${k} 条全收进网里`], [rank === 1 && k === 0, '佛系钓手', '一竿未动 · 稳稳上岸'], [rank === 1, '今晚吃鱼', '整座岛的鱼都归你'], [(sl.head || 0) >= 3, '鱼眼神射', `${sl.head} 发正中脑门`], [k >= 5, '收网能手', `${k} 人进了你的鱼篓`], [(sl.ride || 0) > 1200, '码头老司机', `开了 ${Math.round(sl.ride)} m`], [(sl.walk || 0) > 1500, '环岛暴走族', `走了 ${Math.round(sl.walk)} m`], [(sl.picked || 0) >= 35, '仓鼠附体', `捡了 ${sl.picked} 件`], [rank <= 5, '压轴咸鱼', `撑到前 ${rank}`], [(sl.meds || 0) >= 4, '养生达人', `吃了 ${sl.meds} 次药`], [true, '今天也是咸鱼', '晒晒太阳 · 下局翻身']]; return L.find(x => x[0]); }
matchStats = function () { const pl = G.player, sl = G.slip || {}, rank = ecRank(), tot = G.ents.length, mm = t => `${(t / 60) | 0}:${String((t | 0) % 60).padStart(2, '0')}`, mine = G.killLog.filter(k => k[2] === pl.name), ic = k => G.icons && G.icons[k] ? `<img src="${G.icons[k]}">` : '', w = (typeof WEATHER !== 'undefined' && WEATHER[G.weather]) ? WEATHER[G.weather].name : '';
  const tile = (lab, v, unit, c) => `<div class="ecTile" style="--tc:${c}"><b>${v}<small>${unit}</small></b><span>${lab}</span></div>`, T = ecTitle(pl, sl, rank);
  const gear = [pl.helmLv && 'helm' + pl.helmLv, pl.vestLv && 'vest' + pl.vestLv, pl.bagLv && 'bag' + pl.bagLv, pl.scope, pl.ghillie && 'ghillie', pl.inv && pl.inv[1], pl.inv && pl.inv[2]].filter(Boolean);
  setTimeout(ecMedal, 0);
  return `<div class="ecChips"><span>存活 ${mm(G.now)}</span><span>第 ${ZONE.on ? ZONE.ph + 1 : 1} 圈</span>${w ? `<span>${w}</span>` : ''}<span>${tot} 人参赛</span></div>
<div class="ecTiles">${tile('击杀', pl.kills || 0, '人', '#ff5a4e')}${tile('伤害', Math.round(sl.dmg || 0), '', '#ff8a3d')}${tile('爆头', sl.head || 0, '次', '#9b6ef0')}${tile('捡到', sl.picked || 0, '件', '#2fa6a0')}${tile('步行', Math.round(sl.walk || 0), 'm', '#e0a020')}${tile('开车', Math.round(sl.ride || 0), 'm', '#1c6fb0')}</div>
<div class="ecTitle"><i>本局称号</i><b>${T[1]}</b><small>${T[2]}</small></div>
${mine.length ? `<p class="ecSub">渔获记录</p><div class="ecKills">${mine.slice(0, 8).map(k => `<div><b>${mm(k[0])}</b>${ic(k[1])}<span>${k[3]}</span><em>${WEAPONS[k[1]] ? WEAPONS[k[1]].name : ''}</em></div>`).join('')}</div>` : ''}
${gear.length ? `<p class="ecSub">身上带着</p><div class="ecGear">${gear.map(k => `<span>${ic(k)}${ITEMS[k] ? ITEMS[k].name : (WEAPONS[k] ? WEAPONS[k].name : k)}</span>`).join('')}</div>` : ''}`; };
function ecMedal() { const rank = ecRank(), tot = G.ents.length; for (const id of ['end', 'dead']) { const ov = $(id); if (!ov) continue; ov.classList.remove('ecMin'); const m = ov.querySelector('.ecMedal'); if (!m) continue; m.style.setProperty('--mc', rank === 1 ? '#ffd23f' : rank <= 3 ? '#dfe7ef' : rank <= 10 ? '#ff8f7a' : '#9fd8e8'); m.innerHTML = `<b>#${rank}</b><small>/ ${tot}</small>`; const pl = ov.querySelector('.ecPill span'); if (pl) pl.textContent = `第 ${rank} 名 · 结算`; } const hc = $('endHist'); if (hc) hc.style.display = typeof BRAIN !== 'undefined' && BRAIN.data && (BRAIN.data.hist || []).filter(r => !r.quit).length >= 2 ? '' : 'none'; }
(() => { for (const [id, h2, again] of [['end', 'endT', 'endAgain'], ['dead', 'deadT', 'again']]) { const ov = $(id), pan = ov && ov.querySelector('.panel'), t = $(h2); if (!pan || !t) continue;
    const head = document.createElement('div'); head.className = 'ecHead'; head.innerHTML = '<div class="ecMedal"><b>#—</b></div>'; t.parentNode.insertBefore(head, t); head.appendChild(t);
    const x = document.createElement('button'); x.className = 'ecX'; x.title = '收起（Esc）'; x.textContent = '×'; pan.appendChild(x); x.addEventListener('click', () => { ov.classList.add('ecMin'); SFX.ui(); });
    const pill = document.createElement('div'); pill.className = 'ecPill'; pill.innerHTML = '<span>结算</span><button class="ecOpen">展开</button><button class="pri ecAgain">再来一局</button>'; ov.appendChild(pill);
    pill.querySelector('.ecOpen').addEventListener('click', () => { ov.classList.remove('ecMin'); SFX.ui(); }); pill.querySelector('.ecAgain').addEventListener('click', () => { ov.classList.remove('ecMin'); $(again).dispatchEvent(new MouseEvent('click', { bubbles: true })); }); }
  document.addEventListener('keydown', e => { if (e.code !== 'Escape') return; for (const id of ['end', 'dead']) { const ov = $(id); if (ov && ov.classList.contains('on')) { ov.classList.toggle('ecMin'); e.stopPropagation(); return; } } }, true);
  const _h = hurt; hurt = function (e, dmg, by, wkey, part, dir, pt) { const hp0 = e && e.hp; _h(e, dmg, by, wkey, part, dir, pt); const sl = G.slip; if (!sl || !e || hp0 === undefined) return; const lost = Math.max(0, hp0 - Math.max(0, e.hp)); if (by && by.isPlayer && e !== by) { sl.dmg = (sl.dmg || 0) + lost; if (part === 'head' && lost > 0) sl.head = (sl.head || 0) + 1; } if (e.isPlayer) sl.taken = (sl.taken || 0) + lost; };
  const _hs = healStart; healStart = function (e, k) { const r = _hs(e, k); if (r && e && e.isPlayer && G.slip) G.slip.meds = (G.slip.meds || 0) + 1; return r; };
})();

'use strict';
/* ============ INK ISLAND · names: the fishing-village joke, applied to every label. Loaded last (before boot) so towns, signs, kill feed and inventory all pick it up. SKIN off keeps the old ink names ============ */
const ISL_NAMES = {
  knife: ['杀鱼刀', 'FISH KNIFE'], p9: ['虾米 手枪', 'SHRIMP 9'], deagle: ['大钳 .50', 'BIG CLAW .50'], viper: ['沙丁鱼 冲锋枪', 'SARDINE SMG'], nova: ['撒网 霰弹枪', 'CAST-NET SHOTGUN'], ak: ['老船长 步枪', 'OLD SKIPPER'], m4: ['海鸥 步枪', 'SEAGULL'], awp: ['望潮 狙击枪', 'TIDEWATCHER'], dmr: ['鱼叉 连狙', 'HARPOON DMR'], lmg: ['鞭炮 机枪', 'FIRECRACKER LMG'], bow: ['竹弓 弩', 'BAMBOO BOW'], abolt: ['竹箭', 'BAMBOO BOLT'],
  he: ['炸鱼罐头', 'FISH-BOMB TIN'], flash: ['闪光海螺', 'FLASH CONCH'], smoke: ['墨鱼烟', 'SQUID SMOKE'], fire: ['辣酱瓶', 'HOT SAUCE'],
  vest1: ['一级 软木背心'], vest2: ['二级 救生甲'], vest3: ['三级 板甲'], helm1: ['一级 藤编盔'], helm2: ['二级 铁锅盔'], helm3: ['三级 潜水盔'], bag1: ['一级 渔网兜'], bag2: ['二级 竹篓'], bag3: ['三级 大背架'],
  band: ['海带绷带'], kit: ['急救饭盒'], medkit: ['村医药箱'], pill: ['薄荷糖'], drink: ['椰子水'], adren: ['辣椒针'],
  s2: ['二倍 竹筒镜'], s4: ['四倍 竹筒镜'], dot: ['红豆 镜'], sup: ['棉袜 消音器'], comp: ['漏斗 补偿器'], grip: ['擀面杖 握把'], xmag: ['罐头 弹匣'], stock: ['船桨 枪托'], ghillie: ['海草 伪装衣'] };
const ISL_TOWNS = { yard: ['晒鱼场', 'FISH-DRYING YARD'], farm: ['咸鱼农庄', 'SALTFISH FARM'], print: ['老罐头厂', 'OLD CANNERY'], obs: ['山顶天文台', 'HILLTOP OBSERVATORY'] };
const ISL_BOTS = ['阿咸', '大虾', '老蚝', '小螺', '跳跳鱼', '阿蟹', '海胆', '鱿鱼干', '沙丁', '带鱼', '花蛤', '海带', '小鲍', '阿蛎', '黄鱼', '马鲛', '石斑', '墨鱼仔', '海蜇', '鳗鱼', '小虾米', '老龟', '鲳鱼', '紫菜'];
const ISL_WIN = ['咸鱼翻身 · 全岛就你还站着', '一网打尽 · 今晚全村吃鱼', '潮水退了 · 沙滩上只剩你', '斗笠不倒 · 这岛归你了', '渔港霸主 · 海鸥都怕你'];
if (typeof SKIN !== 'undefined' && SKIN.on) {
  for (const k in ISL_NAMES) { const [n, en] = ISL_NAMES[k]; if (typeof WEAPONS !== 'undefined' && WEAPONS[k]) { WEAPONS[k].name = n; if (en) WEAPONS[k].en = en; } if (typeof ITEMS !== 'undefined' && ITEMS[k]) { ITEMS[k].name = n; if (en) ITEMS[k].en = en; } }
  if (typeof VTYPES !== 'undefined') { VTYPES.jeep.name = '拉网吉普'; VTYPES.boat.name = '破舢板'; VTYPES.moto.name = '突突摩托'; }
  for (const t of TOWNS) if (ISL_TOWNS[t.id]) [t.name, t.en] = ISL_TOWNS[t.id];
  if (typeof BR_NAMES !== 'undefined') BR_NAMES.splice(0, BR_NAMES.length, ...ISL_BOTS); if (typeof BOT_NAMES !== 'undefined') BOT_NAMES.splice(0, BOT_NAMES.length, ...ISL_BOTS.slice(0, BOT_NAMES.length));
  if (typeof WIN_LINES !== 'undefined') WIN_LINES.splice(0, WIN_LINES.length, ...ISL_WIN);
  if (typeof WEATHER !== 'undefined') WEATHER.dusk.name = '晚霞';
}
if (typeof SKIN !== 'undefined' && SKIN.on) { const tips = ['小贴士：铁锅盔比斗笠扛揍，但斗笠更好看。', '渔民之间流传：鞭炮机枪一开，全村都知道你在哪。', '海带绷带虽然腥，止血是真的快。', '据说码头尽头那位渔夫，已经睡了三天。', '墨鱼烟：看不见你的人，也闻得到你。', '猫不会告诉别人你躲在哪，但会盯着你看。', '路边摊写着「自取 · 付鱼」，请诚实。'], ll = document.getElementById('lastLine'); let ti = Math.floor(Math.random() * tips.length); const show = () => { if (!ll || (typeof G !== 'undefined' && G.state !== 'menu')) return; if (ll.dataset.brain) return; ll.style.opacity = 0; setTimeout(() => { ll.textContent = tips[ti++ % tips.length]; ll.style.opacity = 1; }, 400); }; setTimeout(() => { if (ll && !ll.textContent) show(); }, 600); setInterval(() => { if (ll && (!ll.textContent || ll.dataset.tip)) { ll.dataset.tip = 1; show(); } }, 6000); }
if (typeof SKIN !== 'undefined' && SKIN.on) { const q = s => document.querySelector(s); const tag = q('#menu .tag'); if (tag) tag.textContent = '640 m 小渔岛 · 九处据点 · 你对 23 个会记仇的渔民'; const sub = q('#menu .sub'); if (sub) sub.textContent = '咸鱼岛'; const st = q('#start'); if (st) st.textContent = '出海 · 开始一局'; }
if (typeof SKIN !== 'undefined' && SKIN.on) { const keys = { band: '7', kit: '8', medkit: '9', pill: '0', drink: '-', adren: '=' }; for (const k in keys) { const el = document.getElementById('m_' + k); if (el && ITEMS[k]) el.firstChild.textContent = `${keys[k]} ${ITEMS[k].name} `; } }

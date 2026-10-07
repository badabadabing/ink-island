# AGENTS.md — 咸鱼岛 SALTY ISLE（原「墨岛」，海岛渔村风大逃杀）

> 本文件是 Agent 在本项目的行为契约。改动前先读。任务拆解与分阶段方案见 [PLAN.md](PLAN.md)。

## 项目速览
- 作用：纸白/墨线画风的浏览器单人大逃杀（480 m 小岛、你 + 23 Bot、第三人称 + 开镜第一人称）。
- 技术栈：原生 JS + three.js r160，无构建，零外部依赖（three.js / 线条 addons / 字体在 `vendor/`）。
- 血缘：从 `~/Projects/游戏/inkstrike-r06`（墨线突击）派生。`ref/` 里是它的源码快照，只读参考，不加载。
- 启动：`python3 -m http.server 8766`，打开 http://localhost:8766 。调试：URL 加 `?auto` 跳过指针锁定。
- 语法检查：`for f in js/*.js; do node --check $f; done`
- 冒烟：`node tools/smoke.js`（无头快进一整局，输出 `SMOKE OK`）

## 结构
- `js/core.js` 调色板 / 排线着色器 / Sk 草图器 / 合成音效 —— 来自墨线突击；2026-10-06 起 Sk 记录法线，fillMat 多一套 toon 分支（uSkin）
- `js/skin.js` 彩色换皮：调色板、PAPER→奶油等重映射、天空/雾/云/太阳、线条淡化；`SKIN.on=false` 回到纸白墨线
- `js/weapons.js` 武器数值 / 枪模 / 第一人称枪模 VM —— 来自墨线突击
- `js/actors.js` 士兵模型 / 命中盒 / Bot 感知与交战 —— 来自墨线突击，去掉墨核分支
- `js/islander.js` 斗笠渔夫角色（换皮模式接管 buildSoldier，骨骼不变）+ 头盔 / 背心 / 背包三级外显 + 六套配色
- `js/gunskin.js` 换皮：枪支底色 + 梗配件、四种新投掷物、载具涂装与装饰（包装 finishGun；`vehDecor` 在 vehicle bake 前调用）
- `js/endgame.js` 残局：第 2 圈起圈外 Bot 进圈、≤4 人互相听到、≤3 敌人罗盘方位、存活数显示圈外人数
- `js/fxskin.js` 换皮特效（灰尘 / 彩屑 / 爆团 / 淡紫墨鱼烟 / 白冲击环）并延迟挂接 lgTemplate 换皮模板
- `js/names.js` 换皮名字（武器 / 物品 / 载具 / 据点 / Bot / 胜利语 / 菜单文案），最后加载
- `js/fx.js` 墨点、粒子、曳光 —— 来自墨线突击
- `js/island.js` 地形高度场（2 m）/ 海 / 等高线 / 植被 / 道路 / 碰撞 / 射线 / 导航（1 m 细格 + 6 m 粗格路由）
- `js/towns.js` 建筑套件与六处据点；`spot()` 记录物资刷新点
- `js/loot.js` 物品定义、刷新、拾取、背包、吃药（口径弹药池）
- `js/lootgeo.js` 地面物品 3D 纸模：按物品种类取模板几何，按 32 m 区块合批，拾取后标脏重烘
- `js/compat.js` 墨线突击共享文件引用的墨核/电台/熟练度桩
- `js/zone.js` 蓝圈、毒圈伤害、空投
- `js/br.js` Bot 大逃杀状态机、跳伞
- `js/game.js` 玩家、第三人称相机、HUD、流程、天气、主循环
- `js/combat.js` 飞行弹丸、投掷物与烟/闪、配件外观、红区、罗盘、地图标记（在 game.js 之后加载，覆盖 fireBullet/throwNade）
- `js/vehicle.js` 吉普与小艇：模型、驾驶、碰撞、上下车
- `js/ladder.js` 铁梯攀爬：`MAP.ladders` 登记、玩家 W/S 攀爬、Bot 把屋面当楼层（包装 moveEntity/animSoldier/updatePlayer/updateHUD）
- `js/doors.js` 自动门：towns.js 在换皮模式把门板登记进 `MAP.doors`（不再烘焙静态门板），三组 InstancedMesh（门板/门芯/把手），玩家或 Bot 2.3 m 内自动打开约 105°，离开后关上；纯视觉，门洞不挡路
- `js/handy.js` 便利层：地面物品浮动名牌（类别色 + 名称 + 数量/耐久 + 对你是否有用，视线检测）、自动拾取明显有用的东西（玩家刚丢的不捡）、H 快速治疗、设置里「自动拾取」开关
- `js/endcard.js` 结算/阵亡卡：名次奖章、六格数据、本局称号、渔获记录、身上装备；× 或 Esc 收起成角落小条；包装 hurt/healStart 统计伤害、爆头、吃药
- `js/pose.js` 手臂 IK（换皮模式）：手臂是上臂 + 前臂两段、静止下垂，`islArmIK` 两骨解算；包装 animSoldier（最后一个包装）与 ridePose，按状态给手目标——枪握把/护木（读枪的 meta.grip/lh）、刀低持、空手摆臂、冲刺低姿持枪、换弹托弹匣、手枪双持、方向盘/车把/梯子扶手/伞绳；结算动作在这里重写
- `js/balloon.js` 换皮热气球：飞鱼气球模型（替换 planeModel）、可走动甲板（`deckPlayer`，玩家 pl.deck 本地坐标）、Bot 乘客站位（包装 planeUpdate）、从甲板位置跳伞（包装 jumpOut）
- `js/brain.js` Bot 跨局记忆（localStorage `inkisland_brain`）：包装 playerFire/hurt/botPlanDrop/startMatch/endMatch/updateHUD，最后加载
- `js/replay.js` 死亡回放（环形缓冲 + 包装 frame/updateHUD/startMatch）与远处枪声闷响（包装 SFX.shot）
- `js/finale.js` 结算动作与战绩走势图（最后加载，包装 endMatch/updateCamera/startMatch）
- `js/touch.js` 手机双拇指触控层（`?touch` 可在桌面强开）；`MAP.lod` 在 island.js，画质档位在 game.js `applyQuality`

## 硬规则
- 画风（2026-10-06 起换皮）：`SKIN.on` 时为海岛彩色 + 真实光照阴影（调色板在 `js/skin.js`），人物与建筑不用线稿；`SKIN.on=false` 回到纸白墨线。
- **补丁脚本的替换文本里一个 `//` 都不许出现**（已经第五次把同一行后面的代码吞掉：这次吞掉了 `floor({...})`，全岛二层楼登记消失）。注释一律用 `/* */` 或单独成行。
- 画风：主体只用 PAPER/INK；颜色仅 RED（血）、AMBER（空投/标记）、BLUE（蓝圈/UI）、GLASS、WOOD。
- 名称与文案全部原创，不引用其他游戏的地名、枪名、口号。
- 地形是 2 m 格高度场；导航 1 m 格；建筑盒体 x/z 整数、高度 0.25 m 分级；门宽 ≥ 1.4 m 且位置为整数（细格中心能穿过）。
- 代码保持高密度单行风格，小改动用精确字符串替换，不整文件重排。
- 新 JS 文件加入 `index.html` 的 `files` 数组（按依赖顺序）。
- 改完必须：node --check 全过 + 浏览器实际看一眼无报错；流程改动跑 `tools/smoke.js`。
- 不 commit / 不部署，除非用户要求。用户要求发布时用 `tools/deploy.sh`（GitHub `badabadabing/ink-island` + Cloudflare Pages `salty-isle`，https://salty-isle.pages.dev）；斑码盒子暂不上（2026-10-06 用户指示）。

## 从墨线突击带过来的规矩（2026-10-06，见 `~/Desktop/inkstrike/LESSONS-FOR-INK-ISLAND.md`）
- 背包只有一个真相源：给枪/收枪只走 `invGive`/`invTake`/`invDrop`，禁止直接改 `inv`/`ammo`；`invCheck()` 在拾取/丢弃/每 2 s 校验不变量（槽里的枪必有弹药记录、无孤儿记录、手里的枪在包里），违反即修复并 `console.warn('[INV] …')`，smoke 把它当失败。
- 任何命中率/难度公式先画 0–40 m 曲线看两端：近距离必须封顶（8 m 内每米 +.009 rad 慌张误差、6 m 内突现目标多 .18 s 反应）。让 Bot 显得聪明用行为（掩体、绕行、听声、合围），不用命中率。
- 爆头倍率 3.3，不做「满血一枪」。
- 掉落物必须落在可走到的格子：不可达就吸到最近可达格。
- 永远通过事件触发 UI（`dispatchEvent` / `addEventListener`），不直接调用 `el.onclick()`——小程序容器会改写 handler。
- 平台差异（音频、传感器、指针锁、全屏、存储）若要上小程序，整块隔离成可被构建替换的文件，不是开关；审计是静态扫描。
- 所有第三方资源在 `vendor/`；名称文案原创（已遵守）。
- 暂不做：`sim.step(state, inputs)` 纯函数化（无联机计划时成本过高）、平台能力层（无小程序发布计划）。有计划时先做这两条再加功能。

## 沉淀的教训
- 2026-10-07 Bot 任何「去某处」的目标都要有放弃机制：br.js 的进度看门狗（8 s 不动 1.2 m 就放弃并标记）是兜底，新增目标类型时要在里面登记怎么标记。二楼路线走 `floorPath`（每层 0.5 m 网格），不要再直线 forcePath。审计用 scratchpad 的 tbots（按 Bot 统计冻结时长）。
- 2026-10-07 groundMove 的摩擦有速度保底：任何新的慢速移动（趴、受伤、负重）都要实测速度，目标速度低于保底会被摩擦吃光（步枪匍匐曾经 0.2 m/s）。实测要分武器，手枪和空手会恰好过线掩盖问题。
- 2026-10-07 Sk 草图烘焙后必须清空数组，静态几何上传后释放 CPU 副本（`attribute.onUpload`，先算包围体）：曾经全岛 2.2 GB JS 堆，手机必崩。装饰件每个都要算面数——一朵 5 cm 的小花用球体做是 110 面，全岛 410 万面；小件用三角扇 / 四边形。量面数用 scratchpad 的 probe3（按调用行统计 Sk.add/tri）。
- 2026-10-07 轻点会丢输入：按下和抬起落在同一帧之间时，只看「按住」状态的逻辑（连发开火、触屏跳跃）什么都不做。凡是按住型输入都要同时认按下沿（`G.fireEdge`），或抬起后延时 ≥ 120 ms 再松开。
- 2026-10-07 手机上任何全屏面板都要有可点的关闭按钮：触控层在面板打开时不响应，没有 × 就出不来（背包、大地图曾经如此）。
- 2026-10-07 真机测试：内置浏览器面板被隐藏时页面 rAF 冻结（G.now 不走），长时间实测改用 scratchpad 的 realplay（Playwright + Metal GPU，关后台节流）注入 `tools/autopilot.js`；iPhone 用 `xcrun simctl openurl` + `io screenshot`，加 `?go` 自动开局；看计算样式用 `tools/iosdbg.html`。
- 2026-10-07 静态资源（css/字体）改了要加版本号，`fonts.css` 曾被缓存成旧版导致新字体在真机不生效；`?v=` 只给 JS 加了。
- 2026-10-07 CSS 同时给一个绝对定位元素设 top 和 bottom（两套规则叠加）会把它拉成长柱：touch 规则改位置时要显式 `bottom:auto`。
- 2026-10-07 手臂改成两段 IK 后，别的文件直接写 `armR.rotation` 的姿势（载具、梯子、结算、坐着的钓鱼人）都会被 pose.js 覆盖或含义改变：新姿势一律写成「手的目标点 + 肘部朝向」交给 `islArmIK`/`poseArm`，不要再写肩关节欧拉角。
- 2026-10-07 截图探针里玩家死了会走死亡镜头、改写 camera；探针要么让玩家活着藏起来，要么在同一次 evaluate 里 render 后立刻 `toDataURL` 取图。
- 2026-10-07 对局进行中的状态是 `G.state === 'live'`（不是 'play'）：handy.js 第一版写成 'play'，自动拾取和快速治疗全部静默失效，探针才查出来。
- 2026-10-07 中文字体只用 `vendor/fonts` 里的子集（霞鹜文楷粗 + 马善政，OFL）：新增中文文案后跑 `python3 tools/subset-fonts.py` 重新子集化，否则新字回落到系统字体。描边/阴影一律用 em 单位，小按钮上 px 描边会把毛笔字糊掉。
- 2026-10-07 物品「值不值得捡」只有一个判断 `lootUse(e, it)`（loot.js），必须和 invTake 的拒绝条件一一对应；护甲耐久跟着地上的背心走（`it.dur`），换甲只比耐久。
- 2026-10-07 道路沙带要在 `buildTowns` 之后画：先画会让路面从房子木地板里穿出来（d17 修，占地内顶点下沉 0.6 m）。截图探针瞬移相机后必须 `MAP.lod(x, z)`，否则细节区块没显示，会误判成穿模。
- 2026-10-07 换枪（槽位已有枪）时 `invTake` 要同时 `delete e.ammo[had]`；smoke 不覆盖玩家换枪，`[INV]` 警告只在探针里冒出来。
- 2026-10-05 导航格必须 1 m：墙 0.3 m 厚、门 1.4 m 宽，2 m 格会让 A* 穿墙或把整栋房子判成不可达。长距离用 6 m 粗网格路由 + 短段细 A*，并限制每帧细 A* 次数。
- 2026-10-05 导航高度只取一楼（`t0 + .6` 以内的台面），否则二层楼板/屋顶会被当成地面，楼里全部不可达。
- 2026-10-05 Bot 会落在屋顶、停在导航网格不认识的台面上；必须有「困住就朝圈心走并跳下」的兜底，否则一定被毒圈毒死。
- 2026-10-05 搜刮过滤不能按白圈一刀切：白圈外的据点会让所有 Bot 没枪。只在收缩中且物品远时才跳过。
- 2026-10-05 刀只还手：Bot 落地互砍会让前一分钟死一半人。落地给 22 s 搜刮期。
- 2026-10-05 浏览器面板截图可能拿到上一帧：手动步进后先 `wait 1s` 再截图。
- 2026-10-05 python http.server 会被 Chrome 缓存：开发期脚本用 `?v=${Date.now()}`，导航时 URL 也带随机参数，否则改了文件看到的还是旧的。
- 2026-10-06 **第四次**（brain.js 三处同时中招）：补丁脚本里替换段一律禁止带 `//`，注释单独用 `/* */` 或另起一行。
- 2026-10-06 **再次**：替换段如果不是整行，绝不能以 `//` 注释结尾（已经吞掉过 `let tx`、`floor({...})`、`for (let q...)` 三次）。注释只能写在整行末尾或单独一行。
- 2026-10-05 用字符串替换打补丁时，替换段末尾不要加 `//` 注释——会把同一行后面的代码一起注释掉（撞过一次 `let tx` 消失）。
- 2026-10-06 新全局名先 grep：`RED` 和核心调色板撞名直接让整页白屏（现在叫 `REDZ`）。
- 2026-10-06 建筑可达性只能信 `tools/smoke.js` 的建筑登记断言（门格可达 + 室内 ≥ 25 %）和 3×3 邻域的 badSpots；`navSnap` 吸附会把封死屋里的点吸到屋外。新建筑必须 `building({...})` 登记。
- 2026-10-06 野外选址四条：避树（veg 标记）、建筑间距 ≥ 6 m、门朝落差最小的一面、所有门都走 `doorSteps()`。
- 2026-10-06 世界生成只能用种子 `R()`，不能用 `pick()`/`Math.random`：野外小屋门向曾用 `pick()`，导致可达性审计每次启动不同、smoke 时好时坏。
- 2026-10-06 `compat.js` 里有墨线突击的桩对象（曾有 `TOUCH`）；新文件要声明同名 const 时先把桩删掉，重复声明会让该脚本整个不执行。
- 2026-10-06 补丁脚本里对同一文件只能有一个字符串变量按顺序改（别一边 `rep()` 改缓存一边改局部变量再覆盖——第二十七轮一半改动因此静默丢失，smoke 还是绿的）。
- 2026-10-06 用脚本打多处补丁时每个锚点都要 assert 唯一；失败要让脚本整体不写回，不然半套补丁落盘很难查。
- 2026-10-06 `house()` 里新增有条件的 `R()` 调用会让全岛后续随机序列移位（badSpots 7→11 只是因为换了种子序列）：改生成逻辑后 badSpots 变化先用探针列出每个坏点再决定修什么，不要调阈值。
- 2026-10-06 探针/smoke 报 `scene`/`VM.root` undefined 不一定是 WebGL 坏了：先看 pageerror 列表，往往是世界生成里的 ReferenceError 让 boot 中断。
- 2026-10-06 `setWeather` 曾按 mesh 遍历给共享材质反复乘雾系数（100 个区块共用一个材质 → uFog 爆到 1e8，黄昏/雾天整岛变白，纸白画风下没人发现）：改材质 uniform 必须按材质去重，fog0 存在 material.userData。
- 2026-10-06 截图探针和 smoke 不要并行跑两个 headless Chromium：GPU 争用会让截图偶发整层变白，先怀疑并行再怀疑代码。
- 2026-10-07 往 Sk 里直接 push 顶点（lgAppend、背包图标）必须同时 push 法线 N，否则打光材质下物品发白发糊。
- 2026-10-07 换皮后的 Lambert 材质被其它代码 clone 时要带上 uniforms 代理（skinMat 自带 clone），否则打爆载具时整帧崩溃。
- 2026-10-07 世界装饰（遮阳篷、花箱）用位置哈希 hash01 决定，不能调 R()：多一次 R() 会让全岛随机序列移位、物资点和可达性全变。
- 2026-10-07 纸白风下「看不见」的几何在换皮后会暴露：楼层分隔带整盒覆盖楼板、墨线圈、`INK` 粒子与贴花——换皮时逐类排查颜色为 PAPER/INK 的遗留件。
- 2026-10-07 在早加载文件里包装晚加载文件的函数（如 gunskin 包 lgTemplate）会在加载期报 not defined；包装放到晚加载文件里执行。
- 2026-10-07 发布前必须看到 `SMOKE OK` 才部署：不要用 `grep SMOKE && deploy` 这种链（grep 匹配到 SMOKE FAIL 也返回成功）。smoke 有随机阈值（毒圈阵亡、首分钟阵亡），偶发失败要重跑确认。
- 2026-10-07 换皮后凡是运行时重设渲染参数的老代码（setWeather 改雾浓度、vehWreck 克隆材质、天气叠层颜色）都要按换皮值复查，否则会把换皮设定悄悄改回纸白风数值。
- 2026-10-05 地上物品不要用贴图纸片：用户第一眼就说像 2D。所有可见物都要是 Sk 画的纸模。
- 2026-10-05 从墨线突击继承：国外 CDN 不可靠，一切资源放 `vendor/`；屏幕投影标签先用 `matrixWorldInverse` 判前方；水平面排线掠射角有摩尔纹，`hl()` 用 fwidth 淡出；步态必须由真实位移驱动。

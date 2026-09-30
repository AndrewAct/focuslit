# FocusLit roadmap

更新：2026-09-29。**M0 本地实现进行中；M1 平台验证本地进行中；M2 桌宠核心交互本地进行中；M0–M5 均未完成。** 当天首次桌面截图收到明确的产品体验否定反馈，随后同一天内实现并经 Andrew 实机验收了真实透明桌宠窗口；下述修正与进展是后续实现和验收依据。

目标：用户说清当前任务后，一只安静的猫帮助识别并中止持续分心，同时保留资料检索、
背景音乐和自主休息。第一版面向个人 macOS 使用，再达到可分发的私测质量。

## 交付顺序

| 阶段 | 可见成果 | 退出门槛 | 状态 |
| --- | --- | --- | --- |
| M0 工程基础 | 可启动的安全桌面窗口，PR 自动检查 | 从干净 checkout 安装、测试、构建通过 | 本地进行中；CI 未运行 |
| M1 平台验证 | Safari/Chrome 真实连接与状态引导；桌面猫咪跨屏窗口验证 | 实机桥接、权限/重启/断连、指定测试 tab 关闭证据，签名分发路径明确 | 本地进行中：Chrome 实验已验证；Safari 的本地 fixture → native 容器已实机验证，尚未接入 Electron |
| M2 陪伴体验 | 默认布偶猫气质桌宠、点击展开操作、首次语言选择、音乐与休息 | 经用户认可的猫咪造型；无 AI 也能完成舒服的完整时段 | 本地进行中：透明桌宠窗口/拖拽/点击展开/时长选择已验收；表情/模板/音乐/首启语言/菜单栏未完成 |
| M3 确定性干预 | 规则提醒、倒计时、关闭与恢复链接 | 关键竞态、误关防护、重启恢复测试通过 | 未开始 |
| M4 语义与预算 | OpenAI/Anthropic 可选接入，先观察再启用干预 | 固定评估集、实用成本账本、错误降级通过 | 未开始 |
| M5 私测发布 | 签名公证安装包、扩展发布路径、安装升级证据 | 完整 CI/CD 与真实工作流验收 | 未开始 |

依赖：M0 → M1 → M2 → M3 → M4 → M5。M1 尽早产出签名试包，M5 才是完整发布验收。
没有承诺日历交付日期；完成退出门槛再推进。文档和产品原型可以穿插，不以多线开工替代闭环。

## 2026-09-29 产品优先级调整：语言入口、报告与开源呈现

Andrew 明确指出：主操作层同时常驻中文/English toggle 已经是反模式，不能再把现有临时切换
当成双语完成。**下一个 M2 实现切片是首次语言选择与设置闭环**：干净 profile 首次启动只选
中文或 English；选择持久化；后续 UI 只显示所选语言；主面板移除语言 toggle，语言变更仅在
Settings 可达。验收包含首次启动、重启保留、设置内即时切换、中英文实际截图与打包 app 实机验证。
这项实现尚未开始；2026-09-29 仅调整了中英文面板文案，并允许空目标启动本地时段。

**报告成为正式的下一条产品价值线，但不先做四套图表。** 先写出最小 `SessionSummary` 的存储
决策和失败模型，再实现单个“今日专注”纵向切片：结束时记录可空目标、开始/结束、实际 running
时长和结束原因；只存本机，不要求浏览记录、模型或云端。日/周/月/年均从同一份 session 摘要按
本地时区实时聚合，不分别持久化报告；展示“专注时段记录”，不声称测到了真实注意力。开始前须
决定 SQLite 相比 append-only JSON 的取舍、幂等写入、DST/时区、删除、导出和十年体积上限。
它不取代 M1：Safari → Electron 的受认证只读桥接、Chrome 的过期命令/worker 重连/peer
authentication 仍是浏览器承诺的独立安全门槛，不能直接扩到普通页面或自动关闭。

**开源 README 是独立呈现切片，不抢占上述产品闭环。** 应使用真实的单语言 app 截图/短录屏，
清楚分开“现在可用”和“探索中”，写明本地隐私边界、开发方式和架构，不把测试页 bridge 写成
通用浏览器监测。先决定仓库和美术 license，才能把公开协作材料当作可发布承诺。ParqDB 的
README 信息架构（清晰定位、视觉锚点、Quick Start、状态与文档入口）可参考；FocusLit 保持
温暖、安静的自身视觉，而不复制其赛博风格。

CPU/内存/磁盘/文件系统等作为 FocusLit 自身的性能测量可保留，但不进入近期用户功能范围；它会
稀释“帮助专注”的核心工作流。励志语录/主动提醒也不默认加入，避免破坏安静陪伴；未来若做，
应为低频、可关闭、上下文明确的提示。AI 是随后明确同意、可关闭并有预算的可选能力，模型输出
永远不获得浏览器操作权。

## 2026-09-27 用户反馈：产品方向修正与交接重点

当时的 `FocusLit.app` 只能做 60 分钟本地计时；当天后续改动已支持 1 小时、3 小时和自定义 1–180 分钟。浏览器扩展、Safari/Chrome 桥接、权限引导、页面分类和自动干预仍不存在；“Browser monitoring is not connected” 是真实不可用状态。因此当前不能当作完整专注助手使用。M1 先证明真实连接，M3 才能交付按规则干预；不为演示伪造“已连接”。

用户明确否定了当前的大面板、简笔 CSS 猫和常驻中英切换：它们只算 M0 工程占位，**不是产品设计验收**。后续默认体验是桌面上独立、可拖动、安静陪伴的猫咪，视觉存在感与用户提供的第二张桌宠参考截图接近；**单击猫咪才展开紧凑操作层**，可开始/查看任务、暂停/继续、休息、结束，收起后回到猫咪。不要把当前 420×560 面板换色后当成桌宠。菜单栏与设置仍提供等价操作，透明区域不能挡住其他应用或抢输入焦点。

角色默认定为**原创奶牛猫**：黑白花纹、圆脸、大而有神的眼睛、柔软胖短的身体和清晰的耳朵/小爪。用户给的参考图用于可爱程度、身体比例和屏幕占比，不复刻图中角色；用户也喜欢布偶猫的温顺感，可作造型比稿参考，V1 仍只交付一只默认奶牛猫。尺寸应在真实桌面及不同缩放下与参考宠物观感相近，由可用区域和外接屏实测确定，不沿用早先 80–112 pt 的占位假设。先交付可审阅的造型/尺寸/状态图，再实现正式资产；至少包括陪伴、不确定、提醒、倒计时、休息、完成的可辨表情和少量情境交互。默认静止，Reduced Motion 可用，不能靠持续跳动表现“活泼”。

语言在**首次启动**时选择中文或英文并持久保存，以后直接使用所选语言；仅在设置里更改。移除当前主界面右上角的语言 toggle。首次引导在语言之后解释当前“仅计时”或各浏览器真实连接/授权状态，分别给 Safari、Chrome 可执行的连接步骤；未连接时仍可开始计时，但须明确该时段没有浏览器监测。连接完成后再出现与权限一致的状态，不把 API key 当作开始计时的前提。

交给下一位实现者的顺序：先以参考图和上述交互做桌宠方案供 Andrew 审阅；并行保留 M1 的真实浏览器桥接实验；再实现首次语言选择、猫咪点击操作层和连接引导。每个切片用真实桌面截图/短录屏评估可爱度、尺寸、跨屏拖动、焦点和中英文；浏览器能力必须以真实 Safari/Chrome 实测为准。任何阶段都不要把现有临时猫咪截图当作 UI 完成证据。

## 2026-09-27 用户反馈（第二轮）：看过方向稿画板之后

Andrew 看过第一版方向稿画板（总览/造型与状态/交互原型三块画板）后给的具体反馈：

**角色：改选布偶猫气质，奶牛猫保留。** 两个形象都想留着，但对比效果图后奶牛猫观感不如
布偶猫，所以 V1 默认换成布偶猫气质；奶牛猫记录为备选，不删除。长期甚至不排除跳出单一
猫咪形象（提到鲸鱼尾看板娘风格作参考），但 V1 仍然只做一只猫上线，第二形象要走
AGENTS.md 里"second pet"那条的记录决定流程。

**尺寸：128 px 是当前默认候选**，仍要在真机和外接屏上最终验证。

**可爱度不够：** 第一轮造型稿被反馈"不够可爱"，要往萌二、一二布布这类圆润简化风格靠，
同时保留原始参考截图的可爱程度和身体比例参考。下一步是再出一版形状稿，不直接跳正式资产。

**v3 衍生状态稿再次未通过：** Andrew 反馈从 `focuslit-cat-concept-v3.png` 得到的姿势/表情很丑。
当前 Rive 场景只旋转整张猫咪 PNG，没有独立改变五官或身体，不能把编译通过当成美术通过。
暂停批量做六态；先用同一角色母版出陪伴、不确定、完成三张真正不同的 128 px 表情对照图，
请 Andrew 审阅可爱度和一致性后再扩展姿势与 Rive。详见本地 `docs/NEXT_STEPS.md`。

**方向稿画板本身的两个问题，已在这一版修：**
1. 六态图谱的气泡同时显示中英文，容易让人以为产品里也会双语同屏——实际 i18n 是选定
   语言后只显示一种语言，画板改成跟着一个语言切换演示，不再双语堆叠。
2. 气泡在某些状态下文字换行太窄，可能压到猫本身；换成固定宽度加单语言后应该消掉，
   仍需要 Andrew 在新版画板上确认。

**未来想法，记录但不是 V1 范围：**
- 可调的"善良程度"设置：Andrew 澄清过这是语气刻度（鼓励 ↔ 直接吐槽），不是羞辱开关；
  "你完全不学吗？"是直接，不是人身攻击，跟 AGENTS.md 的"不能羞辱用户"并不冲突。V1 不做。
- 不排除未来跳出单一猫咪形象，参考其他看板娘风格（例如鲸鱼尾角色）。V1 范围不变。

## 2026-09-27 用户反馈（第三轮）：桌宠核心交互验收通过，记录下一步

Andrew 在真机上验证了当天实现的透明桌宠窗口、点击展开/收起、拖拽、时长选择和悬浮倒计时后
确认满意（"很不错了""真的好可爱"）。细节见下方 M2 的当天进展记录。

Spotlight 对深埋在 `~/dev/focuslit/apps/desktop/out/...` 里的 `.app` 短关键词（如"focus"）
搜索排名很低的问题已定位（Launch Services 按解析后的真实路径排名，不认 `/Applications` 里
指过去的 symlink），今天先记录、不处理；真要解决需要打包后把 `.app` 真拷贝一份进
`/Applications`（而不是 symlink），留给以后需要更方便启动方式时再做，或等 M5 走正式签名分发。

后续保留两个方向；当前开工优先级见下方，具体切片见 `docs/NEXT_STEPS.md`：

1. **M1 真实浏览器监测**：按既有 M1 计划做 Safari/Chrome 真实桥接，产品才能从"仅计时"
   变成真正的专注助手。
2. **M2 桌宠互动加深**：不只是静态表情切换，还要有动作/动画。Andrew 提的具体想法——点击
   或悬停猫咪时触发一个短暂的"舔毛"动作，让桌宠更有生气、更吸引人，但不能变成持续动画或
   打扰源。这与 AGENTS.md"默认静止...不能靠持续跳动表现活泼"的约束并不冲突：舔毛动作是对
   用户主动交互（点击/悬停）的短暂响应，事件驱动、有明确开始和结束，不是常驻循环动画。
   实现前需要先出角色母版的舔毛姿势/动作稿供 Andrew 审阅，遵循与陪伴表情稿相同的"先出
   对照图/短录屏再接入应用"流程，不要直接跳正式资产或动画代码。

## 2026-09-28 本地进展：M2 长时段小动作已接入并完成新包

Andrew 提出桌宠在较长的专注时段也应偶尔有一点生气；确认的规则是：**进行中的 session 满 10
分钟后做一次短暂动作，之后每 5–10 分钟活动专注时间随机做一次**。这不是连续动画或 idle
判定，也不会抢焦点。随机动作候选为已有的舔毛、哈欠与耳朵轻摆；只要选中耳朵，左右耳就按上次
方向轮换，避免重复同侧而显得机械。面板展开时不播随机动作；暂停/睡眠不累计，恢复后不会补发
遗漏的多次动作，渲染延迟最多只播一次后重新从当前活动时间安排下一次。

**已批准的美术与来源：** Andrew 已在 128 px 看过并认可 `focuslit-cat-yawning-v1.png`、
`focuslit-cat-ear-wiggle-v1.png`（左耳）和 `focuslit-cat-ear-wiggle-right-v1.png`（右耳）。它们
用获批准的 `assets/focuslit-cat-happy-v1.png` 作 identity anchor、由 Codex 内置 ImageGen 生成，
透明背景、无第三方角色/素材；根 `assets/` 保留审阅源稿，渲染层副本在
`apps/desktop/src/renderer/assets/cat/`。这些资产和本次代码仍是本地未提交材料，若将来要追踪/
公开，先按 AGENTS.md 决定资产许可与仓库范围。

**实现和验证：** `packages/core/src/companion-actions.ts` 保持调度为可注入随机源的纯函数；
`companion-actions.test.ts` 覆盖 10 分钟阈值、5–10 分钟上/下界、暂停不触发、渲染延迟不补发和
耳朵方向轮换。`App.vue` 按 session 的活动累计时长消费结果并映射到静态动作图；`style.css` 只做
一次性淡入/缩放，Reduced Motion 退回静态姿态。使用 Node 24.21.0 的 `pnpm test`（24 passed）和
`pnpm check` 均通过；`pnpm package:mac` 成功生成新的 arm64 未签名
`apps/desktop/out/FocusLit-darwin-arm64/FocusLit.app`，并核对其 `app.asar` 含三张新动作 PNG。
无新增运行时网络、云服务或 API 成本；代价是三张静态透明 PNG 增加包体积，尚未测量最终包增量。

**未完成边界：** 尚未在真实桌面连续运行超过 10 分钟以确认频率、打断感与点击/拖拽不受影响；
也没有完成签名、公证或发布。动作功能不代表 M2 已完成，六态的其余表情、首启语言、菜单栏、
音乐、休息与桌面礼仪验收仍按原退出门槛推进。

## 2026-09-27 代码复核后的优先级与开工入口

Andrew 确认下面三项需要修，但**不列为 P1，也不阻断下次先推进 M1**。它们是已知体验/边界缺口，不代表本次桌宠核心交互验收失效：

| 后续修整 | 归属与完成证据 |
| --- | --- |
| 折叠态透明矩形边角仍拦截底下应用点击 | M2 桌面礼仪；在真实桌面验证点击猫咪可展开、透明区域可点穿，且拖拽仍可用 |
| 拖动后或外接屏断开时猫咪可能留在可见区域外 | M1 多屏窗口验证 / M2 位置恢复；验证不同缩放、拔屏、重启后可见且可操作 |
| 自定义时长空值、越界值被静默改成 60 或夹到 1–180 | M2 计时表单修整；给出明确校验反馈并阻止无效提交，验证实际开始时长与界面一致 |

**下次直接开始：M1 Chrome 最小真实连接切片。** 从 `apps/extension` 的 Chrome MV3 最小扩展和本机 native messaging 链路入手，在自建无害测试页读取活动 tab 的 URL/标题及导航身份，经版本化消息送到桌面主进程，显示真实的未安装/待授权/已连接/断连状态；先只读，不执行关闭。用真实 Chrome 验证授权、导航、worker 重启和断连，再做指定测试 tab 的关闭实验。Safari 容器与桥接仍是 M1 的独立必过门槛，不能用 Chrome 的结果代替。具体执行顺序见 `docs/NEXT_STEPS.md`。

## 2026-09-28 本地进展：M1 Chrome 只读链路代码完成，待真机验收

实现了上面这条切片的完整代码路径。**下面这段是当天早些时候（写代码后、上真实 Chrome 前）的状态**，只是工程 smoke；
后续在真实 Chrome 的验证结果见下方 M1 段的「2026-09-28 本地进展」，以那段为准。

- `packages/contracts/src/browser-bridge.ts`：新增版本化协议 schema（`hello`/`welcome`/
  `versionRejected`/`tabObserved`），含 protocolVersion、connectionEpoch、messageId、
  profile/browserInstance/window/tab/navigationSeq 页面身份；`browser-bridge.test.ts` 覆盖
  合法握手、多余字段拒绝、未知消息类型拒绝。
- `apps/desktop/src/bridge/server.ts`：Electron 主进程内的 Unix socket server（路径
  `~/Library/Application Support/FocusLit/bridge.sock`，换行分隔 JSON，是桌面与 host 进程
  之间自定的私有帧格式，不是 Chrome 那套 4 字节长度前缀 stdio 帧），做版本校验、握手后才接受
  `tabObserved`、连接状态（pending/connected/disconnected）推导 + `not-installed`（按
  Chrome NativeMessagingHosts 清单文件是否存在推断）。`main.ts` 新增
  `app.setName("FocusLit")`——不加这行的话，打包后 app 的 userData 目录名取决于被打进
  asar 的 package.json，实测packaged 版本确实落到了 `~/Library/Application Support/@focuslit/desktop`
  而不是 `FocusLit`，会让 host 脚本写死的 socket 路径直接失配；这个坑是这次本地验证时
  真实碰到并修的，不是纸面假设。
- `apps/desktop` 渲染层：footer 从写死的"浏览器监测尚未连接"改成真实 `bridge:getStatus`
  / `bridge:changed` IPC 驱动，Chrome 显示 not-installed/pending/connected/disconnected
  四态文案，Safari 单独显示"桥接尚未实现"（不复用同一套状态机，因为这四态目前只对 Chrome
  是诚实的——Safari 完全没有实现，不是"未安装"那种可安装状态）。
- `apps/extension`：Chrome MV3 扩展源码（`manifest.json` 用固定生成的 key 使解包加载的
  extension id 稳定在 `fcfekebhkfdaifnkckadnhndhplfcfnm`，不随目录路径变化，方便 native
  host 清单提前写死 allowed_origins）；`src/background.ts` 只在活动 tab URL 命中
  `/focuslit-test-page/` 时才会上报（代码层面强制只读测试页，不依赖"Andrew 手动只开测试页"
  这种约定），用 `chrome.storage.local`存 profileId、`chrome.storage.session` 存
  browserInstanceId（前者跨浏览器重启持久、后者只跨 service worker 睡眠/唤醒持久、浏览器
  真正退出后清空，用来区分"同一 profile"和"同一次浏览器启动"这两个不同身份）；`vite build`
  产出 `dist/background.js` + `dist/manifest.json`，已跑通（117.67 kB，主要是打包进去的
  zod，用于和 `packages/contracts` 共享同一份协议 schema）。
- `native/macos/chrome-host/host.mjs`：Chrome 原生消息 host，故意不接工作区依赖、零第三方
  包——Chrome 直接按绝对路径起这个进程，不经过 pnpm/vite，所以放弃了在这里复用 zod
  校验，只做基本结构检查；真正的信任边界校验在桌面端（收到的都当不可信输入，交给
  `bridge/server.ts` 的 zod schema 判定）。`install.mjs` 生成该 host 的 native messaging
  清单并写入 Chrome 的 `NativeMessagingHosts` 目录、`chmod +x` host 脚本；用假 `HOME`
  跑过一次验证路径拼接正确，**没有对 Andrew 真实的 Chrome profile 执行过**，需要他自己跑
  `node native/macos/chrome-host/install.mjs`。
- 本地验证到什么程度：起了一次 `pnpm dev`，确认 `bridge.sock` 真的创建在预期路径；写了
  一个裸 socket 探针脚本模拟 host 端行为（发送错误 protocolVersion→收到 `versionRejected`；
  正确握手→收到 `welcome`；未握手直接发 `tabObserved`→被丢弃不回应），三种行为都符合设计。
  这只验证了桌面端 socket 协议本身，**没有验证 Chrome 扩展、native host 进程、真实
  `chrome.runtime.connectNative` 链路、worker 唤醒/重连、也没有肉眼看过桌宠 footer
  实际切换文案**——这些必须由 Andrew 在真实 Chrome 里做，见 `docs/NEXT_STEPS.md` 的
  验收步骤。`pnpm check`、`pnpm test`（当时 9 个测试，新增 3 个 protocol schema 测试；最新为 18 个）、
  `pnpm build:extension` 全部通过。
- 已知缺口：桌面只跟踪一个活动 Chrome runtime；新 host 连接会主动替换旧 socket，避免旧连接
  的迟到事件污染状态，但尚没有多 profile/多实例的并行状态模型；navigationSeq 是扩展本地计数器，不是
  `chrome.webNavigation` 的真实 navigation id；tab/window id 复用问题仍未处理（沿用
  ARCHITECTURE.md 里原有的已知限制）；host 与桌面之间断线重连有 2 秒退避，未做上限/退避
  曲线的真实压测；Safari 完全未动工。

## M0 — 工程基础

**Problem:** 明早开始后，任何行为变化都需要可重复检查，代码与文档不能各说各话。

**Current behavior:** 已有最小时段窗口、状态机和本地检查；CI workflow 已创建但远程未运行。

**Architecture:** pnpm workspaces；Electron/Vue/TS 桌面；独立纯 TS 核心与边界契约。

**Primary data/control flow:** 开发命令 → 相同 CI 命令 → 测试/构建产物。

**Key decisions:** Node 24.21.0、pnpm 10.12.1、Electron 44.4.5、严格类型、根 lockfile；
Forge 与 pnpm 使用 hoisted linker，并以真实 package 命令验证。创建实际需要的 workspace。

**Alternatives rejected:** 多包管理器、依赖安装时取 latest、用框架数量证明工程完整性。

**Correctness invariants:** 干净安装可重现；CI 不修改 lockfile；未实现脚本不能假成功。

**Failure modes:** 本地 Node/CI 漂移、原生 ABI 不匹配、required check 因路径过滤永不出现。

**Scaling limits:** 初期单仓库单人开发，目标快速 PR 反馈；不需要远程构建服务。

**Tests and validation:**

- [x] 落实当前 README 脚本；格式、ESLint、TS/Vue 类型检查、Vitest 可执行。
- [x] 建立最小会话状态/协议行为测试，验证边界解码失败。
- [ ] PR 和 `dev`/`main` push 有 `quality` workflow；稳定的总 gate 不漏跑。
- [x] 本地 macOS 启动窗口和未签名打包 smoke；版本/环境说明已写入待提交配置。
- [ ] GitHub Actions 权限、分支保护、依赖更新和安全扫描按质量文档核实配置。

**Observability:** CI 检查结果、版本清单和失败 artifact；不上传个人页面信息。

**Known gaps:** 此阶段不证明 Safari、AI、猫咪设计或签名发布可用。现有窗口是已被用户否定的工程占位，不能作为 M2 设计基线。

**Interview challenge questions:** 为什么选 Electron？本地绿、CI 红如何定位？哪些依赖需要 macOS？

**2026-09-27 本地进展（未完成里程碑）：** `pnpm check` 通过；`pnpm test:coverage`
6 个测试通过，当前 core 分支覆盖率 100%（代码范围很小，不能代表后续策略安全）；固定
Node 24.21.0 下 `pnpm package:mac` 生成未签名 arm64 `FocusLit.app`，本机打开后验证
开始→暂停→继续→结束、中文/英文切换和浏览器“未连接”状态。机器为 macOS 26.6.2 arm64。
实现提交为 `5f2d125`；临时干净目录的 frozen-lockfile 安装、`pnpm check` 和
`pnpm test:coverage` 通过，未在该目录重新打包。CI 首跑、真实 git checkout、GitHub
分支保护尚无证据；没有远程 artifact。
应用尚无持久化、菜单栏、浏览器桥接或签名。API/CI 费用为零（未运行远程 job）。
**用户复核结果：** 2026-09-27 截图中的角色不够可爱、面板交互不符合桌宠预期，语言切换位置错误；浏览器未连接使产品用途无法完成。工程 smoke 结果保留，但视觉/产品验收未通过，修正要求见上方“产品方向修正”。

## M1 — Safari、Chrome 与 macOS 可行性

**Problem:** 用户依赖两个浏览器；开发态可读 URL 不代表打包后可用，更不代表能安全关 tab。

**Current behavior:** Chrome 只读连接 + 指定测试 tab 关闭实验已在真实 Chrome 验证通过（见下方
2026-09-28 本地进展）。Safari 的 Apple Development 签名 Debug 容器已在实机启用；用户明确点击
工具栏 action 后，限定本地 fixture 页成功完成 Safari extension → native handler 往返。它没有读取
其他页面、没有关闭 tab、没有 Electron 连通或应用内连接状态，因此距离 M1 退出门槛仍很远。

**Architecture:** 共享 TS 扩展逻辑 + 分平台 manifest；Chrome native messaging host；Safari
Xcode 容器/原生扩展 + 桌面桥接；实际进程拓扑在本阶段决策记录中锁定。

**Primary data/control flow:** 浏览器安装/授权引导 → 扩展事件 → 校验后的本地连接 → 分浏览器连接状态 → 指定测试 tab 的短期命令 → 回执。

**Key decisions:** 先做无害测试页面；区分浏览器实例、profile、窗口、tab、导航；支持权限撤销。
Safari 不能直接复用 Chrome native messaging host。验证容器打包、签名、安装定位与升级路径。

**Alternatives rejected:** 持续截图、轮询 AppleScript 作为最终架构、把普通 Playwright WebKit
测试称为 Safari 扩展测试、临时 localhost 裸端口绕过桥接设计。

**Correctness invariants:** 仅操作被指定的测试页面；无连接不能假装正在监测；不能关闭整个浏览器。

**Failure modes:** MV3 worker 休眠、Safari 权限变化、profile/tab ID 重用、关闭前页面跳转、
助手重启、外接屏拔掉、原生扩展在开发目录以外不可用。

**Scaling limits:** 一台 Mac、Safari/Chrome 多窗口/profile；至少记录 50 个打开 tab、一个持续
播放音乐页面、连续切换页面时的事件率/内存/延迟，规模是验证负载而非产品上限。

**Tests and validation:**

- [ ] 两浏览器实际扩展读取活动页面，正常与权限拒绝状态可见。
- [ ] 用户能在应用内看到 Safari/Chrome 各自的未安装、待授权、已连接、断连状态，以及对应的下一步；无连接时明确为“仅计时”。
- [ ] 导航、SPA 内容变化、重开浏览器、worker 休眠后可重新握手。
- [ ] 测试 tab 可关闭；过期命令、换页命令、重复命令不误关其他页面。
- [ ] 透明窗口可拖过两屏；缩放、拔屏、Spaces/全屏、焦点行为有实机记录。
- [ ] 创建早期安装产物；有证书时做签名公证试包并从安装目录重测。
- [ ] 无证书时明确签名子项未完成，记录发布依赖；可以继续 M2/M3，但不能宣称平台/分发全通过。
- [ ] 决策记录确定 bundle IDs、桥接安装方案、支持的 OS/browser/Xcode 版本，以及残余关闭竞态。

**Observability:** 脱敏的连接/权限/事件丢失状态、协议版本、命令 ACK/拒绝原因。

**Known gaps:** 浏览器 API 缺少原子“比较页面版本再关闭”的能力时，仍有微小竞态；必须明确
可接受范围和更保守的阻断选择，不能声称绝对零误关。Chrome host 与桌面间的 Unix socket 当前
只依赖同一 macOS 用户目录权限和协议 schema，尚没有每次安装的配对/认证 secret；因此它只适合
受限的 M1 开发测试页实验，绝不能成为可对真实 tab 行使权限的最终本地信任边界。

**Interview challenge questions:** 同一个 tab ID 为什么不够？两个浏览器都显示 active tab 时哪个在前台？

**2026-09-28 本地进展（未完成里程碑，Chrome 半支才刚开始）：** 在 Andrew 的真实 Chrome 上完整
跑通了只读连接 + 指定测试 tab 关闭实验，过程中定位并修复了两个只有真实环境才会暴露的 bug，
记录下来因为都是有价值的调试证据，不是纸面设计就能预见的：

1. **打包/开发态 userData 目录不一致。** Electron 默认按 package.json 的 `name` 字段
   （`@focuslit/desktop`）而不是产品名 `FocusLit` 生成 `userData` 目录；实测已打包的旧版
   `.app` 确实落在 `~/Library/Application Support/@focuslit/desktop`，会让 native host
   写死的 socket 路径直接失配。修复：`main.ts` 顶部显式 `app.setName("FocusLit")`。
2. **Chrome 原生消息 host 因 PATH 解析失败静默退出。** `host.mjs` 用
   `#!/usr/bin/env node`；从终端手动跑没问题（shell PATH 含 Homebrew），但 Chrome 从
   Dock/Spotlight 启动时用 macOS 极简默认 PATH（不含 `/opt/homebrew/bin`），`env` 找不到
   `node`，进程在任何代码执行前就退出，Chrome 侧只报 `Native host has exited.`、没有其他
   线索。定位靠对比"终端直接跑 host.mjs 正常"和"Chrome 拉起后立刻退出"这两个现象的差异。
   修复：`install.mjs` 改为在安装时用 `process.execPath` 生成一个写死 node 绝对路径的
   `run-host.sh` wrapper，native messaging 清单的 `path` 指向 wrapper 而不是 `host.mjs`
   本身，绕开子进程 PATH 解析。
3. **真实竞态：握手消息可能在到桌面的 socket 连接建立前就到达并被吞掉。** `host.mjs` 里
   `connectSocket()` 是异步的；Chrome 通过 stdin 送来的 `hello` 有时会在这个连接完成前
   到达，原实现里 `if (!socket) return;` 直接丢弃，握手就永久丢失，行为上表现为"偶尔连接
   成功、重启后又连不上"——正是本地复现到的现象，不是猜测的边界情况。修复：加一个有上限
   （50 条）的 `pendingOutbound` 队列，连接建立后统一 flush，不再吞消息。

在此基础上验证通过：解包扩展加载（固定 id `fcfekebhkfdaifnkckadnhndhplfcfnm`，manifest 里
`key` 字段生成）、`node native/macos/chrome-host/install.mjs` 注册 host 清单、真实
hello/welcome 握手、footer 从 not-installed → pending → connected 的真实状态切换（`docs/NEXT_STEPS.md`
有完整操作步骤）。指定测试 tab 关闭实验（`packages/contracts` 新增 `closeTab`/`closeTabOutcome`
协议，扩展端在执行前重新读取 `chrome.tabs.get` 的实时状态，不信任命令自带的身份声明）三条
安全属性都在真实 Chrome 里验证通过：

- 正常关闭：点击后测试页 tab 真的被 `chrome.tabs.remove` 关闭。
- 重复命令：tab 已不存在时再次点击返回 `tabNotFound`，没有误关别的 tab。
- 换页保护：把测试页 tab 导航到 google.com 后点击关闭，返回 `navigationMismatch`，
  Google 页面原样保留，没有被误关。

**Safari 2026-09-28 本地进展（未完成里程碑）：** 使用 Xcode 26.1.1 的
`safari-web-extension-packager` 创建了 macOS-only 容器 `com.andreweats.focuslit.safari` 和内嵌
extension `com.andreweats.focuslit.safari.Extension`。先运行了 `CODE_SIGNING_ALLOWED=NO` 的 Debug
编译；经 Andrew 明确授权后，又以 Xcode automatic signing 成功生成 Apple Development 签名的 Debug
app，并用 `codesign --verify --deep --strict` 验证容器和嵌入 extension。两 target 均为 App Sandbox，
没有网络 entitlement。该产物只在本机临时 DerivedData 下，未公证、未分发；也不构成 Safari 安装或
桥接验证。扩展仅在本地 `file:///.../focuslit-safari-test-page/...` fixture 成为当前
页面时上报；原生 handler 对协议版本、UUID、页面 ID、长度及 fixture URL 做验证，只记录随机
message ID、不持久化 URL/标题、不拥有关闭 tab 权限。Safari JS → native 的实际消息、Safari
权限/重启、以及 native container → Electron 的受认证 IPC 仍全未验证；不得把 Chrome 的本地
socket 授权模型照搬为 Safari 最终方案。manifest 尚未配置正式 icons；这是开发测试容器，不能发布。

**Safari 容器 UI 调试记录（未通过）：** Xcode packager 的默认 storyboard/WebView 在实际启动时只
显示空白窗口。随后把容器改为 AppKit 原生状态页，并移除了 storyboard 启动项；macOS 仍会恢复此前
保存的空白开发窗口。当前 `AppDelegate` 延后 250 ms 后直接替换恢复窗口的 `contentViewController`，
并移除了启动时的 `SFSafariExtensionManager` 状态查询，避免让 Safari 通信阻塞首帧。每次修改后的
Apple Development 签名 Debug build 都通过，但自动化窗口观察器对最新实例超时，未获得修复后实际
界面的可见证据。下一步应从 Xcode 的 Run 直接启动这一 target 并人工确认原生文字与“Open Safari
Extensions Settings…”按钮；在此之前不得打开 Safari 设置、更不得启用 extension。该 UI 问题和
原生消息/desktop IPC 是独立的，后两者尚未开始。

**Safari 构建与交接定位（2026-09-28）：** 最新通过签名验证的产物是独立的开发容器
`/private/tmp/focuslit-safari-signed-derived/Build/Products/Debug/FocusLitSafari.app`，不是桌宠
Electron app 的组成部分，也没有被复制到 `/Applications`。Spotlight 打开的 `FocusLit.app` 是
`apps/desktop/out/FocusLit-darwin-arm64/FocusLit.app`；它最后一次打包时间为当天 14:44，不能显示
任何 Safari 容器 UI 或 Safari 扩展改动。因此“Spotlight 中看不到 Safari 改动”是当前架构下的
预期结果，不是 Safari build 未通过。下次直接从 Xcode 打开
`native/macos/safari/project/FocusLitSafari/FocusLitSafari.xcodeproj`，选择 `FocusLitSafari` scheme
并 Run；先人工确认原生状态文案和 Settings 按钮可见。只有在该 UI 已确认且 Andrew 当时再次明确
同意后，才可打开 Safari Extensions Settings 并启用扩展。之后才验证 fixture 消息，再另行设计
container → Electron 的受认证 IPC；不能把临时 DerivedData app 当作已集成、可发布的桌宠 build。

**Safari 2026-09-29 实机验证（未完成里程碑）：** 在 Safari Extensions Settings 中移除了旧的开发
容器并启用了一个新签名 Debug 容器；旧 `.app` 仅移入废纸篓，仍可恢复。此前 `tabs` 权限会导致
Safari 警告扩展可查看所有访问网站的历史；为避免这个过宽授权，开发 manifest 改为仅
`activeTab` + `nativeMessaging`，没有 host permissions，也没有后台 tab 监听。扩展只在用户显式点击
工具栏 action 时接收 Safari 交给它的当前 tab，并且只接受本地
`file:///.../focuslit-safari-test-page/index.html` fixture。实机点击后 action 的仅悬停标题变为
`Fixture message accepted`，证明 extension → native handler 的消息和回执真实往返；Safari 设置也
显示为仅在使用扩展时读取当前标签页，而不是所有网站历史。临时 `OK`/`!` 角标被用户认为干扰，已在
同日构建中移除并主动清空旧 badge，保留无常驻视觉装饰的悬停反馈。最终 Debug app 已重建并通过
`codesign --verify --deep --strict`；`pnpm test`（25 项）、`pnpm check` 与 `git diff --check` 通过。
该证据只覆盖受限 fixture 的 extension → container 消息，**不代表** Safari 对普通页面的监测、关闭
tab、权限撤销/重启/断连恢复、Safari → Electron IPC、分发安装或 M1 完成。无云/API 成本。

**没有验证的部分，不能算通过：** 过期命令（`expiresAtMs` 超时）没有做真实的延迟触发测试，
只是代码逻辑上有这个分支；MV3 service worker 真正 idle 30 秒后休眠再唤醒重连没有独立测试过
（测试过的是桌面应用整进程重启后重连，机制上相关但不是同一件事）；SPA 内容变化重新上报没测；
多窗口/多 profile 没测；Safari 已有受限 fixture 的 UI、启用和真实消息证据，但尚无普通页面授权、
重启/断连或 Electron 连通，不能据此宣称 Safari 已连接。当前 `pnpm check`、
`pnpm test`（25 个测试，含协议、socket authority 与测试页 scope 用例）、`pnpm build:extension` 全部通过；
working tree 未提交，等 Andrew 确认后再决定是否 commit。本次未产生 API/云成本。

**Problem:** 助手自身不能成为新的干扰；开始任务和恢复工作应轻松。

**Current behavior:** 真实透明桌宠窗口已实现并经 Andrew 实机验收：默认 148×148 只显示
approved 的布偶猫静态图（陪伴/愉悦一态），可拖动，单击展开为 320×460 紧凑操作层（目标输入、
1h/3h/自定义时长、暂停/继续/结束、浏览器状态），再单击收起；收起态下若时段进行中，猫咪
下方可选悬浮显示倒计时（默认开，可在展开面板里关闭，偏好存 `localStorage`）。首次语言选择、
模板、背景音乐、菜单栏尚未实现；语言 toggle 仍常驻在展开面板顶部，不是首启一次性选择。

**2026-09-28 本地实现（待 Andrew 视觉/实机验收）：** 已以获批准的 happy 猫为 identity anchor
新增两张透明动作稿：`focuslit-cat-grooming-v1.png`（抬爪舔毛）和
`focuslit-cat-celebrating-v1.png`（小幅击掌）。渲染层只会在用户把指针移到猫咪上或点击展开/收起
时短暂显示舔毛，结束一段 running/paused session 时显示庆祝；默认始终回到静止 happy 姿态，
绝不循环动画。结束面板还会显示该时段实际累计的 running 时间（暂停不计入），但尚不持久化到
历史。两张新资产和其接入仍属本地未提交材料，不能在没有 Andrew 128 px 实机审阅前声称已获美术
验收或加入发布资产。资产来源：2026-09-28 以 `focuslit-cat-happy-v1.png` 为输入锚点、通过
Codex 内置 ImageGen 生成；没有混入第三方角色或素材。

**Architecture:** UI 消费 session/companion 状态；`main.ts` 用一个 `BrowserWindow`
（`transparent/frame:false/alwaysOnTop/skipTaskbar/hasShadow:false`）承载三种窗口尺寸
（`collapsed`/`collapsed-timer`/`expanded`），由渲染进程按 `expanded` + 是否显示悬浮倒计时
的偏好 + `session.phase` 算出目标模式，经 `window:setMode` IPC 通知主进程 `setBounds`；
拖拽经 `pointerdown`/`pointermove` 把屏幕坐标位移通过 `window:moveBy` IPC 发给主进程移动
窗口，`pointerup` 按位移量+耗时判定是否算作一次点击。菜单栏、设置仍未接入同一状态源。

**Primary data/control flow:** 首次选语言并保存 → 桌面猫咪 → 单击展开紧凑操作层 → 选择模板/目标/时长/音乐 → 开始 → 陪伴/暂停/休息 → 结束。

**Key decisions:** V1 一只默认布偶猫气质猫（2026-09-27 从奶牛猫改，奶牛猫保留作备选）；首启选语言，之后从设置修改；桌宠是默认界面，操作层按需展开；本地可完成时段；常规交互不需要聊天框。
拖拽/点击不用 `-webkit-app-region: drag` 实现——原生方案会在普通点击时吞掉 `pointerup`，
导致点击展开完全不触发，改为纯手动的 pointer-capture 拖拽 + 位移阈值判定点击。

**Alternatives rejected:** 全屏效率仪表盘、宠物商店、连续打卡惩罚、每条提醒都生成 AI 文案。

**Correctness invariants:** 暂停和结束立即生效；睡眠不积累关闭倒计时；界面不抢键盘焦点。

**Failure modes:** 无键鼠但正在阅读、断屏后宠物消失、中文截断、重启后恢复旧惩罚、无障碍不可达。

**Scaling limits:** UI 应静止省电；尺寸、帧率和资源目标见设计/质量文档，必须测量。

**Tests and validation:**

- [ ] 刷题/写作模板、1h/3h/自定义、暂停/结束/休息完整可用。
- [ ] Andrew 先审阅原创布偶猫气质造型、身体比例、表情状态和桌面实际尺寸；第一轮方向稿已反馈"不够可爱"，需要往萌二/一二布布风格再改一版，参考截图的可爱度/存在感得到认可后才替换临时占位。
- [ ] 默认显示可拖动猫咪，点击才展开/收起操作层；交互区域、跨屏、失焦、输入焦点和菜单栏等价操作经实机验收。
- [ ] 首次启动选择语言并持久化；重启保持选择，设置中可更改，主界面不常驻语言 toggle。
- [ ] 猫咪至少六种可读表情/姿态，中英文、浅深色、Reduced Motion 和键盘操作验收；情境交互不造成持续干扰。
- [ ] 背景音乐指定/取消；阅读时温和 idle 提醒，有冷却，不把 idle 判成分心。
- [ ] 明确显示每个浏览器的监测状态；未接 API 时不出现假 AI 判定。
- [ ] 完成 60 分钟真实陪伴测试，记录主动收起次数、打断感与卡点。

**Observability:** 本地汇总时段、提示次数和用户反馈；时长不标为科学测得的”有效专注时间”。

**Known gaps:** 不做网页相关性自动关闭；此阶段完成代表 companion 可用，不代表 blocker 完成。
除陪伴外，新做的完成/舔毛动作稿均待 128 px 视觉和实机交互验收；六态目标中的不确定/提醒/
倒计时/休息仍未出稿。透明窗口的点击/拖拽命中区域是整个
矩形（148×148 折叠态 / 320×460 展开态），不是猫咪像素级轮廓，收起态下矩形边角的透明区域
理论上仍会挡住底下应用的点击，未做多屏/Spaces/全屏拖拽实测。没有菜单栏等价操作、没有模板/
背景音乐/休息提醒。首次启动语言选择仍未实现。打包出的 `.app` 放在 `~/dev` 深处，Spotlight
对短前缀关键词（如”focus”）排名低，完整名”FocusLit”可搜到；已在 `/Applications` 放了一个
指向它的 symlink，但 Launch Services 会把它解析回真实路径，没能改善排名（细节见上方第三轮
反馈和本地打包 memory）。

**2026-09-27 本地进展（未完成里程碑）：** 把 M0 的 CSS 占位猫替换为真实原创布偶猫静态图
（`assets/focuslit-cat-happy-v1.png`，已获 Andrew 认可的单一”陪伴/愉悦”表情），复制进
`apps/desktop/src/renderer/assets/cat/` 并接入 `App.vue`；重建桌面窗口为真实透明桌宠
（详见上方 Architecture），新增时长选择（1 小时/3 小时/自定义 1–180 分钟，替换写死的 60
分钟）、收起态可选悬浮倒计时；修复了两个只有实机交互才暴露的问题——原生拖拽区域吞掉点击
事件（改手动 pointer-capture 拖拽）、拖拽/点击时出现的蓝色高光（浏览器默认文字选中高亮 +
默认焦点框，加 `user-select:none` 和自定义 `:focus-visible` 修复），两者编译/类型检查全绿
时完全没有暴露，都是 Andrew 实机点击后报告才定位。`pnpm check`、`pnpm test`（6 个测试）全过。
`pnpm package:mac` 在系统默认 Node v26.8.1 下会挂死几小时（electron-packager 解压依赖疑似
stream/背压回归，`ditto` 直接解压同一压缩包只需 0.4 秒，排除了磁盘/Spotlight/App Nap/系统
负载/长期未重启等环境因素）；必须用项目钉住的 24.21.0：
`PATH=”/opt/homebrew/opt/node@24/bin:$PATH” pnpm package:mac`，1 秒内打包完成，产出的
`FocusLit.app` 已用 `open` 实机启动验证。机器为 macOS 26.6.2 arm64。尚未提交：working tree
未 commit，`assets/` 和新增资产文件仍未追踪，按 AGENTS.md 的资产来源/许可记录要求，正式入库
前需先决定公开范围。

**Interview challenge questions:** 如何证明 UI 没有抢焦点？猫咪的表情如何反映同一个业务状态？
为什么 `-webkit-app-region: drag` 不能同时满足拖拽和点击展开？手动实现怎么正确区分二者，
不靠视口坐标（会被窗口跟随光标移动这件事本身骗过）？

### 后续想法：本地专注回顾与日报/周报（未排入当前里程碑）

用户可以在每段结束时看到目标和实际累计 running 时间；将来可选择一个模板或自定义字段，把
多段记录汇总为日报/周报。设计边界是：先本地保存最小必要的 session 摘要（目标、实际时长、
开始/结束时间和用户选择的模板），默认不上传、不自动发送；只有用户明确选择发送目的地和时机
后才导出/发送。开始实现前要决定本地存储/迁移、历史删除、时区周界、手动结束是否标为“完成”、
模板格式、发送渠道及其授权/失败重试模型。它不能依赖浏览记录、模型或云账户，也不纳入 M2/M1
完成条件。

**2026-09-29 Andrew 的方向补充（仍是以后的事）：** FocusLit 最有价值的是功能，不是猫或桌宠：
帮助专注，以及将来的总结和日报/周报/月报/年报。参考对象是 Forest 的"一眼看出自己专注了多久"，
但不照搬它的 UI，要做出改进。报告范围从日/周扩展到月/年。

**本地存储原则（在 M3/M4 开始写持久化之前定下来）：** 数据只存在本地，所以绝不能像微信那样涨到
10 GB。从第一版持久化开始就分层保存，不要先全存、以后再迁移：

| 层 | 内容 | 保留 | 量级 |
| --- | --- | --- | --- |
| 原始事件 | tab/URL 观测、干预事件 | 短期（如 ≤7 天，够生成日报即可），session 结束时先汇总 | 可能每天数万条，所以必须过期删除 |
| Session 摘要 | 目标、开始/结束、实际 running 时长、打断次数、分心站点 top N、模板 | 永久（除非用户删除） | 约 200 B/条；每天 10 条，一年约 1 MB |
| 报告 | 日/周/月/年统计 | **不单独存**，从 session 摘要实时计算 | 0 |
| AI 文字总结 | 模型生成的报告正文 | 缓存；可删除或重新生成 | 每份几 KB |

候选存储是单文件 SQLite，便于查询、备份和导出，最终在持久化切片里决策。需要验证的点：
十年数据的体积上限估算（目标几十 MB 以内）；原始事件过期删除有测试；删除历史后报告同步更新；
时区与周界规则。

## M3 — 可信的本地干预

**Problem:** 明确无关的持续浏览需要执行约定，同时尽可能避免误关正在用的页面。

**Current behavior:** 待 M1/M2 验证桥接与时段后开始。

**Architecture:** 规则/缓存 → 分类 → 确定性干预状态机 → 浏览器二次核验 → 结果账本。

**Primary data/control flow:** 前台停留 → 提醒 → 关闭倒计时 → 重新核验 → 关闭/取消。

**Key decisions:** 倒计时只计实际前台停留；同一时段重新进入无关内容保留有限历史；恢复链接
短期保留；编辑页面、未知状态采用保守保护。详见架构的时钟与动作身份协议。

**Alternatives rejected:** 域名一刀切、全局无关 tab 扫荡、把重试当成再次处罚。

**Correctness invariants:** 无有效会话不关闭；导航/策略变化使旧命令失效；重试幂等；音乐保护
不能退化为“所有发声页面都放行”；无法确认编辑状态的高风险页面不自动关闭。

**Failure modes:** 延迟判定、乱序事件、预算/策略变更、睡眠、断连、重启、tab 导航竞态。

**Scaling limits:** 事件驱动和有界队列；短时间导航去抖；不对所有后台 tab 持续读正文。

**Tests and validation:**

- [ ] 实现架构中的 session/intervention 双状态机和版本化消息。
- [ ] 质量文档全部关键对抗用例通过；关闭真实 Safari/Chrome 测试 tab 的实机证据。
- [ ] 背景音乐跨正常曲目切换保持播放，离开指定音乐上下文后重新判定。
- [ ] 保存/清除恢复链接；明确不能恢复未保存输入，不在收到 close ACK 前报告已关闭。
- [ ] 用户纠正可只影响当前页/当前任务；政策更新取消过时干预。

**Observability:** decision source、原因码、命令拒绝/成功、误关反馈、恢复操作；不留正文。

**Known gaps:** 本地规则无法理解所有研究链路；默认提醒未知页面，不擅自升级为关闭。

**Interview challenge questions:** close 发出后连接断了怎么办？怎么证明过期模型答案不会关掉新页面？

## M4 — 按需智能和可控账单

**Problem:** 写作/研究不能靠域名判断，每天重度使用也需要看得懂的成本边界。

**Current behavior:** 没有模型代码、模型效果数据或真实成本；历史估算是设计假设。

**Architecture:** provider-independent classifier + context extractor + session cache + durable budget ledger。

**Primary data/control flow:** 规则未决 → 内容压缩 → 预算预留 → 单 provider → 校验结果 → 先观察模式。

**Key decisions:** 用户选 OpenAI 或 Anthropic；小模型先测，升级受预算约束；正文发送需同意；
缺乏依据返回 unknown。模型给出理由，不获得浏览器操作权。

**Alternatives rejected:** 每几秒截图、大模型全量浏览历史、用模型自报置信度当准确概率。

**Correctness invariants:** 请求有时限和 token 上限；并发/重试预留预算；超时不当作无关；
任务、策略、页面内容变化使缓存失效。

**Failure modes:** 限流、断网、无效 JSON、提示注入、价格变更、取消请求仍计费、标签噪声。

**Scaling limits:** 100/300/500/1,000 次日调用场景；输入长度与重试另算；目标和费用详见 AI 文档。

**Tests and validation:**

- [ ] 两个 provider 实现同一契约；密钥存储、隐私选项、断网和额度不足状态可用。
- [ ] 至少 120 个双语标注样本，含两模板、音乐、跨域资料、主题漂移和 unknown。
- [ ] 冻结评估集与独立保留集；报告误拦、漏拦、unknown、延迟、token 和费用。
- [ ] 先运行观察模式；启用模型参与关闭前满足 AI 文档门槛。
- [ ] 使用一周真实工作流（含一个重度日），仅保留同意后的脱敏汇总，更新成本假设。

**Observability:** 规则/缓存命中、provider/模型/提示版本、tokens、预留/实耗、P50/P95 延迟。

**Known gaps:** 小样本不能证明真实世界误关率；$5–10/月是待证目标，不是套餐承诺。

**Interview challenge questions:** 为什么同一 URL 的缓存会过时？网络超时后该释放多少预算？

## M5 — 可安装、可维护的私测版本

**Problem:** 从开发机运行走到他人可安装，需要完整分发、更新和故障恢复链路。

**Current behavior:** 尚无 release、签名流水线或真实安装验证。

**Architecture:** 受保护提交 → 无密钥质量检查 → 受信任 macOS 签名/公证构建 → draft release → 验收发布。

**Primary data/control flow:** 单一 commit/version → desktop + native + extensions → 安装/权限/升级兼容验证。

**Key decisions:** 首发 Developer ID 签名公证的直接分发；Safari 容器随安装方案交付；Chrome
开发态 unpacked 仅供本地使用，外部用户发布需独立商店/受支持安装路径。

**Alternatives rejected:** 把 unsigned artifact 当 release、绕过 Gatekeeper、自动升级时强退专注时段。

**Correctness invariants:** PR 接触不到签名/模型密钥；release 对应精确提交；产物缺失不能部分发布；
升级后旧扩展不得获得超出兼容协议的关闭权限。

**Failure modes:** 公证失败、证书失效、扩展商店审核延迟、安装目录变化、迁移失败、坏版本撤回。

**Scaling limits:** 先验证 arm64；记录 CI 分钟、安装包大小、运行资源和第三方成本，无常驻后端。

**Tests and validation:**

- [ ] QUALITY_AND_RELEASE 中 PR、夜间、release 工作流已运行且有 artifacts。
- [ ] 签名、公证、staple、Gatekeeper、干净用户安装与重启验证完成。
- [ ] Safari/Chrome 扩展与桌面支持版本矩阵、权限引导及断连恢复完整。
- [ ] 中文/英文、两屏、音乐、两任务各完成 1h 和 3h 工作流测试。
- [ ] 安装覆盖升级、数据备份/恢复、卸载 host 注册与清除数据验证。
- [ ] 发布已知问题、隐私说明、支持矩阵、成本边界、恢复方案；首次发布由用户确认。
- [ ] 项目 license 已由 Andrew 决定并加入仓库（见下方"License 待定"）。

**License 待定（2026-09-29）：** 仓库已公开，但还没有 LICENSE 文件；默认是"保留所有权利"，
他人可以看代码，但无权复用。最有价值的是功能与报告，所以 MIT/Apache-2.0 这类宽松协议等于允许
别人直接做竞品。候选：继续不加 license；FSL-1.1（源码公开、禁止竞品、2 年后转 Apache/MIT，
属于 source-available，不能称 open source）；AGPL-3.0（真开源，但挡不住开源克隆）。美术可以
单独用一份资产 license。注意：AI 生成图片的版权保护可能较弱，品牌更依赖名字/商标。渲染层猫图
已提交进 git，仓库公开后会随历史一起公开。在吸引外部贡献或首次公开发布之前必须做出决定；
不是法律意见，商业化前需要专业确认。

**Observability:** 本地诊断导出默认脱敏；无默认上传浏览历史/遥测；每个包有版本、SHA 和校验和。

**Known gaps:** 首版允许手动下载更新；自动更新另立里程碑，需要签名验证、延迟到时段结束和回滚演练。

**Interview challenge questions:** 如何证明装的是测试过的包？商店中的旧扩展怎样兼容新桌面版本？

## 每个里程碑的完成记录

实现时在对应阶段下补：完成日期、commit、代码路径、检查命令和结果、CI/artifact 链接、
实机 OS/browser/hardware、视觉证据、已知限制、成本影响。未通过项保持未勾选。
更新 NEXT_STEPS 的下一个具体切片和 PROJECT_DEEP_DIVE 的证据；不要只写“done”。

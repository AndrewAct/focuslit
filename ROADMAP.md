# FocusLit roadmap

更新：2026-09-27。**规划基线已建立；M0–M5 均未完成。**

目标：用户说清当前任务后，一只安静的猫帮助识别并中止持续分心，同时保留资料检索、
背景音乐和自主休息。第一版面向个人 macOS 使用，再达到可分发的私测质量。

## 交付顺序

| 阶段 | 可见成果 | 退出门槛 | 状态 |
| --- | --- | --- | --- |
| M0 工程基础 | 可启动的安全桌面窗口，PR 自动检查 | 从干净 checkout 安装、测试、构建通过 | 未开始 |
| M1 平台验证 | 两个浏览器都能识别并受控关闭测试 tab；跨屏猫咪占位 | 实机桥接、安装/重启/断连证据，签名分发路径明确 | 未开始 |
| M2 陪伴体验 | 猫咪 + 双语任务时段 + 音乐指定 + 休息 | 无 AI 也能完成舒服的完整时段 | 未开始 |
| M3 确定性干预 | 规则提醒、倒计时、关闭与恢复链接 | 关键竞态、误关防护、重启恢复测试通过 | 未开始 |
| M4 语义与预算 | OpenAI/Anthropic 可选接入，先观察再启用干预 | 固定评估集、实用成本账本、错误降级通过 | 未开始 |
| M5 私测发布 | 签名公证安装包、扩展发布路径、安装升级证据 | 完整 CI/CD 与真实工作流验收 | 未开始 |

依赖：M0 → M1 → M2 → M3 → M4 → M5。M1 尽早产出签名试包，M5 才是完整发布验收。
没有承诺日历交付日期；完成退出门槛再推进。文档和产品原型可以穿插，不以多线开工替代闭环。

## M0 — 工程基础

**Problem:** 明早开始后，任何行为变化都需要可重复检查，代码与文档不能各说各话。

**Current behavior:** 只有规划文档；没有运行时代码或 CI。

**Architecture:** npm workspaces；Electron/Vue/TS 桌面；独立纯 TS 核心与边界契约。

**Primary data/control flow:** 开发命令 → 相同 CI 命令 → 测试/构建产物。

**Key decisions:** Node 24 LTS 的验证 patch、固定 npm、严格类型、根 lockfile；具体依赖在
scaffold 时核对兼容性并记录。创建实际需要的 workspace，不先生成空服务。

**Alternatives rejected:** 多包管理器、依赖安装时取 latest、用框架数量证明工程完整性。

**Correctness invariants:** 干净安装可重现；CI 不修改 lockfile；未实现脚本不能假成功。

**Failure modes:** 本地 Node/CI 漂移、原生 ABI 不匹配、required check 因路径过滤永不出现。

**Scaling limits:** 初期单仓库单人开发，目标快速 PR 反馈；不需要远程构建服务。

**Tests and validation:**

- [ ] 落实 README 的已支持脚本；格式、ESLint、TS/Vue 类型检查、Vitest 可执行。
- [ ] 建立最小会话状态/协议行为测试，验证边界解码失败，不写无意义占位测试。
- [ ] PR 和 `dev`/`main` push 有 `quality` workflow；稳定的总 gate 不漏跑。
- [ ] macOS 启动窗口和未签名打包 smoke；提交锁定版本/环境说明。
- [ ] GitHub Actions 权限、分支保护、依赖更新和安全扫描按质量文档核实配置。

**Observability:** CI 检查结果、版本清单和失败 artifact；不上传个人页面信息。

**Known gaps:** 此阶段不证明 Safari、AI、猫咪设计或签名发布可用。

**Interview challenge questions:** 为什么选 Electron？本地绿、CI 红如何定位？哪些依赖需要 macOS？

## M1 — Safari、Chrome 与 macOS 可行性

**Problem:** 用户依赖两个浏览器；开发态可读 URL 不代表打包后可用，更不代表能安全关 tab。

**Current behavior:** 未实现。仅有官方 API 能力依据，尚无本产品实测。

**Architecture:** 共享 TS 扩展逻辑 + 分平台 manifest；Chrome native messaging host；Safari
Xcode 容器/原生扩展 + 桌面桥接；实际进程拓扑在本阶段决策记录中锁定。

**Primary data/control flow:** 扩展事件 → 校验后的本地连接 → 诊断视图 → 指定测试 tab 的短期命令 → 回执。

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
- [ ] 导航、SPA 内容变化、重开浏览器、worker 休眠后可重新握手。
- [ ] 测试 tab 可关闭；过期命令、换页命令、重复命令不误关其他页面。
- [ ] 透明窗口可拖过两屏；缩放、拔屏、Spaces/全屏、焦点行为有实机记录。
- [ ] 创建早期安装产物；有证书时做签名公证试包并从安装目录重测。
- [ ] 无证书时明确签名子项未完成，记录发布依赖；可以继续 M2/M3，但不能宣称平台/分发全通过。
- [ ] 决策记录确定 bundle IDs、桥接安装方案、支持的 OS/browser/Xcode 版本，以及残余关闭竞态。

**Observability:** 脱敏的连接/权限/事件丢失状态、协议版本、命令 ACK/拒绝原因。

**Known gaps:** 浏览器 API 缺少原子“比较页面版本再关闭”的能力时，仍有微小竞态；必须明确
可接受范围和更保守的阻断选择，不能声称绝对零误关。

**Interview challenge questions:** 同一个 tab ID 为什么不够？两个浏览器都显示 active tab 时哪个在前台？

## M2 — 一只愿意留在桌面上的猫

**Problem:** 助手自身不能成为新的干扰；开始任务和恢复工作应轻松。

**Current behavior:** 尚无界面；角色方向已决定为圆脸猫，具体配色/造型为设计起点。

**Architecture:** UI 消费 session/companion 状态；菜单栏、猫咪、时段面板和设置共用同一状态源。

**Primary data/control flow:** 选择模板/目标/时长/音乐 → 开始 → 陪伴/暂停/休息 → 结束。

**Key decisions:** 单角色；中英文手动设置；本地可完成时段；常规交互不需要聊天框。

**Alternatives rejected:** 全屏效率仪表盘、宠物商店、连续打卡惩罚、每条提醒都生成 AI 文案。

**Correctness invariants:** 暂停和结束立即生效；睡眠不积累关闭倒计时；界面不抢键盘焦点。

**Failure modes:** 无键鼠但正在阅读、断屏后宠物消失、中文截断、重启后恢复旧惩罚、无障碍不可达。

**Scaling limits:** UI 应静止省电；尺寸、帧率和资源目标见设计/质量文档，必须测量。

**Tests and validation:**

- [ ] 刷题/写作模板、1h/3h/自定义、暂停/结束/休息完整可用。
- [ ] 猫咪六种可读状态，中英文、浅深色、Reduced Motion 和键盘操作验收。
- [ ] 背景音乐指定/取消；阅读时温和 idle 提醒，有冷却，不把 idle 判成分心。
- [ ] 明确显示每个浏览器的监测状态；未接 API 时不出现假 AI 判定。
- [ ] 完成 60 分钟真实陪伴测试，记录主动收起次数、打断感与卡点。

**Observability:** 本地汇总时段、提示次数和用户反馈；时长不标为科学测得的“有效专注时间”。

**Known gaps:** 不做网页相关性自动关闭；此阶段完成代表 companion 可用，不代表 blocker 完成。

**Interview challenge questions:** 如何证明 UI 没有抢焦点？猫咪的表情如何反映同一个业务状态？

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

**Observability:** 本地诊断导出默认脱敏；无默认上传浏览历史/遥测；每个包有版本、SHA 和校验和。

**Known gaps:** 首版允许手动下载更新；自动更新另立里程碑，需要签名验证、延迟到时段结束和回滚演练。

**Interview challenge questions:** 如何证明装的是测试过的包？商店中的旧扩展怎样兼容新桌面版本？

## 每个里程碑的完成记录

实现时在对应阶段下补：完成日期、commit、代码路径、检查命令和结果、CI/artifact 链接、
实机 OS/browser/hardware、视觉证据、已知限制、成本影响。未通过项保持未勾选。
更新 NEXT_STEPS 的下一个具体切片和 PROJECT_DEEP_DIVE 的证据；不要只写“done”。

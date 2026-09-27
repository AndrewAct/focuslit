# Quality, CI/CD and release

状态：完整交付设计；**工作流、脚本和测试尚未创建**。M0 开始逐项实现，M5 通过才可称发布链路完整。
参考 TickSense 的锁定依赖、分组件检查、明确证据与失败模型；这里面向 macOS 桌面与扩展分发。

## 测试分层

| 层 | 工具方向 | 验证对象 | 运行时机 |
| --- | --- | --- | --- |
| 领域单元/属性测试 | Vitest、假时钟；必要时 fast-check | session/policy/intervention/budget 不变量 | 每次 PR |
| 边界契约 | runtime schemas + 固定 fixtures | IPC/native/provider 消息、版本和错误 | 每次 PR |
| 存储集成 | 真实临时本地数据库 | 事务预留、重启、迁移、损坏与幂等 | 相关 PR |
| UI 组件 | Vue Test Utils；无障碍扫描 | 关键操作、locale、状态呈现 | 相关 PR |
| Electron 流程 | Playwright Electron + 实机 smoke | 开始/暂停/结束、设置、无 API、重启 | 桌面相关 PR |
| Chrome 扩展 | 真实 Chromium 持久 profile + 合成网站 | 事件/SPA/提取/worker 重启/关测试 tab | 扩展相关 PR |
| macOS/Safari 原生 | Swift tests、xcodebuild + 真实 Safari 验收 | 编译、桥接、签名、权限、真实 tab | 相关 PR + 发布前实机 |
| 模型 | 离线回放 + 受控 live eval | 相关性、unknown、费用、漂移 | PR 回放；模型变化 live |
| 视觉/桌面礼仪 | 受控截图 + 人工录屏 | 猫咪、双语、对比度、输入焦点/跨屏 | UI PR 与发布 |

Playwright 的 Electron 支持是 experimental，版本组合要固定和验证。不要为自动化关闭
生产安全设置；若测试需要 inspector，单独测试构建标明差异，正式 hardening 包仍做实机 smoke。
普通 WebKit 测试不覆盖 Safari 扩展安装、权限或 native messaging。

覆盖率初始门槛：core 的 statements/branches ≥90%，其余有业务逻辑 TS ≥80%；生成代码/资产
有明确排除清单。所有关键失败用例必须通过，覆盖率不能替代它们。不为简单样式、文案或
静态文档编造单元测试。对关键身份/预算守卫做定向 mutation/移除守卫验证，确认测试真的能抓错。

## 必须能击穿错误实现的用例

| 用例 | 必须成立的结果 |
| --- | --- |
| 提醒后导航到相关资料；旧模型结果/close 到达 | 版本不匹配，拒绝旧动作 |
| pause/end 与倒计时/close 竞争 | 撤销未来授权；记录不可原子化的传播窗口 |
| tab ID 在新浏览器实例中重用 | epoch/profile/nav 校验拒绝旧动作 |
| 重复/乱序事件、重复 command、ACK 丢失 | 状态收敛；不盲目再次关闭 |
| worker 睡眠、权限撤销、主进程崩溃 | 监测状态降级；旧 lease/命令不能继续执行 |
| Mac 锁屏/睡眠/时钟跳变 | 不累计惩罚；重启/唤醒为 paused 或重新核验 |
| 猫在外接屏，显示器断开 | 恢复到可见可操作区域，不抢焦点 |
| 音乐列表正常下一首 vs 跳到娱乐视频 | 音乐上下文保护；越界后重新分类 |
| 阅读 10 分钟不动键鼠 | 温和询问，有冷却；不判无关、不关闭 |
| 页面有未保存输入/无法确认编辑状态 | 按保守保护策略提醒，不强关高风险编辑页 |
| 同 URL ChatGPT 从算法转娱乐 | 内容版本使缓存失效，且不上传全部历史 |
| 预算边缘同时发请求/进程崩溃 | 总预留不越应用上限；未决预留持久化 |
| API 429/超时/格式错误/提示注入 | unknown 或受限重试；不扩大权限/不闭未知页 |
| 设置/账本迁移失败 | 保留可恢复备份，暂停有风险功能，不重置账单 |
| 未授权网页伪造 native/IPC 消息 | 身份/schema 校验拒绝，不读取密钥或执行动作 |

## CI：从第一个实现 PR 开始

目标 workflow 与检查名在 M0 实现后保持稳定：

| Workflow | 触发 | 工作 |
| --- | --- | --- |
| `quality.yml` | 所有 PR；push 到 dev/main | 锁定安装、format/lint/types、docs 链接、单元/契约/覆盖率、TS build |
| `macos.yml` | 同上，job 内根据改动范围选择 | 原生 build/tests、Electron smoke、unsigned package；涉及 contracts/core 时同时跑 |
| `security.yml` | PR + 每周 | 依赖审查、秘密扫描、适用的静态分析、workflow lint |
| `nightly.yml` | 有新代码的夜间/手动 | 长时间会话、事件风暴、断连重启、性能基线；无付费模型默认调用 |
| `eval.yml` | 受信任手动触发，模型变更时运行 | 预算受限 live eval；普通 PR 无 key，只跑离线 |
| `release.yml` | 来自 main 的受保护版本 tag | 重跑质量门槛、签名、公证、产物验证、创建 draft release |

M0 先真实运行 quality/macOS；随着模块加入扩展各 job，其余最晚在对应 M4/M5 完成。
不提交只是 echo success 的未来工作流。质量 gate 必须实际依赖测试结果。

GitHub 配置要求：

- PR 基于受信任 workflow；默认 `contents: read`，只有发布 job 有必要写权限。
- action pin 到完整 commit SHA 并注释版本；依赖机器人按组周更，包括 Actions/npm。
- 固定 runner OS 标签和 Xcode selection，记录镜像版本；不认为 hosted image 完全不可变。
- 使用锁文件缓存依赖；不缓存签名 keychain、用户 profile、真实页面或含凭证日志。
- PR 并发取消旧运行；release 不互相取消；每个 job 有 timeout 和 artifact 保留期。
- stable `required-checks` aggregator 在所有 PR 出现，检查必需 job 的结果；只允许有原因的
  不相关 job skip，不能用 workflow 级 paths 让 required check 永久 pending。
- 不用 `pull_request_target` 执行 PR 不可信代码；fork PR 不获取签名/模型/发布 secrets。
- 设置 dev/main PR 保护、必需检查、禁止 force push；是否要求额外人类 review 按实际协作者配置。
- GitHub plan 不支持的扫描/保护功能需标为缺口并选可运行替代，不能只在文档里说已开启。
- 可利用 fork 的恶意代码不得在个人日用 Mac 的 self-hosted runner 上运行。Safari GUI 自动化
  若需专机，使用隔离测试用户/受信任触发；无可靠 GUI runner 时保留明确的人工发布 gate。

## CD：桌面应用的交付链路

选定方向：Developer ID 直接分发。Safari 扩展随其 macOS 容器签名公证；具体单 app/配套容器
安装布局由 M1 实验决定。M1 提前验证签名，M5 完成自动化；没有 Apple 证书时 unsigned CI
可以继续，但发布 gate 保持未通过。Chrome Web Store 是独立发布渠道，具有独立审核/版本节奏。

1. 在 main 上固定版本和 commit，核对 desktop/native/extension 协议兼容矩阵与 release notes。
2. 受保护 tag 触发可信构建，重跑全部 required checks；不能只依赖分支曾经绿过。
3. macOS release job 在临时 keychain 导入 Developer ID 证书，构建签名 desktop/native/Safari
   组件与所需 entitlements/hardened runtime；无凭证不能回退成 unsigned 后继续发布。
4. 使用 Apple 公证流程，验证结果并 staple；验证嵌套签名、安装包签名/公证与 Gatekeeper。
   签名后不修改包内容。进程退出无论成功失败都销毁临时凭证与 keychain。
5. 产出 DMG/ZIP（由 M1 决定最终格式）、Chrome 扩展包、checksums、版本/协议 manifest、
   SBOM；仓库权限支持时生成可验证 build provenance。保留构建日志和扫描报告的脱敏版本。
6. 同一个已验证构建的精确字节进入 **draft release**；缺任何必要产物则整个 release 停止。
7. 在干净 macOS 用户/测试机，从下载带 quarantine 的真实产物安装并验证权限、音乐、
   两浏览器桥接、重启和覆盖升级。不能只 `open` 构建目录里的 app。
8. Chrome 包经受支持的分发途径上线；本地 unpacked 只算开发验证。旧商店版本按兼容矩阵
   共存；不兼容时提示升级并停止危险动作，不能假定两个渠道同时更新。
9. 首次公开/私测发布由 Andrew 确认后发布 draft；版本、校验和、安装指南、已知问题一并发布。

公证/签名机制参考 [Electron Forge](https://www.electronforge.io/guides/code-signing/code-signing-macos)
和 [Apple Safari distribution](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)。
Safari 是否能够按设计容器与 Electron 一起安装仍是 M1 实测任务，不由这些文档自动保证。

## 升级、故障恢复与卸载

- V1 手动下载更新即可；不为了“完整 CD”仓促加入自动 updater。升级前提示结束/暂停时段。
- 存储迁移前备份，区分可回滚版本与不可直接降级版本；旧二进制不能读写未知新 schema。
- 发布坏包：停止推荐该版本，保留诊断与受影响版本说明；兼容时恢复上一已签名包，否则
  roll forward 修复。不可通过降低安全校验恢复服务。
- 恢复演练包括前一版本数据升级、失败后备份恢复、扩展落后一版、native host 路径变化。
- 删除 app 与清除数据是独立操作；卸载工具解释并移除 host 注册，用户选择清除 Keychain、
  本地缓存/链接/账本。安全删除不得声称超出系统能力。
- 自动更新后续另设里程碑：签名/来源校验、staged rollout、坏更新撤回、时段结束后安装。

## 性能、费用与发布证据

首个实测目标（尚未达到）：参考 Mac 上桌面及 native 进程合计 RSS ≤300 MiB；安静状态 5 分钟
平均 CPU ≤单核的 1%；本地规则判定 P95 <100 ms（不含配置的停留时间）；冷启动可交互 <3 s。
浏览器扩展额外负载需单独对比基线；记录硬件/OS/版本/样本，测 1h/3h 与 50 tabs。
达不到时先分析持续渲染、重复采集、事件队列和 Electron 基础开销，再决定是否修改目标/架构。
目标不是宣传数字；不得隐去测量条件。

每次 release 记录：commit、toolchain、OS/browser 支持矩阵、自动检查报告、人工验收日期与环境、
CN/EN 视觉证据、无障碍、音乐/编辑保护、断网/额度/恢复测试、性能、API/CI 成本与已知问题。
支持矩阵不能凭能编译就勾选；最低 OS 与当前 OS 都要验证，做不到的范围明确不支持。

官方参考（2026-09-27）：

- [Playwright Electron limitations](https://playwright.dev/docs/api/class-electron)
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
- [Build attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)

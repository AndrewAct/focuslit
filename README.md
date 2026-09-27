# FocusLit

A friendly desktop companion for macOS that understands your tasks, catches distractions,
and helps you stay focused.

FocusLit 是一只陪你工作的圆脸小猫。你设定当前任务和时长，它安静陪伴；发现持续浏览
无关页面时，先提醒，再按事先设定的规则关闭对应标签页。支持 Safari、Chrome、背景音乐、
外接显示器，以及手动选择中文或英文。

## 当前状态

**2026-09-27：规划完成，尚未实现应用。** 当前仓库包含产品、架构、路线图、测试和发布设计。
没有可运行的桌面应用、浏览器扩展、测试套件或 GitHub Actions 工作流；以下能力都是待交付目标。

明早从 [NEXT_STEPS](docs/NEXT_STEPS.md) 开始，先完成 M0，再验证 M1 的平台风险。
不要把文档、示意图或未签名的开发构建当作已上线功能。

## 阅读顺序

| 文档 | 负责回答 |
| --- | --- |
| [ROADMAP](ROADMAP.md) | 做什么、先后顺序、每个里程碑如何验收 |
| [NEXT_STEPS](docs/NEXT_STEPS.md) | 下次开工的具体步骤和环境检查 |
| [PRODUCT_DESIGN](docs/PRODUCT_DESIGN.md) | 用户场景、猫咪、界面、文案、动效与 taste 标准 |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | 模块边界、浏览器桥接、状态、正确性与技术取舍 |
| [AI_AND_COST](docs/AI_AND_COST.md) | 模型判断、成本、预算、隐私与评估 |
| [QUALITY_AND_RELEASE](docs/QUALITY_AND_RELEASE.md) | 测试矩阵、CI/CD、签名、公证、回滚和发布证据 |
| [PROJECT_DEEP_DIVE](docs/PROJECT_DEEP_DIVE.md) | 可辩护的工程主张、风险与面试追问 |
| [AGENTS](AGENTS.md) | 实施时必须遵守的仓库规则 |

## V1 边界

- macOS Apple Silicon 优先；最低系统版本在 M1 实测后写入支持矩阵。Intel 尚未承诺支持。
- Safari 和 Chrome 都是 V1 必需项，不能用只支持 Chrome 的演示替代。
- 刷题、研究写作两个模板；1 小时、3 小时、自定义时长；暂停、休息、结束。
- 一个可跨屏拖拽的猫咪角色，菜单栏入口，小型设置面板，中英文独立选择。
- 本地规则与缓存优先；用户可选接入 OpenAI 或 Anthropic，使用自己的 API key。
- API 不可用时保留本地能力并明确降级；未知页面不会因为模型失败而被关闭。
- 无账户、无云同步、无付费订阅系统、无常驻服务器。暂不做本地模型、语音、持续截图、
  多宠物商店、移动端、Windows、系统级防绕过或心理/医疗效果承诺。

## 技术方向

Electron + TypeScript + Vue 3 + Vite；npm workspaces；少量 Swift 用于 macOS/Safari 桥接。
Electron Forge 负责桌面打包；Safari 的 Xcode 容器、签名和桥接集成必须先通过 M1 验证。
选择 Vue 是为了轻量的组件心智模型和现有经验；此桌面应用不需要 SSR 或 Next.js。

纯 TypeScript 核心拥有任务、规则、干预和预算状态；界面、扩展、模型 SDK 都是外围适配器。
详见 [架构与替代方案](docs/ARCHITECTURE.md)。

## 工具链与运行命令

**尚未 scaffold，以下是 M0 必须兑现的命令契约，现在不能运行。**

| 命令 | M0/M1 后的用途 |
| --- | --- |
| `npm ci` | 按提交的根 lockfile 安装全部 workspace 依赖 |
| `npm run dev` | 启动本地桌面应用 |
| `npm run check` | 格式、lint、类型、文档链接检查 |
| `npm test` | 无网络的单元与契约测试 |
| `npm run test:coverage` | 核心逻辑覆盖率门槛 |
| `npm run test:e2e` | 桌面关键流程和真实 Chromium 扩展测试 |
| `npm run build` | 构建 TypeScript 应用与扩展 |
| `npm run build:native` | 构建原生桥接和 Safari Xcode 工程 |
| `npm run package:mac` | 生成未签名、明确标记开发用途的 macOS 安装产物 |
| `npm run eval:offline` | M4 起运行固定的相关性与干预回放集 |

M0 采用 **Node 24 LTS**，选择当时已验证的具体 patch，统一 `.node-version`、`engines`、CI；
固定 npm 版本及 `packageManager`，提交唯一 `package-lock.json`。Electron 内置 Node 与构建用
Node 是不同运行时，两者都要记录。依据：[Node 发布状态](https://nodejs.org/en/about/previous-releases)。

依赖更新通过 PR 更新 manifest 和 lockfile；CI 使用 `npm ci`，不能现场升级依赖。
每月检查依赖与 Electron 安全更新；每季度复核运行时支持，在升级时同步本地、CI、打包、
原生模块 ABI 与最低系统测试。M0 补齐具体版本、升级命令及支持期限复核日期。
V1 不需要 Python；若以后引入，先询问 Andrew 目标 Python minor，再按工作区 uv 规范配置。

## 工作流

当前本地分支为 `dev`。建议短分支 PR 到 `dev`，通过验收后晋升 `main`；正式版本从 `main`
的验证提交创建 tag。实际远程分支、保护规则、Actions 配额和发布环境须在 M0 核实配置，
目前未修改 GitHub 设置。完整发布流程见 [QUALITY_AND_RELEASE](docs/QUALITY_AND_RELEASE.md)。

工程方式参考 TickSense 的证据化里程碑、锁定工具链和分组件 CI；FocusLit 的运行时与发布
流程按桌面产品设计，不复制金融数据系统的基础设施。

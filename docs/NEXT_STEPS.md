# 下一次开工

更新：2026-09-27。入口：[README](../README.md)。这是执行顺序，里程碑验收由
[ROADMAP](../ROADMAP.md) 管理。当前没有待恢复的应用进程或已实现的测试。

## 已检查的环境

| 项目 | 当前观测 | 开工处理 |
| --- | --- | --- |
| 仓库 | `/Users/andrewchen/dev/focuslit`；本地 `dev`；初始 commit `60fd621` | 先检查工作区，保留本次规划文件 |
| 远程 | `git@github.com:AndrewAct/focuslit.git` | 核实远程分支/权限，不假定保护规则已存在 |
| Mac | arm64，macOS 26.6.2 | 首个实机测试基线；不据此宣称兼容更旧版本 |
| Node/npm | v26.8.1 / 11.19.0 | 项目采用 Node 24 LTS，固定验证后的 patch/npm |
| 开发工具选择 | `/Library/Developer/CommandLineTools` | 原生命令用项目级 `DEVELOPER_DIR`，无需先全局切换 |
| 完整 Xcode | `/Applications/Xcode.app`，26.1.1 (17B100) | 验证 SDK/系统兼容；发现不支持时单独处理 |
| Swift CLI | 6.2.1（Command Line Tools） | 原生构建以所选完整 Xcode 的工具链为准 |
| Apple 证书/开发者账户 | 未检查 | M1 首次签名试包时核实，不能从 Xcode 已安装推断 |
| Safari/Chrome 版本与授权 | 未检查 | M1 记录真实版本、profile、扩展安装与授权 |

只读检查示例：

```sh
git status --short --branch
node --version
npm --version
xcode-select -p
env DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -version
```

## 明早第一段：M0 最小可运行切片

1. 阅读产品设计，锁定本次行为：**一只静止猫咪占位 + 开始/暂停/结束 60 分钟时段**。
   不先接 API、不先做角色商城或统计仪表盘。
2. 检查现有 Node 24 环境，选择可重复的项目工具链；记录实际版本和安装方式。
3. 创建 npm workspaces：`apps/desktop`、`packages/core`、`packages/contracts`。
   Vue 3 + Vite + Electron Forge 的具体版本先做构建兼容验证。
4. 从 session reducer、假时钟测试和 IPC schema 开始；建立安全 preload 和 UI。
5. 兑现 `dev/check/test/test:coverage/build/package:mac`，其他尚不可用脚本继续明确标注。
6. 添加运行上述真实命令的 `quality.yml` 与 macOS 打包 smoke。配置固定 gate，检查失败
   不能被 `continue-on-error`、空测试或错误的路径过滤掩盖。
7. 本地检查和 CI 首跑通过后记录证据；没有 push/远程首跑就写“本地已通过，CI 未运行”。

第一段结束应拿到：可启动桌面窗口、可测试状态、可审查 CI、能按 lockfile 重建的 workspace。
猫咪占位须标为临时素材；M2 完成正式设计后替换。

## 下一段：立即进入 M1 平台风险验证

1. 构建 Safari 最小 web extension + Xcode 容器，Chrome MV3 扩展与 native host。
2. 共享协议读取自建无害页面；用显式按钮关闭指定测试 tab，加入导航失效测试。
3. 确认浏览器最前窗口与全系统前台应用的差别；如果需要原生观察，限制在最小元数据。
4. 重启、撤权、worker 休眠、两个 profile，检查连接状态和命令失效。
5. 猫咪窗口跨屏拖动、拔屏归位、全屏和输入焦点实测。
6. 将 app 移到安装位置验证桥接路径；尽早试签名，确定 Safari 容器如何随桌面包安装。
7. 把进程拓扑、bundle IDs、签名/权限、支持矩阵和残余风险写入实际 ADR。

## 实施起点与待验证项

- 已决定：FocusLit、猫咪、macOS、双浏览器、中英文、本地优先、可选 API。
- 实施默认：Electron/TS/Vue、npm、少量 Swift、arm64 首发、无账户服务。
- 需要实测：最低 macOS、Safari 分发集成、关闭竞态、耗电、模型效果与真实月费。
- 可后置：猫咪名字、最终毛色、收费方案、Intel、本地模型、自动更新。

这些默认值足以开始，不需先重新确认所有产品选择。若平台实验否定技术方案，记录证据和
替代方案后调整，保留用户已确定的双浏览器和陪伴体验目标。

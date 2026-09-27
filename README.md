# FocusLit

FocusLit 是一款 macOS 专注陪伴应用。你可以设定当前任务和时长；一只安静的圆脸小猫陪你完成这一段工作。

FocusLit is a quiet macOS focus companion. Set a task and duration, then work alongside a small round-faced cat.

## 当前状态 / Current status

M0 工程基础正在实现。当前桌面构建提供 60 分钟时段的开始、暂停、继续和结束，以及中文和英文界面。猫咪仍是临时占位形象。浏览器监测、自动干预、音乐保护和可选模型尚未实现，界面会明确显示浏览器未连接。开发构建未签名，不是可分发版本。

## 本地开发 / Local development

需要 macOS、Node 24.21.0 和 pnpm 10.12.1。项目使用一个根目录 `pnpm-lock.yaml`；请勿提交其他 lockfile。

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm test:coverage
pnpm build
pnpm package:mac
```

`pnpm build` 和 `pnpm package:mac` 当前都生成未签名的 macOS `.app`，位于 `apps/desktop/out/`。在公开发布或向其他用户分发之前，还需要完成浏览器集成、签名和实机验收。

## 范围 / Scope

第一版目标是本地优先的 macOS 应用，支持 Safari 和 Chrome，并允许用户选择是否启用云端相关性分析。云分析和浏览器读取都需要各自的明确授权。项目不会在未连接浏览器时声称正在监测，也不会将模型输出直接当作关闭标签页的权限。

规划和工程工作文档仅在维护者本地保存，不随公开仓库发布。

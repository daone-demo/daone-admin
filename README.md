<h1>vue-pure-admin精简版（非国际化版本）</h1>

[![license](https://img.shields.io/github/license/pure-admin/vue-pure-admin.svg)](LICENSE)

**中文** | [English](./README.en-US.md)

## 介绍

精简版是基于 [vue-pure-admin](https://github.com/pure-admin/vue-pure-admin) 提炼出的架子，包含主体功能，更适合实际项目开发，打包后的大小在全局引入 [element-plus](https://element-plus.org) 的情况下仍然低于 `2.3MB`，并且会永久同步完整版的代码。开启 `brotli` 压缩和 `cdn` 替换本地库模式后，打包大小低于 `350kb`

## Daone 环境与部署说明

### API 基址（VITE_DAONE_API_BASE_URL）

`src/api/admin.ts` 的请求基址取 `VITE_DAONE_API_BASE_URL`（回退 `VITE_API_BASE_HOST`）：

- **本地开发 / 测试模式**：`.env` 与 `.env.test` 设为相对路径 `/api`，浏览器请求同源 `/api`，由 Vite 代理按 `VITE_API_BASE_HOST` 转发到上游（详见 `vite.config.ts` 的 `createDevApiProxy`）。
- **生产 / 预发布构建**：`.env.production` 与 `.env.staging` 显式覆盖为**绝对地址**（浏览器直连后端，不依赖站点反向代理）。注意 Vite 在所有模式下都会加载 `.env`，因此这两个文件必须显式声明 `VITE_DAONE_API_BASE_URL`，否则产物会悄悄回退到相对路径 `/api`。

若确需让生产包走相对路径 `/api`：部署站点**必须**提供 `/api` 反向代理，将 `/api/*` 转发到后端网关（等价于 `VITE_API_BASE_HOST` 指向的地址，路径替换规则同 `createDevApiProxy`），并同步调整 `scripts/check-api-base.mjs` 的断言。

### TypeScript strict 岛

主配置仍为 `strict: false`（兼容上游模板遗留代码）。Daone 核心链路通过 `tsconfig.daone-strict.json` 单独开启 `strict: true`，由 `pnpm typecheck:strict` / `pnpm typecheck` 强制执行。当前覆盖：

- `src/api/**`（含 `admin.ts` 响应与鉴权接口）
- `src/utils/auth.ts`、`submitLock.ts`
- `src/views/login/utils/rule.ts`
- `src/views/daone/**/*.ts`（含 `useResourceList` / `useResourceCrud` 及资源页纯逻辑）

后续可继续把更多目录并入该配置，最终合并回主 `tsconfig.json`。

### 构建命令

- `pnpm build:prod` 使用 `--mode production`（对应 `.env.production`），构建后自动运行 `node scripts/check-api-base.mjs`，断言产物包含 `.env.production` 中的生产 API 基址，防止 mode 与 env 文件不匹配导致误连环境。
- `pnpm test` 运行资源列表乱序返回等回归测试。
- `pnpm lint:check` 只读检查（ESLint + `prettier --check` + Stylelint 非 fix 模式），适合 CI；`pnpm lint` 仍为本地写文件的自动修复模式。

## 版本选择

当前是非国际化版本，如果您需要国际化版本 [请点击](https://github.com/pure-admin/pure-admin-thin/tree/i18n)

## 配套视频

[点我查看 UI 设计](https://www.bilibili.com/video/BV17g411T7rq)  
[点我查看快速开发教程](https://www.bilibili.com/video/BV1kg411v7QT)

## 配套保姆级文档

[点我查看 vue-pure-admin 文档](https://pure-admin.cn/)  
[点我查看 @pureadmin/utils 文档](https://pure-admin-utils.netlify.app)

## 高级服务

[点我查看详情](https://pure-admin.cn/pages/service/)

## 预览

[查看预览](https://pure-admin-thin.netlify.app/#/login)

## 维护者

[xiaoxian521](https://github.com/xiaoxian521)

## ⚠️ 注意

精简版不接受任何 `issues` 和 `pr`，如果有问题请到完整版 [issues](https://github.com/pure-admin/vue-pure-admin/issues/new/choose) 去提，谢谢！

## 许可证

[MIT © 2020-present, pure-admin](./LICENSE)

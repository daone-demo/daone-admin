# Daone 运营后台

基于 [vue-pure-admin](https://github.com/pure-admin/vue-pure-admin) 精简版定制的 **Daone 运营管理后台**（Vue 3 + Element Plus + Vite）。

## 本地开发

```bash
pnpm install
pnpm dev          # 开发模式（.env.development）
pnpm dev:test     # 测试上游
```

要求：Node.js `^20.19 || >=22.13`，pnpm `>=9`（推荐 pnpm 11，配置见 `pnpm-workspace.yaml`）。

## Daone 环境与部署说明

### API 基址（`VITE_DAONE_API_BASE_URL`）

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

### 构建与检查

```bash
pnpm build:prod    # --mode production + API 基址断言
pnpm test          # 资源列表竞态 / 请求合并等回归
pnpm lint:check    # ESLint + Prettier --check + Stylelint（CI 用）
pnpm lint          # Prettier/Stylelint 写文件修复
```

### 发布 Tag

本仓库与用户端 `daone-web` 在合并并推送稳定修复后，于**各自仓库**为当前 HEAD 打附注 tag（当前工作区若有未提交变更，请先提交再打）：

```bash
# daone-admin
git tag -a "release-2026.08.16" -m "Daone admin release 2026-08-16"
git push origin "release-2026.08.16"

# daone-web
git tag -a "release-2026.08.16" -m "Daone web release 2026-08-16"
git push origin "release-2026.08.16"
```

可用 `git describe --tags --exact-match` 确认 HEAD 是否已有对应 tag。

## 上游模板说明

UI 骨架来自 pure-admin-thin。上游文档：[pure-admin.cn](https://pure-admin.cn/) · [@pureadmin/utils](https://pure-admin-utils.netlify.app)。业务需求与缺陷请在 Daone 项目内跟踪，勿直接向上游精简版提 issue。

## 许可证

基于上游 [MIT](./LICENSE) 许可；业务代码按团队约定管理。

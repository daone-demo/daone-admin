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

- **本地开发 / 测试 / 生产**：`.env`、`.env.test`、`.env.production` 均为相对路径 `/api`。浏览器只请求当前站点同源 `/api`。
  - 本地：Vite 按 `VITE_API_BASE_HOST` 转发（`vite.config.ts` 的 `createDevApiProxy`）。
  - 生产：部署侧必须提供 `/api` 反代，路径替换规则同 `createDevApiProxy`（`/api/foo` → `VITE_API_BASE_HOST/foo`）。Docker 用 `nginx.docker.conf`（80 端口、`/usr/share/nginx/html`）；宿主机 9081+TLS 用 `nginx.conf`。
- **预发布构建**：`.env.staging` 仍为绝对地址（浏览器直连后端）。Vite 在所有模式下都会加载 `.env`，因此各 mode 的 env 文件必须显式声明 `VITE_DAONE_API_BASE_URL`。

`pnpm build:prod` 会校验产物中的生产基址为 `/api` 或绝对 `http(s)` URL。

### TypeScript strict 岛

主配置仍为 `strict: false`（兼容上游模板遗留代码）。Daone 核心链路通过 `tsconfig.daone-strict.json` 单独开启 `strict: true`，由 `pnpm typecheck:strict` / `pnpm typecheck` 强制执行。当前覆盖：

- `src/api/**`（含 `admin.ts` 响应与鉴权接口）
- `src/utils/auth.ts`、`submitLock.ts`、`print.ts`、`date.ts`
- `src/utils/http/**`（通用请求层）
- `src/views/login/utils/rule.ts`
- `src/views/daone/**/*.ts`（含 `useResourceList` / `useResourceCrud` 及资源页纯逻辑）

### 构建与检查

```bash
pnpm build:prod    # --mode production + 同源 /api 断言 + gzip 体积预算
# Docker：pnpm build:prod 产物 + nginx.docker.conf（listen 80）
pnpm test          # 资源列表竞态 / 请求合并等回归
pnpm lint:check    # ESLint + Prettier --check + Stylelint（CI 用）
pnpm lint          # Prettier/Stylelint 写文件修复
pnpm check:bundle-budget  # 对 dist 做 gzip 体积预算（build:prod 已串入）
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

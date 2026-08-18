/**
 * 校验后台生产构建产物中的 API 基址与 .env.production 一致，
 * 防止 mode 与 env 文件不匹配（如 --mode prod 加载不到 .env.production）。
 *
 * 生产契约：同源相对路径 `/api`（由 Nginx 反代）；也允许绝对 http(s) 基址。
 *
 * 用法：node scripts/check-api-base.mjs [distDir]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.resolve(root, process.argv[2] || "dist");
const env = loadEnv("production", root, "");
const expectedBase = String(env.VITE_DAONE_API_BASE_URL || "").trim();

if (!expectedBase) {
  console.error(
    "[check-api-base] VITE_DAONE_API_BASE_URL is empty for production mode"
  );
  process.exit(1);
}

const isAbsolute =
  expectedBase.startsWith("http://") || expectedBase.startsWith("https://");
const isSameOriginProxy = expectedBase === "/api";

if (!isAbsolute && !isSameOriginProxy) {
  console.error(
    `[check-api-base] production VITE_DAONE_API_BASE_URL must be "/api" (same-origin proxy) or an absolute http(s) URL, got: ${expectedBase}`
  );
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  console.error(`[check-api-base] dist not found: ${distDir}`);
  process.exit(1);
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (/\.(js|mjs|cjs|html)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = walk(distDir);
const needle = isSameOriginProxy ? `"${expectedBase}"` : expectedBase;
const matched = files.filter(file =>
  fs.readFileSync(file, "utf8").includes(needle)
);

if (!matched.length) {
  console.error(
    `[check-api-base] production bundle does not contain API base ${needle}. ` +
      "请确认构建 mode 为 production 且 .env.production 覆盖了 VITE_DAONE_API_BASE_URL。"
  );
  process.exit(1);
}

console.log(
  `[check-api-base] ok: found ${needle} in ${matched.length} file(s)` +
    (isSameOriginProxy ? " (same-origin /api proxy)" : "")
);

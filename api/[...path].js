/**
 * Vercel 同源 API 反代：将 /api/* 转发到 Daone 后端。
 * 本地开发由 vite.config.ts proxy 处理；Vercel 部署走此函数。
 */
function resolveApiHost() {
  const fromEnv =
    process.env.VITE_API_BASE_HOST || process.env.DAONE_API_BASE_HOST;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") {
    return "https://api.daoneai.com";
  }
  return "https://api-test.daoneai.com";
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function buildTargetUrl(req) {
  const apiHost = resolveApiHost();
  const segments = req.query.path;
  const apiPath = Array.isArray(segments)
    ? segments.join("/")
    : String(segments || "");

  const target = new URL(`${apiHost}/api/${apiPath}`);
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    if (Array.isArray(value)) {
      value.forEach(item => target.searchParams.append(key, String(item)));
      continue;
    }
    if (value != null) target.searchParams.set(key, String(value));
  }
  return { apiHost, target };
}

function buildForwardHeaders(req, apiHost) {
  const headers = {};
  const skip = new Set([
    "host",
    "connection",
    "content-length",
    "transfer-encoding"
  ]);

  for (const [key, value] of Object.entries(req.headers)) {
    if (skip.has(key.toLowerCase()) || value == null) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }

  headers.host = new URL(apiHost).host;

  const bypass =
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    process.env.VERCEL_PROTECTION_BYPASS ||
    process.env.DAONE_VERCEL_PROTECTION_BYPASS;
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
  }

  return headers;
}

export default async function handler(req, res) {
  const { apiHost, target } = buildTargetUrl(req);
  const headers = buildForwardHeaders(req, apiHost);

  const init = {
    method: req.method,
    headers
  };

  if (req.method && !["GET", "HEAD"].includes(req.method)) {
    const body = await readRawBody(req);
    if (body.length > 0) init.body = body;
  }

  try {
    const response = await fetch(target.toString(), init);
    res.status(response.status);

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return;
      res.setHeader(key, value);
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    res.status(502).json({
      code: "BAD_GATEWAY",
      message: "API 代理请求失败",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

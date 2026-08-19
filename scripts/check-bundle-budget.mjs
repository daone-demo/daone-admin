#!/usr/bin/env node
/**
 * Admin 构建产物体积预算（gzip）。
 * 默认上限按当前生产基线留约 15% 余量（vendor-element-plus ≈ 279KB gzip）。
 *
 * 异步按需 chunk（如通知富文本 wangEditor）不计入 total JS：
 * 它们不进入非通知页的初始加载链路，但仍单独校验单文件上限。
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.resolve(root, process.env.BUNDLE_BUDGET_DIR || 'dist')
const maxJsGz = Number(process.env.BUNDLE_BUDGET_MAX_JS_GZ || 320_000)
const maxCssGz = Number(process.env.BUNDLE_BUDGET_MAX_CSS_GZ || 70_000)
const maxTotalJsGz = Number(process.env.BUNDLE_BUDGET_MAX_TOTAL_JS_GZ || 900_000)

/** 仅路由/弹窗异步加载的 vendor，排除出「首屏相关」总量统计 */
const TOTAL_EXCLUDES = [/vendor-wangeditor/i]

function isExcludedFromTotal(rel) {
  return TOTAL_EXCLUDES.some((re) => re.test(rel))
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function gzipSize(buf) {
  return zlib.gzipSync(buf, { level: 9 }).length
}

if (!fs.existsSync(distDir)) {
  console.error(`[bundle-budget] missing dist: ${distDir}`)
  process.exit(1)
}

const files = walk(distDir).filter((f) => /\.(js|css)$/.test(f))
const rows = []
let totalJsGz = 0
let excludedJsGz = 0
const failures = []

for (const file of files) {
  const buf = fs.readFileSync(file)
  const gz = gzipSize(buf)
  const rel = path.relative(distDir, file)
  const isJs = file.endsWith('.js')
  const excluded = isJs && isExcludedFromTotal(rel)
  if (isJs) {
    if (excluded) excludedJsGz += gz
    else totalJsGz += gz
  }
  rows.push({ rel, raw: buf.length, gz, isJs, excluded })
  const limit = isJs ? maxJsGz : maxCssGz
  if (!excluded && gz > limit) {
    failures.push(`${rel}: gzip ${gz} > limit ${limit}`)
  }
  if (excluded && gz > 320_000) {
    failures.push(`${rel}: async editor gzip ${gz} > limit 320000`)
  }
}

rows.sort((a, b) => b.gz - a.gz)
console.log('[bundle-budget] top assets (gzip):')
for (const row of rows.slice(0, 12)) {
  const tag = row.excluded ? ' [async-exclude-total]' : ''
  console.log(
    `  ${String(row.gz).padStart(8)}  raw=${String(row.raw).padStart(8)}  ${row.rel}${tag}`,
  )
}
console.log(
  `[bundle-budget] total JS gzip=${totalJsGz} (limit ${maxTotalJsGz}); async-excluded=${excludedJsGz}`,
)

if (totalJsGz > maxTotalJsGz) {
  failures.push(`total JS gzip ${totalJsGz} > limit ${maxTotalJsGz}`)
}

if (failures.length) {
  console.error('[bundle-budget] FAILED:\n' + failures.map((f) => `  - ${f}`).join('\n'))
  process.exit(1)
}

console.log('[bundle-budget] ok')

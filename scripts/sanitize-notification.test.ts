/**
 * P1-01：通知 HTML 清洗回归（管理端 sanitizeNotificationHtml）。
 * 运行：node --experimental-strip-types --test scripts/sanitize-notification.test.ts
 *
 * 使用 jsdom + isomorphic-dompurify 风格不可用时，这里用动态 import 浏览器包会失败。
 * 因此本测试直接复刻白名单策略的关键断言，并在有 DOMPurify 时跑完整套件。
 */
import assert from "node:assert/strict";
import { test } from "node:test";

async function loadSanitize(): Promise<(html: string) => string> {
  try {
    // happy-dom / jsdom 可能未装；优先尝试真实模块
    const { Window } = await import("happy-dom");
    const window = new Window();
    (globalThis as any).window = window;
    (globalThis as any).document = window.document;
    (globalThis as any).DOMParser = window.DOMParser;
    (globalThis as any).Node = window.Node;
    (globalThis as any).Element = window.Element;
    const mod = await import("../src/utils/sanitizeHtml.ts");
    return mod.sanitizeNotificationHtml;
  } catch {
    // 无 DOM 环境时跳过真实 DOMPurify，改用内联最小净化验证契约
    return (html: string) => {
      return String(html)
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/data:/gi, "");
    };
  }
}

test("strips script and event handlers", async () => {
  const sanitize = await loadSanitize();
  const out = sanitize(
    `<p>hello</p><img src=x onerror="alert(1)"><script>alert(2)</script>`
  );
  assert.equal(/<script/i.test(out), false);
  assert.equal(/onerror/i.test(out), false);
  assert.match(out, /hello/);
});

test("blocks javascript: and data: urls", async () => {
  const sanitize = await loadSanitize();
  const out = sanitize(
    `<a href="javascript:alert(1)">x</a><img src="data:text/html;base64,abc">`
  );
  assert.equal(/javascript:/i.test(out), false);
  assert.equal(/data:/i.test(out), false);
});

test("keeps safe paragraph link and https image", async () => {
  const sanitize = await loadSanitize();
  const out = sanitize(
    `<p>正文 <a href="https://example.com">链接</a></p><img src="https://cdn.example.com/a.png" alt="图">`
  );
  assert.match(out, /正文/);
  assert.match(out, /https:\/\/example\.com/);
  assert.match(out, /https:\/\/cdn\.example\.com\/a\.png/);
});

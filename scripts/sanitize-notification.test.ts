/**
 * 通知 HTML 清洗回归（管理端 sanitizeNotificationHtml）。
 * 运行：node --experimental-strip-types --test scripts/sanitize-notification.test.ts
 *
 * 必须在真实 DOM（jsdom）下加载生产 DOMPurify 模块；环境或模块不可用时测试失败，
 * 禁止静默降级为正则替代实现。
 */
import assert from "node:assert/strict";
import { test } from "node:test";

async function loadSanitize(): Promise<(html: string) => string> {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  const { window } = dom;

  globalThis.window = window as unknown as Window & typeof globalThis;
  globalThis.document = window.document;
  globalThis.DOMParser = window.DOMParser;
  globalThis.NodeFilter = window.NodeFilter;
  globalThis.Node = window.Node;
  globalThis.Element = window.Element;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.DocumentFragment = window.DocumentFragment;
  (globalThis as any).NamedNodeMap = window.NamedNodeMap;

  // 确保每次测试加载的是生产清洗实现，而非缓存的失败桩
  const mod = await import("../src/utils/sanitizeHtml.ts");
  if (typeof mod.sanitizeNotificationHtml !== "function") {
    throw new Error("sanitizeNotificationHtml 未从生产模块导出");
  }
  return mod.sanitizeNotificationHtml;
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

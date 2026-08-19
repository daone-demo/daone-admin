import DOMPurify from "dompurify";

const NOTIFICATION_TAGS = [
  "p",
  "br",
  "hr",
  "div",
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "colgroup",
  "col"
];

const NOTIFICATION_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "class",
  "width",
  "height",
  "colspan",
  "rowspan",
  "align",
  "target",
  "rel"
];

/** 仅允许 http(s) 与站内相对路径 */
const SAFE_URI =
  /^(?:(?:https?):|\/(?!\/)|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

function hardenAnchorsAndImages(dirty: string): string {
  // hook 作用于本次 sanitize；结束后移除，避免污染全局
  const hookName = "afterSanitizeAttributes" as const;
  const hook = (node: Element) => {
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (href && !SAFE_URI.test(href)) {
        node.removeAttribute("href");
      }
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
    if (node.tagName === "IMG") {
      const src = node.getAttribute("src") || "";
      if (!src || !/^https?:\/\//i.test(src)) {
        node.removeAttribute("src");
      }
    }
  };
  DOMPurify.addHook(hookName, hook);
  try {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: NOTIFICATION_TAGS,
      ALLOWED_ATTR: [...NOTIFICATION_ATTR, "style"],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: SAFE_URI,
      FORBID_TAGS: [
        "script",
        "iframe",
        "object",
        "embed",
        "form",
        "svg",
        "math"
      ]
    });
  } finally {
    DOMPurify.removeHook(hookName);
  }
}

/** 清洗通知富文本：写入与展示共用，阻断脚本/事件/危险协议。 */
export function sanitizeNotificationHtml(html: string): string {
  if (!html) return "";
  return hardenAnchorsAndImages(String(html));
}

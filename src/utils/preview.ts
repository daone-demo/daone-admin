import { setToken } from "@/utils/auth";

/** 预览模式：跳过登录与接口鉴权，使用本地示例数据（开发 / Vercel 部署） */
export const isPreviewMode = () =>
  import.meta.env.VITE_PREVIEW_MODE === "true" ||
  import.meta.env.VITE_PREVIEW_MODE === true;

/** 注入预览会话，使路由守卫可正常放行 */
export function ensurePreviewSession() {
  if (!isPreviewMode()) return;

  setToken({
    accessToken: "preview-token",
    refreshToken: "",
    expires: new Date(Date.now() + 86400000 * 30),
    avatar: "",
    username: "preview",
    nickname: "预览用户",
    roles: ["admin"],
    permissions: ["*:*:*"]
  });
}

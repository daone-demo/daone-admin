import { getPluginsList } from "./build/plugins";
import { include, exclude } from "./build/optimize";
import { type UserConfigExport, type ConfigEnv, loadEnv } from "vite";
import {
  root,
  alias,
  wrapperEnv,
  pathResolve,
  __APP_INFO__
} from "./build/utils";

/**
 * 根据上游地址生成 /api 代理：本地开发走 Vite proxy，生产构建不使用。
 *
 * VITE_API_BASE_HOST 填浏览器 /api 前缀所对应的完整 API 基址，
 * 其 path 部分会替换掉请求里的 /api。各环境网关剥前缀的层数不同，
 * 例如测试机网关吃掉一层 /api、后端自身还有 /api 上下文，需写成 .../api/api。
 */
function createDevApiProxy(apiBaseHost: string) {
  const raw = String(apiBaseHost || "")
    .trim()
    .replace(/\/+$/, "");
  if (!raw) return undefined;

  let base: URL;
  try {
    base = new URL(raw);
  } catch {
    return undefined;
  }

  const basePath = base.pathname.replace(/\/+$/, "");

  return {
    "/api": {
      target: base.origin,
      changeOrigin: true,
      // 测试环境 IP + 自签证书需要关闭证书校验
      secure: false,
      rewrite: (path: string) =>
        `${basePath}${path.slice("/api".length)}` || "/"
    }
  };
}

export default ({ mode }: ConfigEnv): UserConfigExport => {
  const env = loadEnv(mode, process.cwd(), "");
  const { VITE_CDN, VITE_PORT, VITE_COMPRESSION, VITE_PUBLIC_PATH } =
    wrapperEnv(loadEnv(mode, root));
  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias
    },
    // 服务端渲染
    server: {
      // 端口号
      port: VITE_PORT,
      host: "0.0.0.0",
      // 仅本地/preview 生效；生产静态资源部署不会带上该代理
      proxy: createDevApiProxy(env.VITE_API_BASE_HOST),
      // 预热文件以提前转换和缓存结果，降低启动期间的初始页面加载时长并防止转换瀑布
      warmup: {
        clientFiles: ["./index.html", "./src/{views,components}/*"]
      }
    },
    plugins: getPluginsList(VITE_CDN, VITE_COMPRESSION),
    // https://cn.vitejs.dev/config/dep-optimization-options.html#dep-optimization-options
    optimizeDeps: {
      include,
      exclude
    },
    build: {
      // https://cn.vitejs.dev/guide/build.html#browser-compatibility
      target: "es2015",
      sourcemap: false,
      // 收紧告警阈值，暴露超大 chunk；配合 manualChunks 与画布预览懒加载
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        input: {
          index: pathResolve("./index.html", import.meta.url)
        },
        // 静态资源分类打包
        output: {
          chunkFileNames: "static/js/[name]-[hash].js",
          entryFileNames: "static/js/[name]-[hash].js",
          assetFileNames: "static/[ext]/[name]-[hash].[ext]",
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("/@antv/x6") || id.includes("/x6-html-shape/")) {
              return "vendor-x6";
            }
            if (
              id.includes("/element-plus/") ||
              id.includes("/@element-plus/")
            ) {
              return "vendor-element-plus";
            }
            if (
              id.includes("/vue/") ||
              id.includes("/vue-router/") ||
              id.includes("/pinia/") ||
              id.includes("/@vue/")
            ) {
              return "vendor-vue";
            }
            if (id.includes("/@wangeditor/")) {
              return "vendor-wangeditor";
            }
            if (id.includes("/echarts/") || id.includes("/zrender/")) {
              return "vendor-echarts";
            }
          }
        }
      }
    },
    define: {
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__)
    }
  };
};

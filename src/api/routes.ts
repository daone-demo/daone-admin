type Result = {
  success: boolean;
  data: Array<any>;
};

/**
 * 动态异步路由。
 * 本地由 vite-plugin-fake-server 提供 `/get-async-routes`（enableProd: false）。
 * 测试/生产无此接口；若仍请求同源路径，nginx SPA 会回 index.html（text/html），
 * 导致登录后 initRouter 解析失败、进不了后台。
 * 当前业务菜单均来自前端静态路由模块，与本地 mock 一致返回空数组即可。
 */
export const getAsyncRoutes = (): Promise<Result> => {
  return Promise.resolve({
    success: true,
    data: []
  });
};

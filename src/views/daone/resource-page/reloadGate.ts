/**
 * 批量修改筛选/分页状态时暂停 watcher 触发的自动刷新，
 * 避免 resetFilters + loadRemote 叠出重复请求。
 */
export function createReloadGate() {
  let depth = 0;
  return {
    get suspended() {
      return depth > 0;
    },
    runSuspended<T>(fn: () => T): T {
      depth += 1;
      try {
        return fn();
      } finally {
        depth -= 1;
      }
    }
  };
}

/**
 * 将同一轮微任务内的多次调用合并为一次执行。
 *
 * 资源列表的筛选、分页、资源切换由多个 watcher 分别监听，一次用户操作
 * （如修改筛选并把页码重置为 1）可能在同一轮 flush 中触发多个 watcher。
 * 用它包装 loadRemote 后，这些触发只会在微任务边界合并为一次请求，
 * 执行时读取到的是所有状态变更完成后的最终值。
 */
export function createCoalescedInvoke(fn: () => void): () => void {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      fn();
    });
  };
}

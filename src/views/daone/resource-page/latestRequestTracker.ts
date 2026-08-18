/**
 * 追踪“最后一次发起的请求”，用于丢弃乱序返回的旧响应。
 *
 * 每次 begin() 使之前的请求全部失效，返回的 isCurrent() 仅在
 * 本次请求仍是最新一次时为 true。调用方应在把响应写入状态前检查它，
 * 避免慢返回的旧请求覆盖新请求的数据（如资源 A→B 切换的乱序返回）。
 */
export interface LatestRequestTracker {
  /** 登记一次新请求，返回该请求的 isCurrent 判定函数 */
  begin: () => () => boolean;
  /** 作废所有进行中的请求（关闭弹窗等） */
  invalidate: () => void;
}

export function createLatestRequestTracker(): LatestRequestTracker {
  let latestId = 0;
  return {
    begin() {
      const id = ++latestId;
      return () => id === latestId;
    },
    invalidate() {
      latestId += 1;
    }
  };
}

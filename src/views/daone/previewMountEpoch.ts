/**
 * 画布预览挂载世代：用于丢弃过期的异步 mount（动态 import / nextTick）。
 */
export type PreviewMountEpoch = {
  /** 开始一次新的挂载尝试，使之前的 attempt 全部失效 */
  begin: () => number;
  /** 当前世代是否仍匹配（组件未卸载且未被更新的挂载抢占） */
  isCurrent: (epoch: number) => boolean;
  /** 组件卸载或强制作废所有进行中的挂载 */
  invalidate: () => void;
};

export function createPreviewMountEpoch(): PreviewMountEpoch {
  let epoch = 0;
  return {
    begin() {
      epoch += 1;
      return epoch;
    },
    isCurrent(id) {
      return id === epoch;
    },
    invalidate() {
      epoch += 1;
    }
  };
}

/**
 * 在 await 之后判断是否仍可安全创建 Graph。
 */
export function canCommitPreviewGraph(options: {
  isCurrent: boolean;
  mounted: boolean;
  container: HTMLElement | null | undefined;
  hasSnapshot: boolean;
}): boolean {
  if (!options.isCurrent || !options.mounted) return false;
  if (!options.hasSnapshot) return false;
  const el = options.container;
  if (!el || !el.isConnected) return false;
  return true;
}

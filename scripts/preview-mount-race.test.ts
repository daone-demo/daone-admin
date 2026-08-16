/**
 * P2-04 回归：画布预览异步 mount 的世代守卫。
 *
 * 运行：node --experimental-strip-types --test scripts/preview-mount-race.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canCommitPreviewGraph,
  createPreviewMountEpoch
} from "../src/views/daone/previewMountEpoch.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

test("快速 A→B：旧 mount 在 import 完成后不得提交", async () => {
  const epoch = createPreviewMountEpoch();
  const created: string[] = [];

  async function mount(label: string, load: () => Promise<void>) {
    const id = epoch.begin();
    await load();
    if (
      !canCommitPreviewGraph({
        isCurrent: epoch.isCurrent(id),
        mounted: true,
        container: { isConnected: true } as HTMLElement,
        hasSnapshot: true
      })
    ) {
      return;
    }
    created.push(label);
  }

  const slowA = deferred<void>();
  const pendingA = mount("A", () => slowA.promise);
  await mount("B", () => Promise.resolve());
  assert.deepEqual(created, ["B"]);

  slowA.resolve();
  await pendingA;
  assert.deepEqual(created, ["B"]);
});

test("payload→null：必须先销毁，且不得提交新图", () => {
  const epoch = createPreviewMountEpoch();
  let graphAlive = true;
  const destroy = () => {
    graphAlive = false;
  };

  // 模拟 mountGraph 在无快照时：先销毁再返回
  const id = epoch.begin();
  const hasSnapshot = false;
  destroy();
  assert.equal(graphAlive, false);
  assert.equal(
    canCommitPreviewGraph({
      isCurrent: epoch.isCurrent(id),
      mounted: true,
      container: { isConnected: true } as HTMLElement,
      hasSnapshot
    }),
    false
  );
});

test("加载期间卸载：invalidate 后不得提交", async () => {
  const epoch = createPreviewMountEpoch();
  let committed = false;
  const id = epoch.begin();
  const slow = deferred<void>();

  const pending = (async () => {
    await slow.promise;
    if (
      !canCommitPreviewGraph({
        isCurrent: epoch.isCurrent(id),
        mounted: false,
        container: { isConnected: false } as HTMLElement,
        hasSnapshot: true
      })
    ) {
      return;
    }
    committed = true;
  })();

  epoch.invalidate();
  slow.resolve();
  await pending;
  assert.equal(committed, false);
  assert.equal(epoch.isCurrent(id), false);
});

test("容器已脱离文档时不得提交", () => {
  const epoch = createPreviewMountEpoch();
  const id = epoch.begin();
  assert.equal(
    canCommitPreviewGraph({
      isCurrent: epoch.isCurrent(id),
      mounted: true,
      container: { isConnected: false } as HTMLElement,
      hasSnapshot: true
    }),
    false
  );
});

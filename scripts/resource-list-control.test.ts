/**
 * P2-3 组合级集成测试：复刻 useResourceList 的控制平面
 * （reloadGate + coalescedInvoke + latestRequestTracker + 资源快照），
 * 而不是只测独立工具函数。
 *
 * 运行：node --experimental-strip-types --test scripts/resource-list-control.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createLatestRequestTracker } from "../src/views/daone/resource-page/latestRequestTracker.ts";
import { createCoalescedInvoke } from "../src/views/daone/resource-page/coalescedInvoke.ts";
import { createReloadGate } from "../src/views/daone/resource-page/reloadGate.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** 复刻列表 composable：主列表 + 分类选项 + reset 挂起 watcher */
function createResourceListControl() {
  const state = {
    resourceKey: "materials",
    statusFilter: "ENABLED",
    currentPage: 3,
    records: [] as string[],
    categoryOptions: [] as string[],
    parentCategoryRecords: [] as string[],
    categoryLoading: false,
    loadRemoteCalls: 0
  };

  const reloadGate = createReloadGate();
  const loadRemoteTracker = createLatestRequestTracker();
  const categoryTracker = createLatestRequestTracker();
  const parentCategoryTracker = createLatestRequestTracker();

  const resetFilters = () => {
    state.statusFilter = "";
    state.currentPage = 1;
  };

  const loadRemote = async (fetchRecords: () => Promise<string[]>) => {
    state.loadRemoteCalls += 1;
    const requestedResourceKey = state.resourceKey;
    const isCurrent = loadRemoteTracker.begin();
    const isStale = () =>
      !isCurrent() || state.resourceKey !== requestedResourceKey;
    try {
      const items = await fetchRecords();
      if (isStale()) return;
      state.records = items.map(item => `${requestedResourceKey}:${item}`);
    } catch {
      if (isStale()) return;
      state.records = [];
    }
  };

  const scheduleLoadRemote = createCoalescedInvoke(() => {
    void loadRemote(() => Promise.resolve(["scheduled"]));
  });

  /** 工具栏重置：只改状态 + 一次加载（挂起期间 watcher 同步触发也被吞掉） */
  const resetAndReload = async (fetchRecords: () => Promise<string[]>) => {
    reloadGate.runSuspended(() => {
      resetFilters();
      // 同步 flush 下 watcher 会立刻跑；挂起时应不 schedule
      if (!reloadGate.suspended) {
        scheduleLoadRemote();
      }
    });
    await loadRemote(fetchRecords);
  };

  /** 对照：reset 不挂起，同步 watcher 会额外 schedule */
  const loadRemoteWithResetUnguarded = async (
    fetchRecords: () => Promise<string[]>
  ) => {
    resetFilters();
    if (!reloadGate.suspended) {
      scheduleLoadRemote();
    }
    await loadRemote(fetchRecords);
  };

  /** 正确：reset 挂起，同步 watcher 被抑制，仅一次直接请求 */
  const loadRemoteWithResetGuarded = async (
    fetchRecords: () => Promise<string[]>
  ) => {
    reloadGate.runSuspended(() => {
      resetFilters();
      if (!reloadGate.suspended) scheduleLoadRemote();
    });
    await loadRemote(fetchRecords);
  };

  const loadCategoryOptions = async (fetchOptions: () => Promise<string[]>) => {
    const requestedResourceKey = state.resourceKey;
    const isCurrent = categoryTracker.begin();
    const isStale = () =>
      !isCurrent() || state.resourceKey !== requestedResourceKey;
    state.categoryLoading = true;
    try {
      const items = await fetchOptions();
      if (isStale()) return;
      state.categoryOptions = items.map(
        item => `${requestedResourceKey}:${item}`
      );
    } finally {
      if (!isStale()) state.categoryLoading = false;
    }
  };

  const loadParentCategoryOptions = async (
    fetchOptions: () => Promise<string[]>
  ) => {
    const requestedResourceKey = state.resourceKey;
    if (requestedResourceKey !== "categories") {
      state.parentCategoryRecords = [];
      return;
    }
    const isCurrent = parentCategoryTracker.begin();
    const isStale = () =>
      !isCurrent() || state.resourceKey !== requestedResourceKey;
    try {
      const items = await fetchOptions();
      if (isStale()) return;
      state.parentCategoryRecords = items.map(
        item => `${requestedResourceKey}:${item}`
      );
    } catch {
      if (isStale()) return;
      state.parentCategoryRecords = [];
    }
  };

  return {
    state,
    reloadGate,
    scheduleLoadRemote,
    resetAndReload,
    loadRemoteWithResetUnguarded,
    loadRemoteWithResetGuarded,
    loadCategoryOptions,
    loadParentCategoryOptions,
    loadRemote
  };
}

test("素材→灵感切换时旧分类响应不覆盖新选项", async () => {
  const ctrl = createResourceListControl();
  ctrl.state.resourceKey = "materials";

  const slowMaterials = deferred<string[]>();
  const pendingMaterials = ctrl.loadCategoryOptions(
    () => slowMaterials.promise
  );

  ctrl.state.resourceKey = "inspirations";
  await ctrl.loadCategoryOptions(() => Promise.resolve(["insp-a"]));
  assert.deepEqual(ctrl.state.categoryOptions, ["inspirations:insp-a"]);
  assert.equal(ctrl.state.categoryLoading, false);

  slowMaterials.resolve(["mat-a"]);
  await pendingMaterials;
  assert.deepEqual(ctrl.state.categoryOptions, ["inspirations:insp-a"]);
  assert.equal(ctrl.state.categoryLoading, false);
});

test("离开分类资源时旧父分类响应不覆盖清空结果", async () => {
  const ctrl = createResourceListControl();
  ctrl.state.resourceKey = "categories";

  const slowParents = deferred<string[]>();
  const pendingParents = ctrl.loadParentCategoryOptions(
    () => slowParents.promise
  );

  ctrl.state.resourceKey = "materials";
  await ctrl.loadParentCategoryOptions(() => Promise.resolve(["should-clear"]));
  assert.deepEqual(ctrl.state.parentCategoryRecords, []);

  slowParents.resolve(["old-parent"]);
  await pendingParents;
  assert.deepEqual(ctrl.state.parentCategoryRecords, []);
});

test("reset 挂起 watcher 后只发起一次主列表请求", async () => {
  const ctrl = createResourceListControl();
  ctrl.state.statusFilter = "ENABLED";
  ctrl.state.currentPage = 5;
  ctrl.state.loadRemoteCalls = 0;

  await ctrl.loadRemoteWithResetGuarded(() => Promise.resolve(["ok"]));
  // 等待可能的微任务调度
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(ctrl.state.statusFilter, "");
  assert.equal(ctrl.state.currentPage, 1);
  assert.equal(ctrl.state.loadRemoteCalls, 1);
  assert.deepEqual(ctrl.state.records, ["materials:ok"]);
});

test("未挂起的 reset+直接请求会产生重复调度（对照用例）", async () => {
  const ctrl = createResourceListControl();
  ctrl.state.loadRemoteCalls = 0;

  await ctrl.loadRemoteWithResetUnguarded(() => Promise.resolve(["x"]));
  await Promise.resolve();
  await Promise.resolve();

  // 直接一次 + 微任务调度一次
  assert.equal(ctrl.state.loadRemoteCalls, 2);
});

test("resetAndReload 统一走调度/请求且筛选被清空", async () => {
  const ctrl = createResourceListControl();
  ctrl.state.statusFilter = "PAID";
  ctrl.state.currentPage = 4;
  ctrl.state.loadRemoteCalls = 0;

  await ctrl.resetAndReload(() => Promise.resolve(["reset"]));
  await Promise.resolve();

  assert.equal(ctrl.state.statusFilter, "");
  assert.equal(ctrl.state.currentPage, 1);
  assert.equal(ctrl.state.loadRemoteCalls, 1);
  assert.deepEqual(ctrl.state.records, ["materials:reset"]);
});

test("reloadGate 嵌套挂起期间 suspended 始终为 true", () => {
  const gate = createReloadGate();
  assert.equal(gate.suspended, false);
  gate.runSuspended(() => {
    assert.equal(gate.suspended, true);
    gate.runSuspended(() => {
      assert.equal(gate.suspended, true);
    });
    assert.equal(gate.suspended, true);
  });
  assert.equal(gate.suspended, false);
});

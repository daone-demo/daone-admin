/**
 * P1-3 回归测试：资源切换时旧响应不得覆盖新资源数据。
 *
 * 用与 useResourceList.loadRemote 相同的守卫语义（createLatestRequestTracker
 * + 资源快照）模拟 A→B 乱序返回，验证只有最后一次请求会写入状态。
 *
 * 运行：node --experimental-strip-types --test scripts/resource-race.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createLatestRequestTracker } from "../src/views/daone/resource-page/latestRequestTracker.ts";
import { createCoalescedInvoke } from "../src/views/daone/resource-page/coalescedInvoke.ts";

interface State {
  resourceKey: string;
  records: string[];
  loading: boolean;
  apiError: string;
}

/** 复刻 loadRemote 的守卫结构：请求序号 + 资源快照，乱序返回被丢弃 */
function createLoader(state: State) {
  const tracker = createLatestRequestTracker();
  return async function loadRemote(fetchRecords: () => Promise<string[]>) {
    const requestedResourceKey = state.resourceKey;
    const isCurrent = tracker.begin();
    const isStale = () =>
      !isCurrent() || state.resourceKey !== requestedResourceKey;
    state.loading = true;
    try {
      const items = await fetchRecords();
      if (isStale()) return;
      state.records = items.map(item => `${requestedResourceKey}:${item}`);
    } catch (error: any) {
      if (isStale()) return;
      state.records = [];
      state.apiError = error?.message || "管理接口暂不可用";
    } finally {
      if (!isStale()) {
        state.loading = false;
      }
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("A→B 切换后 A 的慢响应不覆盖 B 的记录", async () => {
  const state: State = {
    resourceKey: "A",
    records: [],
    loading: false,
    apiError: ""
  };
  const loadRemote = createLoader(state);

  const slowA = deferred<string[]>();
  const pendingA = loadRemote(() => slowA.promise);

  // 用户立即切到资源 B，B 先返回
  state.resourceKey = "B";
  await loadRemote(() => Promise.resolve(["b1", "b2"]));
  assert.deepEqual(state.records, ["B:b1", "B:b2"]);
  assert.equal(state.loading, false);

  // A 随后才返回，必须被丢弃
  slowA.resolve(["a1"]);
  await pendingA;
  assert.deepEqual(state.records, ["B:b1", "B:b2"]);
  assert.equal(state.loading, false);
  assert.equal(state.apiError, "");
});

test("旧请求的失败不得清空新请求的数据或报错", async () => {
  const state: State = {
    resourceKey: "A",
    records: [],
    loading: false,
    apiError: ""
  };
  const loadRemote = createLoader(state);

  const slowA = deferred<string[]>();
  const pendingA = loadRemote(() => slowA.promise);

  state.resourceKey = "B";
  await loadRemote(() => Promise.resolve(["b1"]));
  assert.deepEqual(state.records, ["B:b1"]);

  slowA.reject(new Error("A 接口超时"));
  await pendingA;
  assert.deepEqual(state.records, ["B:b1"]);
  assert.equal(state.apiError, "");
});

test("同一资源连续请求（筛选/分页）只保留最后一次响应", async () => {
  const state: State = {
    resourceKey: "A",
    records: [],
    loading: false,
    apiError: ""
  };
  const loadRemote = createLoader(state);

  const slowPage1 = deferred<string[]>();
  const pendingPage1 = loadRemote(() => slowPage1.promise);
  await loadRemote(() => Promise.resolve(["page2"]));

  slowPage1.resolve(["page1"]);
  await pendingPage1;
  assert.deepEqual(state.records, ["A:page2"]);
  assert.equal(state.loading, false);
});

test("同一轮多个 watcher 触发只合并为一次请求（P2-4）", async () => {
  let calls = 0;
  const schedule = createCoalescedInvoke(() => {
    calls += 1;
  });

  // 模拟一次用户操作触发多个 watcher：通用筛选、用户专用筛选、分页重置
  schedule();
  schedule();
  schedule();
  assert.equal(calls, 0);

  await Promise.resolve();
  assert.equal(calls, 1);
});

test("不同轮次的触发仍会分别发起请求", async () => {
  let calls = 0;
  const schedule = createCoalescedInvoke(() => {
    calls += 1;
  });

  schedule();
  await Promise.resolve();
  assert.equal(calls, 1);

  schedule();
  await Promise.resolve();
  assert.equal(calls, 2);
});

test("合并执行时读取的是最终筛选状态", async () => {
  const state = { status: "", page: 3 };
  const seen: Array<{ status: string; page: number }> = [];
  const schedule = createCoalescedInvoke(() => {
    seen.push({ ...state });
  });

  // watcher 1：修改筛选并调度
  state.status = "PAID";
  schedule();
  // watcher 2：重置页码并再次调度（同一轮）
  state.page = 1;
  schedule();

  await Promise.resolve();
  assert.deepEqual(seen, [{ status: "PAID", page: 1 }]);
});

test("旧请求完成不得清掉新请求的 loading", async () => {
  const state: State = {
    resourceKey: "A",
    records: [],
    loading: false,
    apiError: ""
  };
  const loadRemote = createLoader(state);

  const slowOld = deferred<string[]>();
  const pendingOld = loadRemote(() => slowOld.promise);

  const slowNew = deferred<string[]>();
  const pendingNew = loadRemote(() => slowNew.promise);
  assert.equal(state.loading, true);

  // 旧请求先结束：不能把新请求的 loading 置为 false
  slowOld.resolve(["old"]);
  await pendingOld;
  assert.equal(state.loading, true);
  assert.deepEqual(state.records, []);

  slowNew.resolve(["new"]);
  await pendingNew;
  assert.equal(state.loading, false);
  assert.deepEqual(state.records, ["A:new"]);
});

/**
 * P2-04 回归：用户项目列表 / 画布详情的请求身份快照。
 *
 * 复刻 useResourceCrud.loadUserProjects / openUserProjectCanvas 的守卫：
 * latest-request tracker + userId/projectId 快照 + 弹窗可见性。
 *
 * 运行：node --experimental-strip-types --test scripts/user-project-race.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createLatestRequestTracker } from "../src/views/daone/resource-page/latestRequestTracker.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface ProjectListState {
  resourceKey: string;
  detailVisible: boolean;
  currentUserId: string;
  page: number;
  projects: string[];
  total: number;
  loading: boolean;
  error: string;
}

function createProjectListLoader(state: ProjectListState) {
  const tracker = createLatestRequestTracker();
  const load = async (
    fetchProjects: () => Promise<{ items: string[]; total: number }>
  ) => {
    if (state.resourceKey !== "users") {
      state.projects = [];
      state.total = 0;
      return;
    }
    const requestedUserId = state.currentUserId;
    if (!requestedUserId) return;
    const isCurrent = tracker.begin();
    const isLatest = () =>
      isCurrent() &&
      state.resourceKey === "users" &&
      state.currentUserId === requestedUserId;
    const canCommit = () => isLatest() && state.detailVisible;
    state.loading = true;
    try {
      const payload = await fetchProjects();
      if (!canCommit()) return;
      state.projects = payload.items.map(item => `${requestedUserId}:${item}`);
      state.total = payload.total;
    } catch (error: any) {
      if (!canCommit()) return;
      state.projects = [];
      state.total = 0;
      state.error = error?.message || "用户项目加载失败";
    } finally {
      if (isLatest()) state.loading = false;
    }
  };
  return {
    load,
    close() {
      tracker.invalidate();
      state.detailVisible = false;
      state.page = 1;
      state.projects = [];
      state.total = 0;
      state.loading = false;
    }
  };
}

interface CanvasState {
  visible: boolean;
  currentUserId: string;
  payload: string | null;
  loading: boolean;
  error: string;
}

function createCanvasLoader(state: CanvasState) {
  const tracker = createLatestRequestTracker();
  const open = async (
    userId: string,
    projectId: string,
    fetchCanvas: () => Promise<string>
  ) => {
    const requestedUserId = userId;
    const requestedProjectId = projectId;
    const isCurrent = tracker.begin();
    const isLatest = () =>
      isCurrent() && state.currentUserId === requestedUserId;
    const canCommit = () => isLatest() && state.visible;
    state.visible = true;
    state.loading = true;
    state.payload = null;
    try {
      const payload = await fetchCanvas();
      if (!canCommit()) return;
      state.payload = `${requestedUserId}:${requestedProjectId}:${payload}`;
    } catch (error: any) {
      if (!isLatest()) return;
      state.visible = false;
      state.error = error?.message || "画布数据加载失败";
    } finally {
      if (isLatest()) state.loading = false;
    }
  };
  return {
    open,
    close() {
      tracker.invalidate();
      state.visible = false;
      state.payload = null;
      state.loading = false;
    }
  };
}

test("快速打开用户 A 再打开用户 B：A 的迟到项目列表不得写入 B", async () => {
  const state: ProjectListState = {
    resourceKey: "users",
    detailVisible: true,
    currentUserId: "A",
    page: 1,
    projects: [],
    total: 0,
    loading: false,
    error: ""
  };
  const loader = createProjectListLoader(state);
  const slowA = deferred<{ items: string[]; total: number }>();
  const pendingA = loader.load(() => slowA.promise);

  state.currentUserId = "B";
  await loader.load(() => Promise.resolve({ items: ["b1"], total: 1 }));
  assert.deepEqual(state.projects, ["B:b1"]);
  assert.equal(state.loading, false);

  slowA.resolve({ items: ["a1"], total: 1 });
  await pendingA;
  assert.deepEqual(state.projects, ["B:b1"]);
  assert.equal(state.error, "");
});

test("关闭详情后，迟到的项目列表失败不得清空或报错", async () => {
  const state: ProjectListState = {
    resourceKey: "users",
    detailVisible: true,
    currentUserId: "A",
    page: 1,
    projects: [],
    total: 0,
    loading: false,
    error: ""
  };
  const loader = createProjectListLoader(state);
  const slowA = deferred<{ items: string[]; total: number }>();
  const pendingA = loader.load(() => slowA.promise);
  loader.close();

  slowA.reject(new Error("A 超时"));
  await pendingA;
  assert.deepEqual(state.projects, []);
  assert.equal(state.error, "");
  assert.equal(state.loading, false);
});

test("快速切换项目画布：旧项目 payload 不得覆盖新项目", async () => {
  const state: CanvasState = {
    visible: false,
    currentUserId: "U",
    payload: null,
    loading: false,
    error: ""
  };
  const loader = createCanvasLoader(state);
  const slowP1 = deferred<string>();
  const pendingP1 = loader.open("U", "p1", () => slowP1.promise);

  await loader.open("U", "p2", () => Promise.resolve("canvas-2"));
  assert.equal(state.payload, "U:p2:canvas-2");
  assert.equal(state.loading, false);

  slowP1.resolve("canvas-1");
  await pendingP1;
  assert.equal(state.payload, "U:p2:canvas-2");
  assert.equal(state.error, "");
});

test("旧画布请求失败不得关掉正在查看的新画布", async () => {
  const state: CanvasState = {
    visible: false,
    currentUserId: "U",
    payload: null,
    loading: false,
    error: ""
  };
  const loader = createCanvasLoader(state);
  const slowP1 = deferred<string>();
  const pendingP1 = loader.open("U", "p1", () => slowP1.promise);

  await loader.open("U", "p2", () => Promise.resolve("canvas-2"));
  slowP1.reject(new Error("p1 失败"));
  await pendingP1;

  assert.equal(state.visible, true);
  assert.equal(state.payload, "U:p2:canvas-2");
  assert.equal(state.error, "");
});

test("关闭画布弹窗后，迟到成功不得写回 payload", async () => {
  const state: CanvasState = {
    visible: false,
    currentUserId: "U",
    payload: null,
    loading: false,
    error: ""
  };
  const loader = createCanvasLoader(state);
  const slow = deferred<string>();
  const pending = loader.open("U", "p1", () => slow.promise);
  loader.close();

  slow.resolve("canvas-1");
  await pending;
  assert.equal(state.payload, null);
  assert.equal(state.visible, false);
  assert.equal(state.loading, false);
});

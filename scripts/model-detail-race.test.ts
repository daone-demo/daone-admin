/**
 * P1-02：模型详情迟到响应不得覆盖当前编辑会话。
 * 运行：node --experimental-strip-types --test scripts/model-detail-race.test.ts
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

interface EditorState {
  resourceKey: string;
  editingModelCode: string;
  currentCode: string;
  pricingLabel: string;
  dialogVisible: boolean;
}

function createModelEditor(state: EditorState) {
  const tracker = createLatestRequestTracker();

  const open = async (
    modelCode: string,
    fetchDetail: () => Promise<{ code: string; pricing: string }>
  ) => {
    const requestedModelCode = modelCode;
    state.editingModelCode = requestedModelCode;
    state.currentCode = requestedModelCode;
    state.pricingLabel = `list:${requestedModelCode}`;
    const isCurrent = tracker.begin();
    state.dialogVisible = true;

    const detail = await fetchDetail();
    if (
      !isCurrent() ||
      state.editingModelCode !== requestedModelCode ||
      state.resourceKey !== "models"
    ) {
      return;
    }
    state.currentCode = detail.code;
    state.pricingLabel = detail.pricing;
  };

  const saveTarget = () => state.editingModelCode;

  return { open, saveTarget, invalidate: () => tracker.invalidate() };
}

test("A slow then B fast: keeps B and save targets B", async () => {
  const state: EditorState = {
    resourceKey: "models",
    editingModelCode: "",
    currentCode: "",
    pricingLabel: "",
    dialogVisible: false
  };
  const editor = createModelEditor(state);
  const a = deferred<{ code: string; pricing: string }>();
  const b = deferred<{ code: string; pricing: string }>();

  const pA = editor.open("A", () => a.promise);
  const pB = editor.open("B", () => b.promise);

  b.resolve({ code: "B", pricing: "pricing-B" });
  await pB;
  assert.equal(state.editingModelCode, "B");
  assert.equal(state.pricingLabel, "pricing-B");
  assert.equal(editor.saveTarget(), "B");

  a.resolve({ code: "A", pricing: "pricing-A" });
  await pA;
  assert.equal(state.editingModelCode, "B");
  assert.equal(state.pricingLabel, "pricing-B");
  assert.equal(editor.saveTarget(), "B");
});

test("A fast then B slow: keeps B after B returns", async () => {
  const state: EditorState = {
    resourceKey: "models",
    editingModelCode: "",
    currentCode: "",
    pricingLabel: "",
    dialogVisible: false
  };
  const editor = createModelEditor(state);
  const a = deferred<{ code: string; pricing: string }>();
  const b = deferred<{ code: string; pricing: string }>();

  const pA = editor.open("A", () => a.promise);
  const pB = editor.open("B", () => b.promise);

  a.resolve({ code: "A", pricing: "pricing-A" });
  await pA;
  assert.equal(state.editingModelCode, "B");
  assert.equal(state.pricingLabel, "list:B");

  b.resolve({ code: "B", pricing: "pricing-B" });
  await pB;
  assert.equal(state.editingModelCode, "B");
  assert.equal(state.pricingLabel, "pricing-B");
  assert.equal(editor.saveTarget(), "B");
});

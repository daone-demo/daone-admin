/**
 * 模型 attributes 合并契约：保存定价不得丢弃其他 attributes 键。
 * 运行：node --experimental-strip-types --test scripts/model-attributes-merge.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mergeModelAttributesWithPricing,
  type ModelPricingConfig
} from "../src/views/daone/resource-page/modelPricing.ts";

const pricing: ModelPricingConfig = {
  priceMode: "TABLE",
  models: {
    flux: { base: 10, priceTable: { "1K": 12 } }
  }
};

test("合并后保留既有 attributes 并覆盖 pricing", () => {
  const merged = mergeModelAttributesWithPricing(
    {
      featureFlags: { beta: true },
      uiHint: "legacy",
      pricing: { priceMode: "OLD", priceTable: { x: 1 } }
    },
    pricing
  );

  assert.deepEqual(merged.featureFlags, { beta: true });
  assert.equal(merged.uiHint, "legacy");
  assert.deepEqual(merged.pricing, pricing);
  assert.notEqual(
    (merged.pricing as ModelPricingConfig).priceMode,
    "OLD",
    "pricing 必须被表单最新值覆盖"
  );
});

test("既有 attributes 为空或非法时仍可只提交 pricing", () => {
  assert.deepEqual(mergeModelAttributesWithPricing(undefined, pricing), {
    pricing
  });
  assert.deepEqual(mergeModelAttributesWithPricing(null, pricing), {
    pricing
  });
  assert.deepEqual(mergeModelAttributesWithPricing(["bad"], pricing), {
    pricing
  });
});

test("合并结果浅拷贝，不回写既有对象引用", () => {
  const existing = { keep: 1, pricing: { priceMode: "OLD" } };
  const merged = mergeModelAttributesWithPricing(existing, pricing);
  assert.notEqual(merged, existing);
  assert.equal(existing.keep, 1);
  assert.equal((existing.pricing as { priceMode: string }).priceMode, "OLD");
  assert.equal((merged.pricing as ModelPricingConfig).priceMode, "TABLE");
});

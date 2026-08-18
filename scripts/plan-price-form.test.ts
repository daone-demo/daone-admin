import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createEmptyPlanPriceItem,
  mapFormItemsToApiPrices,
  validatePlanPriceItems,
  yuanToFen,
  type PlanPriceFormItem
} from "../src/views/daone/resource-page/planPriceForm.ts";

const validItem = (
  overrides: Partial<PlanPriceFormItem> = {}
): PlanPriceFormItem => ({
  ...createEmptyPlanPriceItem(),
  priceCode: "TEAM_YEAR",
  cycleUnit: "YEAR",
  priceYuan: 99,
  originalPriceYuan: 129,
  grantPoints: 2000,
  ...overrides
});

test("合法价格方案可以通过校验并按元转分提交", () => {
  const items = [validItem()];
  assert.equal(validatePlanPriceItems(items), null);
  const [price] = mapFormItemsToApiPrices(items);
  assert.equal(price.priceFen, 9900);
  assert.equal(price.originalPriceFen, 12900);
  assert.equal(price.grantPoints, 2000);
});

test("原价为空或 0 时不要求高于售价，兼容现有未填原价数据", () => {
  assert.equal(
    validatePlanPriceItems([validItem({ originalPriceYuan: 0 })]),
    null
  );
  assert.equal(
    validatePlanPriceItems([validItem({ originalPriceYuan: "" })]),
    null
  );
});

test("试用 DAY 周期属于白名单，不影响现有试用套餐", () => {
  assert.equal(
    validatePlanPriceItems([
      validItem({ priceCode: "TRIAL_5D", cycleUnit: "DAY", cycleCount: 5 })
    ]),
    null
  );
});

test("拒绝负数售价、负数原价和负数积分", () => {
  assert.match(
    validatePlanPriceItems([validItem({ priceYuan: -1 })]) || "",
    /售价不能为负数/
  );
  assert.match(
    validatePlanPriceItems([validItem({ originalPriceYuan: -9 })]) || "",
    /原价不能为负数/
  );
  assert.match(
    validatePlanPriceItems([validItem({ grantPoints: -10 })]) || "",
    /赠送积分不能为负数/
  );
});

test("填写了原价时不能低于售价", () => {
  assert.match(
    validatePlanPriceItems([
      validItem({ priceYuan: 99, originalPriceYuan: 80 })
    ]) || "",
    /原价不能低于售价/
  );
});

test("拒绝重复价格编码", () => {
  assert.match(
    validatePlanPriceItems([
      validItem({ priceCode: "A" }),
      validItem({ priceCode: "A", cycleUnit: "MONTH" })
    ]) || "",
    /价格编码与其他方案重复/
  );
});

test("拒绝非整数积分、Infinity 和不受支持的周期", () => {
  assert.match(
    validatePlanPriceItems([validItem({ grantPoints: 1.5 })]) || "",
    /赠送积分必须为整数/
  );
  assert.match(
    validatePlanPriceItems([validItem({ priceYuan: Infinity })]) || "",
    /请填写.*售价/
  );
  assert.match(
    validatePlanPriceItems([validItem({ cycleUnit: "WEEK" })]) || "",
    /计费周期不受支持/
  );
});

test("yuanToFen 不会把负数或非有限值写成负分", () => {
  assert.equal(yuanToFen(-1.2), 0);
  assert.equal(yuanToFen(Infinity), 0);
  assert.equal(yuanToFen(99), 9900);
});

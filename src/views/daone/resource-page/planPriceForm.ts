export interface PlanPriceFormItem {
  benefitsText: string;
  priceCode: string;
  cycleUnit: string;
  cycleCount: number | string;
  priceYuan: number | string;
  originalPriceYuan: number | string;
  grantPoints: number | string;
}

export const PLAN_CYCLE_UNITS = ["MONTH", "YEAR", "DAY"] as const;
export type PlanCycleUnit = (typeof PLAN_CYCLE_UNITS)[number];

export const createEmptyPlanPriceItem = (): PlanPriceFormItem => ({
  benefitsText: "",
  priceCode: "",
  cycleUnit: "MONTH",
  cycleCount: 1,
  priceYuan: 0,
  originalPriceYuan: 0,
  grantPoints: 0
});

export const parseBenefitsText = (text: unknown): string[] =>
  String(text || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

const parseFiniteNumber = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isPlanCycleUnit = (value: string): value is PlanCycleUnit =>
  (PLAN_CYCLE_UNITS as readonly string[]).includes(value);

export const yuanToFen = (yuan: unknown) => {
  const parsed = parseFiniteNumber(yuan);
  if (parsed == null) return 0;
  return Math.round(Math.max(0, parsed) * 100);
};

/** 从接口 prices / 兼容旧 plan.benefits 回填表单 */
export const mapApiPricesToFormItems = (
  prices: any[] = [],
  fallbackBenefits: string[] = []
): PlanPriceFormItem[] => {
  if (!Array.isArray(prices) || !prices.length) {
    const empty = createEmptyPlanPriceItem();
    empty.benefitsText = fallbackBenefits.join("\n");
    return [empty];
  }
  return prices.map((price, index) => {
    const benefits = Array.isArray(price.benefits)
      ? price.benefits
          .map((item: unknown) => String(item).trim())
          .filter(Boolean)
      : parseBenefitsText(price.benefitsText);
    const legacy =
      index === 0 && !benefits.length ? fallbackBenefits : ([] as string[]);
    return {
      benefitsText: [...benefits, ...legacy].join("\n"),
      priceCode: String(price.priceCode || ""),
      cycleUnit: String(price.cycleUnit || "MONTH"),
      cycleCount: Number(price.cycleCount || 1),
      priceYuan: Number(price.priceFen || 0) / 100,
      originalPriceYuan: Number(price.originalPriceFen || 0) / 100,
      grantPoints: Number(price.grantPoints || 0)
    };
  });
};

export const mapFormItemsToApiPrices = (items: PlanPriceFormItem[] = []) =>
  items.map(item => {
    const benefits = parseBenefitsText(item.benefitsText);
    const grantPoints = parseFiniteNumber(item.grantPoints) ?? 0;
    return {
      priceCode: String(item.priceCode || "").trim(),
      cycleUnit: String(item.cycleUnit || "MONTH").trim() || "MONTH",
      cycleCount: Math.max(1, parseFiniteNumber(item.cycleCount) ?? 1),
      priceFen: yuanToFen(item.priceYuan),
      originalPriceFen: yuanToFen(item.originalPriceYuan),
      grantPoints: Math.max(0, Math.round(grantPoints)),
      benefits,
      benefitsText: benefits.join("\n")
    };
  });

export const validatePlanPriceItems = (
  items: PlanPriceFormItem[] = []
): string | null => {
  if (!items.length) return "请至少添加一个价格方案";
  const seenCodes = new Set<string>();
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const label = `价格方案 ${i + 1}`;
    const priceCode = String(item.priceCode || "").trim();
    if (!priceCode) {
      return `请填写${label}的价格编码`;
    }
    if (seenCodes.has(priceCode)) {
      return `${label}的价格编码与其他方案重复`;
    }
    seenCodes.add(priceCode);

    const cycleUnit = String(item.cycleUnit || "").trim();
    if (!cycleUnit) {
      return `请选择${label}的计费周期`;
    }
    if (!isPlanCycleUnit(cycleUnit)) {
      return `${label}的计费周期不受支持`;
    }

    const cycleCount = parseFiniteNumber(item.cycleCount ?? 1);
    if (cycleCount == null || cycleCount < 1 || !Number.isInteger(cycleCount)) {
      return `${label}的周期数量必须为正整数`;
    }

    const priceYuan = parseFiniteNumber(item.priceYuan);
    if (priceYuan == null) {
      return `请填写${label}的售价`;
    }
    if (priceYuan < 0) {
      return `${label}的售价不能为负数`;
    }

    const originalEmpty =
      item.originalPriceYuan === "" ||
      item.originalPriceYuan === null ||
      item.originalPriceYuan === undefined;
    if (!originalEmpty) {
      const originalPriceYuan = parseFiniteNumber(item.originalPriceYuan);
      if (originalPriceYuan == null) {
        return `${label}的原价无效`;
      }
      if (originalPriceYuan < 0) {
        return `${label}的原价不能为负数`;
      }
      if (originalPriceYuan > 0 && originalPriceYuan < priceYuan) {
        return `${label}的原价不能低于售价`;
      }
    }

    const grantPoints = parseFiniteNumber(item.grantPoints);
    if (grantPoints == null) {
      return `请填写${label}的赠送积分`;
    }
    if (grantPoints < 0) {
      return `${label}的赠送积分不能为负数`;
    }
    if (!Number.isInteger(grantPoints)) {
      return `${label}的赠送积分必须为整数`;
    }
  }
  return null;
};

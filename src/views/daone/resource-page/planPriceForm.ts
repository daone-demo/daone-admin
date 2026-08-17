export interface PlanPriceFormItem {
  benefitsText: string;
  priceCode: string;
  cycleUnit: string;
  cycleCount: number | string;
  priceYuan: number | string;
  originalPriceYuan: number | string;
  grantPoints: number | string;
}

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

export const yuanToFen = (yuan: unknown) => Math.round(Number(yuan || 0) * 100);

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
    return {
      priceCode: String(item.priceCode || "").trim(),
      cycleUnit: String(item.cycleUnit || "MONTH").trim() || "MONTH",
      cycleCount: Math.max(1, Number(item.cycleCount || 1)),
      priceFen: yuanToFen(item.priceYuan),
      originalPriceFen: yuanToFen(item.originalPriceYuan),
      grantPoints: Math.max(0, Number(item.grantPoints || 0)),
      benefits,
      benefitsText: benefits.join("\n")
    };
  });

export const validatePlanPriceItems = (
  items: PlanPriceFormItem[] = []
): string | null => {
  if (!items.length) return "请至少添加一个价格方案";
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const label = `价格方案 ${i + 1}`;
    if (!String(item.priceCode || "").trim()) {
      return `请填写${label}的价格编码`;
    }
    if (!String(item.cycleUnit || "").trim()) {
      return `请选择${label}的计费周期`;
    }
    if (
      item.priceYuan === "" ||
      item.priceYuan === null ||
      item.priceYuan === undefined ||
      Number.isNaN(Number(item.priceYuan))
    ) {
      return `请填写${label}的售价`;
    }
    if (
      item.grantPoints === "" ||
      item.grantPoints === null ||
      item.grantPoints === undefined ||
      Number.isNaN(Number(item.grantPoints))
    ) {
      return `请填写${label}的赠送积分`;
    }
  }
  return null;
};

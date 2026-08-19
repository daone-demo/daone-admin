export type ModelPriceTable = Record<string, number>;

export type ModelPricingConfig = {
  priceMode?: string;
  models?: Record<string, { priceTable?: ModelPriceTable }>;
  priceTable?: ModelPriceTable;
};

export type ParameterModelOption = {
  label?: string;
  value?: string;
  resolution?: Array<{ label?: string; value?: string } | string>;
};

/** 是否为表格式定价（文生图/视频/画质增强） */
export function hasModelPricingTable(
  pricing: ModelPricingConfig | null | undefined
): boolean {
  if (!pricing || typeof pricing !== "object") return false;
  if (pricing.models && typeof pricing.models === "object") {
    return Object.keys(pricing.models).length > 0;
  }
  if (pricing.priceTable && typeof pricing.priceTable === "object") {
    return Object.keys(pricing.priceTable).length > 0;
  }
  return false;
}

export function cloneModelPricing(
  pricing: ModelPricingConfig | null | undefined
): ModelPricingConfig | null {
  if (!pricing) return null;
  try {
    return JSON.parse(JSON.stringify(pricing)) as ModelPricingConfig;
  } catch {
    return null;
  }
}

function resolveModelLabel(
  modelKey: string,
  parameterModels?: ParameterModelOption[]
): string {
  const matched = (parameterModels || []).find(
    item => String(item?.value || "") === modelKey
  );
  return String(matched?.label || modelKey);
}

function resolveTierLabel(
  modelKey: string,
  tierKey: string,
  parameterModels?: ParameterModelOption[]
): string {
  const matched = (parameterModels || []).find(
    item => String(item?.value || "") === modelKey
  );
  const resolution = matched?.resolution || [];
  for (const item of resolution) {
    if (typeof item === "string") {
      if (item === tierKey) return tierKey;
      continue;
    }
    if (String(item?.value || "") === tierKey) {
      return String(item?.label || tierKey);
    }
  }
  return tierKey;
}

export type PricingEditorGroup = {
  modelKey: string | null;
  title: string;
  rows: Array<{ key: string; label: string; points: number }>;
};

/** 将 pricing 转为可编辑分组列表 */
export function buildPricingEditorGroups(
  pricing: ModelPricingConfig | null | undefined,
  parameterModels?: ParameterModelOption[]
): PricingEditorGroup[] {
  if (!pricing) return [];

  if (pricing.models && typeof pricing.models === "object") {
    return Object.keys(pricing.models).map(modelKey => {
      const table = pricing.models?.[modelKey]?.priceTable || {};
      const keys = Object.keys(table);
      return {
        modelKey,
        title: resolveModelLabel(modelKey, parameterModels),
        rows: keys.map(key => ({
          key,
          label: resolveTierLabel(modelKey, key, parameterModels),
          points: Number(table[key] ?? 0)
        }))
      };
    });
  }

  if (pricing.priceTable && typeof pricing.priceTable === "object") {
    return [
      {
        modelKey: null,
        title: "积分档位",
        rows: Object.keys(pricing.priceTable).map(key => ({
          key,
          label: key,
          points: Number(pricing.priceTable?.[key] ?? 0)
        }))
      }
    ];
  }

  return [];
}

/** 回写某一档位积分，返回新的 pricing */
export function updatePricingPoints(
  pricing: ModelPricingConfig,
  modelKey: string | null,
  tierKey: string,
  points: number
): ModelPricingConfig {
  const next = cloneModelPricing(pricing) || {};
  const value = Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;

  if (modelKey && next.models?.[modelKey]) {
    next.models = {
      ...next.models,
      [modelKey]: {
        ...next.models[modelKey],
        priceTable: {
          ...(next.models[modelKey].priceTable || {}),
          [tierKey]: value
        }
      }
    };
    return next;
  }

  next.priceTable = {
    ...(next.priceTable || {}),
    [tierKey]: value
  };
  return next;
}

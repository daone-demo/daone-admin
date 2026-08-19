export type ModelPriceTable = Record<string, number>;

export type ModelPricingEntry = {
  priceTable?: ModelPriceTable;
  base?: number;
};

export type ModelPricingConfig = {
  priceMode?: string;
  models?: Record<string, ModelPricingEntry>;
  priceTable?: ModelPriceTable;
};

export type ParameterModelOption = {
  label?: string;
  value?: string;
  resolution?: Array<{ label?: string; value?: string } | string>;
};

/** 是否配置了 attributes.pricing.models / priceTable */
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

/** 仅编辑 pricing.models（文生图/视频等按模型定价） */
export function hasPricingModels(
  pricing: ModelPricingConfig | null | undefined
): boolean {
  return Boolean(
    pricing?.models &&
      typeof pricing.models === "object" &&
      Object.keys(pricing.models).length > 0
  );
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
  if (tierKey === "base") return "基础积分";
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

function buildModelEntryRows(
  modelKey: string,
  entry: ModelPricingEntry | undefined,
  parameterModels?: ParameterModelOption[]
): Array<{ key: string; label: string; points: number }> {
  const table = entry?.priceTable;
  if (table && typeof table === "object" && Object.keys(table).length > 0) {
    return Object.keys(table).map(key => ({
      key,
      label: resolveTierLabel(modelKey, key, parameterModels),
      points: Number(table[key] ?? 0)
    }));
  }
  return [
    {
      key: "base",
      label: "基础积分",
      points: Number(entry?.base ?? 0)
    }
  ];
}

/** 将 pricing 转为可编辑分组列表（优先 models） */
export function buildPricingEditorGroups(
  pricing: ModelPricingConfig | null | undefined,
  parameterModels?: ParameterModelOption[]
): PricingEditorGroup[] {
  if (!pricing) return [];

  if (pricing.models && typeof pricing.models === "object") {
    return Object.keys(pricing.models).map(modelKey => ({
      modelKey,
      title: resolveModelLabel(modelKey, parameterModels),
      rows: buildModelEntryRows(
        modelKey,
        pricing.models?.[modelKey],
        parameterModels
      )
    }));
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

/** 回写某一档位积分，返回新的 pricing（保持原有 base / priceTable 结构） */
export function updatePricingPoints(
  pricing: ModelPricingConfig,
  modelKey: string | null,
  tierKey: string,
  points: number
): ModelPricingConfig {
  const next = cloneModelPricing(pricing) || {};
  const value = Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;

  if (modelKey && next.models?.[modelKey]) {
    const prev = next.models[modelKey] || {};
    const hasPriceTable =
      prev.priceTable &&
      typeof prev.priceTable === "object" &&
      Object.keys(prev.priceTable).length > 0;

    if (tierKey === "base" && !hasPriceTable) {
      next.models = {
        ...next.models,
        [modelKey]: {
          ...prev,
          base: value
        }
      };
      return next;
    }

    next.models = {
      ...next.models,
      [modelKey]: {
        ...prev,
        priceTable: {
          ...(prev.priceTable || {}),
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

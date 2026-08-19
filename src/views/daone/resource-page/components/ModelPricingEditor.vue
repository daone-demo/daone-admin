<script setup lang="ts">
import { computed } from "vue";
import {
  buildPricingEditorGroups,
  updatePricingPoints,
  type ModelPricingConfig,
  type ParameterModelOption
} from "../modelPricing";

const props = defineProps<{
  modelValue: ModelPricingConfig | null;
  parameterModels?: ParameterModelOption[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ModelPricingConfig];
}>();

const groups = computed(() =>
  buildPricingEditorGroups(props.modelValue, props.parameterModels)
);

const priceModeLabel = computed(() => {
  const mode = String(props.modelValue?.priceMode || "").toLowerCase();
  if (mode === "video") return "视频定价（单价 × 秒数）";
  if (mode === "image") return "图片定价（按分辨率单价）";
  return "积分定价";
});

const onPointsChange = (
  modelKey: string | null,
  tierKey: string,
  value: number | undefined
) => {
  if (!props.modelValue) return;
  emit(
    "update:modelValue",
    updatePricingPoints(props.modelValue, modelKey, tierKey, Number(value ?? 0))
  );
};
</script>

<template>
  <div v-if="groups.length" class="model-pricing-editor">
    <div class="model-pricing-editor__hint">{{ priceModeLabel }}</div>
    <div
      v-for="group in groups"
      :key="group.modelKey || group.title"
      class="model-pricing-card"
    >
      <div class="model-pricing-card__title">{{ group.title }}</div>
      <div class="model-pricing-grid">
        <div
          v-for="row in group.rows"
          :key="`${group.modelKey || 'root'}-${row.key}`"
          class="model-pricing-row"
        >
          <span class="model-pricing-row__label" :title="row.key">
            {{ row.label }}
          </span>
          <el-input-number
            :model-value="row.points"
            :min="0"
            :step="1"
            :controls="false"
            class="model-pricing-row__input"
            @update:model-value="
              onPointsChange(group.modelKey, row.key, $event)
            "
          />
          <span class="model-pricing-row__unit">积分</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.model-pricing-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.model-pricing-editor__hint {
  font-size: 12px;
  color: #9699a4;
}

.model-pricing-card {
  padding: 12px 14px;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 10px;
}

.model-pricing-card__title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.model-pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
}

.model-pricing-row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.model-pricing-row__label {
  flex: 0 0 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.model-pricing-row__input {
  flex: 1;
  width: auto;
}

.model-pricing-row__unit {
  flex-shrink: 0;
  font-size: 12px;
  color: #9699a4;
}

@media (width <= 640px) {
  .model-pricing-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import type { PlanPriceFormItem } from "../planPriceForm";
import { createEmptyPlanPriceItem } from "../planPriceForm";

const props = defineProps<{
  modelValue: PlanPriceFormItem[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: PlanPriceFormItem[]];
}>();

const updateItem = (
  index: number,
  key: keyof PlanPriceFormItem,
  value: string | number
) => {
  const next = props.modelValue.map((item, i) =>
    i === index ? { ...item, [key]: value } : item
  );
  emit("update:modelValue", next);
};

const addItem = () => {
  emit("update:modelValue", [...props.modelValue, createEmptyPlanPriceItem()]);
};

const removeItem = (index: number) => {
  if (props.modelValue.length <= 1) return;
  emit(
    "update:modelValue",
    props.modelValue.filter((_, i) => i !== index)
  );
};
</script>

<template>
  <div class="plan-prices-editor">
    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="plan-price-card"
    >
      <div class="plan-price-card__head">
        <span class="plan-price-card__title">价格方案 {{ index + 1 }}</span>
        <el-button
          link
          type="danger"
          :disabled="modelValue.length <= 1"
          @click="removeItem(index)"
        >
          删除
        </el-button>
      </div>

      <div class="plan-price-grid">
        <el-form-item
          class="plan-price-grid__full"
          label="套餐权益（每行一项）"
        >
          <el-input
            :model-value="item.benefitsText"
            type="textarea"
            :rows="3"
            placeholder="请输入套餐权益（每行一项）"
            @update:model-value="updateItem(index, 'benefitsText', $event)"
          />
        </el-form-item>

        <el-form-item label="价格编码" required>
          <el-input
            :model-value="item.priceCode"
            placeholder="请输入价格编码"
            @update:model-value="updateItem(index, 'priceCode', $event)"
          />
        </el-form-item>

        <el-form-item label="计费周期" required>
          <el-select
            :model-value="item.cycleUnit"
            class="w-full"
            placeholder="请选择计费周期"
            @update:model-value="updateItem(index, 'cycleUnit', $event)"
          >
            <el-option label="MONTH" value="MONTH" />
            <el-option label="YEAR" value="YEAR" />
          </el-select>
        </el-form-item>

        <!-- <el-form-item label="周期数量">
          <el-input
            :model-value="item.cycleCount"
            type="number"
            placeholder="请输入周期数量"
            @update:model-value="updateItem(index, 'cycleCount', $event)"
          />
        </el-form-item> -->

        <el-form-item label="售价（元）" required>
          <el-input
            :model-value="item.priceYuan"
            type="number"
            placeholder="请输入售价（元）"
            @update:model-value="updateItem(index, 'priceYuan', $event)"
          />
        </el-form-item>

        <el-form-item label="原价（元）">
          <el-input
            :model-value="item.originalPriceYuan"
            type="number"
            placeholder="请输入原价（元）"
            @update:model-value="updateItem(index, 'originalPriceYuan', $event)"
          />
        </el-form-item>

        <el-form-item label="赠送积分" required>
          <el-input
            :model-value="item.grantPoints"
            type="number"
            placeholder="请输入赠送积分"
            @update:model-value="updateItem(index, 'grantPoints', $event)"
          />
        </el-form-item>
      </div>
    </div>

    <el-button class="plan-prices-editor__add" plain @click="addItem">
      添加价格方案
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.plan-prices-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.plan-price-card {
  padding: 12px 14px 4px;
  background: #fafafa;
  border: 1px solid #ebeaf2;
  border-radius: 10px;
}

.plan-price-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.plan-price-card__title {
  font-size: 13px;
  font-weight: 600;
  color: #3a3a45;
}

.plan-price-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}

.plan-price-grid__full {
  grid-column: 1 / -1;
}

.plan-prices-editor__add {
  width: 100%;
}

.w-full {
  width: 100%;
}

@media (width <= 640px) {
  .plan-price-grid {
    grid-template-columns: 1fr;
  }
}
</style>

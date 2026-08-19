<script setup lang="ts">
import type { ResourceConfig } from "../../resourceData";

defineProps<{
  config: ResourceConfig;
  resourceKey: string;
  isContentListResource: boolean;
  categoryOptions: Array<{ label: string; value: string }>;
  categoryOptionsLoading: boolean;
  statusFilterOptions: Array<{ label: string; value: string }>;
  orderPayTypeOptions: Array<{ label: string; value: string }>;
  selectedRowsCount: number;
  allowDelete: boolean;
  paginationTotal: number;
}>();

defineEmits<{ reset: []; "batch-remove": [] }>();

const keyword = defineModel<string>("keyword", { required: true });
const statusFilter = defineModel<string>("statusFilter", { required: true });
const categoryFilter = defineModel<string>("categoryFilter", {
  required: true
});
const payTypeFilter = defineModel<string>("payTypeFilter", { required: true });
const orderDateRange = defineModel<[string, string] | null>("orderDateRange", {
  required: true
});
const userDateRange = defineModel<[string, string] | null>("userDateRange", {
  required: true
});
const modelDateRange = defineModel<[string, string] | null>("modelDateRange", {
  required: true
});
</script>

<template>
  <div class="toolbar">
    <el-input
      v-if="!isContentListResource && config.searchable?.length"
      v-model="keyword"
      clearable
      class="search"
      :placeholder="config.searchPlaceholder || '搜索名称、编号或关键词'"
    >
      <template #prefix>
        <IconifyIconOnline icon="ri:search-line" />
      </template>
    </el-input>
    <el-select
      v-if="isContentListResource"
      v-model="categoryFilter"
      clearable
      placeholder="请选择分类"
      class="search"
      :loading="categoryOptionsLoading"
    >
      <el-option
        v-for="option in categoryOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </el-select>
    <el-select
      v-model="statusFilter"
      clearable
      :placeholder="resourceKey === 'users' ? '会员状态' : '全部状态'"
      class="status-filter"
    >
      <el-option
        v-for="item in statusFilterOptions"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>
    <el-select
      v-if="config.serverFilters && resourceKey === 'orders'"
      v-model="payTypeFilter"
      clearable
      placeholder="支付方式"
      class="pay-type-filter"
    >
      <el-option
        v-for="item in orderPayTypeOptions"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </el-select>
    <el-date-picker
      v-if="config.serverFilters && resourceKey === 'orders'"
      v-model="orderDateRange"
      type="daterange"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      value-format="YYYY-MM-DD"
      class="date-filter"
    />
    <el-date-picker
      v-if="resourceKey === 'users'"
      v-model="userDateRange"
      type="daterange"
      range-separator="至"
      start-placeholder="注册开始日期"
      end-placeholder="注册结束日期"
      value-format="YYYY-MM-DD"
      class="date-filter"
    />
    <el-date-picker
      v-if="resourceKey === 'models'"
      v-model="modelDateRange"
      type="daterange"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      value-format="YYYY-MM-DD"
      class="date-filter"
    />
    <el-button @click="$emit('reset')">
      <IconifyIconOnline icon="ri:refresh-line" />
      重置
    </el-button>
    <el-button
      v-if="isContentListResource && allowDelete"
      type="danger"
      plain
      :disabled="!selectedRowsCount"
      @click="$emit('batch-remove')"
    >
      <IconifyIconOnline icon="ri:delete-bin-line" />
      批量删除
      <span v-if="selectedRowsCount">({{ selectedRowsCount }})</span>
    </el-button>
    <div class="record-count">共 {{ paginationTotal }} 条</div>
  </div>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.search {
  width: 310px;
}

.status-filter,
.pay-type-filter {
  width: 150px;
}

.date-filter {
  width: 260px;
}

.record-count {
  margin-left: auto;
  font-size: 13px;
  color: #9699a4;
}

@media (width <= 760px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .search,
  .status-filter,
  .pay-type-filter,
  .date-filter {
    width: 100%;
  }
}
</style>

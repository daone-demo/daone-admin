<script setup lang="ts">
import type { ResourceConfig } from "../../resourceData";

defineProps<{
  config: ResourceConfig;
  resourceKey: string;
  paginatedRecords: Array<Record<string, any>>;
  loading: boolean;
  isContentListResource: boolean;
  isTreeMode: boolean;
  isTableFullWidth: boolean;
  currentPage: number;
  pageSize: number;
  pageSizes: number[];
  paginationLayout: string;
  paginationTotal: number;
  filteredRecordsCount: number;
  useServerPagination: boolean;
  categoryLabelMap: Record<string, string>;
  formatCategoryLevel: (row: Record<string, any>) => string;
  formatMaterialType: (value: string) => string;
  statusType: (value: string) => any;
  isVideoCoverUrl: (url: string) => boolean;
  isDateTimeField: (key: string) => boolean;
  formatDateTime: (value: unknown) => string;
  setTableRef: (table: any) => void;
}>();

const emit = defineEmits<{
  "update:currentPage": [value: number];
  "update:pageSize": [value: number];
  "selection-change": [rows: Array<Record<string, any>>];
  "open-detail": [row: Record<string, any>];
  "open-editor": [row: Record<string, any>];
  "open-points": [row: Record<string, any>];
  "toggle-status": [row: Record<string, any>];
  "review-approve": [row: Record<string, any>];
  "review-reject": [row: Record<string, any>];
  remove: [row: Record<string, any>];
}>();
</script>

<template>
  <el-table
    :ref="setTableRef"
    v-loading="loading"
    :data="paginatedRecords"
    row-key="id"
    class="resource-table"
    :class="{ 'resource-table--full': isTableFullWidth }"
    :style="isTableFullWidth ? { width: '100%' } : undefined"
    :tree-props="
      isTreeMode
        ? { children: 'children', hasChildren: 'hasChildren' }
        : undefined
    "
    :default-expand-all="isTreeMode"
    @selection-change="emit('selection-change', $event)"
  >
    <el-table-column
      v-if="isContentListResource && config.allowDelete !== false"
      type="selection"
      width="48"
      fixed="left"
    />
    <el-table-column
      v-for="column in config.columns"
      :key="column.key"
      :label="column.label"
      :prop="column.key"
      :width="isTableFullWidth ? undefined : column.width"
      :min-width="
        isTableFullWidth
          ? column.minWidth || 160
          : column.width
            ? undefined
            : 130
      "
    >
      <template #default="{ row }">
        <div
          v-if="
            [
              'name',
              'title',
              'nickname',
              'modelName',
              'planName',
              'invoiceTitle',
              'contactName'
            ].includes(column.key)
          "
          class="primary-cell"
        >
          <div
            class="cell-avatar"
            :style="{
              background: config.color + '18',
              color: config.color
            }"
          >
            {{ String(row[column.key] || "?").slice(0, 1) }}
          </div>
          <div>
            <b>{{ row[column.key] }}</b>
            <small>{{ row.id }}</small>
          </div>
        </div>
        <el-tag
          v-else-if="column.key === 'status' || column.key === 'memberStatus'"
          round
          effect="light"
          :type="statusType(row[column.key])"
        >
          {{ row[column.key] }}
        </el-tag>
        <span
          v-else-if="
            ['amount', 'price', 'amountYuan', 'priceYuan'].includes(column.key)
          "
          class="money"
        >
          ¥{{ Number(row[column.key] || 0).toLocaleString() }}
        </span>
        <div
          v-else-if="column.key === 'priceSummary' && resourceKey === 'plans'"
          class="plan-price-cell"
        >
          <div
            v-for="(item, index) in row.priceItems || []"
            :key="`${item.priceCode}-${index}`"
            class="plan-price-item"
          >
            <span class="money">{{ item.priceText }}</span>
            <small v-if="item.originalText" class="plan-original-price">
              {{ item.originalText }}
            </small>
            <small v-if="item.priceCode" class="plan-price-code">
              {{ item.priceCode }}
            </small>
          </div>
          <span v-if="!(row.priceItems || []).length">-</span>
        </div>
        <div
          v-else-if="column.key === 'benefitSummary' && resourceKey === 'plans'"
          class="plan-benefits-cell"
        >
          <el-tag
            v-for="(benefit, index) in row.benefitList || []"
            :key="`${benefit}-${index}`"
            size="small"
            effect="plain"
            round
          >
            {{ benefit }}
          </el-tag>
          <span v-if="!(row.benefitList || []).length">-</span>
        </div>
        <span
          v-else-if="column.key === 'description'"
          class="plan-description"
          :title="row.description"
        >
          {{ row.description || "-" }}
        </span>
        <span
          v-else-if="
            ['points', 'grantPoints', 'bonusPoints'].includes(column.key)
          "
        >
          {{ Number(row[column.key] || 0).toLocaleString() }}
        </span>
        <span v-else-if="column.key === 'level'">
          {{ formatCategoryLevel(row) }}
        </span>
        <span v-else-if="column.key === 'type'">
          {{ formatMaterialType(row.type) }}
        </span>
        <div
          v-else-if="column.key === 'coverUrl' && row.coverUrl"
          class="media-cell"
        >
          <img
            v-if="!isVideoCoverUrl(row.coverUrl)"
            :src="row.coverUrl"
            alt="封面"
            class="media-thumb"
          />
          <video v-else :src="row.coverUrl" class="media-thumb" muted />
        </div>
        <div
          v-else-if="
            column.key === 'resourceUrl' &&
            row.resourceUrl &&
            row.type === 'IMAGE'
          "
          class="media-cell"
        >
          <img :src="row.resourceUrl" alt="素材" class="material-media" />
        </div>
        <video
          v-else-if="
            column.key === 'resourceUrl' &&
            row.resourceUrl &&
            row.type === 'VIDEO'
          "
          :src="row.resourceUrl"
          class="material-media"
          muted
          controls
        />
        <span
          v-else-if="column.key === 'resourceUrl'"
          class="resource-url"
          :title="row.resourceUrl"
        >
          {{ row.resourceUrl }}
        </span>
        <span v-else-if="column.key === 'categoryName'">
          {{
            row.categoryName ||
            categoryLabelMap[row.categoryCode] ||
            row.categoryCode ||
            "-"
          }}
        </span>
        <span v-else-if="column.key === 'categoryCode'">
          {{ categoryLabelMap[row.categoryCode] || row.categoryCode }}
        </span>
        <span v-else-if="isDateTimeField(column.key)">
          {{ formatDateTime(row[column.key]) }}
        </span>
        <span v-else>{{ row[column.key] }}</span>
      </template>
    </el-table-column>
    <el-table-column
      label="操作"
      class-name="action-column"
      :fixed="isTableFullWidth ? false : 'right'"
      :width="
        isTableFullWidth
          ? undefined
          : resourceKey === 'trialApplications'
            ? 260
            : 230
      "
      :min-width="isTableFullWidth ? 220 : undefined"
      align="right"
    >
      <template #default="{ row }">
        <div class="table-actions">
          <el-button link type="primary" @click="emit('open-detail', row)">
            详情
          </el-button>
          <el-button
            v-if="resourceKey === 'users'"
            link
            type="primary"
            @click="emit('open-points', row)"
          >
            调整积分
          </el-button>
          <template v-else-if="resourceKey === 'trialApplications'">
            <el-button
              v-if="row.statusRaw === 'PENDING'"
              link
              type="success"
              @click="emit('review-approve', row)"
            >
              审核通过
            </el-button>
            <el-button
              v-if="row.statusRaw === 'PENDING'"
              link
              type="danger"
              @click="emit('review-reject', row)"
            >
              拒绝
            </el-button>
          </template>
          <template
            v-else-if="resourceKey !== 'orders' && resourceKey !== 'invoices'"
          >
            <el-button link type="primary" @click="emit('open-editor', row)">
              编辑
            </el-button>
            <el-dropdown
              v-if="
                config.allowStatus &&
                (row.status === '启用' || row.status === '停用')
              "
              trigger="click"
            >
              <el-button link type="primary">更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="emit('toggle-status', row)">
                    {{ row.status === "启用" ? "停用" : "启用" }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="config.allowDelete !== false"
                    divided
                    @click="emit('remove', row)"
                  >
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              v-else-if="config.allowDelete !== false"
              link
              type="danger"
              @click="emit('remove', row)"
            >
              删除
            </el-button>
          </template>
        </div>
      </template>
    </el-table-column>
    <template #empty>
      <el-empty description="暂无匹配数据" />
    </template>
  </el-table>

  <div v-if="!isTreeMode || useServerPagination" class="table-pagination">
    <el-pagination
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :layout="paginationLayout"
      :total="paginationTotal"
      background
      @update:current-page="emit('update:currentPage', $event)"
      @update:page-size="emit('update:pageSize', $event)"
    />
  </div>
  <div v-else class="table-pagination tree-record-count">
    共 {{ filteredRecordsCount }} 条（含二级分类）
  </div>
</template>

<style scoped lang="scss">
.resource-table {
  :deep(.el-table__header th) {
    height: 48px;
    color: #696c78;
    background: #faf9fc;
  }

  :deep(.el-table__row td) {
    height: 62px;
  }

  :deep(td.action-column .cell) {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
}

.table-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 0;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;

  :deep(.el-button) {
    height: 28px;
    padding: 0 8px;
    margin: 0;
    line-height: 28px;
  }

  :deep(.el-dropdown) {
    display: inline-flex;
    align-items: center;
  }
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.tree-record-count {
  font-size: 13px;
  color: #9699a4;
}

.resource-table--full {
  width: 100%;

  :deep(table) {
    width: 100% !important;
    table-layout: fixed;
  }

  :deep(.el-table__header),
  :deep(.el-table__body),
  :deep(.el-table__header-wrapper),
  :deep(.el-table__body-wrapper) {
    width: 100% !important;
  }

  :deep(.el-table__header th:last-child),
  :deep(.el-table__body td:last-child) {
    padding-right: 16px;
  }
}

.primary-cell {
  display: flex;
  gap: 10px;
  align-items: center;

  b,
  small {
    display: block;
  }

  small {
    margin-top: 3px;
    font-size: 11px;
    color: #9b9da6;
  }
}

.cell-avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  font-weight: 700;
  border-radius: 10px;
}

.money {
  font-weight: 700;
  color: #2d3436;
}

.plan-description {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.5;
  color: #5f6472;
}

.plan-price-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-price-item {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.plan-original-price {
  color: #a0a3ad;
  text-decoration: line-through;
}

.plan-price-code {
  padding: 1px 6px;
  font-size: 11px;
  color: #7a7d8b;
  background: #f4f3f8;
  border-radius: 999px;
}

.plan-benefits-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.media-cell {
  display: flex;
  align-items: center;

  .media-thumb {
    width: 56px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
  }
}

.material-media {
  width: 100px;
  height: 100px;
  object-fit: cover;
  background: #f5f5f7;
  border-radius: 6px;
}

.resource-url {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #7a7d8b;
  white-space: nowrap;
}
</style>

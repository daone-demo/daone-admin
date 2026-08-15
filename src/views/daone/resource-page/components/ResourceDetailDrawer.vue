<script setup lang="ts">
import type { ResourceConfig } from "../../resourceData";

defineProps<{
  current: Record<string, any>;
  detailColumns: Array<{ key: string; label: string }>;
  resourceKey: string;
  config: ResourceConfig;
  userProjects: Array<Record<string, any>>;
  userProjectsLoading: boolean;
  userProjectsPage: number;
  userProjectsPageSize: number;
  userProjectsTotal: number;
  formatDateTime: (value: unknown) => string;
  isDateTimeField: (key: string) => boolean;
  statusType: (value: string) => any;
}>();

const visible = defineModel<boolean>("visible", { required: true });

defineEmits<{
  "open-canvas": [project: Record<string, any>];
  "update:userProjectsPage": [page: number];
}>();
</script>

<template>
  <el-drawer v-model="visible" title="详情信息" size="480px">
    <div class="detail-head">
      <div
        class="detail-icon"
        :style="{ background: config.color, color: '#fff' }"
      >
        <IconifyIconOnline :icon="config.icon" />
      </div>
      <div>
        <h3>
          {{ current.planName || current.name || current.title || current.id }}
        </h3>
        <p>{{ current.id }}</p>
      </div>
    </div>
    <el-descriptions :column="1" border>
      <el-descriptions-item
        v-for="column in detailColumns"
        :key="column.key"
        :label="column.label"
      >
        {{
          isDateTimeField(column.key)
            ? formatDateTime(current[column.key])
            : current[column.key]
        }}
      </el-descriptions-item>
    </el-descriptions>
    <div v-if="resourceKey === 'plans'" class="detail-section">
      <h4>计费方案</h4>
      <div v-if="(current.priceItems || []).length" class="plan-detail-prices">
        <div
          v-for="(item, index) in current.priceItems"
          :key="`${item.priceCode}-${index}`"
          class="plan-price-detail"
        >
          <div class="plan-price-detail-main">
            <span class="money">{{ item.priceText }}</span>
            <small v-if="item.originalText" class="plan-original-price">
              原价 {{ item.originalText }}
            </small>
          </div>
          <div class="plan-price-detail-meta">
            <span v-if="item.priceCode">编码 {{ item.priceCode }}</span>
            <span>
              赠送 {{ Number(item.grantPoints || 0).toLocaleString() }} 积分
            </span>
            <el-tag
              size="small"
              effect="light"
              round
              :type="statusType(item.status)"
            >
              {{ item.status }}
            </el-tag>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无计费方案" :image-size="64" />
      <h4>套餐权益</h4>
      <div v-if="(current.benefitList || []).length" class="plan-benefits-cell">
        <el-tag
          v-for="(benefit, index) in current.benefitList"
          :key="`${benefit}-${index}`"
          size="small"
          effect="plain"
          round
        >
          {{ benefit }}
        </el-tag>
      </div>
      <el-empty v-else description="暂无权益说明" :image-size="64" />
    </div>
    <div v-if="resourceKey === 'users'" class="detail-section">
      <h4>最近项目</h4>
      <div v-loading="userProjectsLoading" class="project-list">
        <el-empty
          v-if="!userProjectsLoading && !userProjects.length"
          description="暂无项目"
        />
        <div
          v-for="project in userProjects"
          :key="project.id"
          class="project-row project-row--clickable"
          @click="$emit('open-canvas', project)"
        >
          <IconifyIconOnline icon="ri:folder-5-line" />
          <span>{{ project.title }}</span>
          <small>
            {{
              project.updatedAt ? formatDateTime(project.updatedAt) : "最近编辑"
            }}
          </small>
        </div>
        <el-pagination
          v-if="userProjectsTotal > userProjectsPageSize"
          :current-page="userProjectsPage"
          :page-size="userProjectsPageSize"
          :total="userProjectsTotal"
          layout="prev, pager, next"
          small
          background
          class="project-pagination"
          @update:current-page="$emit('update:userProjectsPage', $event)"
        />
      </div>
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
.detail-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 58px;
  height: 58px;
  font-size: 26px;
  border-radius: 17px;
}

.detail-head {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 4px 0 22px;

  h3,
  p {
    margin: 0;
  }

  p {
    margin-top: 4px;
    color: #9295a0;
  }
}

.detail-section {
  margin-top: 26px;

  h4 {
    margin: 0 0 12px;
    font-size: 14px;
    color: #1f2430;
  }
}

.money {
  font-weight: 700;
  color: #2d3436;
}

.plan-detail-prices {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}

.plan-price-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: #faf9fc;
  border: 1px solid #efeef5;
  border-radius: 12px;
}

.plan-price-detail-main,
.plan-price-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.plan-original-price {
  color: #a0a3ad;
  text-decoration: line-through;
}

.plan-price-detail-meta {
  margin-top: 2px;
  font-size: 12px;
  color: #7a7d8b;
}

.plan-benefits-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.project-list {
  min-height: 80px;
}

.project-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 13px 0;
  border-bottom: 1px solid #f0eef5;

  small {
    margin-left: auto;
    color: #a0a2aa;
  }
}

.project-row--clickable {
  padding: 13px 8px;
  margin: 0 -8px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s ease;

  &:hover {
    background: #f5f3ff;
  }
}

.project-pagination {
  justify-content: center;
  margin-top: 12px;
}
</style>

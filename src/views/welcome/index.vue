<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  adminApi,
  type DashboardQuickEntry,
  type DashboardResponse,
  type DashboardTrendPoint
} from "@/api/admin";
import { useUserStoreHook } from "@/store/modules/user";

defineOptions({ name: "Welcome" });

const router = useRouter();
const userStore = useUserStoreHook();
const period = ref("近 7 天");
const loading = ref(false);
const dashboardData = ref<DashboardResponse | null>(null);

const metricMeta = [
  {
    key: "totalUsers",
    label: "累计用户",
    icon: "ri:user-3-line",
    color: "#6c5ce7",
    format: (value: number) => value.toLocaleString("zh-CN")
  },
  {
    key: "todayOrders",
    label: "今日订单",
    icon: "ri:shopping-bag-3-line",
    color: "#0984e3",
    format: (value: number) => value.toLocaleString("zh-CN")
  },
  {
    key: "todayRevenue",
    label: "今日流水",
    icon: "ri:money-cny-circle-line",
    color: "#00b894",
    format: (value: number) =>
      `¥${(value / 100).toLocaleString("zh-CN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })}`
  },
  {
    key: "todayAiCalls",
    label: "AI 调用量",
    icon: "ri:sparkling-2-line",
    color: "#e17055",
    format: (value: number) => value.toLocaleString("zh-CN")
  }
] as const;

const defaultShortcuts: DashboardQuickEntry[] = [
  {
    title: "用户管理",
    subtitle: "查看用户与积分",
    icon: "ri:user-3-line",
    color: "#6c5ce7",
    path: "/users/list"
  },
  {
    title: "套餐配置",
    subtitle: "价格与会员权益",
    icon: "ri:vip-crown-line",
    color: "#fdcb6e",
    path: "/plans/list"
  },
  {
    title: "模型管理",
    subtitle: "模型成本与状态",
    icon: "ri:brain-line",
    color: "#e17055",
    path: "/models/list"
  },
  {
    title: "内容运营",
    subtitle: "灵感与分类管理",
    icon: "ri:gallery-line",
    color: "#e84393",
    path: "/content/inspirations"
  }
];

const isMetricItem = (value: unknown): value is { value?: number } =>
  typeof value === "object" && value !== null && "value" in value;

const pickMetricValue = (
  overview: DashboardResponse["overview"],
  key: (typeof metricMeta)[number]["key"],
  fallback = 0
) => {
  const overviewValue = overview?.[key];
  if (isMetricItem(overviewValue)) {
    return Number(overviewValue.value ?? fallback);
  }
  if (overviewValue !== undefined && overviewValue !== null) {
    return Number(overviewValue);
  }

  if (key === "totalUsers") {
    return Number(dashboardData.value?.totalUsers ?? fallback);
  }

  if (key === "todayAiCalls") {
    const calls = overview?.todayCalls;
    if (isMetricItem(calls)) return Number(calls.value ?? fallback);
    return Number(calls ?? fallback);
  }

  return fallback;
};

const pickMetricChange = (
  overview: DashboardResponse["overview"],
  key: (typeof metricMeta)[number]["key"]
) => {
  const overviewValue = overview?.[key];
  if (isMetricItem(overviewValue)) {
    return Number(
      overviewValue.change ??
        overviewValue.growth ??
        overviewValue.dayOnDay ??
        0
    );
  }

  const changeKeyMap: Record<string, string[]> = {
    totalUsers: ["totalUsersChange", "totalUsersGrowth", "totalUsersDayOnDay"],
    todayOrders: [
      "todayOrdersChange",
      "todayOrdersGrowth",
      "todayOrdersDayOnDay"
    ],
    todayRevenue: [
      "todayRevenueChange",
      "todayRevenueGrowth",
      "todayRevenueDayOnDay"
    ],
    todayAiCalls: [
      "todayAiCallsChange",
      "todayAiCallsGrowth",
      "todayCallsChange",
      "todayCallsGrowth"
    ]
  };

  for (const changeKey of changeKeyMap[key] || []) {
    const change = overview?.[changeKey];
    if (change !== undefined && change !== null) {
      return Number(change);
    }
  }

  return 0;
};

const formatChange = (change: number) => {
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change.toFixed(1)}%`;
};

const metrics = computed(() => {
  const overview = dashboardData.value?.overview;
  return metricMeta.map(item => {
    const rawValue = pickMetricValue(overview, item.key);
    const change = pickMetricChange(overview, item.key);
    return {
      ...item,
      value: item.format(rawValue),
      change: formatChange(change),
      changePositive: change >= 0
    };
  });
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
});

const displayName = computed(
  () => userStore.nickname || userStore.username || "运营管理员"
);

const normalizeQuickEntries = (
  quickEntries: DashboardResponse["quickEntries"]
) => {
  if (!quickEntries) return defaultShortcuts;
  if (Array.isArray(quickEntries)) {
    return quickEntries.length ? quickEntries : defaultShortcuts;
  }
  const items = Object.values(quickEntries).filter(item => item?.title);
  return items.length ? items : defaultShortcuts;
};

const shortcuts = computed(() =>
  normalizeQuickEntries(dashboardData.value?.quickEntries)
);

const formatTrendLabel = (point: DashboardTrendPoint) => {
  const [year, month, day] = point.date.split("-").map(Number);
  if (year && month && day) {
    return `${month}/${day}`;
  }
  return point.date;
};

const trendBars = computed(() => {
  const trends = dashboardData.value?.trends;
  if (!Array.isArray(trends) || !trends.length) {
    return [];
  }

  const days = period.value === "近 7 天" ? 7 : 30;
  const points = trends.slice(-days);

  const normalized = points.map(point => {
    const newUsers = Number(point.newUsers ?? 0);
    const orders = Number(point.orders ?? 0);
    return {
      label: formatTrendLabel(point),
      newUsers,
      orders
    };
  });

  const maxValue = Math.max(
    ...normalized.flatMap(item => [item.newUsers, item.orders]),
    1
  );

  return normalized.map(item => ({
    label: item.label,
    newUsers: item.newUsers,
    orders: item.orders,
    newUsersHeight: Math.max((item.newUsers / maxValue) * 100, 8),
    ordersHeight: Math.max((item.orders / maxValue) * 100, 8)
  }));
});

const fetchDashboard = async () => {
  loading.value = true;
  try {
    dashboardData.value = await adminApi.dashboard();
  } catch (error: any) {
    ElMessage.warning(error?.message || "首页数据加载失败");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDashboard();
});
</script>

<template>
  <div v-loading="loading" class="dashboard">
    <section class="welcome-card">
      <div>
        <span class="eyebrow">DAONE OPERATIONS CENTER</span>
        <h1>{{ greeting }}，{{ displayName }}</h1>
        <p>整体业务运行稳定，以下是今日运营概览。</p>
      </div>
      <div class="welcome-orb">
        <IconifyIconOnline icon="ri:sparkling-2-fill" />
      </div>
    </section>

    <section class="metric-grid">
      <article v-for="item in metrics" :key="item.label" class="metric-card">
        <div
          class="metric-icon"
          :style="{ color: item.color, background: item.color + '14' }"
        >
          <IconifyIconOnline :icon="item.icon" />
        </div>
        <div>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>
            <b :class="{ negative: !item.changePositive }">{{ item.change }}</b>
            较昨日
          </small>
        </div>
      </article>
    </section>

    <section class="main-grid">
      <article class="panel trend-panel">
        <div class="panel-head">
          <div>
            <h2>业务趋势</h2>
            <p>订单与用户增长概览</p>
          </div>
          <el-segmented v-model="period" :options="['近 7 天', '近 30 天']" />
        </div>
        <div v-if="trendBars.length" class="chart">
          <div class="chart-grid" />
          <div
            v-for="(item, index) in trendBars"
            :key="`${item.label}-${index}`"
            class="bar-group"
          >
            <el-tooltip
              :content="`${item.label} 订单量：${item.orders}`"
              placement="top"
              :show-after="80"
            >
              <div class="bar-wrap">
                <div
                  class="bar secondary"
                  :style="{ height: item.ordersHeight * 0.72 + '%' }"
                />
              </div>
            </el-tooltip>
            <el-tooltip
              :content="`${item.label} 新增用户：${item.newUsers}`"
              placement="top"
              :show-after="80"
            >
              <div class="bar-wrap">
                <div
                  class="bar primary"
                  :style="{ height: item.newUsersHeight + '%' }"
                />
              </div>
            </el-tooltip>
            <span>{{ item.label }}</span>
          </div>
        </div>
        <div v-else class="chart-empty">暂无趋势数据</div>
        <div class="legend">
          <i class="purple" /> 新增用户 <i class="blue" /> 订单量
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>快捷入口</h2>
          <p>常用运营功能</p>
        </div>
      </div>
      <div class="shortcut-grid">
        <button
          v-for="item in shortcuts"
          :key="item.title"
          @click="item.path && router.push(item.path)"
        >
          <span
            :style="{
              color: item.color || '#6c5ce7',
              background: (item.color || '#6c5ce7') + '14'
            }"
          >
            <IconifyIconOnline :icon="item.icon || 'ri:arrow-right-line'" />
          </span>
          <b>{{ item.title }}</b>
          <small>{{ item.subtitle }}</small>
          <IconifyIconOnline class="arrow" icon="ri:arrow-right-s-line" />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  min-height: 100%;
  color: #242631;
}

.welcome-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 160px;
  padding: 30px 34px;
  overflow: hidden;
  color: #fff;
  background: #000;
  border-radius: 20px;
  box-shadow: 0 18px 45px rgb(0 0 0 / 18%);
}

.eyebrow {
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.2em;
}

.welcome-card h1 {
  margin: 8px 0;
  font-size: 27px;
  color: #fff;
}

.welcome-card p {
  margin: 0;
  color: #fff;
}

.welcome-orb {
  display: grid;
  place-items: center;
  width: 90px;
  height: 90px;
  font-size: 42px;
  background: rgb(255 255 255 / 12%);
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 30px;
  transform: rotate(8deg);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 16px 0;
}

.metric-card {
  display: flex;
  gap: 15px;
  align-items: center;
  padding: 20px;
  background: #fff;
  border: 1px solid #ecebf2;
  border-radius: 16px;
}

.metric-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  font-size: 23px;
  border-radius: 14px;
}

.metric-card span,
.metric-card strong,
.metric-card small {
  display: block;
}

.metric-card span {
  color: #888b97;
}

.metric-card strong {
  margin: 5px 0;
  font-size: 23px;
}

.metric-card small {
  color: #a0a2aa;
}

.metric-card small b {
  color: #00a878;
}

.metric-card small b.negative {
  color: #e17055;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.panel {
  padding: 22px;
  background: #fff;
  border: 1px solid #ecebf2;
  border-radius: 17px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-head h2,
.panel-head p {
  margin: 0;
}

.panel-head h2 {
  font-size: 17px;
}

.panel-head p {
  margin-top: 5px;
  font-size: 12px;
  color: #999ba5;
}

.chart {
  position: relative;
  display: flex;
  gap: 25px;
  align-items: flex-end;
  height: 238px;
  padding: 28px 20px;
}

.chart-empty {
  display: grid;
  place-items: center;
  height: 238px;
  font-size: 13px;
  color: #a0a2aa;
}

.chart-grid {
  position: absolute;
  inset: 28px 0;
  background: repeating-linear-gradient(
    to bottom,
    #f0eef5 0 1px,
    transparent 1px 44px
  );
}

.bar-group {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  gap: 5px;
  align-items: flex-end;
  height: 100%;
}

.bar-group :deep(.el-tooltip__trigger) {
  display: flex;
  flex: 1;
  align-items: flex-end;
  height: 100%;
}

.bar-wrap {
  display: flex;
  flex: 1;
  align-items: flex-end;
  width: 100%;
  height: 100%;
}

.bar {
  width: 100%;
  min-height: 10px;
  cursor: pointer;
  border-radius: 6px 6px 2px 2px;
  transition: opacity 0.15s ease;
}

.bar:hover {
  opacity: 0.85;
}

.bar.primary {
  background: linear-gradient(#705be0, #9c8af3);
}

.bar.secondary {
  background: linear-gradient(#52aef5, #9bd5ff);
}

.bar-group span {
  position: absolute;
  bottom: -23px;
  left: 50%;
  font-size: 11px;
  color: #a0a2aa;
  white-space: nowrap;
  transform: translateX(-50%);
}

.legend {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #8d8f99;
}

.legend i {
  width: 8px;
  height: 8px;
  margin-left: 10px;
  border-radius: 50%;
}

.legend .purple {
  background: #705be0;
}

.legend .blue {
  background: #52aef5;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.shortcut-grid button {
  position: relative;
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 2px 12px;
  align-items: center;
  padding: 15px;
  text-align: left;
  cursor: pointer;
  background: #fbfafc;
  border: 1px solid #eeedf3;
  border-radius: 13px;
  transition: 0.2s;
}

.shortcut-grid button:hover {
  border-color: #cfc8f8;
  box-shadow: 0 8px 20px rgb(49 40 94 / 8%);
  transform: translateY(-2px);
}

.shortcut-grid button > span {
  display: grid;
  grid-row: 1 / 3;
  place-items: center;
  width: 42px;
  height: 42px;
  font-size: 20px;
  border-radius: 12px;
}

.shortcut-grid small {
  color: #999ba5;
}

.arrow {
  position: absolute;
  top: 50%;
  right: 10px;
  color: #aaa;
  transform: translateY(-50%);
}

@media (width <= 980px) {
  .metric-grid,
  .shortcut-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (width <= 600px) {
  .metric-grid,
  .shortcut-grid {
    grid-template-columns: 1fr;
  }

  .welcome-orb {
    display: none;
  }
}
</style>

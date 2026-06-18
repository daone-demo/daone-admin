<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "Welcome" });

const router = useRouter();
const period = ref("近 7 天");
const metrics = [
  {
    label: "累计用户",
    value: "12,680",
    change: "+12.5%",
    icon: "ri:user-3-line",
    color: "#6c5ce7"
  },
  {
    label: "今日订单",
    value: "286",
    change: "+8.2%",
    icon: "ri:shopping-bag-3-line",
    color: "#0984e3"
  },
  {
    label: "今日流水",
    value: "¥86,420",
    change: "+18.7%",
    icon: "ri:money-cny-circle-line",
    color: "#00b894"
  },
  {
    label: "AI 调用量",
    value: "5,139",
    change: "+6.4%",
    icon: "ri:sparkling-2-line",
    color: "#e17055"
  }
];

const shortcuts = [
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

const bars = computed(() =>
  period.value === "近 7 天"
    ? [42, 58, 49, 71, 65, 86, 78]
    : [32, 45, 38, 56, 48, 62, 70]
);
</script>

<template>
  <div class="dashboard">
    <section class="welcome-card">
      <div>
        <span class="eyebrow">DAONE OPERATIONS CENTER</span>
        <h1>下午好，运营管理员</h1>
        <p>今天有 18 个待处理事项，整体业务运行稳定。</p>
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
          <small
            ><b>{{ item.change }}</b> 较昨日</small
          >
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
        <div class="chart">
          <div class="chart-grid" />
          <div v-for="(height, index) in bars" :key="index" class="bar-group">
            <div
              class="bar secondary"
              :style="{ height: height * 0.72 + '%' }"
            />
            <div class="bar primary" :style="{ height: height + '%' }" />
            <span>{{
              ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index]
            }}</span>
          </div>
        </div>
        <div class="legend">
          <i class="purple" /> 新增用户 <i class="blue" /> 订单量
        </div>
      </article>

      <article class="panel todo-panel">
        <div class="panel-head">
          <div>
            <h2>待办事项</h2>
            <p>需要你关注的运营任务</p>
          </div>
          <el-tag round type="danger">18</el-tag>
        </div>
        <div class="todo-list">
          <div class="todo-item">
            <div class="todo-icon orange">
              <IconifyIconOnline icon="ri:bill-line" />
            </div>
            <div><b>待处理开票申请</b><span>6 笔申请等待审核</span></div>
            <el-button
              link
              type="primary"
              @click="router.push('/invoices/list')"
              >处理</el-button
            >
          </div>
          <div class="todo-item">
            <div class="todo-icon purple">
              <IconifyIconOnline icon="ri:flow-chart" />
            </div>
            <div><b>工作流待发布</b><span>4 个草稿等待上线</span></div>
            <el-button
              link
              type="primary"
              @click="router.push('/workflows/list')"
              >查看</el-button
            >
          </div>
          <div class="todo-item">
            <div class="todo-icon blue">
              <IconifyIconOnline icon="ri:customer-service-2-line" />
            </div>
            <div><b>用户异常反馈</b><span>8 条反馈需要跟进</span></div>
            <el-button link type="primary" @click="router.push('/users/list')"
              >查看</el-button
            >
          </div>
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
          @click="router.push(item.path)"
        >
          <span :style="{ color: item.color, background: item.color + '14' }">
            <IconifyIconOnline :icon="item.icon" />
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
  background:
    radial-gradient(circle at 82% 20%, rgb(255 255 255 / 18%), transparent 26%),
    linear-gradient(125deg, #5f4bd8, #8370ee);
  border-radius: 20px;
  box-shadow: 0 18px 45px rgb(91 70 205 / 22%);
}

.eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2em;
  opacity: 0.72;
}

.welcome-card h1 {
  margin: 8px 0;
  font-size: 27px;
}

.welcome-card p {
  margin: 0;
  opacity: 0.78;
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

.main-grid {
  display: grid;
  grid-template-columns: 1.65fr 1fr;
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

.bar {
  width: 50%;
  min-height: 10px;
  border-radius: 6px 6px 2px 2px;
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

.todo-list {
  margin-top: 12px;
}

.todo-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 17px 0;
  border-bottom: 1px solid #f0eef4;
}

.todo-item:last-child {
  border: 0;
}

.todo-item div:nth-child(2) {
  flex: 1;
}

.todo-item b,
.todo-item span {
  display: block;
}

.todo-item span {
  margin-top: 4px;
  font-size: 12px;
  color: #999ba5;
}

.todo-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
}

.todo-icon.orange {
  color: #e17055;
  background: #fff0eb;
}

.todo-icon.purple {
  color: #6c5ce7;
  background: #f0edff;
}

.todo-icon.blue {
  color: #0984e3;
  background: #eaf6ff;
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

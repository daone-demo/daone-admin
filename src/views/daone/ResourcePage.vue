<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { resourceConfigs, type ResourceField } from "./resourceData";
import { adminApi } from "@/api/admin";
import { getToken } from "@/utils/auth";

defineOptions({ name: "DaoneResourcePage" });

const route = useRoute();
const resourceKey = computed(() => String((route.meta as any).resource || ""));
const config = computed(() => resourceConfigs[resourceKey.value]);
const keyword = ref("");
const statusFilter = ref("");
const dialogVisible = ref(false);
const detailVisible = ref(false);
const pointsVisible = ref(false);
const editingId = ref("");
const current = ref<Record<string, any>>({});
const form = reactive<Record<string, any>>({});
const records = ref<Array<Record<string, any>>>([]);
const loading = ref(false);
const apiState = ref<"connected" | "demo" | "unavailable">("demo");
const apiError = ref("");

const hasAdminToken = () => Boolean(getToken()?.accessToken);

const resetRecords = () => {
  records.value = config.value?.records.map(item => ({ ...item })) || [];
  keyword.value = "";
  statusFilter.value = "";
};

const normalizeList = (payload: any) =>
  Array.isArray(payload) ? payload : payload?.items || payload?.records || [];

const normalizeRemoteRows = (items: any[]) => {
  if (resourceKey.value === "users") {
    return items.map(item => ({
      ...item,
      id: String(item.id),
      status: item.status === "ENABLED" ? "启用" : "停用"
    }));
  }
  if (resourceKey.value === "orders") {
    return items.map(item => ({
      ...item,
      id: item.orderNo,
      amountYuan: Number(item.amountFen || 0) / 100
    }));
  }
  if (resourceKey.value === "plans") {
    return items.map(plan => ({
      ...plan,
      id: plan.id || plan.planCode,
      benefitsText: (plan.benefits || []).join("\n"),
      pricesText: JSON.stringify(plan.prices || [], null, 2),
      priceSummary: (plan.prices || [])
        .map(
          (price: any) =>
            `${price.priceCode} · ¥${Number(price.priceFen || 0) / 100}/${price.cycleCount || 1}${price.cycleUnit || "MONTH"}`
        )
        .join("；"),
      benefitSummary: (plan.benefits || []).join("；"),
      status: plan.status === "ENABLED" ? "启用" : "停用"
    }));
  }
  if (resourceKey.value === "models") {
    return items.map(item => ({
      ...item,
      id: item.id || item.modelCode,
      countMin: item.parameters?.count?.min ?? 1,
      countMax: item.parameters?.count?.max ?? 1,
      status: item.status === "ENABLED" ? "启用" : "停用"
    }));
  }
  return items.map(item => ({
    ...item,
    id: item.id || item.code,
    status: item.status === "DISABLED" ? "停用" : "启用"
  }));
};

const loadRemote = async () => {
  resetRecords();
  apiError.value = "";
  if (!config.value?.apiResource || !hasAdminToken()) {
    apiState.value = config.value?.apiResource ? "demo" : "unavailable";
    return;
  }
  loading.value = true;
  try {
    let payload: any;
    if (config.value.apiResource === "users")
      payload = await adminApi.users({ page: 1, pageSize: 100 });
    if (config.value.apiResource === "orders")
      payload = await adminApi.orders({ page: 1, pageSize: 100 });
    if (config.value.apiResource === "plans") payload = await adminApi.plans();
    if (config.value.apiResource === "models")
      payload = await adminApi.models();
    if (config.value.apiResource === "prompts")
      payload = await adminApi.promptTemplates();
    if (config.value.apiResource === "inspirations")
      payload = await adminApi.inspirations();
    records.value = normalizeRemoteRows(normalizeList(payload));
    apiState.value = "connected";
  } catch (error: any) {
    apiState.value = "demo";
    apiError.value = error?.message || "管理接口暂不可用";
    ElMessage.warning(`${apiError.value}，当前展示接口字段示例`);
  } finally {
    loading.value = false;
  }
};

watch(resourceKey, loadRemote, { immediate: true });

const filteredRecords = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  return records.value.filter(item => {
    const matchesWord =
      !word ||
      (config.value.searchable || []).some(key =>
        String(item[key] ?? "")
          .toLowerCase()
          .includes(word)
      );
    return (
      matchesWord && (!statusFilter.value || item.status === statusFilter.value)
    );
  });
});

const statuses = computed(() => [
  ...new Set(records.value.map(item => item.status).filter(Boolean))
]);

const activeCount = computed(
  () =>
    records.value.filter(item =>
      ["启用", "已支付", "已开票", "PAID", "ENABLED"].includes(item.status)
    ).length
);

const openEditor = (row?: Record<string, any>) => {
  editingId.value = row?.id || "";
  current.value = row || {};
  Object.keys(form).forEach(key => delete form[key]);
  config.value.fields.forEach(field => {
    form[field.key] = row?.[field.key] ?? (field.type === "number" ? 0 : "");
  });
  dialogVisible.value = true;
};

const toApiPayload = () => {
  if (resourceKey.value === "plans") {
    let prices: any[];
    try {
      prices = JSON.parse(String(form.pricesText || "[]"));
      if (!Array.isArray(prices) || prices.length === 0) throw new Error();
    } catch {
      throw new Error("价格配置必须是至少包含一项的 JSON 数组");
    }
    return {
      planCode: form.planCode,
      planName: form.planName,
      benefits: String(form.benefitsText || "")
        .split("\n")
        .filter(Boolean),
      prices: prices.map(price => ({
        priceCode: String(price.priceCode || ""),
        cycleUnit: String(price.cycleUnit || "MONTH"),
        cycleCount: Number(price.cycleCount || 1),
        priceFen: Number(price.priceFen || 0),
        originalPriceFen: Number(price.originalPriceFen || 0),
        grantPoints: Number(price.grantPoints || 0)
      }))
    };
  }
  if (resourceKey.value === "models") {
    return {
      basePoints: Number(form.basePoints || 0),
      parameters: {
        count: {
          min: Number(form.countMin || 1),
          max: Number(form.countMax || 1)
        }
      }
    };
  }
  if (resourceKey.value === "prompts") {
    return {
      code: form.code,
      name: form.name,
      scenario: form.scenario,
      content: form.content
    };
  }
  if (resourceKey.value === "inspirations") {
    return {
      title: form.title,
      categoryCode: form.categoryCode,
      coverUrl: form.coverUrl,
      prompt: form.prompt
    };
  }
  return { ...form };
};

const save = async () => {
  const missing = config.value.fields.find(
    field => field.required && !String(form[field.key] ?? "").trim()
  );
  if (missing) {
    ElMessage.warning(`请填写${missing.label}`);
    return;
  }
  if (config.value.apiResource) {
    if (!hasAdminToken()) {
      ElMessage.error("当前没有有效登录凭证，请重新登录后操作");
      return;
    }
    loading.value = true;
    try {
      const payload = toApiPayload();
      if (resourceKey.value === "plans") {
        editingId.value
          ? await adminApi.updatePlan(String(form.planCode), payload)
          : await adminApi.createPlan(payload);
      }
      if (resourceKey.value === "models")
        await adminApi.updateModel(String(current.value.modelCode), payload);
      if (resourceKey.value === "prompts") {
        editingId.value
          ? await adminApi.updatePromptTemplate(String(form.code), payload)
          : await adminApi.createPromptTemplate(payload);
      }
      if (resourceKey.value === "inspirations") {
        editingId.value
          ? await adminApi.updateInspiration(editingId.value, payload)
          : await adminApi.createInspiration(payload);
      }
      await loadRemote();
      dialogVisible.value = false;
      ElMessage.success(editingId.value ? "接口保存成功" : "接口创建成功");
      return;
    } catch (error: any) {
      ElMessage.error(error?.message || "接口保存失败");
      return;
    } finally {
      loading.value = false;
    }
  }
  if (editingId.value) {
    const index = records.value.findIndex(item => item.id === editingId.value);
    if (index >= 0) records.value[index] = { ...records.value[index], ...form };
  } else {
    records.value.unshift({
      id: `${resourceKey.value.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`,
      ...form,
      status: "启用",
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false })
    });
  }
  dialogVisible.value = false;
  ElMessage.success(editingId.value ? "保存成功" : "创建成功");
};

const remove = async (row: Record<string, any>) => {
  await ElMessageBox.confirm(
    `确定删除“${row.name || row.title || row.id}”吗？`,
    "删除确认",
    {
      type: "warning"
    }
  );
  records.value = records.value.filter(item => item.id !== row.id);
  ElMessage.success("删除成功");
};

const toggleStatus = async (row: Record<string, any>) => {
  const next = row.status === "启用" ? "停用" : "启用";
  if (config.value.apiResource) {
    if (!hasAdminToken()) return ElMessage.error("请重新登录后操作");
    const apiStatus = next === "启用" ? "ENABLED" : "DISABLED";
    try {
      if (resourceKey.value === "users")
        await adminApi.updateUserStatus(String(row.id), apiStatus);
      if (resourceKey.value === "plans")
        await adminApi.updatePlanStatus(String(row.planCode), apiStatus);
      if (resourceKey.value === "models")
        await adminApi.updateModelStatus(String(row.modelCode), apiStatus);
    } catch (error: any) {
      ElMessage.error(error?.message || "状态更新失败");
      return;
    }
  }
  row.status = next;
  ElMessage.success(`已${row.status}`);
};

const openDetail = (row: Record<string, any>) => {
  current.value = row;
  detailVisible.value = true;
};

const openPoints = (row: Record<string, any>) => {
  current.value = row;
  form.adjustAmount = 1000;
  form.adjustReason = "运营活动赠送";
  pointsVisible.value = true;
};

const adjustPoints = async () => {
  if (config.value.apiResource) {
    if (!hasAdminToken()) return ElMessage.error("请重新登录后操作");
    try {
      await adminApi.adjustUserPoints(
        String(current.value.id),
        Number(form.adjustAmount || 0),
        String(form.adjustReason || "")
      );
    } catch (error: any) {
      ElMessage.error(error?.message || "积分调整失败");
      return;
    }
  }
  current.value.points =
    Number(current.value.points || 0) + Number(form.adjustAmount || 0);
  pointsVisible.value = false;
  ElMessage.success("积分调整成功，流水已记录");
};

const handleInvoice = (row: Record<string, any>) => {
  row.status = row.status === "待开票" ? "开票中" : "已开票";
  ElMessage.success(row.status === "开票中" ? "已进入开票流程" : "已完成开票");
};

const statusType = (value: string) => {
  if (["启用", "已支付", "已开票", "PAID", "ENABLED"].includes(value))
    return "success";
  if (["待支付", "待开票", "PENDING", "PAYING"].includes(value))
    return "warning";
  if (["停用", "已取消"].includes(value)) return "danger";
  return "primary";
};

const inputType = (field: ResourceField) =>
  field.type === "textarea"
    ? "textarea"
    : field.type === "number"
      ? "number"
      : "text";
</script>

<template>
  <div v-if="config" class="daone-page">
    <section class="page-hero" :style="{ '--accent': config.color }">
      <div class="hero-icon">
        <IconifyIconOnline :icon="config.icon" />
      </div>
      <div class="hero-copy">
        <div class="eyebrow">DAONE OPERATIONS</div>
        <h1>{{ config.title }}</h1>
        <p>{{ config.description }}</p>
        <div class="endpoint-line">
          <el-tag size="small" effect="plain">{{ config.endpoint }}</el-tag>
          <span v-if="apiState === 'connected'" class="api-state online"
            >实时接口</span
          >
          <span
            v-else-if="apiState === 'demo'"
            class="api-state"
            :title="apiError"
          >
            {{ apiError ? "接口异常 · 示例数据" : "接口字段演示" }}
          </span>
          <span v-else class="api-state pending">接口待建设</span>
        </div>
      </div>
      <el-button
        v-if="config.fields.length && config.allowCreate !== false"
        class="create-button"
        type="primary"
        @click="openEditor()"
      >
        <IconifyIconOnline icon="ri:add-line" />
        {{ config.createText || "新增记录" }}
      </el-button>
    </section>

    <section class="metric-grid">
      <div class="metric-card">
        <span>全部记录</span>
        <strong>{{ records.length }}</strong>
        <small>当前管理范围</small>
      </div>
      <div class="metric-card">
        <span>正常 / 已完成</span>
        <strong>{{ activeCount }}</strong>
        <small>运行状态良好</small>
      </div>
      <div class="metric-card">
        <span>今日更新</span>
        <strong>{{ Math.min(records.length, 3) }}</strong>
        <small>较昨日保持稳定</small>
      </div>
    </section>

    <section class="table-card">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          clearable
          class="search"
          placeholder="搜索名称、编号或关键词"
        >
          <template #prefix>
            <IconifyIconOnline icon="ri:search-line" />
          </template>
        </el-input>
        <el-select
          v-model="statusFilter"
          clearable
          placeholder="全部状态"
          class="status-filter"
        >
          <el-option
            v-for="item in statuses"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
        <el-button @click="loadRemote">
          <IconifyIconOnline icon="ri:refresh-line" />
          重置
        </el-button>
        <div class="record-count">共 {{ filteredRecords.length }} 条</div>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredRecords"
        row-key="id"
        class="resource-table"
      >
        <el-table-column
          v-for="column in config.columns"
          :key="column.key"
          :label="column.label"
          :prop="column.key"
          :width="column.width"
          :min-width="column.width ? undefined : 130"
        >
          <template #default="{ row }">
            <div
              v-if="
                ['name', 'title', 'nickname', 'modelName', 'planName'].includes(
                  column.key
                )
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
              v-else-if="column.key === 'status'"
              round
              effect="light"
              :type="statusType(row[column.key])"
            >
              {{ row[column.key] }}
            </el-tag>
            <span
              v-else-if="
                ['amount', 'price', 'amountYuan', 'priceYuan'].includes(
                  column.key
                )
              "
              class="money"
            >
              ¥{{ Number(row[column.key] || 0).toLocaleString() }}
            </span>
            <span v-else-if="column.key === 'points'">
              {{ Number(row[column.key] || 0).toLocaleString() }}
            </span>
            <span v-else>{{ row[column.key] }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="230">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)"
              >详情</el-button
            >
            <el-button
              v-if="resourceKey === 'users'"
              link
              type="primary"
              @click="openPoints(row)"
            >
              调整积分
            </el-button>
            <el-button
              v-else-if="resourceKey === 'invoices'"
              link
              type="primary"
              @click="handleInvoice(row)"
            >
              {{ row.status === "待开票" ? "去开票" : "更新状态" }}
            </el-button>
            <template v-else-if="resourceKey !== 'orders'">
              <el-button link type="primary" @click="openEditor(row)"
                >编辑</el-button
              >
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
                    <el-dropdown-item @click="toggleStatus(row)">
                      {{ row.status === "启用" ? "停用" : "启用" }}
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="config.allowDelete !== false"
                      divided
                      @click="remove(row)"
                      >删除</el-dropdown-item
                    >
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                v-else-if="config.allowDelete !== false"
                link
                type="danger"
                @click="remove(row)"
                >删除</el-button
              >
            </template>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无匹配数据" />
        </template>
      </el-table>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="
        editingId
          ? `编辑${config.title.replace('管理', '')}`
          : config.createText || '新增记录'
      "
      width="560px"
    >
      <el-form label-position="top">
        <el-form-item
          v-for="field in config.fields"
          :key="field.key"
          :label="field.label"
          :required="field.required"
        >
          <el-select
            v-if="field.type === 'select'"
            v-model="form[field.key]"
            class="w-full"
            :placeholder="`请选择${field.label}`"
          >
            <el-option
              v-for="option in field.options"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
          <el-input
            v-else
            v-model="form[field.key]"
            :type="inputType(field)"
            :rows="4"
            :placeholder="`请输入${field.label}`"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="详情信息" size="480px">
      <div class="detail-head">
        <div
          class="detail-icon"
          :style="{ background: config.color, color: '#fff' }"
        >
          <IconifyIconOnline :icon="config.icon" />
        </div>
        <div>
          <h3>{{ current.name || current.title || current.id }}</h3>
          <p>{{ current.id }}</p>
        </div>
      </div>
      <el-descriptions :column="1" border>
        <el-descriptions-item
          v-for="column in config.columns"
          :key="column.key"
          :label="column.label"
        >
          {{ current[column.key] }}
        </el-descriptions-item>
      </el-descriptions>
      <div v-if="resourceKey === 'users'" class="detail-section">
        <h4>最近项目</h4>
        <div
          v-for="name in ['品牌春季上新', '电商主图批量设计', '产品发布会海报']"
          :key="name"
          class="project-row"
        >
          <IconifyIconOnline icon="ri:folder-5-line" />
          <span>{{ name }}</span>
          <small>最近编辑</small>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="pointsVisible" title="调整用户积分" width="460px">
      <el-alert
        :title="`当前可用积分：${Number(current.points || 0).toLocaleString()}`"
        type="info"
        :closable="false"
      />
      <el-form label-position="top" class="points-form">
        <el-form-item label="调整数量（正数增加，负数扣减）">
          <el-input-number
            v-model="form.adjustAmount"
            :step="100"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="form.adjustReason" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pointsVisible = false">取消</el-button>
        <el-button type="primary" @click="adjustPoints">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.daone-page {
  min-height: 100%;
  color: #1f2430;
}

.page-hero {
  position: relative;
  display: flex;
  gap: 18px;
  align-items: center;
  min-height: 138px;
  padding: 26px 30px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 88% 10%,
      color-mix(in srgb, var(--accent) 18%, transparent),
      transparent 34%
    ),
    linear-gradient(135deg, #fff 0%, #fbfaff 100%);
  border: 1px solid #ebeaf2;
  border-radius: 18px;
  box-shadow: 0 10px 36px rgb(34 31 52 / 5%);
}

.hero-icon,
.detail-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 58px;
  height: 58px;
  font-size: 26px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 17px;
}

.hero-copy {
  flex: 1;
}

.eyebrow {
  margin-bottom: 5px;
  font-size: 10px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 0.18em;
}

h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.25;
}

.hero-copy p {
  margin: 7px 0 0;
  color: #7a7d8b;
}

.endpoint-line {
  display: flex;
  gap: 9px;
  align-items: center;
  margin-top: 10px;
}

.api-state {
  font-size: 11px;
  color: #8d8f99;
}

.api-state.online {
  color: #00a878;
}

.api-state.pending {
  color: #e17055;
}

.create-button {
  height: 42px;
  padding: 0 18px;
  border: 0;
  border-radius: 11px;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 25%, transparent);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 16px 0;
}

.metric-card {
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #ebeaf2;
  border-radius: 14px;
}

.metric-card span,
.metric-card small {
  display: block;
  color: #8a8d99;
}

.metric-card strong {
  display: block;
  margin: 8px 0 4px;
  font-size: 25px;
}

.table-card {
  padding: 18px;
  background: #fff;
  border: 1px solid #ebeaf2;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgb(34 31 52 / 4%);
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.search {
  width: 310px;
}

.status-filter {
  width: 150px;
}

.record-count {
  margin-left: auto;
  font-size: 13px;
  color: #9699a4;
}

.resource-table :deep(.el-table__header th) {
  height: 48px;
  color: #696c78;
  background: #faf9fc;
}

.resource-table :deep(.el-table__row td) {
  height: 62px;
}

.primary-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.primary-cell b,
.primary-cell small {
  display: block;
}

.primary-cell small {
  margin-top: 3px;
  font-size: 11px;
  color: #9b9da6;
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

.detail-head {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 4px 0 22px;
}

.detail-head h3,
.detail-head p {
  margin: 0;
}

.detail-head p {
  margin-top: 4px;
  color: #9295a0;
}

.detail-section {
  margin-top: 26px;
}

.project-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 13px 0;
  border-bottom: 1px solid #f0eef5;
}

.project-row small {
  margin-left: auto;
  color: #a0a2aa;
}

.points-form {
  margin-top: 18px;
}

@media (width <= 760px) {
  .page-hero {
    align-items: flex-start;
    padding: 20px;
  }

  .hero-icon {
    display: none;
  }

  .create-button {
    position: absolute;
    right: 18px;
    bottom: 18px;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-wrap: wrap;
  }

  .search {
    width: 100%;
  }
}
</style>

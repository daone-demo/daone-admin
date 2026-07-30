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
const apiError = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const PAGE_SIZES = [10, 20, 50, 100];

const hasAdminToken = () => Boolean(getToken()?.accessToken);
const shouldUseApi = () =>
  Boolean(config.value?.apiResource) && hasAdminToken();

const orderPayTypeLabels: Record<string, string> = {
  WECHAT: "微信",
  ALIPAY: "支付宝",
  BALANCE: "余额"
};

const orderStatusLabels: Record<string, string> = {
  PAID: "已支付",
  PENDING: "待支付",
  PAYING: "支付中",
  CANCELLED: "已取消",
  CANCELED: "已取消",
  REFUNDED: "已退款"
};

const formatOrderPayType = (value: string) =>
  orderPayTypeLabels[String(value || "").toUpperCase()] || value;

const formatOrderStatus = (value: string) =>
  orderStatusLabels[String(value || "").toUpperCase()] || value;

const resetRecords = () => {
  records.value = config.value?.records.map(item => ({ ...item })) || [];
  keyword.value = "";
  statusFilter.value = "";
  currentPage.value = 1;
};

const normalizeList = (payload: any) =>
  Array.isArray(payload) ? payload : payload?.items || payload?.records || [];

const fetchPaginatedResource = async (
  fetcher: (params: { page: number; pageSize: number }) => Promise<any>
) => {
  const batchSize = 100;
  let page = 1;
  const all: any[] = [];

  while (true) {
    const payload = await fetcher({ page, pageSize: batchSize });
    const items = normalizeList(payload);
    all.push(...items);
    const total = Number(payload?.total ?? all.length);
    if (!items.length || items.length < batchSize || all.length >= total) break;
    page += 1;
    if (page > 100) break;
  }

  return all;
};

const normalizeRemoteRows = (items: any[]) => {
  const normalizeStatus = (value: string) =>
    value === "DISABLED" ? "停用" : value === "ENABLED" ? "启用" : value;

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
      amountYuan: Number(item.amountFen || 0) / 100,
      payType: formatOrderPayType(item.payType),
      status: formatOrderStatus(item.status)
    }));
  }
  if (resourceKey.value === "invoices") {
    return items.map(item => ({
      ...item,
      id: item.id || item.invoiceId,
      amountYuan: Number(item.amountFen || 0) / 100
    }));
  }
  if (resourceKey.value === "plans") {
    return items.map(plan => ({
      ...plan,
      id: plan.id || plan.planCode,
      benefitsText: (plan.benefits || []).join("\n"),
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
  if (resourceKey.value === "pointPackages") {
    return items.map(item => ({
      ...item,
      id: String(item.id),
      grantPoints: Number(item.grantPoints || 0),
      bonusPoints: Number(item.bonusPoints || 0),
      priceYuan: Number(item.priceFen || 0) / 100,
      status: normalizeStatus(item.status)
    }));
  }
  if (resourceKey.value === "workflows") {
    return items.map(item => ({
      ...item,
      id: item.id || item.workflowId,
      workflowDataText: JSON.stringify(item.workflowData || {}, null, 2),
      nodeCount: item.nodeCount ?? Object.keys(item.workflowData || {}).length,
      status: normalizeStatus(item.status)
    }));
  }
  if (resourceKey.value === "categories") {
    return items.map(item => ({
      ...item,
      id: item.id || item.categoryCode,
      status: normalizeStatus(item.status)
    }));
  }
  return items.map(item => ({
    ...item,
    id: item.id || item.code,
    status: normalizeStatus(item.status || "ENABLED")
  }));
};

const loadRemote = async () => {
  resetRecords();
  apiError.value = "";
  if (!shouldUseApi()) {
    return;
  }
  loading.value = true;
  try {
    let items: any[] = [];
    const apiResource = config.value.apiResource;
    if (apiResource === "workflows") {
      items = await fetchPaginatedResource(params =>
        adminApi.workflows(params)
      );
    } else if (apiResource === "users") {
      items = await fetchPaginatedResource(params => adminApi.users(params));
    } else if (apiResource === "invoices") {
      items = await fetchPaginatedResource(params => adminApi.invoices(params));
    } else if (apiResource === "orders") {
      items = await fetchPaginatedResource(params => adminApi.orders(params));
    } else if (apiResource === "plans") {
      items = normalizeList(await adminApi.plans());
    } else if (apiResource === "pointPackages") {
      items = normalizeList(await adminApi.pointPackages());
    } else if (apiResource === "models") {
      items = normalizeList(await adminApi.models());
    } else if (apiResource === "prompts") {
      items = normalizeList(await adminApi.promptTemplates());
    } else if (apiResource === "inspirations") {
      items = normalizeList(await adminApi.inspirations());
    } else if (apiResource === "categories") {
      items = normalizeList(await adminApi.categories());
    }
    records.value = normalizeRemoteRows(items);
  } catch (error: any) {
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

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRecords.value.slice(start, start + pageSize.value);
});

watch([keyword, statusFilter], () => {
  currentPage.value = 1;
});

const statuses = computed(() => [
  ...new Set(records.value.map(item => item.status).filter(Boolean))
]);

const editorFields = computed(() => {
  const fields = config.value?.fields || [];
  if (editingId.value) {
    return fields.filter(field => !field.createOnly);
  }
  return fields;
});

const isTableFullWidth = computed(() => Boolean(config.value?.tableFullWidth));

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
    const mapPlanPrices = (prices: any[]) =>
      (prices || []).map(price => ({
        priceCode: String(price.priceCode || ""),
        cycleUnit: String(price.cycleUnit || "MONTH"),
        cycleCount: Number(price.cycleCount || 1),
        priceFen: Number(price.priceFen || 0),
        originalPriceFen: Number(price.originalPriceFen || 0),
        grantPoints: Number(price.grantPoints || 0)
      }));

    return {
      planCode: form.planCode,
      planName: form.planName,
      benefits: String(form.benefitsText || "")
        .split("\n")
        .filter(Boolean),
      prices: mapPlanPrices(editingId.value ? current.value?.prices || [] : [])
    };
  }
  if (resourceKey.value === "models") {
    const parameters =
      form.countMin || form.countMax
        ? {
            count: {
              min: Number(form.countMin || 1),
              max: Number(form.countMax || 1)
            }
          }
        : {};
    const payload = {
      basePoints: Number(form.basePoints || 0),
      parameters
    };
    if (!editingId.value) {
      return {
        attributes: {},
        modelName: String(form.modelName || "").trim(),
        modelCode: String(form.modelCode || "").trim(),
        taskType: String(form.taskType || "IMAGE"),
        status: "ENABLED",
        ...payload
      };
    }
    return payload;
  }
  if (resourceKey.value === "pointPackages") {
    return {
      packageCode: String(form.packageCode || "").trim(),
      packageName: String(form.packageName || "").trim(),
      grantPoints: Number(form.grantPoints || 0),
      bonusPoints: Number(form.bonusPoints || 0),
      priceFen: Math.round(Number(form.priceYuan || 0) * 100),
      sortOrder: Number(form.sortOrder || 0),
      ...(!editingId.value ? { status: "ENABLED" } : {})
    };
  }
  if (resourceKey.value === "workflows") {
    let workflowData: Record<string, any>;
    try {
      workflowData = JSON.parse(String(form.workflowDataText || "{}"));
    } catch {
      throw new Error("工作流 JSON 格式不正确");
    }
    return {
      name: form.name,
      description: form.description,
      categoryCode: form.categoryCode,
      categoryName: form.categoryName,
      workflowData
    };
  }
  if (resourceKey.value === "categories") {
    return {
      categoryCode: form.categoryCode,
      categoryName: form.categoryName,
      scope: form.scope || "ALL",
      sortNo: Number(form.sortNo || 0)
    };
  }
  if (resourceKey.value === "invoices") {
    return {
      userId: form.userId,
      orderNo: form.orderNo,
      invoiceTitle: form.invoiceTitle,
      taxNo: form.taxNo,
      invoiceType: form.invoiceType || "VAT_NORMAL",
      amountFen: Number(form.amountFen || 0)
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
  const missing = editorFields.value.find(
    field => field.required && !String(form[field.key] ?? "").trim()
  );
  if (missing) {
    ElMessage.warning(`请填写${missing.label}`);
    return;
  }
  if (config.value.apiResource && shouldUseApi()) {
    loading.value = true;
    try {
      const payload = toApiPayload();
      if (resourceKey.value === "workflows") {
        editingId.value
          ? await adminApi.updateWorkflow(editingId.value, payload)
          : await adminApi.createWorkflow(payload);
      }
      if (resourceKey.value === "plans") {
        editingId.value
          ? await adminApi.updatePlan(String(form.planCode), payload)
          : await adminApi.createPlan(payload);
      }
      if (resourceKey.value === "pointPackages") {
        editingId.value
          ? await adminApi.updatePointPackage(String(editingId.value), payload)
          : await adminApi.createPointPackage(payload);
      }
      if (resourceKey.value === "models") {
        editingId.value
          ? await adminApi.updateModel(String(current.value.modelCode), payload)
          : await adminApi.createModel(payload);
      }
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
      if (resourceKey.value === "categories") {
        editingId.value
          ? await adminApi.updateCategory(String(form.categoryCode), payload)
          : await adminApi.createCategory(payload);
      }
      if (resourceKey.value === "invoices") {
        editingId.value
          ? await adminApi.updateInvoice(editingId.value, payload)
          : await adminApi.createInvoice(payload);
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
  if (config.value.apiResource && shouldUseApi()) {
    try {
      if (resourceKey.value === "workflows")
        await adminApi.deleteWorkflow(String(row.id));
      if (resourceKey.value === "categories")
        await adminApi.deleteCategory(String(row.categoryCode));
      if (resourceKey.value === "pointPackages")
        await adminApi.deletePointPackage(String(row.id));
      await loadRemote();
      ElMessage.success("删除成功");
      return;
    } catch (error: any) {
      ElMessage.error(error?.message || "删除失败");
      return;
    }
  }
  records.value = records.value.filter(item => item.id !== row.id);
  ElMessage.success("删除成功");
};

const toggleStatus = async (row: Record<string, any>) => {
  const next = row.status === "启用" ? "停用" : "启用";
  if (config.value.apiResource && shouldUseApi()) {
    const apiStatus = next === "启用" ? "ENABLED" : "DISABLED";
    try {
      if (resourceKey.value === "users")
        await adminApi.updateUserStatus(String(row.id), apiStatus);
      if (resourceKey.value === "plans")
        await adminApi.updatePlanStatus(String(row.planCode), apiStatus);
      if (resourceKey.value === "models")
        await adminApi.updateModelStatus(String(row.modelCode), apiStatus);
      if (resourceKey.value === "prompts")
        await adminApi.updatePromptTemplateStatus(String(row.code), apiStatus);
      if (resourceKey.value === "inspirations")
        await adminApi.updateInspirationStatus(String(row.id), apiStatus);
      if (resourceKey.value === "categories")
        await adminApi.updateCategoryStatus(
          String(row.categoryCode),
          apiStatus
        );
      if (resourceKey.value === "workflows")
        await adminApi.updateWorkflowStatus(String(row.id), apiStatus);
      if (resourceKey.value === "pointPackages")
        await adminApi.updatePointPackageStatus(String(row.id), apiStatus);
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
  if (config.value.apiResource && shouldUseApi()) {
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

const statusType = (value: string) => {
  if (["启用", "已支付", "已开票", "PAID", "ENABLED", "ISSUED"].includes(value))
    return "success";
  if (["待支付", "待开票", "PENDING", "PAYING", "PROCESSING"].includes(value))
    return "warning";
  if (["停用", "已取消", "REJECTED", "CANCELED", "CANCELLED"].includes(value))
    return "danger";
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
        :data="paginatedRecords"
        row-key="id"
        class="resource-table"
        :class="{ 'resource-table--full': isTableFullWidth }"
        :style="isTableFullWidth ? { width: '100%' } : undefined"
      >
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
                  'categoryName',
                  'invoiceTitle'
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
            <span
              v-else-if="
                ['points', 'grantPoints', 'bonusPoints'].includes(column.key)
              "
            >
              {{ Number(row[column.key] || 0).toLocaleString() }}
            </span>
            <span v-else>{{ row[column.key] }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          :fixed="isTableFullWidth ? false : 'right'"
          :width="isTableFullWidth ? undefined : 230"
          :min-width="isTableFullWidth ? 220 : undefined"
          align="right"
        >
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
            <template
              v-else-if="resourceKey !== 'orders' && resourceKey !== 'invoices'"
            >
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

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="PAGE_SIZES"
          :total="filteredRecords.length"
          background
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
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
          v-for="field in editorFields"
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
  width: 100%;
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
  width: 100%;
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

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
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

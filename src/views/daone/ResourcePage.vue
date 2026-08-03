<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { watchDebounced } from "@vueuse/core";
import { resourceConfigs, type ResourceField } from "./resourceData";
import { adminApi } from "@/api/admin";
import { getToken } from "@/utils/auth";
import {
  formatDateTime,
  formatRecordDates,
  isDateTimeField
} from "@/utils/date";

defineOptions({ name: "DaoneResourcePage" });

type CategoryTreeLinkMode = "parentCode" | "parentId";

const getCategoryNodeKey = (linkMode: CategoryTreeLinkMode) =>
  linkMode === "parentId" ? "id" : "categoryCode";

const buildCategoryTree = (
  items: Array<Record<string, any>>,
  linkMode: CategoryTreeLinkMode = "parentCode"
) => {
  const nodeKey = getCategoryNodeKey(linkMode);
  const map = new Map<string, Record<string, any>>();
  const roots: Array<Record<string, any>> = [];

  items.forEach(item => {
    map.set(String(item[nodeKey]), { ...item, children: [] });
  });

  items.forEach(item => {
    const key = String(item[nodeKey]);
    const node = map.get(key);
    if (!node) return;
    const parentValue = String(item[linkMode] ?? "").trim();
    if (parentValue && map.has(parentValue)) {
      map.get(parentValue)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: Array<Record<string, any>>) => {
    nodes.sort((a, b) => Number(a.sortNo || 0) - Number(b.sortNo || 0));
    nodes.forEach(node => {
      if (node.children?.length) {
        sortNodes(node.children);
      } else {
        delete node.children;
      }
    });
  };
  sortNodes(roots);
  return roots;
};

const filterCategoriesWithParents = (
  items: Array<Record<string, any>>,
  predicate: (item: Record<string, any>) => boolean,
  linkMode: CategoryTreeLinkMode = "parentCode"
) => {
  const nodeKey = getCategoryNodeKey(linkMode);
  const codeToItem = new Map(items.map(item => [String(item[nodeKey]), item]));
  const matched = new Set<string>();

  items.forEach(item => {
    if (!predicate(item)) return;
    matched.add(String(item[nodeKey]));
    let parentValue = String(item[linkMode] ?? "").trim();
    while (parentValue && codeToItem.has(parentValue)) {
      matched.add(parentValue);
      parentValue = String(
        codeToItem.get(parentValue)?.[linkMode] ?? ""
      ).trim();
    }
  });

  return items.filter(item => matched.has(String(item[nodeKey])));
};

const flattenMaterialCategoryTree = (
  nodes: Array<Record<string, any>>,
  parentId: string | number | null = null
): Array<Record<string, any>> => {
  const result: Array<Record<string, any>> = [];
  (nodes || []).forEach(node => {
    const { children = [], ...rest } = node;
    const normalizedParentId = rest.parentId ?? parentId ?? "";
    result.push({
      ...rest,
      parentId:
        normalizedParentId === null || normalizedParentId === undefined
          ? ""
          : normalizedParentId
    });
    if (children.length) {
      result.push(...flattenMaterialCategoryTree(children, rest.id));
    }
  });
  return result;
};

const buildCategorySelectOptions = (items: Array<Record<string, any>>) => {
  const idToName = new Map(
    items.map(item => [
      String(item.id || item.categoryCode),
      String(item.categoryName)
    ])
  );

  return [...items]
    .sort((a, b) => {
      const aParent = String(a.parentId || "").trim();
      const bParent = String(b.parentId || "").trim();
      if (aParent !== bParent) return aParent.localeCompare(bParent);
      return Number(a.sortNo || 0) - Number(b.sortNo || 0);
    })
    .map(item => {
      const parentId = String(item.parentId || "").trim();
      const parentName = parentId ? idToName.get(parentId) : "";
      const label = parentName
        ? `${parentName} / ${item.categoryName}`
        : String(item.categoryName);
      return {
        label,
        value: String(item.categoryCode || item.id)
      };
    });
};

const normalizeCategoryItems = (items: Array<Record<string, any>>) =>
  items.map(item => ({
    ...item,
    id: String(item.id || item.categoryCode || ""),
    categoryCode: String(item.categoryCode || item.code || item.id || ""),
    categoryName: String(
      item.categoryName || item.name || item.categoryCode || ""
    ),
    parentId:
      item.parentId === null ||
      item.parentId === undefined ||
      item.parentId === ""
        ? ""
        : String(item.parentId),
    scope: String(item.scope || "ALL"),
    status: String(item.status || "ENABLED"),
    sortNo: Number(item.sortNo || 0),
    level: Number(item.level ?? 1)
  }));

const normalizeMaterialCategoryItems = (items: Array<Record<string, any>>) =>
  items.map(item => ({
    ...item,
    id: String(item.id || ""),
    categoryCode: String(item.categoryCode || ""),
    categoryName: String(item.categoryName || item.categoryCode || ""),
    parentId:
      item.parentId === null ||
      item.parentId === undefined ||
      item.parentId === ""
        ? ""
        : String(item.parentId),
    status: String(item.status || "ENABLED"),
    sortNo: Number(item.sortNo || 0)
  }));

const isCategoryEnabled = (item: Record<string, any>) =>
  ["ENABLED", "启用"].includes(String(item.status || ""));

const isRelevantCategoryScope = (
  item: Record<string, any>,
  categoryScope?: "INSPIRATION" | "MATERIAL"
) => {
  const scope = String(item.scope || "");
  if (categoryScope === "MATERIAL") {
    return ["ALL", "MATERIAL"].includes(scope);
  }
  if (categoryScope === "INSPIRATION") {
    return ["ALL", "INSPIRATION"].includes(scope);
  }
  return true;
};

const route = useRoute();
const resourceKey = computed(() => String((route.meta as any).resource || ""));
const config = computed(() => resourceConfigs[resourceKey.value]);
const isContentListResource = computed(() =>
  ["inspirations", "materials"].includes(resourceKey.value)
);
const isMaterialResource = computed(() => resourceKey.value === "materials");
const isCategoryResource = computed(() =>
  ["categories", "materialCategories"].includes(resourceKey.value)
);
const isMaterialCategoryResource = computed(
  () => resourceKey.value === "materialCategories"
);
const categoryTreeLinkMode = computed<CategoryTreeLinkMode>(() => "parentId");
const keyword = ref("");
const statusFilter = ref("");
const categoryFilter = ref("");
const payTypeFilter = ref("");
const orderDateRange = ref<[string, string] | null>(null);
const userDateRange = ref<[string, string] | null>(null);
const modelDateRange = ref<[string, string] | null>(null);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const userProjects = ref<
  Array<{ id: number | string; title: string; updatedAt?: string }>
>([]);
const userProjectsLoading = ref(false);
const userProjectsPage = ref(1);
const userProjectsPageSize = 10;
const userProjectsTotal = ref(0);
const pointsVisible = ref(false);
const editingId = ref("");
const current = ref<Record<string, any>>({});
const form = reactive<Record<string, any>>({});
const records = ref<Array<Record<string, any>>>([]);
const categoryOptions = ref<Array<{ label: string; value: string }>>([]);
const parentCategoryRecords = ref<Array<Record<string, any>>>([]);
const categoryOptionsLoading = ref(false);
const loading = ref(false);
const apiError = ref("");
const remoteTotal = ref(0);
const currentPage = ref(1);
const getDefaultPageSize = () => config.value?.defaultPageSize ?? 10;
const pageSize = ref(getDefaultPageSize());
const PAGE_SIZES = [10, 20, 50, 100, 1000];

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

const orderStatusOptions = [
  { label: "待支付", value: "PENDING" },
  { label: "支付中", value: "PAYING" },
  { label: "已支付", value: "PAID" },
  { label: "已取消", value: "CANCELLED" },
  { label: "已退款", value: "REFUNDED" }
];

const orderPayTypeOptions = [
  { label: "微信", value: "WECHAT" },
  { label: "支付宝", value: "ALIPAY" }
];

const materialStatusOptions = [
  { label: "启用", value: "ENABLED" },
  { label: "停用", value: "DISABLED" }
];

const materialTypeLabels: Record<string, string> = {
  IMAGE: "图片",
  VIDEO: "视频",
  TEXT: "文字"
};

const formatOrderPayType = (value: string) =>
  orderPayTypeLabels[String(value || "").toUpperCase()] || value;

const formatOrderStatus = (value: string) =>
  orderStatusLabels[String(value || "").toUpperCase()] || value;

const formatMaterialType = (value: string) =>
  materialTypeLabels[String(value || "").toUpperCase()] || value;

const formatCategoryLevel = (row: Record<string, any>) => {
  const level = Number(row.level ?? 1);
  if (level >= 2) {
    const parent = records.value.find(
      item => String(item.id) === String(row.parentId)
    );
    return parent ? `二级类目 ${parent.categoryName}` : "二级类目";
  }
  return "一级类目";
};

const resetFilters = () => {
  keyword.value = "";
  statusFilter.value = "";
  categoryFilter.value = "";
  payTypeFilter.value = "";
  orderDateRange.value = null;
  userDateRange.value = null;
  modelDateRange.value = null;
  currentPage.value = 1;
};

const resetRecords = () => {
  records.value =
    config.value?.records.map(item => formatRecordDates({ ...item })) || [];
  resetFilters();
};

const useServerFilters = () =>
  Boolean(config.value?.serverFilters) && shouldUseApi();

const useServerPagination = () =>
  Boolean(config.value?.serverPagination) && shouldUseApi();

const buildOrderQueryParams = () => {
  const params: Record<string, string> = {};
  const word = keyword.value.trim();
  if (word) params.keyword = word;
  if (statusFilter.value) params.status = statusFilter.value;
  if (payTypeFilter.value) params.payType = payTypeFilter.value;
  if (orderDateRange.value?.[0]) params.dateFrom = orderDateRange.value[0];
  if (orderDateRange.value?.[1]) params.dateTo = orderDateRange.value[1];
  return params;
};

const buildUserQueryParams = () => {
  const params: Record<string, string> = {};
  if (userDateRange.value?.[0]) params.startDate = userDateRange.value[0];
  if (userDateRange.value?.[1]) params.endDate = userDateRange.value[1];
  return params;
};

const buildModelQueryParams = () => {
  const params: Record<string, string> = {};
  if (modelDateRange.value?.[0]) params.startDate = modelDateRange.value[0];
  if (modelDateRange.value?.[1]) params.endDate = modelDateRange.value[1];
  return params;
};

const buildMaterialQueryParams = () => {
  const params: Record<string, string> = {};
  const word = keyword.value.trim();
  if (word) params.keyword = word;
  if (statusFilter.value) params.status = statusFilter.value;
  if (categoryFilter.value) params.categoryCode = categoryFilter.value;
  return params;
};

const buildCategoryQueryParams = () => {
  const params: Record<string, string> = {};
  const word = keyword.value.trim();
  if (word) params.keyword = word;
  if (statusFilter.value) params.status = statusFilter.value;
  return params;
};

const statusFilterOptions = computed(() => {
  if (
    (isMaterialResource.value || resourceKey.value === "categories") &&
    config.value?.serverFilters
  ) {
    return materialStatusOptions;
  }
  if (config.value?.serverFilters) {
    return orderStatusOptions;
  }
  return statuses.value.map(item => ({ label: item, value: item }));
});

const normalizeList = (payload: any) =>
  Array.isArray(payload) ? payload : payload?.items || payload?.records || [];

const normalizeCategoryRows = (items: any[]) => {
  const normalizeStatus = (value: string) =>
    value === "DISABLED" ? "停用" : value === "ENABLED" ? "启用" : value;

  const rows = items.map(item => {
    const parentIdRaw = item.parentId ?? "";
    const parentId =
      parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === ""
        ? ""
        : String(parentIdRaw);
    const level = Number(item.level ?? (parentId ? 2 : 1));
    return {
      ...item,
      id: String(item.id || item.categoryCode || item.code),
      categoryCode: String(item.categoryCode || item.code || item.id || ""),
      categoryName: String(item.categoryName || item.name || ""),
      parentId,
      level,
      status: normalizeStatus(item.status)
    };
  });
  const codeToId = new Map(
    rows.map(row => [String(row.categoryCode), String(row.id)])
  );
  return rows.map(row => {
    if (row.parentId) return row;
    const legacyParentCode = String(row.parentCode || "").trim();
    if (!legacyParentCode) return row;
    return {
      ...row,
      parentId: codeToId.get(legacyParentCode) || legacyParentCode
    };
  });
};

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

  let rows: Array<Record<string, any>>;

  if (resourceKey.value === "users") {
    rows = items.map(item => ({
      ...item,
      id: String(item.id),
      status: item.status === "ENABLED" ? "启用" : "停用",
      memberStatus:
        item.memberStatus === "MEMBER"
          ? "会员"
          : item.memberStatus === "NON_MEMBER"
            ? "非会员"
            : "-"
    }));
  } else if (resourceKey.value === "orders") {
    rows = items.map(item => ({
      ...item,
      id: item.orderNo,
      amountYuan: Number(item.amountFen || 0) / 100,
      payType: formatOrderPayType(item.payType),
      status: formatOrderStatus(item.status)
    }));
  } else if (resourceKey.value === "invoices") {
    rows = items.map(item => ({
      ...item,
      id: item.id || item.invoiceId,
      amountYuan: Number(item.amountFen || 0) / 100
    }));
  } else if (resourceKey.value === "plans") {
    rows = items.map(plan => ({
      ...plan,
      id: plan.id || plan.planCode,
      benefitsText: (plan.benefits || []).join("\n"),
      benefitSummary: (plan.benefits || []).join("；"),
      status: plan.status === "ENABLED" ? "启用" : "停用"
    }));
  } else if (resourceKey.value === "models") {
    rows = items.map(item => ({
      ...item,
      id: item.id || item.modelCode,
      countMin: item.parameters?.count?.min ?? 1,
      countMax: item.parameters?.count?.max ?? 1,
      status: item.status === "ENABLED" ? "启用" : "停用"
    }));
  } else if (resourceKey.value === "pointPackages") {
    rows = items.map(item => ({
      ...item,
      id: String(item.id),
      grantPoints: Number(item.grantPoints || 0),
      bonusPoints: Number(item.bonusPoints || 0),
      priceYuan: Number(item.priceFen || 0) / 100,
      status: normalizeStatus(item.status)
    }));
  } else if (resourceKey.value === "workflows") {
    rows = items.map(item => ({
      ...item,
      id: item.id || item.workflowId,
      workflowDataText: JSON.stringify(item.workflowData || {}, null, 2),
      nodeCount: item.nodeCount ?? Object.keys(item.workflowData || {}).length,
      status: normalizeStatus(item.status)
    }));
  } else if (resourceKey.value === "materials") {
    rows = items.map(item => ({
      ...item,
      id: String(item.id),
      type: String(item.type || ""),
      sortNo: Number(item.sortNo || 0),
      updatedAt: item.updatedAt || item.gmtModified || item.createdAt,
      status: normalizeStatus(item.status)
    }));
  } else if (resourceKey.value === "materialCategories") {
    rows = items.map(item => {
      const parentId =
        item.parentId === null || item.parentId === undefined
          ? ""
          : item.parentId;
      const level = Number(
        item.level ?? (parentId !== "" && parentId !== null ? 2 : 1)
      );
      return {
        ...item,
        id: String(item.id),
        categoryCode: String(item.categoryCode || ""),
        categoryName: String(item.categoryName || ""),
        parentId:
          parentId === "" || parentId === null || parentId === undefined
            ? ""
            : String(parentId),
        level,
        status: normalizeStatus(item.status)
      };
    });
  } else if (resourceKey.value === "categories") {
    rows = normalizeCategoryRows(items);
  } else {
    rows = items.map(item => ({
      ...item,
      id: item.id || item.code,
      status: normalizeStatus(item.status || "ENABLED")
    }));
  }

  return rows.map(row => formatRecordDates(row));
};

const loadMaterialCategoryItems = async () => {
  const tree = normalizeList(await adminApi.materialCategoryTree());
  return flattenMaterialCategoryTree(tree);
};

const loadCategoryOptions = async () => {
  const fallbackSource =
    resourceKey.value === "materials"
      ? resourceConfigs.materialCategories.records
      : resourceConfigs.categories.records;
  const fallbackItems =
    resourceKey.value === "materials"
      ? normalizeMaterialCategoryItems(fallbackSource).filter(isCategoryEnabled)
      : normalizeCategoryItems(fallbackSource).filter(
          item =>
            isCategoryEnabled(item) &&
            isRelevantCategoryScope(item, config.value?.categoryScope)
        );

  if (!hasAdminToken()) {
    categoryOptions.value = buildCategorySelectOptions(fallbackItems);
    return;
  }

  categoryOptionsLoading.value = true;
  try {
    let items: Array<Record<string, any>> = [];
    if (resourceKey.value === "materials") {
      items = await loadMaterialCategoryItems();
    } else {
      const scope = config.value?.categoryScope;
      items = await fetchPaginatedResource(params =>
        adminApi.categories({
          ...params,
          ...(scope ? { scope } : {})
        })
      );
    }
    const normalized =
      resourceKey.value === "materials"
        ? normalizeMaterialCategoryItems(items).filter(isCategoryEnabled)
        : normalizeCategoryItems(items).filter(
            item =>
              isCategoryEnabled(item) &&
              isRelevantCategoryScope(item, config.value?.categoryScope)
          );
    categoryOptions.value = buildCategorySelectOptions(
      normalized.length ? normalized : fallbackItems
    );
  } catch {
    categoryOptions.value = buildCategorySelectOptions(fallbackItems);
  } finally {
    categoryOptionsLoading.value = false;
  }
};

const loadParentCategoryOptions = async () => {
  if (resourceKey.value !== "categories") {
    parentCategoryRecords.value = [];
    return;
  }

  const fallbackItems = normalizeCategoryRows(
    resourceConfigs.categories.records
  );

  if (!hasAdminToken()) {
    parentCategoryRecords.value = fallbackItems;
    return;
  }

  try {
    const payload = await adminApi.categories({ page: 1, pageSize: 1000 });
    const items = normalizeCategoryRows(normalizeList(payload));
    parentCategoryRecords.value = items.length ? items : fallbackItems;
  } catch {
    parentCategoryRecords.value = fallbackItems;
  }
};

const loadRemote = async (options: { resetFilters?: boolean } = {}) => {
  if (options.resetFilters) {
    resetFilters();
  }
  apiError.value = "";
  if (!shouldUseApi()) {
    records.value =
      config.value?.records.map(item => formatRecordDates({ ...item })) || [];
    if (options.resetFilters) {
      resetFilters();
    }
    if (isContentListResource.value) {
      await loadCategoryOptions();
    }
    if (resourceKey.value === "categories") {
      await loadParentCategoryOptions();
    }
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
      items = await fetchPaginatedResource(params =>
        adminApi.users({ ...buildUserQueryParams(), ...params })
      );
    } else if (apiResource === "invoices") {
      items = await fetchPaginatedResource(params => adminApi.invoices(params));
    } else if (apiResource === "orders") {
      items = await fetchPaginatedResource(params =>
        adminApi.orders({ ...buildOrderQueryParams(), ...params })
      );
    } else if (apiResource === "plans") {
      items = normalizeList(await adminApi.plans());
    } else if (apiResource === "pointPackages") {
      items = normalizeList(await adminApi.pointPackages());
    } else if (apiResource === "models") {
      items = normalizeList(await adminApi.models(buildModelQueryParams()));
    } else if (apiResource === "prompts") {
      items = normalizeList(await adminApi.promptTemplates());
    } else if (apiResource === "inspirations") {
      items = normalizeList(await adminApi.inspirations());
    } else if (apiResource === "materials") {
      items = await fetchPaginatedResource(params =>
        adminApi.materials({ ...buildMaterialQueryParams(), ...params })
      );
    } else if (apiResource === "materialCategories") {
      items = await loadMaterialCategoryItems();
    } else if (apiResource === "categories") {
      const scope = config.value?.categoryScope;
      if (config.value?.serverPagination) {
        const payload = await adminApi.categories({
          ...buildCategoryQueryParams(),
          ...(scope ? { scope } : {}),
          page: currentPage.value,
          pageSize: pageSize.value
        });
        remoteTotal.value = Number(
          payload?.total ?? normalizeList(payload).length
        );
        items = normalizeList(payload);
      } else {
        items = await fetchPaginatedResource(params =>
          adminApi.categories({
            ...params,
            ...(scope ? { scope } : {})
          })
        );
        remoteTotal.value = items.length;
      }
    }
    records.value = normalizeRemoteRows(items);
  } catch (error: any) {
    apiError.value = error?.message || "管理接口暂不可用";
    ElMessage.warning(`${apiError.value}，当前展示接口字段示例`);
  } finally {
    loading.value = false;
  }
  if (isContentListResource.value) {
    await loadCategoryOptions();
  }
  if (resourceKey.value === "categories") {
    await loadParentCategoryOptions();
  }
};

watch(resourceKey, () => {
  pageSize.value = getDefaultPageSize();
  resetFilters();
  loadRemote();
});

const filteredRecords = computed(() => {
  if (useServerFilters() || useServerPagination()) {
    return records.value;
  }

  const word = keyword.value.trim().toLowerCase();
  const predicate = (item: Record<string, any>) => {
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
  };

  if (config.value?.treeMode && isCategoryResource.value) {
    return filterCategoriesWithParents(
      records.value,
      predicate,
      categoryTreeLinkMode.value
    );
  }

  return records.value.filter(predicate);
});

const tableRecords = computed(() => {
  if (config.value?.treeMode && isCategoryResource.value) {
    return buildCategoryTree(filteredRecords.value, categoryTreeLinkMode.value);
  }
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRecords.value.slice(start, start + pageSize.value);
});

const isTreeMode = computed(
  () => Boolean(config.value?.treeMode) && isCategoryResource.value
);

const topLevelCategories = computed(() => {
  const source =
    resourceKey.value === "categories"
      ? parentCategoryRecords.value
      : records.value;
  return source.filter(
    item =>
      item.parentId === "" ||
      item.parentId === null ||
      item.parentId === undefined ||
      Number(item.level) === 1
  );
});

const parentCategoryOptions = computed(() => {
  const editingCategoryId = String(current.value?.id || editingId.value || "");
  return topLevelCategories.value
    .filter(item => String(item.id) !== editingCategoryId)
    .map(item => ({
      label: item.categoryName,
      value: item.id
    }));
});

const paginationTotal = computed(() =>
  useServerPagination() ? remoteTotal.value : filteredRecords.value.length
);

const paginationLayout = computed(() =>
  config.value?.fixedPageSize
    ? "total, prev, pager, next, jumper"
    : "total, sizes, prev, pager, next, jumper"
);

const paginatedRecords = computed(() => tableRecords.value);

watch([keyword, statusFilter], () => {
  if (useServerFilters() || useServerPagination()) return;
  currentPage.value = 1;
});

watch([statusFilter, payTypeFilter, orderDateRange, categoryFilter], () => {
  if (!useServerFilters() && !useServerPagination()) return;
  currentPage.value = 1;
  loadRemote();
});

watch(userDateRange, () => {
  if (resourceKey.value !== "users" || !shouldUseApi()) return;
  currentPage.value = 1;
  loadRemote();
});

watch(modelDateRange, () => {
  if (resourceKey.value !== "models" || !shouldUseApi()) return;
  currentPage.value = 1;
  loadRemote();
});

watch([currentPage, pageSize], () => {
  if (!useServerPagination()) return;
  loadRemote();
});

watchDebounced(
  keyword,
  () => {
    if (!useServerFilters() && !useServerPagination()) return;
    currentPage.value = 1;
    loadRemote();
  },
  { debounce: 400 }
);

loadRemote();

const statuses = computed(() => [
  ...new Set(records.value.map(item => item.status).filter(Boolean))
]);

const editorFields = computed(() => {
  const fields = (config.value?.fields || []).filter(field => !field.hidden);
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

const openEditor = async (row?: Record<string, any>) => {
  editingId.value = row?.id || "";
  current.value = row || {};
  Object.keys(form).forEach(key => delete form[key]);
  config.value.fields.forEach(field => {
    form[field.key] = row?.[field.key] ?? (field.type === "number" ? 0 : "");
  });
  if (isContentListResource.value) {
    await loadCategoryOptions();
  }
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
  if (resourceKey.value === "materialCategories") {
    const parentId = form.parentId;
    const payload: Record<string, any> = {
      categoryName: String(form.categoryName || "").trim(),
      parentId:
        parentId === "" || parentId === null || parentId === undefined
          ? null
          : Number(parentId),
      sortNo: Number(form.sortNo || 0),
      ...(!editingId.value ? { status: "ENABLED" } : {})
    };
    if (editingId.value && current.value?.categoryCode) {
      payload.categoryCode = String(current.value.categoryCode).trim();
    }
    return payload;
  }
  if (resourceKey.value === "categories") {
    const parentId = form.parentId;
    const payload: Record<string, any> = {
      attributes: current.value?.attributes || {},
      categoryName: String(form.categoryName || "").trim(),
      parentId:
        parentId === "" || parentId === null || parentId === undefined
          ? null
          : Number(parentId),
      scope: config.value?.categoryScope || "ALL",
      sortNo: Number(form.sortNo || 0),
      ...(!editingId.value ? { status: "ENABLED" } : {})
    };
    if (editingId.value) {
      payload.categoryCode = String(
        current.value?.categoryCode || editingId.value
      ).trim();
    }
    return payload;
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
  if (resourceKey.value === "materials") {
    return {
      title: form.title,
      type: form.type || "IMAGE",
      categoryCode: form.categoryCode,
      resourceUrl: form.resourceUrl,
      coverUrl: form.coverUrl,
      sortNo: Number(form.sortNo || 0),
      ...(!editingId.value ? { status: "ENABLED" } : {})
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
      if (resourceKey.value === "materials") {
        editingId.value
          ? await adminApi.updateMaterial(editingId.value, payload)
          : await adminApi.createMaterial(payload);
      }
      if (resourceKey.value === "materialCategories") {
        editingId.value
          ? await adminApi.updateMaterialCategory(editingId.value, payload)
          : await adminApi.createMaterialCategory(payload);
      }
      if (resourceKey.value === "categories") {
        editingId.value
          ? await adminApi.updateCategory(String(editingId.value), payload)
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
      createdAt: formatDateTime(new Date()),
      updatedAt: formatDateTime(new Date())
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
      if (resourceKey.value === "materials")
        await adminApi.deleteMaterial(String(row.id));
      if (resourceKey.value === "materialCategories")
        await adminApi.deleteMaterialCategory(String(row.id));
      if (resourceKey.value === "categories")
        await adminApi.deleteCategory(String(row.id));
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
      if (resourceKey.value === "materials")
        await adminApi.updateMaterialStatus(String(row.id), apiStatus);
      if (resourceKey.value === "materialCategories")
        await adminApi.updateMaterialCategoryStatus(String(row.id), apiStatus);
      if (resourceKey.value === "categories")
        await adminApi.updateCategoryStatus(String(row.id), apiStatus);
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

const openDetail = async (row: Record<string, any>) => {
  current.value = row;
  detailVisible.value = true;
  if (resourceKey.value === "users") {
    userProjectsPage.value = 1;
    await loadUserProjects();
  }
};

const loadUserProjects = async () => {
  if (!shouldUseApi() || resourceKey.value !== "users") {
    userProjects.value = [];
    userProjectsTotal.value = 0;
    return;
  }

  const userId = String(current.value?.id || "");
  if (!userId) return;

  userProjectsLoading.value = true;
  try {
    const payload = await adminApi.userProjects(userId, {
      page: userProjectsPage.value,
      pageSize: userProjectsPageSize
    });
    userProjects.value = normalizeList(payload);
    userProjectsTotal.value = Number(
      payload?.total ?? userProjects.value.length
    );
  } catch {
    userProjects.value = [];
    userProjectsTotal.value = 0;
  } finally {
    userProjectsLoading.value = false;
  }
};

watch(detailVisible, visible => {
  if (visible) return;
  userProjectsPage.value = 1;
  userProjects.value = [];
  userProjectsTotal.value = 0;
});

watch(userProjectsPage, () => {
  if (!detailVisible.value || resourceKey.value !== "users") return;
  loadUserProjects();
});

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
  if (["会员", "MEMBER"].includes(value)) return "success";
  if (["非会员", "NON_MEMBER"].includes(value)) return "info";
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

const isParentCategoryField = (field: ResourceField) =>
  field.optionsFrom === "topLevelCategories";

const isCategoryListField = (field: ResourceField) =>
  field.optionsFrom === "categoryList";

const categoryLabelMap = computed(() =>
  Object.fromEntries(
    categoryOptions.value.map(item => [item.value, item.label])
  )
);

const uploadFieldLoading = ref<Record<string, boolean>>({});

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("文件读取失败"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });

const isVideoCoverUrl = (url: string) =>
  /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);

const isUploadFieldLoading = (key: string) =>
  Boolean(uploadFieldLoading.value[key]);

const uploadFieldFile = async (field: ResourceField, file: File) => {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    ElMessage.warning("请上传图片或视频文件");
    return;
  }

  uploadFieldLoading.value[field.key] = true;
  try {
    if (isMaterialResource.value || resourceKey.value === "inspirations") {
      const result = await adminApi.uploadFile(file);
      form[field.key] = result.url || "";
    } else {
      const fileBase64 = await fileToBase64(file);
      const asset = await adminApi.uploadAsset({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileBase64
      });
      form[field.key] = asset.previewUrl || asset.url || "";
    }
    ElMessage.success("上传成功");
  } catch (error: any) {
    ElMessage.error(error?.message || "上传失败");
  } finally {
    uploadFieldLoading.value[field.key] = false;
  }
};
</script>

<template>
  <div v-if="config" class="daone-page">
    <section class="page-hero" :style="{ '--accent': config.color }">
      <div class="hero-icon">
        <IconifyIconOnline :icon="config.icon" />
      </div>
      <div class="hero-copy">
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

    <!-- <section v-if="!config.hideMetrics" class="metric-grid">
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
    </section> -->

    <section class="table-card">
      <div class="toolbar">
        <el-input
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
          v-model="statusFilter"
          clearable
          placeholder="全部状态"
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
          v-if="isMaterialResource"
          v-model="categoryFilter"
          clearable
          placeholder="全部分类"
          class="category-filter"
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
        <el-button @click="loadRemote({ resetFilters: true })">
          <IconifyIconOnline icon="ri:refresh-line" />
          重置
        </el-button>
        <div class="record-count">共 {{ paginationTotal }} 条</div>
      </div>

      <el-table
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
              v-else-if="
                column.key === 'status' || column.key === 'memberStatus'
              "
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
          :width="isTableFullWidth ? undefined : 230"
          :min-width="isTableFullWidth ? 220 : undefined"
          align="right"
        >
          <template #default="{ row }">
            <div class="table-actions">
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
                v-else-if="
                  resourceKey !== 'orders' && resourceKey !== 'invoices'
                "
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
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无匹配数据" />
        </template>
      </el-table>

      <div v-if="!isTreeMode || useServerPagination()" class="table-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="PAGE_SIZES"
          :layout="paginationLayout"
          :total="paginationTotal"
          background
        />
      </div>
      <div v-else class="table-pagination tree-record-count">
        共 {{ filteredRecords.length }} 条（含二级分类）
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
            :loading="isCategoryListField(field) && categoryOptionsLoading"
            clearable
          >
            <template v-if="isParentCategoryField(field)">
              <el-option label="无（一级分类）" value="" />
              <el-option
                v-for="option in parentCategoryOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </template>
            <template v-else-if="isCategoryListField(field)">
              <el-option
                v-for="option in categoryOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </template>
            <template v-else>
              <el-option
                v-for="option in field.options"
                :key="option"
                :label="option"
                :value="option"
              />
            </template>
          </el-select>
          <div v-else-if="field.type === 'upload'" class="media-upload">
            <el-upload
              class="media-uploader"
              :show-file-list="false"
              :accept="field.accept || 'image/*,video/*'"
              :disabled="isUploadFieldLoading(field.key)"
              :http-request="({ file }) => uploadFieldFile(field, file as File)"
            >
              <div v-if="form[field.key]" class="media-preview">
                <img
                  v-if="!isVideoCoverUrl(String(form[field.key]))"
                  :src="form[field.key]"
                  alt="封面预览"
                />
                <video v-else :src="form[field.key]" controls @click.stop />
                <div class="media-preview-mask">
                  <span>{{
                    isUploadFieldLoading(field.key) ? "上传中..." : "重新上传"
                  }}</span>
                </div>
              </div>
              <div v-else class="media-upload-trigger">
                <IconifyIconOnline icon="ri:upload-cloud-2-line" />
                <span>{{
                  isUploadFieldLoading(field.key)
                    ? "上传中..."
                    : "点击上传图片或视频"
                }}</span>
              </div>
            </el-upload>
            <el-button
              v-if="form[field.key]"
              link
              type="danger"
              :disabled="isUploadFieldLoading(field.key)"
              @click="form[field.key] = ''"
            >
              移除封面
            </el-button>
          </div>
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
          {{
            isDateTimeField(column.key)
              ? formatDateTime(current[column.key])
              : current[column.key]
          }}
        </el-descriptions-item>
      </el-descriptions>
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
            class="project-row"
          >
            <IconifyIconOnline icon="ri:folder-5-line" />
            <span>{{ project.title }}</span>
            <small>{{
              project.updatedAt ? formatDateTime(project.updatedAt) : "最近编辑"
            }}</small>
          </div>
          <el-pagination
            v-if="userProjectsTotal > userProjectsPageSize"
            v-model:current-page="userProjectsPage"
            :page-size="userProjectsPageSize"
            :total="userProjectsTotal"
            layout="prev, pager, next"
            small
            background
            class="project-pagination"
          />
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

.status-filter,
.pay-type-filter {
  width: 150px;
}

.category-filter {
  width: 100px;
}

.date-filter {
  width: 260px;
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

.resource-table :deep(td.action-column .cell) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.table-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 0;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
}

.table-actions :deep(.el-button) {
  height: 28px;
  padding: 0 8px;
  margin: 0;
  line-height: 28px;
}

.table-actions :deep(.el-dropdown) {
  display: inline-flex;
  align-items: center;
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

.project-list {
  min-height: 80px;
}

.project-pagination {
  justify-content: center;
  margin-top: 12px;
}

.points-form {
  margin-top: 18px;
}

.media-upload {
  width: 100%;
}

.media-uploader {
  width: 100%;
}

.media-uploader :deep(.el-upload) {
  display: block;
  width: 100%;
}

.media-upload-trigger,
.media-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 160px;
  overflow: hidden;
  color: #7a7d8b;
  cursor: pointer;
  background: #faf9fc;
  border: 1px dashed #d8d5e5;
  border-radius: 12px;
  transition: 0.2s;
}

.media-upload-trigger:hover,
.media-preview:hover {
  border-color: #b8aef0;
}

.media-upload-trigger svg,
.media-upload-trigger .iconify {
  font-size: 28px;
  color: #8d7df0;
}

.media-preview img,
.media-preview video {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: cover;
}

.media-preview-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgb(20 18 32 / 42%);
  opacity: 0;
  transition: 0.2s;
}

.media-preview:hover .media-preview-mask {
  opacity: 1;
}

.media-cell {
  display: flex;
  align-items: center;
}

.media-cell .media-thumb {
  width: 56px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
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

  .search,
  .status-filter,
  .pay-type-filter,
  .date-filter {
    width: 100%;
  }
}
</style>

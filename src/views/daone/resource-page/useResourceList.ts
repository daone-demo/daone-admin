import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { ElMessage } from "element-plus";
import { adminApi } from "@/api/admin";
import router from "@/router";
import { getToken } from "@/utils/auth";
import { resourceConfigs, type ResourceConfig } from "../resourceData";
import {
  buildCategorySelectOptions,
  buildCategoryTree,
  filterCategoriesWithParents,
  flattenMaterialCategoryTree,
  isCategoryEnabled,
  isRelevantCategoryScope,
  normalizeCategoryItems,
  normalizeMaterialCategoryItems,
  type CategoryTreeLinkMode
} from "./categoryTree";
import {
  invoiceStatusOptions,
  materialStatusOptions,
  notificationStatusOptions,
  orderPayTypeOptions,
  orderStatusOptions,
  trialApplicationStatusOptions,
  userSubscriptionStatusOptions
} from "./resourceFormatters";
import {
  fetchPaginatedResource,
  normalizeCategoryRows,
  normalizeList,
  normalizeRemoteRows
} from "./useResourceNormalize";
import { createLatestRequestTracker } from "./latestRequestTracker";
import { createCoalescedInvoke } from "./coalescedInvoke";
import { createReloadGate } from "./reloadGate";

export interface UseResourceListOptions {
  resourceKey: ComputedRef<string> | Ref<string>;
  clearTableSelection?: () => void;
}

export const useResourceList = (options: UseResourceListOptions) => {
  const { resourceKey } = options;
  const config = computed<ResourceConfig>(
    () => resourceConfigs[resourceKey.value]
  );
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
  const records = ref<Array<Record<string, any>>>([]);
  const categoryOptions = ref<Array<{ label: string; value: string }>>([]);
  const parentCategoryRecords = ref<Array<Record<string, any>>>([]);
  const categoryOptionsLoading = ref(false);
  const loading = ref(false);
  const apiError = ref("");
  const remoteTotal = ref(0);
  const currentPage = ref(1);
  const tableRef = ref();
  const selectedRows = ref<Array<Record<string, any>>>([]);
  const getDefaultPageSize = () => config.value?.defaultPageSize ?? 10;
  const pageSize = ref(getDefaultPageSize());
  const PAGE_SIZES = [10, 20, 50, 100, 1000];

  const hasAdminToken = () => Boolean(getToken()?.accessToken);
  const shouldUseApi = () =>
    Boolean(config.value?.apiResource) && hasAdminToken();
  let redirectingToLogin = false;

  const ensureAdminAuthenticated = () => {
    if (hasAdminToken()) return true;

    records.value = [];
    categoryOptions.value = [];
    parentCategoryRecords.value = [];
    remoteTotal.value = 0;
    apiError.value = "登录状态已失效，请重新登录";

    if (router.currentRoute.value.path !== "/login" && !redirectingToLogin) {
      redirectingToLogin = true;
      const redirect = router.currentRoute.value.fullPath;
      void router
        .replace({ path: "/login", query: { redirect } })
        .finally(() => {
          redirectingToLogin = false;
        });
    }
    return false;
  };

  const reloadGate = createReloadGate();
  // 批量 reset 清空关键词时，watchDebounced 仍会在 400ms 后触发；用此标记跳过那一次
  let skipNextKeywordReload = false;

  const resetFilters = () => {
    if (keyword.value !== "") {
      skipNextKeywordReload = true;
    }
    keyword.value = "";
    statusFilter.value = "";
    categoryFilter.value = "";
    payTypeFilter.value = "";
    orderDateRange.value = null;
    userDateRange.value = null;
    modelDateRange.value = null;
    currentPage.value = 1;
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
    const word = keyword.value.trim();
    if (word) params.keyword = word;
    if (statusFilter.value) params.subscriptionStatus = statusFilter.value;
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
    if (statusFilter.value) params.status = statusFilter.value;
    if (categoryFilter.value) params.categoryId = categoryFilter.value;
    return params;
  };

  const buildInspirationQueryParams = () => {
    const params: Record<string, string> = {};
    if (categoryFilter.value) params.categoryId = categoryFilter.value;
    return params;
  };

  const buildCategoryQueryParams = () => {
    const params: Record<string, string> = {};
    const word = keyword.value.trim();
    if (word) params.keyword = word;
    if (statusFilter.value) params.status = statusFilter.value;
    return params;
  };

  const statuses = computed(() => [
    ...new Set(records.value.map(item => item.status).filter(Boolean))
  ]);

  const statusFilterOptions = computed(() => {
    if (
      (isMaterialResource.value || resourceKey.value === "categories") &&
      config.value?.serverFilters
    ) {
      return materialStatusOptions;
    }
    if (resourceKey.value === "invoices") {
      return invoiceStatusOptions;
    }
    if (resourceKey.value === "trialApplications") {
      return trialApplicationStatusOptions;
    }
    if (resourceKey.value === "notifications") {
      return notificationStatusOptions;
    }
    if (resourceKey.value === "users") {
      return userSubscriptionStatusOptions;
    }
    if (config.value?.serverFilters) {
      return orderStatusOptions;
    }
    return statuses.value.map(item => ({ label: item, value: item }));
  });

  const loadMaterialCategoryItems = async () => {
    const tree = normalizeList(await adminApi.materialCategoryTree());
    return flattenMaterialCategoryTree(tree);
  };

  const categoryOptionsTracker = createLatestRequestTracker();
  const parentCategoryTracker = createLatestRequestTracker();

  const loadCategoryOptions = async () => {
    if (!ensureAdminAuthenticated()) return;

    // 请求开始时快照资源，避免素材→灵感等切换时旧分类响应覆盖新资源选项
    const requestedResourceKey = resourceKey.value;
    const requestedScope = config.value?.categoryScope;
    const isCurrent = categoryOptionsTracker.begin();
    const isStale = () =>
      !isCurrent() || resourceKey.value !== requestedResourceKey;

    categoryOptionsLoading.value = true;
    try {
      let items: Array<Record<string, any>> = [];
      if (requestedResourceKey === "materials") {
        items = await loadMaterialCategoryItems();
      } else if (requestedResourceKey === "inspirations") {
        const payload = await adminApi.categories({ page: 1, pageSize: 100 });
        items = normalizeList(payload);
      } else {
        items = await fetchPaginatedResource(params =>
          adminApi.categories({
            ...params,
            ...(requestedScope ? { scope: requestedScope } : {})
          })
        );
      }
      if (isStale()) return;
      const normalized =
        requestedResourceKey === "materials"
          ? normalizeMaterialCategoryItems(items).filter(isCategoryEnabled)
          : normalizeCategoryItems(items).filter(
              item =>
                isCategoryEnabled(item) &&
                isRelevantCategoryScope(item, requestedScope)
            );
      categoryOptions.value = buildCategorySelectOptions(
        normalized,
        ["materials", "inspirations"].includes(requestedResourceKey)
          ? "id"
          : "categoryCode"
      );
    } catch (error: any) {
      if (isStale()) return;
      categoryOptions.value = [];
      apiError.value = error?.message || "分类数据加载失败";
      ElMessage.error(apiError.value);
    } finally {
      if (!isStale()) {
        categoryOptionsLoading.value = false;
      }
    }
  };

  const preloadContentListOptions = () => {
    if (!isContentListResource.value) return;
    return loadCategoryOptions();
  };

  const loadParentCategoryOptions = async () => {
    const requestedResourceKey = resourceKey.value;
    if (requestedResourceKey !== "categories") {
      parentCategoryRecords.value = [];
      return;
    }

    if (!ensureAdminAuthenticated()) return;

    const isCurrent = parentCategoryTracker.begin();
    const isStale = () =>
      !isCurrent() || resourceKey.value !== requestedResourceKey;

    try {
      const payload = await adminApi.categories({ page: 1, pageSize: 1000 });
      if (isStale()) return;
      parentCategoryRecords.value = normalizeCategoryRows(
        normalizeList(payload)
      );
    } catch (error: any) {
      if (isStale()) return;
      parentCategoryRecords.value = [];
      apiError.value = error?.message || "父级分类加载失败";
      ElMessage.error(apiError.value);
    }
  };

  const handleSelectionChange = (rows: Array<Record<string, any>>) => {
    selectedRows.value = rows;
  };

  const clearTableSelection = () => {
    selectedRows.value = [];
    tableRef.value?.clearSelection?.();
  };

  const loadRemoteTracker = createLatestRequestTracker();

  const loadRemote = async (loadOptions: { resetFilters?: boolean } = {}) => {
    // 批量重置筛选时挂起 watcher，避免直接请求 + 微任务调度再请求
    if (loadOptions.resetFilters) {
      reloadGate.runSuspended(() => {
        resetFilters();
      });
    }
    apiError.value = "";
    if (!ensureAdminAuthenticated()) {
      return;
    }
    // 请求开始时快照资源与配置，响应仅在“仍是最后一次请求且资源未切换”时生效，
    // 防止慢返回的旧资源响应覆盖新资源的数据（A→B 乱序返回）
    const requestedResourceKey = resourceKey.value;
    const requestedConfig = config.value;
    if (!requestedConfig?.apiResource) {
      records.value = [];
      remoteTotal.value = 0;
      apiError.value = "当前资源未配置管理接口";
      ElMessage.error(apiError.value);
      return;
    }
    const isCurrent = loadRemoteTracker.begin();
    const isStale = () =>
      !isCurrent() || resourceKey.value !== requestedResourceKey;
    loading.value = true;
    try {
      let items: any[] = [];
      let nextRemoteTotal: number | null = null;
      const apiResource = requestedConfig.apiResource;
      if (apiResource === "workflows") {
        items = await fetchPaginatedResource(params =>
          adminApi.workflows(params)
        );
      } else if (apiResource === "users") {
        const userParams = buildUserQueryParams();
        items = await fetchPaginatedResource(params =>
          adminApi.users({ ...userParams, ...params })
        );
      } else if (apiResource === "invoices") {
        items = await fetchPaginatedResource(params =>
          adminApi.invoices(params)
        );
      } else if (apiResource === "orders") {
        const orderParams = buildOrderQueryParams();
        items = await fetchPaginatedResource(params =>
          adminApi.orders({ ...orderParams, ...params })
        );
      } else if (apiResource === "trialApplications") {
        items = await fetchPaginatedResource(params =>
          adminApi.trialApplications({
            ...params,
            ...(statusFilter.value ? { status: statusFilter.value } : {})
          })
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
        items = normalizeList(
          await adminApi.inspirations(buildInspirationQueryParams())
        );
      } else if (apiResource === "materials") {
        const materialParams = buildMaterialQueryParams();
        items = await fetchPaginatedResource(params =>
          adminApi.materials({ ...materialParams, ...params })
        );
      } else if (apiResource === "materialCategories") {
        items = await loadMaterialCategoryItems();
      } else if (apiResource === "categories") {
        const scope = requestedConfig.categoryScope;
        if (requestedConfig.serverPagination) {
          const payload = await adminApi.categories({
            ...buildCategoryQueryParams(),
            ...(scope ? { scope } : {}),
            page: currentPage.value,
            pageSize: pageSize.value
          });
          const normalizedItems = normalizeList(payload);
          nextRemoteTotal = Number(
            !Array.isArray(payload) &&
              typeof payload === "object" &&
              payload !== null &&
              "total" in payload
              ? payload.total
              : normalizedItems.length
          );
          items = normalizedItems;
        } else {
          items = await fetchPaginatedResource(params =>
            adminApi.categories({
              ...params,
              ...(scope ? { scope } : {})
            })
          );
          nextRemoteTotal = items.length;
        }
      } else if (apiResource === "notifications") {
        items = await fetchPaginatedResource(params =>
          adminApi.notifications(params)
        );
      }
      if (isStale()) return;
      if (nextRemoteTotal !== null) {
        remoteTotal.value = nextRemoteTotal;
      }
      records.value = normalizeRemoteRows(items, requestedResourceKey);
    } catch (error: any) {
      if (isStale()) return;
      records.value = [];
      remoteTotal.value = 0;
      apiError.value = error?.message || "管理接口暂不可用";
      ElMessage.error(apiError.value);
    } finally {
      // 旧请求不得清掉新请求的 loading，也不得触发新资源的选中清理
      if (!isStale()) {
        loading.value = false;
        if (isContentListResource.value) {
          if (options.clearTableSelection) {
            options.clearTableSelection();
          } else {
            clearTableSelection();
          }
        }
      }
    }
    if (isStale()) return;
    if (requestedResourceKey === "categories") {
      await loadParentCategoryOptions();
    }
  };

  const filteredRecords = computed(() => {
    if (useServerFilters() || useServerPagination()) {
      return records.value;
    }

    // 用户列表筛选（关键词、会员状态、注册日期）已由接口处理
    if (resourceKey.value === "users" && shouldUseApi()) {
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
      const matchesCategory =
        !isContentListResource.value ||
        !categoryFilter.value ||
        String(item.categoryId || item.categoryCode || "") ===
          categoryFilter.value;
      return (
        matchesWord &&
        matchesCategory &&
        (!statusFilter.value ||
          item.status === statusFilter.value ||
          item.statusRaw === statusFilter.value ||
          item.subscriptionStatus === statusFilter.value)
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
      return buildCategoryTree(
        filteredRecords.value,
        categoryTreeLinkMode.value
      );
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

  const paginationTotal = computed(() =>
    useServerPagination() ? remoteTotal.value : filteredRecords.value.length
  );

  const paginationLayout = computed(() =>
    config.value?.fixedPageSize
      ? "total, prev, pager, next, jumper"
      : "total, sizes, prev, pager, next, jumper"
  );

  const paginatedRecords = computed(() => tableRecords.value);

  const isTableFullWidth = computed(() =>
    Boolean(config.value?.tableFullWidth)
  );

  const detailColumns = computed(() => {
    const columns = config.value?.columns || [];
    if (resourceKey.value === "plans") {
      return columns.filter(
        column =>
          !["priceSummary", "benefitSummary", "grantPoints"].includes(
            column.key
          )
      );
    }
    if (resourceKey.value === "notifications") {
      return [
        { key: "title", label: "标题" },
        { key: "typeLabel", label: "分类" },
        { key: "status", label: "状态" },
        { key: "content", label: "内容" },
        { key: "publishedAt", label: "发布时间" },
        { key: "createdAt", label: "创建时间" },
        { key: "updatedAt", label: "更新时间" }
        // { key: "createdBy", label: "创建管理员" }
      ];
    }
    return columns;
  });

  const activeCount = computed(
    () =>
      records.value.filter(item =>
        ["启用", "已支付", "已开票", "PAID", "ENABLED"].includes(item.status)
      ).length
  );

  const formatCategoryLevel = (row: Record<string, any>) => {
    const level = Number(row.level ?? 1);
    if (level >= 2) {
      const categoryName = String(row.categoryName || row.name || "");
      let parentName = String(row.parentName || "").trim();
      if (!parentName) {
        const parent = records.value.find(
          item => String(item.id) === String(row.parentId)
        );
        parentName = parent ? String(parent.categoryName || "") : "";
      }
      return parentName
        ? `${parentName} / ${categoryName}`
        : categoryName || "二级类目";
    }
    return "一级类目";
  };

  const categoryLabelMap = computed(() =>
    Object.fromEntries(
      categoryOptions.value.map(item => [item.value, item.label])
    )
  );

  // P2-4 / P2-3：筛选、分页、资源切换由多个 watcher 分别监听。统一走合并调度器，
  // 同一轮内只发出一次 loadRemote；批量 reset 期间挂起 watcher，避免重复请求。
  const scheduleLoadRemote = createCoalescedInvoke(() => {
    void loadRemote();
  });

  /** 重置筛选并只调度一次加载（工具栏「重置」入口） */
  const resetAndReload = () => {
    reloadGate.runSuspended(() => {
      resetFilters();
    });
    scheduleLoadRemote();
  };

  watch(resourceKey, () => {
    reloadGate.runSuspended(() => {
      pageSize.value = getDefaultPageSize();
      resetFilters();
    });
    void preloadContentListOptions();
    scheduleLoadRemote();
  });

  watch(
    [keyword, statusFilter, categoryFilter],
    () => {
      if (reloadGate.suspended) return;
      if (useServerFilters() || useServerPagination()) return;
      currentPage.value = 1;
    },
    { flush: "sync" }
  );

  watch(
    [statusFilter, payTypeFilter, orderDateRange, categoryFilter],
    () => {
      if (reloadGate.suspended) return;
      if (!useServerFilters() && !useServerPagination()) return;
      currentPage.value = 1;
      scheduleLoadRemote();
    },
    { flush: "sync" }
  );

  // 用户列表：日期与会员状态均由接口筛选（与上面的通用 watcher 重叠时由调度器去重）
  watch(
    [userDateRange, statusFilter],
    () => {
      if (reloadGate.suspended) return;
      if (resourceKey.value !== "users" || !shouldUseApi()) return;
      currentPage.value = 1;
      scheduleLoadRemote();
    },
    { flush: "sync" }
  );

  watch(
    modelDateRange,
    () => {
      if (reloadGate.suspended) return;
      if (resourceKey.value !== "models" || !shouldUseApi()) return;
      currentPage.value = 1;
      scheduleLoadRemote();
    },
    { flush: "sync" }
  );

  watch(
    [currentPage, pageSize],
    () => {
      if (reloadGate.suspended) return;
      if (!useServerPagination()) return;
      scheduleLoadRemote();
    },
    { flush: "sync" }
  );

  watchDebounced(
    keyword,
    () => {
      if (skipNextKeywordReload) {
        skipNextKeywordReload = false;
        return;
      }
      if (reloadGate.suspended) return;
      if (!(config.value?.searchable || []).length) return;
      if (useServerFilters() || useServerPagination()) {
        currentPage.value = 1;
        scheduleLoadRemote();
        return;
      }
      if (resourceKey.value === "users" && shouldUseApi()) {
        currentPage.value = 1;
        scheduleLoadRemote();
      }
    },
    { debounce: 400 }
  );

  void preloadContentListOptions();
  loadRemote();

  return {
    config,
    isContentListResource,
    isMaterialResource,
    isCategoryResource,
    isMaterialCategoryResource,
    categoryTreeLinkMode,
    keyword,
    statusFilter,
    categoryFilter,
    payTypeFilter,
    orderDateRange,
    userDateRange,
    modelDateRange,
    records,
    categoryOptions,
    parentCategoryRecords,
    categoryOptionsLoading,
    loading,
    apiError,
    remoteTotal,
    currentPage,
    tableRef,
    selectedRows,
    pageSize,
    PAGE_SIZES,
    hasAdminToken,
    ensureAdminAuthenticated,
    shouldUseApi,
    resetFilters,
    resetAndReload,
    useServerFilters,
    useServerPagination,
    buildOrderQueryParams,
    buildUserQueryParams,
    buildModelQueryParams,
    buildMaterialQueryParams,
    buildInspirationQueryParams,
    buildCategoryQueryParams,
    statuses,
    statusFilterOptions,
    orderPayTypeOptions,
    loadMaterialCategoryItems,
    loadCategoryOptions,
    preloadContentListOptions,
    loadParentCategoryOptions,
    handleSelectionChange,
    clearTableSelection,
    loadRemote,
    filteredRecords,
    tableRecords,
    isTreeMode,
    topLevelCategories,
    paginationTotal,
    paginationLayout,
    paginatedRecords,
    isTableFullWidth,
    detailColumns,
    activeCount,
    formatCategoryLevel,
    categoryLabelMap
  };
};

export type ResourceListState = ReturnType<typeof useResourceList>;

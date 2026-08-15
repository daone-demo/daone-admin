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
  orderPayTypeOptions,
  orderStatusOptions,
  userSubscriptionStatusOptions
} from "./resourceFormatters";
import {
  fetchPaginatedResource,
  normalizeCategoryRows,
  normalizeList,
  normalizeRemoteRows
} from "./useResourceNormalize";

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

  const loadCategoryOptions = async () => {
    if (!ensureAdminAuthenticated()) return;

    categoryOptionsLoading.value = true;
    try {
      let items: Array<Record<string, any>> = [];
      if (resourceKey.value === "materials") {
        items = await loadMaterialCategoryItems();
      } else if (resourceKey.value === "inspirations") {
        const payload = await adminApi.categories({ page: 1, pageSize: 100 });
        items = normalizeList(payload);
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
        normalized,
        ["materials", "inspirations"].includes(resourceKey.value)
          ? "id"
          : "categoryCode"
      );
    } catch (error: any) {
      categoryOptions.value = [];
      apiError.value = error?.message || "分类数据加载失败";
      ElMessage.error(apiError.value);
    } finally {
      categoryOptionsLoading.value = false;
    }
  };

  const preloadContentListOptions = () => {
    if (!isContentListResource.value) return;
    return loadCategoryOptions();
  };

  const loadParentCategoryOptions = async () => {
    if (resourceKey.value !== "categories") {
      parentCategoryRecords.value = [];
      return;
    }

    if (!ensureAdminAuthenticated()) return;

    try {
      const payload = await adminApi.categories({ page: 1, pageSize: 1000 });
      parentCategoryRecords.value = normalizeCategoryRows(
        normalizeList(payload)
      );
    } catch (error: any) {
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

  const loadRemote = async (loadOptions: { resetFilters?: boolean } = {}) => {
    if (loadOptions.resetFilters) {
      resetFilters();
    }
    apiError.value = "";
    if (!ensureAdminAuthenticated()) {
      return;
    }
    if (!config.value?.apiResource) {
      records.value = [];
      remoteTotal.value = 0;
      apiError.value = "当前资源未配置管理接口";
      ElMessage.error(apiError.value);
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
        items = await fetchPaginatedResource(params =>
          adminApi.invoices(params)
        );
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
        items = normalizeList(
          await adminApi.inspirations(buildInspirationQueryParams())
        );
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
          const normalizedItems = normalizeList(payload);
          remoteTotal.value = Number(
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
          remoteTotal.value = items.length;
        }
      }
      records.value = normalizeRemoteRows(items, resourceKey.value);
    } catch (error: any) {
      records.value = [];
      remoteTotal.value = 0;
      apiError.value = error?.message || "管理接口暂不可用";
      ElMessage.error(apiError.value);
    } finally {
      loading.value = false;
      if (isContentListResource.value) {
        if (options.clearTableSelection) {
          options.clearTableSelection();
        } else {
          clearTableSelection();
        }
      }
    }
    if (resourceKey.value === "categories") {
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

  watch(resourceKey, () => {
    pageSize.value = getDefaultPageSize();
    resetFilters();
    void preloadContentListOptions();
    loadRemote();
  });

  watch([keyword, statusFilter, categoryFilter], () => {
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

  watch(statusFilter, () => {
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
      if (useServerFilters() || useServerPagination()) {
        currentPage.value = 1;
        loadRemote();
        return;
      }
      if (resourceKey.value === "users" && shouldUseApi()) {
        currentPage.value = 1;
        loadRemote();
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

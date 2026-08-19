import {
  computed,
  reactive,
  ref,
  watch,
  type ComputedRef,
  type Ref
} from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { adminApi } from "@/api/admin";
import { useSubmitLock } from "@/utils/submitLock";
import type { ResourceConfig } from "../resourceData";
import { isRequiredFieldEmpty } from "./resourceFieldUtils";
import type { BatchMediaUploadState } from "./useBatchMediaUpload";
import type { ResourceListState } from "./useResourceList";
import { normalizeList } from "./useResourceNormalize";
import { createLatestRequestTracker } from "./latestRequestTracker";
import {
  createEmptyPlanPriceItem,
  mapApiPricesToFormItems,
  mapFormItemsToApiPrices,
  validatePlanPriceItems,
  type PlanPriceFormItem
} from "./planPriceForm";

export interface UseResourceCrudOptions {
  resourceKey: ComputedRef<string> | Ref<string>;
  config?: ComputedRef<ResourceConfig>;
  form: Record<string, any>;
  list: ResourceListState;
  batchUpload: BatchMediaUploadState;
}

export const useResourceCrud = (options: UseResourceCrudOptions) => {
  const { resourceKey, form, list, batchUpload } = options;
  const config = options.config || list.config;
  const {
    loading,
    selectedRows,
    topLevelCategories,
    shouldUseApi,
    ensureAdminAuthenticated,
    loadRemote,
    clearTableSelection
  } = list;
  const {
    inspirationMediaItems,
    inspirationBatchUploading,
    materialMediaItems,
    materialBatchUploading,
    resetInspirationMedia,
    resetMaterialMedia,
    getInspirationMediaUrls,
    getMaterialMediaUrls
  } = batchUpload;

  const dialogVisible = ref(false);
  const detailVisible = ref(false);
  const userProjects = ref<
    Array<{ id: number | string; title: string; updatedAt?: string }>
  >([]);
  const userProjectsLoading = ref(false);
  const userProjectsPage = ref(1);
  const userProjectsPageSize = 10;
  const userProjectsTotal = ref(0);
  const projectCanvasVisible = ref(false);
  const projectCanvasLoading = ref(false);
  const projectCanvasTitle = ref("");
  const projectCanvasPayload = ref<Record<string, unknown> | null>(null);
  const pointsVisible = ref(false);
  const editingId = ref("");
  const current = ref<Record<string, any>>({});
  const pointsForm = reactive({
    adjustAmount: 1000,
    adjustReason: "运营活动赠送"
  });
  const { submitting: saving, withSubmitLock: withSaveLock } = useSubmitLock();
  const { submitting: adjustingPoints, withSubmitLock: withAdjustLock } =
    useSubmitLock();
  const userProjectsTracker = createLatestRequestTracker();
  const projectCanvasTracker = createLatestRequestTracker();

  const canCallManagementApi = () => {
    if (!ensureAdminAuthenticated()) return false;
    if (!config.value?.apiResource || !shouldUseApi()) {
      ElMessage.error("当前资源未配置管理接口，操作未执行");
      return false;
    }
    return true;
  };

  const editorFields = computed(() => {
    const fields = (config.value?.fields || []).filter(field => !field.hidden);
    if (editingId.value) {
      return fields.filter(field => !field.createOnly);
    }
    return fields;
  });

  const parentCategoryOptions = computed(() => {
    const editingCategoryId = String(
      current.value?.id || editingId.value || ""
    );
    return topLevelCategories.value
      .filter(item => String(item.id) !== editingCategoryId)
      .map(item => ({
        label: item.categoryName,
        value: item.id
      }));
  });

  const openEditor = async (row?: Record<string, any>) => {
    if (
      row &&
      resourceKey.value === "notifications" &&
      String(row.statusRaw || "").toUpperCase() === "PUBLISHED"
    ) {
      ElMessage.warning("已发布的消息不可编辑，仅草稿可修改");
      return;
    }
    editingId.value = row?.id || "";
    current.value = row || {};
    Object.keys(form).forEach(key => delete form[key]);
    config.value.fields.forEach(field => {
      if (row?.[field.key] !== undefined && row?.[field.key] !== null) {
        form[field.key] = row[field.key];
        return;
      }
      if (
        resourceKey.value === "notifications" &&
        field.key === "type" &&
        !row
      ) {
        form[field.key] = "system";
        return;
      }
      form[field.key] = field.type === "number" ? 0 : "";
    });
    resetInspirationMedia();
    resetMaterialMedia();
    if (resourceKey.value === "inspirations" && row?.coverUrl) {
      inspirationMediaItems.value = [
        {
          uid: `existing-${row.id}`,
          name: "当前封面",
          url: String(row.coverUrl),
          status: "success",
          progress: 100
        }
      ];
    }
    if (resourceKey.value === "materials" && row?.resourceUrl) {
      materialMediaItems.value = [
        {
          uid: `existing-${row.id}`,
          name: "当前资源",
          url: String(row.resourceUrl),
          status: "success",
          progress: 100
        }
      ];
    }
    if (resourceKey.value === "plans") {
      if (row) {
        const fallbackBenefits = Array.isArray(row.benefitList)
          ? row.benefitList
          : [];
        form.priceItems = mapApiPricesToFormItems(
          row.prices || [],
          fallbackBenefits
        );
      } else {
        form.priceItems = [createEmptyPlanPriceItem()];
      }
    }
    dialogVisible.value = true;
  };

  const toApiPayload = () => {
    if (resourceKey.value === "plans") {
      const prices = mapFormItemsToApiPrices(
        (form.priceItems || []) as PlanPriceFormItem[]
      );
      const payload: Record<string, any> = {
        attributes: current.value?.attributes || {},
        planName: String(form.planName || "").trim(),
        description: String(form.description || "").trim(),
        prices
      };
      if (!editingId.value) {
        payload.planCode = String(form.planCode || "").trim();
        payload.status = "ENABLED";
      }
      return payload;
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
      const mediaUrls = getMaterialMediaUrls();
      const resourceUrls = mediaUrls.length
        ? mediaUrls
        : form.resourceUrl
          ? [String(form.resourceUrl)]
          : [];
      return {
        title: form.title,
        type: form.type || "IMAGE",
        categoryId: form.categoryCode,
        resourceUrls,
        coverUrl: form.coverUrl,
        sortNo: Number(form.sortNo || 0),
        ...(!editingId.value ? { status: "ENABLED" } : {})
      };
    }
    if (resourceKey.value === "inspirations") {
      return {
        title: form.title,
        categoryId: form.categoryCode,
        coverUrl: form.coverUrl,
        prompt: form.prompt
      };
    }
    return { ...form };
  };

  const save = () =>
    withSaveLock(async () => {
      if (
        (resourceKey.value === "inspirations" &&
          inspirationBatchUploading.value) ||
        (resourceKey.value === "materials" && materialBatchUploading.value)
      ) {
        ElMessage.warning("媒体上传中，请稍候");
        return;
      }
      const missing = editorFields.value.find(field =>
        isRequiredFieldEmpty(field, form[field.key])
      );
      if (missing) {
        ElMessage.warning(`请填写${missing.label}`);
        return;
      }
      if (resourceKey.value === "plans") {
        const priceError = validatePlanPriceItems(
          (form.priceItems || []) as PlanPriceFormItem[]
        );
        if (priceError) {
          ElMessage.warning(priceError);
          return;
        }
      }
      if (
        resourceKey.value === "inspirations" &&
        !editingId.value &&
        !getInspirationMediaUrls().length
      ) {
        ElMessage.warning("请上传媒体资源");
        return;
      }
      if (
        resourceKey.value === "materials" &&
        !editingId.value &&
        !getMaterialMediaUrls().length
      ) {
        ElMessage.warning("请上传资源文件");
        return;
      }
      if (!canCallManagementApi()) return;
      {
        loading.value = true;
        try {
          const payload = toApiPayload();
          let handled = false;
          if (resourceKey.value === "workflows") {
            editingId.value
              ? await adminApi.updateWorkflow(editingId.value, payload)
              : await adminApi.createWorkflow(payload);
            handled = true;
          } else if (resourceKey.value === "plans") {
            editingId.value
              ? await adminApi.updatePlan(String(form.planCode), payload)
              : await adminApi.createPlan(payload);
            handled = true;
          } else if (resourceKey.value === "pointPackages") {
            editingId.value
              ? await adminApi.updatePointPackage(
                  String(editingId.value),
                  payload
                )
              : await adminApi.createPointPackage(payload);
            handled = true;
          } else if (resourceKey.value === "models") {
            editingId.value
              ? await adminApi.updateModel(
                  String(current.value.modelCode),
                  payload
                )
              : await adminApi.createModel(payload);
            handled = true;
          } else if (resourceKey.value === "prompts") {
            editingId.value
              ? await adminApi.updatePromptTemplate(String(form.code), payload)
              : await adminApi.createPromptTemplate(payload);
            handled = true;
          } else if (resourceKey.value === "inspirations") {
            const mediaUrls = getInspirationMediaUrls();
            const createdCount = !editingId.value ? mediaUrls.length : 0;
            const basePayload = {
              title: form.title,
              categoryId: form.categoryCode,
              prompt: form.prompt
            };
            if (editingId.value) {
              const coverUrls = mediaUrls.length
                ? mediaUrls
                : form.coverUrl
                  ? [String(form.coverUrl)]
                  : [];
              await adminApi.updateInspiration(editingId.value, {
                ...basePayload,
                coverUrl: coverUrls
              });
            } else {
              const coverUrls = mediaUrls.length
                ? mediaUrls
                : form.coverUrl
                  ? [String(form.coverUrl)]
                  : [];
              await adminApi.createInspiration({
                ...basePayload,
                coverUrl: coverUrls
              });
            }
            await loadRemote();
            dialogVisible.value = false;
            if (createdCount > 1) {
              ElMessage.success(`成功发布 ${createdCount} 条灵感`);
            } else {
              ElMessage.success(
                editingId.value ? "接口保存成功" : "接口创建成功"
              );
            }
            return;
          } else if (resourceKey.value === "materials") {
            const mediaUrls = getMaterialMediaUrls();
            const createdCount = !editingId.value ? mediaUrls.length : 0;
            const basePayload = {
              title: form.title,
              type: form.type || "IMAGE",
              categoryId: form.categoryCode,
              sortNo: Number(form.sortNo || 0),
              status: "ENABLED"
            };
            if (editingId.value) {
              const resourceUrls = mediaUrls.length
                ? mediaUrls
                : form.resourceUrl
                  ? [String(form.resourceUrl)]
                  : [];
              await adminApi.updateMaterial(editingId.value, {
                ...basePayload,
                resourceUrls,
                coverUrl:
                  form.coverUrl ||
                  (form.type === "IMAGE" ? resourceUrls[0] : form.coverUrl)
              });
            } else {
              const resourceUrls = mediaUrls.length
                ? mediaUrls
                : form.resourceUrl
                  ? [String(form.resourceUrl)]
                  : [];
              const createPayload: Record<string, any> = {
                ...basePayload,
                resourceUrls
              };
              if (resourceUrls.length === 1 && form.type === "IMAGE") {
                createPayload.coverUrl = form.coverUrl || resourceUrls[0];
              }
              await adminApi.createMaterial(createPayload);
            }
            await loadRemote();
            dialogVisible.value = false;
            if (createdCount > 1) {
              ElMessage.success(`成功发布 ${createdCount} 条素材`);
            } else {
              ElMessage.success(
                editingId.value ? "接口保存成功" : "接口创建成功"
              );
            }
            return;
          } else if (resourceKey.value === "materialCategories") {
            editingId.value
              ? await adminApi.updateMaterialCategory(editingId.value, payload)
              : await adminApi.createMaterialCategory(payload);
            handled = true;
          } else if (resourceKey.value === "categories") {
            editingId.value
              ? await adminApi.updateCategory(String(editingId.value), payload)
              : await adminApi.createCategory(payload);
            handled = true;
          } else if (resourceKey.value === "invoices") {
            editingId.value
              ? await adminApi.updateInvoice(editingId.value, payload)
              : await adminApi.createInvoice(payload);
            handled = true;
          } else if (resourceKey.value === "notifications") {
            const notificationPayload = {
              title: String(form.title || "").trim(),
              content: String(form.content || ""),
              type: String(form.type || "system")
            };
            editingId.value
              ? await adminApi.updateNotification(
                  editingId.value,
                  notificationPayload
                )
              : await adminApi.createNotification(notificationPayload);
            handled = true;
          }

          if (!handled) {
            ElMessage.error("当前资源不支持保存操作");
            return;
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
    });

  const batchRemove = async () => {
    if (!selectedRows.value.length) return;
    if (!canCallManagementApi()) return;
    const rows = [...selectedRows.value];
    const count = rows.length;
    const ids = rows.map(row => String(row.id));
    await ElMessageBox.confirm(
      `确定删除选中的 ${count} 条记录吗？删除后不可恢复。`,
      "批量删除确认",
      { type: "warning" }
    );
    try {
      if (resourceKey.value === "inspirations") {
        await adminApi.batchDeleteInspirations(ids);
      } else if (resourceKey.value === "materials") {
        await adminApi.batchDeleteMaterials(ids);
      } else {
        throw new Error("不支持批量删除该类型记录");
      }
      clearTableSelection();
      await loadRemote();
      ElMessage.success(`成功删除 ${count} 条记录`);
    } catch (error: any) {
      ElMessage.error(error?.message || "批量删除失败");
    }
  };

  const remove = async (row: Record<string, any>) => {
    if (!canCallManagementApi()) return;
    await ElMessageBox.confirm(
      `确定删除“${row.planName || row.packageName || row.modelName || row.name || row.title || row.id}”吗？`,
      "删除确认",
      {
        type: "warning"
      }
    );
    try {
      if (resourceKey.value === "workflows") {
        await adminApi.deleteWorkflow(String(row.id));
      } else if (resourceKey.value === "plans") {
        await adminApi.deletePlan(String(row.id));
      } else if (resourceKey.value === "models") {
        await adminApi.deleteModel(
          String(row.id || row.modelId || row.modelCode)
        );
      } else if (resourceKey.value === "inspirations") {
        await adminApi.deleteInspiration(String(row.id));
      } else if (resourceKey.value === "materials") {
        await adminApi.deleteMaterial(String(row.id));
      } else if (resourceKey.value === "materialCategories") {
        await adminApi.deleteMaterialCategory(String(row.id));
      } else if (resourceKey.value === "categories") {
        await adminApi.deleteCategory(String(row.id));
      } else if (resourceKey.value === "pointPackages") {
        await adminApi.deletePointPackage(String(row.id));
      } else if (resourceKey.value === "notifications") {
        await adminApi.deleteNotification(String(row.id));
      } else {
        ElMessage.error("当前资源不支持删除");
        return;
      }
      await loadRemote();
      ElMessage.success("删除成功");
    } catch (error: any) {
      ElMessage.error(error?.message || "删除失败");
    }
  };

  const toggleStatus = async (row: Record<string, any>) => {
    if (!canCallManagementApi()) return;
    const next = row.status === "启用" ? "停用" : "启用";
    const apiStatus = next === "启用" ? "ENABLED" : "DISABLED";
    try {
      if (resourceKey.value === "users") {
        await adminApi.updateUserStatus(String(row.id), apiStatus);
      } else if (resourceKey.value === "plans") {
        await adminApi.updatePlanStatus(String(row.planCode), apiStatus);
      } else if (resourceKey.value === "models") {
        await adminApi.updateModelStatus(String(row.modelCode), apiStatus);
      } else if (resourceKey.value === "prompts") {
        await adminApi.updatePromptTemplateStatus(String(row.code), apiStatus);
      } else if (resourceKey.value === "inspirations") {
        await adminApi.updateInspirationStatus(String(row.id), apiStatus);
      } else if (resourceKey.value === "materials") {
        await adminApi.updateMaterialStatus(String(row.id), apiStatus);
      } else if (resourceKey.value === "materialCategories") {
        await adminApi.updateMaterialCategoryStatus(String(row.id), apiStatus);
      } else if (resourceKey.value === "categories") {
        await adminApi.updateCategoryStatus(String(row.id), apiStatus);
      } else if (resourceKey.value === "workflows") {
        await adminApi.updateWorkflowStatus(String(row.id), apiStatus);
      } else if (resourceKey.value === "pointPackages") {
        await adminApi.updatePointPackageStatus(String(row.id), apiStatus);
      } else {
        ElMessage.error("当前资源不支持状态变更");
        return;
      }
    } catch (error: any) {
      ElMessage.error(error?.message || "状态更新失败");
      return;
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
    if (resourceKey.value !== "users") {
      userProjects.value = [];
      userProjectsTotal.value = 0;
      return;
    }
    if (!ensureAdminAuthenticated()) return;

    const requestedUserId = String(current.value?.id || "");
    if (!requestedUserId) return;

    const requestedPage = userProjectsPage.value;
    const isCurrent = userProjectsTracker.begin();
    const isLatest = () =>
      isCurrent() &&
      resourceKey.value === "users" &&
      String(current.value?.id || "") === requestedUserId;
    const canCommit = () => isLatest() && detailVisible.value;

    userProjectsLoading.value = true;
    try {
      const payload = await adminApi.userProjects(requestedUserId, {
        page: requestedPage,
        pageSize: userProjectsPageSize
      });
      if (!canCommit()) return;
      userProjects.value = normalizeList(payload);
      userProjectsTotal.value = Number(
        payload?.total ?? userProjects.value.length
      );
    } catch (error: any) {
      if (!canCommit()) return;
      userProjects.value = [];
      userProjectsTotal.value = 0;
      ElMessage.error(error?.message || "用户项目加载失败");
    } finally {
      if (isLatest()) {
        userProjectsLoading.value = false;
      }
    }
  };

  watch(detailVisible, visible => {
    if (visible) return;
    userProjectsTracker.invalidate();
    userProjectsPage.value = 1;
    userProjects.value = [];
    userProjectsTotal.value = 0;
    userProjectsLoading.value = false;
  });

  watch(userProjectsPage, () => {
    if (!detailVisible.value || resourceKey.value !== "users") return;
    loadUserProjects();
  });

  const openUserProjectCanvas = async (project: Record<string, any>) => {
    const requestedUserId = String(current.value?.id || "");
    const requestedProjectId = String(project.id ?? project.projectId ?? "");
    if (!requestedUserId || !requestedProjectId) return;

    const isCurrent = projectCanvasTracker.begin();
    const isLatest = () =>
      isCurrent() && String(current.value?.id || "") === requestedUserId;
    const canCommit = () => isLatest() && projectCanvasVisible.value;

    projectCanvasTitle.value = String(project.title || "项目画布");
    projectCanvasVisible.value = true;
    projectCanvasLoading.value = true;
    projectCanvasPayload.value = null;

    try {
      const payload = (await adminApi.userProjectCanvas(
        requestedUserId,
        requestedProjectId
      )) as Record<string, unknown>;
      if (!canCommit()) return;
      projectCanvasPayload.value = payload;
    } catch (error: any) {
      if (!isLatest()) return;
      projectCanvasVisible.value = false;
      ElMessage.error(error?.message || "画布数据加载失败");
    } finally {
      if (isLatest()) {
        projectCanvasLoading.value = false;
      }
    }
  };

  watch(projectCanvasVisible, visible => {
    if (visible) return;
    projectCanvasTracker.invalidate();
    projectCanvasPayload.value = null;
    projectCanvasLoading.value = false;
  });

  const openPoints = (row: Record<string, any>) => {
    current.value = row;
    pointsForm.adjustAmount = 1000;
    pointsForm.adjustReason = "运营活动赠送";
    pointsVisible.value = true;
  };

  const isPendingTrialApplication = (row: Record<string, any>) =>
    String(row.statusRaw || "").toUpperCase() === "PENDING";

  const reviewTrialApplication = async (
    row: Record<string, any>,
    status: "APPROVED" | "REJECTED",
    rejectReason?: string
  ) => {
    if (!canCallManagementApi()) return;
    if (!isPendingTrialApplication(row)) {
      ElMessage.warning("仅待审批申请可操作");
      return;
    }
    try {
      await adminApi.reviewTrialApplication(row.id, {
        status,
        ...(status === "REJECTED" ? { rejectReason } : {})
      });
    } catch (error: any) {
      ElMessage.error(error?.message || "审批失败");
      return;
    }
    ElMessage.success(
      status === "APPROVED" ? "已通过试用申请" : "已拒绝试用申请"
    );
    await loadRemote();
  };

  const publishNotification = async (row: Record<string, any>) => {
    if (!canCallManagementApi()) return;
    if (String(row.statusRaw || "").toUpperCase() !== "DRAFT") {
      ElMessage.warning("仅草稿消息可以发布");
      return;
    }
    await ElMessageBox.confirm(
      `确定发布「${row.title || row.id}」吗？发布后将不可再编辑。`,
      "发布确认",
      { type: "warning" }
    );
    try {
      await adminApi.publishNotification(String(row.id));
      await loadRemote();
      ElMessage.success("发布成功");
    } catch (error: any) {
      ElMessage.error(error?.message || "发布失败");
    }
  };

  const approveTrialApplication = async (row: Record<string, any>) => {
    try {
      await ElMessageBox.confirm(
        `确认通过「${row.contactName || row.phone || row.id}」的试用申请？`,
        "审核通过",
        {
          type: "warning",
          confirmButtonText: "通过",
          cancelButtonText: "取消"
        }
      );
    } catch {
      return;
    }
    await reviewTrialApplication(row, "APPROVED");
  };

  const rejectTrialApplication = async (row: Record<string, any>) => {
    let rejectReason = "";
    try {
      const result = await ElMessageBox.prompt(
        "拒绝后将无法再次审批，请填写拒绝原因",
        "拒绝试用申请",
        {
          confirmButtonText: "确认拒绝",
          cancelButtonText: "取消",
          inputType: "textarea",
          inputPlaceholder: "请填写拒绝原因",
          inputValidator: value =>
            Boolean(String(value || "").trim()) || "请填写拒绝原因"
        }
      );
      rejectReason = String(result.value || "").trim();
    } catch {
      return;
    }
    await reviewTrialApplication(row, "REJECTED", rejectReason);
  };

  const adjustPoints = () =>
    withAdjustLock(async () => {
      if (!canCallManagementApi()) return;
      try {
        await adminApi.adjustUserPoints(
          String(current.value.id),
          Number(pointsForm.adjustAmount || 0),
          String(pointsForm.adjustReason || "")
        );
      } catch (error: any) {
        ElMessage.error(error?.message || "积分调整失败");
        return;
      }
      current.value.points =
        Number(current.value.points || 0) +
        Number(pointsForm.adjustAmount || 0);
      pointsVisible.value = false;
      ElMessage.success("积分调整成功，流水已记录");
    });

  return {
    dialogVisible,
    detailVisible,
    userProjects,
    userProjectsLoading,
    userProjectsPage,
    userProjectsPageSize,
    userProjectsTotal,
    projectCanvasVisible,
    projectCanvasLoading,
    projectCanvasTitle,
    projectCanvasPayload,
    pointsVisible,
    editingId,
    current,
    pointsForm,
    saving,
    adjustingPoints,
    editorFields,
    parentCategoryOptions,
    openEditor,
    toApiPayload,
    save,
    batchRemove,
    remove,
    toggleStatus,
    openDetail,
    loadUserProjects,
    openUserProjectCanvas,
    openPoints,
    adjustPoints,
    approveTrialApplication,
    rejectTrialApplication,
    publishNotification
  };
};

export type ResourceCrudState = ReturnType<typeof useResourceCrud>;

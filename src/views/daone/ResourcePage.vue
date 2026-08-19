<script setup lang="ts">
import { computed, defineAsyncComponent, reactive } from "vue";
import { useRoute } from "vue-router";
import { formatDateTime, isDateTimeField } from "@/utils/date";
import ResourcePageHero from "./resource-page/components/ResourcePageHero.vue";
import ResourceToolbar from "./resource-page/components/ResourceToolbar.vue";
import ResourceTable from "./resource-page/components/ResourceTable.vue";
import ResourceEditorDialog from "./resource-page/components/ResourceEditorDialog.vue";
import ResourceDetailDrawer from "./resource-page/components/ResourceDetailDrawer.vue";
import UserPointsDialog from "./resource-page/components/UserPointsDialog.vue";
import {
  inputType,
  isCategoryListField,
  isParentCategoryField
} from "./resource-page/resourceFieldUtils";
import {
  formatMaterialType,
  isVideoCoverUrl,
  statusType
} from "./resource-page/resourceFormatters";
import { useBatchMediaUpload } from "./resource-page/useBatchMediaUpload";
import { useResourceCrud } from "./resource-page/useResourceCrud";
import { useResourceList } from "./resource-page/useResourceList";
import "./resource-page/styles/resource-page.scss";

/** X6 画布预览仅在打开项目画布时加载 */
const UserProjectCanvasPreview = defineAsyncComponent(
  () => import("./UserProjectCanvasPreview.vue")
);

defineOptions({ name: "DaoneResourcePage" });

const route = useRoute();
const resourceKey = computed(() => String((route.meta as any).resource || ""));
const form = reactive<Record<string, any>>({});
const list = useResourceList({ resourceKey });
const batchUpload = useBatchMediaUpload({
  resourceKey,
  form,
  isMaterialResource: list.isMaterialResource
});
const crud = useResourceCrud({ resourceKey, form, list, batchUpload });

const {
  config,
  isContentListResource,
  keyword,
  statusFilter,
  categoryFilter,
  payTypeFilter,
  orderDateRange,
  userDateRange,
  modelDateRange,
  categoryOptions,
  categoryOptionsLoading,
  apiError,
  statusFilterOptions,
  orderPayTypeOptions,
  selectedRows,
  paginatedRecords,
  loading,
  isTreeMode,
  isTableFullWidth,
  currentPage,
  pageSize,
  PAGE_SIZES,
  paginationLayout,
  paginationTotal,
  filteredRecords,
  categoryLabelMap,
  detailColumns,
  formatCategoryLevel,
  handleSelectionChange,
  loadRemote,
  resetAndReload,
  useServerPagination,
  tableRef
} = list;

const {
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
  save,
  batchRemove,
  remove,
  toggleStatus,
  openDetail,
  openUserProjectCanvas,
  openPoints,
  adjustPoints,
  approveTrialApplication,
  rejectTrialApplication,
  publishNotification
} = crud;

const {
  activeBatchMediaItems,
  activeBatchUploading,
  activeBatchUploadProgress,
  activeBatchUploadSummary,
  isMaterialUploadDisabled,
  isBatchUploadField,
  isMaterialUploadField,
  getBatchItemDisplayProgress,
  removeBatchMediaItem,
  triggerBatchFileSelect,
  triggerBatchFolderSelect,
  handleBatchDrop,
  isUploadFieldLoading,
  uploadFieldFile
} = batchUpload;

const setTableRef = (instance: any) => {
  tableRef.value = instance;
};
</script>

<template>
  <div v-if="config" class="daone-page">
    <ResourcePageHero :config="config" @create="openEditor()" />

    <section class="table-card">
      <div v-if="apiError" class="resource-error-state">
        <el-alert :title="apiError" type="error" show-icon :closable="false" />
        <el-button type="primary" plain @click="loadRemote()">
          重新加载
        </el-button>
      </div>

      <ResourceToolbar
        v-model:keyword="keyword"
        v-model:status-filter="statusFilter"
        v-model:category-filter="categoryFilter"
        v-model:pay-type-filter="payTypeFilter"
        v-model:order-date-range="orderDateRange"
        v-model:user-date-range="userDateRange"
        v-model:model-date-range="modelDateRange"
        :config="config"
        :resource-key="resourceKey"
        :is-content-list-resource="isContentListResource"
        :category-options="categoryOptions"
        :category-options-loading="categoryOptionsLoading"
        :status-filter-options="statusFilterOptions"
        :order-pay-type-options="orderPayTypeOptions"
        :selected-rows-count="selectedRows.length"
        :allow-delete="config.allowDelete !== false"
        :pagination-total="paginationTotal"
        @reset="resetAndReload"
        @batch-remove="batchRemove"
      />

      <ResourceTable
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :config="config"
        :resource-key="resourceKey"
        :paginated-records="paginatedRecords"
        :loading="loading"
        :is-content-list-resource="isContentListResource"
        :is-tree-mode="isTreeMode"
        :is-table-full-width="isTableFullWidth"
        :page-sizes="PAGE_SIZES"
        :pagination-layout="paginationLayout"
        :pagination-total="paginationTotal"
        :filtered-records-count="filteredRecords.length"
        :use-server-pagination="useServerPagination()"
        :category-label-map="categoryLabelMap"
        :format-category-level="formatCategoryLevel"
        :format-material-type="formatMaterialType"
        :status-type="statusType"
        :is-video-cover-url="isVideoCoverUrl"
        :is-date-time-field="isDateTimeField"
        :format-date-time="formatDateTime"
        :set-table-ref="setTableRef"
        @selection-change="handleSelectionChange"
        @open-detail="openDetail"
        @open-editor="openEditor"
        @open-points="openPoints"
        @toggle-status="toggleStatus"
        @review-approve="approveTrialApplication"
        @review-reject="rejectTrialApplication"
        @publish-notification="publishNotification"
        @remove="remove"
      />
    </section>

    <ResourceEditorDialog
      v-model:visible="dialogVisible"
      :config="config"
      :resource-key="resourceKey"
      :editing-id="editingId"
      :form="form"
      :editor-fields="editorFields"
      :parent-category-options="parentCategoryOptions"
      :category-options="categoryOptions"
      :category-options-loading="categoryOptionsLoading"
      :active-batch-media-items="activeBatchMediaItems"
      :active-batch-uploading="activeBatchUploading"
      :active-batch-upload-progress="activeBatchUploadProgress"
      :active-batch-upload-summary="activeBatchUploadSummary"
      :is-material-upload-disabled="isMaterialUploadDisabled"
      :saving="saving"
      :is-batch-upload-field="isBatchUploadField"
      :is-material-upload-field="isMaterialUploadField"
      :is-category-list-field="isCategoryListField"
      :is-parent-category-field="isParentCategoryField"
      :input-type="inputType"
      :is-video-cover-url="isVideoCoverUrl"
      :is-upload-field-loading="isUploadFieldLoading"
      :get-batch-item-display-progress="getBatchItemDisplayProgress"
      @update:form-value="(key, value) => (form[key] = value)"
      @update:price-items="value => (form.priceItems = value)"
      @save="save"
      @batch-drop="handleBatchDrop"
      @select-batch-files="triggerBatchFileSelect"
      @select-batch-folder="triggerBatchFolderSelect"
      @remove-batch-item="removeBatchMediaItem"
      @upload-file="uploadFieldFile"
    />

    <ResourceDetailDrawer
      v-model:visible="detailVisible"
      v-model:user-projects-page="userProjectsPage"
      :current="current"
      :detail-columns="detailColumns"
      :resource-key="resourceKey"
      :config="config"
      :user-projects="userProjects"
      :user-projects-loading="userProjectsLoading"
      :user-projects-page-size="userProjectsPageSize"
      :user-projects-total="userProjectsTotal"
      :format-date-time="formatDateTime"
      :is-date-time-field="isDateTimeField"
      :status-type="statusType"
      @open-canvas="openUserProjectCanvas"
    />

    <el-dialog
      v-model="projectCanvasVisible"
      :title="projectCanvasTitle"
      width="92%"
      destroy-on-close
      class="project-canvas-dialog"
    >
      <div
        v-if="projectCanvasLoading"
        v-loading="true"
        class="project-canvas-loading"
      />
      <UserProjectCanvasPreview
        v-else-if="projectCanvasPayload"
        :payload="projectCanvasPayload"
      />
      <el-empty v-else description="暂无画布数据" />
    </el-dialog>

    <UserPointsDialog
      v-model:visible="pointsVisible"
      :points-form="pointsForm"
      :current-points="current.points"
      :adjusting-points="adjustingPoints"
      @update:adjust-amount="pointsForm.adjustAmount = $event ?? 0"
      @update:adjust-reason="pointsForm.adjustReason = $event"
      @confirm="adjustPoints"
    />
  </div>
</template>

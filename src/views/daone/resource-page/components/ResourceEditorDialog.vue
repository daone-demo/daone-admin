<script setup lang="ts">
import type { ResourceConfig, ResourceField } from "../../resourceData";
import type { BatchMediaItem } from "../useBatchMediaUpload";
import BatchMediaUploadField from "./BatchMediaUploadField.vue";
import SingleMediaUploadField from "./SingleMediaUploadField.vue";

defineProps<{
  config: ResourceConfig;
  editingId: string;
  form: Record<string, any>;
  editorFields: ResourceField[];
  parentCategoryOptions: Array<{ label: string; value: string | number }>;
  categoryOptions: Array<{ label: string; value: string }>;
  categoryOptionsLoading: boolean;
  activeBatchMediaItems: BatchMediaItem[];
  activeBatchUploading: boolean;
  activeBatchUploadProgress: number;
  activeBatchUploadSummary: {
    total: number;
    success: number;
    failed: number;
    uploading: number;
  };
  isMaterialUploadDisabled: boolean;
  saving: boolean;
  isBatchUploadField: (field: ResourceField) => boolean;
  isMaterialUploadField: (field: ResourceField) => boolean;
  isCategoryListField: (field: ResourceField) => boolean;
  isParentCategoryField: (field: ResourceField) => boolean;
  inputType: (field: ResourceField) => string;
  isVideoCoverUrl: (url: string) => boolean;
  isUploadFieldLoading: (key: string) => boolean;
  getBatchItemDisplayProgress: (item: BatchMediaItem) => number;
}>();

const visible = defineModel<boolean>("visible", { required: true });

defineEmits<{
  save: [];
  "batch-drop": [field: ResourceField, event: DragEvent];
  "select-batch-files": [field: ResourceField];
  "select-batch-folder": [field: ResourceField];
  "remove-batch-item": [field: ResourceField, uid: string];
  "upload-file": [field: ResourceField, file: File];
}>();
</script>

<template>
  <el-dialog
    v-model="visible"
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
        <BatchMediaUploadField
          v-else-if="field.type === 'upload' && isBatchUploadField(field)"
          :field="field"
          :items="activeBatchMediaItems"
          :uploading="activeBatchUploading"
          :disabled="isMaterialUploadDisabled"
          :progress="activeBatchUploadProgress"
          :summary="activeBatchUploadSummary"
          :is-video-url="isVideoCoverUrl"
          :get-item-progress="getBatchItemDisplayProgress"
          @drop="
            (uploadField, event) => $emit('batch-drop', uploadField, event)
          "
          @select-files="$emit('select-batch-files', $event)"
          @select-folder="$emit('select-batch-folder', $event)"
          @remove="
            (uploadField, uid) => $emit('remove-batch-item', uploadField, uid)
          "
        />
        <SingleMediaUploadField
          v-else-if="field.type === 'upload'"
          :model-value="String(form[field.key] || '')"
          :field="field"
          :loading="isUploadFieldLoading(field.key)"
          :disabled="isMaterialUploadDisabled"
          :is-material-upload-field="isMaterialUploadField(field)"
          :is-video-url="isVideoCoverUrl"
          @update:model-value="form[field.key] = $event"
          @upload="
            (uploadField, file) => $emit('upload-file', uploadField, file)
          "
        />
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
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="activeBatchUploading || saving"
        @click="$emit('save')"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.w-full {
  width: 100%;
}
</style>

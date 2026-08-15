<script setup lang="ts">
import type { ResourceField } from "../../resourceData";
import type { BatchMediaItem } from "../useBatchMediaUpload";

defineProps<{
  field: ResourceField;
  items: BatchMediaItem[];
  uploading: boolean;
  disabled: boolean;
  progress: number;
  summary: {
    total: number;
    success: number;
    failed: number;
    uploading: number;
  };
  isVideoUrl: (url: string) => boolean;
  getItemProgress: (item: BatchMediaItem) => number;
}>();

defineEmits<{
  drop: [field: ResourceField, event: DragEvent];
  "select-files": [field: ResourceField];
  "select-folder": [field: ResourceField];
  remove: [field: ResourceField, uid: string];
}>();
</script>

<template>
  <div class="media-upload batch-media-upload">
    <div
      class="batch-upload-zone"
      :class="{ 'is-disabled': uploading || disabled }"
      @drop.prevent="!disabled && $emit('drop', field, $event)"
      @dragover.prevent
    >
      <IconifyIconOnline icon="ri:upload-cloud-2-line" />
      <p>拖拽图片/视频或文件夹到此处上传</p>
      <small>{{ disabled ? "请先选择资源类型" : "支持批量并发上传" }}</small>
      <div class="batch-upload-actions">
        <el-button
          size="small"
          :disabled="uploading || disabled"
          @click.stop="$emit('select-files', field)"
        >
          选择文件
        </el-button>
        <el-button
          size="small"
          :disabled="uploading || disabled"
          @click.stop="$emit('select-folder', field)"
        >
          选择文件夹
        </el-button>
      </div>
    </div>
    <div v-if="items.length || uploading" class="batch-upload-progress">
      <div class="batch-upload-progress-head">
        <span>
          已完成 {{ summary.success }}/{{ summary.total }}
          <template v-if="summary.uploading">
            （上传中 {{ summary.uploading }}）
          </template>
        </span>
        <span v-if="summary.failed">失败 {{ summary.failed }}</span>
      </div>
      <el-progress
        :percentage="progress"
        :status="uploading ? undefined : summary.failed ? 'warning' : 'success'"
      />
    </div>
    <div v-if="items.length" class="batch-upload-list">
      <div v-for="item in items" :key="item.uid" class="batch-upload-item">
        <div class="batch-upload-thumb">
          <img
            v-if="item.url && !isVideoUrl(item.url)"
            :src="item.url"
            :alt="item.name"
          />
          <video
            v-else-if="item.url && isVideoUrl(item.url)"
            :src="item.url"
            muted
          />
          <div v-else class="batch-upload-thumb-placeholder">
            <IconifyIconOnline icon="ri:file-image-line" />
          </div>
        </div>
        <div class="batch-upload-meta">
          <span class="batch-upload-name" :title="item.name">
            {{ item.name }}
          </span>
          <el-progress
            v-if="item.status === 'uploading'"
            :percentage="getItemProgress(item)"
            :stroke-width="6"
          />
          <small
            v-else-if="item.status === 'success'"
            class="batch-upload-status success"
          >
            上传成功
          </small>
          <small
            v-else-if="item.status === 'error'"
            class="batch-upload-status error"
          >
            {{ item.error || "上传失败" }}
          </small>
          <small v-else class="batch-upload-status">等待上传</small>
        </div>
        <el-button
          link
          type="danger"
          :disabled="uploading"
          @click="$emit('remove', field, item.uid)"
        >
          移除
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.media-upload {
  width: 100%;
}

.batch-media-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-upload-zone {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 20px;
  color: #7a7d8b;
  text-align: center;
  background: #faf9fc;
  border: 1px dashed #d8d5e5;
  border-radius: 12px;
  transition: 0.2s;

  &:hover,
  &.is-dragover {
    border-color: #b8aef0;
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  svg,
  .iconify {
    font-size: 28px;
    color: #8d7df0;
  }

  p {
    margin: 0;
    font-weight: 600;
    color: #4f5160;
  }

  small {
    color: #a0a2aa;
  }
}

.batch-upload-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.batch-upload-progress {
  padding: 12px 14px;
  background: #faf9fc;
  border: 1px solid #efeaf8;
  border-radius: 12px;
}

.batch-upload-progress-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #6d7080;
}

.batch-upload-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
}

.batch-upload-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #efeaf8;
  border-radius: 12px;
}

.batch-upload-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  overflow: hidden;
  background: #f5f3fa;
  border-radius: 8px;

  img,
  video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.batch-upload-thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #b8b9c3;
}

.batch-upload-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.batch-upload-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #4f5160;
  white-space: nowrap;
}

.batch-upload-status.success {
  color: #67c23a;
}

.batch-upload-status.error {
  color: #f56c6c;
}
</style>

<script setup lang="ts">
import type { ResourceField } from "../../resourceData";

const props = defineProps<{
  field: ResourceField;
  modelValue: string;
  loading: boolean;
  disabled: boolean;
  isMaterialUploadField: boolean;
  isVideoUrl: (url: string) => boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  upload: [field: ResourceField, file: File];
}>();

const upload = async ({ file }: { file: File }) => {
  emit("upload", props.field, file);
};
</script>

<template>
  <div
    class="media-upload"
    :class="{ 'media-upload--disabled': isMaterialUploadField && disabled }"
  >
    <el-upload
      class="media-uploader"
      :show-file-list="false"
      :accept="field.accept || 'image/*,video/*'"
      :disabled="loading || (isMaterialUploadField && disabled)"
      :http-request="upload"
    >
      <div v-if="modelValue" class="media-preview">
        <img
          v-if="!isVideoUrl(String(modelValue))"
          :src="modelValue"
          alt="封面预览"
        />
        <video v-else :src="modelValue" controls @click.stop />
        <div class="media-preview-mask">
          <span>{{ loading ? "上传中..." : "重新上传" }}</span>
        </div>
      </div>
      <div v-else class="media-upload-trigger">
        <IconifyIconOnline icon="ri:upload-cloud-2-line" />
        <span>
          {{
            loading
              ? "上传中..."
              : isMaterialUploadField && disabled
                ? "请先选择资源类型"
                : "点击上传图片或视频"
          }}
        </span>
      </div>
    </el-upload>
    <el-button
      v-if="modelValue"
      link
      type="danger"
      :disabled="loading"
      @click="emit('update:modelValue', '')"
    >
      移除封面
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.media-upload,
.media-uploader {
  width: 100%;
}

.media-upload--disabled .media-upload-trigger,
.media-upload--disabled .media-preview {
  cursor: not-allowed;
  opacity: 0.55;
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

  &:hover {
    border-color: #b8aef0;
  }
}

.media-upload-trigger {
  svg,
  .iconify {
    font-size: 28px;
    color: #8d7df0;
  }
}

.media-preview {
  img,
  video {
    display: block;
    width: 100%;
    max-height: 220px;
    object-fit: cover;
  }

  &:hover .media-preview-mask {
    opacity: 1;
  }
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
</style>

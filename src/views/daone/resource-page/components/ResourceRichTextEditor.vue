<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import type {
  IDomEditor,
  IEditorConfig,
  IToolbarConfig
} from "@wangeditor/editor";
import "@wangeditor/editor/dist/css/style.css";
import { ElMessage } from "element-plus";
import { adminApi } from "@/api/admin";

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const editorRef = shallowRef<IDomEditor>();
const html = ref(props.modelValue || "");

watch(
  () => props.modelValue,
  value => {
    const next = value || "";
    if (next === html.value) return;
    html.value = next;
  }
);

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: [
    "group-video",
    "insertVideo",
    "uploadVideo",
    "fullScreen",
    "codeBlock",
    "todo"
  ]
};

const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder || "请输入内容",
  readOnly: Boolean(props.disabled),
  MENU_CONF: {
    uploadImage: {
      customUpload: async (
        file: File,
        insertFn: (url: string, alt: string, href: string) => void
      ) => {
        try {
          const result = await adminApi.uploadFile(file);
          const url = String(result.url || "");
          if (!url) throw new Error("上传成功但未返回图片地址");
          insertFn(url, file.name, url);
        } catch (error: unknown) {
          ElMessage.error(
            error instanceof Error ? error.message : "图片上传失败"
          );
        }
      }
    }
  }
};

const handleCreated = (editor: IDomEditor) => {
  editorRef.value = editor;
};

watch(html, value => {
  emit("update:modelValue", value);
});

onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (!editor) return;
  editor.destroy();
  editorRef.value = undefined;
});
</script>

<template>
  <div class="rich-text-editor">
    <Toolbar
      class="rich-text-editor__toolbar"
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="default"
    />
    <Editor
      v-model="html"
      class="rich-text-editor__body"
      :default-config="editorConfig"
      mode="default"
      @on-created="handleCreated"
    />
  </div>
</template>

<style scoped lang="scss">
.rich-text-editor {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.rich-text-editor__toolbar {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.rich-text-editor__body {
  min-height: 220px;
  overflow-y: hidden;

  :deep(.w-e-text-container) {
    min-height: 220px;
  }

  :deep(.w-e-scroll) {
    min-height: 220px;
  }
}
</style>

<script setup lang="ts">
/**
 * 富文本异步加载占位：避免首开时大块空白，同时不阻塞弹窗其它字段。
 */
</script>

<template>
  <div class="rich-text-editor-loading" aria-busy="true">
    <span class="rich-text-editor-loading__text">编辑器加载中…</span>
  </div>
</template>

<style scoped lang="scss">
.rich-text-editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 260px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-blank);
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
}

.rich-text-editor-loading__text {
  font-size: 13px;
}
</style>

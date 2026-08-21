/** 富文本编辑器异步入口：供空闲预取与 defineAsyncComponent 共用 */
export function loadResourceRichTextEditor() {
  return import(
    /* webpackChunkName: "resource-rich-text-editor" */
    "./ResourceRichTextEditor.vue"
  );
}

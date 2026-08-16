<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "vue";
import {
  extractCanvasPreviewSnapshot,
  type CanvasPreviewSnapshot
} from "./canvasPreviewUtils";

const LONG_PRESS_MS = 320;
const LONG_PRESS_MOVE_CANCEL_PX = 6;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const STAGE_HEIGHT = 600;

const props = defineProps<{
  payload: unknown | null;
}>();

const containerRef = ref<HTMLElement | null>(null);
const zoomPercent = ref(100);
const snapshot = computed(() => extractCanvasPreviewSnapshot(props.payload));

let graph: import("@antv/x6").Graph | null = null;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let cleanupPanListeners: (() => void) | null = null;

function syncZoomPercent() {
  if (!graph) return;
  zoomPercent.value = Math.round(graph.zoom() * 100);
}

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function applyViewport(viewport: CanvasPreviewSnapshot["viewport"]) {
  if (!graph) return;
  graph.zoomTo(clampZoom(viewport.zoom || 1));
  graph.centerContent();
  syncZoomPercent();
}

function fitCanvas() {
  if (!graph) return;
  const nodes = graph.getNodes();
  if (!nodes.length) {
    graph.centerContent();
    graph.zoomTo(1);
    syncZoomPercent();
    return;
  }
  graph.zoomToFit({ padding: 48, maxScale: 1 });
  syncZoomPercent();
}

function resolveInitialView(data: CanvasPreviewSnapshot) {
  if (
    data.viewport.zoom !== 1 &&
    data.viewport.zoom >= MIN_ZOOM &&
    data.viewport.zoom <= MAX_ZOOM
  ) {
    applyViewport(data.viewport);
  } else {
    fitCanvas();
  }
}

async function mountGraph() {
  await nextTick();
  const container = containerRef.value;
  const data = snapshot.value;
  if (!container || !data) return;

  destroyGraph();

  const width = container.clientWidth;
  const height =
    container.clientHeight > 0 ? container.clientHeight : STAGE_HEIGHT;

  // 打开预览时再拉取 X6，避免 ResourcePage 同步依赖图编辑器
  const { Graph } = await import("@antv/x6");

  graph = new Graph({
    container,
    width: width > 0 ? width : undefined,
    height: height > 0 ? height : STAGE_HEIGHT,
    autoResize: true,
    background: { color: "#f3f4f6" },
    grid: {
      visible: true,
      size: 16,
      type: "dot",
      args: { color: "#d1d5db", thickness: 1 }
    },
    panning: false,
    mousewheel: {
      enabled: true,
      modifiers: null,
      factor: 1.08,
      minScale: MIN_ZOOM,
      maxScale: MAX_ZOOM,
      zoomAtMousePosition: true
    },
    interacting: {
      nodeMovable: false,
      edgeMovable: false,
      edgeLabelMovable: false,
      magnetConnectable: false
    }
  });

  graph.fromJSON(data.graph);

  await nextTick();
  graph.resize(container.clientWidth, STAGE_HEIGHT);

  resolveInitialView(data);

  graph.on("scale", syncZoomPercent);
  bindLongPressPan();
}

function bindLongPressPan() {
  if (!graph) return;

  const graphContainer = graph.container;
  let pressButtonDown = false;
  let pressStart: { x: number; y: number } | null = null;
  let panActive = false;
  let panLast = { x: 0, y: 0 };
  let documentListenersBound = false;

  const clearTimer = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const unbindDocumentListeners = () => {
    if (!documentListenersBound) return;
    documentListenersBound = false;
    document.removeEventListener("mousemove", onDocumentMouseMove, true);
    document.removeEventListener("mouseup", onDocumentPointerEnd, true);
    document.removeEventListener("pointerup", onDocumentPointerEnd, true);
    document.removeEventListener("pointercancel", onDocumentPointerEnd, true);
  };

  const endInteraction = () => {
    clearTimer();
    pressButtonDown = false;
    pressStart = null;
    unbindDocumentListeners();
    if (panActive) {
      panActive = false;
      graphContainer.classList.remove("is-panning");
      graphContainer.style.cursor = "grab";
    }
  };

  const bindDocumentListeners = () => {
    if (documentListenersBound) return;
    documentListenersBound = true;
    document.addEventListener("mousemove", onDocumentMouseMove, true);
    document.addEventListener("mouseup", onDocumentPointerEnd, true);
    document.addEventListener("pointerup", onDocumentPointerEnd, true);
    document.addEventListener("pointercancel", onDocumentPointerEnd, true);
  };

  const onDocumentMouseMove = (event: MouseEvent) => {
    if (panActive) {
      if (!graph) return;
      event.preventDefault();
      const dx = event.clientX - panLast.x;
      const dy = event.clientY - panLast.y;
      panLast.x = event.clientX;
      panLast.y = event.clientY;
      graph.translateBy(dx, dy);
      return;
    }

    if (!pressStart || !pressButtonDown) return;
    const dx = event.clientX - pressStart.x;
    const dy = event.clientY - pressStart.y;
    if (
      dx * dx + dy * dy >
      LONG_PRESS_MOVE_CANCEL_PX * LONG_PRESS_MOVE_CANCEL_PX
    ) {
      endInteraction();
    }
  };

  const onDocumentPointerEnd = (event: MouseEvent | PointerEvent) => {
    if ("button" in event && event.button !== 0) return;
    endInteraction();
  };

  const activatePan = () => {
    if (!graph || !pressStart || !pressButtonDown || panActive) return;

    panActive = true;
    panLast = { x: pressStart.x, y: pressStart.y };
    graphContainer.classList.add("is-panning");
    graphContainer.style.cursor = "grabbing";
  };

  const onContainerMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    if (event.detail >= 2) return;
    if (panActive) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
      return;

    pressButtonDown = true;
    pressStart = { x: event.clientX, y: event.clientY };
    clearTimer();
    bindDocumentListeners();
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      activatePan();
    }, LONG_PRESS_MS);
  };

  const onWindowBlur = () => {
    endInteraction();
  };

  graphContainer.addEventListener("mousedown", onContainerMouseDown, true);
  window.addEventListener("blur", onWindowBlur);
  graphContainer.style.cursor = "grab";

  cleanupPanListeners = () => {
    endInteraction();
    window.removeEventListener("blur", onWindowBlur);
    graphContainer.removeEventListener("mousedown", onContainerMouseDown, true);
    graphContainer.classList.remove("is-panning");
    graphContainer.style.cursor = "";
  };
}

function destroyGraph() {
  if (cleanupPanListeners) {
    cleanupPanListeners();
    cleanupPanListeners = null;
  }
  if (graph) {
    graph.dispose();
    graph = null;
  }
}

function zoomBy(delta: number) {
  if (!graph) return;
  const next = clampZoom(graph.zoom() + delta);
  graph.zoomTo(next);
  syncZoomPercent();
}

function resetView() {
  const data = snapshot.value;
  if (!graph || !data) return;
  resolveInitialView(data);
}

onMounted(() => {
  void mountGraph();
});

watch(
  () => props.payload,
  () => {
    void mountGraph();
  }
);

onBeforeUnmount(() => {
  destroyGraph();
});
</script>

<template>
  <div class="user-project-canvas-preview">
    <div class="user-project-canvas-preview__toolbar">
      <span class="user-project-canvas-preview__hint"
        >长按鼠标拖拽移动画布</span
      >
      <div class="user-project-canvas-preview__zoom">
        <el-button size="small" @click="zoomBy(-0.1)">−</el-button>
        <span>{{ zoomPercent }}%</span>
        <el-button size="small" @click="zoomBy(0.1)">+</el-button>
        <el-button size="small" @click="resetView">重置视图</el-button>
      </div>
    </div>
    <div
      v-if="snapshot"
      ref="containerRef"
      class="user-project-canvas-preview__stage"
    />
    <el-empty v-else description="暂无画布数据" />
  </div>
</template>

<style scoped lang="scss">
.user-project-canvas-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-project-canvas-preview__toolbar {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.user-project-canvas-preview__hint {
  font-size: 13px;
  color: #6b7280;
}

.user-project-canvas-preview__zoom {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: #374151;
}

.user-project-canvas-preview__stage {
  flex: none;
  width: 100%;
  height: 600px;
  min-height: 600px;
  max-height: 600px;
  overflow: hidden;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;

  &.is-panning,
  &.is-panning * {
    cursor: grabbing !important;
    user-select: none;
  }

  :deep(image),
  :deep(img) {
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }
}
</style>

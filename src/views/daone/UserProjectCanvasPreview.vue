<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "vue";
import { Graph } from "@antv/x6";
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

let graph: Graph | null = null;
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
  let longPressPanActive = false;
  let panOrigin = { tx: 0, ty: 0, x: 0, y: 0 };

  const clearTimer = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const clearPressWatch = () => {
    clearTimer();
    pressStart = null;
    pressButtonDown = false;
    window.removeEventListener("mousemove", onPressMove);
    window.removeEventListener("mouseup", onPressUp);
  };

  const stopPan = () => {
    if (!longPressPanActive) return;
    longPressPanActive = false;
    graphContainer.style.cursor = "grab";
    window.removeEventListener("mousemove", onPanMove);
    window.removeEventListener("mouseup", onPanUp);
  };

  const onPanMove = (event: MouseEvent) => {
    if (!graph || !longPressPanActive) return;
    const dx = event.clientX - panOrigin.x;
    const dy = event.clientY - panOrigin.y;
    graph.translate(panOrigin.tx + dx, panOrigin.ty + dy);
  };

  const onPanUp = () => {
    stopPan();
    clearPressWatch();
  };

  const activateLongPressPan = () => {
    if (!graph || !pressStart || longPressPanActive) return;

    longPressPanActive = true;
    clearTimer();
    const translate = graph.translate();
    panOrigin = {
      tx: translate.tx,
      ty: translate.ty,
      x: pressStart.x,
      y: pressStart.y
    };
    graphContainer.style.cursor = "grabbing";
    window.addEventListener("mousemove", onPanMove);
    window.addEventListener("mouseup", onPanUp);
  };

  const onPressMove = (event: MouseEvent) => {
    if (!pressStart || longPressPanActive) return;
    const dx = event.clientX - pressStart.x;
    const dy = event.clientY - pressStart.y;
    if (
      dx * dx + dy * dy >
      LONG_PRESS_MOVE_CANCEL_PX * LONG_PRESS_MOVE_CANCEL_PX
    ) {
      clearPressWatch();
    }
  };

  const onPressUp = () => {
    pressButtonDown = false;
    if (longPressPanActive) {
      stopPan();
      return;
    }
    clearPressWatch();
  };

  const onBlankMouseDown = ({ e }: { e: MouseEvent }) => {
    if (e.button !== 0) return;
    if (e.detail >= 2) return;
    if (longPressPanActive) return;

    pressButtonDown = true;
    pressStart = { x: e.clientX, y: e.clientY };
    clearTimer();
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      if (!pressStart || !pressButtonDown) return;
      activateLongPressPan();
    }, LONG_PRESS_MS);

    window.addEventListener("mousemove", onPressMove);
    window.addEventListener("mouseup", onPressUp);
  };

  graph.on("blank:mousedown", onBlankMouseDown);
  graphContainer.style.cursor = "grab";

  cleanupPanListeners = () => {
    stopPan();
    clearPressWatch();
    graph?.off("blank:mousedown", onBlankMouseDown);
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
}
</style>

export type CanvasPreviewViewport = {
  zoom: number;
  translateX: number;
  translateY: number;
  scrollLeft: number;
  scrollTop: number;
};

export type CanvasPreviewSnapshot = {
  graph: { cells: Record<string, unknown>[] };
  viewport: CanvasPreviewViewport;
  projectName?: string;
};

const KIND_LABELS: Record<string, string> = {
  text: "文本",
  image: "图片",
  video: "视频",
  imageGen: "图生图",
  model3d: "3D 模型"
};

function isEdgeCell(cell: Record<string, unknown>) {
  return Boolean(cell.source && cell.target) || cell.shape === "edge";
}

function resolveNodeLabel(data: Record<string, unknown>) {
  const title = String(data.title || "").trim();
  if (title) return title;
  const kind = String(data.kind || "").trim();
  if (kind && KIND_LABELS[kind]) return KIND_LABELS[kind];
  return kind || "节点";
}

export function toReadonlyCanvasCells(
  cells: Record<string, unknown>[]
): Record<string, unknown>[] {
  return cells.map(cell => {
    if (isEdgeCell(cell)) {
      return {
        ...cell,
        interacting: false
      };
    }

    const data = (cell.data as Record<string, unknown>) || {};
    const size =
      (cell.size as { width?: number; height?: number } | undefined) ?? {};
    const position =
      (cell.position as { x?: number; y?: number } | undefined) ?? {};
    const width = Number(size.width ?? 200);
    const height = Number(size.height ?? 150);
    const x = Number(position.x ?? 0);
    const y = Number(position.y ?? 0);
    const previewUrl = String(
      data.previewUrl || data.coverUrl || data.thumbnailUrl || ""
    ).trim();
    const label = resolveNodeLabel(data);

    if (previewUrl) {
      return {
        id: cell.id,
        shape: "image",
        x,
        y,
        width,
        height,
        attrs: {
          image: {
            href: previewUrl,
            width,
            height,
            preserveAspectRatio: "xMidYMid meet"
          },
          label: {
            text: label,
            refY: -6,
            fontSize: 11,
            fill: "#6b7280"
          }
        },
        data: { readonly: true }
      };
    }

    return {
      id: cell.id,
      shape: "rect",
      x,
      y,
      width,
      height,
      label,
      attrs: {
        body: {
          fill: "#f9fafb",
          stroke: "#e5e7eb",
          rx: 8,
          ry: 8
        },
        label: {
          text: label,
          fill: "#374151",
          fontSize: 12
        }
      },
      data: { readonly: true }
    };
  });
}

export function extractCanvasPreviewSnapshot(
  payload: unknown
): CanvasPreviewSnapshot | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const canvasRoot =
    (root.canvasData as Record<string, unknown> | undefined) ??
    (root.canvas as Record<string, unknown> | undefined) ??
    root;

  if (!canvasRoot || typeof canvasRoot !== "object") return null;

  const graph = canvasRoot.graph as
    | { cells?: Record<string, unknown>[] }
    | undefined;
  const cells =
    graph?.cells ?? (canvasRoot as { cells?: Record<string, unknown>[] }).cells;

  if (!Array.isArray(cells)) return null;

  const viewportRaw = canvasRoot.viewport as
    | Partial<CanvasPreviewViewport>
    | undefined;

  return {
    graph: { cells: toReadonlyCanvasCells(cells) },
    viewport: {
      zoom: Number(viewportRaw?.zoom ?? 1),
      translateX: Number(viewportRaw?.translateX ?? 0),
      translateY: Number(viewportRaw?.translateY ?? 0),
      scrollLeft: Number(viewportRaw?.scrollLeft ?? 0),
      scrollTop: Number(viewportRaw?.scrollTop ?? 0)
    },
    projectName: String(
      (canvasRoot.meta as Record<string, unknown> | undefined)?.projectName ||
        ""
    ).trim()
  };
}

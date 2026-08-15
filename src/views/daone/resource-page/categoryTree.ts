export type CategoryTreeLinkMode = "parentCode" | "parentId";

export const getCategoryNodeKey = (linkMode: CategoryTreeLinkMode) =>
  linkMode === "parentId" ? "id" : "categoryCode";

export const buildCategoryTree = (
  items: Array<Record<string, any>>,
  linkMode: CategoryTreeLinkMode = "parentCode"
) => {
  const nodeKey = getCategoryNodeKey(linkMode);
  const map = new Map<string, Record<string, any>>();
  const roots: Array<Record<string, any>> = [];

  items.forEach(item => {
    map.set(String(item[nodeKey]), { ...item, children: [] });
  });

  items.forEach(item => {
    const key = String(item[nodeKey]);
    const node = map.get(key);
    if (!node) return;
    const parentValue = String(item[linkMode] ?? "").trim();
    if (parentValue && map.has(parentValue)) {
      map.get(parentValue)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: Array<Record<string, any>>) => {
    nodes.sort((a, b) => Number(a.sortNo || 0) - Number(b.sortNo || 0));
    nodes.forEach(node => {
      if (node.children?.length) {
        sortNodes(node.children);
      } else {
        delete node.children;
      }
    });
  };
  sortNodes(roots);
  return roots;
};

export const filterCategoriesWithParents = (
  items: Array<Record<string, any>>,
  predicate: (item: Record<string, any>) => boolean,
  linkMode: CategoryTreeLinkMode = "parentCode"
) => {
  const nodeKey = getCategoryNodeKey(linkMode);
  const codeToItem = new Map(items.map(item => [String(item[nodeKey]), item]));
  const matched = new Set<string>();

  items.forEach(item => {
    if (!predicate(item)) return;
    matched.add(String(item[nodeKey]));
    let parentValue = String(item[linkMode] ?? "").trim();
    while (parentValue && codeToItem.has(parentValue)) {
      matched.add(parentValue);
      parentValue = String(
        codeToItem.get(parentValue)?.[linkMode] ?? ""
      ).trim();
    }
  });

  return items.filter(item => matched.has(String(item[nodeKey])));
};

export const flattenMaterialCategoryTree = (
  nodes: Array<Record<string, any>>,
  parentId: string | number | null = null
): Array<Record<string, any>> => {
  const result: Array<Record<string, any>> = [];
  (nodes || []).forEach(node => {
    const { children = [], ...rest } = node;
    const normalizedParentId = rest.parentId ?? parentId ?? "";
    result.push({
      ...rest,
      parentId:
        normalizedParentId === null || normalizedParentId === undefined
          ? ""
          : normalizedParentId
    });
    if (children.length) {
      result.push(...flattenMaterialCategoryTree(children, rest.id));
    }
  });
  return result;
};

export const buildCategorySelectOptions = (
  items: Array<Record<string, any>>,
  valueKey: "id" | "categoryCode" = "categoryCode"
) => {
  const idToName = new Map(
    items.map(item => [
      String(item.id || item.categoryCode),
      String(item.categoryName)
    ])
  );

  return [...items]
    .sort((a, b) => {
      const aParent = String(a.parentId || "").trim();
      const bParent = String(b.parentId || "").trim();
      if (aParent !== bParent) return aParent.localeCompare(bParent);
      return Number(a.sortNo || 0) - Number(b.sortNo || 0);
    })
    .map(item => {
      const parentId = String(item.parentId || "").trim();
      const parentName = parentId ? idToName.get(parentId) : "";
      const label = parentName
        ? `${parentName} / ${item.categoryName}`
        : String(item.categoryName);
      const value =
        valueKey === "id"
          ? String(item.id || item.categoryCode)
          : String(item.categoryCode || item.id);
      return {
        label,
        value
      };
    });
};

export const normalizeCategoryItems = (items: Array<Record<string, any>>) =>
  items.map(item => ({
    ...item,
    id: String(item.id || item.categoryCode || ""),
    categoryCode: String(item.categoryCode || item.code || item.id || ""),
    categoryName: String(
      item.categoryName || item.name || item.categoryCode || ""
    ),
    parentId:
      item.parentId === null ||
      item.parentId === undefined ||
      item.parentId === ""
        ? ""
        : String(item.parentId),
    scope: String(item.scope || "ALL"),
    status: String(item.status || "ENABLED"),
    sortNo: Number(item.sortNo || 0),
    level: Number(item.level ?? 1)
  }));

export const normalizeMaterialCategoryItems = (
  items: Array<Record<string, any>>
) =>
  items.map(item => ({
    ...item,
    id: String(item.id || ""),
    categoryCode: String(item.categoryCode || ""),
    categoryName: String(item.categoryName || item.categoryCode || ""),
    parentId:
      item.parentId === null ||
      item.parentId === undefined ||
      item.parentId === ""
        ? ""
        : String(item.parentId),
    status: String(item.status || "ENABLED"),
    sortNo: Number(item.sortNo || 0)
  }));

export const isCategoryEnabled = (item: Record<string, any>) =>
  ["ENABLED", "启用"].includes(String(item.status || ""));

export const isRelevantCategoryScope = (
  item: Record<string, any>,
  categoryScope?: "INSPIRATION" | "MATERIAL"
) => {
  const scope = String(item.scope || "");
  if (categoryScope === "MATERIAL") {
    return ["ALL", "MATERIAL"].includes(scope);
  }
  if (categoryScope === "INSPIRATION") {
    return ["ALL", "INSPIRATION"].includes(scope);
  }
  return true;
};

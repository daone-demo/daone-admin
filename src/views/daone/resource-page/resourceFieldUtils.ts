import type { ResourceField } from "../resourceData";

export const inputType = (field: ResourceField) =>
  field.type === "textarea"
    ? "textarea"
    : field.type === "number"
      ? "number"
      : "text";

export const isParentCategoryField = (field: ResourceField) =>
  field.optionsFrom === "topLevelCategories";

export const isCategoryListField = (field: ResourceField) =>
  field.optionsFrom === "categoryList";

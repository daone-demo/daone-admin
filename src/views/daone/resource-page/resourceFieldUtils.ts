import type { ResourceField } from "../resourceData";

export const inputType = (field: ResourceField) =>
  field.type === "textarea"
    ? "textarea"
    : field.type === "number"
      ? "number"
      : "text";

export const isRichTextEmpty = (html: unknown) => {
  const value = String(html ?? "");
  const text = value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, "");
  return !text && !/<img\b/i.test(value);
};

export const isRequiredFieldEmpty = (field: ResourceField, value: unknown) => {
  if (!field.required) return false;
  if (field.type === "richtext") return isRichTextEmpty(value);
  return !String(value ?? "").trim();
};

export const isParentCategoryField = (field: ResourceField) =>
  field.optionsFrom === "topLevelCategories";

export const isCategoryListField = (field: ResourceField) =>
  field.optionsFrom === "categoryList";

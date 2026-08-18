import { formatRecordDates } from "@/utils/date";
import {
  buildPlanPriceItems,
  formatInvoiceStatus,
  formatOrderPayType,
  formatOrderStatus,
  formatTrialApplicationStatus
} from "./resourceFormatters";

export const normalizeList = (payload: any) =>
  Array.isArray(payload) ? payload : payload?.items || payload?.records || [];

export const normalizeCategoryRows = (items: any[]) => {
  const normalizeStatus = (value: string) =>
    value === "DISABLED" ? "停用" : value === "ENABLED" ? "启用" : value;

  const rows = items.map(item => {
    const parentIdRaw = item.parentId ?? "";
    const parentId =
      parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === ""
        ? ""
        : String(parentIdRaw);
    const level = Number(item.level ?? (parentId ? 2 : 1));
    return {
      ...item,
      id: String(item.id || item.categoryCode || item.code),
      categoryCode: String(item.categoryCode || item.code || item.id || ""),
      categoryName: String(item.categoryName || item.name || ""),
      parentId,
      level,
      status: normalizeStatus(item.status)
    };
  });
  const codeToId = new Map(
    rows.map(row => [String(row.categoryCode), String(row.id)])
  );
  return rows.map(row => {
    if (row.parentId) return row;
    const legacyParentCode = String(row.parentCode || "").trim();
    if (!legacyParentCode) return row;
    return {
      ...row,
      parentId: codeToId.get(legacyParentCode) || legacyParentCode
    };
  });
};

export const fetchPaginatedResource = async (
  fetcher: (params: { page: number; pageSize: number }) => Promise<any>
) => {
  const batchSize = 100;
  let page = 1;
  const all: any[] = [];

  while (true) {
    const payload = await fetcher({ page, pageSize: batchSize });
    const items = normalizeList(payload);
    all.push(...items);
    const total = Number(payload?.total ?? all.length);
    if (!items.length || items.length < batchSize || all.length >= total) break;
    page += 1;
    if (page > 100) break;
  }

  return all;
};

export const normalizeRemoteRows = (items: any[], resourceKey: string) => {
  const normalizeStatus = (value: string) =>
    value === "DISABLED" ? "停用" : value === "ENABLED" ? "启用" : value;

  let rows: Array<Record<string, any>>;

  if (resourceKey === "users") {
    rows = items.map(item => ({
      ...item,
      id: String(item.id),
      subscriptionStatus: String(item.subscriptionStatus || ""),
      status: item.status === "ENABLED" ? "启用" : "停用",
      memberStatus:
        item.subscriptionStatus === "ACTIVE"
          ? "会员"
          : item.subscriptionStatus === "EXPIRED"
            ? "非会员"
            : item.memberStatus === "MEMBER"
              ? "会员"
              : item.memberStatus === "NON_MEMBER"
                ? "非会员"
                : "-"
    }));
  } else if (resourceKey === "orders") {
    rows = items.map(item => ({
      ...item,
      id: item.orderNo,
      amountYuan: Number(item.amountFen || 0) / 100,
      payType: formatOrderPayType(item.payType),
      status: formatOrderStatus(item.status)
    }));
  } else if (resourceKey === "invoices") {
    rows = items.map(item => ({
      ...item,
      id: item.id || item.invoiceId,
      amountYuan: Number(item.amountFen || 0) / 100,
      statusRaw: String(item.status || ""),
      status: formatInvoiceStatus(item.status)
    }));
  } else if (resourceKey === "trialApplications") {
    rows = items.map(item => ({
      ...item,
      id: String(item.id ?? ""),
      contactName: String(item.contactName || ""),
      phone: String(item.phone || ""),
      position: String(item.position || "-"),
      userId: item.userId ?? "-",
      rejectReason: String(item.rejectReason || "-"),
      reviewedBy: item.reviewedBy ?? "-",
      statusRaw: String(item.status || ""),
      status: formatTrialApplicationStatus(item.status)
    }));
  } else if (resourceKey === "plans") {
    rows = items.map(plan => {
      const prices = plan.prices || [];
      const firstPrice = prices[0] || {};
      const priceItems = buildPlanPriceItems(prices);
      const benefitsFromPrices = prices.flatMap((price: any) => {
        if (Array.isArray(price.benefits) && price.benefits.length) {
          return price.benefits.map((item: unknown) => String(item).trim());
        }
        return String(price.benefitsText || "")
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter(Boolean);
      });
      const legacyBenefits = Array.isArray(plan.benefits)
        ? plan.benefits.map((item: unknown) => String(item).trim())
        : [];
      const benefitList = (
        benefitsFromPrices.length ? benefitsFromPrices : legacyBenefits
      ).filter(Boolean);
      const uniqueBenefits = [...new Set(benefitList)];
      return {
        ...plan,
        id: plan.id || plan.planCode,
        description: String(plan.description || ""),
        benefitsText: uniqueBenefits.join("\n"),
        benefitSummary: uniqueBenefits.join("；"),
        benefitList: uniqueBenefits,
        status: plan.status === "ENABLED" ? "启用" : "停用",
        priceCode: String(firstPrice.priceCode || ""),
        cycleUnit: String(firstPrice.cycleUnit || "MONTH"),
        cycleCount: Number(firstPrice.cycleCount || 1),
        priceYuan: Number(firstPrice.priceFen || 0) / 100,
        originalPriceYuan: Number(firstPrice.originalPriceFen || 0) / 100,
        grantPoints: Number(firstPrice.grantPoints || 0),
        priceSummary: priceItems.map(item => item.priceText).join("、"),
        priceItems
      };
    });
  } else if (resourceKey === "models") {
    rows = items.map(item => ({
      ...item,
      id: item.id || item.modelCode,
      countMin: item.parameters?.count?.min ?? 1,
      countMax: item.parameters?.count?.max ?? 1,
      status: item.status === "ENABLED" ? "启用" : "停用"
    }));
  } else if (resourceKey === "pointPackages") {
    rows = items.map(item => ({
      ...item,
      id: String(item.id),
      grantPoints: Number(item.grantPoints || 0),
      bonusPoints: Number(item.bonusPoints || 0),
      priceYuan: Number(item.priceFen || 0) / 100,
      status: normalizeStatus(item.status)
    }));
  } else if (resourceKey === "workflows") {
    rows = items.map(item => ({
      ...item,
      id: item.id || item.workflowId,
      workflowDataText: JSON.stringify(item.workflowData || {}, null, 2),
      nodeCount: item.nodeCount ?? Object.keys(item.workflowData || {}).length,
      status: normalizeStatus(item.status)
    }));
  } else if (resourceKey === "materials") {
    rows = items.map(item => ({
      ...item,
      id: String(item.id),
      type: String(item.type || ""),
      sortNo: Number(item.sortNo || 0),
      updatedAt: item.updatedAt || item.gmtModified || item.createdAt,
      status: normalizeStatus(item.status)
    }));
  } else if (resourceKey === "inspirations") {
    rows = items.map(item => ({
      ...item,
      id: String(item.id),
      categoryName: String(item.categoryName || ""),
      categoryCode: String(item.categoryId || item.categoryCode || ""),
      updatedAt: item.updatedAt || item.gmtModified || item.createdAt,
      status: normalizeStatus(item.status)
    }));
  } else if (resourceKey === "materialCategories") {
    rows = items.map(item => {
      const parentId =
        item.parentId === null || item.parentId === undefined
          ? ""
          : item.parentId;
      const level = Number(
        item.level ?? (parentId !== "" && parentId !== null ? 2 : 1)
      );
      return {
        ...item,
        id: String(item.id),
        categoryCode: String(item.categoryCode || ""),
        categoryName: String(item.categoryName || ""),
        parentId:
          parentId === "" || parentId === null || parentId === undefined
            ? ""
            : String(parentId),
        level,
        status: normalizeStatus(item.status)
      };
    });
  } else if (resourceKey === "categories") {
    rows = normalizeCategoryRows(items);
  } else {
    rows = items.map(item => ({
      ...item,
      id: item.id || item.code,
      status: normalizeStatus(item.status || "ENABLED")
    }));
  }

  return rows.map(row => formatRecordDates(row));
};

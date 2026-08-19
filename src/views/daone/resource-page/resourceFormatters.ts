export const orderPayTypeLabels: Record<string, string> = {
  WECHAT: "微信",
  ALIPAY: "支付宝",
  BALANCE: "余额"
};

export const orderStatusLabels: Record<string, string> = {
  PAID: "已支付",
  PENDING: "待支付",
  PAYING: "支付中",
  CANCELLED: "已取消",
  CANCELED: "已取消",
  REFUNDED: "已退款"
};

export const orderStatusOptions = [
  { label: "待支付", value: "PENDING" },
  { label: "支付中", value: "PAYING" },
  { label: "已支付", value: "PAID" },
  { label: "已取消", value: "CANCELLED" },
  { label: "已退款", value: "REFUNDED" }
];

export const invoiceStatusLabels: Record<string, string> = {
  PENDING: "待开票",
  PROCESSING: "开票中",
  ISSUED: "已开票",
  REJECTED: "已驳回"
};

export const invoiceStatusOptions = [
  { label: "待开票", value: "PENDING" },
  { label: "开票中", value: "PROCESSING" },
  { label: "已开票", value: "ISSUED" },
  { label: "已驳回", value: "REJECTED" }
];

export const trialApplicationStatusLabels: Record<string, string> = {
  PENDING: "待审批",
  APPROVED: "已通过",
  REJECTED: "已拒绝"
};

export const trialApplicationStatusOptions = [
  { label: "待审批", value: "PENDING" },
  { label: "已通过", value: "APPROVED" },
  { label: "已拒绝", value: "REJECTED" }
];

export const notificationStatusLabels: Record<string, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布"
};

export const notificationStatusOptions = [
  { label: "草稿", value: "DRAFT" },
  { label: "已发布", value: "PUBLISHED" }
];

export const notificationTypeLabels: Record<string, string> = {
  system: "系统",
  update: "更新",
  activity: "活动"
};

export const userSubscriptionStatusOptions = [
  { label: "会员", value: "ACTIVE" },
  { label: "非会员", value: "EXPIRED" }
];

export const orderPayTypeOptions = [
  { label: "微信", value: "WECHAT" },
  { label: "支付宝", value: "ALIPAY" }
];

export const materialStatusOptions = [
  { label: "启用", value: "ENABLED" },
  { label: "停用", value: "DISABLED" }
];

export const materialTypeLabels: Record<string, string> = {
  IMAGE: "图片",
  VIDEO: "视频",
  TEXT: "文字"
};

export const formatOrderPayType = (value: string) =>
  orderPayTypeLabels[String(value || "").toUpperCase()] || value;

export const formatOrderStatus = (value: string) =>
  orderStatusLabels[String(value || "").toUpperCase()] || value;

export const formatInvoiceStatus = (value: string) =>
  invoiceStatusLabels[String(value || "").toUpperCase()] || value;

export const formatTrialApplicationStatus = (value: string) =>
  trialApplicationStatusLabels[String(value || "").toUpperCase()] || value;

export const formatNotificationStatus = (value: string) =>
  notificationStatusLabels[String(value || "").toUpperCase()] || value;

export const formatNotificationType = (value: string) =>
  notificationTypeLabels[String(value || "").toLowerCase()] || value || "-";

export const formatMaterialType = (value: string) =>
  materialTypeLabels[String(value || "").toUpperCase()] || value;

const PLAN_CYCLE_UNIT_LABEL: Record<string, string> = {
  MONTH: "月",
  YEAR: "年",
  DAY: "天"
};

export const formatPlanCycleLabel = (cycleCount: number, cycleUnit: string) => {
  const unit = PLAN_CYCLE_UNIT_LABEL[cycleUnit] || cycleUnit;
  const count = Number(cycleCount || 1);
  return count > 1 ? `${count}${unit}` : unit;
};

export const buildPlanPriceItems = (prices: any[] = []) =>
  (prices || []).map(price => {
    const yuan = Number(price.priceFen || 0) / 100;
    const originalYuan = Number(price.originalPriceFen || 0) / 100;
    const cycle = formatPlanCycleLabel(
      Number(price.cycleCount || 1),
      String(price.cycleUnit || "MONTH")
    );
    const benefits = Array.isArray(price.benefits)
      ? price.benefits
          .map((item: unknown) => String(item).trim())
          .filter(Boolean)
      : String(price.benefitsText || "")
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter(Boolean);
    return {
      priceCode: String(price.priceCode || ""),
      priceText: `¥${yuan.toLocaleString()}/${cycle}`,
      originalText:
        originalYuan > yuan ? `¥${originalYuan.toLocaleString()}` : "",
      grantPoints: Number(price.grantPoints || 0),
      benefits,
      status: price.status === "ENABLED" ? "启用" : "停用"
    };
  });

export const statusType = (value: string) => {
  if (["会员", "MEMBER"].includes(value)) return "success";
  if (["非会员", "NON_MEMBER"].includes(value)) return "info";
  if (
    [
      "启用",
      "已支付",
      "已开票",
      "有效会员",
      "PAID",
      "ENABLED",
      "ISSUED",
      "APPROVED",
      "已通过",
      "已发布"
    ].includes(value)
  )
    return "success";
  if (
    [
      "待支付",
      "待开票",
      "开票中",
      "待审批",
      "过期会员",
      "PENDING",
      "PAYING",
      "PROCESSING",
      "草稿"
    ].includes(value)
  )
    return "warning";
  if (
    ["停用", "已取消", "已拒绝", "REJECTED", "CANCELED", "CANCELLED"].includes(
      value
    )
  )
    return "danger";
  return "primary";
};

export const isVideoCoverUrl = (url: string) =>
  /\.(mp4|webm|ogg|mov|m4v|avi)(\?|$)/i.test(url);

export type FieldType = "text" | "textarea" | "number" | "select" | "upload";

export interface ResourceField {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  /** 动态选项来源 */
  optionsFrom?: "topLevelCategories" | "categoryList";
  required?: boolean;
  accept?: string;
  /** 仅在新增时展示，编辑时隐藏（如模型编码） */
  createOnly?: boolean;
  /** 暂时隐藏，不在表单中展示 */
  hidden?: boolean;
}

export interface ResourceConfig {
  title: string;
  description: string;
  icon: string;
  color: string;
  apiResource?:
    | "workflows"
    | "users"
    | "invoices"
    | "orders"
    | "plans"
    | "pointPackages"
    | "models"
    | "prompts"
    | "inspirations"
    | "categories"
    | "materials"
    | "materialCategories";
  /** 分类资源的 scope，用于素材等业务隔离 */
  categoryScope?: "INSPIRATION" | "MATERIAL";
  allowCreate?: boolean;
  allowDelete?: boolean;
  allowStatus?: boolean;
  createText?: string;
  searchable?: string[];
  /** 表格列均分铺满容器宽度 */
  tableFullWidth?: boolean;
  /** 树形表格，通过 parentCode 构建父子层级 */
  treeMode?: boolean;
  /** 隐藏顶部统计卡片 */
  hideMetrics?: boolean;
  /** 搜索框占位文案 */
  searchPlaceholder?: string;
  /** 使用接口参数进行服务端筛选 */
  serverFilters?: boolean;
  /** 使用服务端分页（按 page/pageSize 请求） */
  serverPagination?: boolean;
  /** 服务端分页默认每页条数 */
  defaultPageSize?: number;
  /** 固定分页大小，隐藏每页条数切换 */
  fixedPageSize?: boolean;
  fields: ResourceField[];
  columns: Array<{
    key: string;
    label: string;
    width?: number;
    minWidth?: number;
  }>;
}

export const resourceConfigs: Record<string, ResourceConfig> = {
  workflows: {
    title: "工作流管理",
    description: "维护创作工作流、封面与画布节点配置",
    icon: "ri:flow-chart",
    color: "#6c5ce7",
    apiResource: "workflows",
    allowDelete: true,
    allowStatus: true,
    createText: "新建工作流",
    searchable: ["name", "description", "categoryCode", "categoryName"],
    fields: [
      { key: "name", label: "工作流名称", required: true },
      { key: "description", label: "工作流说明", type: "textarea" },
      {
        key: "categoryCode",
        label: "分类编码",
        type: "select",
        options: ["BRAND", "POSTER", "ECOMMERCE", "VIDEO"]
      },
      { key: "categoryName", label: "分类名称" },
      {
        key: "workflowDataText",
        label: "工作流 JSON",
        type: "textarea",
        required: true
      }
    ],
    columns: [
      { key: "name", label: "工作流" },
      { key: "categoryName", label: "场景" },
      { key: "categoryCode", label: "分类编码" },
      { key: "nodeCount", label: "节点数", width: 100 },
      { key: "updatedAt", label: "更新时间" },
      { key: "status", label: "状态", width: 100 }
    ]
  },
  users: {
    title: "用户管理",
    description: "查看用户、会员套餐、积分与项目使用情况",
    icon: "ri:user-3-line",
    color: "#0984e3",
    apiResource: "users",
    allowCreate: false,
    allowDelete: false,
    allowStatus: true,
    searchable: ["nickname", "phone", "companyName", "id"],
    fields: [],
    columns: [
      { key: "nickname", label: "用户昵称" },
      { key: "phone", label: "手机号" },
      { key: "companyName", label: "公司/品牌" },
      { key: "position", label: "岗位" },
      { key: "role", label: "角色", width: 100 },
      { key: "createdAt", label: "注册时间" },
      { key: "lastUsedAt", label: "最近使用时间" },
      { key: "memberStatus", label: "会员状态", width: 100 }
    ]
  },
  invoices: {
    title: "开票管理",
    description: "审核开票申请并维护发票开具与寄送状态",
    icon: "ri:bill-line",
    color: "#00b894",
    apiResource: "invoices",
    allowCreate: false,
    allowDelete: false,
    allowStatus: true,
    createText: "新增开票申请",
    searchable: ["id", "invoiceTitle", "orderNo", "userId"],
    fields: [
      { key: "userId", label: "用户 ID", required: true },
      { key: "orderNo", label: "订单号", required: true },
      { key: "invoiceTitle", label: "发票抬头", required: true },
      { key: "taxNo", label: "税号", required: true },
      {
        key: "invoiceType",
        label: "发票类型",
        type: "select",
        options: ["VAT_NORMAL", "VAT_SPECIAL"]
      },
      { key: "amountFen", label: "开票金额（分）", type: "number" }
    ],
    columns: [
      { key: "id", label: "申请编号" },
      { key: "invoiceTitle", label: "发票抬头" },
      { key: "orderNo", label: "关联订单" },
      { key: "invoiceType", label: "类型" },
      { key: "amountYuan", label: "金额（元）" },
      { key: "createdAt", label: "申请时间" },
      { key: "status", label: "状态", width: 110 }
    ]
  },
  models: {
    title: "模型管理",
    description: "配置 AI 能力、任务类型、积分成本与调用状态",
    icon: "ri:brain-line",
    color: "#e17055",
    apiResource: "models",
    allowDelete: false,
    allowStatus: true,
    createText: "新增模型",
    searchable: ["modelName", "modelCode", "taskType"],
    fields: [
      { key: "modelName", label: "模型名称", required: true, createOnly: true },
      { key: "modelCode", label: "模型编码", required: true, createOnly: true },
      {
        key: "taskType",
        label: "任务类型",
        type: "select",
        options: ["IMAGE", "VIDEO", "TEXT", "MODEL"],
        required: true,
        createOnly: true
      },
      { key: "basePoints", label: "基础积分", type: "number", required: true },
      { key: "countMin", label: "最小生成数量", type: "number" },
      { key: "countMax", label: "最大生成数量", type: "number" }
    ],
    columns: [
      { key: "modelName", label: "模型名称" },
      { key: "modelCode", label: "模型编码" },
      { key: "taskType", label: "任务类型" },
      { key: "basePoints", label: "基础积分" },
      { key: "calls", label: "今日调用" },
      { key: "updatedAt", label: "更新时间" },
      { key: "status", label: "状态", width: 100 }
    ]
  },
  plans: {
    title: "套餐管理",
    description: "维护前台会员套餐、计费周期、价格与积分权益",
    icon: "ri:vip-crown-line",
    color: "#fdcb6e",
    apiResource: "plans",
    hideMetrics: true,
    allowDelete: true,
    allowStatus: true,
    tableFullWidth: true,
    createText: "新增套餐",
    searchPlaceholder: "搜索套餐名称、编码或描述",
    searchable: [
      "planName",
      "planCode",
      "description",
      "benefitSummary",
      "priceSummary"
    ],
    fields: [
      { key: "planCode", label: "套餐编码", required: true, createOnly: true },
      { key: "planName", label: "套餐名称", required: true },
      { key: "description", label: "套餐描述", type: "textarea" },
      { key: "benefitsText", label: "套餐权益（每行一项）", type: "textarea" },
      { key: "priceCode", label: "价格编码", required: true },
      {
        key: "cycleUnit",
        label: "计费周期",
        type: "select",
        options: ["MONTH", "YEAR"],
        required: true
      },
      { key: "cycleCount", label: "周期数量", type: "number" },
      { key: "priceYuan", label: "售价（元）", type: "number", required: true },
      { key: "originalPriceYuan", label: "原价（元）", type: "number" },
      { key: "grantPoints", label: "赠送积分", type: "number", required: true }
    ],
    columns: [
      { key: "planName", label: "套餐", minWidth: 160 },
      { key: "planCode", label: "套餐编码", minWidth: 120 },
      { key: "description", label: "套餐描述", minWidth: 180 },
      { key: "priceSummary", label: "计费价格", minWidth: 150 },
      { key: "grantPoints", label: "赠送积分", minWidth: 100 },
      { key: "benefitSummary", label: "套餐权益", minWidth: 240 },
      { key: "status", label: "状态", width: 100 }
    ]
  },
  pointPackages: {
    title: "积分套餐",
    description: "维护前台星积分充值档位、积分数量与售价",
    icon: "ri:coin-line",
    color: "#6a5ae0",
    apiResource: "pointPackages",
    hideMetrics: true,
    allowDelete: true,
    allowStatus: true,
    tableFullWidth: true,
    createText: "新增积分套餐",
    searchable: ["packageCode", "packageName"],
    fields: [
      {
        key: "packageCode",
        label: "套餐编码",
        required: true,
        createOnly: true
      },
      { key: "packageName", label: "套餐名称", required: true },
      { key: "grantPoints", label: "基础积分", type: "number", required: true },
      { key: "bonusPoints", label: "额外赠送积分", type: "number" },
      { key: "priceYuan", label: "金额（元）", type: "number", required: true },
      { key: "sortOrder", label: "排序", type: "number" }
    ],
    columns: [
      { key: "packageCode", label: "套餐编码", minWidth: 120 },
      { key: "packageName", label: "套餐名称", minWidth: 140 },
      { key: "grantPoints", label: "基础积分", minWidth: 100 },
      { key: "bonusPoints", label: "赠送积分", minWidth: 100 },
      { key: "priceYuan", label: "金额", minWidth: 100 },
      { key: "sortOrder", label: "排序", minWidth: 80 },
      { key: "status", label: "状态", width: 100 }
    ]
  },
  inspirations: {
    title: "灵感发现",
    description: "运营前台灵感瀑布流内容、作者数据与排序",
    icon: "ri:lightbulb-flash-line",
    color: "#e84393",
    apiResource: "inspirations",
    serverFilters: true,
    allowDelete: true,
    createText: "发布灵感",
    fields: [
      // { key: "title", label: "标题", required: true },
      {
        key: "categoryCode",
        label: "分类",
        type: "select",
        optionsFrom: "categoryList"
      },
      {
        key: "coverUrl",
        label: "封面",
        type: "upload",
        accept: "image/*,video/*"
      },
      { key: "prompt", label: "创作提示词", type: "textarea" }
    ],
    columns: [
      { key: "categoryName", label: "分类" },
      { key: "coverUrl", label: "封面" },
      { key: "prompt", label: "创作提示词" },
      { key: "updatedAt", label: "更新时间" },
      { key: "status", label: "状态", width: 100 }
    ]
  },
  categories: {
    title: "分类管理",
    description: "管理灵感发现与模板内容的分类层级",
    icon: "ri:folder-3-line",
    color: "#00cec9",
    apiResource: "categories",
    treeMode: true,
    serverFilters: true,
    serverPagination: true,
    defaultPageSize: 1000,
    fixedPageSize: true,
    createText: "新增分类",
    allowDelete: true,
    allowStatus: true,
    searchable: ["categoryName"],
    fields: [
      { key: "categoryName", label: "分类名称", required: true },
      {
        key: "parentId",
        label: "父级分类",
        type: "select",
        optionsFrom: "topLevelCategories"
      },
      { key: "sortNo", label: "排序", type: "number" }
    ],
    columns: [
      { key: "categoryName", label: "分类名称" },
      { key: "level", label: "类目等级", width: 110 },
      { key: "contentCount", label: "内容数" },
      { key: "sortNo", label: "排序" },
      { key: "status", label: "状态", width: 100 }
    ]
  },
  orders: {
    title: "订单管理",
    description: "查看套餐订单、支付渠道、金额与交易状态",
    icon: "ri:bank-card-line",
    color: "#636e72",
    apiResource: "orders",
    serverFilters: true,
    searchPlaceholder: "搜索订单号、用户 ID 或商品",
    allowCreate: false,
    allowDelete: false,
    searchable: ["orderNo", "userId", "productName", "payType"],
    fields: [],
    columns: [
      { key: "orderNo", label: "订单号" },
      { key: "userId", label: "用户 ID" },
      { key: "productName", label: "商品" },
      { key: "amountYuan", label: "金额（元）" },
      { key: "payType", label: "支付方式" },
      { key: "createdAt", label: "下单时间" },
      { key: "status", label: "状态", width: 100 }
    ]
  },
  prompts: {
    title: "提示词模板",
    description: "维护 AI 场景使用的系统提示词模板",
    icon: "ri:quill-pen-line",
    color: "#8e44ad",
    apiResource: "prompts",
    allowDelete: false,
    createText: "新增提示词模板",
    searchable: ["name", "code", "scenario", "content"],
    fields: [
      { key: "name", label: "模板名称", required: true },
      { key: "code", label: "模板编码" },
      {
        key: "scenario",
        label: "使用场景",
        type: "select",
        options: ["GENERAL", "TEXT", "IMAGE", "VIDEO"]
      },
      { key: "content", label: "模板内容", type: "textarea", required: true }
    ],
    columns: [
      { key: "name", label: "模板名称" },
      { key: "code", label: "模板编码" },
      { key: "scenario", label: "使用场景" },
      { key: "content", label: "模板内容" },
      { key: "updatedAt", label: "更新时间" },
      { key: "status", label: "状态", width: 100 }
    ]
  },
  materials: {
    title: "素材列表",
    description: "运营前台素材瀑布流内容、作者数据与排序",
    icon: "ri:folder-image-line",
    color: "#6c5ce7",
    apiResource: "materials",
    serverFilters: true,
    allowDelete: true,
    allowStatus: true,
    createText: "发布素材",
    fields: [
      // { key: "title", label: "标题", required: true },
      {
        key: "type",
        label: "资源类型",
        type: "select",
        options: ["IMAGE", "VIDEO"],
        required: true
      },
      {
        key: "categoryCode",
        label: "分类",
        type: "select",
        optionsFrom: "categoryList",
        required: true
      },
      {
        key: "resourceUrl",
        label: "资源文件",
        type: "upload",
        accept: "image/*,video/*"
      },
      {
        key: "coverUrl",
        label: "封面",
        type: "upload",
        accept: "image/*",
        hidden: true
      },
      { key: "sortNo", label: "排序", type: "number" }
    ],
    columns: [
      // { key: "title", label: "素材内容" },
      { key: "type", label: "类型", width: 90 },
      { key: "categoryName", label: "分类" },
      { key: "resourceUrl", label: "资源地址", width: 120 },
      { key: "sortNo", label: "排序", width: 80 },
      { key: "updatedAt", label: "更新时间" },
      { key: "status", label: "状态", width: 100 }
    ]
  },
  materialCategories: {
    title: "素材分类",
    description: "管理素材内容的分类层级",
    icon: "ri:folder-3-line",
    color: "#a29bfe",
    apiResource: "materialCategories",
    treeMode: true,
    createText: "新增分类",
    allowDelete: true,
    allowStatus: true,
    searchable: ["categoryName"],
    fields: [
      { key: "categoryName", label: "分类名称", required: true },
      {
        key: "parentId",
        label: "父级分类",
        type: "select",
        optionsFrom: "topLevelCategories"
      },
      { key: "sortNo", label: "排序", type: "number" }
    ],
    columns: [
      { key: "categoryName", label: "分类名称" },
      { key: "level", label: "类目等级", width: 110 },
      { key: "sortNo", label: "排序" },
      { key: "status", label: "状态", width: 100 }
    ]
  }
};

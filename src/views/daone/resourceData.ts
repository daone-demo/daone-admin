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
  records: Array<Record<string, any>>;
}

const status = (enabled = true) => (enabled ? "启用" : "停用");

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
    ],
    records: [
      {
        id: "WF-1024",
        name: "电商主图批量生成",
        description: "商品图上传、抠图、场景生成与导出",
        categoryCode: "ECOMMERCE",
        categoryName: "电商营销",
        workflowDataText: "{}",
        nodeCount: 12,
        owner: "运营管理员",
        updatedAt: "2026-06-18 11:26",
        status: status()
      },
      {
        id: "WF-1023",
        name: "品牌海报工作流",
        description: "品牌信息到多尺寸活动海报",
        categoryCode: "POSTER",
        categoryName: "海报广告",
        workflowDataText: "{}",
        nodeCount: 9,
        owner: "设计运营",
        updatedAt: "2026-06-17 16:40",
        status: status()
      },
      {
        id: "WF-1022",
        name: "短视频分镜生成",
        description: "脚本拆解、分镜图与视频片段生成",
        categoryCode: "VIDEO",
        categoryName: "视频分镜",
        workflowDataText: "{}",
        nodeCount: 18,
        owner: "内容运营",
        updatedAt: "2026-06-16 09:15",
        status: status(false)
      }
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
    ],
    records: [
      {
        id: "U-33456",
        nickname: "李阳",
        phone: "18958012675",
        companyName: "阳和设计工作室",
        position: "品牌运营",
        role: "USER",
        points: 12003,
        createdAt: "2026-05-12",
        lastUsedAt: "2026-06-18 10:20",
        memberStatus: "会员"
      },
      {
        id: "U-33455",
        nickname: "林一设计",
        phone: "13788918891",
        companyName: "林一视觉",
        position: "设计师",
        role: "USER",
        points: 28660,
        createdAt: "2026-05-10",
        lastUsedAt: "2026-06-17 16:40",
        memberStatus: "会员"
      },
      {
        id: "U-33454",
        nickname: "BrandLab",
        phone: "18630213021",
        companyName: "BrandLab",
        position: "市场总监",
        role: "USER",
        points: 98600,
        createdAt: "2026-04-28",
        lastUsedAt: "2026-06-16 09:25",
        memberStatus: "非会员"
      },
      {
        id: "U-33453",
        nickname: "运营管理员",
        phone: "18958012675",
        companyName: "",
        position: "管理员",
        role: "ADMIN",
        points: 120,
        createdAt: "2026-06-16",
        lastUsedAt: "2026-06-18 11:26",
        memberStatus: "非会员"
      }
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
      { key: "appliedAt", label: "申请时间" },
      { key: "status", label: "状态", width: 110 }
    ],
    records: [
      {
        id: "INV-26061801",
        invoiceTitle: "杭州星图创意有限公司",
        userId: "10001",
        taxNo: "913301********221X",
        orderNo: "DN20260618001",
        invoiceType: "VAT_NORMAL",
        amountFen: 599900,
        amountYuan: 5999,
        appliedAt: "2026-06-18 10:21",
        status: "待开票"
      },
      {
        id: "INV-26061703",
        invoiceTitle: "上海一格品牌设计有限公司",
        userId: "10002",
        taxNo: "913101********08XK",
        orderNo: "DN20260617018",
        invoiceType: "VAT_SPECIAL",
        amountFen: 1299900,
        amountYuan: 12999,
        appliedAt: "2026-06-17 15:08",
        status: "开票中"
      },
      {
        id: "INV-26061605",
        invoiceTitle: "深圳像素文化科技有限公司",
        userId: "10003",
        taxNo: "914403********91A2",
        orderNo: "DN20260616009",
        invoiceType: "VAT_NORMAL",
        amountFen: 899900,
        amountYuan: 8999,
        appliedAt: "2026-06-16 13:50",
        status: "已开票"
      }
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
    ],
    records: []
  },
  plans: {
    title: "套餐管理",
    description: "维护前台会员套餐、计费周期、价格与积分权益",
    icon: "ri:vip-crown-line",
    color: "#fdcb6e",
    apiResource: "plans",
    hideMetrics: true,
    allowDelete: false,
    allowStatus: true,
    createText: "新增套餐",
    searchable: ["name", "code"],
    fields: [
      { key: "planName", label: "套餐名称" },
      { key: "planCode", label: "套餐编码" },
      { key: "benefitsText", label: "套餐权益（每行一项）", type: "textarea" }
    ],
    columns: [
      { key: "planName", label: "套餐" },
      { key: "planCode", label: "套餐编码" },
      { key: "benefitSummary", label: "套餐权益" },
      { key: "status", label: "状态", width: 100 }
    ],
    records: []
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
    ],
    records: [
      {
        id: "1",
        packageCode: "RC50",
        packageName: "50元充值",
        grantPoints: 500,
        bonusPoints: 0,
        priceFen: 5000,
        priceYuan: 50,
        sortOrder: 1,
        status: "启用"
      },
      {
        id: "2",
        packageCode: "RC100",
        packageName: "100元充值",
        grantPoints: 1000,
        bonusPoints: 0,
        priceFen: 10000,
        priceYuan: 100,
        sortOrder: 2,
        status: "启用"
      }
    ]
  },
  inspirations: {
    title: "灵感发现",
    description: "运营前台灵感瀑布流内容、作者数据与排序",
    icon: "ri:lightbulb-flash-line",
    color: "#e84393",
    apiResource: "inspirations",
    allowDelete: true,
    createText: "发布灵感",
    searchable: ["title", "category", "author"],
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
      { key: "title", label: "灵感内容" },
      { key: "categoryCode", label: "分类" },
      { key: "coverUrl", label: "封面" },
      { key: "prompt", label: "创作提示词" },
      { key: "updatedAt", label: "更新时间" },
      { key: "status", label: "状态", width: 100 }
    ],
    records: [
      {
        id: "I-01",
        title: "品牌视觉案例",
        categoryCode: "BRAND",
        coverUrl: "https://picsum.photos/seed/daone-brand/320/200",
        prompt: "为新消费品牌生成一套现代视觉海报",
        updatedAt: "2026-06-18 10:20",
        status: status()
      },
      {
        id: "I-02",
        title: "夏日饮品海报",
        categoryCode: "POSTER",
        coverUrl: "https://picsum.photos/seed/daone-poster/320/200",
        prompt: "夏日冰饮促销海报，清爽高饱和色彩",
        updatedAt: "2026-06-17 16:40",
        status: status()
      },
      {
        id: "I-03",
        title: "未来感产品概念",
        categoryCode: "PRODUCT",
        coverUrl: "https://picsum.photos/seed/daone-product/320/200",
        prompt: "未来科技产品概念设计，银色材质",
        updatedAt: "2026-06-16 09:25",
        status: status()
      }
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
    ],
    records: [
      {
        id: "10101",
        categoryName: "品牌设计",
        categoryCode: "BRAND",
        parentCode: "",
        scope: "ALL",
        contentCount: 128,
        sortNo: 10,
        status: status()
      },
      {
        id: "10102",
        categoryName: "海报与广告",
        categoryCode: "POSTER",
        parentCode: "",
        scope: "ALL",
        contentCount: 96,
        sortNo: 20,
        status: status()
      },
      {
        id: "10103",
        categoryName: "插画",
        categoryCode: "ILLUSTRATION",
        parentCode: "",
        scope: "INSPIRATION",
        contentCount: 74,
        sortNo: 30,
        status: status()
      },
      {
        id: "10104",
        categoryName: "UI 界面",
        categoryCode: "UI",
        parentCode: "",
        scope: "ALL",
        contentCount: 52,
        sortNo: 40,
        status: status()
      },
      {
        id: "10105",
        categoryName: "角色设计",
        categoryCode: "CHARACTER",
        parentCode: "",
        scope: "INSPIRATION",
        contentCount: 0,
        sortNo: 50,
        status: status()
      },
      {
        id: "10111",
        categoryName: "Logo 设计",
        categoryCode: "BRAND_LOGO",
        parentCode: "BRAND",
        scope: "ALL",
        contentCount: 45,
        sortNo: 10,
        status: status()
      },
      {
        id: "10112",
        categoryName: "VI 视觉",
        categoryCode: "BRAND_VI",
        parentCode: "BRAND",
        scope: "ALL",
        contentCount: 38,
        sortNo: 20,
        status: status()
      },
      {
        id: "10121",
        categoryName: "促销海报",
        categoryCode: "POSTER_PROMO",
        parentCode: "POSTER",
        scope: "ALL",
        contentCount: 56,
        sortNo: 10,
        status: status()
      },
      {
        id: "10122",
        categoryName: "社交媒体广告",
        categoryCode: "POSTER_SOCIAL",
        parentCode: "POSTER",
        scope: "INSPIRATION",
        contentCount: 40,
        sortNo: 20,
        status: status()
      }
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
    ],
    records: [
      {
        id: "DN20260618001",
        orderNo: "DN20260618001",
        userId: "10001",
        productName: "团队协作版",
        amountFen: 599900,
        amountYuan: 5999,
        payType: "微信",
        createdAt: "2026-06-18 10:18",
        status: "已支付"
      },
      {
        id: "DN20260617018",
        orderNo: "DN20260617018",
        userId: "10002",
        productName: "团队Max版",
        amountFen: 1299900,
        amountYuan: 12999,
        payType: "支付宝",
        createdAt: "2026-06-17 14:52",
        status: "已支付"
      },
      {
        id: "DN20260617012",
        orderNo: "DN20260617012",
        userId: "10003",
        productName: "团队Plus版",
        amountFen: 99900,
        amountYuan: 999,
        payType: "微信",
        createdAt: "2026-06-17 11:06",
        status: "待支付"
      }
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
    ],
    records: [
      {
        id: "PT-01",
        code: "IMAGE_POSTER",
        name: "图片海报提示词",
        scenario: "IMAGE",
        content: "生成一张具有明确视觉层级的商业海报",
        updatedAt: "2026-06-18 10:30",
        status: status()
      },
      {
        id: "PT-02",
        code: "VIDEO_STORYBOARD",
        name: "视频分镜提示词",
        scenario: "VIDEO",
        content: "根据脚本拆解镜头、景别、运动与时长",
        updatedAt: "2026-06-17 15:12",
        status: status()
      }
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
    searchable: ["title", "categoryCode", "type"],
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
    ],
    records: [
      {
        id: "M-01",
        title: "电商主图素材",
        type: "IMAGE",
        categoryCode: "ECOMMERCE",
        resourceUrl: "https://picsum.photos/seed/daone-material-1/320/200",
        coverUrl: "https://picsum.photos/seed/daone-material-1/320/200",
        sortNo: 10,
        updatedAt: "2026-06-18 10:20",
        status: status()
      },
      {
        id: "M-02",
        title: "社交媒体封面",
        type: "IMAGE",
        categoryCode: "SOCIAL",
        resourceUrl: "https://picsum.photos/seed/daone-material-2/320/200",
        coverUrl: "https://picsum.photos/seed/daone-material-2/320/200",
        sortNo: 20,
        updatedAt: "2026-06-17 16:40",
        status: status()
      },
      {
        id: "M-03",
        title: "品牌宣传视频",
        type: "VIDEO",
        categoryCode: "VIDEO",
        resourceUrl: "https://picsum.photos/seed/daone-material-3/320/200",
        coverUrl: "https://picsum.photos/seed/daone-material-3/320/200",
        sortNo: 30,
        updatedAt: "2026-06-16 09:25",
        status: status()
      }
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
    ],
    records: [
      {
        id: "20101",
        categoryName: "电商素材",
        categoryCode: "ECOMMERCE",
        parentId: "",
        contentCount: 86,
        sortNo: 10,
        status: status()
      },
      {
        id: "20102",
        categoryName: "社交媒体",
        categoryCode: "SOCIAL",
        parentId: "",
        contentCount: 64,
        sortNo: 20,
        status: status()
      },
      {
        id: "20103",
        categoryName: "视频素材",
        categoryCode: "VIDEO",
        parentId: "",
        contentCount: 42,
        sortNo: 30,
        status: status()
      },
      {
        id: "20111",
        categoryName: "主图模板",
        categoryCode: "ECOMMERCE_MAIN",
        parentId: "20101",
        contentCount: 35,
        sortNo: 10,
        status: status()
      },
      {
        id: "20112",
        categoryName: "详情页素材",
        categoryCode: "ECOMMERCE_DETAIL",
        parentId: "20101",
        contentCount: 28,
        sortNo: 20,
        status: status()
      }
    ]
  }
};

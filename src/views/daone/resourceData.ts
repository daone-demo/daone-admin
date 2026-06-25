export type FieldType = "text" | "textarea" | "number" | "select";

export interface ResourceField {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
}

export interface ResourceConfig {
  title: string;
  description: string;
  icon: string;
  color: string;
  endpoint?: string;
  apiResource?:
    | "workflows"
    | "users"
    | "invoices"
    | "orders"
    | "plans"
    | "models"
    | "prompts"
    | "inspirations"
    | "categories";
  allowCreate?: boolean;
  allowDelete?: boolean;
  allowStatus?: boolean;
  createText?: string;
  searchable?: string[];
  fields: ResourceField[];
  columns: Array<{ key: string; label: string; width?: number }>;
  records: Array<Record<string, any>>;
}

const status = (enabled = true) => (enabled ? "启用" : "停用");

export const resourceConfigs: Record<string, ResourceConfig> = {
  workflows: {
    title: "工作流管理",
    description: "维护创作工作流、封面与画布节点配置",
    icon: "ri:flow-chart",
    color: "#6c5ce7",
    endpoint: "GET/POST /admin/v1/workflows",
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
    endpoint: "GET /admin/v1/users",
    apiResource: "users",
    allowCreate: false,
    allowDelete: false,
    allowStatus: true,
    searchable: ["nickname", "phone", "email", "id"],
    fields: [],
    columns: [
      { key: "nickname", label: "用户昵称" },
      { key: "phone", label: "手机号" },
      { key: "email", label: "邮箱" },
      { key: "role", label: "角色", width: 100 },
      { key: "createdAt", label: "注册时间" },
      { key: "status", label: "状态", width: 100 }
    ],
    records: [
      {
        id: "U-33456",
        nickname: "李阳",
        phone: "18958012675",
        email: "liyang@example.com",
        role: "USER",
        points: 12003,
        createdAt: "2026-05-12",
        status: status()
      },
      {
        id: "U-33455",
        nickname: "林一设计",
        phone: "13788918891",
        email: "linyi@example.com",
        role: "USER",
        points: 28660,
        createdAt: "2026-05-10",
        status: status()
      },
      {
        id: "U-33454",
        nickname: "BrandLab",
        phone: "18630213021",
        email: "hello@brandlab.cn",
        role: "USER",
        points: 98600,
        createdAt: "2026-04-28",
        status: status()
      },
      {
        id: "U-33453",
        nickname: "运营管理员",
        phone: "18958012675",
        email: null,
        role: "ADMIN",
        points: 120,
        createdAt: "2026-06-16",
        status: status(false)
      }
    ]
  },
  invoices: {
    title: "开票管理",
    description: "审核开票申请并维护发票开具与寄送状态",
    icon: "ri:bill-line",
    color: "#00b894",
    endpoint: "GET/POST /admin/v1/invoices",
    apiResource: "invoices",
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
    endpoint: "GET /admin/v1/model-configs",
    apiResource: "models",
    allowCreate: false,
    allowDelete: false,
    allowStatus: true,
    searchable: ["name", "code", "type"],
    fields: [
      { key: "basePoints", label: "基础积分", type: "number" },
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
    records: [
      {
        id: "M-01",
        modelName: "通用图片生成",
        modelCode: "IMAGE_GENERAL_V1",
        taskType: "IMAGE",
        basePoints: 20,
        countMin: 1,
        countMax: 4,
        calls: 1842,
        updatedAt: "2026-06-18 09:20",
        status: status()
      },
      {
        id: "M-02",
        modelName: "通用视频生成",
        modelCode: "VIDEO_GENERAL_V1",
        taskType: "VIDEO",
        basePoints: 100,
        countMin: 1,
        countMax: 1,
        calls: 326,
        updatedAt: "2026-06-17 18:05",
        status: status()
      },
      {
        id: "M-03",
        modelName: "文案生成",
        modelCode: "TEXT_COPY_V1",
        taskType: "TEXT",
        basePoints: 5,
        countMin: 1,
        countMax: 4,
        calls: 2971,
        updatedAt: "2026-06-16 11:42",
        status: status()
      }
    ]
  },
  plans: {
    title: "套餐管理",
    description: "维护前台会员套餐、计费周期、价格与积分权益",
    icon: "ri:vip-crown-line",
    color: "#fdcb6e",
    endpoint: "GET/POST /admin/v1/plans",
    apiResource: "plans",
    allowDelete: false,
    allowStatus: true,
    createText: "新增套餐",
    searchable: ["name", "code"],
    fields: [
      { key: "planName", label: "套餐名称", required: true },
      { key: "planCode", label: "套餐编码", required: true },
      { key: "benefitsText", label: "套餐权益（每行一项）", type: "textarea" },
      {
        key: "pricesText",
        label: "价格配置（JSON 数组）",
        type: "textarea",
        required: true
      }
    ],
    columns: [
      { key: "planName", label: "套餐" },
      { key: "planCode", label: "套餐编码" },
      { key: "priceSummary", label: "价格配置" },
      { key: "benefitSummary", label: "套餐权益" },
      { key: "status", label: "状态", width: 100 }
    ],
    records: [
      {
        id: "P-01",
        planName: "团队协作版",
        planCode: "TEAM",
        benefitsText: "12000积分/年\n3 人成员协作\n150G 存储空间",
        priceCode: "TEAM_YEAR",
        priceFen: 599900,
        priceYuan: 5999,
        cycleUnit: "YEAR",
        cycleCount: 1,
        cycleLabel: "1 年",
        grantPoints: 12000,
        status: status()
      },
      {
        id: "P-02",
        planName: "团队Plus版",
        planCode: "TEAM_PLUS",
        benefitsText: "30000积分/年\n5 人成员协作\n200G 存储空间",
        priceCode: "TEAM_PLUS_YEAR",
        priceFen: 899900,
        priceYuan: 8999,
        cycleUnit: "YEAR",
        cycleCount: 1,
        cycleLabel: "1 年",
        grantPoints: 30000,
        status: status()
      },
      {
        id: "P-03",
        planName: "团队Max版",
        planCode: "TEAM_MAX",
        benefitsText: "60000积分/年\n10 人成员协作\n300G 存储空间",
        priceCode: "TEAM_MAX_YEAR",
        priceFen: 1299900,
        priceYuan: 12999,
        cycleUnit: "YEAR",
        cycleCount: 1,
        cycleLabel: "1 年",
        grantPoints: 60000,
        status: status()
      },
      {
        id: "P-04",
        planName: "企业版",
        planCode: "ENTERPRISE",
        benefitsText: "120000积分/2年\n20 人成员协作\n500G 存储空间",
        priceCode: "ENTERPRISE_TWO_YEARS",
        priceFen: 2999900,
        priceYuan: 29999,
        cycleUnit: "YEAR",
        cycleCount: 2,
        cycleLabel: "2 年",
        grantPoints: 120000,
        status: status()
      }
    ]
  },
  inspirations: {
    title: "灵感发现",
    description: "运营前台灵感瀑布流内容、作者数据与排序",
    icon: "ri:lightbulb-flash-line",
    color: "#e84393",
    endpoint: "GET/POST /admin/v1/inspirations",
    apiResource: "inspirations",
    allowDelete: false,
    createText: "发布灵感",
    searchable: ["title", "category", "author"],
    fields: [
      { key: "title", label: "标题", required: true },
      {
        key: "categoryCode",
        label: "分类编码",
        type: "select",
        options: [
          "BRAND",
          "POSTER",
          "ILLUSTRATION",
          "UI",
          "CHARACTER",
          "PRODUCT",
          "ARCHITECTURE"
        ]
      },
      { key: "coverUrl", label: "封面 URL" },
      { key: "prompt", label: "创作提示词", type: "textarea" }
    ],
    columns: [
      { key: "title", label: "灵感内容" },
      { key: "categoryCode", label: "分类编码" },
      { key: "coverUrl", label: "封面 URL" },
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
    endpoint: "GET/POST /admin/v1/categories",
    apiResource: "categories",
    createText: "新增分类",
    allowDelete: true,
    allowStatus: true,
    searchable: ["categoryName", "categoryCode", "scope"],
    fields: [
      { key: "categoryName", label: "分类名称", required: true },
      { key: "categoryCode", label: "分类编码", required: true },
      {
        key: "scope",
        label: "使用范围",
        type: "select",
        options: ["ALL", "INSPIRATION", "TEMPLATE"]
      },
      { key: "sortNo", label: "排序", type: "number" }
    ],
    columns: [
      { key: "categoryName", label: "分类名称" },
      { key: "categoryCode", label: "分类编码" },
      { key: "scope", label: "使用范围" },
      { key: "contentCount", label: "内容数" },
      { key: "sortNo", label: "排序" },
      { key: "status", label: "状态", width: 100 }
    ],
    records: [
      {
        id: "C-01",
        categoryName: "品牌设计",
        categoryCode: "BRAND",
        scope: "ALL",
        contentCount: 128,
        sortNo: 10,
        status: status()
      },
      {
        id: "C-02",
        categoryName: "海报与广告",
        categoryCode: "POSTER",
        scope: "ALL",
        contentCount: 96,
        sortNo: 20,
        status: status()
      },
      {
        id: "C-03",
        categoryName: "插画",
        categoryCode: "ILLUSTRATION",
        scope: "INSPIRATION",
        contentCount: 74,
        sortNo: 30,
        status: status()
      },
      {
        id: "C-04",
        categoryName: "视频与分镜",
        categoryCode: "VIDEO",
        scope: "TEMPLATE",
        contentCount: 32,
        sortNo: 40,
        status: status()
      }
    ]
  },
  orders: {
    title: "订单管理",
    description: "查看套餐订单、支付渠道、金额与交易状态",
    icon: "ri:bank-card-line",
    color: "#636e72",
    endpoint: "GET /admin/v1/orders",
    apiResource: "orders",
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
        payType: "WECHAT",
        createdAt: "2026-06-18 10:18",
        status: "PAID"
      },
      {
        id: "DN20260617018",
        orderNo: "DN20260617018",
        userId: "10002",
        productName: "团队Max版",
        amountFen: 1299900,
        amountYuan: 12999,
        payType: "ALIPAY",
        createdAt: "2026-06-17 14:52",
        status: "PAID"
      },
      {
        id: "DN20260617012",
        orderNo: "DN20260617012",
        userId: "10003",
        productName: "团队Plus版",
        amountFen: 99900,
        amountYuan: 999,
        payType: "WECHAT",
        createdAt: "2026-06-17 11:06",
        status: "PENDING"
      }
    ]
  },
  prompts: {
    title: "提示词模板",
    description: "维护 AI 场景使用的系统提示词模板",
    icon: "ri:quill-pen-line",
    color: "#8e44ad",
    endpoint: "GET/POST /admin/v1/prompt-templates",
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
  }
};

const Layout = () => import("@/layout/index.vue");
const ResourcePage = () => import("@/views/daone/ResourcePage.vue");

export default [
  // {
  //   path: "/workflows",
  //   name: "Workflows",
  //   component: Layout,
  //   redirect: "/workflows/list",
  //   meta: { title: "配置工作流", icon: "ri:flow-chart", rank: 1 },
  //   children: [
  //     {
  //       path: "/workflows/list",
  //       name: "WorkflowList",
  //       component: ResourcePage,
  //       meta: { title: "工作流列表", resource: "workflows" }
  //     }
  //   ]
  // },
  {
    path: "/users",
    name: "Users",
    component: Layout,
    redirect: "/users/list",
    meta: { title: "用户管理", icon: "ri:user-3-line", rank: 2 },
    children: [
      {
        path: "/users/list",
        name: "UserList",
        component: ResourcePage,
        meta: { title: "用户列表", resource: "users" }
      }
    ]
  },
  {
    path: "/invoices",
    name: "Invoices",
    component: Layout,
    redirect: "/invoices/list",
    meta: { title: "开票管理", icon: "ri:bill-line", rank: 3 },
    children: [
      {
        path: "/invoices/list",
        name: "InvoiceList",
        component: ResourcePage,
        meta: { title: "开票列表", resource: "invoices" }
      }
    ]
  },
  {
    path: "/models",
    name: "Models",
    component: Layout,
    redirect: "/models/list",
    meta: { title: "模型管理", icon: "ri:brain-line", rank: 4 },
    children: [
      {
        path: "/models/list",
        name: "ModelList",
        component: ResourcePage,
        meta: { title: "模型列表", resource: "models" }
      }
    ]
  },
  {
    path: "/plans",
    name: "Plans",
    component: Layout,
    redirect: "/plans/list",
    meta: { title: "套餐管理", icon: "ri:vip-crown-line", rank: 5 },
    children: [
      {
        path: "/plans/list",
        name: "PlanList",
        component: ResourcePage,
        meta: { title: "套餐列表", resource: "plans" }
      },
      {
        path: "/plans/point-packages",
        name: "PointPackageList",
        component: ResourcePage,
        meta: { title: "积分套餐", resource: "pointPackages" }
      }
    ]
  },
  {
    path: "/content",
    name: "Content",
    component: Layout,
    redirect: "/content/inspirations",
    meta: { title: "内容运营", icon: "ri:gallery-line", rank: 6 },
    children: [
      {
        path: "/content/inspirations",
        name: "InspirationList",
        component: ResourcePage,
        meta: { title: "灵感发现", resource: "inspirations" }
      },
      {
        path: "/content/categories",
        name: "CategoryList",
        component: ResourcePage,
        meta: { title: "分类管理", resource: "categories" }
      },
      {
        path: "/content/prompts",
        name: "PromptTemplateList",
        component: ResourcePage,
        meta: {
          title: "提示词模板",
          resource: "prompts",
          showLink: false
        }
      }
    ]
  },
  {
    path: "/materials",
    name: "Materials",
    component: Layout,
    redirect: "/materials/list",
    meta: { title: "素材管理", icon: "ri:folder-image-line", rank: 7 },
    children: [
      {
        path: "/materials/list",
        name: "MaterialList",
        component: ResourcePage,
        meta: { title: "素材列表", resource: "materials" }
      },
      {
        path: "/materials/categories",
        name: "MaterialCategoryList",
        component: ResourcePage,
        meta: { title: "素材分类", resource: "materialCategories" }
      }
    ]
  },
  {
    path: "/messages",
    name: "Messages",
    component: Layout,
    redirect: "/messages/list",
    meta: { title: "消息管理", icon: "ri:notification-3-line", rank: 8 },
    children: [
      {
        path: "/messages/list",
        name: "MessageList",
        component: ResourcePage,
        meta: { title: "消息列表", resource: "notifications" }
      }
    ]
  },
  {
    path: "/finance",
    name: "Finance",
    component: Layout,
    redirect: "/finance/orders",
    meta: { title: "财务管理", icon: "ri:money-cny-circle-line", rank: 1 },
    children: [
      {
        path: "/finance/orders",
        name: "OrderList",
        component: ResourcePage,
        meta: { title: "订单列表", resource: "orders" }
      },
      {
        path: "/finance/trial-applications",
        name: "TrialApplicationList",
        component: ResourcePage,
        meta: { title: "试用申请", resource: "trialApplications" }
      }
    ]
  }
] satisfies Array<RouteConfigsTable>;

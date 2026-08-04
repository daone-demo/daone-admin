import axios from "axios";
import type { AxiosError } from "axios";
import router from "@/router";
import { getToken, removeToken } from "@/utils/auth";
export interface AdminApiResponse<T = unknown> {
  code: string;
  message: string;
  data: T;
  traceId?: string;
}

export interface AdminPage<T = Record<string, any>> {
  records: T[];
  items?: T[];
  page: number;
  pageSize: number;
  total: number;
  pages?: number;
}

export interface DashboardMetricItem {
  value?: number;
  change?: number;
  growth?: number;
  dayOnDay?: number;
}

export interface DashboardOverview {
  totalUsers?: number | DashboardMetricItem;
  todayOrders?: number | DashboardMetricItem;
  todayRevenue?: number | DashboardMetricItem;
  todayAiCalls?: number | DashboardMetricItem;
  todayCalls?: number | DashboardMetricItem;
  [key: string]: unknown;
}

export interface DashboardTrendPoint {
  date: string;
  newUsers: number;
  orders: number;
}

export interface DashboardQuickEntry {
  title: string;
  subtitle?: string;
  icon?: string;
  path?: string;
  color?: string;
}

export interface DashboardResponse {
  overview?: DashboardOverview;
  quickEntries?: DashboardQuickEntry[] | Record<string, DashboardQuickEntry>;
  recentActivity?: Record<string, unknown>;
  todos?: Record<string, unknown>;
  totalOrders?: number;
  totalPoints?: number;
  totalRevenue?: number;
  totalUsers?: number;
  trends?: DashboardTrendPoint[];
}

const client = axios.create({
  baseURL: "https://api.dev.daoneai.com/api",
  timeout: 12000,
  headers: { "Content-Type": "application/json" }
});

client.interceptors.request.use(config => {
  const token = getToken()?.accessToken;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

let redirectingToLogin = false;

const publicAdminAuthUrls = ["/admin/v1/sms-code", "/admin/v1/sms-login"];

client.interceptors.response.use(
  response => response,
  async error => {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const requestUrl = axiosError.config?.url || "";
    const isPublicAdminAuthUrl = publicAdminAuthUrls.some(url =>
      requestUrl.startsWith(url)
    );
    const isAdminForbidden =
      status === 403 &&
      requestUrl.startsWith("/admin/") &&
      !isPublicAdminAuthUrl;

    if (status === 401 || isAdminForbidden) {
      removeToken();

      if (router.currentRoute.value.path !== "/login" && !redirectingToLogin) {
        redirectingToLogin = true;
        const redirect = router.currentRoute.value.fullPath;
        try {
          await router.replace({
            path: "/login",
            query: {
              redirect,
              ...(isAdminForbidden ? { reason: "forbidden" } : {})
            }
          });
        } finally {
          redirectingToLogin = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

const unwrap = async <T>(request: Promise<{ data: AdminApiResponse<T> }>) => {
  try {
    const { data } = await request;
    if (data.code !== "OK") throw new Error(data.message || "接口请求失败1");
    return data.data;
  } catch (error) {
    const response = (error as AxiosError<AdminApiResponse>).response;
    const message =
      response?.data?.message || (error as Error).message || "接口请求失败2";
    const apiError = new Error(message) as Error & { status?: number };
    apiError.status = response?.status;
    throw apiError;
  }
};

export const adminApi = {
  sendSmsCode(phone: string) {
    return unwrap(
      client.post("/admin/v1/sms-code", { phone, scene: "LOGIN" })
    ) as Promise<{
      retryAfterSeconds: number;
    }>;
  },
  smsLogin(phone: string, code: string) {
    return unwrap(
      client.post("/admin/v1/sms-login", { phone, code })
    ) as Promise<{
      token: string;
      expiresInSeconds: number;
      user: { id: string; nickname: string; avatarUrl?: string };
    }>;
  },
  verifyAdminAccess(token: string) {
    return unwrap(
      client.get("/admin/v1/users", {
        params: { page: 1, pageSize: 1 },
        headers: { Authorization: `Bearer ${token}` }
      })
    ) as Promise<AdminPage>;
  },
  users(
    params: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      subscriptionStatus?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ) {
    return unwrap(
      client.get("/admin/v1/users", { params })
    ) as Promise<AdminPage>;
  },
  dashboard() {
    return unwrap(
      client.get("/admin/v1/dashboard")
    ) as Promise<DashboardResponse>;
  },
  updateUserStatus(userId: string, status: string) {
    return unwrap(
      client.put(`/admin/v1/users/${encodeURIComponent(userId)}/status`, {
        status
      })
    );
  },
  adjustUserPoints(userId: string, amount: number, reason: string) {
    return unwrap(
      client.post(
        `/admin/v1/users/${encodeURIComponent(userId)}/point-adjustments`,
        {
          amount,
          reason
        }
      )
    );
  },
  userDetail(userId: string) {
    return unwrap(client.get(`/admin/v1/users/${encodeURIComponent(userId)}`));
  },
  userProjects(
    userId: string,
    params: { page?: number; pageSize?: number } = {}
  ) {
    return unwrap(
      client.get(`/admin/v1/users/${encodeURIComponent(userId)}/projects`, {
        params
      })
    ) as Promise<AdminPage<{ id: number; title: string; updatedAt?: string }>>;
  },
  userProjectCanvas(userId: string, projectId: string) {
    return unwrap(
      client.get(
        `/admin/v1/users/${encodeURIComponent(userId)}/projects/${encodeURIComponent(projectId)}/canvas`
      )
    ) as Promise<{
      projectId?: string;
      revision?: number;
      updatedAt?: string;
      canvas?: Record<string, unknown>;
      canvasData?: Record<string, unknown>;
    }>;
  },
  orders(
    params: {
      keyword?: string;
      status?: string;
      payType?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    return unwrap(
      client.get("/admin/v1/orders", { params })
    ) as Promise<AdminPage>;
  },
  orderDetail(orderNo: string) {
    return unwrap(
      client.get(`/admin/v1/orders/${encodeURIComponent(orderNo)}`)
    );
  },
  plans() {
    return unwrap(client.get("/admin/v1/plans")) as Promise<
      { items?: any[] } | any[]
    >;
  },
  createPlan(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/plans", data));
  },
  updatePlan(planCode: string, data: Record<string, any>) {
    return unwrap(
      client.put(`/admin/v1/plans/${encodeURIComponent(planCode)}`, data)
    );
  },
  updatePlanStatus(planCode: string, status: string) {
    return unwrap(
      client.put(`/admin/v1/plans/${encodeURIComponent(planCode)}/status`, {
        status
      })
    );
  },
  planDetail(planCode: string) {
    return unwrap(
      client.get(`/admin/v1/plans/${encodeURIComponent(planCode)}`)
    );
  },
  pointPackages() {
    return unwrap(client.get("/admin/v1/recharge-packages")) as Promise<
      { items?: any[] } | any[]
    >;
  },
  createPointPackage(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/recharge-packages", data));
  },
  updatePointPackage(id: string, data: Record<string, any>) {
    return unwrap(
      client.put(`/admin/v1/recharge-packages/${encodeURIComponent(id)}`, data)
    );
  },
  deletePointPackage(id: string) {
    return unwrap(
      client.delete(`/admin/v1/recharge-packages/${encodeURIComponent(id)}`)
    );
  },
  pointPackageDetail(id: string) {
    return unwrap(
      client.get(`/admin/v1/recharge-packages/${encodeURIComponent(id)}`)
    );
  },
  updatePointPackageStatus(id: string, status: string) {
    return unwrap(
      client.put(
        `/admin/v1/recharge-packages/${encodeURIComponent(id)}/status`,
        {
          status
        }
      )
    );
  },
  models(
    params: {
      startDate?: string;
      endDate?: string;
    } = {}
  ) {
    return unwrap(client.get("/admin/v1/model-configs", { params })) as Promise<
      { items?: any[] } | any[]
    >;
  },
  createModel(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/model-configs", data));
  },
  updateModel(modelCode: string, data: Record<string, any>) {
    return unwrap(
      client.put(
        `/admin/v1/model-configs/${encodeURIComponent(modelCode)}`,
        data
      )
    );
  },
  updateModelStatus(modelCode: string, status: string) {
    return unwrap(
      client.put(
        `/admin/v1/model-configs/${encodeURIComponent(modelCode)}/status`,
        { status }
      )
    );
  },
  modelDetail(modelCode: string) {
    return unwrap(
      client.get(`/admin/v1/model-configs/${encodeURIComponent(modelCode)}`)
    );
  },
  promptTemplates() {
    return unwrap(client.get("/admin/v1/prompt-templates")) as Promise<
      { items?: any[] } | any[]
    >;
  },
  createPromptTemplate(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/prompt-templates", data));
  },
  updatePromptTemplate(code: string, data: Record<string, any>) {
    return unwrap(
      client.put(`/admin/v1/prompt-templates/${encodeURIComponent(code)}`, data)
    );
  },
  promptTemplateDetail(code: string) {
    return unwrap(
      client.get(`/admin/v1/prompt-templates/${encodeURIComponent(code)}`)
    );
  },
  updatePromptTemplateStatus(code: string, status: string) {
    return unwrap(
      client.put(
        `/admin/v1/prompt-templates/${encodeURIComponent(code)}/status`,
        {
          status
        }
      )
    );
  },
  inspirations() {
    return unwrap(client.get("/admin/v1/inspirations")) as Promise<
      { items?: any[] } | any[]
    >;
  },
  createInspiration(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/inspirations", data));
  },
  updateInspiration(id: string, data: Record<string, any>) {
    return unwrap(
      client.put(`/admin/v1/inspirations/${encodeURIComponent(id)}`, data)
    );
  },
  inspirationDetail(id: string) {
    return unwrap(
      client.get(`/admin/v1/inspirations/${encodeURIComponent(id)}`)
    );
  },
  updateInspirationStatus(id: string, status: string) {
    return unwrap(
      client.put(`/admin/v1/inspirations/${encodeURIComponent(id)}/status`, {
        status
      })
    );
  },
  deleteInspiration(id: string) {
    return unwrap(
      client.delete(`/admin/v1/inspirations/${encodeURIComponent(id)}`)
    );
  },
  batchDeleteInspirations(ids: string[]) {
    return unwrap(client.delete("/admin/v1/inspirations", { data: ids }));
  },
  materials(
    params: {
      keyword?: string;
      status?: string;
      categoryId?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    return unwrap(client.get("/admin/v1/materials", { params })) as Promise<
      AdminPage | { items?: any[] } | any[]
    >;
  },
  createMaterial(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/materials", data));
  },
  updateMaterial(id: string, data: Record<string, any>) {
    return unwrap(
      client.put(`/admin/v1/materials/${encodeURIComponent(id)}`, data)
    );
  },
  materialDetail(id: string) {
    return unwrap(client.get(`/admin/v1/materials/${encodeURIComponent(id)}`));
  },
  deleteMaterial(id: string) {
    return unwrap(
      client.delete(`/admin/v1/materials/${encodeURIComponent(id)}`)
    );
  },
  batchDeleteMaterials(ids: string[]) {
    return unwrap(client.delete("/admin/v1/materials", { data: ids }));
  },
  updateMaterialStatus(id: string, status: string) {
    return unwrap(
      client.put(`/admin/v1/materials/${encodeURIComponent(id)}/status`, {
        status
      })
    );
  },
  materialCategoryTree(params: { status?: string } = {}) {
    return unwrap(
      client.get("/admin/v1/material-categories/tree", { params })
    ) as Promise<{ items?: any[] } | any[]>;
  },
  createMaterialCategory(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/material-categories", data));
  },
  updateMaterialCategory(categoryId: string, data: Record<string, any>) {
    return unwrap(
      client.put(
        `/admin/v1/material-categories/${encodeURIComponent(categoryId)}`,
        data
      )
    );
  },
  deleteMaterialCategory(categoryId: string) {
    return unwrap(
      client.delete(
        `/admin/v1/material-categories/${encodeURIComponent(categoryId)}`
      )
    );
  },
  updateMaterialCategoryStatus(categoryId: string, status: string) {
    return unwrap(
      client.put(
        `/admin/v1/material-categories/${encodeURIComponent(categoryId)}/status`,
        { status }
      )
    );
  },
  categories(
    params: {
      keyword?: string;
      status?: string;
      scope?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    return unwrap(client.get("/admin/v1/categories", { params })) as Promise<
      AdminPage | { items?: any[] } | any[]
    >;
  },
  createCategory(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/categories", data));
  },
  updateCategory(code: string, data: Record<string, any>) {
    return unwrap(
      client.put(`/admin/v1/categories/${encodeURIComponent(code)}`, data)
    );
  },
  deleteCategory(code: string) {
    return unwrap(
      client.delete(`/admin/v1/categories/${encodeURIComponent(code)}`)
    );
  },
  updateCategoryStatus(code: string, status: string) {
    return unwrap(
      client.put(`/admin/v1/categories/${encodeURIComponent(code)}/status`, {
        status
      })
    );
  },
  workflows(
    params: {
      keyword?: string;
      status?: string;
      categoryCode?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    return unwrap(
      client.get("/admin/v1/workflows", { params })
    ) as Promise<AdminPage>;
  },
  createWorkflow(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/workflows", data));
  },
  updateWorkflow(workflowId: string, data: Record<string, any>) {
    return unwrap(
      client.put(`/admin/v1/workflows/${encodeURIComponent(workflowId)}`, data)
    );
  },
  deleteWorkflow(workflowId: string) {
    return unwrap(
      client.delete(`/admin/v1/workflows/${encodeURIComponent(workflowId)}`)
    );
  },
  updateWorkflowStatus(workflowId: string, status: string) {
    return unwrap(
      client.put(
        `/admin/v1/workflows/${encodeURIComponent(workflowId)}/status`,
        {
          status
        }
      )
    );
  },
  invoices(
    params: {
      keyword?: string;
      status?: string;
      invoiceType?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    return unwrap(
      client.get("/admin/v1/invoices", { params })
    ) as Promise<AdminPage>;
  },
  createInvoice(data: Record<string, any>) {
    return unwrap(client.post("/admin/v1/invoices", data));
  },
  updateInvoice(invoiceId: string, data: Record<string, any>) {
    return unwrap(
      client.put(`/admin/v1/invoices/${encodeURIComponent(invoiceId)}`, data)
    );
  },
  updateInvoiceStatus(invoiceId: string, data: Record<string, any>) {
    return unwrap(
      client.put(
        `/admin/v1/invoices/${encodeURIComponent(invoiceId)}/status`,
        data
      )
    );
  },
  uploadFile(file: File, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(
      client.post("/admin/v1/files/upload", formData, {
        timeout: 300000,
        onUploadProgress: event => {
          if (!onProgress) return;
          const total = event.total || file.size;
          if (!total) return;
          const percent = Math.round((event.loaded / total) * 100);
          onProgress(Math.min(percent, 99));
        }
      })
    ) as Promise<{
      fileName: string;
      url: string;
    }>;
  },
  uploadAsset(data: {
    fileName: string;
    contentType: string;
    fileSize: number;
    fileBase64: string;
    projectId?: string;
  }) {
    return unwrap(
      client.post("/assets/upload-tickets", data, { timeout: 120000 })
    ) as Promise<{
      id: string;
      previewUrl: string;
      url?: string;
    }>;
  }
};

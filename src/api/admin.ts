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

const client = axios.create({
  baseURL: import.meta.env.VITE_DAONE_API_BASE_URL || "/api",
  timeout: 12000,
  headers: { "Content-Type": "application/json" }
});

client.interceptors.request.use(config => {
  const token = getToken()?.accessToken;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let redirectingToLogin = false;

client.interceptors.response.use(
  response => response,
  async error => {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const isAdminForbidden =
      status === 403 && axiosError.config?.url?.startsWith("/admin/");

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
    if (data.code !== "OK") throw new Error(data.message || "接口请求失败");
    return data.data;
  } catch (error) {
    const response = (error as AxiosError<AdminApiResponse>).response;
    const message =
      response?.data?.message || (error as Error).message || "接口请求失败";
    const apiError = new Error(message) as Error & { status?: number };
    apiError.status = response?.status;
    throw apiError;
  }
};

export const adminApi = {
  sendSmsCode(phone: string) {
    return unwrap(
      client.post("/v1/auth/sms-codes", { phone, scene: "LOGIN" })
    ) as Promise<{
      retryAfterSeconds: number;
    }>;
  },
  smsLogin(phone: string, code: string) {
    return unwrap(
      client.post("/v1/auth/sms-login", { phone, code })
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
  users(params: { page?: number; pageSize?: number } = {}) {
    return unwrap(
      client.get("/admin/v1/users", { params })
    ) as Promise<AdminPage>;
  },
  updateUserStatus(userId: string, status: string) {
    return unwrap(
      client.patch(`/admin/v1/users/${encodeURIComponent(userId)}/status`, {
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
  orders(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return unwrap(
      client.get("/admin/v1/orders", { params })
    ) as Promise<AdminPage>;
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
      client.patch(`/admin/v1/plans/${encodeURIComponent(planCode)}/status`, {
        status
      })
    );
  },
  models() {
    return unwrap(client.get("/admin/v1/model-configs")) as Promise<
      { items?: any[] } | any[]
    >;
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
      client.patch(
        `/admin/v1/model-configs/${encodeURIComponent(modelCode)}/status`,
        { status }
      )
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
  }
};

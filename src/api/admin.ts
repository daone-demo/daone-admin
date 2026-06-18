import axios from "axios";
import type { AxiosError } from "axios";
import { getToken } from "@/utils/auth";

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
  baseURL:
    import.meta.env.VITE_DAONE_API_BASE_URL || "https://api.daoneai.com/api",
  timeout: 12000,
  headers: { "Content-Type": "application/json" }
});

client.interceptors.request.use(config => {
  const token = getToken()?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unwrap = async <T>(request: Promise<{ data: AdminApiResponse<T> }>) => {
  try {
    const { data } = await request;
    if (data.code !== "OK") throw new Error(data.message || "接口请求失败");
    return data.data;
  } catch (error) {
    const response = (error as AxiosError<AdminApiResponse>).response;
    const message =
      response?.data?.message || (error as Error).message || "接口请求失败";
    throw new Error(message);
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

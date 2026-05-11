import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

import { apiConfig } from "./config";
import { apiEndpoints } from "./endpoints";
import type {
  ApiErrorBody,
  BankAccount,
  BankConnectionRequest,
  BankConnectionResponse,
  ClassifyJournalRequest,
  CreateBankAccountRequest,
  CreateJournalEntryRequest,
  CreateTenantRequest,
  CreateTenantResponse,
  HealthResponse,
  JournalEntriesQuery,
  JournalEntriesResponse,
  JournalEntry,
  MeResponse,
  Tenant
} from "./types";

type GetIdToken = () => Promise<string>;

type YmRequestConfig = AxiosRequestConfig & {
  requiresAuth?: boolean;
};

export class YmApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "YmApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type YmApi = ReturnType<typeof createYmApi>;

export function createYmApi(getIdToken: GetIdToken) {
  const http = createAxiosInstance();

  async function request<T>({ requiresAuth = true, headers, ...config }: YmRequestConfig): Promise<T> {
    const requestHeaders: Record<string, string> = {
      ...(headers as Record<string, string> | undefined)
    };

    if (requiresAuth) {
      requestHeaders.Authorization = `Bearer ${await getIdToken()}`;
    }

    try {
      const response = await http.request<T>({
        ...config,
        headers: requestHeaders
      });

      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  }

  const health = {
    get: () =>
      request<HealthResponse>({
        method: "GET",
        requiresAuth: false,
        url: apiEndpoints.health
      })
  };

  const identity = {
    getMe: () =>
      request<MeResponse>({
        method: "GET",
        url: apiEndpoints.me
      }),
    getMyTenants: () =>
      request<Tenant[]>({
        method: "GET",
        url: apiEndpoints.meTenants
      })
  };

  const tenants = {
    create: (body: CreateTenantRequest, idempotencyKey = crypto.randomUUID()) =>
      request<CreateTenantResponse>({
        data: body,
        headers: { "Idempotency-Key": idempotencyKey },
        method: "POST",
        url: apiEndpoints.tenants
      })
  };

  const bankConnections = {
    create: (tenantId: string, body: BankConnectionRequest) =>
      request<BankConnectionResponse>({
        data: body,
        method: "POST",
        url: apiEndpoints.bankConnections(tenantId)
      })
  };

  const bankAccounts = {
    create: (tenantId: string, body: CreateBankAccountRequest) =>
      request<BankAccount>({
        data: body,
        method: "POST",
        url: apiEndpoints.bankAccounts(tenantId)
      })
  };

  const journal = {
    getEntries: (tenantId: string, params: JournalEntriesQuery) =>
      request<JournalEntriesResponse>({
        method: "GET",
        params,
        url: apiEndpoints.journalEntries(tenantId)
      }),
    classify: (tenantId: string, body: ClassifyJournalRequest, idempotencyKey = crypto.randomUUID()) =>
      request<JournalEntry>({
        data: body,
        headers: { "Idempotency-Key": idempotencyKey },
        method: "POST",
        url: apiEndpoints.journalClassify(tenantId)
      }),
    createEntry: (tenantId: string, body: CreateJournalEntryRequest) =>
      request<JournalEntry>({
        data: body,
        method: "POST",
        url: apiEndpoints.journalEntries(tenantId)
      })
  };

  return {
    bankAccounts,
    bankConnections,
    health,
    identity,
    journal,
    tenants,
    getHealth: health.get,
    getMe: identity.getMe,
    getTenants: identity.getMyTenants,
    createTenant: tenants.create,
    createBankConnection: bankConnections.create,
    createBankAccount: bankAccounts.create,
    getJournalEntries: journal.getEntries,
    classifyJournalEntry: journal.classify,
    createJournalEntry: journal.createEntry
  };
}

function createAxiosInstance(): AxiosInstance {
  return axios.create({
    baseURL: apiConfig.apiBaseUrl,
    headers: {
      "Content-Type": "application/json"
    },
    timeout: 30_000
  });
}

function toApiError(error: unknown) {
  if (error instanceof YmApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body = error.response?.data as ApiErrorBody | undefined;
    const code = body?.error?.code;
    const message = body?.error?.message ?? body?.message ?? fallbackErrorMessage(status);

    return new YmApiError(message, status, code, body);
  }

  if (error instanceof Error) {
    return new YmApiError(error.message, 0, undefined, error);
  }

  return new YmApiError("요청을 처리하지 못했습니다.", 0, undefined, error);
}

function fallbackErrorMessage(status: number) {
  if (status === 0) {
    return "네트워크 연결을 확인해 주세요.";
  }

  if (status === 401) {
    return "로그인이 만료되었습니다.";
  }

  if (status === 403) {
    return "이 워크스페이스에 접근할 권한이 없습니다.";
  }

  if (status >= 500) {
    return "서버 또는 외부 서비스가 일시적으로 응답하지 않습니다.";
  }

  return "요청을 처리하지 못했습니다.";
}

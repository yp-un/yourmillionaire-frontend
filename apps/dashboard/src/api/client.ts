import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

import { apiConfig } from "./config";
import { apiEndpoints } from "./endpoints";
import type {
  AccountBalancesResponse,
  AccountsChartResponse,
  AdminTaxLawSyncStateResponse,
  AdminTaxRuleChangeLogResponse,
  AdminTaxRuleReviewsResponse,
  AdminTaxRulesResponse,
  ApiErrorBody,
  BankAccount,
  BankConnectionRequest,
  BankConnectionResponse,
  BalanceSheetResponse,
  CashFlowResponse,
  ClassifyJournalRequest,
  CorporationProfile,
  CreateBankAccountRequest,
  CreateJournalEntryRequest,
  CreateTenantRequest,
  CreateTenantResponse,
  ExchangeRate,
  ExchangeRatesResponse,
  FilingDraftResponse,
  FilingRecomputeResponse,
  FilingsUpcomingResponse,
  FindBenefitsRequest,
  FindBenefitsResponse,
  FxRevalueResponse,
  HealthResponse,
  IncomeStatementResponse,
  JournalDraftsResponse,
  JournalEntriesQuery,
  JournalEntriesResponse,
  JournalEntry,
  MeResponse,
  MonthlySummaryResponse,
  PenaltySimulationResponse,
  ReceivablesBoard,
  SearchTaxLawRequest,
  SearchTaxLawResponse,
  SyncStartResponse,
  SyncStatusResponse,
  TaxInvoiceDirection,
  TaxInvoicesResponse,
  Tenant,
  TrialBalanceResponse,
  UpdateReceivableRequest,
  UpsertCorporationProfileRequest,
  WithholdingPendingResponse
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

  const accounts = {
    getChart: () =>
      request<AccountsChartResponse>({
        method: "GET",
        requiresAuth: false,
        url: apiEndpoints.accountsChart
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
      }),
    getDrafts: (tenantId: string) =>
      request<JournalDraftsResponse>({
        method: "GET",
        url: apiEndpoints.journalDrafts(tenantId)
      })
  };

  const sync = {
    start: (tenantId: string, idempotencyKey = crypto.randomUUID()) =>
      request<SyncStartResponse>({
        headers: { "Idempotency-Key": idempotencyKey },
        method: "POST",
        url: apiEndpoints.sync(tenantId)
      }),
    getStatus: (tenantId: string) =>
      request<SyncStatusResponse>({
        method: "GET",
        url: apiEndpoints.syncStatus(tenantId)
      })
  };

  const views = {
    getMonthlySummary: (tenantId: string, ym: string) =>
      request<MonthlySummaryResponse>({
        method: "GET",
        params: { ym },
        url: apiEndpoints.monthlySummary(tenantId)
      }),
    getReceivables: (tenantId: string) =>
      request<ReceivablesBoard>({
        method: "GET",
        url: apiEndpoints.receivables(tenantId)
      }),
    updateReceivable: (tenantId: string, entryId: string, body: UpdateReceivableRequest) =>
      request<{ ok: true }>({
        data: body,
        method: "PATCH",
        url: apiEndpoints.receivable(tenantId, entryId)
      }),
    getAccountBalances: (tenantId: string) =>
      request<AccountBalancesResponse>({
        method: "GET",
        url: apiEndpoints.accountBalances(tenantId)
      })
  };

  const reports = {
    getPnl: (tenantId: string, params: { from: string; to: string }) =>
      request<IncomeStatementResponse>({
        method: "GET",
        params,
        url: apiEndpoints.reportPnl(tenantId)
      }),
    getBalanceSheet: (tenantId: string, asOf: string) =>
      request<BalanceSheetResponse>({
        method: "GET",
        params: { asOf },
        url: apiEndpoints.reportBalanceSheet(tenantId)
      }),
    getCashFlow: (tenantId: string, params: { from: string; to: string; method?: "indirect" }) =>
      request<CashFlowResponse>({
        method: "GET",
        params,
        url: apiEndpoints.reportCashFlow(tenantId)
      }),
    getTrialBalance: (tenantId: string, asOf: string) =>
      request<TrialBalanceResponse>({
        method: "GET",
        params: { asOf },
        url: apiEndpoints.reportTrialBalance(tenantId)
      })
  };

  const fx = {
    getUsdKrwRate: (date: string) =>
      request<ExchangeRate>({
        method: "GET",
        params: { date },
        url: apiEndpoints.fxUsdKrw
      }),
    getUsdKrwRates: (params: { from: string; to: string }) =>
      request<ExchangeRatesResponse>({
        method: "GET",
        params,
        url: apiEndpoints.fxUsdKrw
      }),
    revalue: (tenantId: string, asOf: string) =>
      request<FxRevalueResponse>({
        method: "POST",
        params: { asOf },
        url: apiEndpoints.fxRevalue(tenantId)
      })
  };

  const tax = {
    getCorporationProfile: (tenantId: string) =>
      request<CorporationProfile>({
        method: "GET",
        url: apiEndpoints.corporationProfile(tenantId)
      }),
    upsertCorporationProfile: (tenantId: string, body: UpsertCorporationProfileRequest) =>
      request<CorporationProfile>({
        data: body,
        method: "POST",
        url: apiEndpoints.corporationProfile(tenantId)
      }),
    getUpcomingFilings: (tenantId: string) =>
      request<FilingsUpcomingResponse>({
        method: "GET",
        url: apiEndpoints.filingsUpcoming(tenantId)
      }),
    getFilingDraft: (tenantId: string, filingId: string) =>
      request<FilingDraftResponse>({
        method: "GET",
        url: apiEndpoints.filingDraft(tenantId, filingId)
      }),
    getFilingPenaltySimulation: (tenantId: string, filingId: string, asOf?: string) =>
      request<PenaltySimulationResponse>({
        method: "GET",
        params: asOf ? { asOf } : undefined,
        url: apiEndpoints.filingPenaltySimulation(tenantId, filingId)
      }),
    recomputeFiling: (tenantId: string, filingId: string) =>
      request<FilingRecomputeResponse>({
        method: "POST",
        url: apiEndpoints.filingRecompute(tenantId, filingId)
      }),
    getPendingWithholding: (tenantId: string) =>
      request<WithholdingPendingResponse>({
        method: "GET",
        url: apiEndpoints.withholdingPending(tenantId)
      }),
    fileWithholding: (tenantId: string, withholdingId: string) =>
      request<{ id: string; status: "filed" | string }>({
        method: "POST",
        url: apiEndpoints.withholdingFile(tenantId, withholdingId)
      }),
    getTaxInvoices: (tenantId: string, params: { direction?: TaxInvoiceDirection; from: string; to: string }) =>
      request<TaxInvoicesResponse>({
        method: "GET",
        params,
        url: apiEndpoints.taxInvoices(tenantId)
      }),
    searchTaxLaw: (tenantId: string, body: SearchTaxLawRequest) =>
      request<SearchTaxLawResponse>({
        data: body,
        method: "POST",
        url: apiEndpoints.agentSearchTaxLaw(tenantId)
      }),
    findBenefits: (tenantId: string, body: FindBenefitsRequest) =>
      request<FindBenefitsResponse>({
        data: body,
        method: "POST",
        url: apiEndpoints.agentFindBenefits(tenantId)
      })
  };

  const admin = {
    getTaxRules: (params?: { asOf?: string; kind?: string }) =>
      request<AdminTaxRulesResponse>({
        method: "GET",
        params,
        url: apiEndpoints.adminTaxRules
      }),
    approveTaxRule: (id: string) =>
      request<{ ruleId: string; status: string }>({
        method: "POST",
        url: apiEndpoints.adminTaxRuleApprove(id)
      }),
    getTaxRuleChangeLog: (id: string) =>
      request<AdminTaxRuleChangeLogResponse>({
        method: "GET",
        url: apiEndpoints.adminTaxRuleChangeLog(id)
      }),
    getTaxLawSyncState: () =>
      request<AdminTaxLawSyncStateResponse>({
        method: "GET",
        url: apiEndpoints.adminTaxLawSyncState
      }),
    runTaxLawSync: () =>
      request<{ executionArn: string }>({
        method: "POST",
        url: apiEndpoints.adminTaxLawSyncRun
      }),
    getTaxRuleReviews: (status = "pending") =>
      request<AdminTaxRuleReviewsResponse>({
        method: "GET",
        params: { status },
        url: apiEndpoints.adminTaxRuleReviews
      }),
    resolveTaxRuleReview: (id: string, body: { decision: "approve" | "reject"; notes?: string }) =>
      request<{ decision: "approve" | "reject"; id: string }>({
        data: body,
        method: "POST",
        url: apiEndpoints.adminTaxRuleReviewResolve(id)
      })
  };

  return {
    accounts,
    admin,
    bankAccounts,
    bankConnections,
    fx,
    health,
    identity,
    journal,
    reports,
    sync,
    tax,
    tenants,
    views,
    getAccountsChart: accounts.getChart,
    getHealth: health.get,
    getMe: identity.getMe,
    getTenants: identity.getMyTenants,
    createTenant: tenants.create,
    createBankConnection: bankConnections.create,
    createBankAccount: bankAccounts.create,
    getJournalEntries: journal.getEntries,
    classifyJournalEntry: journal.classify,
    createJournalEntry: journal.createEntry,
    getJournalDrafts: journal.getDrafts,
    startSync: sync.start,
    getSyncStatus: sync.getStatus,
    getMonthlySummary: views.getMonthlySummary,
    getReceivables: views.getReceivables,
    updateReceivable: views.updateReceivable,
    getAccountBalances: views.getAccountBalances,
    getPnlReport: reports.getPnl,
    getBalanceSheetReport: reports.getBalanceSheet,
    getCashFlowReport: reports.getCashFlow,
    getTrialBalanceReport: reports.getTrialBalance,
    getUsdKrwRate: fx.getUsdKrwRate,
    getUsdKrwRates: fx.getUsdKrwRates,
    revalueFx: fx.revalue,
    getCorporationProfile: tax.getCorporationProfile,
    upsertCorporationProfile: tax.upsertCorporationProfile,
    getUpcomingFilings: tax.getUpcomingFilings,
    getFilingDraft: tax.getFilingDraft,
    getFilingPenaltySimulation: tax.getFilingPenaltySimulation,
    recomputeFiling: tax.recomputeFiling,
    getPendingWithholding: tax.getPendingWithholding,
    fileWithholding: tax.fileWithholding,
    getTaxInvoices: tax.getTaxInvoices,
    searchTaxLaw: tax.searchTaxLaw,
    findBenefits: tax.findBenefits
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

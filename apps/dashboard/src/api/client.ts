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
	BalanceSheetResponse,
	BankAccount,
	BankConnectionRequest,
	BankConnectionResponse,
	CashFlowResponse,
	ClassifyJournalRequest,
	CorporationProfile,
	CreateBankAccountRequest,
	CreateFxAccountRequest,
	CreateJournalEntryRequest,
	CreateTenantRequest,
	CreateTenantResponse,
	ExchangeRate,
	ExchangeRatesResponse,
	FilingDraftResponse,
	FilingRecomputeResponse,
	FilingsUpcomingResponse,
	FxAccount,
	FxAccountsResponse,
	FxRevalueResponse,
	FxStrategyEvent,
	FxStrategyScenario,
	HealthResponse,
	IncomeStatementResponse,
	JournalEntriesQuery,
	JournalEntriesResponse,
	JournalEntry,
	MeResponse,
	MonthlySummaryResponse,
	PenaltySimulationResponse,
	ReceivablesBoard,
	SyncStartResponse,
	SyncStreamEvent,
	TaxInvoiceDirection,
	TaxInvoicesResponse,
	TaxStrategyEvent,
	TaxStrategyScenario,
	Tenant,
	TrialBalanceResponse,
	UpdateEntryLinesRequest,
	UpdateFxAccountBalanceRequest,
	UpdateReceivableRequest,
	UpsertCorporationProfileRequest,
	WithholdingPendingResponse,
} from "./types";

type GetIdToken = () => Promise<string>;

type YmRequestConfig = AxiosRequestConfig & {
	requiresAuth?: boolean;
};

export class YmApiError extends Error {
	readonly status: number;
	readonly code?: string;
	readonly details?: unknown;

	constructor(
		message: string,
		status: number,
		code?: string,
		details?: unknown,
	) {
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

	async function request<T>({
		requiresAuth = true,
		headers,
		...config
	}: YmRequestConfig): Promise<T> {
		const requestHeaders: Record<string, string> = {
			...(headers as Record<string, string> | undefined),
		};

		if (requiresAuth) {
			requestHeaders.Authorization = `Bearer ${await getIdToken()}`;
		}

		try {
			const response = await http.request<T>({
				...config,
				headers: requestHeaders,
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
				url: apiEndpoints.health,
			}),
	};

	const accounts = {
		getChart: () =>
			request<AccountsChartResponse>({
				method: "GET",
				requiresAuth: false,
				url: apiEndpoints.accountsChart,
			}),
	};

	const identity = {
		getMe: () =>
			request<MeResponse>({
				method: "GET",
				url: apiEndpoints.me,
			}),
		getMyTenants: () =>
			request<Tenant[]>({
				method: "GET",
				url: apiEndpoints.meTenants,
			}),
	};

	const tenants = {
		create: (body: CreateTenantRequest, idempotencyKey = crypto.randomUUID()) =>
			request<CreateTenantResponse>({
				data: body,
				headers: { "Idempotency-Key": idempotencyKey },
				method: "POST",
				url: apiEndpoints.tenants,
			}),
	};

	const bankConnections = {
		create: (tenantId: string, body: BankConnectionRequest) =>
			request<BankConnectionResponse>({
				data: body,
				method: "POST",
				url: apiEndpoints.bankConnections(tenantId),
			}),
	};

	const bankAccounts = {
		create: (tenantId: string, body: CreateBankAccountRequest) =>
			request<BankAccount>({
				data: body,
				method: "POST",
				url: apiEndpoints.bankAccounts(tenantId),
			}),
	};

	const journal = {
		getEntries: (tenantId: string, params: JournalEntriesQuery) =>
			request<JournalEntriesResponse>({
				method: "GET",
				params,
				url: apiEndpoints.journalEntries(tenantId),
			}),
		classify: (
			tenantId: string,
			body: ClassifyJournalRequest,
			idempotencyKey = crypto.randomUUID(),
		) =>
			request<JournalEntry>({
				data: body,
				headers: { "Idempotency-Key": idempotencyKey },
				method: "POST",
				url: apiEndpoints.journalClassify(tenantId),
			}),
		createEntry: (tenantId: string, body: CreateJournalEntryRequest) =>
			request<JournalEntry>({
				data: body,
				method: "POST",
				url: apiEndpoints.journalEntryCreate(tenantId),
			}),
		updateEntryLines: (
			tenantId: string,
			entryId: string,
			body: UpdateEntryLinesRequest,
		) =>
			request<JournalEntry>({
				data: body,
				method: "PATCH",
				url: apiEndpoints.journalEntry(tenantId, entryId),
			}),
		confirmEntry: (tenantId: string, entryId: string) =>
			request<JournalEntry>({
				method: "POST",
				url: apiEndpoints.journalEntryConfirm(tenantId, entryId),
			}),
		discardEntry: (tenantId: string, entryId: string) =>
			request<JournalEntry>({
				method: "POST",
				url: apiEndpoints.journalEntryDiscard(tenantId, entryId),
			}),
	};

	const sync = {
		start: (
			tenantId: string,
			body?: { accountIds?: string[]; from?: string; to?: string },
		) => streamSync(getIdToken, tenantId, body),
	};

	const views = {
		getMonthlySummary: (tenantId: string, ym: string) =>
			request<MonthlySummaryResponse>({
				method: "GET",
				params: { ym },
				url: apiEndpoints.monthlySummary(tenantId),
			}),
		getReceivables: (tenantId: string) =>
			request<ReceivablesBoard>({
				method: "GET",
				url: apiEndpoints.receivables(tenantId),
			}),
		updateReceivable: (
			tenantId: string,
			entryId: string,
			body: UpdateReceivableRequest,
		) =>
			request<{ ok: true }>({
				data: body,
				method: "PATCH",
				url: apiEndpoints.receivable(tenantId, entryId),
			}),
		getAccountBalances: (tenantId: string) =>
			request<AccountBalancesResponse>({
				method: "GET",
				url: apiEndpoints.accountBalances(tenantId),
			}),
	};

	const reports = {
		getPnl: (tenantId: string, params: { from: string; to: string }) =>
			request<IncomeStatementResponse>({
				method: "GET",
				params,
				url: apiEndpoints.reportPnl(tenantId),
			}),
		getBalanceSheet: (tenantId: string, asOf: string) =>
			request<BalanceSheetResponse>({
				method: "GET",
				params: { asOf },
				url: apiEndpoints.reportBalanceSheet(tenantId),
			}),
		getCashFlow: (
			tenantId: string,
			params: { from: string; to: string; method?: "indirect" },
		) =>
			request<CashFlowResponse>({
				method: "GET",
				params,
				url: apiEndpoints.reportCashFlow(tenantId),
			}),
		getTrialBalance: (tenantId: string, asOf: string) =>
			request<TrialBalanceResponse>({
				method: "GET",
				params: { asOf },
				url: apiEndpoints.reportTrialBalance(tenantId),
			}),
	};

	const fx = {
		getUsdKrwRate: (date: string) =>
			request<ExchangeRate>({
				method: "GET",
				params: { date },
				url: apiEndpoints.fxUsdKrw,
			}),
		getUsdKrwRates: (params: { from: string; to: string }) =>
			request<ExchangeRatesResponse>({
				method: "GET",
				params,
				url: apiEndpoints.fxUsdKrw,
			}),
		revalue: (tenantId: string, asOf: string) =>
			request<FxRevalueResponse>({
				method: "POST",
				params: { asOf },
				url: apiEndpoints.fxRevalue(tenantId),
			}),
		getAccounts: (tenantId: string) =>
			request<FxAccountsResponse>({
				method: "GET",
				url: apiEndpoints.fxAccounts(tenantId),
			}),
		createAccount: (tenantId: string, body: CreateFxAccountRequest) =>
			request<FxAccount>({
				data: body,
				method: "POST",
				url: apiEndpoints.fxAccounts(tenantId),
			}),
		updateAccountBalance: (
			tenantId: string,
			accountId: string,
			body: UpdateFxAccountBalanceRequest,
		) =>
			request<FxAccount>({
				data: body,
				method: "PATCH",
				url: apiEndpoints.fxAccountBalance(tenantId, accountId),
			}),
		deleteAccount: (tenantId: string, accountId: string) =>
			request<void>({
				method: "DELETE",
				url: apiEndpoints.fxAccount(tenantId, accountId),
			}),
		runStrategy: (
			tenantId: string,
			scenario: FxStrategyScenario,
			onEvent?: (event: FxStrategyEvent) => void,
		) => streamFxStrategy(getIdToken, tenantId, scenario, onEvent),
	};

	const tax = {
		getCorporationProfile: (tenantId: string) =>
			request<CorporationProfile>({
				method: "GET",
				url: apiEndpoints.corporationProfile(tenantId),
			}),
		upsertCorporationProfile: (
			tenantId: string,
			body: UpsertCorporationProfileRequest,
		) =>
			request<CorporationProfile>({
				data: body,
				method: "POST",
				url: apiEndpoints.corporationProfile(tenantId),
			}),
		getUpcomingFilings: (tenantId: string) =>
			request<FilingsUpcomingResponse>({
				method: "GET",
				url: apiEndpoints.filingsUpcoming(tenantId),
			}),
		getFilingDraft: (tenantId: string, filingId: string) =>
			request<FilingDraftResponse>({
				method: "GET",
				url: apiEndpoints.filingDraft(tenantId, filingId),
			}),
		getFilingPenaltySimulation: (
			tenantId: string,
			filingId: string,
			asOf?: string,
		) =>
			request<PenaltySimulationResponse>({
				method: "GET",
				params: asOf ? { asOf } : undefined,
				url: apiEndpoints.filingPenaltySimulation(tenantId, filingId),
			}),
		recomputeFiling: (tenantId: string, filingId: string) =>
			request<FilingRecomputeResponse>({
				method: "POST",
				url: apiEndpoints.filingRecompute(tenantId, filingId),
			}),
		getPendingWithholding: (tenantId: string) =>
			request<WithholdingPendingResponse>({
				method: "GET",
				url: apiEndpoints.withholdingPending(tenantId),
			}),
		fileWithholding: (tenantId: string, withholdingId: string) =>
			request<{ id: string; status: "filed" | string }>({
				method: "POST",
				url: apiEndpoints.withholdingFile(tenantId, withholdingId),
			}),
		getTaxInvoices: (
			tenantId: string,
			params: { direction?: TaxInvoiceDirection; from: string; to: string },
		) =>
			request<TaxInvoicesResponse>({
				method: "GET",
				params,
				url: apiEndpoints.taxInvoices(tenantId),
			}),
		runStrategy: (
			tenantId: string,
			scenario: TaxStrategyScenario,
			onEvent?: (event: TaxStrategyEvent) => void,
		) => streamTaxStrategy(getIdToken, tenantId, scenario, onEvent),
	};

	const admin = {
		getTaxRules: (params?: { asOf?: string; kind?: string }) =>
			request<AdminTaxRulesResponse>({
				method: "GET",
				params,
				url: apiEndpoints.adminTaxRules,
			}),
		approveTaxRule: (id: string) =>
			request<{ ruleId: string; status: string }>({
				method: "POST",
				url: apiEndpoints.adminTaxRuleApprove(id),
			}),
		getTaxRuleChangeLog: (id: string) =>
			request<AdminTaxRuleChangeLogResponse>({
				method: "GET",
				url: apiEndpoints.adminTaxRuleChangeLog(id),
			}),
		getTaxLawSyncState: () =>
			request<AdminTaxLawSyncStateResponse>({
				method: "GET",
				url: apiEndpoints.adminTaxLawSyncState,
			}),
		runTaxLawSync: () =>
			request<{ executionArn: string }>({
				method: "POST",
				url: apiEndpoints.adminTaxLawSyncRun,
			}),
		getTaxRuleReviews: (status = "pending") =>
			request<AdminTaxRuleReviewsResponse>({
				method: "GET",
				params: { status },
				url: apiEndpoints.adminTaxRuleReviews,
			}),
		resolveTaxRuleReview: (
			id: string,
			body: { decision: "approve" | "reject"; notes?: string },
		) =>
			request<{ decision: "approve" | "reject"; id: string }>({
				data: body,
				method: "POST",
				url: apiEndpoints.adminTaxRuleReviewResolve(id),
			}),
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
		updateJournalEntryLines: journal.updateEntryLines,
		confirmJournalEntry: journal.confirmEntry,
		discardJournalEntry: journal.discardEntry,
		startSync: sync.start,
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
		getFxAccounts: fx.getAccounts,
		createFxAccount: fx.createAccount,
		updateFxAccountBalance: fx.updateAccountBalance,
		deleteFxAccount: fx.deleteAccount,
		runFxStrategy: fx.runStrategy,
		getCorporationProfile: tax.getCorporationProfile,
		upsertCorporationProfile: tax.upsertCorporationProfile,
		getUpcomingFilings: tax.getUpcomingFilings,
		getFilingDraft: tax.getFilingDraft,
		getFilingPenaltySimulation: tax.getFilingPenaltySimulation,
		recomputeFiling: tax.recomputeFiling,
		getPendingWithholding: tax.getPendingWithholding,
		fileWithholding: tax.fileWithholding,
		getTaxInvoices: tax.getTaxInvoices,
		runTaxStrategy: tax.runStrategy,
	};
}

function createAxiosInstance(): AxiosInstance {
	return axios.create({
		baseURL: apiConfig.apiBaseUrl,
		headers: {
			"Content-Type": "application/json",
		},
		timeout: 30_000,
	});
}

async function streamTaxStrategy(
	getIdToken: GetIdToken,
	tenantId: string,
	scenario: TaxStrategyScenario,
	onEvent?: (event: TaxStrategyEvent) => void,
) {
	return streamStrategyEvents<TaxStrategyEvent>({
		body: { tenantId, scenario },
		emptyStreamMessage: "세무 전략 API 응답 스트림이 비어 있습니다.",
		getIdToken,
		onEvent,
		url: `${apiConfig.taxStrategyBaseUrl}${apiEndpoints.taxStrategy(tenantId)}`,
	});
}

async function streamFxStrategy(
	getIdToken: GetIdToken,
	tenantId: string,
	scenario: FxStrategyScenario,
	onEvent?: (event: FxStrategyEvent) => void,
) {
	return streamStrategyEvents<FxStrategyEvent>({
		body: { tenantId, scenario },
		emptyStreamMessage: "외환 전략 API 응답 스트림이 비어 있습니다.",
		getIdToken,
		onEvent,
		url: `${apiConfig.fxStrategyBaseUrl}${apiEndpoints.fxStrategy(tenantId)}`,
	});
}

async function streamStrategyEvents<T>({
	body,
	emptyStreamMessage,
	getIdToken,
	onEvent,
	url,
}: {
	body: Record<string, unknown>;
	emptyStreamMessage: string;
	getIdToken: GetIdToken;
	onEvent?: (event: T) => void;
	url: string;
}) {
	const response = await fetch(url, {
		body: JSON.stringify(body),
		headers: {
			Accept: "text/event-stream",
			Authorization: `Bearer ${await getIdToken()}`,
			"Cache-Control": "no-cache",
			"Content-Type": "application/json",
		},
		method: "POST",
	});

	if (!response.ok) {
		throw new YmApiError(await responseErrorMessage(response), response.status);
	}

	if (!response.body) {
		throw new YmApiError(emptyStreamMessage, response.status);
	}

	const events: T[] = [];
	const emit = (event: T) => {
		events.push(event);
		onEvent?.(event);
	};
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		buffer = consumeSseBuffer<T>(buffer, emit, (data) => ({
			type: "message",
			chunk: data,
		}) as T);
	}

	buffer += decoder.decode();
	consumeSseBuffer<T>(`${buffer}\n\n`, emit, (data) => ({
		type: "message",
		chunk: data,
	}) as T);

	return events;
}

async function streamSync(
	getIdToken: GetIdToken,
	tenantId: string,
	body?: { accountIds?: string[]; from?: string; to?: string },
): Promise<SyncStartResponse> {
	const startedAt = new Date().toISOString();
	const response = await fetch(
		`${apiConfig.syncStreamBaseUrl}${apiEndpoints.sync(tenantId)}`,
		{
			body: JSON.stringify(body ?? {}),
			headers: {
				Accept: "text/event-stream",
				Authorization: `Bearer ${await getIdToken()}`,
				"Cache-Control": "no-cache",
				"Content-Type": "application/json",
			},
			method: "POST",
		},
	);

	if (!response.ok) {
		throw new YmApiError(await responseErrorMessage(response), response.status);
	}

	if (!response.body) {
		throw new YmApiError(
			"계좌 수집 API 응답 스트림이 비어 있습니다.",
			response.status,
		);
	}

	const events: SyncStreamEvent[] = [];
	const accounts: Extract<SyncStreamEvent, { type: "account" }>[] = [];
	let syncRunId: string | null = null;
	let dateRange: SyncStartResponse["dateRange"];
	const streamState: {
		doneEvent?: Extract<SyncStreamEvent, { type: "done" }>;
		errorEvent?: Extract<SyncStreamEvent, { type: "error" }>;
	} = {};
	const emit = (event: SyncStreamEvent) => {
		events.push(event);

		if (event.type === "run-started") {
			syncRunId = event.syncRunId;
			dateRange = event.dateRange;
		}

		if (event.type === "account") {
			accounts.push(event);
		}

		if (event.type === "error") {
			streamState.errorEvent = event;
		}

		if (event.type === "done") {
			syncRunId = event.syncRunId;
			streamState.doneEvent = event;
		}
	};
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();

		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		buffer = consumeSseBuffer<SyncStreamEvent>(buffer, emit, (data) => ({
			type: "progress",
			message: data,
		}));
	}

	buffer += decoder.decode();
	consumeSseBuffer<SyncStreamEvent>(`${buffer}\n\n`, emit, (data) => ({
		type: "progress",
		message: data,
	}));

	const completedAt = new Date().toISOString();
	const doneEvent = streamState.doneEvent;
	const errorEvent = streamState.errorEvent;
	const failed = Boolean(errorEvent || doneEvent?.failed || !doneEvent);

	return {
		accounts,
		completedAt,
		dateRange,
		durationMs: doneEvent?.durationMs,
		errorReason: formatSyncStreamError(errorEvent, doneEvent),
		events,
		failed,
		startedAt,
		status: failed ? "failed" : "completed",
		syncRunId,
		totals: doneEvent?.totals,
	};
}

function formatSyncStreamError(
	errorEvent: Extract<SyncStreamEvent, { type: "error" }> | undefined,
	doneEvent: Extract<SyncStreamEvent, { type: "done" }> | undefined,
) {
	if (errorEvent) {
		return errorEvent.status
			? `SSE 내부 오류 (${errorEvent.status}): ${errorEvent.reason}`
			: `SSE 내부 오류: ${errorEvent.reason}`;
	}

	if (!doneEvent) {
		return "수집 스트림이 완료 이벤트 없이 종료되었습니다.";
	}

	return undefined;
}

function consumeSseBuffer<T>(
	buffer: string,
	emit: (event: T) => void,
	fallback: (data: string) => T,
) {
	const frames = buffer.split(/\r?\n\r?\n/);
	const rest = frames.pop() ?? "";

	for (const frame of frames) {
		const data = frame
			.split(/\r?\n/)
			.filter((line) => line.startsWith("data:"))
			.map((line) => line.slice(5).trimStart())
			.join("\n");

		if (!data) {
			continue;
		}

		try {
			emit(JSON.parse(data) as T);
		} catch {
			emit(fallback(data));
		}
	}

	return rest;
}

async function responseErrorMessage(response: Response) {
	try {
		const body = (await response.clone().json()) as ApiErrorBody;
		return (
			body?.error?.message ??
			body?.message ??
			fallbackErrorMessage(response.status)
		);
	} catch {
		try {
			const text = await response.text();
			return text || fallbackErrorMessage(response.status);
		} catch {
			return fallbackErrorMessage(response.status);
		}
	}
}

function toApiError(error: unknown) {
	if (error instanceof YmApiError) {
		return error;
	}

	if (axios.isAxiosError(error)) {
		const status = error.response?.status ?? 0;
		const body = error.response?.data as ApiErrorBody | undefined;
		const code = body?.error?.code;
		const message =
			body?.error?.message ?? body?.message ?? fallbackErrorMessage(status);

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

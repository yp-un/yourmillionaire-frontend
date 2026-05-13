export type HealthResponse = {
  status: "ok";
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export type ApiNumber = number | string;

export type MeResponse = {
  id: string;
  cognitoSub: string;
  email: string;
  defaultTenantId: string;
  tenantType?: TenantType;
};

export type TenantType = "corporation" | "personal";

export type Tenant = {
  id: string;
  legalName: string;
  displayName: string;
};

export type CreateTenantRequest = {
  legalName: string;
  displayName: string;
  bizRegNo?: string;
};

export type CreateTenantResponse = {
  id: string;
  legalName: string;
  displayName: string;
};

export type BankConnectionRequest = {
  organization: string;
  loginId: string;
  loginPassword: string;
  birthDate?: string;
};

export type DiscoveredBankAccount = {
  accountNumber: string;
  accountName: string;
  balance: string;
};

export type BankConnectionResponse = {
  connectionId: string;
  accounts: DiscoveredBankAccount[];
};

export type CreateBankAccountRequest = {
  organization: string;
  accountNumber: string;
};

export type BankAccount = {
  id: string;
  tenantId: string;
  organization: string;
  accountNumber: string;
  isActive: boolean;
};

export type JournalLine = {
  lineNo: number;
  accountCode: string;
  accountName?: string | null;
  accountType?: AccountType | string | null;
  debit: ApiNumber;
  credit: ApiNumber;
  memo?: string | null;
};

export type JournalConfidenceStatus = "certain" | "discarded" | "uncertain";
export type JournalEntryStatus = "draft" | "posted" | "reversed" | string;

export type JournalEntry = {
  id: string;
  tenantId: string;
  entryDate: string;
  postingDate?: string | null;
  source?: "codef_bank" | "manual" | string;
  sourceRefId?: string | null;
  description?: string | null;
  status?: JournalEntryStatus;
  confidenceStatus?: JournalConfidenceStatus;
  confidence?: number | null;
  origin?: "manual" | "heuristic" | "ai" | "ai_low_conf" | string | null;
  syncRunId?: string | null;
  aiModel?: string | null;
  createdAt?: string;
  createdBy?: string | null;
  lines: JournalLine[];
};

export type JournalEntriesResponse = {
  entries: JournalEntry[];
  accountBalances?: BankAccountBalanceSnapshot[];
  uncertain?: UncertainEntriesSummary;
};

export type BankAccountBalanceSnapshot = {
  id: string;
  organization: string;
  accountNumber: string;
  currentBalance: ApiNumber | null;
  withdrawable: ApiNumber | null;
  currency: "KRW";
  syncedAt: string | null;
  isStale: boolean;
};

export type JournalEntriesQuery = {
  from: string;
  to: string;
  limit?: number;
  offset?: number;
  confidenceStatus?: JournalConfidenceStatus | "all";
};

export type ClassifyJournalRequest = {
  date: string;
  amount: number;
  counterparty: string;
  memo?: string;
};

export type CreateJournalEntryRequest = {
  entryDate: string;
  description?: string;
  lines: Array<{
    lineNo: number;
    accountCode: string;
    debit: number;
    credit: number;
    memo?: string | null;
  }>;
};

export type AccountType = "asset" | "equity" | "expense" | "liability" | "revenue";
export type NormalBalance = "credit" | "debit";

export type AccountChartItem = {
  code: string;
  name: string;
  displayName: string;
  type: AccountType;
  normalBalance: NormalBalance;
  isCurrent: boolean | null;
};

export type AccountsChartResponse = {
  accounts: AccountChartItem[];
};

export type UncertainEntriesSummary = {
  count: number;
  message: string;
  confirmEndpoint: string;
  discardEndpoint: string;
  patchEndpoint: string;
};

export type UpdateEntryLinesRequest = {
  lines: Array<{
    lineNo: number;
    accountCode: string;
    debit: number;
    credit: number;
    memo?: string | null;
  }>;
};

export type SyncRunStatus = "completed" | "failed" | "idle" | "queued" | "running" | "timed_out";

export type SyncRunAccountOutcome = "balance_only" | "codef_error" | "empty_result" | "no_connection" | "success";

export type SyncStreamAccountEvent = {
  type: "account";
  bankAccountId: string;
  organization: string;
  accountNumberMasked: string | null;
  outcome: SyncRunAccountOutcome;
  fetchedCount: number;
  balanceUpdated: boolean;
  balance: {
    previous: number | null;
    current: number | null;
    delta: number | null;
    currency: "KRW";
  } | null;
  codefErrorCode: string | null;
  codefErrorMessage: string | null;
  userMessage: string | null;
};

export type SyncStreamEvent =
  | {
      type: "heartbeat";
      ts: string;
    }
  | {
      type: "run-started";
      syncRunId: string;
      dateRange: { from: string; to: string };
    }
  | {
      type: "progress";
      message: string;
    }
  | SyncStreamAccountEvent
  | {
      type: "classification";
      rawTransactionId: string;
      sourceAccount: string | null;
      occurredAt: string;
      entryDate: string;
      counterparty: string | null;
      memo: string | null;
      amount: number;
      currency: "KRW";
      status: "certain" | "uncertain";
      origin: "heuristic" | "ai" | "ai_low_conf";
      confidence: number | null;
      ruleId: string | null;
      lines: JournalLine[];
      journalEntryId: string;
    }
  | {
      type: "classification-error";
      rawTransactionId: string;
      reason: string;
    }
  | {
      type: "error";
      status: number;
      reason: string;
    }
  | {
      type: "done";
      syncRunId: string;
      totals: {
        accountsScanned: number;
        accountsSucceeded: number;
        accountsFailed: number;
        transactionsFetched: number;
        transactionsCertain: number;
        transactionsUncertain: number;
      };
      durationMs: number;
      failed?: true;
    };

export type SyncStartResponse = {
  syncRunId: string | null;
  status: SyncRunStatus;
  startedAt: string;
  completedAt: string;
  dateRange?: { from: string; to: string };
  totals?: Extract<SyncStreamEvent, { type: "done" }>["totals"];
  durationMs?: number;
  failed?: boolean;
  errorReason?: string;
  accounts: SyncStreamAccountEvent[];
  events: SyncStreamEvent[];
};

export type MonthlySummaryResponse = {
  ym: string;
  income: number;
  expense: number;
  netCashBalance: number;
  forecastNextMonth: number;
  currency: "KRW";
};

export type ReceivableStatus = "COLLECTED" | "DUE_SOON" | "OVERDUE" | "PENDING";

export type ReceivableCard = {
  entryId: string;
  entryDate: string;
  counterparty: string | null;
  amount: number;
  dueDate: string | null;
  daysOverdue: number;
};

export type ReceivablesBoard = {
  pending: ReceivableCard[];
  dueSoon: ReceivableCard[];
  overdue: ReceivableCard[];
  collected: ReceivableCard[];
};

export type UpdateReceivableRequest = {
  status: ReceivableStatus;
  collectedAt?: string;
};

export type AccountBalanceCard = {
  accountCode: string;
  accountName: string;
  displayName: string;
  type: AccountType;
  balance: number;
  currency: string;
};

export type AccountBalancesResponse = {
  balances: AccountBalanceCard[];
};

export type ReportMetadata = {
  generatedAt: string;
  accountingStandard: "K-IFRS";
  uncertainEntryCount: number;
  note: string;
};

export type AmountBreakdown = {
  certain: number;
  uncertain: number;
  total: number;
};

export type ReportLineItem = {
  accountCode: string;
  accountName: string;
  amount: AmountBreakdown;
};

export type ReportSectionBlock = {
  items: ReportLineItem[];
  subtotal: AmountBreakdown;
};

export type IncomeStatementResponse = {
  from: string;
  to: string;
  currency: "KRW";
  revenue: ReportSectionBlock;
  cogs: ReportSectionBlock;
  grossProfit: AmountBreakdown;
  operatingExpenses: ReportSectionBlock;
  operatingIncome: AmountBreakdown;
  nonOperating: ReportSectionBlock;
  netIncomeBeforeTax: AmountBreakdown;
  incomeTax: AmountBreakdown;
  netIncome: AmountBreakdown;
  metadata: ReportMetadata;
};

export type BalanceSheetResponse = {
  asOf: string;
  currency: "KRW";
  assets: {
    current: ReportSectionBlock;
    nonCurrent: ReportSectionBlock;
    total: AmountBreakdown;
  };
  liabilities: {
    current: ReportSectionBlock;
    nonCurrent: ReportSectionBlock;
    total: AmountBreakdown;
  };
  equity: ReportSectionBlock;
  totalLiabilitiesAndEquity: AmountBreakdown;
  metadata: ReportMetadata;
};

export type CashFlowResponse = {
  from: string;
  to: string;
  currency: "KRW";
  method: "indirect";
  operating: ReportSectionBlock;
  investing: ReportSectionBlock;
  financing: ReportSectionBlock;
  netChange: AmountBreakdown;
  openingCash: AmountBreakdown;
  closingCash: AmountBreakdown;
  metadata: ReportMetadata;
};

export type TrialBalanceRow = {
  accountCode: string;
  accountName: string;
  debit: AmountBreakdown;
  credit: AmountBreakdown;
  balance: AmountBreakdown;
};

export type TrialBalanceResponse = {
  asOf: string;
  currency: "KRW";
  rows: TrialBalanceRow[];
  totalDebit: AmountBreakdown;
  totalCredit: AmountBreakdown;
  metadata: ReportMetadata;
};

export type ExchangeRate = {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateType: "cash_buy" | "cash_sell" | "closing" | "transaction" | "tt_buy" | "tt_sell";
  requestedDate: string;
  effectiveDate: string;
  source: "BANK" | "ECOS" | "FALLBACK" | "MANUAL";
};

export type ExchangeRatesResponse = {
  rates: ExchangeRate[];
};

export type FxRevalueResponse = {
  asOf?: string;
  lines?: Array<{
    accountCode: string;
    balance: number;
    currency: string;
    fxGainLoss: number;
    rate: number;
  }>;
  [key: string]: unknown;
};

export type CorporationProfile = {
  tenantId: string;
  foundedOn?: string | null;
  regionCode?: string | null;
  industryCode?: string | null;
  isYouthFounder?: boolean;
  isVentureCertified?: boolean;
  isExternalAudit?: boolean;
  vatPrepaymentRecipient?: boolean;
  withholdingCadence?: "MONTHLY" | "SEMIANNUAL" | null;
  fiscalYearStartMonth?: number | null;
  priorYearCorpTax?: number | null;
  priorYearRevenue?: number | null;
};

export type UpsertCorporationProfileRequest = Omit<CorporationProfile, "tenantId">;

export type FilingKind =
  | "CORP_FINAL"
  | "CORP_INTERIM"
  | "LOCAL_INCOME"
  | "VAT_FINAL"
  | "VAT_PRELIM"
  | "VAT_PREPAYMENT_NOTICE"
  | "WH_MONTHLY"
  | "WH_PAYMENT_STATEMENT"
  | "WH_SEMIANNUAL";

export type FilingObligation = {
  id: string;
  kind: FilingKind | string;
  periodStart: string;
  periodEnd: string;
  businessDueDate: string;
  statutoryDueDate: string;
  status: string;
};

export type FilingsUpcomingResponse = {
  filings: FilingObligation[];
};

export type FilingDraftResponse = {
  filingId: string;
  kind: string;
  periodStart: string;
  periodEnd: string;
  businessDueDate: string;
  draft: Record<string, number | string | null>;
  appliedRules: Array<{
    ruleId: string;
    ruleKind: string;
    rate: number;
    legalBasis: string;
  }>;
  citedChunks: Array<{
    chunkId: string;
    rerankScore: number | null;
    lawId: string | null;
    lawName: string | null;
    articleNumber: string | null;
  }>;
  verification: {
    allRulesApproved: boolean;
    unapprovedRuleIds: string[];
    kbStale: boolean;
  };
  disclaimer: string;
};

export type PenaltySimulationResponse = {
  filingId: string;
  asOf: string;
  daysLate: number;
  penalties: Array<{
    kind: string;
    baseAmount: number;
    rate: number;
    reductionRatio?: number;
    computedAmount: number;
  }>;
  disclaimer: string;
};

export type FilingRecomputeResponse = {
  filingId: string;
  status: string;
  draft: Record<string, number | string | null>;
};

export type WithholdingItem = {
  id: string;
  payeeLabel: string;
  payeeBizNo: string | null;
  incomeType: string;
  grossAmount: number;
  incomeTax: number;
  localIncomeTax: number;
  paymentDate: string;
  filingDueDate: string;
  status: string;
};

export type WithholdingPendingResponse = {
  items: WithholdingItem[];
};

export type TaxInvoiceDirection = "PURCHASE" | "SALE";

export type TaxInvoice = {
  id: string;
  direction: TaxInvoiceDirection | string;
  supplierBizNo: string | null;
  buyerBizNo: string | null;
  supplyAmount: number;
  vatAmount: number;
  writtenDate: string;
  docType: string;
  isZeroRate: boolean;
  isDeductible: boolean;
  nonDeductibleReason: string | null;
};

export type TaxInvoicesResponse = {
  items: TaxInvoice[];
};

export type SearchTaxLawRequest = {
  query: string;
  asOfDate?: string;
  lawId?: string;
  lawType?: "BYLAW" | "DECREE" | "INTERPRETATION" | "LAW" | "REGULATION";
};

export type SearchTaxLawResponse = {
  answer?: string;
  citations?: Array<Record<string, unknown>>;
  results?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type FindBenefitsRequest = {
  asOfDate: string;
  tenantType?: TenantType;
  corpProfile?: {
    industryCode: string;
    foundedAt: string;
    isYouthFounder: boolean;
    hqSigungu: string;
    priorYearRevenue: number;
    priorYearCorpTax?: number;
    isVentureCertified?: boolean;
    isExternalAudit?: boolean;
  };
};

export type FindBenefitsResponse = {
  benefits: Array<Record<string, unknown>>;
  asOfDate: string;
  totalEstimatedSavings: {
    amount: number;
    currency: "KRW";
  };
  disclaimer: string;
  verification: {
    cacheHit: boolean;
    kbStale: boolean;
    lastSyncedAt: string | null;
  };
  pending?: string;
};

export type TaxStrategyScenario =
  | "applicable_benefits"
  | "penalty_risk_check"
  | "upcoming_deadlines"
  | "vat_quarter_review"
  | "yearly_filing_check";

export type TaxStrategyEvent = {
  type: string;
  chunk?: string;
  durationMs?: number;
  input?: unknown;
  keys?: string[];
  metadata?: Record<string, unknown>;
  name?: string;
  reason?: string;
  recoverable?: boolean;
  runId?: string;
  scenario?: TaxStrategyScenario | string;
  summary?: string;
  tokens?: {
    input?: number;
    output?: number;
  };
  toolCalls?: number;
  [key: string]: unknown;
};

export type AdminTaxRulesResponse = {
  rules: Array<Record<string, unknown>>;
};

export type AdminTaxRuleChangeLogResponse = {
  entries: Array<Record<string, unknown>>;
};

export type AdminTaxLawSyncStateResponse = {
  items: Array<Record<string, unknown>>;
};

export type AdminTaxRuleReviewsResponse = {
  items: Array<Record<string, unknown>>;
};

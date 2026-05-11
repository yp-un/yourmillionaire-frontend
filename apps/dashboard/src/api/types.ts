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

export type MeResponse = {
  id: string;
  cognitoSub: string;
  email: string;
  defaultTenantId: string;
};

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
  debit: number;
  credit: number;
  memo: string | null;
};

export type JournalEntry = {
  id: string;
  tenantId?: string;
  entryDate: string;
  source?: "codef_bank" | "manual" | string;
  sourceRefId?: string;
  description?: string;
  aiConfidence?: number;
  aiModel?: string;
  lines: JournalLine[];
};

export type JournalEntriesResponse = {
  entries: JournalEntry[];
};

export type JournalEntriesQuery = {
  from: string;
  to: string;
  limit?: number;
  offset?: number;
};

export type ClassifyJournalRequest = {
  date: string;
  amount: number;
  counterparty: string;
  memo?: string;
};

export type CreateJournalEntryRequest = {
  entryDate: string;
  description: string;
  lines: Array<{
    lineNo: number;
    accountCode: string;
    debit: number;
    credit: number;
  }>;
};

export const apiEndpoints = {
  health: "/health",
  me: "/me",
  meTenants: "/me/tenants",
  tenants: "/tenants",
  bankConnections: (tenantId: string) => `/tenants/${tenantId}/bank-connections`,
  bankAccounts: (tenantId: string) => `/tenants/${tenantId}/bank-accounts`,
  journalEntries: (tenantId: string) => `/tenants/${tenantId}/journal/entries`,
  journalClassify: (tenantId: string) => `/tenants/${tenantId}/journal/classify`
} as const;

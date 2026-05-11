import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useApi } from "../api/ApiProvider";
import { YmApiError } from "../api/client";
import type { MeResponse, Tenant } from "../api/types";
import { useAuth } from "../auth/AuthProvider";

const selectedTenantKey = "ym.selectedTenantId.v1";

type HealthStatus = "checking" | "down" | "ok";
type WorkspaceStatus = "loading" | "ready" | "error";

type WorkspaceContextValue = {
  error: string | null;
  healthStatus: HealthStatus;
  me: MeResponse | null;
  reload: () => Promise<void>;
  selectTenant: (tenantId: string) => void;
  selectedTenant: Tenant | null;
  selectedTenantId: string | null;
  status: WorkspaceStatus;
  tenants: Tenant[];
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { signOut } = useAuth();
  const [status, setStatus] = useState<WorkspaceStatus>("loading");
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setHealthStatus("checking");

    const healthPromise = api
      .getHealth()
      .then(() => setHealthStatus("ok"))
      .catch(() => setHealthStatus("down"));

    try {
      const [nextMe, nextTenants] = await Promise.all([api.getMe(), api.getTenants()]);
      const nextSelectedTenantId = resolveSelectedTenantId(nextMe, nextTenants);

      setMe(nextMe);
      setTenants(nextTenants);
      setSelectedTenantId(nextSelectedTenantId);

      if (nextSelectedTenantId) {
        localStorage.setItem(selectedTenantKey, nextSelectedTenantId);
      }

      setStatus("ready");
    } catch (loadError) {
      if (loadError instanceof YmApiError && loadError.status === 401) {
        signOut();
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "워크스페이스 정보를 불러오지 못했습니다.");
      setStatus("error");
    } finally {
      await healthPromise;
    }
  }, [api, signOut]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectTenant = useCallback(
    (tenantId: string) => {
      const tenantExists = tenants.some((tenant) => tenant.id === tenantId);

      if (!tenantExists) {
        return;
      }

      localStorage.setItem(selectedTenantKey, tenantId);
      setSelectedTenantId(tenantId);
    },
    [tenants]
  );

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      error,
      healthStatus,
      me,
      reload,
      selectTenant,
      selectedTenant,
      selectedTenantId,
      status,
      tenants
    }),
    [error, healthStatus, me, reload, selectTenant, selectedTenant, selectedTenantId, status, tenants]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }

  return context;
}

function resolveSelectedTenantId(me: MeResponse, tenants: Tenant[]) {
  const storedTenantId = localStorage.getItem(selectedTenantKey);

  if (storedTenantId && tenants.some((tenant) => tenant.id === storedTenantId)) {
    return storedTenantId;
  }

  if (tenants.some((tenant) => tenant.id === me.defaultTenantId)) {
    return me.defaultTenantId;
  }

  return tenants[0]?.id ?? me.defaultTenantId ?? null;
}

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useAuth } from "../auth/AuthProvider";
import { createYmApi, type YmApi } from "./client";

const ApiContext = createContext<YmApi | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const { getIdToken } = useAuth();
  const api = useMemo(() => createYmApi(getIdToken), [getIdToken]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const context = useContext(ApiContext);

  if (!context) {
    throw new Error("useApi must be used within ApiProvider");
  }

  return context;
}

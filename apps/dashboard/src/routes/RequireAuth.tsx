import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { Button } from "@millionaire/ui";

import { useAuth } from "../auth/AuthProvider";
import { WorkspaceProvider } from "../workspace/WorkspaceProvider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <FullPageState title="세션 확인 중" body="저장된 Cognito 세션을 확인하고 있습니다." />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}

export function FullPageState({
  action,
  body,
  title
}: {
  action?: {
    label: string;
    onClick: () => void;
  };
  body: string;
  title: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fafc] p-6 text-[#111827]">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 size-10 animate-pulse rounded-full bg-primary/15" />
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
        {action ? (
          <Button className="mt-6" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </main>
  );
}

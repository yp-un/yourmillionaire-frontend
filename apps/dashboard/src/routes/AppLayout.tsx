import { useState } from "react";
import { NavLink, Outlet, useMatches } from "react-router";
import { Link2, ReceiptText } from "lucide-react";

import { cn } from "@millionaire/ui";

import { SideNav } from "../layout/SideNav";
import type { View } from "../types";
import { useWorkspace } from "../workspace/WorkspaceProvider";
import { FullPageState } from "./RequireAuth";

type DashboardRouteHandle = {
  view: View;
  title: string;
};

const defaultRouteHandle = {
  view: "connections",
  title: "계좌 연결"
} satisfies DashboardRouteHandle;

const mobileNavItems = [
  { label: "계좌 연결", path: "/connections", icon: Link2 },
  { label: "분개 조회", path: "/transactions", icon: ReceiptText }
];

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const routeHandle = useActiveDashboardRoute();
  const workspace = useWorkspace();

  if (workspace.status === "loading") {
    return <FullPageState title="워크스페이스 준비 중" body="사용자 정보와 tenant 목록을 불러오고 있습니다." />;
  }

  if (workspace.status === "error") {
    return (
      <FullPageState
        title="워크스페이스를 불러오지 못했습니다"
        body={workspace.error ?? "잠시 후 다시 시도해 주세요."}
        action={{ label: "다시 시도", onClick: () => void workspace.reload() }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7fafc] text-[#1b1b23]">
      <SideNav
        isOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((value) => !value)}
      />

      <main
        className={cn(
          "min-h-screen pb-20 transition-[padding] duration-200 md:pb-0",
          isSidebarOpen ? "md:pl-64" : "md:pl-20"
        )}
      >
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 border-t border-slate-100 bg-white md:hidden">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-slate-500",
                  isActive && "text-primary"
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

function useActiveDashboardRoute() {
  const matches = useMatches();

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index]?.handle;

    if (isDashboardRouteHandle(handle)) {
      return handle;
    }
  }

  return defaultRouteHandle;
}

function isDashboardRouteHandle(handle: unknown): handle is DashboardRouteHandle {
  if (!handle || typeof handle !== "object") {
    return false;
  }

  return "view" in handle && "title" in handle;
}

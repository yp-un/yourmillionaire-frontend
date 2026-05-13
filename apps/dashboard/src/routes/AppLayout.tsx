import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { BarChart3, DollarSign, FileBarChart, Link2, ReceiptText, ScrollText } from "lucide-react";

import { cn } from "@millionaire/ui";

import { SideNav } from "../layout/SideNav";
import { useWorkspace } from "../workspace/WorkspaceProvider";
import { FullPageState } from "./RequireAuth";

const mobileNavItems = [
  { label: "개요", path: "/overview", icon: BarChart3 },
  { label: "계좌 연결", path: "/connections", icon: Link2 },
  { label: "분개", path: "/transactions", icon: ReceiptText },
  { label: "리포트", path: "/reports", icon: FileBarChart },
  { label: "외환", path: "/fx", icon: DollarSign },
  { label: "세무", path: "/tax", icon: ScrollText }
];

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    <div className="min-h-screen bg-background text-foreground">
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

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-sidebar-border bg-sidebar md:hidden">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground",
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

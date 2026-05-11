import { ChevronLeft, Landmark, Link2, LogOut, ReceiptText } from "lucide-react";
import { NavLink } from "react-router";

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@millionaire/ui";

import { useAuth } from "../auth/AuthProvider";
import { useWorkspace } from "../workspace/WorkspaceProvider";

type SideNavProps = {
  isOpen: boolean;
  onSidebarToggle: () => void;
};

const navItems = [
  { id: "connections", label: "계좌 연결", path: "/connections", icon: Link2 },
  { id: "transactions", label: "분개 조회", path: "/transactions", icon: ReceiptText }
];

export function SideNav({ isOpen, onSidebarToggle }: SideNavProps) {
  const { signOut } = useAuth();
  const { me, selectTenant, selectedTenantId, tenants } = useWorkspace();
  const userInitial = me?.email.slice(0, 1).toUpperCase() ?? "?";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-slate-100 bg-white p-4 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-[width] duration-200 md:flex",
        isOpen ? "w-64" : "w-20"
      )}
    >
      <div className={cn("mb-8 flex items-center gap-3 px-2", !isOpen && "justify-center px-0")}>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
          <Landmark className="size-5" aria-hidden="true" />
        </div>
        <div className={cn(!isOpen && "hidden")}>
          <h1 className="text-xl font-black tracking-normal text-primary">YourMillionaire</h1>
          <p className="text-xs font-medium text-slate-400">Bank Journal Beta</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex h-12 w-full items-center gap-3 rounded-lg px-4 text-left font-medium text-slate-500 transition-colors hover:bg-slate-50",
                  !isOpen && "justify-center px-0",
                  isActive && "bg-indigo-50 font-semibold text-primary"
                )
              }
              aria-label={item.label}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className={cn(!isOpen && "sr-only")}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-slate-100 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-auto w-full justify-start gap-3 rounded-lg bg-slate-50 p-3 text-left hover:bg-slate-100",
                !isOpen && "justify-center bg-transparent p-0 hover:bg-slate-50"
              )}
              aria-label="프로필 메뉴"
              title={!isOpen ? me?.email : undefined}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-indigo-50 text-sm font-bold text-primary"
              >
                {userInitial}
              </span>
              <span className={cn("min-w-0", !isOpen && "hidden")}>
                <span className="block truncate text-sm font-medium text-slate-700">{me?.email ?? "사용자"}</span>
                <span className="block text-xs text-slate-400">프로필</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isOpen ? "center" : "start"}
            className="w-64"
            side={isOpen ? "top" : "right"}
          >
            <DropdownMenuLabel className="space-y-1">
              <span className="block truncate text-sm">{me?.email ?? "사용자"}</span>
              <span className="block text-xs font-normal text-slate-500">프로필</span>
            </DropdownMenuLabel>
            {tenants.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-medium text-slate-500">
                  워크스페이스
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={selectedTenantId ?? undefined} onValueChange={selectTenant}>
                  {tenants.map((tenant) => (
                    <DropdownMenuRadioItem key={tenant.id} value={tenant.id}>
                      <span className="truncate">{tenant.displayName || tenant.legalName}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ hosted: false })}>
              <LogOut className="size-4" aria-hidden="true" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          onClick={onSidebarToggle}
          className={cn(
            "h-12 w-full justify-start gap-3 rounded-lg px-4 text-left font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700",
            !isOpen && "justify-center px-0"
          )}
          aria-label={isOpen ? "사이드바 접기" : "사이드바 펼치기"}
          title={isOpen ? "사이드바 접기" : "사이드바 펼치기"}
        >
          <ChevronLeft className={cn("size-5 transition-transform", !isOpen && "rotate-180")} aria-hidden="true" />
          <span className={cn(!isOpen && "sr-only")}>사이드바 접기</span>
        </Button>
      </div>
    </aside>
  );
}

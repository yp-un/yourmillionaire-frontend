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
	DropdownMenuTrigger,
} from "@millionaire/ui";
import {
	BarChart3,
	ChevronLeft,
	DollarSign,
	FileBarChart,
	Landmark,
	Link2,
	LogOut,
	ReceiptText,
	ScrollText,
} from "lucide-react";
import { NavLink } from "react-router";

import { useAuth } from "../auth/AuthProvider";
import { useWorkspace } from "../workspace/WorkspaceProvider";

type SideNavProps = {
	isOpen: boolean;
	onSidebarToggle: () => void;
};

const navItems = [
	{ id: "overview", label: "개요", path: "/overview", icon: BarChart3 },
	{ id: "connections", label: "계좌 연결", path: "/connections", icon: Link2 },
	{
		id: "transactions",
		label: "분개 조회",
		path: "/transactions",
		icon: ReceiptText,
	},
	{ id: "reports", label: "재무제표", path: "/reports", icon: FileBarChart },
	{ id: "fx", label: "외환 관리", path: "/fx", icon: DollarSign },
	{ id: "tax", label: "세무 관리", path: "/tax", icon: ScrollText },
];

export function SideNav({ isOpen, onSidebarToggle }: SideNavProps) {
	const { signOut } = useAuth();
	const { me, selectTenant, selectedTenantId, tenants } = useWorkspace();
	const userInitial = me?.email.slice(0, 1).toUpperCase() ?? "?";

	return (
		<aside
			className={cn(
				"fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar p-4 transition-[width] duration-200 md:flex",
				isOpen ? "w-64" : "w-20",
			)}
		>
			<div
				className={cn(
					"mb-8 flex items-center px-2",
					!isOpen && "justify-center px-0",
				)}
			>
				<div className="flex size-10 items-center justify-center rounded-full">
					<img
						width={30}
						height={30}
						src="https://cdn.yourmillionaire.kro.kr/logo.png"
						alt="로고"
					/>
				</div>
				<div className={cn(!isOpen && "hidden")}>
					<h1 className="text-xl font-semibold tracking-normal text-primary">
						YourMillionaire
					</h1>
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
									"flex h-12 w-full items-center gap-3 rounded-md px-4 text-left font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
									!isOpen && "justify-center px-0",
									isActive && "bg-sidebar-accent font-semibold text-primary",
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

			<div className="space-y-3 border-t border-sidebar-border pt-4">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							className={cn(
								"h-auto w-full justify-start gap-3 rounded-lg bg-muted p-3 text-left text-foreground hover:bg-sidebar-accent",
								!isOpen &&
									"justify-center bg-transparent p-0 hover:bg-sidebar-accent",
							)}
							aria-label="프로필 메뉴"
							title={!isOpen ? me?.email : undefined}
						>
							<span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-primary text-sm font-bold text-white">
								{userInitial}
							</span>
							<span className={cn("min-w-0", !isOpen && "hidden")}>
								<span className="block truncate text-sm font-medium text-foreground">
									{me?.email ?? "사용자"}
								</span>
								<span className="block text-xs text-muted-foreground">
									프로필
								</span>
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align={isOpen ? "center" : "start"}
						className="w-64"
						side={isOpen ? "top" : "right"}
					>
						<DropdownMenuLabel className="space-y-1">
							<span className="block truncate text-sm">
								{me?.email ?? "사용자"}
							</span>
							<span className="block text-xs font-normal text-muted-foreground">
								프로필
							</span>
						</DropdownMenuLabel>
						{tenants.length > 0 ? (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
									워크스페이스
								</DropdownMenuLabel>
								<DropdownMenuRadioGroup
									value={selectedTenantId ?? undefined}
									onValueChange={selectTenant}
								>
									{tenants.map((tenant) => (
										<DropdownMenuRadioItem key={tenant.id} value={tenant.id}>
											<span className="truncate">
												{tenant.displayName || tenant.legalName}
											</span>
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
						"h-12 w-full justify-start gap-3 rounded-lg px-4 text-left font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
						!isOpen && "justify-center px-0",
					)}
					aria-label={isOpen ? "사이드바 접기" : "사이드바 펼치기"}
					title={isOpen ? "사이드바 접기" : "사이드바 펼치기"}
				>
					<ChevronLeft
						className={cn(
							"size-5 transition-transform",
							!isOpen && "rotate-180",
						)}
						aria-hidden="true"
					/>
					<span className={cn(!isOpen && "sr-only")}>사이드바 접기</span>
				</Button>
			</div>
		</aside>
	);
}

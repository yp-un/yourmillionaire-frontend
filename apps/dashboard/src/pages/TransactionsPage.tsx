import {
	Badge,
	Button,
	cn,
	EmptyState,
	Input,
	MetricCard,
	Notice,
	PageHeader,
	PageShell,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@millionaire/ui";
import {
	AlertTriangle,
	BarChart3,
	CheckCircle2,
	ChevronDown,
	Filter,
	Loader2,
	Search,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { useApi } from "../api/ApiProvider";
import { YmApiError } from "../api/client";
import type {
	BankAccountBalanceSnapshot,
	JournalEntry,
	UncertainEntriesSummary,
} from "../api/types";
import {
	type AccountLabelMap,
	formatCurrency,
	formatJournalLines,
	getCurrentMonthRange,
	getEntryAmount,
	getEntryMovement,
	summarizeEntries,
} from "../lib/journal";
import { useWorkspace } from "../workspace/WorkspaceProvider";

type EntryFilter = "all" | "expense" | "income";
type LoadState = "error" | "loading" | "ready";

export function TransactionsPage() {
	const api = useApi();
	const { selectedTenantId, status: workspaceStatus } = useWorkspace();
	const defaultRange = useMemo(() => getCurrentMonthRange(), []);
	const [from, setFrom] = useState(defaultRange.from);
	const [to, setTo] = useState(defaultRange.to);
	const [entries, setEntries] = useState<JournalEntry[]>([]);
	const [accountBalances, setAccountBalances] = useState<
		BankAccountBalanceSnapshot[]
	>([]);
	const [accountLabels, setAccountLabels] = useState<AccountLabelMap>({});
	const [uncertainSummary, setUncertainSummary] =
		useState<UncertainEntriesSummary | null>(null);
	const [uncertainEntries, setUncertainEntries] = useState<JournalEntry[]>([]);
	const [confirmingEntryId, setConfirmingEntryId] = useState<string | null>(
		null,
	);
	const [filter, setFilter] = useState<EntryFilter>("all");
	const [query, setQuery] = useState("");
	const [offset, setOffset] = useState(0);
	const [requestKey, setRequestKey] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [loadState, setLoadState] = useState<LoadState>("loading");
	const [error, setError] = useState<string | null>(null);
	const limit = 20;
	const summary = useMemo(() => summarizeEntries(entries), [entries]);
	const filteredEntries = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return entries.filter((entry) => {
			const movement = getEntryMovement(entry);
			const matchesFilter = filter === "all" || movement === filter;
			const matchesQuery =
				normalizedQuery.length === 0 ||
				(entry.description ?? "").toLowerCase().includes(normalizedQuery) ||
				entry.lines.some(
					(line) =>
						line.accountCode.includes(normalizedQuery) ||
						(line.memo ?? "").toLowerCase().includes(normalizedQuery),
				);

			return matchesFilter && matchesQuery;
		});
	}, [entries, filter, query]);

	useEffect(() => {
		if (!selectedTenantId || workspaceStatus !== "ready") {
			return;
		}

		let cancelled = false;
		const tenantId = selectedTenantId;

		async function loadEntries() {
			setLoadState("loading");
			setError(null);

			try {
				const response = await api.getJournalEntries(tenantId, {
					confidenceStatus: "all",
					from,
					to,
					limit,
					offset,
				});

				const nextUncertainEntries =
					response.uncertain && response.uncertain.count > 0
						? await api
								.getJournalEntries(tenantId, {
									confidenceStatus: "uncertain",
									from,
									limit: 100,
									offset: 0,
									to,
								})
								.catch(() => ({ entries: [] }))
						: { entries: [] };

				if (!cancelled) {
					const visibleEntries = response.entries.filter(
						(entry) => entry.confidenceStatus !== "discarded",
					);
					setEntries((current) =>
						offset === 0 ? visibleEntries : [...current, ...visibleEntries],
					);
					setAccountBalances(response.accountBalances ?? []);
					setUncertainSummary(response.uncertain ?? null);
					setUncertainEntries(nextUncertainEntries.entries);
					setHasMore(response.entries.length === limit);
					setLoadState("ready");
				}
			} catch (loadError) {
				if (!cancelled) {
					setError(toJournalLoadMessage(loadError));
					setLoadState("error");
				}
			}
		}

		void loadEntries();

		return () => {
			cancelled = true;
		};
	}, [api, from, offset, requestKey, selectedTenantId, to, workspaceStatus]);

	useEffect(() => {
		let cancelled = false;

		api
			.getAccountsChart()
			.then((response) => {
				if (!cancelled) {
					setAccountLabels(
						Object.fromEntries(
							response.accounts.map((account) => [account.code, account.name]),
						),
					);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setAccountLabels({});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [api]);

	function handleApplyRange() {
		setOffset(0);
		setHasMore(true);
		setRequestKey((current) => current + 1);
	}

	async function handleConfirmEntry(entryId: string) {
		if (!selectedTenantId) {
			return;
		}

		setConfirmingEntryId(entryId);
		setError(null);

		try {
			await api.confirmJournalEntry(selectedTenantId, entryId);
			setUncertainEntries((current) =>
				current.filter((entry) => entry.id !== entryId),
			);
			setUncertainSummary((current) =>
				current
					? { ...current, count: Math.max(current.count - 1, 0) }
					: current,
			);
			setOffset(0);
			setRequestKey((current) => current + 1);
		} catch (acceptError) {
			setError(
				acceptError instanceof Error
					? acceptError.message
					: "검토 분개를 확정하지 못했습니다.",
			);
		} finally {
			setConfirmingEntryId(null);
		}
	}

	const stats = [
		{
			label: "조회 범위 입금",
			value: formatCurrency(summary.moneyIn),
			tone: "primary" as const,
		},
		{
			label: "조회 범위 출금",
			value: formatCurrency(summary.moneyOut),
			tone: "danger" as const,
		},
		{
			label: "순현금흐름",
			value: formatCurrency(summary.moneyIn - summary.moneyOut),
			tone: "default" as const,
		},
	];
	const hasUncertainEntries = Boolean(
		uncertainSummary &&
			uncertainSummary.count > 0 &&
			uncertainEntries.length > 0,
	);

	return (
		<PageShell>
			<PageHeader title="분개 원장" />

			<section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="group relative w-full max-w-2xl">
					<Search
						className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary transition-transform group-focus-within:scale-110"
						aria-hidden="true"
					/>
					<Input
						className="h-12 border-border bg-card pl-12 focus-visible:ring-primary/20"
						placeholder="분개 설명, 계정코드, 메모 검색"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>

				<div className="ym-date-grid lg:w-auto lg:min-w-[25rem]">
					<label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
						<span>시작일</span>
						<Input
							className="h-10 w-full bg-card number-tabular"
							type="date"
							value={from}
							onChange={(event) => {
								setFrom(event.target.value);
								setOffset(0);
								setHasMore(true);
							}}
						/>
					</label>
					<label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground">
						<span>종료일</span>
						<Input
							className="h-10 w-full bg-card number-tabular"
							type="date"
							value={to}
							onChange={(event) => {
								setTo(event.target.value);
								setOffset(0);
								setHasMore(true);
							}}
						/>
					</label>
					<Button
						className="h-10 self-end"
						variant="secondary"
						onClick={handleApplyRange}
					>
						조회
					</Button>
				</div>
			</section>

			{error ? <Notice tone="danger">{error}</Notice> : null}

			{hasUncertainEntries && uncertainSummary ? (
				<Notice tone="warning">
					<div className="flex gap-2">
						<AlertTriangle
							className="mt-0.5 size-4 shrink-0"
							aria-hidden="true"
						/>
						<p>{getUncertainSummaryMessage(uncertainEntries.length)}</p>
					</div>
				</Notice>
			) : null}

			{hasUncertainEntries && uncertainSummary ? (
				<section className="ym-surface space-y-4 p-5">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h3 className="text-base font-semibold tracking-normal">
								검토 필요한 거래
							</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								추천 분개를 확인한 뒤 그대로 확정할 수 있습니다.
							</p>
						</div>
						<Badge variant="warning">{uncertainEntries.length}건 대기</Badge>
					</div>

					<div className="grid gap-3">
						{uncertainEntries.map((entry) => (
							<div key={entry.id} className="rounded-md border bg-card p-4">
								<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-semibold text-foreground">
												{entry.entryDate}
											</span>
											<Badge variant="outline">
												{entryOriginLabel(entry.origin)}
											</Badge>
											<Badge variant="warning">
												확신도 {formatConfidence(entry.confidence)}
											</Badge>
										</div>
										<div className="mt-3 grid gap-2 text-sm">
											{entry.lines.map((line) => (
												<div
													key={line.lineNo}
													className="ym-panel flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
												>
													<span className="font-medium text-foreground">
														{line.accountName ??
															getAccountLabelForEntry(
																line.accountCode,
																accountLabels,
															)}
													</span>
													<span className="number-tabular text-muted-foreground">
														차변 {formatCurrency(line.debit)} / 대변{" "}
														{formatCurrency(line.credit)}
													</span>
												</div>
											))}
										</div>
									</div>
									<Button
										className="shrink-0"
										variant="outline"
										onClick={() => void handleConfirmEntry(entry.id)}
										disabled={confirmingEntryId === entry.id}
									>
										{confirmingEntryId === entry.id ? (
											<Loader2
												className="size-4 animate-spin"
												aria-hidden="true"
											/>
										) : (
											<CheckCircle2 className="size-4" aria-hidden="true" />
										)}
										추천 분개 확정
									</Button>
								</div>
							</div>
						))}
					</div>
				</section>
			) : null}

			<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{stats.map((stat) => (
					<MetricCard
						key={stat.label}
						icon={BarChart3}
						label={stat.label}
						value={stat.value}
						tone={stat.tone}
					/>
				))}
			</section>

			{accountBalances.length > 0 ? (
				<section className="space-y-3">
					<div>
						<h3 className="text-base font-semibold tracking-normal">
							주요 계정 잔액
						</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							조회 범위 기준으로 집계된 계정별 잔액입니다.
						</p>
					</div>
					<div className="grid gap-3 md:grid-cols-3">
						{accountBalances.slice(0, 3).map((balance) => (
							<div key={balance.id} className="ym-surface p-4">
								<div className="flex items-center justify-between gap-3">
									<p className="truncate text-sm font-medium text-muted-foreground">
										{bankLabel(balance.organization)}
									</p>
									{balance.isStale ? (
										<Badge variant="warning">갱신 필요</Badge>
									) : (
										<Badge variant="success">최신</Badge>
									)}
								</div>
								<p className="mt-2 text-sm text-muted-foreground number-tabular">
									{balance.accountNumber}
								</p>
								<p className="mt-2 text-xl font-semibold number-tabular">
									{formatCurrency(balance.currentBalance)}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									출금 가능 {formatCurrency(balance.withdrawable)} ·{" "}
									{formatNullableDateTime(balance.syncedAt)}
								</p>
							</div>
						))}
					</div>
				</section>
			) : null}

			<section className="ym-surface overflow-hidden">
				<div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-wrap gap-2">
						<FilterButton
							active={filter === "all"}
							onClick={() => setFilter("all")}
						>
							전체 내역
						</FilterButton>
						<FilterButton
							active={filter === "income"}
							onClick={() => setFilter("income")}
						>
							수입
						</FilterButton>
						<FilterButton
							active={filter === "expense"}
							onClick={() => setFilter("expense")}
						>
							지출
						</FilterButton>
					</div>
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						<Filter className="size-4" aria-hidden="true" />
						<span>{filteredEntries.length}건 표시</span>
					</div>
				</div>

				{loadState === "loading" && entries.length === 0 ? (
					<div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
						<Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
						분개를 불러오는 중
					</div>
				) : filteredEntries.length === 0 ? (
					<EmptyState icon={BarChart3} title="표시할 분개가 없습니다">
						날짜 범위를 조정하거나 계좌 등록 후 수집 파이프라인이 완료될 때까지
						기다려 주세요.
					</EmptyState>
				) : (
					<Table className="min-w-[880px]">
						<TableHeader>
							<TableRow className="bg-muted/70 uppercase hover:bg-muted/70">
								<TableHead className="px-6 py-4">날짜</TableHead>
								<TableHead className="px-6 py-4">내용</TableHead>
								<TableHead className="px-6 py-4">분개</TableHead>
								<TableHead className="px-6 py-4 text-right">금액</TableHead>
								<TableHead className="px-6 py-4">AI 상태</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredEntries.map((entry) => {
								const movement = getEntryMovement(entry);
								const confidence = entry.confidence ?? 1;

								return (
									<TableRow key={entry.id}>
										<TableCell className="px-6 py-4 text-sm text-muted-foreground number-tabular">
											{entry.entryDate}
										</TableCell>
										<TableCell className="max-w-[260px] px-6 py-4">
											<p className="truncate font-semibold text-foreground">
												{entry.description ?? "거래 분개"}
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{entry.source === "codef_bank"
													? "은행 자동 수집"
													: "수동 입력"}
											</p>
										</TableCell>
										<TableCell className="max-w-[360px] px-6 py-4 text-sm leading-6 text-muted-foreground">
											<span className="line-clamp-2">
												{formatJournalLines(entry, accountLabels)}
											</span>
										</TableCell>
										<TableCell
											className={cn(
												"px-6 py-4 text-right font-semibold number-tabular",
												movement === "income"
													? "text-primary"
													: movement === "expense"
														? "text-destructive"
														: "text-foreground",
											)}
										>
											{movement === "income"
												? "+"
												: movement === "expense"
													? "-"
													: ""}
											{formatCurrency(getEntryAmount(entry))}
										</TableCell>
										<TableCell className="px-6 py-4">
											<Badge
												variant={
													entry.confidenceStatus === "uncertain" ||
													confidence < 0.5
														? "warning"
														: "success"
												}
											>
												{entry.confidenceStatus === "uncertain"
													? "검토 필요"
													: `${Math.round(confidence * 100)}%`}
											</Badge>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}

				<div className="flex justify-center bg-muted/60 p-5">
					<Button
						variant="ghost"
						disabled={loadState === "loading" || !hasMore}
						onClick={() => setOffset((current) => current + limit)}
					>
						{loadState === "loading" && entries.length > 0 ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<ChevronDown className="size-4" aria-hidden="true" />
						)}
						{hasMore ? "더 많은 내역 보기" : "마지막 내역입니다"}
					</Button>
				</div>
			</section>
		</PageShell>
	);
}

function formatConfidence(value: number | null | undefined) {
	if (value === null || value === undefined) {
		return "없음";
	}

	return `${Math.round(value * 100)}%`;
}

function entryOriginLabel(origin: string | null | undefined) {
	const labels: Record<string, string> = {
		ai: "AI 분류",
		ai_low_conf: "AI 검토",
		heuristic: "규칙 기반",
		manual: "수동 입력",
	};

	return origin ? (labels[origin] ?? origin) : "자동 분류";
}

function getAccountLabelForEntry(
	accountCode: string,
	accountLabels: AccountLabelMap,
) {
	return accountLabels[accountCode] ?? "미지정 계정";
}

function bankLabel(organization: string) {
	const labels: Record<string, string> = {
		"0011": "NH농협은행",
		"0012": "지역농축협",
		"0088": "신한은행",
	};

	return labels[organization] ?? organization;
}

function getUncertainSummaryMessage(count: number) {
	return `AI가 자동 분류한 거래 중 ${count}건은 확인이 필요합니다. 추천 분개를 검토한 뒤 확정해 주세요.`;
}

function formatNullableDateTime(value: string | null | undefined) {
	if (!value) {
		return "동기화 전";
	}

	return new Intl.DateTimeFormat("ko-KR", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
}

function FilterButton({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: ReactNode;
	onClick: () => void;
}) {
	return (
		<Button
			className={cn(
				"h-9 rounded-md px-3 text-sm font-medium",
				active
					? "bg-accent text-primary hover:bg-accent"
					: "text-muted-foreground",
			)}
			onClick={onClick}
			type="button"
			variant={active ? "secondary" : "ghost"}
		>
			{children}
		</Button>
	);
}

function toJournalLoadMessage(error: unknown) {
	if (error instanceof YmApiError) {
		if (error.status === 403) {
			return "이 워크스페이스의 분개를 조회할 권한이 없습니다.";
		}

		if (error.status === 422) {
			return "날짜 범위 또는 페이지 크기 형식이 올바르지 않습니다.";
		}

		return error.message;
	}

	return error instanceof Error ? error.message : "분개를 불러오지 못했습니다.";
}

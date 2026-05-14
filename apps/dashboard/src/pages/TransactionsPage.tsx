import {
	Badge,
	Button,
	cn,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@millionaire/ui";
import {
	AlertTriangle,
	Ban,
	BarChart3,
	CheckCircle2,
	ChevronDown,
	Filter,
	Loader2,
	Pencil,
	Plus,
	Save,
	Search,
	X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "../api/ApiProvider";
import { YmApiError } from "../api/client";
import type {
	AccountChartItem,
	BankAccountBalanceSnapshot,
	CreateJournalEntryRequest,
	JournalEntry,
	UncertainEntriesSummary,
} from "../api/types";
import {
	EmptyState,
	MetricCard,
	Notice,
	PageHeader,
	PageShell,
	SectionCard,
} from "../components/page";
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
type JournalLineDraft = {
	id: string;
	accountCode: string;
	credit: string;
	debit: string;
	memo: string;
};

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
	const [accountOptions, setAccountOptions] = useState<AccountChartItem[]>([]);
	const [accountLabels, setAccountLabels] = useState<AccountLabelMap>({});
	const [uncertainSummary, setUncertainSummary] =
		useState<UncertainEntriesSummary | null>(null);
	const [uncertainEntries, setUncertainEntries] = useState<JournalEntry[]>([]);
	const [confirmingEntryId, setConfirmingEntryId] = useState<string | null>(
		null,
	);
	const [discardingEntryId, setDiscardingEntryId] = useState<string | null>(
		null,
	);
	const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
	const [editingLines, setEditingLines] = useState<JournalLineDraft[]>([]);
	const [savingEditedEntryId, setSavingEditedEntryId] = useState<string | null>(
		null,
	);
	const [manualOpen, setManualOpen] = useState(false);
	const [manualPhase, setManualPhase] = useState<"closed" | "line" | "open">("closed");
	const manualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function handleManualToggle() {
		if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
		if (!manualOpen) {
			// 열기: line(150ms) → clip-path 확장(700ms) → height 성장(900ms)
			setManualOpen(true);
			setManualPhase("line");
			manualTimerRef.current = setTimeout(() => setManualPhase("open"), 380); // 80 + 300
		} else {
			// 닫기: height 축소(350ms) → clip-path 수렴(300ms) → 숨김
			setManualOpen(false);
			setManualPhase("line");
			manualTimerRef.current = setTimeout(() => setManualPhase("closed"), 680); // 350 + 300 + 30
		}
	}
	const [manualEntryDate, setManualEntryDate] = useState(getTodayDateInput());
	const [manualDescription, setManualDescription] = useState("");
	const [manualLines, setManualLines] = useState<JournalLineDraft[]>(
		createDefaultLineDrafts,
	);
	const [manualSaving, setManualSaving] = useState(false);
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
				entry.lines.some((line) => {
					const accountLabel = (
						line.accountName ??
						getAccountLabelForEntry(line.accountCode, accountLabels)
					).toLowerCase();

					return (
						accountLabel.includes(normalizedQuery) ||
						(line.memo ?? "").toLowerCase().includes(normalizedQuery)
					);
				});

			return matchesFilter && matchesQuery;
		});
	}, [accountLabels, entries, filter, query]);

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
					setAccountOptions(
						response.accounts.filter((account) => account.isCurrent !== false),
					);
					setAccountLabels(
						Object.fromEntries(
							response.accounts.map((account) => [account.code, account.name]),
						),
					);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setAccountOptions([]);
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
			if (editingEntryId === entryId) {
				setEditingEntryId(null);
				setEditingLines([]);
			}
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

	async function handleCreateManualEntry() {
		if (!selectedTenantId || manualSaving) {
			return;
		}

		if (!/^\d{4}-\d{2}-\d{2}$/.test(manualEntryDate)) {
			setError("분개 일자를 선택해 주세요.");
			return;
		}

		const parsed = buildJournalLines(manualLines);
		if (!parsed.ok) {
			setError(parsed.message);
			return;
		}

		setManualSaving(true);
		setError(null);

		try {
			await api.createJournalEntry(selectedTenantId, {
				description: manualDescription.trim() || undefined,
				entryDate: manualEntryDate,
				lines: parsed.lines,
			});
			setManualDescription("");
			setManualEntryDate(getTodayDateInput());
			setManualLines(createDefaultLineDrafts());
			setManualOpen(false);
			setOffset(0);
			setRequestKey((current) => current + 1);
		} catch (createError) {
			setError(
				createError instanceof Error
					? createError.message
					: "수동 분개를 저장하지 못했습니다.",
			);
		} finally {
			setManualSaving(false);
		}
	}

	function startEditingEntry(entry: JournalEntry) {
		setEditingEntryId(entry.id);
		setEditingLines(entry.lines.map((line) => createLineDraft(line)));
	}

	async function handleSaveEditedEntry(entryId: string) {
		if (!selectedTenantId || savingEditedEntryId) {
			return;
		}

		const parsed = buildJournalLines(editingLines);
		if (!parsed.ok) {
			setError(parsed.message);
			return;
		}

		setSavingEditedEntryId(entryId);
		setError(null);

		try {
			await api.updateJournalEntryLines(selectedTenantId, entryId, {
				lines: parsed.lines,
			});
			setEditingEntryId(null);
			setEditingLines([]);
			setOffset(0);
			setRequestKey((current) => current + 1);
		} catch (updateError) {
			setError(
				updateError instanceof Error
					? updateError.message
					: "검토 분개를 수정하지 못했습니다.",
			);
		} finally {
			setSavingEditedEntryId(null);
		}
	}

	async function handleDiscardEntry(entryId: string) {
		if (!selectedTenantId || discardingEntryId) {
			return;
		}

		setDiscardingEntryId(entryId);
		setError(null);

		try {
			await api.discardJournalEntry(selectedTenantId, entryId);
			setUncertainEntries((current) =>
				current.filter((entry) => entry.id !== entryId),
			);
			setUncertainSummary((current) =>
				current
					? { ...current, count: Math.max(current.count - 1, 0) }
					: current,
			);
			if (editingEntryId === entryId) {
				setEditingEntryId(null);
				setEditingLines([]);
			}
			setOffset(0);
			setRequestKey((current) => current + 1);
		} catch (discardError) {
			setError(
				discardError instanceof Error
					? discardError.message
					: "검토 분개를 제외하지 못했습니다.",
			);
		} finally {
			setDiscardingEntryId(null);
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
			<PageHeader
				title="분개 원장"
				actions={
					<Button
						type="button"
						variant={manualOpen ? "secondary" : "default"}
						onClick={handleManualToggle}
					>
						{manualOpen ? (
							<X className="size-4" aria-hidden="true" />
						) : (
							<Plus className="size-4" aria-hidden="true" />
						)}
						수동 분개
					</Button>
				}
			/>

			<div
				style={{
					overflow: "hidden",
					maxHeight:
						manualPhase === "closed"
							? "0px"
							: manualPhase === "line"
								? "2px"
								: "800px",
					transition:
						manualPhase === "open"
							? "max-height 420ms cubic-bezier(0.4, 0, 0.2, 1)"
							: manualPhase === "line" && !manualOpen
								? "max-height 350ms cubic-bezier(0.4, 0, 0.2, 1)"
								: "none",
				}}
			>
				<div
					style={{
						clipPath:
							manualPhase === "open" ||
							(manualPhase === "line" && manualOpen)
								? "inset(0 0% 0 0%)"
								: "inset(0 50% 0 50%)",
						transition:
							manualPhase === "line" && manualOpen
								? "clip-path 300ms cubic-bezier(0.4, 0, 0.2, 1)"         // 열기: 즉시 시작
								: manualPhase === "line" && !manualOpen
									? "clip-path 300ms cubic-bezier(0.4, 0, 0.2, 1) 350ms" // 닫기: height 끝난 뒤 시작
									: "none",
					}}
				>
				<SectionCard
					title="수동 분개 입력"
					trailing={<Badge variant="secondary">전문가 모드</Badge>}
				>
						<div className="space-y-4">
							<div className="grid gap-3 lg:grid-cols-[12rem_minmax(0,1fr)]">
								<div className="space-y-2">
									<Label htmlFor="manual-entry-date">일자</Label>
									<Input
										id="manual-entry-date"
										type="date"
										value={manualEntryDate}
										onChange={(event) => setManualEntryDate(event.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="manual-entry-description">내용</Label>
									<Input
										id="manual-entry-description"
										value={manualDescription}
										onChange={(event) =>
											setManualDescription(event.target.value)
										}
										placeholder="예: 외주 디자인 비용 지급"
										maxLength={500}
									/>
								</div>
							</div>

							<JournalLineEditor
								accountOptions={accountOptions}
								lines={manualLines}
								onChange={setManualLines}
							/>

							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm text-muted-foreground">
									차변 합계와 대변 합계가 같아야 저장됩니다.
								</p>
								<Button
									type="button"
									onClick={() => void handleCreateManualEntry()}
									disabled={manualSaving}
								>
									{manualSaving ? (
										<Loader2
											className="size-4 animate-spin"
											aria-hidden="true"
										/>
									) : (
										<Save className="size-4" aria-hidden="true" />
									)}
									분개 저장
								</Button>
							</div>
						</div>
					</SectionCard>
				</div>
			</div>

			<section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="group relative w-full max-w-2xl">
					<Search
						className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary transition-transform group-focus-within:scale-110"
						aria-hidden="true"
					/>
					<Input
						className="h-12 border-border bg-card pl-12 focus-visible:ring-primary/20"
						placeholder="분개 설명, 계정명, 메모 검색"
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
										{editingEntryId === entry.id ? (
											<div className="mt-3">
												<JournalLineEditor
													accountOptions={accountOptions}
													lines={editingLines}
													onChange={setEditingLines}
												/>
											</div>
										) : (
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
										)}
									</div>
									<div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
										{editingEntryId === entry.id ? (
											<>
												<Button
													variant="outline"
													onClick={() => void handleSaveEditedEntry(entry.id)}
													disabled={savingEditedEntryId === entry.id}
												>
													{savingEditedEntryId === entry.id ? (
														<Loader2
															className="size-4 animate-spin"
															aria-hidden="true"
														/>
													) : (
														<Save className="size-4" aria-hidden="true" />
													)}
													수정 저장
												</Button>
												<Button
													variant="ghost"
													onClick={() => {
														setEditingEntryId(null);
														setEditingLines([]);
													}}
												>
													취소
												</Button>
											</>
										) : (
											<>
												<Button
													variant="outline"
													onClick={() => startEditingEntry(entry)}
												>
													<Pencil className="size-4" aria-hidden="true" />
													수정
												</Button>
												<Button
													variant="outline"
													onClick={() => void handleDiscardEntry(entry.id)}
													disabled={discardingEntryId === entry.id}
												>
													{discardingEntryId === entry.id ? (
														<Loader2
															className="size-4 animate-spin"
															aria-hidden="true"
														/>
													) : (
														<Ban className="size-4" aria-hidden="true" />
													)}
													제외
												</Button>
												<Button
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
														<CheckCircle2
															className="size-4"
															aria-hidden="true"
														/>
													)}
													확정
												</Button>
											</>
										)}
									</div>
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

function JournalLineEditor({
	accountOptions,
	lines,
	onChange,
}: {
	accountOptions: AccountChartItem[];
	lines: JournalLineDraft[];
	onChange: (lines: JournalLineDraft[]) => void;
}) {
	const totals = getDraftTotals(lines);
	const isBalanced = totals.debit > 0 && totals.debit === totals.credit;

	function updateLine(id: string, patch: Partial<JournalLineDraft>) {
		onChange(
			lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
		);
	}

	function removeLine(id: string) {
		if (lines.length <= 2) {
			return;
		}

		onChange(lines.filter((line) => line.id !== id));
	}

	return (
		<div className="space-y-3">
			<div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground lg:grid lg:grid-cols-[minmax(14rem,1fr)_9rem_9rem_minmax(10rem,1fr)_2.5rem]">
				<span>계정</span>
				<span className="text-right">차변</span>
				<span className="text-right">대변</span>
				<span>메모</span>
				<span aria-hidden="true" />
			</div>
			<div className="space-y-2">
				{lines.map((line) => (
					<div
						key={line.id}
						className="grid gap-2 rounded-md border bg-card p-3 lg:grid-cols-[minmax(14rem,1fr)_9rem_9rem_minmax(10rem,1fr)_2.5rem] lg:items-center lg:p-2"
					>
						<div className="space-y-1 lg:space-y-0">
							<Label className="text-xs text-muted-foreground lg:hidden">
								계정
							</Label>
							<Select
								value={line.accountCode || undefined}
								onValueChange={(accountCode) =>
									updateLine(line.id, { accountCode })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="계정 선택" />
								</SelectTrigger>
								<SelectContent className="max-h-72">
									{accountOptions.map((account) => (
										<SelectItem key={account.code} value={account.code}>
											{account.name || account.displayName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1 lg:space-y-0">
							<Label className="text-xs text-muted-foreground lg:hidden">
								차변
							</Label>
							<Input
								type="text"
								inputMode="numeric"
								value={line.debit}
								onChange={(event) =>
									updateLine(line.id, { debit: event.target.value })
								}
								className="text-right number-tabular"
								placeholder="0"
							/>
						</div>
						<div className="space-y-1 lg:space-y-0">
							<Label className="text-xs text-muted-foreground lg:hidden">
								대변
							</Label>
							<Input
								type="text"
								inputMode="numeric"
								value={line.credit}
								onChange={(event) =>
									updateLine(line.id, { credit: event.target.value })
								}
								className="text-right number-tabular"
								placeholder="0"
							/>
						</div>
						<div className="space-y-1 lg:space-y-0">
							<Label className="text-xs text-muted-foreground lg:hidden">
								메모
							</Label>
							<Input
								value={line.memo}
								onChange={(event) =>
									updateLine(line.id, { memo: event.target.value })
								}
								placeholder="선택 입력"
								maxLength={500}
							/>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => removeLine(line.id)}
							disabled={lines.length <= 2}
							aria-label="분개 라인 삭제"
						>
							<X className="size-4" aria-hidden="true" />
						</Button>
					</div>
				))}
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={() => onChange([...lines, createLineDraft()])}
				>
					<Plus className="size-4" aria-hidden="true" />
					라인 추가
				</Button>
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<span className="text-muted-foreground">
						차변 {formatCurrency(totals.debit)}
					</span>
					<span className="text-muted-foreground">
						대변 {formatCurrency(totals.credit)}
					</span>
					<Badge variant={isBalanced ? "success" : "warning"}>
						{isBalanced ? "균형" : "불일치"}
					</Badge>
				</div>
			</div>
		</div>
	);
}

function createDefaultLineDrafts() {
	return [createLineDraft(), createLineDraft()];
}

function createLineDraft(
	line?: JournalEntry["lines"][number],
): JournalLineDraft {
	return {
		accountCode: line?.accountCode ?? "",
		credit: line ? String(line.credit ?? 0) : "",
		debit: line ? String(line.debit ?? 0) : "",
		id: crypto.randomUUID(),
		memo: line?.memo ?? "",
	};
}

function buildJournalLines(
	drafts: JournalLineDraft[],
):
	| { ok: true; lines: CreateJournalEntryRequest["lines"] }
	| { ok: false; message: string } {
	const lines = drafts.map((draft, index) => ({
		accountCode: draft.accountCode,
		credit: parseMoney(draft.credit),
		debit: parseMoney(draft.debit),
		lineNo: index + 1,
		memo: draft.memo.trim() || undefined,
	}));

	if (lines.length < 2) {
		return { ok: false, message: "분개 라인은 최소 2개가 필요합니다." };
	}

	if (lines.some((line) => !line.accountCode)) {
		return { ok: false, message: "모든 라인의 계정을 선택해 주세요." };
	}

	if (lines.some((line) => line.debit > 0 && line.credit > 0)) {
		return {
			ok: false,
			message: "한 라인에는 차변과 대변 중 하나만 입력해 주세요.",
		};
	}

	if (lines.every((line) => line.debit === 0 && line.credit === 0)) {
		return { ok: false, message: "차변 또는 대변 금액을 입력해 주세요." };
	}

	const totals = lines.reduce(
		(acc, line) => ({
			credit: acc.credit + line.credit,
			debit: acc.debit + line.debit,
		}),
		{ credit: 0, debit: 0 },
	);

	if (totals.debit !== totals.credit) {
		return {
			ok: false,
			message: "차변 합계와 대변 합계가 같아야 합니다.",
		};
	}

	return { ok: true, lines };
}

function getDraftTotals(lines: JournalLineDraft[]) {
	return lines.reduce(
		(acc, line) => ({
			credit: acc.credit + parseMoney(line.credit),
			debit: acc.debit + parseMoney(line.debit),
		}),
		{ credit: 0, debit: 0 },
	);
}

function parseMoney(value: string) {
	const parsed = Number(value.replace(/,/g, "").trim());
	return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function getTodayDateInput() {
	const parts = new Intl.DateTimeFormat("en-CA", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "Asia/Seoul",
		year: "numeric",
	}).formatToParts(new Date());
	const value = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? "";

	return `${value("year")}-${value("month")}-${value("day")}`;
}

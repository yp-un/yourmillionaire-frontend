import { useEffect, useMemo, useRef, useState } from "react";
import {
	Brain,
	Loader2,
	RefreshCcw,
	Save,
	Sparkles,
	Trash2,
	Wallet,
} from "lucide-react";

import {
	Badge,
	Button,
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
import { EmptyState, MetricCard, Notice, PageHeader, PageShell, SectionCard } from "../components/page";

import { useApi } from "../api/ApiProvider";
import type { ExchangeRate, FxAccount, FxStrategyEvent, FxStrategyScenario } from "../api/types";
import { MoneyBarChart, RateAreaChart } from "../components/LazyDashboardCharts";
import {
	StrategyMarkdownContent,
	useStreamingStrategyText,
} from "../components/StrategyOutput";
import { formatCurrency } from "../lib/journal";
import { useWorkspace } from "../workspace/WorkspaceProvider";

type LoadState = "error" | "loading" | "ready";

const strategyOptions: Array<{
	label: string;
	value: FxStrategyScenario;
}> = [
	{ label: "외화 노출 요약", value: "exposure_summary" },
	{ label: "지금 환전 판단", value: "convert_now_check" },
	{ label: "월간 환율 전망", value: "monthly_outlook" },
];

export function FxPage() {
	const api = useApi();
	const { selectedTenantId, status: workspaceStatus } = useWorkspace();
	const [loadState, setLoadState] = useState<LoadState>("loading");
	const [error, setError] = useState<string | null>(null);
	const [accounts, setAccounts] = useState<FxAccount[]>([]);
	const [rate, setRate] = useState<ExchangeRate | null>(null);
	const [rateHistory, setRateHistory] = useState<ExchangeRate[]>([]);
	const [bankLabel, setBankLabel] = useState("");
	const [balance, setBalance] = useState("");
	const [savingAccount, setSavingAccount] = useState(false);
	const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>({});
	const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null);
	const [strategyScenario, setStrategyScenario] =
		useState<FxStrategyScenario>("exposure_summary");
	const [strategyRunning, setStrategyRunning] = useState(false);
	const [strategyEvents, setStrategyEvents] = useState<FxStrategyEvent[]>([]);
	const strategyOutputRef = useRef<HTMLDivElement | null>(null);

	const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
	const historyFrom = useMemo(() => daysAgoDateInput(30), []);
	const totals = useMemo(() => {
		return accounts.reduce(
			(acc, account) => {
				acc.usd += account.currency === "USD" ? Number(account.balanceFcy ?? 0) : 0;
				acc.krw += Number(account.balanceKrwToday ?? 0);
				return acc;
			},
			{ krw: 0, usd: 0 },
		);
	}, [accounts]);
	const strategyText = useMemo(
		() =>
			strategyEvents
				.filter((event) => event.type === "text_delta" || event.type === "message")
				.map((event) => event.chunk ?? "")
				.join(""),
		[strategyEvents],
	);
	const strategyFinal = useMemo(
		() => [...strategyEvents].reverse().find((event) => event.type === "final"),
		[strategyEvents],
	);
	const strategyError = useMemo(
		() => [...strategyEvents].reverse().find((event) => event.type === "error"),
		[strategyEvents],
	);
	const strategyPendingMessage = useMemo(
		() => getStrategyPendingMessage(strategyEvents),
		[strategyEvents],
	);
	const strategyOutputText = strategyText || strategyFinal?.summary || "";
	const {
		displayedText: displayedStrategyText,
		setAutoScroll: setStrategyAutoScroll,
	} = useStreamingStrategyText(strategyOutputText, strategyRunning);
	const accountChartData = useMemo(
		() =>
			accounts.map((account, index) => ({
				fill: `var(--chart-${(index % 5) + 1})`,
				name: compactLabel(account.bankLabel || account.organization || "USD"),
				value: Number(account.balanceFcy ?? 0),
			})),
		[accounts],
	);
	const rateChartData = useMemo(
		() =>
			rateHistory.map((item) => ({
				name: item.effectiveDate.slice(5),
				value: Number(item.rate),
			})),
		[rateHistory],
	);

	async function loadFxAccounts() {
		if (!selectedTenantId || workspaceStatus !== "ready") {
			return;
		}

		setLoadState("loading");
		setError(null);

		try {
			const [accountsResponse, rateResponse, rateHistoryResponse] = await Promise.all([
				api.getFxAccounts(selectedTenantId),
				api.getUsdKrwRate(today).catch(() => null),
				api
					.getUsdKrwRates({ from: historyFrom, to: today })
					.catch(() => ({ rates: [] })),
			]);

			setAccounts(accountsResponse.accounts);
			setRate(rateResponse);
			setRateHistory(rateHistoryResponse.rates);
			setBalanceInputs(
				Object.fromEntries(
					accountsResponse.accounts.map((account) => [
						account.accountId,
						formatNumberInput(account.balanceFcy),
					]),
				),
			);
			setLoadState("ready");
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : "외환 정보를 불러오지 못했습니다.");
			setLoadState("error");
		}
	}

	useEffect(() => {
		void loadFxAccounts();
	}, [selectedTenantId, workspaceStatus]);

	async function createAccount() {
		if (!selectedTenantId || savingAccount) {
			return;
		}

		const numericBalance = parseAmount(balance);
		if (!numericBalance || numericBalance <= 0) {
			setError("USD 잔액을 0보다 큰 숫자로 입력해 주세요.");
			return;
		}

		setSavingAccount(true);
		setError(null);

		try {
			await api.createFxAccount(selectedTenantId, {
				balance: numericBalance,
				bankLabel: bankLabel.trim() || undefined,
				currency: "USD",
			});
			setBankLabel("");
			setBalance("");
			await loadFxAccounts();
		} catch (createError) {
			setError(createError instanceof Error ? createError.message : "외화 계좌를 등록하지 못했습니다.");
		} finally {
			setSavingAccount(false);
		}
	}

	async function updateBalance(account: FxAccount) {
		if (!selectedTenantId || updatingAccountId) {
			return;
		}

		const nextBalance = parseAmount(balanceInputs[account.accountId] ?? "");
		if (!nextBalance || nextBalance <= 0) {
			setError("USD 잔액을 0보다 큰 숫자로 입력해 주세요.");
			return;
		}

		setUpdatingAccountId(account.accountId);
		setError(null);

		try {
			await api.updateFxAccountBalance(selectedTenantId, account.accountId, {
				balance: nextBalance,
			});
			await loadFxAccounts();
		} catch (updateError) {
			setError(updateError instanceof Error ? updateError.message : "외화 잔액을 갱신하지 못했습니다.");
		} finally {
			setUpdatingAccountId(null);
		}
	}

	async function deleteAccount(account: FxAccount) {
		if (!selectedTenantId || updatingAccountId || account.source !== "manual") {
			return;
		}

		setUpdatingAccountId(account.accountId);
		setError(null);

		try {
			await api.deleteFxAccount(selectedTenantId, account.accountId);
			await loadFxAccounts();
		} catch (deleteError) {
			setError(deleteError instanceof Error ? deleteError.message : "외화 계좌를 삭제하지 못했습니다.");
		} finally {
			setUpdatingAccountId(null);
		}
	}

	async function runStrategy() {
		if (!selectedTenantId || strategyRunning) {
			return;
		}

		setStrategyRunning(true);
		setStrategyEvents([]);
		setError(null);

		try {
			await api.runFxStrategy(selectedTenantId, strategyScenario, (event) => {
				setStrategyEvents((current) => [...current, event]);
			});
		} catch (strategyError) {
			setError(strategyError instanceof Error ? strategyError.message : "외환 전략을 생성하지 못했습니다.");
		} finally {
			setStrategyRunning(false);
		}
	}

	return (
		<PageShell>
			<PageHeader
				title="외환 관리"
				actions={
					<Button onClick={() => void loadFxAccounts()} disabled={loadState === "loading"}>
						{loadState === "loading" ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<RefreshCcw className="size-4" aria-hidden="true" />
						)}
						새로고침
					</Button>
				}
			/>

			{error ? <Notice tone="danger">{error}</Notice> : null}

			<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
				<MetricCard label="USD 보유액" value={formatUsd(totals.usd)} tone="primary" icon={Wallet} />
				<MetricCard label="오늘 원화 환산" value={formatCurrency(totals.krw)} />
				<MetricCard
					label="USD/KRW 기준 환율"
					value={rate ? `${formatNumber(rate.rate)}원` : "-"}
				/>
			</div>

			<div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
				<SectionCard className="min-w-0" title="계좌별 USD 잔액">
					{accountChartData.length > 0 ? (
						<MoneyBarChart
							data={accountChartData}
							height={240}
							valueFormatter={formatUsd}
						/>
					) : (
						<EmptyState icon={Wallet} title="차트로 볼 외화 잔액이 없습니다.">
							USD 계좌를 등록하면 계좌별 잔액을 비교할 수 있습니다.
						</EmptyState>
					)}
				</SectionCard>

				<SectionCard className="min-w-0" title="USD/KRW 30일 추이">
					{rateChartData.length > 0 ? (
						<RateAreaChart data={rateChartData} height={240} />
					) : (
						<p className="text-sm text-muted-foreground">
							표시할 환율 추이 데이터가 없습니다.
						</p>
					)}
				</SectionCard>
			</div>

			<div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
				<SectionCard
					className="min-w-0"
					title="외화 계좌"
					trailing={<Badge variant="secondary">{accounts.length}개</Badge>}
				>
					{accounts.length === 0 && loadState !== "loading" ? (
						<EmptyState icon={Wallet} title="등록된 외화 계좌가 없습니다.">
							USD 외화계좌를 수동으로 등록하면 오늘 환율 기준 원화 환산액과 전략 분석을 확인할 수 있습니다.
						</EmptyState>
					) : (
						<div className="overflow-x-auto">
							<Table className="min-w-[760px]">
								<TableHeader>
									<TableRow className="bg-muted/70 hover:bg-muted/70">
										<TableHead>계좌</TableHead>
										<TableHead>구분</TableHead>
										<TableHead className="text-right">외화 잔액</TableHead>
										<TableHead className="text-right">원화 환산</TableHead>
										<TableHead className="text-right">잔액 관리</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{accounts.map((account) => (
										<TableRow key={account.accountId}>
											<TableCell>
												<div className="font-medium text-foreground">
													{account.bankLabel || account.organization || "외화 계좌"}
												</div>
												<div className="text-xs text-muted-foreground">
													{account.accountNumber || "수동 등록 계좌"}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant={account.source === "manual" ? "secondary" : "outline"}>
													{account.source === "manual" ? "수동 등록" : "은행 연동"}
												</Badge>
											</TableCell>
											<TableCell className="text-right number-tabular">
												{formatUsd(account.balanceFcy)}
											</TableCell>
											<TableCell className="text-right number-tabular">
												{formatCurrency(account.balanceKrwToday ?? 0)}
											</TableCell>
											<TableCell>
												<div className="ml-auto flex max-w-[17rem] justify-end gap-2">
													<Input
														type="text"
														inputMode="decimal"
														value={balanceInputs[account.accountId] ?? ""}
														onChange={(event) =>
															setBalanceInputs((previous) => ({
																...previous,
																[account.accountId]: event.target.value,
															}))
														}
														disabled={account.source !== "manual"}
														aria-label="USD 잔액"
													/>
													<Button
														type="button"
														variant="outline"
														size="icon"
														disabled={account.source !== "manual" || updatingAccountId === account.accountId}
														onClick={() => void updateBalance(account)}
														aria-label="잔액 저장"
													>
														{updatingAccountId === account.accountId ? (
															<Loader2 className="size-4 animate-spin" aria-hidden="true" />
														) : (
															<Save className="size-4" aria-hidden="true" />
														)}
													</Button>
													<Button
														type="button"
														variant="outline"
														size="icon"
														disabled={account.source !== "manual" || updatingAccountId === account.accountId}
														onClick={() => void deleteAccount(account)}
														aria-label="계좌 삭제"
													>
														<Trash2 className="size-4" aria-hidden="true" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</SectionCard>

				<SectionCard className="min-w-0" title="USD 계좌 등록">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="fx-bank-label">표시 이름</Label>
							<Input
								id="fx-bank-label"
								value={bankLabel}
								onChange={(event) => setBankLabel(event.target.value)}
								placeholder="예: 국민은행 USD"
								maxLength={40}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fx-balance">잔액</Label>
							<div className="relative">
								<Input
									id="fx-balance"
									type="text"
									inputMode="decimal"
									value={balance}
									onChange={(event) => setBalance(event.target.value)}
									placeholder="0.00"
									className="pr-14 text-right number-tabular"
								/>
								<span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-muted-foreground">
									USD
								</span>
							</div>
						</div>
						<Button className="w-full" onClick={() => void createAccount()} disabled={savingAccount}>
							{savingAccount ? (
								<Loader2 className="size-4 animate-spin" aria-hidden="true" />
							) : (
								<Wallet className="size-4" aria-hidden="true" />
							)}
							계좌 등록
						</Button>
					</div>
				</SectionCard>
			</div>

			<SectionCard className="min-w-0" title="AI 외환 전략">
				<div className="space-y-4">
					<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
						<p className="text-sm text-muted-foreground">
							등록된 USD 잔액과 오늘 환율을 바탕으로 환전 판단과 노출 현황을 정리합니다.
						</p>
						<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
							<Select
								value={strategyScenario}
								onValueChange={(value) => setStrategyScenario(value as FxStrategyScenario)}
							>
								<SelectTrigger className="w-full sm:w-[12rem]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{strategyOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button onClick={() => void runStrategy()} disabled={strategyRunning}>
								{strategyRunning ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<Sparkles className="size-4" aria-hidden="true" />
								)}
								{strategyRunning ? "분석 중" : "분석 시작"}
							</Button>
						</div>
					</div>
					{strategyError ? (
						<Notice tone="danger">
							{strategyError.reason ?? "외환 전략 분석 중 오류가 발생했습니다."}
						</Notice>
					) : null}
					{displayedStrategyText || strategyRunning ? (
						<StrategyMarkdownContent
							bottomRef={strategyOutputRef}
							content={displayedStrategyText}
							pending={
								strategyRunning &&
								displayedStrategyText.length >= strategyOutputText.length
							}
							pendingMessage={strategyPendingMessage}
							onAutoScrollChange={setStrategyAutoScroll}
						/>
					) : (
						<EmptyState icon={Brain} title="아직 생성된 외환 전략이 없습니다.">
							분석을 시작하면 외화 보유액, 원화 환산액, 환전 판단 기준을 순서대로 보여줍니다.
						</EmptyState>
					)}
				</div>
			</SectionCard>
		</PageShell>
	);
}

function getStrategyPendingMessage(events: FxStrategyEvent[]) {
	const latestUsefulEvent = [...events]
		.reverse()
		.find((event) =>
			["context_ready", "started", "tool_call", "tool_result"].includes(
				event.type,
			),
		);

	if (!latestUsefulEvent) {
		return "분석 중...";
	}

	if (latestUsefulEvent.type === "started") {
		return "외환 전략 분석을 준비하고 있습니다.";
	}

	if (latestUsefulEvent.type === "context_ready") {
		return "외화 계좌와 환율 데이터를 정리했습니다.";
	}

	if (latestUsefulEvent.type === "tool_result") {
		return (
			latestUsefulEvent.summary ?? "확인한 내용을 답변에 반영하고 있습니다."
		);
	}

	if (latestUsefulEvent.type === "tool_call") {
		return getToolCallMessage(latestUsefulEvent);
	}

	return "분석 중...";
}

function getToolCallMessage(event: FxStrategyEvent) {
	const input = isRecord(event.input) ? event.input : {};
	const query = typeof input.query === "string" ? input.query : null;

	if (query) {
		return `${query} 내용을 확인하고 있습니다.`;
	}

	if (event.name?.includes("rate") || event.name?.includes("exchange")) {
		return "환율 기준 데이터를 확인하고 있습니다.";
	}

	if (event.name?.includes("account") || event.name?.includes("exposure")) {
		return "외화 계좌와 노출 규모를 확인하고 있습니다.";
	}

	return "답변에 필요한 추가 정보를 확인하고 있습니다.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseAmount(value: string) {
	const normalized = value.replace(/,/g, "").trim();
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumberInput(value: number | null) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return "";
	}

	return String(value);
}

function formatNumber(value: number | null | undefined) {
	const numeric = Number(value ?? 0);
	if (!Number.isFinite(numeric)) {
		return "-";
	}

	return new Intl.NumberFormat("ko-KR", {
		maximumFractionDigits: 4,
	}).format(numeric);
}

function formatUsd(value: number | null | undefined) {
	const numeric = Number(value ?? 0);
	if (!Number.isFinite(numeric)) {
		return "$0.00";
	}

	return new Intl.NumberFormat("en-US", {
		currency: "USD",
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
		style: "currency",
	}).format(numeric);
}

function compactLabel(value: string) {
	return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function daysAgoDateInput(days: number) {
	const date = new Date();
	date.setDate(date.getDate() - days);

	return new Intl.DateTimeFormat("en-CA", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "Asia/Seoul",
		year: "numeric",
	}).format(date);
}

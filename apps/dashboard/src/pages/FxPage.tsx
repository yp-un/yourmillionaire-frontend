import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
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
	EmptyState,
	Input,
	Label,
	MetricCard,
	Notice,
	PageHeader,
	PageShell,
	SectionCard,
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

import { useApi } from "../api/ApiProvider";
import type { ExchangeRate, FxAccount, FxStrategyEvent, FxStrategyScenario } from "../api/types";
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
	const [bankLabel, setBankLabel] = useState("");
	const [balance, setBalance] = useState("");
	const [savingAccount, setSavingAccount] = useState(false);
	const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>({});
	const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null);
	const [strategyScenario, setStrategyScenario] =
		useState<FxStrategyScenario>("exposure_summary");
	const [strategyRunning, setStrategyRunning] = useState(false);
	const [strategyText, setStrategyText] = useState("");
	const [strategyPending, setStrategyPending] = useState<string | null>(null);

	const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
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

	async function loadFxAccounts() {
		if (!selectedTenantId || workspaceStatus !== "ready") {
			return;
		}

		setLoadState("loading");
		setError(null);

		try {
			const [accountsResponse, rateResponse] = await Promise.all([
				api.getFxAccounts(selectedTenantId),
				api.getUsdKrwRate(today).catch(() => null),
			]);

			setAccounts(accountsResponse.accounts);
			setRate(rateResponse);
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
		setStrategyText("");
		setStrategyPending("외화 계좌와 환율 정보를 확인하고 있습니다.");
		setError(null);

		try {
			await api.runFxStrategy(selectedTenantId, strategyScenario, (event) => {
				handleStrategyEvent(event, setStrategyText, setStrategyPending);
			});
		} catch (strategyError) {
			setError(strategyError instanceof Error ? strategyError.message : "외환 전략을 생성하지 못했습니다.");
		} finally {
			setStrategyRunning(false);
			setStrategyPending(null);
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

			<div className="grid gap-4 lg:grid-cols-3">
				<MetricCard label="USD 보유액" value={formatUsd(totals.usd)} tone="primary" icon={Wallet} />
				<MetricCard label="오늘 원화 환산" value={formatCurrency(totals.krw)} />
				<MetricCard
					label="USD/KRW 기준 환율"
					value={rate ? `${formatNumber(rate.rate)}원` : "-"}
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
				<SectionCard
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

				<SectionCard title="USD 계좌 등록">
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

			<SectionCard
				title="AI 외환 전략"
				trailing={
					<Select
						value={strategyScenario}
						onValueChange={(value) => setStrategyScenario(value as FxStrategyScenario)}
					>
						<SelectTrigger className="w-[12rem]">
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
				}
			>
				<div className="space-y-4">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">
							등록된 USD 잔액과 오늘 환율을 바탕으로 환전 판단과 노출 현황을 정리합니다.
						</p>
						<Button onClick={() => void runStrategy()} disabled={strategyRunning}>
							{strategyRunning ? (
								<Loader2 className="size-4 animate-spin" aria-hidden="true" />
							) : (
								<Sparkles className="size-4" aria-hidden="true" />
							)}
							분석 시작
						</Button>
					</div>
					<div className="min-h-64 rounded-lg border bg-card p-5">
						{strategyText ? (
							<div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
								{strategyText}
							</div>
						) : (
							<EmptyState icon={Brain} title="아직 생성된 외환 전략이 없습니다.">
								분석을 시작하면 외화 보유액, 원화 환산액, 환전 판단 기준을 순서대로 보여줍니다.
							</EmptyState>
						)}
						{strategyPending ? (
							<p className="ym-shimmer-text mt-4 text-sm font-medium">
								{strategyPending}
							</p>
						) : null}
					</div>
				</div>
			</SectionCard>
		</PageShell>
	);
}

function handleStrategyEvent(
	event: FxStrategyEvent,
	setStrategyText: Dispatch<SetStateAction<string>>,
	setStrategyPending: Dispatch<SetStateAction<string | null>>,
) {
	if ((event.type === "text_delta" || event.type === "message") && event.chunk) {
		setStrategyText((previous) => previous + event.chunk);
		setStrategyPending(null);
		return;
	}

	if (event.type === "tool_call") {
		const input = event.input as { query?: string } | undefined;
		setStrategyPending(input?.query ?? "필요한 기준 데이터를 확인하고 있습니다.");
		return;
	}

	if (event.type === "tool_result" && event.summary) {
		setStrategyPending(event.summary);
		return;
	}

	if (event.type === "context_ready") {
		setStrategyPending("외화 계좌와 환율 데이터를 정리했습니다.");
		return;
	}

	if (event.type === "final" && typeof event.summary === "string") {
		setStrategyText(event.summary);
		setStrategyPending(null);
	}
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

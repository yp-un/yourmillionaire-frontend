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
} from "@millionaire/ui";
import { EmptyState, Notice, PageHeader, PageShell } from "../components/page";
import {
	AlertTriangle,
	CheckCircle2,
	Landmark,
	Loader2,
	LockKeyhole,
	RefreshCcw,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { useApi } from "../api/ApiProvider";
import { YmApiError } from "../api/client";
import type {
	BankAccount,
	BankConnectionResponse,
	DiscoveredBankAccount,
} from "../api/types";
import { formatCurrency } from "../lib/journal";
import { useWorkspace } from "../workspace/WorkspaceProvider";

const supportedBanks = [
	{ organization: "0088", label: "신한은행" },
	{ organization: "0011", label: "NH농협은행" },
	{ organization: "0004", label: "KB국민은행" },
	{ organization: "0020", label: "우리은행" },
	{ organization: "0081", label: "하나은행" },
	{ organization: "0003", label: "IBK기업은행" },
	{ organization: "0002", label: "KDB산업은행" },
	{ organization: "0007", label: "Sh수협은행" },
	{ organization: "0012", label: "지역농축협" },
	{ organization: "0023", label: "SC제일은행" },
	{ organization: "0027", label: "한국씨티은행" },
	{ organization: "0031", label: "iM뱅크(대구은행)" },
	{ organization: "0032", label: "BNK부산은행" },
	{ organization: "0034", label: "광주은행" },
	{ organization: "0035", label: "제주은행" },
	{ organization: "0037", label: "전북은행" },
	{ organization: "0039", label: "BNK경남은행" },
	{ organization: "0045", label: "새마을금고" },
	{ organization: "0048", label: "신협" },
	{ organization: "0050", label: "저축은행" },
	{ organization: "0064", label: "산림조합" },
	{ organization: "0071", label: "우체국" },
	{ organization: "0089", label: "케이뱅크" },
	{ organization: "0090", label: "카카오뱅크" },
	{ organization: "0092", label: "토스뱅크" },
];

export function ConnectionsPage() {
	const api = useApi();
	const { selectedTenant, selectedTenantId } = useWorkspace();
	const [organization, setOrganization] = useState("0088");
	const [loginId, setLoginId] = useState("");
	const [loginPassword, setLoginPassword] = useState("");
	const [birthDate, setBirthDate] = useState("");
	const [isConnecting, setIsConnecting] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [connection, setConnection] = useState<BankConnectionResponse | null>(
		null,
	);
	const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
	const [registeredAccounts, setRegisteredAccounts] = useState<BankAccount[]>(
		[],
	);
	const [error, setError] = useState<string | null>(null);
	const [warning, setWarning] = useState<string | null>(null);
	const [failedAttempts, setFailedAttempts] = useState(0);
	const bankLabel = useMemo(
		() =>
			supportedBanks.find((bank) => bank.organization === organization)
				?.label ?? organization,
		[organization],
	);

	async function handleConnect(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!selectedTenantId) {
			setError("선택된 워크스페이스가 없습니다.");
			return;
		}

		setIsConnecting(true);
		setError(null);
		setWarning(null);

		try {
			const response = await api.createBankConnection(selectedTenantId, {
				organization,
				loginId: loginId.trim(),
				loginPassword,
				birthDate: birthDate.trim() || undefined,
			});

			setConnection(response);
			setSelectedAccounts(
				response.accounts.map((account) => account.accountNumber),
			);
			setFailedAttempts(0);
		} catch (connectError) {
			const message = toConnectionErrorMessage(connectError);

			setError(message);

			if (
				connectError instanceof YmApiError &&
				connectError.code === "CODEF_ACCOUNT_ERROR"
			) {
				const nextFailedAttempts = failedAttempts + 1;
				setFailedAttempts(nextFailedAttempts);

				if (nextFailedAttempts >= 3 || message.toLowerCase().includes("lock")) {
					setWarning(
						`${bankLabel}은 비밀번호 오류가 누적되면 인터넷뱅킹이 잠길 수 있습니다. ID/PW를 확인한 뒤 다시 시도하세요.`,
					);
				}
			}
		} finally {
			setIsConnecting(false);
		}
	}

	async function handleRegisterSelectedAccounts() {
		if (!selectedTenantId || !connection) {
			return;
		}

		setIsRegistering(true);
		setError(null);
		setWarning(null);

		try {
			const accountsToRegister = connection.accounts.filter((account) =>
				selectedAccounts.includes(account.accountNumber),
			);
			const responses = await Promise.all(
				accountsToRegister.map((account) =>
					api.createBankAccount(selectedTenantId, {
						organization,
						accountNumber: account.accountNumber,
					}),
				),
			);

			setRegisteredAccounts((current) => [...responses, ...current]);
			setWarning(
				"등록 직후에는 분개가 없을 수 있습니다. 백엔드 수집 파이프라인이 실행된 뒤 분개 조회 화면에 표시됩니다.",
			);
		} catch (registerError) {
			setError(toRegistrationErrorMessage(registerError));
		} finally {
			setIsRegistering(false);
		}
	}

	async function handleStartSync() {
		if (!selectedTenantId) {
			return;
		}

		setIsSyncing(true);
		setError(null);
		setWarning(null);

		try {
			const response = await api.startSync(selectedTenantId);
			if (response.failed) {
				setError(response.errorReason ?? "수집 파이프라인이 완료되지 못했습니다.");
				return;
			}

			setWarning(
				response.syncRunId
					? `수집이 완료되었습니다. 실행 ID ${response.syncRunId.slice(0, 8)}의 처리 결과는 개요 화면에서 확인할 수 있습니다.`
					: "수집이 완료되었습니다. 처리 결과는 개요 화면에서 확인할 수 있습니다.",
			);
		} catch (syncError) {
			setError(syncError instanceof Error ? syncError.message : "수집 파이프라인을 시작하지 못했습니다.");
		} finally {
			setIsSyncing(false);
		}
	}

	function toggleAccount(accountNumber: string) {
		setSelectedAccounts((current) =>
			current.includes(accountNumber)
				? current.filter((value) => value !== accountNumber)
				: [...current, accountNumber],
		);
	}

	return (
		<PageShell className="max-w-6xl">
			<PageHeader
				title="계좌 연결"
				actions={
					<div className="ym-panel p-3 text-xs leading-5 text-muted-foreground">
						<div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
							<LockKeyhole className="size-4" aria-hidden="true" />
							보안 안내
						</div>
						입력한 비밀번호는 거래내역 조회용 연결 생성에만 사용되며 평문으로
						저장되지 않습니다.
					</div>
				}
			/>

			<div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
				<form
					className="ym-surface space-y-5 p-6"
					onSubmit={handleConnect}
				>
					<div>
						<h3 className="font-semibold">은행 인증</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							선택한 은행의 인터넷뱅킹 ID/PW로 계좌 연결을 시도합니다.
							은행별 인증 정책에 따라 추가 검증이나 미지원 응답이 있을 수
							있습니다.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="organization">은행</Label>
						<Select
							value={organization}
							onValueChange={setOrganization}
						>
							<SelectTrigger id="organization">
								<SelectValue placeholder="은행 선택" />
							</SelectTrigger>
							<SelectContent>
								{supportedBanks.map((bank) => (
									<SelectItem key={bank.organization} value={bank.organization}>
										{bank.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="loginId">인터넷뱅킹 ID</Label>
						<Input
							id="loginId"
							autoComplete="username"
							value={loginId}
							onChange={(event) => setLoginId(event.target.value)}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="loginPassword">인터넷뱅킹 비밀번호</Label>
						<Input
							id="loginPassword"
							autoComplete="current-password"
							type="password"
							value={loginPassword}
							onChange={(event) => setLoginPassword(event.target.value)}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="birthDate">생년월일</Label>
						<Input
							id="birthDate"
							inputMode="numeric"
							maxLength={8}
							placeholder="19950101"
							value={birthDate}
							onChange={(event) =>
								setBirthDate(event.target.value.replace(/\D/g, ""))
							}
						/>
						<p className="text-xs text-muted-foreground">
							추가 검증을 요구받을 때만 입력합니다.
						</p>
					</div>

					{warning ? (
						<Notice tone="warning">
							<div className="flex gap-2">
							<AlertTriangle
								className="mt-0.5 size-4 shrink-0"
								aria-hidden="true"
							/>
							<span>{warning}</span>
							</div>
						</Notice>
					) : null}

					{error ? (
						<Notice tone="danger">{error}</Notice>
					) : null}

					<Button
						className="h-11 w-full"
						disabled={isConnecting || !loginId || !loginPassword}
						type="submit"
					>
						{isConnecting ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<RefreshCcw className="size-4" aria-hidden="true" />
						)}
						계좌 찾기
					</Button>
				</form>

				<section className="ym-surface space-y-4 p-6">
					<div className="flex items-center justify-between gap-4">
						<div>
							<h3 className="font-semibold">발견된 계좌</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								등록할 계좌를 선택하면 이후 자동 수집 대상이 됩니다.
							</p>
						</div>
						{connection ? (
							<Badge variant="outline">{connection.accounts.length}개</Badge>
						) : null}
					</div>

					{!connection ? (
						<EmptyState icon={Landmark} title="은행 인증 후 계좌가 표시됩니다">
							응답 계좌는 이 브라우저 상태에만 표시됩니다. 필요한 계좌를 바로 등록하세요.
						</EmptyState>
					) : (
						<>
							<div className="space-y-3">
								{connection.accounts.map((account) => (
									<AccountRow
										key={account.accountNumber}
										account={account}
										checked={selectedAccounts.includes(account.accountNumber)}
										onToggle={() => toggleAccount(account.accountNumber)}
									/>
								))}
							</div>

							<Button
								className="h-11 w-full"
								disabled={isRegistering || selectedAccounts.length === 0}
								onClick={handleRegisterSelectedAccounts}
							>
								{isRegistering ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<CheckCircle2 className="size-4" aria-hidden="true" />
								)}
								선택 계좌 등록
							</Button>
							<Button
								className="h-11 w-full"
								disabled={isSyncing}
								variant="outline"
								onClick={handleStartSync}
							>
								{isSyncing ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<RefreshCcw className="size-4" aria-hidden="true" />
								)}
								지금 수집 시작
							</Button>
						</>
					)}

					{registeredAccounts.length > 0 ? (
						<div className="border-t pt-4">
							<h4 className="text-sm font-semibold">이번 세션에 등록한 계좌</h4>
							<div className="mt-3 space-y-2">
								{registeredAccounts.map((account) => (
									<div
										key={account.id}
									className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
									>
										<span className="font-medium number-tabular">
											{account.accountNumber}
										</span>
										<span>{account.isActive ? "활성" : "비활성"}</span>
									</div>
								))}
							</div>
						</div>
					) : null}
				</section>
			</div>
		</PageShell>
	);
}

function AccountRow({
	account,
	checked,
	onToggle,
}: {
	account: DiscoveredBankAccount;
	checked: boolean;
	onToggle: () => void;
}) {
	const balance = Number(account.balance);

	return (
		<label
			className={cn(
				"flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 transition-colors",
				checked
					? "border-primary bg-accent"
					: "border-border bg-card hover:border-primary/50",
			)}
		>
			<div className="flex min-w-0 items-center gap-3">
				<input
					type="checkbox"
					className="size-4 accent-primary"
					checked={checked}
					onChange={onToggle}
				/>
				<div className="min-w-0">
					<p className="truncate font-semibold">{account.accountName}</p>
					<p className="mt-1 text-sm text-muted-foreground number-tabular">
						{account.accountNumber}
					</p>
				</div>
			</div>
			<div className="shrink-0 text-right">
				<p className="text-xs text-muted-foreground">잔액</p>
				<p className="font-semibold number-tabular">
					{Number.isFinite(balance) ? formatCurrency(balance) : account.balance}
				</p>
			</div>
		</label>
	);
}

function toConnectionErrorMessage(error: unknown) {
	if (error instanceof YmApiError) {
		if (error.status === 422) {
			return "입력값을 확인해 주세요. 은행 코드는 4자리이고 ID/PW는 필수입니다.";
		}

		if (error.code === "CODEF_ACCOUNT_ERROR") {
			return (
				error.message || "은행 인증에 실패했습니다. ID/PW를 확인해 주세요."
			);
		}

		if (error.code === "CODEF_API_ERROR") {
			return "은행 계좌 조회 서비스가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도하세요.";
		}

		return error.message;
	}

	return error instanceof Error ? error.message : "계좌 연결에 실패했습니다.";
}

function toRegistrationErrorMessage(error: unknown) {
	if (error instanceof YmApiError) {
		if (error.code === "NO_BANK_CONNECTION") {
			return "먼저 은행 인증을 완료해야 계좌를 등록할 수 있습니다.";
		}

		if (error.status === 409) {
			return "이미 등록된 계좌입니다.";
		}

		if (error.status === 422) {
			return "계좌번호 또는 은행 코드 형식을 확인해 주세요.";
		}

		return error.message;
	}

	return error instanceof Error ? error.message : "계좌 등록에 실패했습니다.";
}

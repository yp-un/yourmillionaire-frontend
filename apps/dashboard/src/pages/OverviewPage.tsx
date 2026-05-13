import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  FileClock,
  Loader2,
  RefreshCcw,
  WalletCards
} from "lucide-react";

import { Badge, Button, Input, MetricCard, Notice, PageHeader, PageShell, SectionCard, StatusRow } from "@millionaire/ui";

import { useApi } from "../api/ApiProvider";
import type {
  AccountBalanceCard,
  ExchangeRate,
  JournalEntry,
  MonthlySummaryResponse,
  ReceivablesBoard,
  SyncStartResponse
} from "../api/types";
import { DonutChart, MoneyBarChart } from "../components/LazyDashboardCharts";
import { accountNames, amountTotal, formatCurrency, getCurrentMonthRange } from "../lib/journal";
import { useWorkspace } from "../workspace/WorkspaceProvider";

type LoadState = "error" | "loading" | "ready";

export function OverviewPage() {
  const api = useApi();
  const { selectedTenantId, status: workspaceStatus } = useWorkspace();
  const monthRange = useMemo(() => getCurrentMonthRange(), []);
  const today = useMemo(() => getTodayDateInput(), []);
  const ym = monthRange.from.slice(0, 7);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [syncing, setSyncing] = useState(false);
  const [syncFrom, setSyncFrom] = useState(monthRange.from);
  const [syncTo, setSyncTo] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncStartResponse | null>(null);
  const [balances, setBalances] = useState<AccountBalanceCard[]>([]);
  const [receivables, setReceivables] = useState<ReceivablesBoard | null>(null);
  const [uncertainEntries, setUncertainEntries] = useState<JournalEntry[]>([]);
  const [uncertainCount, setUncertainCount] = useState(0);
  const [fxRate, setFxRate] = useState<ExchangeRate | null>(null);
  const [confirmingEntryId, setConfirmingEntryId] = useState<string | null>(null);

  const load = async () => {
    if (!selectedTenantId || workspaceStatus !== "ready") {
      return;
    }

    setLoadState("loading");
    setError(null);

    try {
      const [nextSummary, nextBalances, nextReceivables, nextUncertainEntries, nextFx] = await Promise.all([
        api.getMonthlySummary(selectedTenantId, ym),
        api.getAccountBalances(selectedTenantId),
        api.getReceivables(selectedTenantId),
        api.getJournalEntries(selectedTenantId, {
          confidenceStatus: "uncertain",
          from: monthRange.from,
          limit: 3,
          offset: 0,
          to: monthRange.to
        }),
        api.getUsdKrwRate(new Date().toISOString().slice(0, 10)).catch(() => null)
      ]);

      setSummary(nextSummary);
      setBalances(nextBalances.balances);
      setReceivables(nextReceivables);
      setUncertainEntries(nextUncertainEntries.entries);
      setUncertainCount(nextUncertainEntries.uncertain?.count ?? nextUncertainEntries.entries.length);
      setFxRate(nextFx);
      setLoadState("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "대시보드 데이터를 불러오지 못했습니다.");
      setLoadState("error");
    }
  };

  useEffect(() => {
    void load();
  }, [selectedTenantId, workspaceStatus, ym]);

  async function handleStartSync() {
    if (!selectedTenantId) {
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      if (!syncFrom || !syncTo || syncFrom > syncTo || syncTo > today) {
        setError("수집 시작일과 종료일을 올바르게 선택해 주세요.");
        return;
      }

      const result = await api.startSync(selectedTenantId, { from: syncFrom, to: syncTo });
      setLastSyncResult(result);

      if (result.failed) {
        setError(result.errorReason ?? "수집 파이프라인이 완료되지 못했습니다.");
        return;
      }

      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "수집 파이프라인을 시작하지 못했습니다.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleConfirmEntry(entryId: string) {
    if (!selectedTenantId) {
      return;
    }

    setConfirmingEntryId(entryId);
    setError(null);

    try {
      await api.confirmJournalEntry(selectedTenantId, entryId);
      setUncertainEntries((current) => current.filter((entry) => entry.id !== entryId));
      setUncertainCount((current) => Math.max(current - 1, 0));
      void load();
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "분개 초안을 확정하지 못했습니다.");
    } finally {
      setConfirmingEntryId(null);
    }
  }

  const receivableCount =
    (receivables?.pending.length ?? 0) + (receivables?.dueSoon.length ?? 0) + (receivables?.overdue.length ?? 0);
  const cashLikeBalances = balances.filter((balance) => balance.accountCode.startsWith("10")).slice(0, 6);
  const syncDisplayStatus = syncing ? "running" : (lastSyncResult?.status ?? "idle");
  const syncRangeInvalid = !syncFrom || !syncTo || syncFrom > syncTo || syncTo > today;
  const summaryChartData = [
    { name: "입금", value: amountTotal(summary?.income), fill: "var(--chart-1)" },
    { name: "지출", value: amountTotal(summary?.expense), fill: "var(--chart-4)" },
    { name: "순현금", value: Math.max(amountTotal(summary?.netCashBalance), 0), fill: "var(--chart-2)" }
  ];
  const receivableChartData = [
    { name: "대기", value: receivables?.pending.length ?? 0, fill: "var(--chart-1)" },
    { name: "곧 만기", value: receivables?.dueSoon.length ?? 0, fill: "var(--chart-3)" },
    { name: "연체", value: receivables?.overdue.length ?? 0, fill: "var(--chart-4)" },
    { name: "수금 완료", value: receivables?.collected.length ?? 0, fill: "var(--chart-2)" }
  ];
  const balanceChartData = cashLikeBalances.map((balance) => ({
    name: compactAccountName(balance.displayName || balance.accountName),
    value: amountTotal(balance.balance)
  }));

  return (
    <PageShell>
      <PageHeader
        title="개요"
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loadState === "loading"}>
            {loadState === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="size-4" aria-hidden="true" />}
            새로고침
          </Button>
        }
      />

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <SectionCard
        title="거래 수집"
        trailing={<Badge variant={syncBadgeVariant(syncDisplayStatus)}>{syncStatusLabel(syncDisplayStatus)}</Badge>}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="sync-from">시작일</label>
              <Input id="sync-from" max={today} type="date" value={syncFrom} onChange={(event) => setSyncFrom(event.target.value)} disabled={syncing} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="sync-to">종료일</label>
              <Input id="sync-to" max={today} type="date" value={syncTo} onChange={(event) => setSyncTo(event.target.value)} disabled={syncing} />
            </div>
          </div>
          <Button className="w-full lg:w-auto" onClick={handleStartSync} disabled={syncing || syncRangeInvalid}>
            {syncing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="size-4" aria-hidden="true" />}
            지금 수집
          </Button>
        </div>
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={CircleDollarSign} label={`${ym} 입금`} value={formatCurrency(summary?.income ?? 0)} tone="primary" />
        <MetricCard icon={Banknote} label={`${ym} 지출`} value={formatCurrency(summary?.expense ?? 0)} tone="danger" />
        <MetricCard icon={WalletCards} label="순현금흐름" value={formatCurrency(summary?.netCashBalance ?? 0)} tone="default" />
        <MetricCard icon={FileClock} label="검토 필요" value={`${uncertainCount}건`} tone={uncertainCount > 0 ? "warning" : "default"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="월간 현금 흐름">
          <MoneyBarChart data={summaryChartData} />
        </SectionCard>

        <SectionCard title="수금 상태">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
            <DonutChart data={receivableChartData} />
            <div className="grid gap-2 text-sm">
              {receivableChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: item.fill }} />
                    {item.name}
                  </span>
                  <span className="font-medium number-tabular">{item.value}건</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <SectionCard
          title="수집 상태"
          trailing={<Badge variant={syncBadgeVariant(syncDisplayStatus)}>{syncStatusLabel(syncDisplayStatus)}</Badge>}
        >
          <div className="grid gap-3 text-sm">
            <StatusRow label="최근 실행" value={lastSyncResult ? formatNullableDateTime(lastSyncResult.startedAt) : "없음"} />
            <StatusRow
              label="수집 기간"
              value={
                lastSyncResult?.dateRange?.from && lastSyncResult.dateRange.to
                  ? `${lastSyncResult.dateRange.from} - ${lastSyncResult.dateRange.to}`
                  : `${syncFrom} - ${syncTo}`
              }
            />
            <StatusRow
              label="계좌 처리"
              value={
                lastSyncResult?.totals
                  ? `${lastSyncResult.totals.accountsSucceeded}/${lastSyncResult.totals.accountsScanned} 성공`
                  : "없음"
              }
            />
            <StatusRow
              label="오류 계좌"
              value={
                lastSyncResult?.totals
                  ? `${lastSyncResult.totals.accountsFailed}건`
                  : "없음"
              }
            />
            <StatusRow label="수집 거래" value={lastSyncResult?.totals ? `${lastSyncResult.totals.transactionsFetched}건` : "없음"} />
            <StatusRow
              label="분류 결과"
              value={
                lastSyncResult?.totals
                  ? `확정 ${lastSyncResult.totals.transactionsCertain}건 / 검토 ${lastSyncResult.totals.transactionsUncertain}건`
                  : "없음"
              }
            />
            <StatusRow label="소요 시간" value={formatDuration(lastSyncResult?.durationMs)} />
            {lastSyncResult?.errorReason ? (
              <p className="ym-panel px-3 py-2 text-sm leading-6 text-destructive">{lastSyncResult.errorReason}</p>
            ) : null}
            {lastSyncResult?.accounts.length ? (
              <div className="space-y-2">
                {lastSyncResult.accounts.slice(0, 3).map((account) => (
                  <div
                    key={`${account.organization}-${account.bankAccountId}`}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{account.accountNumberMasked ?? account.organization}</p>
                      <p className="text-xs text-muted-foreground">{account.userMessage ?? account.codefErrorMessage ?? "처리 결과가 기록되었습니다."}</p>
                    </div>
                    <Badge variant={account.outcome === "success" || account.outcome === "balance_only" ? "success" : "warning"}>
                      {syncOutcomeLabel(account.outcome)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="수금/외환 체크"
          trailing={fxRate ? <Badge variant="outline">USD/KRW {fxRate.rate.toLocaleString("ko-KR")}</Badge> : null}
        >
          <div className="grid gap-3 text-sm">
            <StatusRow label="미수금 대기" value={`${receivables?.pending.length ?? 0}건`} />
            <StatusRow label="곧 만기" value={`${receivables?.dueSoon.length ?? 0}건`} />
            <StatusRow label="연체" value={`${receivables?.overdue.length ?? 0}건`} />
            <StatusRow label="확인 필요 총계" value={`${receivableCount}건`} />
            <StatusRow label="환율 기준일" value={fxRate ? `${fxRate.effectiveDate} (${fxRate.source})` : "없음"} />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="주요 계정 잔액">
          <div className="space-y-4">
            {balanceChartData.length > 0 ? (
              <MoneyBarChart data={balanceChartData} height={220} />
            ) : null}
            {cashLikeBalances.length === 0 ? (
              <p className="text-sm text-muted-foreground">표시할 계정 잔액이 없습니다.</p>
            ) : (
              cashLikeBalances.map((balance) => (
                <div key={balance.accountCode} className="ym-panel flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">{balance.displayName || balance.accountName}</span>
                  <span className="number-tabular">{formatCurrency(balance.balance)}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="AI 검토 항목">
          <div className="space-y-3">
            {uncertainEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">AI 자동 분류 결과를 모두 확정했습니다.</p>
            ) : (
              <>
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>확신도가 낮은 분개 {uncertainCount}건을 확인해야 합니다.</span>
                </div>
                {uncertainEntries.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{entry.entryDate}</p>
                          <Badge variant="outline">{entryOriginLabel(entry.origin)}</Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          확신도 {formatConfidence(entry.confidence)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.lines.map((line) => `${line.accountName ?? accountNames[line.accountCode] ?? "미지정 계정"} ${formatCurrency(entryLineAmount(line))}`).join(" / ")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleConfirmEntry(entry.id)}
                        disabled={confirmingEntryId === entry.id}
                      >
                        {confirmingEntryId === entry.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                        )}
                        확정
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </SectionCard>
      </section>
    </PageShell>
  );
}

function formatNullableDateTime(value: string | null | undefined) {
  if (!value) {
    return "없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatConfidence(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "없음";
  }

  return `${Math.round(value * 100)}%`;
}

function entryLineAmount(line: JournalEntry["lines"][number]) {
  return Number(line.debit) > 0 ? line.debit : line.credit;
}

function entryOriginLabel(origin: string | null | undefined) {
  const labels: Record<string, string> = {
    ai: "AI 분류",
    ai_low_conf: "AI 검토",
    heuristic: "규칙 기반",
    manual: "수동 입력"
  };

  return origin ? labels[origin] ?? origin : "자동 분류";
}

function syncBadgeVariant(status: string | undefined): "destructive" | "outline" | "success" | "warning" {
  if (status === "completed" || status === "done") {
    return "success";
  }

  if (status === "failed" || status === "timed_out") {
    return "destructive";
  }

  if (status === "queued" || status === "running" || status === "fetching" || status === "classifying") {
    return "warning";
  }

  return "outline";
}

function syncStatusLabel(status: string | undefined) {
  const labels: Record<string, string> = {
    classifying: "분류 중",
    completed: "완료",
    done: "완료",
    failed: "실패",
    fetching: "수집 중",
    idle: "대기",
    queued: "대기열",
    running: "실행 중",
    timed_out: "시간 초과"
  };

  return status ? labels[status] ?? status : "대기";
}

function syncOutcomeLabel(outcome: string) {
  const labels: Record<string, string> = {
    balance_only: "잔액만 갱신",
    codef_error: "은행 오류",
    empty_result: "거래 없음",
    no_connection: "연결 없음",
    success: "성공"
  };

  return labels[outcome] ?? outcome;
}

function compactAccountName(value: string) {
  return value.length > 6 ? `${value.slice(0, 6)}…` : value;
}

function getTodayDateInput() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric"
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function formatDuration(value: number | null | undefined) {
  if (!value) {
    return "없음";
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  return `${Math.round(value / 1000)}초`;
}

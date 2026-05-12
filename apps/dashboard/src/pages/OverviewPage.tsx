import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  FileClock,
  Loader2,
  RefreshCcw,
  WalletCards
} from "lucide-react";

import { Badge, Button, MetricCard, Notice, PageHeader, PageShell, SectionCard, StatusRow } from "@millionaire/ui";

import { useApi } from "../api/ApiProvider";
import type {
  AccountBalanceCard,
  ExchangeRate,
  JournalEntryDraft,
  MonthlySummaryResponse,
  ReceivablesBoard,
  SyncStatusResponse
} from "../api/types";
import { formatCurrency, getCurrentMonthRange } from "../lib/journal";
import { useWorkspace } from "../workspace/WorkspaceProvider";

type LoadState = "error" | "loading" | "ready";

export function OverviewPage() {
  const api = useApi();
  const { me, selectedTenant, selectedTenantId, status: workspaceStatus } = useWorkspace();
  const monthRange = useMemo(() => getCurrentMonthRange(), []);
  const ym = monthRange.from.slice(0, 7);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [balances, setBalances] = useState<AccountBalanceCard[]>([]);
  const [receivables, setReceivables] = useState<ReceivablesBoard | null>(null);
  const [drafts, setDrafts] = useState<JournalEntryDraft[]>([]);
  const [fxRate, setFxRate] = useState<ExchangeRate | null>(null);

  const load = async () => {
    if (!selectedTenantId || workspaceStatus !== "ready") {
      return;
    }

    setLoadState("loading");
    setError(null);

    try {
      const [nextSummary, nextSync, nextBalances, nextReceivables, nextDrafts, nextFx] = await Promise.all([
        api.getMonthlySummary(selectedTenantId, ym),
        api.getSyncStatus(selectedTenantId),
        api.getAccountBalances(selectedTenantId),
        api.getReceivables(selectedTenantId),
        api.getJournalDrafts(selectedTenantId),
        api.getUsdKrwRate(new Date().toISOString().slice(0, 10)).catch(() => null)
      ]);

      setSummary(nextSummary);
      setSyncStatus(nextSync);
      setBalances(nextBalances.balances);
      setReceivables(nextReceivables);
      setDrafts(nextDrafts.drafts);
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
      await api.startSync(selectedTenantId);
      const nextSync = await api.getSyncStatus(selectedTenantId);
      setSyncStatus(nextSync);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "수집 파이프라인을 시작하지 못했습니다.");
    } finally {
      setSyncing(false);
    }
  }

  const receivableCount =
    (receivables?.pending.length ?? 0) + (receivables?.dueSoon.length ?? 0) + (receivables?.overdue.length ?? 0);
  const cashLikeBalances = balances.filter((balance) => balance.accountCode.startsWith("10")).slice(0, 6);

  return (
    <PageShell>
      <PageHeader
        title={selectedTenant?.displayName ?? me?.email ?? "현재 워크스페이스"}
        actions={
          <>
          <Button variant="outline" onClick={() => void load()} disabled={loadState === "loading"}>
            {loadState === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="size-4" aria-hidden="true" />}
            새로고침
          </Button>
          <Button onClick={handleStartSync} disabled={syncing}>
            {syncing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCcw className="size-4" aria-hidden="true" />}
            지금 수집
          </Button>
          </>
        }
      />

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={CircleDollarSign} label={`${ym} 입금`} value={formatCurrency(summary?.income ?? 0)} tone="primary" />
        <MetricCard icon={Banknote} label={`${ym} 지출`} value={formatCurrency(summary?.expense ?? 0)} tone="danger" />
        <MetricCard icon={WalletCards} label="순현금흐름" value={formatCurrency(summary?.netCashBalance ?? 0)} tone="default" />
        <MetricCard icon={FileClock} label="검토 초안" value={`${drafts.length}건`} tone={drafts.length > 0 ? "warning" : "default"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <SectionCard
          title="수집 상태"
          trailing={<Badge variant={syncStatus?.status === "done" ? "success" : "outline"}>{syncStatus?.status ?? "unknown"}</Badge>}
        >
          <div className="grid gap-3 text-sm">
            <StatusRow label="수집 후 대기" value={`${syncStatus?.undispatched ?? 0}건`} />
            <StatusRow label="분류 대기/진행" value={`${syncStatus?.dispatched ?? 0}건`} />
            <StatusRow label="분류 완료" value={`${syncStatus?.classified ?? 0}건`} />
            <StatusRow label="마지막 수집" value={formatNullableDateTime(syncStatus?.lastFetchedAt)} />
            <StatusRow label="마지막 분류" value={formatNullableDateTime(syncStatus?.lastClassifiedAt)} />
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
          <div className="space-y-2">
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

        <SectionCard title="AI 검토 초안">
          <div className="space-y-3">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">AI 자동 분류 결과를 모두 확정했습니다.</p>
            ) : (
              <>
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>확신도가 낮은 거래 {drafts.length}건을 확인해야 합니다.</span>
                </div>
                {drafts.slice(0, 3).map((draft) => (
                  <div key={draft.rawTransactionId} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-foreground">{draft.createdAt.slice(0, 10)}</p>
                    <p className="mt-1 text-muted-foreground">confidence {Math.round((draft.heuristicConfidence ?? 0) * 100)}%</p>
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

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart3, ChevronDown, Filter, Loader2, Search } from "lucide-react";

import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn
} from "@millionaire/ui";

import { useApi } from "../api/ApiProvider";
import { YmApiError } from "../api/client";
import type { JournalEntry } from "../api/types";
import {
  formatCurrency,
  formatJournalLines,
  getCurrentMonthRange,
  getEntryAmount,
  getEntryMovement,
  summarizeEntries
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
        entry.lines.some((line) => line.accountCode.includes(normalizedQuery) || (line.memo ?? "").toLowerCase().includes(normalizedQuery));

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
          from,
          to,
          limit,
          offset
        });

        if (!cancelled) {
          setEntries((current) => (offset === 0 ? response.entries : [...current, ...response.entries]));
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

  function handleApplyRange() {
    setOffset(0);
    setHasMore(true);
    setRequestKey((current) => current + 1);
  }

  const stats = [
    { label: "조회 범위 입금", value: formatCurrency(summary.moneyIn), color: "text-primary" },
    { label: "조회 범위 출금", value: formatCurrency(summary.moneyOut), color: "text-red-600" },
    { label: "순현금흐름", value: formatCurrency(summary.moneyIn - summary.moneyOut), color: "text-slate-900" }
  ];

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="group relative w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary transition-transform group-focus-within:scale-110" aria-hidden="true" />
          <Input
            className="h-12 rounded-lg border-slate-200 bg-white pl-12 shadow-sm focus-visible:ring-primary/20"
            placeholder="분개 설명, 계정코드, 메모 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:w-auto lg:min-w-[25rem]">
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-500">
            <span>시작일</span>
            <Input
              className="h-10 w-full bg-white number-tabular"
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setOffset(0);
                setHasMore(true);
              }}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-500">
            <span>종료일</span>
            <Input
              className="h-10 w-full bg-white number-tabular"
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setOffset(0);
                setHasMore(true);
              }}
            />
          </label>
          <Button className="h-10 self-end" variant="secondary" onClick={handleApplyRange}>
            조회
          </Button>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-slate-500">{stat.label}</p>
              <BarChart3 className={cn("size-5", stat.color)} aria-hidden="true" />
            </div>
            <p className={cn("text-2xl font-semibold number-tabular", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              전체 내역
            </FilterButton>
            <FilterButton active={filter === "income"} onClick={() => setFilter("income")}>
              수입
            </FilterButton>
            <FilterButton active={filter === "expense"} onClick={() => setFilter("expense")}>
              지출
            </FilterButton>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Filter className="size-4" aria-hidden="true" />
            <span>{filteredEntries.length}건 표시</span>
          </div>
        </div>

        {loadState === "loading" && entries.length === 0 ? (
          <div className="flex min-h-80 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            분개를 불러오는 중
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center bg-slate-50/60 p-8 text-center">
            <BarChart3 className="size-8 text-slate-400" aria-hidden="true" />
            <p className="mt-3 font-medium text-slate-700">표시할 분개가 없습니다</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              날짜 범위를 조정하거나 계좌 등록 후 백엔드 수집 파이프라인이 완료될 때까지 기다려 주세요.
            </p>
          </div>
        ) : (
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow className="bg-slate-50/60 uppercase hover:bg-slate-50/60">
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
                  const confidence = entry.aiConfidence ?? 1;

                  return (
                    <TableRow key={entry.id} className="hover:bg-slate-50/80">
                      <TableCell className="px-6 py-4 text-sm text-slate-500 number-tabular">{entry.entryDate}</TableCell>
                      <TableCell className="max-w-[260px] px-6 py-4">
                        <p className="truncate font-semibold text-slate-800">{entry.description ?? "거래 분개"}</p>
                        <p className="mt-1 text-xs text-slate-400">{entry.source === "codef_bank" ? "CODEF 자동 수집" : "수동 입력"}</p>
                      </TableCell>
                      <TableCell className="max-w-[360px] px-6 py-4 text-sm leading-6 text-slate-600">
                        <span className="line-clamp-2">{formatJournalLines(entry)}</span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-6 py-4 text-right font-semibold number-tabular",
                          movement === "income" ? "text-primary" : movement === "expense" ? "text-red-600" : "text-slate-800"
                        )}
                      >
                        {movement === "income" ? "+" : movement === "expense" ? "-" : ""}
                        {formatCurrency(getEntryAmount(entry))}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant={confidence < 0.5 ? "warning" : "success"}>{Math.round(confidence * 100)}%</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}

        <div className="flex justify-center bg-slate-50/60 p-5">
          <Button
            variant="ghost"
            disabled={loadState === "loading" || !hasMore}
            onClick={() => setOffset((current) => current + limit)}
          >
            {loadState === "loading" && entries.length > 0 ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
            {hasMore ? "더 많은 내역 보기" : "마지막 내역입니다"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      className={cn(
        "h-9 rounded-md px-3 text-sm font-medium",
        active ? "bg-indigo-50 text-primary hover:bg-indigo-50" : "text-slate-500"
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

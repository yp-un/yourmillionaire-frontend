import { useEffect, useMemo, useState } from "react";
import { FileBarChart, Loader2 } from "lucide-react";

import {
  Badge,
  Button,
  Input,
  MetricCard,
  Notice,
  PageHeader,
  PageShell,
  SectionCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@millionaire/ui";

import { useApi } from "../api/ApiProvider";
import type {
  BalanceSheetResponse,
  CashFlowResponse,
  IncomeStatementResponse,
  ReportLineItem,
  TrialBalanceResponse
} from "../api/types";
import { formatCurrency, getCurrentMonthRange } from "../lib/journal";
import { useWorkspace } from "../workspace/WorkspaceProvider";

type LoadState = "error" | "loading" | "ready";

export function ReportsPage() {
  const api = useApi();
  const { selectedTenantId, status: workspaceStatus } = useWorkspace();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [from, setFrom] = useState(defaultRange.from.slice(0, 4) + "-01-01");
  const [to, setTo] = useState(defaultRange.to);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pnl, setPnl] = useState<IncomeStatementResponse | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResponse | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowResponse | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);

  async function loadReports() {
    if (!selectedTenantId || workspaceStatus !== "ready") {
      return;
    }

    setLoadState("loading");
    setError(null);

    try {
      const [nextPnl, nextBs, nextCf, nextTb] = await Promise.all([
        api.getPnlReport(selectedTenantId, { from, to }),
        api.getBalanceSheetReport(selectedTenantId, to),
        api.getCashFlowReport(selectedTenantId, { from, to, method: "indirect" }),
        api.getTrialBalanceReport(selectedTenantId, to)
      ]);

      setPnl(nextPnl);
      setBalanceSheet(nextBs);
      setCashFlow(nextCf);
      setTrialBalance(nextTb);
      setLoadState("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "리포트를 불러오지 못했습니다.");
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadReports();
  }, [selectedTenantId, workspaceStatus]);

  return (
    <PageShell>
      <PageHeader
        title="재무제표"
        actions={
          <div className="ym-date-grid lg:min-w-[26rem]">
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            <Button onClick={() => void loadReports()} disabled={loadState === "loading"}>
              {loadState === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileBarChart className="size-4" aria-hidden="true" />}
              조회
            </Button>
          </div>
        }
      />

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Tabs defaultValue="pnl" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4 lg:w-auto">
          <TabsTrigger value="pnl">손익</TabsTrigger>
          <TabsTrigger value="balance">재무상태</TabsTrigger>
          <TabsTrigger value="cashflow">현금흐름</TabsTrigger>
          <TabsTrigger value="trial">시산표</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl">
          <div className="grid gap-4 lg:grid-cols-3">
            <MetricCard label="매출" value={formatCurrency(pnl?.revenue.subtotal ?? 0)} tone="primary" />
            <MetricCard label="영업비용" value={formatCurrency(pnl?.operatingExpenses.subtotal ?? 0)} tone="danger" />
            <MetricCard label="당기순이익" value={formatCurrency(pnl?.netIncome ?? 0)} />
          </div>
          <ReportSection className="mt-4" title="영업비용 상세" items={pnl?.operatingExpenses.items ?? []} empty="집계된 영업비용이 없습니다." />
        </TabsContent>

        <TabsContent value="balance">
          <div className="grid gap-4 lg:grid-cols-3">
            <MetricCard label="자산" value={formatCurrency(balanceSheet?.assets.total ?? 0)} tone="primary" />
            <MetricCard label="부채" value={formatCurrency(balanceSheet?.liabilities.total ?? 0)} tone="warning" />
            <MetricCard label="부채와 자본" value={formatCurrency(balanceSheet?.totalLiabilitiesAndEquity ?? 0)} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <ReportSection title="유동자산" items={balanceSheet?.assets.current.items ?? []} empty="유동자산이 없습니다." />
            <ReportSection title="유동부채" items={balanceSheet?.liabilities.current.items ?? []} empty="유동부채가 없습니다." />
            <ReportSection title="자본" items={balanceSheet?.equity.items ?? []} empty="자본 항목이 없습니다." />
          </div>
        </TabsContent>

        <TabsContent value="cashflow">
          <div className="grid gap-4 lg:grid-cols-3">
            <MetricCard label="기초 현금" value={formatCurrency(cashFlow?.openingCash ?? 0)} />
            <MetricCard label="순증감" value={formatCurrency(cashFlow?.netChange ?? 0)} tone="primary" />
            <MetricCard label="기말 현금" value={formatCurrency(cashFlow?.closingCash ?? 0)} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <ReportSection title="영업활동" items={cashFlow?.operating.items ?? []} empty="영업활동 항목이 없습니다." />
            <ReportSection title="투자활동" items={cashFlow?.investing.items ?? []} empty="투자활동 항목이 없습니다." />
            <ReportSection title="재무활동" items={cashFlow?.financing.items ?? []} empty="재무활동 항목이 없습니다." />
          </div>
        </TabsContent>

        <TabsContent value="trial">
          <SectionCard
            title="시산표"
            trailing={
              <Badge variant={trialBalance?.metadata.includesUnclassifiedDrafts ? "warning" : "success"}>
                {trialBalance?.metadata.includesUnclassifiedDrafts ? "초안 포함" : "확정 데이터"}
              </Badge>
            }
          >
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="bg-muted/70 hover:bg-muted/70">
                  <TableHead>계정</TableHead>
                  <TableHead className="text-right">차변</TableHead>
                  <TableHead className="text-right">대변</TableHead>
                  <TableHead className="text-right">잔액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(trialBalance?.rows ?? []).slice(0, 80).map((row) => (
                  <TableRow key={row.accountCode}>
                    <TableCell className="font-medium">{row.accountCode} {row.accountName}</TableCell>
                    <TableCell className="text-right number-tabular">{formatCurrency(row.debit)}</TableCell>
                    <TableCell className="text-right number-tabular">{formatCurrency(row.credit)}</TableCell>
                    <TableCell className="text-right number-tabular">{formatCurrency(row.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function ReportSection({
  className,
  empty,
  items,
  title
}: {
  className?: string;
  empty: string;
  items: ReportLineItem[];
  title: string;
}) {
  return (
    <SectionCard className={className} title={title}>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.accountCode} className="ym-panel flex items-center justify-between gap-4 px-3 py-2 text-sm">
              <span>{item.accountCode} {item.accountName}</span>
              <span className="font-medium number-tabular">{formatCurrency(item.amount)}</span>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

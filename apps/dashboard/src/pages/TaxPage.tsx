import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, ReceiptText, Save, Sparkles } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Notice,
  PageHeader,
  PageShell,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@millionaire/ui";

import { useApi } from "../api/ApiProvider";
import { YmApiError } from "../api/client";
import type {
  CorporationProfile,
  FilingObligation,
  TaxInvoice,
  TaxStrategyEvent,
  TaxStrategyScenario,
  WithholdingItem
} from "../api/types";
import { formatCurrency, getCurrentMonthRange } from "../lib/journal";
import { useWorkspace } from "../workspace/WorkspaceProvider";

type ProfileForm = {
  fiscalYearStartMonth: string;
  foundedOn: string;
  industryCode: string;
  isExternalAudit: boolean;
  isVentureCertified: boolean;
  isYouthFounder: boolean;
  priorYearCorpTax: string;
  priorYearRevenue: string;
  regionCode: string;
  vatPrepaymentRecipient: boolean;
  withholdingCadence: "MONTHLY" | "SEMIANNUAL";
};

const emptyProfileForm: ProfileForm = {
  fiscalYearStartMonth: "1",
  foundedOn: "",
  industryCode: "",
  isExternalAudit: false,
  isVentureCertified: false,
  isYouthFounder: false,
  priorYearCorpTax: "",
  priorYearRevenue: "",
  regionCode: "",
  vatPrepaymentRecipient: false,
  withholdingCadence: "MONTHLY"
};

const taxStrategyScenarios: Array<{ label: string; value: TaxStrategyScenario }> = [
  { label: "적용 가능 세제 혜택", value: "applicable_benefits" },
  { label: "다가오는 신고 마감", value: "upcoming_deadlines" },
  { label: "연간 신고 점검", value: "yearly_filing_check" },
  { label: "부가세 분기 점검", value: "vat_quarter_review" },
  { label: "가산세 위험 점검", value: "penalty_risk_check" }
];

const regionOptions = [
  { label: "수도권 과밀억제권역", value: "METRO_OVERCROWDED" },
  { label: "수도권 비과밀권역", value: "METRO_NON_OVERCROWDED" },
  { label: "비수도권", value: "NON_METRO" }
];

const industryOptions = [
  { label: "소프트웨어 개발 및 공급업", value: "62010" },
  { label: "컴퓨터 프로그래밍 서비스업", value: "62021" },
  { label: "컴퓨터 시스템 통합 자문 및 구축 서비스업", value: "62022" },
  { label: "자료 처리, 호스팅 및 관련 서비스업", value: "63110" },
  { label: "포털 및 기타 인터넷 정보매개 서비스업", value: "63120" },
  { label: "연구개발업", value: "70000" },
  { label: "제조업", value: "30000" },
  { label: "전문 디자인업", value: "73200" }
];

const fiscalYearStartMonthOptions = Array.from({ length: 12 }, (_, index) => {
  const month = String(index + 1);
  return { label: `${month}월`, value: month };
});

export function TaxPage() {
  const api = useApi();
  const { selectedTenantId, status: workspaceStatus } = useWorkspace();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [profile, setProfile] = useState<CorporationProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [filings, setFilings] = useState<FilingObligation[]>([]);
  const [withholding, setWithholding] = useState<WithholdingItem[]>([]);
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [invoiceFrom, setInvoiceFrom] = useState(defaultRange.from);
  const [invoiceTo, setInvoiceTo] = useState(defaultRange.to);
  const [strategyScenario, setStrategyScenario] = useState<TaxStrategyScenario>("applicable_benefits");
  const [strategyEvents, setStrategyEvents] = useState<TaxStrategyEvent[]>([]);
  const [strategyRunning, setStrategyRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strategyText = useMemo(() => strategyEvents.filter((event) => event.type === "text_delta").map((event) => event.chunk ?? "").join(""), [strategyEvents]);
  const strategyFinal = useMemo(() => [...strategyEvents].reverse().find((event) => event.type === "final"), [strategyEvents]);
  const strategyError = useMemo(() => [...strategyEvents].reverse().find((event) => event.type === "error"), [strategyEvents]);
  const profileDirty = useMemo(() => !isSameProfileForm(profileForm, profileToForm(profile)), [profile, profileForm]);

  async function loadTaxData() {
    if (!selectedTenantId || workspaceStatus !== "ready") {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextProfile, nextFilings, nextWithholding, nextInvoices] = await Promise.all([
        api.getCorporationProfile(selectedTenantId).catch((profileError) => {
          if (profileError instanceof YmApiError && profileError.status === 404) {
            return null;
          }

          throw profileError;
        }),
        api.getUpcomingFilings(selectedTenantId),
        api.getPendingWithholding(selectedTenantId),
        api.getTaxInvoices(selectedTenantId, { from: invoiceFrom, to: invoiceTo })
      ]);

      setProfile(nextProfile);
      setProfileForm(profileToForm(nextProfile));
      setFilings(nextFilings.filings);
      setWithholding(nextWithholding.items);
      setInvoices(nextInvoices.items);
    } catch (loadError) {
      setError(toTaxErrorMessage(loadError, "세무 데이터를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTaxData();
  }, [selectedTenantId, workspaceStatus]);

  async function handleSaveProfile() {
    if (!selectedTenantId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const nextProfile = await api.upsertCorporationProfile(selectedTenantId, formToProfileRequest(profileForm));
      setProfile(nextProfile);
      setProfileForm(profileToForm(nextProfile));
    } catch (saveError) {
      setError(toTaxErrorMessage(saveError, "회사 프로필을 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function handleRunTaxStrategy() {
    if (!selectedTenantId) {
      return;
    }

    setStrategyRunning(true);
    setStrategyEvents([]);
    setError(null);

    try {
      await api.runTaxStrategy(selectedTenantId, strategyScenario, (event) => {
        setStrategyEvents((current) => [...current, event]);
      });
    } catch (runError) {
      setError(toTaxErrorMessage(runError, "세무 전략 점검을 실행하지 못했습니다."));
    } finally {
      setStrategyRunning(false);
    }
  }

  async function handleFileWithholding(id: string) {
    if (!selectedTenantId) {
      return;
    }

    await api.fileWithholding(selectedTenantId, id);
    setWithholding((items) => items.filter((item) => item.id !== id));
  }

  return (
    <PageShell>
      <PageHeader
        title="세무 관리"
        actions={
          <Button variant="outline" onClick={() => void loadTaxData()} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ReceiptText className="size-4" aria-hidden="true" />}
            데이터 새로고침
          </Button>
        }
      />

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 rounded-lg min-[420px]:grid-cols-2 sm:rounded-lg md:grid-cols-5 lg:w-auto">
          <TabsTrigger className="rounded-md" value="profile">회사 프로필</TabsTrigger>
          <TabsTrigger className="rounded-md" value="filings">신고</TabsTrigger>
          <TabsTrigger className="rounded-md" value="withholding">원천세</TabsTrigger>
          <TabsTrigger className="rounded-md" value="invoices">세금계산서</TabsTrigger>
          <TabsTrigger className="rounded-md" value="agent">AI 세무</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                회사 프로필
                <Badge variant={profile ? "success" : "outline"}>{profile ? "저장됨" : "미등록"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <Field label="설립일">
                <Input type="date" value={profileForm.foundedOn} onChange={(event) => updateProfileForm("foundedOn", event.target.value)} />
              </Field>
              <Field label="본점 소재지">
                <Select value={profileForm.regionCode} onValueChange={(value) => updateProfileForm("regionCode", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="지역 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {profileForm.regionCode && !regionOptions.some((option) => option.value === profileForm.regionCode) ? (
                      <SelectItem value={profileForm.regionCode}>저장된 지역</SelectItem>
                    ) : null}
                    {regionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="업종">
                <Select value={profileForm.industryCode} onValueChange={(value) => updateProfileForm("industryCode", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="업종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {profileForm.industryCode && !industryOptions.some((option) => option.value === profileForm.industryCode) ? (
                      <SelectItem value={profileForm.industryCode}>저장된 업종</SelectItem>
                    ) : null}
                    {industryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="원천세 신고 주기">
                <Select value={profileForm.withholdingCadence} onValueChange={(value) => updateProfileForm("withholdingCadence", value as ProfileForm["withholdingCadence"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">매월</SelectItem>
                    <SelectItem value="SEMIANNUAL">반기</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="회계연도 시작월">
                <Select value={profileForm.fiscalYearStartMonth} onValueChange={(value) => updateProfileForm("fiscalYearStartMonth", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="시작월 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalYearStartMonthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="전년도 매출">
                <div className="relative">
                  <Input
                    className="pr-10 text-right number-tabular"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatAmountInput(profileForm.priorYearRevenue)}
                    onChange={(event) => updateProfileForm("priorYearRevenue", event.target.value.replace(/\D/g, ""))}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">원</span>
                </div>
              </Field>
              <ToggleField label="청년창업자" checked={profileForm.isYouthFounder} onChange={(value) => updateProfileForm("isYouthFounder", value)} />
              <ToggleField label="벤처 인증" checked={profileForm.isVentureCertified} onChange={(value) => updateProfileForm("isVentureCertified", value)} />
              <ToggleField label="외부감사 대상" checked={profileForm.isExternalAudit} onChange={(value) => updateProfileForm("isExternalAudit", value)} />
              <div className="lg:col-span-3">
                <Button onClick={handleSaveProfile} disabled={saving || !profileDirty}>
                  {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                  프로필 저장
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filings">
          <Card>
            <CardHeader>
              <CardTitle>예정 신고</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filings.length === 0 ? (
                <EmptyText>예정된 신고 의무가 없습니다.</EmptyText>
              ) : (
                filings.map((filing) => (
                  <div key={filing.id} className="flex flex-col gap-2 rounded-md border p-3 text-sm lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold">{filingKindLabel(filing.kind)}</p>
                      <p className="text-muted-foreground">{filing.periodStart} - {filing.periodEnd}</p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="font-medium">영업일 기준 {filing.businessDueDate}</p>
                      <p className="text-muted-foreground">법정기한 {filing.statutoryDueDate}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withholding">
          <Card>
            <CardHeader>
              <CardTitle>원천세 대기</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {withholding.length === 0 ? (
                <EmptyText>대기 중인 원천세 항목이 없습니다.</EmptyText>
              ) : (
                withholding.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-md border p-3 text-sm lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold">{item.payeeLabel}</p>
                      <p className="text-muted-foreground">{item.incomeType} · 지급일 {item.paymentDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium number-tabular">{formatCurrency(item.incomeTax + item.localIncomeTax)}</span>
                      <Button size="sm" variant="outline" onClick={() => void handleFileWithholding(item.id)}>
                        신고 처리
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                전자세금계산서
                <div className="ym-date-grid lg:min-w-[26rem]">
                  <Input type="date" value={invoiceFrom} onChange={(event) => setInvoiceFrom(event.target.value)} />
                  <Input type="date" value={invoiceTo} onChange={(event) => setInvoiceTo(event.target.value)} />
                  <Button variant="outline" onClick={() => void loadTaxData()}>조회</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.length === 0 ? (
                <EmptyText>조회 범위의 전자세금계산서가 없습니다.</EmptyText>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="grid gap-2 rounded-md border p-3 text-sm lg:grid-cols-[1fr_auto_auto] lg:items-center">
                    <div>
                      <p className="font-semibold">{invoice.direction === "SALE" ? "매출" : "매입"} · {invoice.writtenDate}</p>
                      <p className="text-muted-foreground">{invoice.docType}</p>
                    </div>
                    <span className="number-tabular">{formatCurrency(invoice.supplyAmount)}</span>
                    <Badge variant={invoice.isDeductible ? "success" : "warning"}>{invoice.isDeductible ? "공제" : "불공제"}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent">
          <Card>
            <CardHeader>
              <CardTitle>AI 세무 전략</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Select value={strategyScenario} onValueChange={(value) => setStrategyScenario(value as TaxStrategyScenario)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taxStrategyScenarios.map((scenario) => (
                      <SelectItem key={scenario.value} value={scenario.value}>
                        {scenario.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleRunTaxStrategy} disabled={strategyRunning}>
                  {strategyRunning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
                  분석 시작
                </Button>
              </div>

              {strategyEvents.length > 0 ? (
                <div className="ym-panel flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="text-muted-foreground">분석 상태</span>
                  <Badge variant={strategyRunning ? "warning" : "success"}>{strategyRunning ? "분석 중" : "완료"}</Badge>
                </div>
              ) : null}

              {strategyError ? <Notice tone="danger">{strategyError.reason ?? "전략 점검 중 오류가 발생했습니다."}</Notice> : null}

              {strategyText || strategyFinal?.summary ? (
                <div className="ym-panel whitespace-pre-wrap p-4 text-sm leading-7">
                  {strategyText || strategyFinal?.summary}
                </div>
              ) : (
                <EmptyText>현재 회사 프로필과 신고 일정을 기준으로 분석합니다.</EmptyText>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );

  function updateProfileForm<Key extends keyof ProfileForm>(key: Key, value: ProfileForm[Key]) {
    setProfileForm((current) => ({ ...current, [key]: value }));
  }
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm">
      <input type="checkbox" className="size-4 cursor-pointer" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="ym-panel p-4 text-sm text-muted-foreground">{children}</p>;
}

function profileToForm(profile: CorporationProfile | null): ProfileForm {
  if (!profile) {
    return emptyProfileForm;
  }

  return {
    fiscalYearStartMonth: String(profile.fiscalYearStartMonth ?? 1),
    foundedOn: profile.foundedOn ?? "",
    industryCode: profile.industryCode ?? "",
    isExternalAudit: profile.isExternalAudit ?? false,
    isVentureCertified: profile.isVentureCertified ?? false,
    isYouthFounder: profile.isYouthFounder ?? false,
    priorYearCorpTax: profile.priorYearCorpTax ? String(profile.priorYearCorpTax) : "",
    priorYearRevenue: profile.priorYearRevenue ? String(profile.priorYearRevenue) : "",
    regionCode: profile.regionCode ?? "",
    vatPrepaymentRecipient: profile.vatPrepaymentRecipient ?? false,
    withholdingCadence: profile.withholdingCadence ?? "MONTHLY"
  };
}

function isSameProfileForm(left: ProfileForm, right: ProfileForm) {
  return (Object.keys(emptyProfileForm) as Array<keyof ProfileForm>).every((key) => left[key] === right[key]);
}

function formatAmountInput(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.NumberFormat("ko-KR").format(Number(value));
}

function formToProfileRequest(form: ProfileForm) {
  return {
    fiscalYearStartMonth: Number(form.fiscalYearStartMonth || 1),
    foundedOn: form.foundedOn || undefined,
    industryCode: form.industryCode || undefined,
    isExternalAudit: form.isExternalAudit,
    isVentureCertified: form.isVentureCertified,
    isYouthFounder: form.isYouthFounder,
    priorYearCorpTax: form.priorYearCorpTax ? Number(form.priorYearCorpTax) : undefined,
    priorYearRevenue: form.priorYearRevenue ? Number(form.priorYearRevenue) : undefined,
    regionCode: form.regionCode || undefined,
    vatPrepaymentRecipient: form.vatPrepaymentRecipient,
    withholdingCadence: form.withholdingCadence
  };
}

function toTaxErrorMessage(error: unknown, fallback: string) {
  if (error instanceof YmApiError) {
    if (error.status === 401 || error.code === "UNAUTHORIZED") {
      return "세무 API 인증이 만료되었거나 권한 확인에 실패했습니다. 다시 로그인한 뒤 시도해 주세요.";
    }

    return error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

function filingKindLabel(kind: string) {
  const labels: Record<string, string> = {
    CORP_FINAL: "법인세 정기신고",
    CORP_INTERIM: "법인세 중간예납",
    LOCAL_INCOME: "지방소득세",
    VAT_FINAL: "부가세 확정신고",
    VAT_PRELIM: "부가세 예정신고",
    VAT_PREPAYMENT_NOTICE: "부가세 예정고지",
    WH_MONTHLY: "원천세 월 신고",
    WH_PAYMENT_STATEMENT: "지급명세서",
    WH_SEMIANNUAL: "원천세 반기 신고"
  };

  return labels[kind] ?? kind;
}

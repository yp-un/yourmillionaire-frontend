import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bot, Loader2, ReceiptText, Save, Search } from "lucide-react";

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
  TabsTrigger,
  Textarea
} from "@millionaire/ui";

import { useApi } from "../api/ApiProvider";
import { YmApiError } from "../api/client";
import type {
  CorporationProfile,
  FilingObligation,
  FindBenefitsResponse,
  SearchTaxLawResponse,
  TaxInvoice,
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

export function TaxPage() {
  const api = useApi();
  const { me, selectedTenantId, status: workspaceStatus } = useWorkspace();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [profile, setProfile] = useState<CorporationProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [filings, setFilings] = useState<FilingObligation[]>([]);
  const [withholding, setWithholding] = useState<WithholdingItem[]>([]);
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [invoiceFrom, setInvoiceFrom] = useState(defaultRange.from);
  const [invoiceTo, setInvoiceTo] = useState(defaultRange.to);
  const [taxQuery, setTaxQuery] = useState("");
  const [taxLawResult, setTaxLawResult] = useState<SearchTaxLawResponse | null>(null);
  const [benefits, setBenefits] = useState<FindBenefitsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSearchTaxLaw() {
    if (!selectedTenantId || !taxQuery.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.searchTaxLaw(selectedTenantId, {
        query: taxQuery.trim(),
        asOfDate: new Date().toISOString().slice(0, 10)
      });
      setTaxLawResult(result);
    } catch (searchError) {
      setError(toTaxErrorMessage(searchError, "세법 검색을 실행하지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }

  async function handleFindBenefits() {
    if (!selectedTenantId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.findBenefits(selectedTenantId, {
        asOfDate: new Date().toISOString().slice(0, 10),
        tenantType: me?.tenantType ?? "corporation",
        corpProfile: {
          foundedAt: profileForm.foundedOn || "2025-01-01",
          hqSigungu: profileForm.regionCode || "UNKNOWN",
          industryCode: profileForm.industryCode || "6201",
          isExternalAudit: profileForm.isExternalAudit,
          isVentureCertified: profileForm.isVentureCertified,
          isYouthFounder: profileForm.isYouthFounder,
          priorYearCorpTax: Number(profileForm.priorYearCorpTax || 0),
          priorYearRevenue: Number(profileForm.priorYearRevenue || 0)
        }
      });
      setBenefits(result);
    } catch (benefitError) {
      setError(toTaxErrorMessage(benefitError, "혜택 탐색을 실행하지 못했습니다."));
    } finally {
      setLoading(false);
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
        <TabsList className="grid h-auto w-full grid-cols-1 min-[420px]:grid-cols-2 lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="profile">회사 프로필</TabsTrigger>
          <TabsTrigger value="filings">신고</TabsTrigger>
          <TabsTrigger value="withholding">원천세</TabsTrigger>
          <TabsTrigger value="invoices">세금계산서</TabsTrigger>
          <TabsTrigger value="agent">AI 세무</TabsTrigger>
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
              <Field label="지역 코드">
                <Input value={profileForm.regionCode} placeholder="NON_METRO" onChange={(event) => updateProfileForm("regionCode", event.target.value)} />
              </Field>
              <Field label="업종 코드">
                <Input value={profileForm.industryCode} placeholder="6201" onChange={(event) => updateProfileForm("industryCode", event.target.value)} />
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
                <Input inputMode="numeric" value={profileForm.fiscalYearStartMonth} onChange={(event) => updateProfileForm("fiscalYearStartMonth", event.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="전년도 매출">
                <Input inputMode="numeric" value={profileForm.priorYearRevenue} onChange={(event) => updateProfileForm("priorYearRevenue", event.target.value.replace(/\D/g, ""))} />
              </Field>
              <ToggleField label="청년창업자" checked={profileForm.isYouthFounder} onChange={(value) => updateProfileForm("isYouthFounder", value)} />
              <ToggleField label="벤처 인증" checked={profileForm.isVentureCertified} onChange={(value) => updateProfileForm("isVentureCertified", value)} />
              <ToggleField label="외부감사 대상" checked={profileForm.isExternalAudit} onChange={(value) => updateProfileForm("isExternalAudit", value)} />
              <div className="lg:col-span-3">
                <Button onClick={handleSaveProfile} disabled={saving}>
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
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>세법 검색</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={taxQuery} onChange={(event) => setTaxQuery(event.target.value)} placeholder="예: 청년창업 중소기업 세액감면 적용 조건" />
                <Button onClick={handleSearchTaxLaw} disabled={loading || !taxQuery.trim()}>
                  <Search className="size-4" aria-hidden="true" />
                  검색
                </Button>
                {taxLawResult ? <ResultBox value={taxLawResult} /> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>적용 가능 혜택</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleFindBenefits} disabled={loading}>
                  <Bot className="size-4" aria-hidden="true" />
                  혜택 찾기
                </Button>
                {benefits ? (
                  <div className="space-y-3">
                    <div className="ym-panel p-3 text-sm">
                      <p className="text-muted-foreground">예상 절감액</p>
                      <p className="mt-1 text-2xl font-semibold">{formatCurrency(benefits.totalEstimatedSavings.amount)}</p>
                    </div>
                    <ResultBox value={benefits} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
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

function ResultBox({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-white">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
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
      return "세무 API가 로그인 정보를 확인하지 못했습니다. 현재 세션으로 다른 화면은 동작한다면 백엔드 Tax Lambda의 JWT claims 검증 또는 배포 상태를 확인해야 합니다.";
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

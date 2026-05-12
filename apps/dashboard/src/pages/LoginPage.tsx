import { useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { Landmark, ShieldCheck } from "lucide-react";

import { Button } from "@millionaire/ui";

import { useAuth } from "../auth/AuthProvider";

type LocationState = {
  from?: string;
};

export function LoginPage() {
  const { signIn, status } = useAuth();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnTo = useMemo(() => {
    const state = location.state as LocationState | null;

    return state?.from && state.from !== "/login" ? state.from : "/";
  }, [location.state]);

  if (status === "authenticated") {
    return <Navigate to={returnTo} replace />;
  }

  async function handleSignIn() {
    setIsRedirecting(true);
    setError(null);

    try {
      await signIn(returnTo);
    } catch (signInError) {
      setIsRedirecting(false);
      setError(signInError instanceof Error ? signInError.message : "로그인을 시작하지 못했습니다.");
    }
  }

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <section className="hidden min-h-screen flex-1 border-r bg-card p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-white">
            <Landmark className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">YourMillionaire</p>
            <p className="text-xs text-muted-foreground">Ledger Agent</p>
          </div>
        </div>
        <div className="max-w-lg">
          <p className="text-sm font-medium text-primary">안전한 Google 로그인</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal">은행 연결부터 자동 분개 조회까지 한 화면에서 처리합니다.</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            로그인 후 개인 워크스페이스가 자동으로 준비됩니다. 계좌를 연결하면 수집된 거래가 복식부기 분개로 정리됩니다.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4" aria-hidden="true" />
            연결 정보
          </div>
          은행 비밀번호는 연결 생성에만 사용되며 평문으로 저장되지 않습니다.
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center p-6">
        <div className="ym-surface w-full max-w-md p-8">
          <div className="mb-8">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-white lg:hidden">
              <Landmark className="size-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-semibold">로그인</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Google 계정으로 로그인해 워크스페이스를 불러옵니다.</p>
          </div>

          {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}

          <Button className="h-11 w-full" disabled={isRedirecting || status === "loading"} onClick={handleSignIn}>
            {isRedirecting ? "이동 중..." : "Google로 계속하기"}
          </Button>

          <p className="mt-5 text-xs leading-5 text-muted-foreground">로그인 세션이 만료되면 자동 갱신을 시도하고, 실패 시 다시 로그인합니다.</p>
        </div>
      </section>
    </main>
  );
}

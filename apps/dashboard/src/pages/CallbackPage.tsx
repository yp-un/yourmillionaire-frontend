import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../auth/AuthProvider";
import { FullPageState } from "../routes/RequireAuth";

export function CallbackPage() {
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    handledRef.current = true;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const oauthError = params.get("error_description") ?? params.get("error");

      if (oauthError) {
        setError(oauthError);
        return;
      }

      if (!code || !state) {
        setError("Cognito callback에 authorization code가 없습니다.");
        return;
      }

      try {
        const result = await completeOAuth(code, state);
        navigate(result.returnTo || "/", { replace: true });
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : "로그인 callback 처리에 실패했습니다.");
      }
    }

    void handleCallback();
  }, [completeOAuth, navigate]);

  if (error) {
    return (
      <FullPageState
        title="로그인을 완료하지 못했습니다"
        body={error}
        action={{
          label: "다시 로그인",
          onClick: () => navigate("/login", { replace: true })
        }}
      />
    );
  }

  return <FullPageState title="로그인 완료 중" body="Cognito authorization code를 ID Token으로 교환하고 있습니다." />;
}

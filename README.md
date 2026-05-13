# YourMillionaire Frontend

모노레포 구성의 프론트엔드입니다.

- `apps/landing`: SEO 랜딩 페이지. Next.js App Router + static export. `domain.com` 배포 대상.
- `apps/dashboard`: 로그인 사용자가 쓰는 React SPA. Vite 정적 빌드. `dashboard.domain.com` 배포 대상.
- `packages/ui`: shadcn 방식의 공통 UI 컴포넌트와 Tailwind 디자인 토큰.
- `packages/config`: 공통 Tailwind preset과 TypeScript base config.

## 개발

```bash
bun install
bun run dev:landing
bun run dev:dashboard
```

대시보드는 백엔드 `docs/API_LIST.md` 기준으로 Cognito Hosted UI, `/me`, `/me/tenants`, `bank-connections`, `bank-accounts`, `journal/entries`를 호출합니다.
로컬 기본 URL은 `http://localhost:3000`이며 Cognito callback도 `http://localhost:3000/callback`입니다. Cognito에 등록된 callback과 정확히 일치해야 하므로 개발 중에는 `127.0.0.1`이나 네트워크 IP 대신 `localhost:3000`으로 접속하세요. 다른 포트를 쓰려면 `apps/dashboard/.env`에 `VITE_COGNITO_REDIRECT_URI`와 `VITE_COGNITO_LOGOUT_URI`를 등록된 URL로 맞추세요.

## 빌드

```bash
bun run build
```

빌드 산출물:

- 랜딩: `apps/landing/out`
- 대시보드 SPA: `apps/dashboard/dist`

## CloudFront / S3 배포 메모

랜딩(`domain.com`)은 Next.js `output: "export"`로 정적 HTML을 생성하므로 S3 + CloudFront에 그대로 올릴 수 있습니다.

대시보드(`dashboard.domain.com`)는 SPA 라우팅을 위해 CloudFront custom error response에서 `403`과 `404`를 `/index.html` + `200`으로 매핑해야 합니다.

두 배포 모두 S3 버킷은 퍼블릭 오픈 대신 CloudFront OAC로 접근시키는 구성이 기본입니다. 인증 이후 API 호출은 별도 API Gateway 도메인으로 분리하고, Cognito 토큰을 Authorization 헤더로 전달하는 전제를 둡니다.

## GitHub Actions 배포

`.github/workflows/deploy.yml`은 `main` push 시 변경된 앱만 빌드한 뒤 해당 S3에 배포합니다. `packages/**`, root `package.json`, `bun.lock`, workflow가 바뀌면 랜딩과 대시보드를 모두 다시 배포합니다. 수동 실행(`workflow_dispatch`)은 두 앱을 모두 빌드/배포합니다.

필수 GitHub Secrets:

- `AWS_ROLE_TO_ASSUME`: GitHub OIDC로 assume할 AWS IAM Role ARN
- `LANDING_S3_BUCKET`: 랜딩 정적 파일을 올릴 S3 bucket
- `DASHBOARD_S3_BUCKET`: 대시보드 정적 파일을 올릴 S3 bucket

선택 GitHub Secrets:

- `LANDING_CLOUDFRONT_DISTRIBUTION_ID`: 랜딩 CloudFront distribution id
- `DASHBOARD_CLOUDFRONT_DISTRIBUTION_ID`: 대시보드 CloudFront distribution id

대시보드 빌드에 쓰는 GitHub Variables:

- `AWS_REGION`: 기본값 `ap-northeast-2`
- `VITE_YM_API_BASE_URL`
- `VITE_COGNITO_DOMAIN`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_REDIRECT_URI`
- `VITE_COGNITO_LOGOUT_URI`
- `VITE_TAX_STRATEGY_URL`
- `VITE_SYNC_STREAM_URL`

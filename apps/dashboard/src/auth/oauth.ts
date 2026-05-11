import axios from "axios";

import { apiConfig } from "../api/config";

const authSessionKey = "ym.auth.session.v1";
const oauthPendingKey = "ym.oauth.pending.v1";
const tokenRefreshLeewayMs = 60_000;

type TokenResponse = {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

type JwtPayload = {
  exp?: number;
  email?: string;
  sub?: string;
  token_use?: string;
};

type OAuthPending = {
  codeVerifier: string;
  createdAt: number;
  redirectUri: string;
  returnTo: string;
  state: string;
};

export type AuthSession = {
  accessToken?: string;
  expiresAt: number;
  idToken: string;
  refreshToken?: string;
};

export class AuthFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthFlowError";
  }
}

export function readStoredSession() {
  const value = localStorage.getItem(authSessionKey);

  if (!value) {
    return null;
  }

  try {
    const session = JSON.parse(value) as AuthSession;

    if (!session.idToken || !session.expiresAt) {
      clearStoredSession();
      return null;
    }

    return session;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function storeSession(session: AuthSession) {
  localStorage.setItem(authSessionKey, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(authSessionKey);
  sessionStorage.removeItem(oauthPendingKey);
}

export function isSessionExpiring(session: AuthSession) {
  return session.expiresAt - Date.now() <= tokenRefreshLeewayMs;
}

export async function startGoogleOAuth(returnTo = "/") {
  const state = randomBase64Url(32);
  const codeVerifier = randomBase64Url(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const pending: OAuthPending = {
    state,
    codeVerifier,
    redirectUri: apiConfig.cognitoRedirectUri,
    returnTo,
    createdAt: Date.now()
  };

  sessionStorage.setItem(oauthPendingKey, JSON.stringify(pending));

  const authorizeUrl = new URL(`${apiConfig.cognitoDomain}/oauth2/authorize`);
  authorizeUrl.searchParams.set("client_id", apiConfig.cognitoClientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "email openid profile");
  authorizeUrl.searchParams.set("identity_provider", "Google");
  authorizeUrl.searchParams.set("redirect_uri", pending.redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  window.location.assign(authorizeUrl.toString());
}

export async function completeGoogleOAuth(code: string, returnedState: string) {
  const pending = readPendingOAuth();

  if (!pending) {
    throw new AuthFlowError("로그인 요청 정보가 없습니다. 다시 로그인해 주세요.");
  }

  if (pending.state !== returnedState) {
    throw new AuthFlowError("로그인 상태 검증에 실패했습니다. 다시 로그인해 주세요.");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", apiConfig.cognitoClientId);
  body.set("code", code);
  body.set("redirect_uri", pending.redirectUri);
  body.set("code_verifier", pending.codeVerifier);

  const tokenResponse = await requestToken(body);
  const session = toSession(tokenResponse);

  storeSession(session);
  sessionStorage.removeItem(oauthPendingKey);

  return {
    returnTo: pending.returnTo,
    session
  };
}

export async function refreshAuthSession(session: AuthSession) {
  if (!session.refreshToken) {
    return null;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("client_id", apiConfig.cognitoClientId);
  body.set("refresh_token", session.refreshToken);

  const tokenResponse = await requestToken(body);
  const refreshedSession = toSession({
    ...tokenResponse,
    refresh_token: tokenResponse.refresh_token ?? session.refreshToken
  });

  storeSession(refreshedSession);

  return refreshedSession;
}

export function buildLogoutUrl() {
  const logoutUrl = new URL(`${apiConfig.cognitoDomain}/logout`);
  logoutUrl.searchParams.set("client_id", apiConfig.cognitoClientId);
  logoutUrl.searchParams.set("logout_uri", apiConfig.cognitoLogoutUri);

  return logoutUrl.toString();
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)));

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function readPendingOAuth() {
  const value = sessionStorage.getItem(oauthPendingKey);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as OAuthPending;
  } catch {
    sessionStorage.removeItem(oauthPendingKey);
    return null;
  }
}

async function requestToken(body: URLSearchParams) {
  try {
    const response = await axios.post<TokenResponse>(`${apiConfig.cognitoDomain}/oauth2/token`, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 30_000
    });

    return response.data;
  } catch (error) {
    const payload = axios.isAxiosError(error)
      ? (error.response?.data as { error?: string; error_description?: string } | undefined)
      : undefined;

    throw new AuthFlowError(payload?.error_description ?? payload?.error ?? "토큰 발급에 실패했습니다.");
  }
}

function toSession(tokenResponse: TokenResponse): AuthSession {
  if (!tokenResponse.id_token) {
    throw new AuthFlowError("Cognito 응답에 ID Token이 없습니다.");
  }

  const payload = decodeJwtPayload(tokenResponse.id_token);
  const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + (tokenResponse.expires_in ?? 3600) * 1000;

  return {
    accessToken: tokenResponse.access_token,
    expiresAt,
    idToken: tokenResponse.id_token,
    refreshToken: tokenResponse.refresh_token
  };
}

function randomBase64Url(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return base64Url(bytes);
}

async function sha256Base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

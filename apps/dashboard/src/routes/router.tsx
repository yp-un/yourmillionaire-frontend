import { createBrowserRouter, Navigate } from "react-router";

import { CallbackPage } from "../pages/CallbackPage";
import { ConnectionsPage } from "../pages/ConnectionsPage";
import { LoginPage } from "../pages/LoginPage";
import { OverviewPage } from "../pages/OverviewPage";
import { ReportsPage } from "../pages/ReportsPage";
import { TaxPage } from "../pages/TaxPage";
import { TransactionsPage } from "../pages/TransactionsPage";
import { AppLayout } from "./AppLayout";
import { RequireAuth } from "./RequireAuth";
import { RouteTitleBoundary } from "./RouteTitle";

export type AppRouteHandle = {
  title?: string;
  view?: "overview" | "transactions" | "connections" | "reports" | "tax";
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RouteTitleBoundary />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
        handle: { title: "로그인" } satisfies AppRouteHandle
      },
      {
        path: "/callback",
        element: <CallbackPage />,
        handle: { title: "인증 처리 중" } satisfies AppRouteHandle
      },
      {
        index: true,
        element: <Navigate to="/overview" replace />
      },
      {
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          {
            path: "overview",
            element: <OverviewPage />,
            handle: { view: "overview", title: "개요" } satisfies AppRouteHandle
          },
          {
            path: "transactions",
            element: <TransactionsPage />,
            handle: { view: "transactions", title: "분개 조회" } satisfies AppRouteHandle
          },
          {
            path: "connections",
            element: <ConnectionsPage />,
            handle: { view: "connections", title: "계좌 연결" } satisfies AppRouteHandle
          },
          {
            path: "reports",
            element: <ReportsPage />,
            handle: { view: "reports", title: "재무제표" } satisfies AppRouteHandle
          },
          {
            path: "tax",
            element: <TaxPage />,
            handle: { view: "tax", title: "세무 관리" } satisfies AppRouteHandle
          }
        ]
      },
      {
        path: "*",
        element: <Navigate to="/overview" replace />
      }
    ]
  }
]);

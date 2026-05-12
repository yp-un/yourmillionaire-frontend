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

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/callback",
    element: <CallbackPage />
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />
      },
      {
        path: "overview",
        element: <OverviewPage />,
        handle: { view: "overview", title: "개요" }
      },
      {
        path: "transactions",
        element: <TransactionsPage />,
        handle: { view: "transactions", title: "분개 조회" }
      },
      {
        path: "connections",
        element: <ConnectionsPage />,
        handle: { view: "connections", title: "계좌 연결" }
      },
      {
        path: "reports",
        element: <ReportsPage />,
        handle: { view: "reports", title: "재무제표" }
      },
      {
        path: "tax",
        element: <TaxPage />,
        handle: { view: "tax", title: "세무 관리" }
      },
      {
        path: "*",
        element: <Navigate to="/overview" replace />
      }
    ]
  }
]);

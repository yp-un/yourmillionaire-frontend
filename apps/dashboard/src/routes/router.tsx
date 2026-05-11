import { createBrowserRouter, Navigate } from "react-router";

import { CallbackPage } from "../pages/CallbackPage";
import { ConnectionsPage } from "../pages/ConnectionsPage";
import { LoginPage } from "../pages/LoginPage";
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
        element: <Navigate to="/connections" replace />
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
        path: "*",
        element: <Navigate to="/connections" replace />
      }
    ]
  }
]);

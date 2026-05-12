import { useEffect } from "react";
import { Outlet, useMatches } from "react-router";

import type { AppRouteHandle } from "./router";

const DASHBOARD_TITLE = "YourMillionaire Dashboard";

function getDocumentTitle(routeTitle?: string) {
  return routeTitle ? `${routeTitle} | ${DASHBOARD_TITLE}` : DASHBOARD_TITLE;
}

export function RouteTitleBoundary() {
  const matches = useMatches();
  const routeTitle = [...matches]
    .reverse()
    .find((match) => {
      const handle = match.handle as AppRouteHandle | undefined;
      return typeof handle?.title === "string" && handle.title.length > 0;
    })
    ?.handle as AppRouteHandle | undefined;

  useEffect(() => {
    document.title = getDocumentTitle(routeTitle?.title);
  }, [routeTitle]);

  return <Outlet />;
}

import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge, Card, CardContent, CardHeader, CardTitle, cn } from "@millionaire/ui";

type PageShellProps = HTMLAttributes<HTMLDivElement>;

function PageShell({ className, ...props }: PageShellProps) {
  return <div className={cn("ym-page space-y-6", className)} {...props} />;
}

type PageHeaderProps = {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
};

function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <Badge variant="secondary">{eyebrow}</Badge> : null}
        <h2 className="ym-title mt-3">{title}</h2>
        {description ? <p className="ym-copy mt-2 max-w-3xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0">{actions}</div> : null}
    </section>
  );
}

type MetricCardProps = {
  icon?: LucideIcon;
  label: ReactNode;
  tone?: "danger" | "default" | "primary" | "success" | "warning";
  value: ReactNode;
};

function MetricCard({ icon: Icon, label, tone = "default", value }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon ? (
            <Icon
              className={cn(
                "size-5",
                tone === "primary" && "text-primary",
                tone === "danger" && "text-destructive",
                tone === "warning" && "text-amber-600 dark:text-amber-300",
                tone === "success" && "text-emerald-600 dark:text-emerald-300",
                tone === "default" && "text-muted-foreground",
              )}
              aria-hidden="true"
            />
          ) : null}
        </div>
        <p className="number-tabular text-2xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="ym-panel flex items-center justify-between gap-4 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function EmptyState({
  children,
  icon: Icon,
  title,
}: {
  children?: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 p-8 text-center">
      {Icon ? <Icon className="size-8 text-muted-foreground" aria-hidden="true" /> : null}
      <p className="mt-3 font-medium text-foreground">{title}</p>
      {children ? <p className="ym-copy mt-1 max-w-md">{children}</p> : null}
    </div>
  );
}

function Notice({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "danger" | "default" | "success" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 text-sm leading-6",
        tone === "default" && "border-border bg-card text-foreground",
        tone === "danger" && "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionCard({
  children,
  className,
  title,
  trailing,
}: {
  children: ReactNode;
  className?: string;
  title: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{title}</span>
          {trailing}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export { EmptyState, MetricCard, Notice, PageHeader, PageShell, SectionCard, StatusRow };

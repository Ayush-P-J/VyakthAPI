import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight break-words">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-base font-semibold">{children}</h2>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-2">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return <p role="alert" className="text-sm font-medium text-destructive">{message}</p>;
}

export type Tone = "neutral" | "success" | "warning" | "danger";
const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-soft text-primary",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
};

/** A status in words, tinted to help scanning. The words carry the meaning, not the colour. */
export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <Badge variant="outline" className={cn("h-auto border-transparent whitespace-normal", TONES[tone])}>{children}</Badge>;
}

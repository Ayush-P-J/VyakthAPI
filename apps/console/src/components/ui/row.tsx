import { cn } from "@/lib/utils";

export function Rows({ label, children }: { label: string; children: React.ReactNode }) {
  return <ul aria-label={label} className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">{children}</ul>;
}

/** One line of a list. It wraps instead of scrolling sideways on a phone. */
export function Row({ title, status, detail, action, muted }: { title: React.ReactNode; status?: React.ReactNode; detail: React.ReactNode; action?: React.ReactNode; muted?: boolean }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={cn("min-w-0 font-medium break-words", muted && "text-muted-foreground")}>{title}</p>
          {status}
        </div>
        <div className="mt-0.5 grid gap-0.5 text-[0.8125rem] text-muted-foreground">{detail}</div>
      </div>
      {action}
    </li>
  );
}

/** Supporting detail, closed until asked for. */
export function Disclosure({ summary, onToggle, children }: { summary: string; onToggle?: (open: boolean) => void; children: React.ReactNode }) {
  return (
    <details className="group mt-1" onToggle={(e) => onToggle?.(e.currentTarget.open)}>
      <summary className="w-fit cursor-pointer rounded-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">{summary}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

export function CodeBlock({ children }: { children: React.ReactNode }) {
  return <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs text-foreground">{children}</pre>;
}

export function Rows({ label, children }: { label: string; children: React.ReactNode }) {
  return <ul aria-label={label} className="mt-4 max-w-3xl border-t-2 border-bank">{children}</ul>;
}

/** One ruled line of a list. It wraps instead of scrolling sideways on a phone. */
export function Row({ title, detail, action, muted }: { title: React.ReactNode; detail: React.ReactNode; action?: React.ReactNode; muted?: boolean }) {
  return (
    <li className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-rule py-3 ${muted ? "text-quiet" : ""}`}>
      <div className="min-w-0">
        <p className="font-medium break-words">{title}</p>
        <div className="text-[0.8125rem] text-quiet">{detail}</div>
      </div>
      {action}
    </li>
  );
}

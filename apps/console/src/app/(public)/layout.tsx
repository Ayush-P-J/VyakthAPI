import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-4 px-4">
          <Link href="/docs" className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">HT</span>
            <span className="truncate">Hexspare Tally API</span>
          </Link>
          <nav aria-label="Site" className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost"><Link href="/docs">Docs</Link></Button>
            <Button asChild variant="outline"><Link href="/">Console</Link></Button>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">{children}</main>
    </div>
  );
}

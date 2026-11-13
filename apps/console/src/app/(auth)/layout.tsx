import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/server-api";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getProfile()) redirect("/");
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-6 flex items-center justify-center gap-2 text-sm font-semibold tracking-tight">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">HT</span>
          Hexspare Tally API
        </p>
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">{children}</div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/docs" className="underline-offset-4 hover:underline">Docs</Link>
          <span aria-hidden className="mx-2">/</span>
          <Link href="/pricing" className="underline-offset-4 hover:underline">Pricing</Link>
        </p>
      </div>
    </main>
  );
}

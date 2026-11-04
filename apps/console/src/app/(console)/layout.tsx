import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOut } from "@/components/sign-out";
import { getProfile } from "@/lib/server-api";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 bg-bank p-5 text-white md:sticky md:top-0 md:h-screen md:w-60">
        <Link href="/" className="font-serif text-lg leading-tight font-semibold">Hexspare Tally API</Link>
        <nav aria-label="Main">
          <Link href="/" aria-current="page" className="block border-l-3 border-margin bg-bank-deep px-3 py-2 font-medium">Overview</Link>
        </nav>
        <div className="mt-auto text-sm">
          <p className="font-medium break-words">{profile.user.name ?? profile.user.email}</p>
          <p className="mb-2 break-words text-rail-quiet">{profile.tenant.name}</p>
          <SignOut />
        </div>
      </aside>
      <main className="ledger-page min-w-0 flex-1 py-10 pr-6 md:py-14">{children}</main>
    </div>
  );
}

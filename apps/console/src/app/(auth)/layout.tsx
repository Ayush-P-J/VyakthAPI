import { redirect } from "next/navigation";
import { getProfile } from "@/lib/server-api";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getProfile()) redirect("/");
  return (
    <main className="ledger-page mx-auto min-h-screen max-w-2xl py-12 pr-6 sm:py-20">
      <p className="font-serif text-lg font-semibold text-margin">Hexspare Tally API</p>
      <div className="mt-8 max-w-md">{children}</div>
    </main>
  );
}

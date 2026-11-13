import type { Metadata } from "next";
import { ConnectFlow } from "@/components/connect-flow";

export const metadata: Metadata = { title: { absolute: "Connect your Tally" } };
// The page is about one secret link, so nothing about it may be cached.
export const dynamic = "force-dynamic";

export default async function ConnectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main aria-live="polite" className="min-h-svh bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl"><ConnectFlow token={token} /></div>
    </main>
  );
}

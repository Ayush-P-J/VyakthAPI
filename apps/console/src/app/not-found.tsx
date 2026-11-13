import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">We can't find that page</h1>
        <p className="mt-2 text-sm text-muted-foreground">The address may be wrong, or the project may belong to another account.</p>
        <Button asChild className="mt-6"><Link href="/">Back to the console</Link></Button>
      </div>
    </main>
  );
}

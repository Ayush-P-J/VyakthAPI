"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">The console can't reach the server</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your data is safe. The API may be restarting, so try again in a moment.</p>
        <Button onClick={reset} className="mt-6">Try again</Button>
      </div>
    </main>
  );
}

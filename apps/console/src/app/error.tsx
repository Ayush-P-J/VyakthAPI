"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="ledger-page mx-auto min-h-screen max-w-3xl py-14 pr-6">
      <h1 className="text-3xl font-bold">The console can't reach the server</h1>
      <p className="mt-3 text-quiet">Your data is safe. The API may be restarting, so try again in a moment.</p>
      <button onClick={reset} className="mt-6 bg-bank px-5 py-2.5 font-semibold text-white hover:bg-bank-deep">Try again</button>
    </main>
  );
}

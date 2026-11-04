import Link from "next/link";

export default function NotFound() {
  return (
    <main className="ledger-page mx-auto min-h-screen max-w-3xl py-14 pr-6">
      <h1 className="text-3xl font-bold">We can't find that page</h1>
      <p className="mt-3 text-quiet">The address may be wrong, or the project may belong to another account.</p>
      <Link href="/" className="mt-6 inline-block font-medium text-bank underline underline-offset-3">Back to the console</Link>
    </main>
  );
}

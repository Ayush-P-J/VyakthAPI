import type { Metadata } from "next";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Pricing" };

const PARTS = [
  { part: "Platform fee", on: "Each project, per month", why: "Covers the console, keys and webhooks." },
  { part: "Connection fee", on: "Each active connection, per month", why: "A connection is one Tally company, so you can pass this straight on to your customer." },
  { part: "Included calls", on: "An allowance with each connection", why: "Normal use never sees a meter." },
  { part: "Overage", on: "Each 1,000 calls past the allowance", why: "Heavy users pay their share." },
];

const UNITS = [
  { kind: "Synced read", units: 1, why: "Comes from our copy of the data." },
  { kind: "Live read", units: 5, why: "Uses your customer's Tally." },
  { kind: "Write", units: 10, why: "Uses your customer's Tally and runs as a job." },
];

export default function PricingPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">You pay for each connected Tally company, so your cost grows with your customers rather than with every API call. Prices will be in rupees.</p>
      <p role="note" className="mt-4 max-w-2xl rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">Amounts aren't set yet, and nothing is billed today. They'll be published here before billing starts.</p>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">What you'll pay for</h2>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader><TableRow><TableHead scope="col" className="pl-4">Part</TableHead><TableHead scope="col">Charged on</TableHead><TableHead scope="col" className="pr-4">Why</TableHead></TableRow></TableHeader>
            <TableBody>
              {PARTS.map((p) => (
                <TableRow key={p.part}>
                  <TableHead scope="row" className="pl-4 font-medium whitespace-normal">{p.part}</TableHead>
                  <TableCell className="whitespace-normal">{p.on}</TableCell>
                  <TableCell className="pr-4 whitespace-normal text-muted-foreground">{p.why}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-base font-semibold">How calls are counted</h2>
        <p className="mb-3 text-sm text-muted-foreground">Calls that use your customer's Tally count for more. You can see yours in the console under Usage.</p>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader><TableRow><TableHead scope="col" className="pl-4">Call</TableHead><TableHead scope="col" className="text-right">Units</TableHead><TableHead scope="col" className="pr-4">Why</TableHead></TableRow></TableHeader>
            <TableBody>
              {UNITS.map((u) => (
                <TableRow key={u.kind}>
                  <TableHead scope="row" className="pl-4 font-medium">{u.kind}</TableHead>
                  <TableCell className="text-right tabular-nums">{u.units}</TableCell>
                  <TableCell className="pr-4 whitespace-normal text-muted-foreground">{u.why}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">Ready to try it? <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">Create an account</Link> or <Link href="/docs/quickstart" className="font-medium text-primary underline-offset-4 hover:underline">read the quickstart</Link>.</p>
    </>
  );
}

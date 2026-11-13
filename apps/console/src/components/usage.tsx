"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState, ListSkeleton, LoadError, PageHeader } from "@/components/page-parts";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type Usage as UsageData } from "@/lib/api";

const INDIA_MONTH = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" });
const MONTH_LABEL = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });

/** The last 12 months, starting with the current one in India. */
function lastMonths() {
  const [y, m] = INDIA_MONTH.format(new Date()).split("-").map(Number) as [number, number];
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return { value: d.toISOString().slice(0, 7), label: MONTH_LABEL.format(d) };
  });
}

const n = (v: number) => v.toLocaleString("en-IN");
const num = "text-right tabular-nums";

export function Usage({ projectId }: { projectId: string }) {
  const [months] = useState(lastMonths);
  const [month, setMonth] = useState(months[0]!.value);
  const { data, error } = useQuery({ queryKey: ["project", projectId, "usage", month], queryFn: () => api<UsageData>(`/projects/${projectId}/usage?month=${month}`), refetchInterval: 60_000 });
  return (
    <>
      <PageHeader
        title="Usage"
        description="API calls your project has made. A synced read counts as 1 unit, a live read as 5, and a write as 10. Months follow India time."
        actions={<LabeledSelect label="Month" value={month} onChange={setMonth} options={months} />}
      />
      {error && !data ? <LoadError message={error.message} /> : null}
      {!data && !error ? <ListSkeleton /> : null}
      {data && data.connections.length === 0 ? <EmptyState title="No API calls in this month" description="Choose another month, or call the API with one of your keys." /> : null}
      {data?.connections.length ? (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableCaption className="sr-only">Usage by company</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="pl-4">Company</TableHead>
                <TableHead scope="col" className={num}>Synced reads</TableHead>
                <TableHead scope="col" className={num}>Live reads</TableHead>
                <TableHead scope="col" className={num}>Writes</TableHead>
                <TableHead scope="col" className={`${num} pr-4`}>Units</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.connections.map((c) => (
                <TableRow key={c.connectionId ?? "none"}>
                  <TableHead scope="row" className="pl-4 font-normal whitespace-normal">{c.connectionId ? c.company ?? "Unnamed company" : "Deleted connection"}</TableHead>
                  <TableCell className={num}>{n(c.calls.synced_read)}</TableCell>
                  <TableCell className={num}>{n(c.calls.live_read)}</TableCell>
                  <TableCell className={num}>{n(c.calls.write)}</TableCell>
                  <TableCell className={`${num} pr-4 font-medium`}>{n(c.units)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableHead scope="row" className="pl-4">Total</TableHead>
                <TableCell className={num}>{n(data.totals.calls.synced_read)}</TableCell>
                <TableCell className={num}>{n(data.totals.calls.live_read)}</TableCell>
                <TableCell className={num}>{n(data.totals.calls.write)}</TableCell>
                <TableCell className={`${num} pr-4`}>{n(data.totals.units)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      ) : null}
    </>
  );
}

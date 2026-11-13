"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { EmptyState, LoadError, PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type ProjectOverview } from "@/lib/api";

function Stat({ label, value, note }: { label: string; value: number | undefined; note?: string }) {
  return (
    <div className="rounded-xl bg-card px-4 py-3 shadow-xs ring-1 ring-foreground/10">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value ?? <Skeleton className="h-8 w-10" />}</dd>
      {note ? <dd className="mt-0.5 text-xs text-muted-foreground">{note}</dd> : null}
    </div>
  );
}

export function Overview({ projectId, name }: { projectId: string; name: string }) {
  const { data, error, isPending } = useQuery({
    queryKey: ["project", projectId, "overview"],
    queryFn: () => api<ProjectOverview>(`/projects/${projectId}/overview`),
    refetchInterval: 15_000,
  });
  const c = data?.connections;
  return (
    <>
      <PageHeader title={name} description="Your customers' Tally connections right now." />
      {error && !data ? <LoadError message={error.message} /> : (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={isPending}>
          <Stat label="Connected companies" value={c?.active} />
          <Stat label="Connector running" value={c?.online} note="The customer's PC is on and connected" />
          <Stat label="Tally open" value={c?.tallyOpen} note="Live reads and writes can run now" />
          <Stat label="API keys" value={data?.apiKeys} />
        </dl>
      )}
      {c?.total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No customers connected yet"
            description="Create a connect link and send it to your customer. Each company they connect will be counted here."
            action={<Button asChild><Link href={`/projects/${projectId}/connections`}>Connect a customer</Link></Button>}
          />
        </div>
      ) : null}
    </>
  );
}

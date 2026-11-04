"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type ProjectOverview } from "@/lib/api";

function Row({ label, value, note }: { label: string; value: number | undefined; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-rule py-3">
      <dt>
        {label}
        {note ? <span className="block text-[0.8125rem] text-quiet">{note}</span> : null}
      </dt>
      <dd className="font-serif text-2xl font-semibold text-bank tabular-nums">{value ?? "–"}</dd>
    </div>
  );
}

export function Overview({ projectId }: { projectId: string }) {
  const { data, error, isPending } = useQuery({
    queryKey: ["overview", projectId],
    queryFn: () => api<ProjectOverview>(`/projects/${projectId}/overview`),
    refetchInterval: 15_000,
  });
  if (error && !data) return <p role="alert" className="mt-8 font-medium text-margin">{error.message}</p>;
  const c = data?.connections;
  return (
    <>
      <dl className="mt-8 max-w-xl border-t-2 border-bank" aria-busy={isPending}>
        <Row label="Connected companies" value={c?.active} />
        <Row label="Connector running" value={c?.online} note="The customer's PC is on and connected" />
        <Row label="Tally open" value={c?.tallyOpen} note="Live reads and writes can run now" />
        <Row label="API keys" value={data?.apiKeys} />
      </dl>
      {c?.total === 0 ? (
        <section className="mt-10 max-w-xl">
          <h2 className="text-xl font-semibold">No customers connected yet</h2>
          <p className="mt-2 text-quiet">You'll create API keys and connect links here in the next release. Each customer you connect will show up on this page.</p>
        </section>
      ) : null}
    </>
  );
}

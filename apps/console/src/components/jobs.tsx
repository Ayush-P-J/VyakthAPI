"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState, ListSkeleton, LoadError, PageHeader, StatusBadge, type Tone } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { CodeBlock, Disclosure, Row, Rows } from "@/components/ui/row";
import { api, type ConnectionList, type WriteJob, type WriteJobDetail, type WriteJobList } from "@/lib/api";
import { formatDate } from "@/lib/format";

const STATUS: Record<WriteJob["status"], string> = {
  queued: "Waiting for the connector",
  sent: "Sent to the connector",
  completed: "Posted to Tally",
  failed: "Failed",
  rejected: "Rejected",
};

const TONE: Record<WriteJob["status"], Tone> = { queued: "neutral", sent: "neutral", completed: "success", failed: "danger", rejected: "danger" };

function outcome(j: WriteJob): string {
  if (j.status !== "completed") return "";
  if (j.deduplicated) return "Already in Tally, so nothing new was posted.";
  return j.tallyId ? `Tally ID ${j.tallyId}.` : "";
}

function Sent({ projectId, jobId }: { projectId: string; jobId: string }) {
  const { data, error } = useQuery({ queryKey: ["project", projectId, "job", jobId], queryFn: () => api<WriteJobDetail>(`/projects/${projectId}/jobs/${jobId}`) });
  if (error) return <LoadError message={error.message} />;
  return <CodeBlock>{data ? JSON.stringify(data.requestBody, null, 2) : "Loading"}</CodeBlock>;
}

function JobRow({ job: j, projectId }: { job: WriteJob; projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Row
      title={<>{j.action === "alter" ? "Change" : "Create"} <code className="font-mono text-sm break-all">{j.dataset}</code> in {j.company ?? "Unnamed company"}</>}
      status={<StatusBadge tone={TONE[j.status]}>{STATUS[j.status]}</StatusBadge>}
      detail={
        <>
          {outcome(j) ? <p>{outcome(j)}</p> : null}
          {j.errors.map((e, i) => <p key={i} className="text-foreground">{e.message}</p>)}
          <p>Sent {formatDate(j.createdAt)}{j.completedAt ? `. Finished ${formatDate(j.completedAt)}` : ""}</p>
          <p>Idempotency key: <code className="font-mono break-all">{j.idempotencyKey}</code></p>
          <Disclosure summary="What your app sent" onToggle={setOpen}>
            {open ? <Sent projectId={projectId} jobId={j.id} /> : null}
          </Disclosure>
        </>
      }
    />
  );
}

export function Jobs({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const connections = useQuery({ queryKey: ["project", projectId, "connections"], queryFn: () => api<ConnectionList>(`/projects/${projectId}/connections`) });
  const jobs = useInfiniteQuery({
    queryKey: ["project", projectId, "jobs", status, connectionId],
    initialPageParam: "",
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ ...(status ? { status } : {}), ...(connectionId ? { connectionId } : {}), ...(pageParam ? { cursor: pageParam } : {}) });
      return api<WriteJobList>(`/projects/${projectId}/jobs?${q}`);
    },
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 15_000,
  });
  const rows = jobs.data?.pages.flatMap((p) => p.data) ?? [];
  const filtered = Boolean(status || connectionId);
  return (
    <>
      <PageHeader title="Write jobs" description="Every entry your app has asked to post into a customer's Tally, newest first." />
      <div className="mb-4 flex flex-wrap gap-3">
        <LabeledSelect label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "All statuses" }, ...Object.entries(STATUS).map(([value, label]) => ({ value, label }))]} />
        <LabeledSelect label="Company" value={connectionId} onChange={setConnectionId} options={[{ value: "", label: "All companies" }, ...(connections.data?.data ?? []).map((c) => ({ value: c.id, label: c.company ?? "Unnamed company" }))]} />
      </div>
      {jobs.error && !jobs.data ? <LoadError message={jobs.error.message} /> : null}
      {jobs.isPending ? <ListSkeleton /> : null}
      {jobs.data && rows.length === 0 ? <EmptyState title={filtered ? "No jobs match these filters" : "No write jobs yet"} description={filtered ? "Choose a different status or company." : "They appear here when your app posts to a connected company."} /> : null}
      {rows.length ? <Rows label="Write jobs">{rows.map((j) => <JobRow key={j.id} job={j} projectId={projectId} />)}</Rows> : null}
      {jobs.hasNextPage ? <Button type="button" variant="outline" disabled={jobs.isFetchingNextPage} onClick={() => jobs.fetchNextPage()} className="mt-4">{jobs.isFetchingNextPage ? "Loading" : "Show older jobs"}</Button> : null}
    </>
  );
}

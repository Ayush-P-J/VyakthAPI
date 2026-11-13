"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { EmptyState, ListSkeleton, LoadError, PageHeader, SectionHeading, StatusBadge, type Tone } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field } from "@/components/ui/field";
import { FormCard } from "@/components/ui/form-card";
import { FormError, applyServerError } from "@/components/ui/form-error";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Row, Rows } from "@/components/ui/row";
import { SecretOnce } from "@/components/ui/secret-once";
import { api, type ConnectLink, type ConnectLinkList, type Connection, type ConnectionList, type CreatedConnectLink, type NewConnectLinkRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";

const LIFETIMES = [
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
  { hours: 720, label: "30 days" },
];

const Schema = z.object({
  label: z.string().trim().max(200, "Use at most 200 characters."),
  access: z.enum(["read", "write"]),
  expiresInHours: z.coerce.number<string>().int(),
  redirectUrl: z.union([z.literal(""), z.string().trim().max(2000, "Use at most 2000 characters.").regex(/^https?:\/\/\S+$/i, "Enter a full address starting with https://.")]),
});
type Input = z.input<typeof Schema>;
type Output = z.output<typeof Schema>;

/** Plain words for the customer's situation, so nothing depends on colour alone. */
function connectionState(c: Connection): { text: string; tone: Tone } {
  if (c.status === "revoked") return { text: "Revoked", tone: "neutral" };
  if (c.status !== "active") return { text: c.status === "paused" ? "Paused" : "Not finished connecting", tone: "warning" };
  if (c.tallyOpen) return { text: "Tally open", tone: "success" };
  if (c.connectorOnline) return { text: "Connector running, Tally closed", tone: "warning" };
  return { text: `Connector offline, last seen ${formatDate(c.lastSeenAt)}`, tone: "neutral" };
}

const LINK_TONE: Record<ConnectLink["status"], Tone> = { awaiting_connector: "warning", awaiting_approval: "warning", used: "success", expired: "neutral" };

const LINK_STATUS: Record<ConnectLink["status"], string> = {
  awaiting_connector: "Waiting for the customer to start the connector",
  awaiting_approval: "Waiting for the customer to approve",
  used: "Connected",
  expired: "Expired or cancelled",
};

function NewLinkForm({ projectId, onCreated, onCancel }: { projectId: string; onCreated: (link: CreatedConnectLink) => void; onCancel: () => void }) {
  const [formError, setFormError] = useState("");
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Input, unknown, Output>({
    resolver: zodResolver(Schema),
    defaultValues: { label: "", access: "read", expiresInHours: "72", redirectUrl: "" },
  });
  const submit = handleSubmit(async ({ label, access, expiresInHours, redirectUrl }) => {
    setFormError("");
    const body: NewConnectLinkRequest = {
      requestedScopes: access === "write" ? ["read", "write"] : ["read"], expiresInHours,
      ...(label ? { label } : {}), ...(redirectUrl ? { redirectUrl } : {}),
    };
    try {
      onCreated(await api<CreatedConnectLink>(`/projects/${projectId}/connect-links`, { method: "POST", body }));
    } catch (e) {
      applyServerError(e, setError, setFormError);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="grid gap-4" aria-label="Create a connect link">
      <Field label="Customer name" hint="Optional. Your customer sees this, and it helps you tell links apart." error={errors.label?.message} {...register("label")} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">What you're asking the customer to allow</legend>
        <Controller control={control} name="access" render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
            <div className="flex items-center gap-2"><RadioGroupItem id="link-read" value="read" /><Label htmlFor="link-read" className="cursor-pointer font-normal">Read their Tally data</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem id="link-write" value="write" /><Label htmlFor="link-write" className="cursor-pointer font-normal">Read their data and post entries into Tally</Label></div>
          </RadioGroup>
        )} />
      </fieldset>
      <Controller control={control} name="expiresInHours" render={({ field }) => (
        <LabeledSelect label="Link stops working after" value={String(field.value)} onChange={field.onChange} triggerClassName="w-full" options={LIFETIMES.map((l) => ({ value: String(l.hours), label: l.label }))} />
      )} />
      <Field label="Return address" type="url" hint="Optional. Where to send the customer after they connect." error={errors.redirectUrl?.message} {...register("redirectUrl")} />
      <FormError message={formError} />
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating link" : "Create link"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function ConnectionRow({ connection: c, projectId }: { connection: Connection; projectId: string }) {
  const client = useQueryClient();
  const revoke = useMutation({
    mutationFn: () => api<void>(`/projects/${projectId}/connections/${c.id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["project", projectId] }),
  });
  const state = connectionState(c);
  const name = c.company ?? "Unnamed company";
  return (
    <Row
      muted={c.status === "revoked"}
      title={name}
      status={<StatusBadge tone={state.tone}>{state.text}</StatusBadge>}
      detail={
        <>
          {c.status === "revoked" ? null : <p>Last sync: {formatDate(c.lastSyncAt)}</p>}
          <p>Connection ID: <code className="font-mono break-all">{c.id}</code></p>
          {revoke.error ? <p role="alert" className="font-medium text-destructive">{revoke.error.message}</p> : null}
        </>
      }
      action={c.status === "revoked" ? undefined : (
        <ConfirmAction label={`Revoke ${name}`} question="Your app loses access, and queued writes are cancelled." confirmLabel="Yes, revoke" pending={revoke.isPending} onConfirm={() => revoke.mutate()} />
      )}
    />
  );
}

function LinkRow({ link, projectId }: { link: ConnectLink; projectId: string }) {
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api<void>(`/projects/${projectId}/connect-links/${link.id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["project", projectId] }),
  });
  const name = link.label ?? "Unnamed link";
  const open = link.status === "awaiting_connector" || link.status === "awaiting_approval";
  return (
    <Row
      muted={!open}
      title={name}
      status={<StatusBadge tone={LINK_TONE[link.status]}>{LINK_STATUS[link.status]}{link.company ? `: ${link.company}` : ""}</StatusBadge>}
      detail={
        <>
          <p>Created {formatDate(link.createdAt)}{open ? ` · Stops working ${formatDate(link.expiresAt)}` : ""}</p>
          {cancel.error ? <p role="alert" className="font-medium text-destructive">{cancel.error.message}</p> : null}
        </>
      }
      action={open ? <ConfirmAction label={`Cancel ${name}`} question="This link will stop working." confirmLabel="Yes, cancel it" pending={cancel.isPending} onConfirm={() => cancel.mutate()} /> : undefined}
    />
  );
}

export function Connections({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const [created, setCreated] = useState<CreatedConnectLink | null>(null);
  const [adding, setAdding] = useState(false);
  const connections = useQuery({ queryKey: ["project", projectId, "connections"], queryFn: () => api<ConnectionList>(`/projects/${projectId}/connections`), refetchInterval: 15_000 });
  const links = useQuery({ queryKey: ["project", projectId, "links"], queryFn: () => api<ConnectLinkList>(`/projects/${projectId}/connect-links`), refetchInterval: 15_000 });
  return (
    <>
      <PageHeader
        title="Connections"
        description="The companies whose Tally your app can reach, and the links you've sent to connect more."
        actions={adding ? null : <Button type="button" onClick={() => setAdding(true)}><Plus aria-hidden /> Connect a customer</Button>}
      />
      {created ? (
        <SecretOnce title="Your connect link" note={`Send this to your customer. It works once, until ${formatDate(created.expiresAt)}, and we can't show it again.`} value={created.url} onDone={() => setCreated(null)} />
      ) : null}
      {adding ? (
        <FormCard title="Connect a customer">
          <NewLinkForm
            projectId={projectId}
            onCancel={() => setAdding(false)}
            onCreated={(link) => {
              setCreated(link);
              setAdding(false);
              void client.invalidateQueries({ queryKey: ["project", projectId] });
            }}
          />
        </FormCard>
      ) : null}
      <section>
        <SectionHeading>Connected companies</SectionHeading>
        {connections.error && !connections.data ? <LoadError message={connections.error.message} /> : null}
        {!connections.data && !connections.error ? <ListSkeleton /> : null}
        {connections.data?.data.length === 0 ? <EmptyState title="No companies yet" description="They appear here once a customer finishes connecting." /> : null}
        {connections.data?.data.length ? <Rows label="Connected companies">{connections.data.data.map((c) => <ConnectionRow key={c.id} connection={c} projectId={projectId} />)}</Rows> : null}
      </section>
      <section className="mt-8">
        <SectionHeading>Connect links</SectionHeading>
        {links.error && !links.data ? <LoadError message={links.error.message} /> : null}
        {!links.data && !links.error ? <ListSkeleton /> : null}
        {links.data?.data.length === 0 ? <EmptyState title="No links yet" /> : null}
        {links.data?.data.length ? <Rows label="Connect links">{links.data.data.map((l) => <LinkRow key={l.id} link={l} projectId={projectId} />)}</Rows> : null}
      </section>
    </>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field } from "@/components/ui/field";
import { FormError, applyServerError } from "@/components/ui/form-error";
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
function connectionState(c: Connection): { text: string; live: boolean } {
  if (c.status === "revoked") return { text: "Revoked", live: false };
  if (c.status !== "active") return { text: c.status === "paused" ? "Paused" : "Not finished connecting", live: false };
  if (c.tallyOpen) return { text: "Tally open", live: true };
  if (c.connectorOnline) return { text: "Connector running, Tally closed", live: false };
  return { text: `Connector offline, last seen ${formatDate(c.lastSeenAt)}`, live: false };
}

const LINK_STATUS: Record<ConnectLink["status"], string> = {
  awaiting_connector: "Waiting for the customer to start the connector",
  awaiting_approval: "Waiting for the customer to approve",
  used: "Connected",
  expired: "Expired or cancelled",
};

function NewLinkForm({ projectId, onCreated }: { projectId: string; onCreated: (link: CreatedConnectLink) => void }) {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Input, unknown, Output>({
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
    <form onSubmit={submit} noValidate className="mt-4 max-w-xl border-t border-rule" aria-label="Create a connect link">
      <Field label="Customer name" hint="Optional. Your customer sees this, and it helps you tell links apart." error={errors.label?.message} {...register("label")} />
      <fieldset className="border-b border-rule py-3">
        <legend className="text-sm font-medium">What you're asking the customer to allow</legend>
        <label className="mt-2 flex cursor-pointer items-center gap-2"><input type="radio" value="read" className="accent-bank" {...register("access")} /> Read their Tally data</label>
        <label className="mt-2 flex cursor-pointer items-center gap-2"><input type="radio" value="write" className="accent-bank" {...register("access")} /> Read their data and post entries into Tally</label>
      </fieldset>
      <div className="border-b border-rule py-3">
        <label htmlFor="link-lifetime" className="block text-sm font-medium">Link stops working after</label>
        <select id="link-lifetime" className="mt-1.5 w-full border border-rule bg-white px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-margin" {...register("expiresInHours")}>
          {LIFETIMES.map((l) => <option key={l.hours} value={l.hours}>{l.label}</option>)}
        </select>
      </div>
      <Field label="Return address" type="url" hint="Optional. Where to send the customer after they connect." error={errors.redirectUrl?.message} {...register("redirectUrl")} />
      <FormError message={formError} />
      <Button type="submit" disabled={isSubmitting} className="mt-6">{isSubmitting ? "Creating link" : "Create link"}</Button>
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
      detail={
        <>
          <p className={state.live ? "font-medium text-bank" : undefined}>{state.text}</p>
          {c.status === "revoked" ? null : <p>Last sync: {formatDate(c.lastSyncAt)}</p>}
          <p>Connection ID: <code className="font-mono break-all">{c.id}</code></p>
          {revoke.error ? <p role="alert" className="font-medium text-margin">{revoke.error.message}</p> : null}
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
      detail={
        <>
          <p>{LINK_STATUS[link.status]}{link.company ? `: ${link.company}` : ""}</p>
          <p>Created {formatDate(link.createdAt)}{open ? ` · Stops working ${formatDate(link.expiresAt)}` : ""}</p>
          {cancel.error ? <p role="alert" className="font-medium text-margin">{cancel.error.message}</p> : null}
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
      {created ? (
        <SecretOnce title="Your connect link" note={`Send this to your customer. It works once, until ${formatDate(created.expiresAt)}, and we can't show it again.`} value={created.url} onDone={() => setCreated(null)} />
      ) : null}
      <section className="mt-8">
        {adding ? (
          <>
            <h2 className="text-xl font-semibold">Connect a customer</h2>
            <NewLinkForm
              projectId={projectId}
              onCreated={(link) => {
                setCreated(link);
                setAdding(false);
                void client.invalidateQueries({ queryKey: ["project", projectId] });
              }}
            />
            <Button type="button" variant="secondary" onClick={() => setAdding(false)} className="mt-3">Cancel</Button>
          </>
        ) : (
          <Button type="button" onClick={() => setAdding(true)}>Connect a customer</Button>
        )}
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Connected companies</h2>
        {connections.error && !connections.data ? <p role="alert" className="mt-4 font-medium text-margin">{connections.error.message}</p> : null}
        {connections.data?.data.length === 0 ? <p className="mt-2 text-quiet">No companies yet. They appear here once a customer finishes connecting.</p> : null}
        {connections.data?.data.length ? <Rows label="Connected companies">{connections.data.data.map((c) => <ConnectionRow key={c.id} connection={c} projectId={projectId} />)}</Rows> : null}
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Connect links</h2>
        {links.error && !links.data ? <p role="alert" className="mt-4 font-medium text-margin">{links.error.message}</p> : null}
        {links.data?.data.length === 0 ? <p className="mt-2 text-quiet">No links yet.</p> : null}
        {links.data?.data.length ? <Rows label="Connect links">{links.data.data.map((l) => <LinkRow key={l.id} link={l} projectId={projectId} />)}</Rows> : null}
      </section>
    </>
  );
}

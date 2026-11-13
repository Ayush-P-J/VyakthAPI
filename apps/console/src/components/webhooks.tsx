"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { EmptyState, ListSkeleton, LoadError, PageHeader, SectionHeading, StatusBadge, type Tone } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field } from "@/components/ui/field";
import { FormCard } from "@/components/ui/form-card";
import { FormError, applyServerError } from "@/components/ui/form-error";
import { Label } from "@/components/ui/label";
import { CodeBlock, Disclosure, Row, Rows } from "@/components/ui/row";
import { SecretOnce } from "@/components/ui/secret-once";
import { api, type CreatedWebhook, type NewWebhookRequest, type Webhook, type WebhookDelivery, type WebhookDeliveryList, type WebhookList } from "@/lib/api";
import { formatDate } from "@/lib/format";

type Event = NewWebhookRequest["events"][number];
const EVENTS: { value: Event; label: string }[] = [
  { value: "write_job.completed", label: "A write job posted to Tally" },
  { value: "write_job.failed", label: "A write job failed" },
  { value: "connection.status_changed", label: "A company connected or was revoked" },
  { value: "record.created", label: "A record was created in Tally" },
  { value: "record.updated", label: "A record was changed in Tally" },
  { value: "record.deleted", label: "A record was deleted in Tally" },
  { value: "schema.published", label: "A new schema version was published" },
];

const Schema = z.object({
  url: z.string().trim().max(2000, "Use at most 2000 characters.").regex(/^https?:\/\/\S+$/i, "Enter a full address starting with https://."),
  events: z.array(z.string()).min(1, "Choose at least one event."),
});
type Values = { url: string; events: Event[] };

const DELIVERY_TONE: Record<WebhookDelivery["status"], Tone> = { pending: "neutral", retrying: "warning", delivered: "success", failed: "danger" };
const DELIVERY: Record<WebhookDelivery["status"], string> = { pending: "Waiting to send", retrying: "Failed, will retry", delivered: "Delivered", failed: "Failed, gave up" };

function NewWebhookForm({ projectId, onCreated, onCancel }: { projectId: string; onCreated: (w: CreatedWebhook) => void; onCancel: () => void }) {
  const [formError, setFormError] = useState("");
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(Schema) as never, defaultValues: { url: "", events: [] } });
  const submit = handleSubmit(async (body) => {
    setFormError("");
    try {
      onCreated(await api<CreatedWebhook>(`/projects/${projectId}/webhooks`, { method: "POST", body }));
    } catch (e) {
      applyServerError(e, setError, setFormError);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="grid gap-4" aria-label="Create a webhook">
      <Field label="Address on your server" type="url" hint="We'll post each event here. It must use HTTPS." error={errors.url?.message} {...register("url")} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Events to send</legend>
        <Controller control={control} name="events" render={({ field }) => (
          <div className="grid gap-2">
            {EVENTS.map((e) => (
              <div key={e.value} className="flex items-center gap-2">
                <Checkbox
                  id={`event-${e.value}`}
                  checked={field.value.includes(e.value)}
                  onCheckedChange={(on) => field.onChange(on ? [...field.value, e.value] : field.value.filter((v) => v !== e.value))}
                />
                <Label htmlFor={`event-${e.value}`} className="cursor-pointer font-normal">{e.label}</Label>
              </div>
            ))}
          </div>
        )} />
        {errors.events?.message ? <p role="alert" className="mt-2 text-[0.8125rem] font-medium text-destructive">{errors.events.message}</p> : null}
      </fieldset>
      <FormError message={formError} />
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating webhook" : "Create webhook"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function DeliveryRow({ d, projectId, webhookId, paused }: { d: WebhookDelivery; projectId: string; webhookId: string; paused: boolean }) {
  const client = useQueryClient();
  const resend = useMutation({
    mutationFn: () => api<void>(`/projects/${projectId}/webhooks/${webhookId}/deliveries/${d.id}/resend`, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["project", projectId] }),
  });
  return (
    <Row
      title={<code className="font-mono text-sm">{d.event}</code>}
      status={<StatusBadge tone={DELIVERY_TONE[d.status]}>{DELIVERY[d.status]}</StatusBadge>}
      detail={
        <>
          {d.lastError ? <p className="text-foreground">{d.lastError}</p> : null}
          <p>{formatDate(d.createdAt)}{d.attempts > 1 ? `, ${d.attempts} attempts` : ""}{d.status === "retrying" ? `. Next try ${formatDate(d.nextRetryAt)}` : ""}</p>
          <Disclosure summary="What we sent"><CodeBlock>{JSON.stringify(d.payload, null, 2)}</CodeBlock></Disclosure>
          {resend.error ? <p role="alert" className="font-medium text-destructive">{resend.error.message}</p> : null}
        </>
      }
      action={paused ? undefined : <Button type="button" variant="outline" size="sm" disabled={resend.isPending} onClick={() => resend.mutate()}>{resend.isPending ? "Sending" : "Resend"}</Button>}
    />
  );
}

function Deliveries({ projectId, webhook }: { projectId: string; webhook: Webhook }) {
  const { data, error } = useQuery({ queryKey: ["project", projectId, "deliveries", webhook.id], queryFn: () => api<WebhookDeliveryList>(`/projects/${projectId}/webhooks/${webhook.id}/deliveries`), refetchInterval: 15_000 });
  if (error && !data) return <LoadError message={error.message} />;
  if (!data) return <ListSkeleton />;
  if (data.data.length === 0) return <p>Nothing sent yet. Events appear here as they happen.</p>;
  return <Rows label={`Latest deliveries to ${webhook.url}`}>{data.data.map((d) => <DeliveryRow key={d.id} d={d} projectId={projectId} webhookId={webhook.id} paused={!webhook.isActive} />)}</Rows>;
}

function WebhookRow({ webhook: w, projectId }: { webhook: Webhook; projectId: string }) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ["project", projectId] });
  const toggle = useMutation({ mutationFn: () => api<void>(`/projects/${projectId}/webhooks/${w.id}`, { method: "PATCH", body: { isActive: !w.isActive } }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: () => api<void>(`/projects/${projectId}/webhooks/${w.id}`, { method: "DELETE" }), onSuccess: refresh });
  const [open, setOpen] = useState(false);
  const error = toggle.error ?? remove.error;
  return (
    <Row
      muted={!w.isActive}
      title={<span className="break-all">{w.url}</span>}
      status={<StatusBadge tone={w.isActive ? "success" : "neutral"}>{w.isActive ? "Active" : "Paused"}</StatusBadge>}
      detail={
        <>
          {w.isActive ? null : <p>Paused. New events aren't recorded, and waiting ones go out when you resume.</p>}
          <p>{w.events.length} {w.events.length === 1 ? "event" : "events"}: {w.events.join(", ")}</p>
          {w.pending ? <p>{w.pending} waiting or retrying</p> : null}
          {w.failed ? <p className="font-medium text-destructive">{w.failed} failed after every retry</p> : null}
          {error ? <p role="alert" className="font-medium text-destructive">{error.message}</p> : null}
          <Disclosure summary="Latest deliveries" onToggle={setOpen}>
            {open ? <Deliveries projectId={projectId} webhook={w} /> : null}
          </Disclosure>
        </>
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" aria-label={`${w.isActive ? "Pause" : "Resume"} ${w.url}`} disabled={toggle.isPending} onClick={() => toggle.mutate()}>{w.isActive ? "Pause" : "Resume"}</Button>
          <ConfirmAction label={`Delete ${w.url}`} question="This also deletes its delivery history." confirmLabel="Yes, delete" pending={remove.isPending} onConfirm={() => remove.mutate()} />
        </div>
      }
    />
  );
}

export function Webhooks({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const [created, setCreated] = useState<CreatedWebhook | null>(null);
  const [adding, setAdding] = useState(false);
  const { data, error } = useQuery({ queryKey: ["project", projectId, "webhooks"], queryFn: () => api<WebhookList>(`/projects/${projectId}/webhooks`), refetchInterval: 15_000 });
  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Tell your server the moment something changes. A failed delivery is retried up to 8 times, waiting longer each time."
        actions={adding ? null : <Button type="button" onClick={() => setAdding(true)}><Plus aria-hidden /> Add webhook</Button>}
      />
      {created ? (
        <SecretOnce title="Your webhook signing secret" note="Use this to check that each event really came from us. Copy it now, because we can't show it again." value={created.secret} onDone={() => setCreated(null)} />
      ) : null}
      {adding ? (
        <FormCard title="Create a webhook">
          <NewWebhookForm
            projectId={projectId}
            onCancel={() => setAdding(false)}
            onCreated={(w) => {
              setCreated(w);
              setAdding(false);
              void client.invalidateQueries({ queryKey: ["project", projectId] });
            }}
          />
        </FormCard>
      ) : null}
      <section>
        <SectionHeading>Webhooks in this project</SectionHeading>
        {error && !data ? <LoadError message={error.message} /> : null}
        {!data && !error ? <ListSkeleton /> : null}
        {data?.data.length === 0 ? <EmptyState title="No webhooks yet" description="Add one to get events on your server." /> : null}
        {data?.data.length ? <Rows label="Webhooks">{data.data.map((w) => <WebhookRow key={w.id} webhook={w} projectId={projectId} />)}</Rows> : null}
      </section>
    </>
  );
}

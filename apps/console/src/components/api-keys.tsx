"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Plus } from "lucide-react";
import { EmptyState, ListSkeleton, LoadError, PageHeader, SectionHeading, StatusBadge } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field } from "@/components/ui/field";
import { FormCard } from "@/components/ui/form-card";
import { FormError, applyServerError } from "@/components/ui/form-error";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Row, Rows } from "@/components/ui/row";
import { SecretOnce } from "@/components/ui/secret-once";
import { api, type ApiKey, type ApiKeyList, type CreatedApiKey, type NewApiKeyRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";

const ACCESS = {
  read: { label: "Read only", detail: "Read data from connected companies.", scopes: ["read"] },
  write: { label: "Read and write", detail: "Also post vouchers and masters into Tally.", scopes: ["read", "write"] },
  admin: { label: "Full access", detail: "Also create connect links and webhooks, revoke connections and map fields.", scopes: ["read", "write", "admin"] },
} as const satisfies Record<string, { label: string; detail: string; scopes: NewApiKeyRequest["scopes"] }>;
type Access = keyof typeof ACCESS;

const Schema = z.object({
  name: z.string().trim().min(1, "Enter a name for this key.").max(120, "Use at most 120 characters."),
  access: z.enum(["read", "write", "admin"]),
});
type Values = z.infer<typeof Schema>;

function accessLabel(scopes: string[]) {
  if (scopes.includes("admin") && scopes.includes("read") && scopes.includes("write")) return ACCESS.admin.label;
  if (scopes.length === 2 && scopes.includes("read") && scopes.includes("write")) return ACCESS.write.label;
  if (scopes.length === 1 && scopes[0] === "read") return ACCESS.read.label;
  return `Scopes: ${scopes.join(", ")}`;
}

function NewKeyForm({ projectId, onCreated, onCancel }: { projectId: string; onCreated: (key: CreatedApiKey) => void; onCancel: () => void }) {
  const [formError, setFormError] = useState("");
  const { register, control, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(Schema), defaultValues: { access: "read" } });
  const submit = handleSubmit(async ({ name, access }) => {
    setFormError("");
    try {
      const body: NewApiKeyRequest = { name, scopes: [...ACCESS[access].scopes] };
      onCreated(await api<CreatedApiKey>(`/projects/${projectId}/api-keys`, { method: "POST", body }));
      reset();
    } catch (e) {
      applyServerError(e, setError, setFormError);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="grid gap-4" aria-label="Create an API key">
      <Field label="Key name" hint="Something you'll recognise later, like the app or server that uses it." error={errors.name?.message} {...register("name")} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">What this key can do</legend>
        <Controller control={control} name="access" render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
            {(Object.keys(ACCESS) as Access[]).map((a) => (
              <div key={a} className="flex items-start gap-2">
                <RadioGroupItem id={`access-${a}`} value={a} className="mt-0.5" />
                <Label htmlFor={`access-${a}`} className="block cursor-pointer font-normal leading-snug">{ACCESS[a].label}<span className="block text-[0.8125rem] text-muted-foreground">{ACCESS[a].detail}</span></Label>
              </div>
            ))}
          </RadioGroup>
        )} />
      </fieldset>
      <FormError message={formError} />
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating key" : "Create key"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function KeyRow({ apiKey, projectId }: { apiKey: ApiKey; projectId: string }) {
  const client = useQueryClient();
  const revoke = useMutation({
    mutationFn: () => api<void>(`/projects/${projectId}/api-keys/${apiKey.id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["project", projectId] }),
  });
  const revoked = Boolean(apiKey.revokedAt);
  return (
    <Row
      muted={revoked}
      title={apiKey.name}
      status={revoked ? <StatusBadge tone="neutral">Revoked</StatusBadge> : null}
      detail={
        <>
          <p><code className="font-mono">{apiKey.keyPrefix}…</code> · {accessLabel(apiKey.scopes)}</p>
          <p>{revoked ? `On ${formatDate(apiKey.revokedAt)}` : `Created ${formatDate(apiKey.createdAt)} · Last used: ${formatDate(apiKey.lastUsedAt)}`}</p>
          {revoke.error ? <p role="alert" className="font-medium text-destructive">{revoke.error.message}</p> : null}
        </>
      }
      action={revoked ? undefined : (
        <ConfirmAction label={`Revoke ${apiKey.name}`} question="Apps using this key stop working at once." confirmLabel="Yes, revoke" pending={revoke.isPending} onConfirm={() => revoke.mutate()} />
      )}
    />
  );
}

export function ApiKeys({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [adding, setAdding] = useState(false);
  const { data, error } = useQuery({ queryKey: ["project", projectId, "keys"], queryFn: () => api<ApiKeyList>(`/projects/${projectId}/api-keys`) });
  return (
    <>
      <PageHeader
        title="API keys"
        description="Your app uses a key to call the API."
        actions={adding ? null : <Button type="button" onClick={() => setAdding(true)}><Plus aria-hidden /> Create API key</Button>}
      />
      {created ? (
        <SecretOnce title={`Your new key: ${created.name}`} note="Copy it now and keep it somewhere safe. We only store a scrambled copy, so we can't show it again." value={created.key} onDone={() => setCreated(null)} />
      ) : null}
      {adding ? (
        <FormCard title="Create an API key">
          <NewKeyForm
            projectId={projectId}
            onCancel={() => setAdding(false)}
            onCreated={(key) => {
              setCreated(key);
              setAdding(false);
              void client.invalidateQueries({ queryKey: ["project", projectId] });
            }}
          />
        </FormCard>
      ) : null}
      <section>
        <SectionHeading>Keys in this project</SectionHeading>
        {error && !data ? <LoadError message={error.message} /> : null}
        {!data && !error ? <ListSkeleton /> : null}
        {data?.data.length === 0 ? <EmptyState title="No keys yet" description="Your app needs one to call the API." /> : null}
        {data?.data.length ? <Rows label="API keys">{data.data.map((k) => <KeyRow key={k.id} apiKey={k} projectId={projectId} />)}</Rows> : null}
      </section>
    </>
  );
}

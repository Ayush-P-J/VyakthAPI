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

function NewKeyForm({ projectId, onCreated }: { projectId: string; onCreated: (key: CreatedApiKey) => void }) {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(Schema), defaultValues: { access: "read" } });
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
    <form onSubmit={submit} noValidate className="mt-4 max-w-xl border-t border-rule" aria-label="Create an API key">
      <Field label="Key name" hint="Something you'll recognise later, like the app or server that uses it." error={errors.name?.message} {...register("name")} />
      <fieldset className="border-b border-rule py-3">
        <legend className="text-sm font-medium">What this key can do</legend>
        {(Object.keys(ACCESS) as Access[]).map((a) => (
          <label key={a} className="mt-2 flex cursor-pointer items-start gap-2">
            <input type="radio" value={a} className="mt-1 accent-bank" {...register("access")} />
            <span>{ACCESS[a].label}<span className="block text-[0.8125rem] text-quiet">{ACCESS[a].detail}</span></span>
          </label>
        ))}
      </fieldset>
      <FormError message={formError} />
      <Button type="submit" disabled={isSubmitting} className="mt-6">{isSubmitting ? "Creating key" : "Create key"}</Button>
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
      detail={
        <>
          <p><code className="font-mono">{apiKey.keyPrefix}…</code> · {accessLabel(apiKey.scopes)}</p>
          <p>{revoked ? `Revoked ${formatDate(apiKey.revokedAt)}` : `Created ${formatDate(apiKey.createdAt)} · Last used: ${formatDate(apiKey.lastUsedAt)}`}</p>
          {revoke.error ? <p role="alert" className="font-medium text-margin">{revoke.error.message}</p> : null}
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
      {created ? (
        <SecretOnce title={`Your new key: ${created.name}`} note="Copy it now and keep it somewhere safe. We only store a scrambled copy, so we can't show it again." value={created.key} onDone={() => setCreated(null)} />
      ) : null}
      <section className="mt-8">
        {adding ? (
          <>
            <h2 className="text-xl font-semibold">Create an API key</h2>
            <NewKeyForm
              projectId={projectId}
              onCreated={(key) => {
                setCreated(key);
                setAdding(false);
                void client.invalidateQueries({ queryKey: ["project", projectId] });
              }}
            />
            <Button type="button" variant="secondary" onClick={() => setAdding(false)} className="mt-3">Cancel</Button>
          </>
        ) : (
          <Button type="button" onClick={() => setAdding(true)}>Create API key</Button>
        )}
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Keys in this project</h2>
        {error && !data ? <p role="alert" className="mt-4 font-medium text-margin">{error.message}</p> : null}
        {data?.data.length === 0 ? <p className="mt-2 text-quiet">No keys yet. Your app needs one to call the API.</p> : null}
        {data?.data.length ? <Rows label="API keys">{data.data.map((k) => <KeyRow key={k.id} apiKey={k} projectId={projectId} />)}</Rows> : null}
      </section>
    </>
  );
}

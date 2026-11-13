"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type Privacy = "public" | "masked" | "excluded";
type Field = { dataset: string; name: string; suggested: Privacy };
type LinkState = {
  status: "awaiting_connector" | "awaiting_approval" | "connected" | "expired";
  project: string | null;
  label: string | null;
  requestedScopes: string[];
  companies: { name: string; guid: string }[];
  requestedFields: Field[];
  standardFields: Field[];
  redirect: string | null;
};

const NAMES: Record<string, string> = { incomeTaxNumber: "PAN", gstin: "GSTIN", ledgerMobile: "Mobile number", ledgerPhone: "Phone number", email: "Email address" };
function words(s: string) {
  const w = s.replace(/_+$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().replace(/\b(gstin|gst|pan|hsn)\b/g, (m) => m.toUpperCase());
  return w.charAt(0).toUpperCase() + w.slice(1);
}
const fieldLabel = (n: string) => NAMES[n] ?? words(n);
const keyOf = (f: Field) => `${f.dataset}.${f.name}`;

class BadLink extends Error {}

async function readState(token: string): Promise<LinkState> {
  const r = await fetch(`/connect/${encodeURIComponent(token)}/state`, { cache: "no-store" });
  if (r.status === 404) throw new BadLink();
  if (!r.ok) throw new Error(`The server answered ${r.status}`);
  return (await r.json()) as LinkState;
}

function Panel({ title, lede, children }: { title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <>
      <p className="mb-6 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">HT</span>
        Hexspare Tally API
      </p>
      <h1 className="text-2xl font-semibold tracking-tight break-words">{title}</h1>
      {lede ? <p className="mt-1 text-sm text-muted-foreground">{lede}</p> : null}
      {children}
    </>
  );
}

function Step({ n, title, active, children }: { n: number; title: string; active: boolean; children?: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl bg-card p-4 ring-1 ring-foreground/10", !active && "opacity-60")}>
      <h2 className="flex items-center gap-2.5 text-base font-semibold">
        <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{n}</span>
        {title}
      </h2>
      {children ? <div className="mt-3 text-sm">{children}</div> : null}
    </section>
  );
}

const OPTIONS: { value: Privacy; label: string; off?: boolean }[] = [
  { value: "public", label: "Share" },
  { value: "masked", label: "Hide most" },
  { value: "excluded", label: "Keep private", off: true },
];

function Choice({ title, value, onChange }: { title: string; value: Privacy; onChange: (v: Privacy) => void }) {
  return (
    <fieldset className="flex shrink-0 rounded-lg ring-1 ring-input">
      <legend className="sr-only">{title}</legend>
      {OPTIONS.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="radio" name={title} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
          <span className={cn(
            "block px-2.5 py-1 text-[0.8125rem] transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
            value === o.value ? (o.off ? "bg-destructive text-white" : "bg-primary text-primary-foreground") : "hover:bg-muted",
            o.value === "public" && "rounded-l-lg", o.value === "excluded" && "rounded-r-lg",
          )}>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

function FieldRow({ name, note, title, value, onChange }: { name: string; note?: string; title: string; value: Privacy; onChange: (v: Privacy) => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
      <div className="min-w-44 flex-1">
        <span>{name}</span>
        {note ? <small className="block text-[0.8125rem] text-muted-foreground">{note}</small> : null}
      </div>
      <Choice title={title} value={value} onChange={onChange} />
    </li>
  );
}

function Approve({ token, state, name, onDone }: { token: string; state: LinkState; name: string; onDone: () => void }) {
  const groups = useMemo(() => {
    const out = new Map<string, Field[]>();
    for (const f of state.standardFields) out.set(f.name, [...(out.get(f.name) ?? []), f]);
    return out;
  }, [state.standardFields]);
  const [rules, setRules] = useState<Record<string, Privacy>>(() => Object.fromEntries([...state.requestedFields, ...state.standardFields].map((f) => [keyOf(f), f.suggested])));
  const [customDefault, setCustomDefault] = useState<Privacy>("masked");
  const [company, setCompany] = useState(state.companies[0]?.guid ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!company) return setError("Pick a company first.");
    setPending(true);
    setError("");
    try {
      const r = await fetch(`/connect/${encodeURIComponent(token)}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyGuid: company, rules, customDefault }) });
      const b = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!r.ok) throw new Error(b?.error?.message ?? "This could not be saved. Try again.");
      onDone();
    } catch (e) {
      setPending(false);
      setError(e instanceof TypeError ? "Check your internet connection and try again." : (e as Error).message);
    }
  };

  return (
    <div className="mt-6 grid gap-3">
      <Step n={1} title="Start the connector on your Tally PC" active={false}><p>Done. Your connector is ready.</p></Step>
      <Step n={2} title="Pick a company" active>
        {state.companies.length ? (
          <RadioGroup value={company} onValueChange={setCompany} className="gap-2">
            {state.companies.map((c) => (
              <div key={c.guid} className="flex items-center gap-2">
                <RadioGroupItem id={`company-${c.guid}`} value={c.guid} />
                <Label htmlFor={`company-${c.guid}`} className="cursor-pointer font-normal break-words">{c.name}</Label>
              </div>
            ))}
          </RadioGroup>
        ) : <p>No company is open in Tally. Open one, then restart the connector.</p>}
      </Step>
      <Step n={3} title="Choose what to share" active>
        <p className="text-muted-foreground">Your ledgers, vouchers and stock are shared so the app can work. You decide about the sensitive details below.</p>
        <ul className="mt-2 divide-y border-y">
          {state.requestedFields.map((f) => (
            <FieldRow key={keyOf(f)} name={fieldLabel(f.name)} note={`Custom field on ${words(f.dataset).toLowerCase()}`} title={fieldLabel(f.name)} value={rules[keyOf(f)] ?? f.suggested} onChange={(v) => setRules((r) => ({ ...r, [keyOf(f)]: v }))} />
          ))}
          {[...groups].map(([n, fields]) => (
            <FieldRow key={n} name={fieldLabel(n)} title={fieldLabel(n)} value={rules[keyOf(fields[0]!)] ?? fields[0]!.suggested} onChange={(v) => setRules((r) => ({ ...r, ...Object.fromEntries(fields.map((f) => [keyOf(f), v])) }))} />
          ))}
          <FieldRow name="Custom fields added later" note={`If ${name} asks for more of your custom fields`} title="Custom fields added later" value={customDefault} onChange={setCustomDefault} />
        </ul>
        <p className="mt-3 text-[0.8125rem] text-muted-foreground"><b className="font-medium text-foreground">Hide most</b> shows only the last 4 characters. <b className="font-medium text-foreground">Keep private</b> means it never leaves your PC.</p>
        {error ? <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 font-medium text-destructive">{error}</p> : null}
        <Button type="button" size="lg" disabled={pending} onClick={submit} className="mt-4">{pending ? "Connecting" : "Connect and share"}</Button>
        <p className="mt-3 text-[0.8125rem] text-muted-foreground">You can stop sharing at any time from the connector on your PC.</p>
      </Step>
    </div>
  );
}

export function ConnectFlow({ token }: { token: string }) {
  const { data, error, refetch } = useQuery({
    queryKey: ["connect", token],
    queryFn: () => readState(token),
    retry: false,
    gcTime: 0,
    // Keeps checking only while waiting for the connector. A form being filled in must not be replaced.
    refetchInterval: (q) => (q.state.error instanceof BadLink || (q.state.data && q.state.data.status !== "awaiting_connector") ? false : 2000),
  });
  const redirect = data?.status === "connected" ? data.redirect : null;
  useEffect(() => {
    if (!redirect) return;
    const t = setTimeout(() => { window.location.href = redirect; }, 2500);
    return () => clearTimeout(t);
  }, [redirect]);

  if (error instanceof BadLink) return <Panel title="This link is not valid" lede="Check that you opened the whole link, or ask for a new one." />;
  if (!data) {
    return (
      <Panel title="Connect your Tally" lede="Loading this link.">
        {error ? <p role="alert" className="mt-4 text-sm font-medium text-destructive">Can't reach the server. Trying again.</p> : null}
      </Panel>
    );
  }
  const name = data.project ?? "This app";
  if (data.status === "expired") return <Panel title="This link has expired" lede={`Ask ${name} to send you a new one. Nothing was connected.`} />;
  if (data.status === "connected") {
    return (
      <Panel title="Your Tally is connected" lede={`${name} can now use the data you approved.`}>
        <p className="mt-3 text-sm text-muted-foreground">You can stop sharing at any time from the connector on your PC.</p>
        {data.redirect ? <Button asChild className="mt-4"><a href={data.redirect}>Return to {name}</a></Button> : null}
      </Panel>
    );
  }
  const lede = data.requestedScopes.includes("write") ? "It asks to read your data and to post entries into your books." : "It asks to read your data. It will not change anything in your books.";
  return (
    <Panel title={`${name} wants to connect to your Tally`} lede={lede}>
      {data.status === "awaiting_connector" ? (
        <div className="mt-6 grid gap-3">
          <Step n={1} title="Start the connector on your Tally PC" active>
            <p>Open Tally with your company loaded, then give the connector this link code.</p>
            <code className="mt-2 block rounded-lg bg-muted p-3 font-mono text-sm select-all">{token}</code>
            <p role="status" className="mt-3 flex items-center gap-2 text-muted-foreground">
              <span aria-hidden className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
              Waiting for the connector. This page updates by itself.
            </p>
          </Step>
          <Step n={2} title="Pick a company" active={false} />
          <Step n={3} title="Choose what to share" active={false} />
        </div>
      ) : <Approve token={token} state={data} name={name} onDone={() => void refetch()} />}
    </Panel>
  );
}

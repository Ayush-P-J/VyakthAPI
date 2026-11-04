"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** A secret the server will never show again. It lives only in this component's state. */
export function SecretOnce({ title, note, value, onDone }: { title: string; note: string; value: string; onDone: () => void }) {
  const [copied, setCopied] = useState<"" | "yes" | "no">("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  };
  return (
    <section aria-label={title} className="mt-8 max-w-2xl border-2 border-bank bg-white p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-quiet">{note}</p>
      <code className="mt-4 block select-all break-all border border-rule bg-paper p-3 font-mono text-sm">{value}</code>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={copy}>Copy</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Done</Button>
        <span role="status" className="text-sm text-quiet">
          {copied === "yes" ? "Copied." : copied === "no" ? "Your browser blocked copying, so select the text and copy it yourself." : ""}
        </span>
      </div>
    </section>
  );
}

"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card aria-label={title} role="region" className="mb-8 max-w-2xl ring-2 ring-primary/40">
      <CardHeader>
        <CardTitle><h2>{title}</h2></CardTitle>
        <CardDescription>{note}</CardDescription>
      </CardHeader>
      <CardContent>
        <code className="block rounded-lg bg-muted p-3 font-mono text-sm select-all">{value}</code>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={copy}><Copy aria-hidden /> Copy</Button>
          <Button type="button" variant="outline" onClick={onDone}>Done</Button>
          <span role="status" className="text-sm text-muted-foreground">
            {copied === "yes" ? "Copied." : copied === "no" ? "Your browser blocked copying, so select the text and copy it yourself." : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

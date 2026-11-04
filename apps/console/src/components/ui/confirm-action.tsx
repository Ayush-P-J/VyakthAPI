"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** A destructive action asks in place, so nothing is revoked by one stray click. */
export function ConfirmAction({ label, question, confirmLabel, pending, onConfirm }: { label: string; question: string; confirmLabel: string; pending: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <Button type="button" variant="danger" size="small" aria-label={label} onClick={() => setAsking(true)}>{label.split(" ")[0]}</Button>;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-3 text-sm">
      <span className="font-medium">{question}</span>
      <Button type="button" variant="danger" size="small" disabled={pending} onClick={onConfirm}>{pending ? "Working" : confirmLabel}</Button>
      <Button type="button" variant="secondary" size="small" onClick={() => setAsking(false)}>Keep it</Button>
    </div>
  );
}

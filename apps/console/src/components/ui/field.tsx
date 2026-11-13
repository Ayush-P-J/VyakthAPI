import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A labelled input. The error is tied to the input so screen readers announce it. */
export function Field({ label, error, hint, ...props }: React.ComponentProps<"input"> & { label: string; error?: string | undefined; hint?: string }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} />
      {hint && !error ? <p id={`${id}-hint`} className="text-[0.8125rem] text-muted-foreground">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="text-[0.8125rem] font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

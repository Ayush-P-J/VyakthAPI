import { useId } from "react";
import { cn } from "@/lib/utils";

/** A labelled input on a ruled line. The error is tied to the input so screen readers announce it. */
export function Field({ label, error, hint, className, ...props }: React.ComponentProps<"input"> & { label: string; error?: string | undefined; hint?: string }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="border-b border-rule py-3">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={cn("mt-1.5 w-full border border-rule bg-white px-3 py-2 outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-margin aria-invalid:border-margin", className)}
        {...props}
      />
      {hint && !error ? <p id={`${id}-hint`} className="mt-1 text-[0.8125rem] text-quiet">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-medium text-margin">{error}</p> : null}
    </div>
  );
}

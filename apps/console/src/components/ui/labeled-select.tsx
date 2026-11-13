import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Radix Select keeps "" for "nothing chosen", so an "all" option needs a stand-in value.
const EMPTY = "__empty";

/** A labelled dropdown. An option whose value is "" means "no filter". */
export function LabeledSelect({ label, value, onChange, options, className, triggerClassName }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string; triggerClassName?: string }) {
  const id = useId();
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || EMPTY} onValueChange={(v) => onChange(v === EMPTY ? "" : v)}>
        <SelectTrigger id={id} className={cn("max-w-full min-w-44", triggerClassName)}><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value || EMPTY} value={o.value || EMPTY}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

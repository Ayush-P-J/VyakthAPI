import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api";

/** Puts a server's answer on the field it concerns, or above the button when it concerns the whole form. */
export function applyServerError<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>, setForm: (m: string) => void) {
  const err = e instanceof ApiError ? e : new ApiError(0, "error", "Something went wrong. Try again.");
  if (err.code === "email_taken") return setError("email" as Path<T>, { message: err.message });
  if (err.code === "invalid_request" && Array.isArray(err.details) && err.details.length > 0) {
    for (const d of err.details as { path: string; message: string }[]) setError(d.path as Path<T>, { message: d.message });
    return;
  }
  setForm(err.message);
}

export function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="mt-4 font-medium text-margin">{message}</p> : null;
}

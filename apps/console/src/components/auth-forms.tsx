"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ApiError, api, type LoginRequest, type Profile, type SignupRequest } from "@/lib/api";

const LoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
}) satisfies z.ZodType<LoginRequest>;

const SignupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  company: z.string().trim().min(1, "Enter your company name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters.").max(200, "Use at most 200 characters."),
}) satisfies z.ZodType<SignupRequest>;

/** Puts a server's answer on the field it concerns, or above the button when it concerns the whole form. */
function applyServerError<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>, setForm: (m: string) => void) {
  const err = e instanceof ApiError ? e : new ApiError(0, "error", "Something went wrong. Try again.");
  if (err.code === "email_taken") return setError("email" as Path<T>, { message: err.message });
  if (err.code === "invalid_request" && Array.isArray(err.details) && err.details.length > 0) {
    for (const d of err.details as { path: string; message: string }[]) setError(d.path as Path<T>, { message: d.message });
    return;
  }
  setForm(err.message);
}

function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="mt-4 font-medium text-margin">{message}</p> : null;
}

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginRequest>({ resolver: zodResolver(LoginSchema) });
  const submit = handleSubmit(async (values) => {
    setFormError("");
    try {
      await api<Profile>("/auth/login", { method: "POST", body: values });
      router.replace("/");
      router.refresh();
    } catch (e) {
      applyServerError(e, setError, setFormError);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="mt-6 border-t border-rule">
      <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
      <FormError message={formError} />
      <Button type="submit" disabled={isSubmitting} className="mt-6">{isSubmitting ? "Signing in" : "Sign in"}</Button>
      <p className="mt-5 text-sm text-quiet">New here? <Link href="/signup" className="font-medium text-bank underline underline-offset-3">Create an account</Link></p>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SignupRequest>({ resolver: zodResolver(SignupSchema) });
  const submit = handleSubmit(async (values) => {
    setFormError("");
    try {
      await api<Profile>("/auth/signup", { method: "POST", body: values });
      router.replace("/");
      router.refresh();
    } catch (e) {
      applyServerError(e, setError, setFormError);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="mt-6 border-t border-rule">
      <Field label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <Field label="Company" autoComplete="organization" hint="Your first project takes this name." error={errors.company?.message} {...register("company")} />
      <Field label="Work email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Field label="Password" type="password" autoComplete="new-password" hint="At least 10 characters." error={errors.password?.message} {...register("password")} />
      <FormError message={formError} />
      <Button type="submit" disabled={isSubmitting} className="mt-6">{isSubmitting ? "Creating your account" : "Create account"}</Button>
      <p className="mt-5 text-sm text-quiet">Already have an account? <Link href="/login" className="font-medium text-bank underline underline-offset-3">Sign in</Link></p>
    </form>
  );
}

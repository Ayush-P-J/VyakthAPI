"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError, applyServerError } from "@/components/ui/form-error";
import { api, type LoginRequest, type Profile, type SignupRequest } from "@/lib/api";

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
    <form onSubmit={submit} noValidate className="grid gap-4">
      <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
      <FormError message={formError} />
      <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Signing in" : "Sign in"}</Button>
      <p className="text-center text-sm text-muted-foreground">New here? <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">Create an account</Link></p>
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
    <form onSubmit={submit} noValidate className="grid gap-4">
      <Field label="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <Field label="Company" autoComplete="organization" hint="Your first project takes this name." error={errors.company?.message} {...register("company")} />
      <Field label="Work email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Field label="Password" type="password" autoComplete="new-password" hint="At least 10 characters." error={errors.password?.message} {...register("password")} />
      <FormError message={formError} />
      <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Creating your account" : "Create account"}</Button>
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link></p>
    </form>
  );
}

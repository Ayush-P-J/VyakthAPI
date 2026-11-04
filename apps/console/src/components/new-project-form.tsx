"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError, applyServerError } from "@/components/ui/form-error";
import { api, type NewProjectRequest, type Project } from "@/lib/api";

const Schema = z.object({ name: z.string().trim().min(1, "Enter a project name.").max(120, "Use at most 120 characters.") }) satisfies z.ZodType<NewProjectRequest>;

export function NewProjectForm() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<NewProjectRequest>({ resolver: zodResolver(Schema) });
  const submit = handleSubmit(async (values) => {
    setFormError("");
    try {
      const project = await api<Project>("/projects", { method: "POST", body: values });
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (e) {
      applyServerError(e, setError, setFormError);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="mt-6 max-w-xl border-t border-rule">
      <Field label="Project name" hint="Usually the name of the app that will use Tally data. Each project has its own keys and connections." error={errors.name?.message} {...register("name")} />
      <FormError message={formError} />
      <Button type="submit" disabled={isSubmitting} className="mt-6">{isSubmitting ? "Creating project" : "Create project"}</Button>
    </form>
  );
}

import type { Metadata } from "next";
import { NewProjectForm } from "@/components/new-project-form";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <h1 className="text-4xl leading-tight font-bold">New project</h1>
      <NewProjectForm />
    </>
  );
}

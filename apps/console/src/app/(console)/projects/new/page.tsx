import type { Metadata } from "next";
import { NewProjectForm } from "@/components/new-project-form";
import { PageHeader } from "@/components/page-parts";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="New project" description="Usually the name of the app that will use Tally data. Each project has its own keys and connections." />
      <NewProjectForm />
    </>
  );
}

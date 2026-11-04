import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Overview } from "@/components/overview";
import { getProfile } from "@/lib/server-api";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const project = profile.projects[0];
  return (
    <>
      <h1 className="text-4xl leading-tight font-bold break-words">{project?.name ?? profile.tenant.name}</h1>
      {project ? <Overview projectId={project.id} /> : <p className="mt-4 text-quiet">This account has no project yet.</p>}
    </>
  );
}

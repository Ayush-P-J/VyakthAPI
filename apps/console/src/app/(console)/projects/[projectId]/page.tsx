import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Overview } from "@/components/overview";
import { getProfile } from "@/lib/server-api";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const project = profile.projects.find((p) => p.id === projectId);
  return <Overview key={projectId} projectId={projectId} name={project?.name ?? ""} />;
}

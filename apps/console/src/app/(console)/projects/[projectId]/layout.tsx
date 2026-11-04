import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/server-api";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.projects.some((p) => p.id === projectId)) notFound();
  return children;
}

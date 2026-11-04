import { redirect } from "next/navigation";
import { getProfile } from "@/lib/server-api";

export default async function ConsoleHome() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const project = profile.projects[0];
  redirect(project ? `/projects/${project.id}` : "/projects/new");
}

import type { Metadata } from "next";
import { Jobs } from "@/components/jobs";

export const metadata: Metadata = { title: "Write jobs" };

export default async function JobsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <Jobs key={projectId} projectId={projectId} />;
}

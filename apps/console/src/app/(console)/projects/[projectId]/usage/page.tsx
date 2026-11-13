import type { Metadata } from "next";
import { Usage } from "@/components/usage";

export const metadata: Metadata = { title: "Usage" };

export default async function UsagePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <Usage key={projectId} projectId={projectId} />;
}

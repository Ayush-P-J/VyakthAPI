import type { Metadata } from "next";
import { ApiKeys } from "@/components/api-keys";

export const metadata: Metadata = { title: "API keys" };

export default async function KeysPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ApiKeys key={projectId} projectId={projectId} />;
}

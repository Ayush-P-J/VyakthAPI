import type { Metadata } from "next";
import { Webhooks } from "@/components/webhooks";

export const metadata: Metadata = { title: "Webhooks" };

export default async function WebhooksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <Webhooks key={projectId} projectId={projectId} />;
}

import type { Metadata } from "next";
import { Connections } from "@/components/connections";

export const metadata: Metadata = { title: "Connections" };

export default async function ConnectionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <>
      <h1 className="text-4xl leading-tight font-bold">Connections</h1>
      <Connections key={projectId} projectId={projectId} />
    </>
  );
}

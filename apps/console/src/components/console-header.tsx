"use client";

import { useParams, usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Profile } from "@/lib/api";
import { NAV_ITEMS } from "./nav-items";

/** The bar above each page: the sidebar toggle, and where you are. */
export function ConsoleHeader({ projects }: { projects: Profile["projects"] }) {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId?: string }>();
  const project = projects.find((p) => p.id === projectId);
  const section = project ? NAV_ITEMS.find((i) => i.href === pathname.slice(`/projects/${project.id}`.length))?.label : undefined;
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-4">
      <SidebarTrigger aria-label="Toggle navigation" />
      <p className="min-w-0 truncate text-sm">
        {project ? <span className="text-muted-foreground">{project.name}</span> : <span className="text-muted-foreground">New project</span>}
        {section ? <><span aria-hidden className="mx-1.5 text-muted-foreground">/</span><span className="font-medium">{section}</span></> : null}
      </p>
    </header>
  );
}

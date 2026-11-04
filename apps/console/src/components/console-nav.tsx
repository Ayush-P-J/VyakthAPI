"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { Profile } from "@/lib/api";

const SECTIONS = [
  { href: "", label: "Overview" },
  { href: "/connections", label: "Connections" },
  { href: "/keys", label: "API keys" },
];

export function ConsoleNav({ projects }: { projects: Profile["projects"] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();
  const current = projects.find((p) => p.id === params.projectId);
  const section = current ? pathname.slice(`/projects/${current.id}`.length) : "";
  return (
    <>
      <div className="text-sm">
        <label htmlFor="project-switch" className="mb-1 block text-rail-quiet">Project</label>
        <select
          id="project-switch"
          value={current?.id ?? ""}
          onChange={(e) => router.push(`/projects/${e.target.value}${section}`)}
          className="w-full border border-rail-quiet bg-bank-deep px-2 py-1.5 text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-margin"
        >
          {current ? null : <option value="" disabled>Choose a project</option>}
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Link href="/projects/new" className="mt-2 inline-block text-rail-quiet underline-offset-4 hover:text-white hover:underline">New project</Link>
      </div>
      {current ? (
        <nav aria-label="Main">
          {SECTIONS.map(({ href, label }) => {
            const active = section === href;
            return (
              <Link
                key={label}
                href={`/projects/${current.id}${href}`}
                aria-current={active ? "page" : undefined}
                className={active ? "block border-l-3 border-margin bg-bank-deep px-3 py-2 font-medium" : "block border-l-3 border-transparent px-3 py-2 hover:bg-bank-deep"}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}

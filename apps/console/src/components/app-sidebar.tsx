"use client";

import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, ChevronsUpDown, FolderKanban, IndianRupee, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { api, type Profile } from "@/lib/api";
import { NAV_GROUPS, initials } from "./nav-items";

function ProjectSwitcher({ projects, currentId, section }: { projects: Profile["projects"]; currentId: string | undefined; section: string }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const current = projects.find((p) => p.id === currentId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton tooltip={current?.name ?? "Choose a project"} className="border bg-background data-[state=open]:bg-sidebar-accent" aria-label={`Project: ${current?.name ?? "none chosen"}. Switch project`}>
          <FolderKanban />
          <span className="truncate">{current?.name ?? "Choose a project"}</span>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side={isMobile ? "bottom" : "right"} className="min-w-56">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        {projects.map((p) => (
          <DropdownMenuItem key={p.id} asChild>
            <Link href={`/projects/${p.id}${section}`} onClick={() => setOpenMobile(false)}>
              <span className="truncate">{p.name}</span>
              {p.id === currentId ? <Check className="ml-auto" aria-label="Current project" /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/projects/new" onClick={() => setOpenMobile(false)}><Plus /> New project</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user, tenant }: { user: Profile["user"]; tenant: Profile["tenant"] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile } = useSidebar();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const name = user.name ?? user.email;
  const signOut = async () => {
    setPending(true);
    setFailed(false);
    try {
      await api("/auth/logout", { method: "POST" });
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    } catch {
      setFailed(true);
      setPending(false);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" tooltip={name} className="data-[state=open]:bg-sidebar-accent" aria-label={`Account: ${name}`}>
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{initials(name)}</span>
          <span className="grid min-w-0 leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{tenant.name}</span>
          </span>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={isMobile ? "top" : "right"} className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium text-foreground">{name}</span>
          <span className="block truncate">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Stays open while signing out, so a failure has somewhere to show. */}
        <DropdownMenuItem disabled={pending} onSelect={(e) => { e.preventDefault(); void signOut(); }}><LogOut /> {pending ? "Signing out" : "Sign out"}</DropdownMenuItem>
        {failed ? <p role="alert" className="px-2 py-1.5 text-sm text-destructive">You're still signed in. Try again.</p> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();
  const { setOpenMobile } = useSidebar();
  const current = profile.projects.find((p) => p.id === params.projectId);
  const section = current ? pathname.slice(`/projects/${current.id}`.length) : "";
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Hexspare Tally API">
              <Link href="/" onClick={() => setOpenMobile(false)}>
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">HT</span>
                <span className="truncate text-sm font-semibold tracking-tight">Hexspare Tally API</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="mt-1">
            <ProjectSwitcher projects={profile.projects} currentId={current?.id} section={section} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {current ? (
          <nav aria-label="Main">
            {NAV_GROUPS.map((group, i) => (
              <SidebarGroup key={group.label ?? i}>
                {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map(({ href, label, icon: Icon }) => {
                      const active = section === href;
                      return (
                        <SidebarMenuItem key={label}>
                          <SidebarMenuButton asChild isActive={active} tooltip={label}>
                            <Link href={`/projects/${current.id}${href}`} aria-current={active ? "page" : undefined} onClick={() => setOpenMobile(false)}>
                              <Icon className={active ? "text-primary" : undefined} aria-hidden />
                              <span>{label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Docs"><Link href="/docs"><BookOpen aria-hidden /><span>Docs</span></Link></SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Pricing"><Link href="/pricing"><IndianRupee aria-hidden /><span>Pricing</span></Link></SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem><UserMenu user={profile.user} tenant={profile.tenant} /></SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { ConsoleHeader } from "@/components/console-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getProfile } from "@/lib/server-api";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  // The sidebar remembers being collapsed. Reading it here stops it flashing open on each load.
  const open = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <SidebarProvider defaultOpen={open}>
      <a href="#main" className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2">Skip to main content</a>
      <AppSidebar profile={profile} />
      <SidebarInset className="min-w-0">
        <ConsoleHeader projects={profile.projects} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none md:px-8 md:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

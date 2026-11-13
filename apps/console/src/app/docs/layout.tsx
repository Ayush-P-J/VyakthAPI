import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    // The console follows the system's light or dark setting, so the docs do too.
    <RootProvider theme={{ enabled: false }}>
      <DocsLayout
        tree={source.getPageTree()}
        nav={{ title: <span className="flex items-center gap-2 text-sm font-semibold tracking-tight"><span aria-hidden className="grid size-7 place-items-center rounded-lg bg-primary text-[0.6875rem] font-bold text-primary-foreground">HT</span>Hexspare Tally API</span> }}
        links={[{ text: "Pricing", url: "/pricing" }, { text: "Console", url: "/" }]}
        themeSwitch={{ enabled: false }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}

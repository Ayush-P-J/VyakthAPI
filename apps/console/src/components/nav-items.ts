import { Activity, Gauge, KeyRound, LayoutDashboard, type LucideIcon, Plug, Webhook } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [{ href: "", label: "Overview", icon: LayoutDashboard }] },
  {
    label: "Set up",
    items: [
      { href: "/connections", label: "Connections", icon: Plug },
      { href: "/keys", label: "API keys", icon: KeyRound },
      { href: "/webhooks", label: "Webhooks", icon: Webhook },
    ],
  },
  {
    label: "Activity",
    items: [
      { href: "/jobs", label: "Write jobs", icon: Activity },
      { href: "/usage", label: "Usage", icon: Gauge },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

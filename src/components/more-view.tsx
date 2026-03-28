"use client";

import Link from "next/link";
import {
  SquareTerminal,
  Terminal,
  Globe,
  Volume2,
  Search,
  Waypoints,
  Settings,
  Webhook,
  Stethoscope,
  ArrowRight,
  MessageCircle,
  Wrench,
  Calendar,
  Puzzle,
  Radio,
  FolderOpen,
  Database,
  Settings2,
} from "lucide-react";
import { SectionBody, SectionHeader, SectionLayout } from "@/components/section-layout";
import { cn } from "@/lib/utils";

type MoreItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  beta?: boolean;
};

const MORE_ITEMS: MoreItem[] = [
  {
    href: "/chat",
    label: "Chat",
    description: "Chat directly with your agents.",
    icon: MessageCircle,
  },
  {
    href: "/skills",
    label: "Skills",
    description: "Manage and browse agent skills and ClawHub.",
    icon: Wrench,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "View and manage calendar events.",
    icon: Calendar,
    beta: true,
  },
  {
    href: "/integrations",
    label: "Integrations",
    description: "Connect third-party services and integrations.",
    icon: Puzzle,
    beta: true,
  },
  {
    href: "/channels",
    label: "Channels",
    description: "Configure messaging channels and providers.",
    icon: Radio,
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Browse and manage workspace documents.",
    icon: FolderOpen,
  },
  {
    href: "/vectors",
    label: "Vector DB",
    description: "Manage vector embeddings and semantic search.",
    icon: Database,
  },
  {
    href: "/settings",
    label: "Preferences",
    description: "User preferences and display settings.",
    icon: Settings2,
  },
  {
    href: "/terminal",
    label: "Terminal",
    description: "Interactive shell access to the gateway host.",
    icon: SquareTerminal,
  },
  {
    href: "/logs",
    label: "Logs",
    description: "Live gateway and agent logs with filtering and tailing.",
    icon: Terminal,
  },
  {
    href: "/browser",
    label: "Browser Relay",
    description: "Control a browser via the OpenClaw relay.",
    icon: Globe,
  },
  {
    href: "/audio",
    label: "Audio & Voice",
    description: "Voice input / output and TTS configuration.",
    icon: Volume2,
  },
  {
    href: "/search",
    label: "Web Search",
    description: "Run web searches directly from the dashboard.",
    icon: Search,
  },
  {
    href: "/tailscale",
    label: "Tailscale",
    description: "Manage Tailscale nodes and network connectivity.",
    icon: Waypoints,
    beta: true,
  },
  {
    href: "/config",
    label: "Config",
    description: "Edit the raw OpenClaw configuration file.",
    icon: Settings,
  },
  {
    href: "/hooks",
    label: "Hooks",
    description: "Webhook triggers for external integrations.",
    icon: Webhook,
  },
  {
    href: "/doctor",
    label: "Doctor",
    description: "Run health checks and diagnose configuration issues.",
    icon: Stethoscope,
    beta: true,
  },
];

export function MoreView() {
  return (
    <SectionLayout>
      <SectionHeader
        title="More"
        description="Less frequently used tools — click any card to open."
        bordered
      />
      <SectionBody width="content" padding="regular">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "group flex items-start gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors",
                  "hover:border-stone-300 hover:shadow-md",
                  "dark:border-[#2c343d] dark:bg-[#171a1d] dark:hover:border-[#3d4752] dark:hover:bg-[#1c2026]"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-[#20252a]">
                  <Icon className="h-4 w-4 text-stone-600 dark:text-[#c7d0d9]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-stone-900 dark:text-[#f5f7fa]">
                      {item.label}
                    </p>
                    {item.beta && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                        beta
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-[#8d98a5]">
                    {item.description}
                  </p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 dark:text-[#4d5864]" />
              </Link>
            );
          })}
        </div>
      </SectionBody>
    </SectionLayout>
  );
}

"use client";

import { BookOpen, GitBranch, HardDrive, MessageSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type IntegrationProviderKey = "google-workspace" | "github" | "notion" | "slack";

type IntegrationProviderOverview = {
  key: IntegrationProviderKey;
  label: string;
  description: string;
  status: "live" | "planned";
  connectionCount: number;
  agentCount: number;
  createEnabled: boolean;
  manageLabel: string;
};

type IntegrationConnectionOverview = {
  id: string;
  providerKey: IntegrationProviderKey;
  providerLabel: string;
  label: string;
  externalRef: string;
  ownerAgentName: string;
  status: "connected" | "pending" | "needs-reauthorization" | "limited-access" | "error";
  accessLevel: "read-only" | "read-draft" | "read-write" | "custom";
  accessLabel: string;
  scopeBadges: string[];
};

const PROVIDER_ORDER: Array<IntegrationProviderKey | "all"> = [
  "all",
  "google-workspace",
  "github",
  "notion",
  "slack",
];

function providerIcon(key: IntegrationProviderKey) {
  switch (key) {
    case "google-workspace":
      return HardDrive;
    case "github":
      return GitBranch;
    case "notion":
      return BookOpen;
    case "slack":
      return MessageSquare;
  }
}

function providerStatusTone(status: IntegrationProviderOverview["status"]) {
  return status === "live"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-stone-300 bg-stone-100 text-stone-700 dark:border-[#30363d] dark:bg-[#171b1f] dark:text-[#a8b0ba]";
}

function accessTone(accessLevel: IntegrationConnectionOverview["accessLevel"]) {
  switch (accessLevel) {
    case "read-write":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "read-draft":
      return "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "read-only":
      return "border-stone-300 bg-stone-100 text-stone-700 dark:border-[#30363d] dark:bg-[#171b1f] dark:text-[#c7d0d9]";
    case "custom":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
}

function statusTone(status: IntegrationConnectionOverview["status"]): string {
  switch (status) {
    case "connected":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "limited-access":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "pending":
      return "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    default:
      return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
}

type OverviewSectionProps = {
  providerOverview: IntegrationProviderOverview[];
  providerFilter: IntegrationProviderKey | "all";
  visibleOverviewConnections: IntegrationConnectionOverview[];
  onProviderFilterChange: (filter: IntegrationProviderKey | "all") => void;
  onProviderCreate: (providerKey: IntegrationProviderKey) => void;
  onConnectionOpen: (connectionId: string) => void;
};

export function OverviewSection({
  providerOverview,
  providerFilter,
  visibleOverviewConnections,
  onProviderFilterChange,
  onProviderCreate,
  onConnectionOpen,
}: OverviewSectionProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Existing Integrations</CardTitle>
          <CardDescription>
            Start here. Review what already exists, then add a new integration only when needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {providerOverview.map((provider) => {
            const ProviderIcon = providerIcon(provider.key);
            return (
              <div
                key={provider.key}
                className="rounded-xl border border-stone-200/80 p-4 dark:border-[#23282e]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 dark:border-[#30363d] dark:bg-[#111418]">
                      <ProviderIcon className="h-5 w-5 text-stone-700 dark:text-[#c7d0d9]" />
                    </div>
                    <div>
                      <p className="font-medium text-stone-900 dark:text-[#f5f7fa]">
                        {provider.label}
                      </p>
                      <p className="text-sm text-stone-500 dark:text-[#8d98a5]">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn("border", providerStatusTone(provider.status))}>
                    {provider.status === "live" ? "Live" : "Planned"}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{provider.connectionCount} connections</Badge>
                  <Badge variant="outline">{provider.agentCount} agents</Badge>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    variant={provider.createEnabled ? "default" : "outline"}
                    className="w-full justify-between"
                    onClick={() => onProviderCreate(provider.key)}
                  >
                    <span>{provider.manageLabel}</span>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Connections</CardTitle>
              <CardDescription>
                Open an existing connection to move into its detail screen.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROVIDER_ORDER.map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={providerFilter === key ? "default" : "outline"}
                  onClick={() => onProviderFilterChange(key)}
                >
                  {key === "all"
                    ? "All"
                    : providerOverview.find((provider) => provider.key === key)?.label || key}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleOverviewConnections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-600 dark:border-[#30363d] dark:text-[#a8b0ba]">
              No connections for this filter yet.
            </div>
          ) : null}
          {visibleOverviewConnections.map((connection) => (
            <button
              key={connection.id}
              type="button"
              onClick={() => onConnectionOpen(connection.id)}
              className="w-full rounded-xl border border-stone-200/80 p-4 text-left transition-colors hover:border-stone-300 dark:border-[#23282e] dark:hover:border-[#30363d]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-stone-900 dark:text-[#f5f7fa]">
                      {connection.label}
                    </p>
                    <Badge variant="outline">{connection.providerLabel}</Badge>
                    <Badge className={cn("border", statusTone(connection.status))}>
                      {connection.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-stone-500 dark:text-[#8d98a5]">
                    {connection.externalRef}
                  </p>
                </div>
                <div className="text-right text-sm text-stone-500 dark:text-[#8d98a5]">
                  <p>Owner</p>
                  <p className="font-medium text-stone-900 dark:text-[#f5f7fa]">
                    {connection.ownerAgentName}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className={cn("border", accessTone(connection.accessLevel))}>
                  {connection.accessLabel}
                </Badge>
                {connection.scopeBadges.map((scope) => (
                  <Badge key={`${connection.id}-${scope}`} variant="outline">
                    {scope}
                  </Badge>
                ))}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

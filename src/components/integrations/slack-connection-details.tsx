"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SlackConnectionDetail = {
  id: string;
  ownerAgentName: string;
  status: "connected" | "pending" | "needs-reauthorization" | "limited-access" | "error";
  configured: boolean;
  running: boolean;
  accountId: string;
  bindingCount: number;
  accessLevel: "read-only" | "read-draft" | "read-write" | "custom";
  accessLabel: string;
  scopeBadges: string[];
  allowedChannels: Array<{
    channelId: string;
    allow: boolean;
    requireMention: boolean;
  }>;
};

function accessTone(accessLevel: SlackConnectionDetail["accessLevel"]) {
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

function statusTone(status: SlackConnectionDetail["status"]): string {
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

type SlackConnectionDetailsProps = {
  connection: SlackConnectionDetail;
  onBack: () => void;
};

export function SlackConnectionDetails({ connection, onBack }: SlackConnectionDetailsProps) {
  return (
    <div id="connection-details" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="justify-start px-0 text-stone-600 hover:bg-transparent hover:text-stone-900 dark:text-[#a8b0ba] dark:hover:text-[#f5f7fa]"
          onClick={onBack}
        >
          Back
        </Button>
        <Badge className={cn("border", statusTone(connection.status))}>
          {connection.running ? "Slack live" : connection.configured ? "Configured" : "Pending"}
        </Badge>
      </div>

      <Card className="border-dashed border-stone-300/80 dark:border-[#30363d]">
        <CardContent className="space-y-6 p-5">
          <section className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-[#7a8591]">
              Agent Ownership
            </p>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-[#f5f7fa]">
              {connection.ownerAgentName}
            </h2>
            <p className="text-xs text-stone-500 dark:text-[#8d98a5]">
              This Slack connection is routed to exactly one agent. The dashboard reads it live from the OpenClaw gateway, but edits still stay OpenClaw-managed for now.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-stone-200/80 px-3 py-2 dark:border-[#23282e]">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-[#7a8591]">Owner</p>
                <p className="mt-1 text-sm font-medium text-stone-900 dark:text-[#f5f7fa]">{connection.ownerAgentName}</p>
              </div>
              <div className="rounded-lg border border-stone-200/80 px-3 py-2 dark:border-[#23282e]">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-[#7a8591]">Slack account</p>
                <p className="mt-1 text-sm font-medium text-stone-900 dark:text-[#f5f7fa]">{connection.accountId}</p>
              </div>
              <div className="rounded-lg border border-stone-200/80 px-3 py-2 dark:border-[#23282e]">
                <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-[#7a8591]">Bindings</p>
                <p className="mt-1 text-sm font-medium text-stone-900 dark:text-[#f5f7fa]">{connection.bindingCount}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("border", accessTone(connection.accessLevel))}>
                {connection.accessLabel}
              </Badge>
              {connection.scopeBadges.map((scope) => (
                <Badge key={`${connection.id}-${scope}`} variant="outline">
                  {scope}
                </Badge>
              ))}
            </div>
            <div className="rounded-xl border border-stone-200/80 bg-white p-4 dark:border-[#2c343d] dark:bg-[#171a1d]">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-[#7a8591]">
                Allowed channels
              </p>
              {connection.allowedChannels.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500 dark:text-[#a8b0ba]">
                  No explicit channel allowlist detected for this Slack account.
                </p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {connection.allowedChannels.map((channel) => (
                    <div
                      key={`${connection.id}-${channel.channelId}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200/80 px-3 py-2 dark:border-[#23282e]"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-900 dark:text-[#f5f7fa]">
                          {channel.channelId}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-[#8d98a5]">
                          {channel.requireMention ? "Requires @mention" : "Can respond without mention"}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {channel.allow ? "allowed" : "blocked"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { BookOpen, GitBranch, HardDrive, Mail, MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineSpinner } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

type IntegrationProviderKey = "google-workspace" | "github" | "notion" | "slack";

type AgentSummary = {
  id: string;
  name: string;
  isDefault: boolean;
};

type AccountRecord = {
  accessLevel: "read-only" | "read-draft" | "read-write" | "custom";
};

type IntegrationProviderOverview = {
  key: IntegrationProviderKey;
  label: string;
  description: string;
  status: "live" | "planned";
  connectionCount: number;
  agentCount: number;
};

type RuntimeSnapshot = {
  gog: {
    available: boolean;
  };
  auth: {
    credentialsExists: boolean;
    keyringBackend: string | null;
    keyringSource: string | null;
  };
  storedAccounts: Array<{ email: string; source: "gog" | "keychain-fallback" }>;
};

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

function statusTone(status: "connected" | "error" | "unverified") {
  switch (status) {
    case "connected":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "error":
      return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    default:
      return "border-stone-300 bg-stone-100 text-stone-600 dark:border-[#30363d] dark:bg-[#171b1f] dark:text-[#a8b0ba]";
  }
}

type AddIntegrationSectionProps = {
  providerOverview: IntegrationProviderOverview[];
  selectedAddProvider: IntegrationProviderKey | null;
  runtime: RuntimeSnapshot;
  slackConnectionCount: number;
  selectedAgentId: string;
  selectedAgentName: string;
  agents: AgentSummary[];
  connectEmail: string;
  connectAccessLevel: AccountRecord["accessLevel"];
  actionBusy: string | null;
  onSelectProvider: (provider: IntegrationProviderKey) => void;
  onAgentChange: (agentId: string) => void;
  onConnectEmailChange: (value: string) => void;
  onConnectAccessLevelChange: (value: AccountRecord["accessLevel"]) => void;
  onStartConnect: () => void;
  onImportExisting: () => void;
  onReuseStoredAccount: (account: { email: string; source: "gog" | "keychain-fallback" }) => void;
};

export function AddIntegrationSection({
  providerOverview,
  selectedAddProvider,
  runtime,
  slackConnectionCount,
  selectedAgentId,
  selectedAgentName,
  agents,
  connectEmail,
  connectAccessLevel,
  actionBusy,
  onSelectProvider,
  onAgentChange,
  onConnectEmailChange,
  onConnectAccessLevelChange,
  onStartConnect,
  onImportExisting,
  onReuseStoredAccount,
}: AddIntegrationSectionProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Integration</CardTitle>
          <CardDescription>
            Pick the provider first. Setup appears only after you choose one.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {providerOverview.map((provider) => {
            const ProviderIcon = providerIcon(provider.key);
            const active = selectedAddProvider === provider.key;
            return (
              <button
                key={provider.key}
                type="button"
                onClick={() => onSelectProvider(provider.key)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-blue-500/50 bg-blue-500/5"
                    : "border-stone-200/80 hover:border-stone-300 dark:border-[#23282e] dark:hover:border-[#30363d]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 dark:border-[#30363d] dark:bg-[#111418]">
                      <ProviderIcon className="h-5 w-5 text-stone-700 dark:text-[#c7d0d9]" />
                    </div>
                    <div>
                      <p className="font-medium text-stone-900 dark:text-[#f5f7fa]">{provider.label}</p>
                      <p className="text-sm text-stone-500 dark:text-[#8d98a5]">{provider.description}</p>
                    </div>
                  </div>
                  <Badge className={cn("border", providerStatusTone(provider.status))}>
                    {provider.status === "live" ? "Live" : "Planned"}
                  </Badge>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {selectedAddProvider === "google-workspace" ? (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.95fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Runtime</CardTitle>
                <CardDescription>
                  Google setup depends on gateway runtime, OAuth credentials, and existing gog accounts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-stone-200/80 px-3 py-2 dark:border-[#23282e]">
                  <span>Slack runtime</span>
                  <Badge className={cn("border", statusTone(slackConnectionCount > 0 ? "connected" : "unverified"))}>
                    {slackConnectionCount > 0 ? `${slackConnectionCount} linked` : "Not detected"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-stone-200/80 px-3 py-2 dark:border-[#23282e]">
                  <span>gog runtime</span>
                  <Badge className={cn("border", statusTone(runtime.gog.available ? "connected" : "error"))}>
                    {runtime.gog.available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-stone-200/80 px-3 py-2 dark:border-[#23282e]">
                  <span>OAuth client</span>
                  <Badge className={cn("border", statusTone(runtime.auth.credentialsExists ? "connected" : "unverified"))}>
                    {runtime.auth.credentialsExists ? "Configured" : "Using gog default client"}
                  </Badge>
                </div>
                <div className="rounded-lg border border-stone-200/80 px-3 py-2 dark:border-[#23282e]">
                  <div className="flex items-center justify-between">
                    <span>Stored Google accounts</span>
                    <span className="text-sm font-medium">{runtime.storedAccounts.length}</span>
                  </div>
                  {runtime.storedAccounts.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {runtime.storedAccounts.map((acct) => (
                        <div
                          key={acct.email}
                          className="flex items-center gap-2 rounded px-2 py-1 text-xs text-stone-600 dark:bg-[#101214] dark:text-[#a8b0ba]"
                        >
                          <Mail className="h-3 w-3 shrink-0 opacity-60" />
                          <span className="truncate">{acct.email}</span>
                          {acct.source === "keychain-fallback" ? (
                            <Badge variant="outline" className="ml-auto shrink-0 border-amber-500/30 px-1 py-0 text-[10px] text-amber-600 dark:text-amber-400">
                              needs re-auth
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="ml-auto shrink-0 border-emerald-500/30 px-1 py-0 text-[10px] text-emerald-600 dark:text-emerald-400">
                              ready
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {runtime.storedAccounts.every((a) => a.source === "keychain-fallback") && runtime.storedAccounts.length > 0 ? (
                    <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                      Tokens found in macOS Keychain but not recognized by gog. Use Connect Google below to re-authorize.
                    </p>
                  ) : null}
                </div>
                <p className="text-xs text-stone-500 dark:text-[#a8b0ba]">
                  Keyring backend: {runtime.auth.keyringBackend || "unknown"} · source:{" "}
                  {runtime.auth.keyringSource || "unknown"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connect Google</CardTitle>
                <CardDescription>
                  Connect one Google account to exactly one agent. The default safe option is Read Only.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500 dark:text-[#7a8591]">
                    Target agent
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm dark:border-[#30363d] dark:bg-[#0f1318]"
                    value={selectedAgentId}
                    onChange={(event) => onAgentChange(event.target.value)}
                  >
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                        {agent.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500 dark:text-[#7a8591]">
                    Google account email
                  </label>
                  <Input
                    value={connectEmail}
                    onChange={(event) => onConnectEmailChange(event.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500 dark:text-[#7a8591]">
                    Connection access
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm dark:border-[#30363d] dark:bg-[#0f1318]"
                    value={connectAccessLevel}
                    onChange={(event) => onConnectAccessLevelChange(event.target.value as AccountRecord["accessLevel"])}
                  >
                    <option value="read-only">Read Only</option>
                    <option value="read-draft">Read + Draft</option>
                    <option value="read-write">Read + Write</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="rounded-lg border border-stone-200/80 bg-stone-50 p-3 text-sm text-stone-600 dark:border-[#23282e] dark:bg-[#111418] dark:text-[#a8b0ba]">
                  <p className="mb-2 text-xs font-medium text-stone-700 dark:text-[#d8dee6]">
                    This connection will belong only to {selectedAgentName}.
                  </p>
                  {connectAccessLevel === "read-only" && "The assistant can look things up, but cannot send or change anything."}
                  {connectAccessLevel === "read-draft" && "The assistant can read and prepare drafts, but you keep control before anything is sent."}
                  {connectAccessLevel === "read-write" && "The assistant can read and take approved actions like replying or creating events."}
                  {connectAccessLevel === "custom" && "Custom mode lets you turn specific capabilities on or off after the account is connected."}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={onStartConnect}
                    disabled={!connectEmail.trim() || actionBusy !== null}
                  >
                    {actionBusy === "start-connect" ? <InlineSpinner className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Start Browser-Safe Connect
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onImportExisting}
                    disabled={!connectEmail.trim() || actionBusy !== null}
                  >
                    Import Existing gog Account
                  </Button>
                </div>
                {runtime.storedAccounts.length ? (
                  <div className="rounded-xl border border-stone-200/80 p-3 dark:border-[#23282e]">
                    <p className="text-sm font-medium text-stone-900 dark:text-[#f5f7fa]">
                      Detected existing Google accounts
                    </p>
                    <div className="mt-3 space-y-2">
                      {runtime.storedAccounts.map((account) => (
                        <div
                          key={account.email}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200/80 px-3 py-2 dark:border-[#23282e]"
                        >
                          <div>
                            <p className="text-sm font-medium text-stone-900 dark:text-[#f5f7fa]">
                              {account.email}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-[#7a8591]">
                              {account.source === "keychain-fallback"
                                ? "Found in macOS Keychain but needs re-authorization through gog."
                                : "Available in gog. Import it to manage permissions here."}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onReuseStoredAccount(account)}
                            disabled={actionBusy !== null}
                          >
                            {account.source === "keychain-fallback" ? "Re-authorize" : "Import"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="rounded-lg border border-dashed border-stone-300 p-3 text-sm dark:border-[#30363d]">
                  <p className="font-medium text-stone-900 dark:text-[#f5f7fa]">For non-technical users</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-stone-600 dark:text-[#a8b0ba]">
                    <li>Click <strong>Start Browser-Safe Connect</strong>.</li>
                    <li>Sign in to Google in the new tab.</li>
                    <li>After Google redirects you, copy the full final browser URL.</li>
                    <li>Paste it into the “Finish connection” box below and click finish.</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-dashed border-stone-300/80 dark:border-[#30363d]">
              <CardHeader>
                <CardTitle>What happens next</CardTitle>
                <CardDescription>
                  Start the browser-safe Google flow here. Once the account is created, this screen will switch into connection details automatically.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      ) : null}

      {selectedAddProvider && selectedAddProvider !== "google-workspace" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {providerOverview.find((provider) => provider.key === selectedAddProvider)?.label || "Provider"} setup
            </CardTitle>
            <CardDescription>
              {selectedAddProvider === "slack"
                ? "Slack is already read live from the gateway. The next cleanup step is to move its create and edit flow into this dedicated setup screen."
                : "This provider already has a slot in the model, but the setup flow is not wired yet."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </>
  );
}

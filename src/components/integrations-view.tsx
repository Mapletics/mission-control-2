"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSmartPoll } from "@/hooks/use-smart-poll";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  ExternalLink,
  HardDrive,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionBody, SectionHeader, SectionLayout } from "@/components/section-layout";
import { InlineSpinner, LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { AddIntegrationSection } from "@/components/integrations/add-integration-section";
import { OverviewSection } from "@/components/integrations/overview-section";
import { SlackConnectionDetails } from "@/components/integrations/slack-connection-details";

type AgentSummary = {
  id: string;
  name: string;
  isDefault: boolean;
};

type Capability = {
  key: string;
  service: "gmail" | "calendar" | "drive";
  label: string;
  description: string;
  category: "read" | "draft" | "write";
  enabled?: boolean;
  policy?: "deny" | "ask" | "allow" | null;
};

type AccountRecord = {
  id: string;
  email: string;
  label: string;
  ownerAgentId: string;
  status: "connected" | "pending" | "needs-reauthorization" | "limited-access" | "error";
  accessLevel: "read-only" | "read-draft" | "read-write" | "custom";
  pendingAuthUrl: string | null;
  pendingAuthStartedAt: number | null;
  lastCheckedAt: number | null;
  lastError: string | null;
  capabilityMatrix: Capability[];
  connectionNotes: string[];
  serviceStates: Record<
    "gmail" | "calendar" | "drive",
    {
      enabled: boolean;
      apiStatus: "ready" | "unverified" | "error";
      scopeStatus: "full" | "readonly" | "unknown";
      lastCheckedAt: number | null;
      lastError: string | null;
    }
  >;
  watch: {
    enabled: boolean;
    status: "inactive" | "configured" | "watching" | "error";
    targetAgentId: string | null;
    label: string;
    projectId: string;
    topic: string;
    subscription: string;
    hookUrl: string;
    hookToken: string;
    pushEndpoint: string;
    pushToken: string;
    port: string;
    path: string;
    tailscaleMode: "funnel" | "serve" | "off";
    includeBody: boolean;
    maxBytes: number;
    lastConfiguredAt: number | null;
    lastCheckedAt: number | null;
    lastError: string | null;
  };
  diagnostics?: {
    accountId: string;
    generatedAt: number;
    checks: Array<{
      key: string;
      label: string;
      ok: boolean;
      detail: string;
      fixAction: string | null;
    }>;
  };
};

type IntegrationProviderKey =
  | "google-workspace"
  | "github"
  | "notion"
  | "slack";

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
  ownerAgentId: string;
  ownerAgentName: string;
  status: AccountRecord["status"];
  accessLevel: AccountRecord["accessLevel"];
  accessLabel: string;
  scopeBadges: string[];
  agentAccess: Array<{
    agentId: string;
    agentName: string;
    relation: "owner" | "none";
    accessLevel: AccountRecord["accessLevel"] | "none";
    summary: string;
  }>;
  createdAt: number;
  updatedAt: number;
};

type SlackConnectionDetail = IntegrationConnectionOverview & {
  accountId: string;
  accountLabel: string;
  configured: boolean;
  running: boolean;
  bindingCount: number;
  allowedChannels: Array<{
    channelId: string;
    allow: boolean;
    requireMention: boolean;
  }>;
};

type IntegrationAgentMatrixRow = {
  agentId: string;
  agentName: string;
  isDefault: boolean;
  providers: Array<{
    providerKey: IntegrationProviderKey;
    providerLabel: string;
    connectionCount: number;
    summary: string;
    createEnabled: boolean;
  }>;
};

type Approval = {
  id: string;
  accountId: string;
  agentId: string;
  capability: string;
  actionLabel: string;
  summary: string;
  status: "pending" | "approved" | "denied" | "completed" | "failed";
  createdAt: number;
  resolvedAt: number | null;
  resultSummary: string | null;
  error: string | null;
};

type AuditEntry = {
  id: string;
  accountId: string | null;
  agentId: string | null;
  capability: string;
  action: string;
  summary: string;
  status: "success" | "error" | "queued" | "denied" | "info";
  detail: string | null;
  createdAt: number;
};

type Snapshot = {
  generatedAt: number;
  runtime: {
    gog: {
      available: boolean;
      bin: string | null;
    };
    auth: {
      credentialsExists: boolean;
      credentialsPath: string | null;
      keyringBackend: string | null;
      keyringSource: string | null;
      serviceAccountConfigured: boolean;
    };
    storedAccounts: Array<{ email: string; source: "gog" | "keychain-fallback" }>;
    supportsGmailWatch: boolean;
  };
  agents: AgentSummary[];
  selectedAgentId: string | null;
  capabilities: Capability[];
  overview: {
    providers: IntegrationProviderOverview[];
    connections: IntegrationConnectionOverview[];
    agentMatrix: IntegrationAgentMatrixRow[];
  };
  store: {
    updatedAt: number;
    accounts: AccountRecord[];
    slackConnections: SlackConnectionDetail[];
    approvals: Approval[];
    audit: AuditEntry[];
  };
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  authUrl?: string;
  authMode?: "live" | "remote";
  authStatus?: "waiting" | "completed" | "failed" | "timeout" | "none";
  queued?: boolean;
  result?: unknown;
  approval?: Approval | null;
  snapshot?: Snapshot;
  warning?: string | null;
};

const ACCESS_LEVEL_LABELS: Record<AccountRecord["accessLevel"], string> = {
  "read-only": "Read Only",
  "read-draft": "Read + Draft",
  "read-write": "Read + Write",
  custom: "Custom",
};

function formatAgo(ts: number | null): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function statusTone(status: AccountRecord["status"]): string {
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

function serviceStatusTone(status: "ready" | "unverified" | "error") {
  switch (status) {
    case "ready":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "error":
      return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    default:
      return "border-stone-300 bg-stone-100 text-stone-600 dark:border-[#30363d] dark:bg-[#171b1f] dark:text-[#a8b0ba]";
  }
}

function firstDefault<T extends { isDefault?: boolean }>(rows: T[]): T | null {
  return rows.find((entry) => entry.isDefault) || rows[0] || null;
}

export function IntegrationsView() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"overview" | "add" | "details">("overview");
  const [selectedAddProvider, setSelectedAddProvider] = useState<IntegrationProviderKey | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedSlackConnectionId, setSelectedSlackConnectionId] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<IntegrationProviderKey | "all">("all");
  const [connectEmail, setConnectEmail] = useState("");
  const [connectAccessLevel, setConnectAccessLevel] = useState<AccountRecord["accessLevel"]>("read-only");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (agentId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = agentId ? `/api/integrations?agentId=${encodeURIComponent(agentId)}` : "/api/integrations";
      const response = await fetch(url, { cache: "no-store" });
      const json = (await response.json()) as Snapshot & { error?: string };
      if (!response.ok) {
        throw new Error(json.error || `Failed to load integrations (${response.status})`);
      }
      setData(json);
      const nextAgentId = agentId || json.selectedAgentId || firstDefault(json.agents)?.id || "";
      setSelectedAgentId(nextAgentId);
      setSelectedAccountId((current) =>
        current && json.store.accounts.some((entry) => entry.id === current)
          ? current
          : json.store.accounts[0]?.id || "",
      );
      setSelectedSlackConnectionId((current) =>
        current && json.store.slackConnections.some((entry) => entry.id === current)
          ? current
          : "",
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const agentId = searchParams.get("agentId");
    void load(agentId || undefined);
  }, [load, searchParams]);

  // Poll for live auth completion when an account has a pending auth URL
  const pendingAuthEmail = useMemo(
    () => data?.store.accounts.find((a) => a.pendingAuthUrl)?.email || null,
    [data],
  );

  useSmartPoll(
    async () => {
      if (!pendingAuthEmail) return;
      try {
        const response = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll-auth-status", email: pendingAuthEmail }),
        });
        const json = await response.json();
        if (json.authStatus === "completed" && json.snapshot) {
          setData(json.snapshot);
          setNotice("Google account connected successfully.");
        }
      } catch { /* ignore polling errors */ }
    },
    { intervalMs: 10000, enabled: !!pendingAuthEmail },
  );

  const runAction = useCallback(
    async (action: string, body: Record<string, unknown>) => {
      setActionBusy(action);
      setError(null);
      setNotice(null);
      try {
        const response = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            ...body,
            agentId: body.agentId || selectedAgentId || undefined,
          }),
        });
        const json = (await response.json()) as ApiResponse;
        if (!response.ok || json.ok === false) {
          throw new Error(json.error || `Action failed: ${action}`);
        }
        if (json.snapshot) {
          setData(json.snapshot);
          if (json.snapshot.selectedAgentId) setSelectedAgentId(json.snapshot.selectedAgentId);
          if (!selectedAccountId && json.snapshot.store.accounts[0]) {
            setSelectedAccountId(json.snapshot.store.accounts[0].id);
          }
          // Auto-select the account that just started auth so the user sees the Finish Connection card
          if (action === "start-connect" && body.email) {
            const pending = json.snapshot.store.accounts.find(
              (a: AccountRecord) => a.email === String(body.email).toLowerCase() && a.pendingAuthUrl,
            );
            if (pending) {
              setSelectedSlackConnectionId("");
              setSelectedAccountId(pending.id);
              setActiveView("details");
            }
          }
        }
        if (json.warning) setNotice(json.warning);
        if (json.queued) {
          setNotice("Action queued for approval. Review it in the Approval Queue below.");
        }
        return json;
      } catch (actionError) {
        const message = actionError instanceof Error ? actionError.message : String(actionError);
        setError(message);
        throw actionError;
      } finally {
        setActionBusy(null);
      }
    },
    [selectedAgentId, selectedAccountId],
  );

  const selectedAccount = useMemo(
    () => data?.store.accounts.find((entry) => entry.id === selectedAccountId) || null,
    [data, selectedAccountId],
  );

  const selectedSlackConnection = useMemo(
    () =>
      data?.store.slackConnections.find((entry) => entry.id === selectedSlackConnectionId) || null,
    [data, selectedSlackConnectionId],
  );

  const selectedAgent = useMemo(
    () => data?.agents.find((entry) => entry.id === selectedAgentId) || null,
    [data, selectedAgentId],
  );

  const providerOverview = useMemo(
    () => data?.overview.providers || [],
    [data],
  );

  const visibleOverviewConnections = useMemo(() => {
    const allConnections = data?.overview.connections || [];
    return providerFilter === "all"
      ? allConnections
      : allConnections.filter((connection) => connection.providerKey === providerFilter);
  }, [data, providerFilter]);

  const ownedSlackConnections = useMemo(
    () =>
      (data?.store.slackConnections || []).filter(
        (connection) => connection.ownerAgentId === selectedAgentId,
      ),
    [data, selectedAgentId],
  );

  const slackProviderOverview = useMemo(
    () => providerOverview.find((provider) => provider.key === "slack") || null,
    [providerOverview],
  );

  const accountMatrix = useMemo(
    () => selectedAccount?.capabilityMatrix || [],
    [selectedAccount],
  );

  const serviceSummaries = useMemo(() => {
    if (!selectedAccount) return [];
    return (["gmail", "calendar", "drive"] as const).map((service) => {
      const capabilities = accountMatrix.filter((capability) => capability.service === service);
      const readEnabled = capabilities.some(
        (capability) => capability.enabled && capability.category === "read",
      );
      const writeEnabled = capabilities.some(
        (capability) => capability.enabled && capability.category !== "read",
      );
      const writePolicies = capabilities
        .filter((capability) => capability.category !== "read" && capability.enabled)
        .map((capability) => capability.policy);
      const approvalSummary =
        writePolicies.length === 0
          ? "No write actions enabled"
          : writePolicies.every((policy) => policy === "ask")
            ? "Writes require approval"
            : writePolicies.every((policy) => policy === "allow")
              ? "Writes allowed automatically"
              : writePolicies.every((policy) => policy === "deny")
                ? "Writes denied"
                : "Mixed write policies";
      return {
        service,
        label: service === "gmail" ? "Gmail" : service === "calendar" ? "Calendar" : "Drive",
        description:
          service === "gmail"
            ? "Read and send email"
            : service === "calendar"
              ? "Read and manage events"
              : "Browse and manage files",
        capabilities,
        readEnabled,
        writeEnabled,
        serviceState: selectedAccount.serviceStates[service],
        approvalSummary,
      };
    });
  }, [accountMatrix, selectedAccount]);

  const hasDetailSelection = Boolean(selectedAccount || selectedSlackConnection);

  const syncAgentSelection = useCallback(
    async (agentId: string) => {
      setSelectedAgentId(agentId);
      await load(agentId);
    },
    [load],
  );

  const handleNewIntegration = useCallback(
    (providerKey: IntegrationProviderKey) => {
      setActiveView("add");
      setSelectedAddProvider(providerKey);
      setProviderFilter(providerKey);
      if (providerKey === "google-workspace") {
        return;
      }
      if (providerKey === "slack") {
        setNotice("Slack is live and read from the gateway. Editing stays OpenClaw-managed for now.");
        return;
      }
      const provider = providerOverview.find((entry) => entry.key === providerKey);
      setNotice(
        `${provider?.label || "This provider"} is not wired yet. The central integrations shell is ready, but only Google and Slack are active today.`,
      );
    },
    [providerOverview],
  );

  const handleOpenOverviewConnection = useCallback(
    async (connection: IntegrationConnectionOverview) => {
      if (connection.providerKey === "slack") {
        await syncAgentSelection(connection.ownerAgentId);
        setSelectedAccountId("");
        setSelectedSlackConnectionId(connection.id);
        setActiveView("details");
        setNotice("Slack details are live from the gateway. Editing still happens through OpenClaw config.");
        return;
      }
      if (connection.providerKey !== "google-workspace") {
        setNotice(`${connection.providerLabel} does not have an interactive detail view yet.`);
        return;
      }
      await syncAgentSelection(connection.ownerAgentId);
      setSelectedSlackConnectionId("");
      setSelectedAccountId(connection.id);
      setActiveView("details");
    },
    [syncAgentSelection],
  );

  const handleServiceAccess = useCallback(
    async (service: "gmail" | "calendar" | "drive", mode: "read" | "write") => {
      if (!selectedAccount) return;
      await runAction("set-service-access", {
        accountId: selectedAccount.id,
        service,
        mode,
      });
    },
    [runAction, selectedAccount],
  );

  if (loading && !data) {
    return <LoadingState label="Loading Google integrations..." />;
  }

  return (
    <SectionLayout>
      <SectionHeader
        title="Integrations"
        description={
          activeView === "overview"
            ? "See which integrations already exist and which agent owns each connection."
            : activeView === "add"
              ? "Choose a provider and create a new integration without mixing it into the existing connection list."
              : "Inspect one connection at a time, including ownership, health, and agent permissions."
        }
        meta={
          data
            ? `Updated ${formatAgo(data.store.updatedAt)} · ${
                data.runtime.gog.available ? "gog is available" : "gog is unavailable"
              }`
            : undefined
        }
        actions={
          <>
            <Button
              type="button"
              variant={activeView === "overview" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveView("overview");
                setSelectedAddProvider(null);
              }}
            >
              Overview
            </Button>
            <Button
              type="button"
              variant={activeView === "add" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveView("add");
                setSelectedAddProvider(null);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Integration
            </Button>
            <Button
              type="button"
              variant={activeView === "details" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("details")}
              disabled={!hasDetailSelection}
            >
              Connection Details
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load(selectedAgentId || undefined)}
              disabled={loading}
            >
              {loading ? <InlineSpinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </>
        }
      />
      <SectionBody width="wide" padding="regular">
        <div className="space-y-6">
          {error ? (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-5 w-5" />
                  Something needs attention
                </CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          {notice ? (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="h-5 w-5" />
                  Update
                </CardTitle>
                <CardDescription>{notice}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {activeView === "overview" ? (
            <OverviewSection
              providerOverview={providerOverview}
              providerFilter={providerFilter}
              visibleOverviewConnections={visibleOverviewConnections}
              onProviderFilterChange={setProviderFilter}
              onProviderCreate={handleNewIntegration}
              onConnectionOpen={(connectionId) => {
                const connection = data?.overview.connections.find((entry) => entry.id === connectionId);
                if (connection) {
                  void handleOpenOverviewConnection(connection);
                }
              }}
            />
          ) : null}

          {activeView === "add" ? (
            <AddIntegrationSection
              providerOverview={providerOverview}
              selectedAddProvider={selectedAddProvider}
              runtime={data!.runtime}
              slackConnectionCount={slackProviderOverview?.connectionCount || 0}
              selectedAgentId={selectedAgentId}
              selectedAgentName={selectedAgent?.name || selectedAgentId || "the selected agent"}
              agents={data?.agents || []}
              connectEmail={connectEmail}
              connectAccessLevel={connectAccessLevel}
              actionBusy={actionBusy}
              onSelectProvider={setSelectedAddProvider}
              onAgentChange={(agentId) => void syncAgentSelection(agentId)}
              onConnectEmailChange={setConnectEmail}
              onConnectAccessLevelChange={setConnectAccessLevel}
              onStartConnect={() =>
                void runAction("start-connect", {
                  email: connectEmail,
                  accessLevel: connectAccessLevel,
                  agentId: selectedAgentId,
                })
              }
              onImportExisting={() =>
                void runAction("import-existing-account", {
                  email: connectEmail,
                  accessLevel: connectAccessLevel,
                  agentId: selectedAgentId,
                })
              }
              onReuseStoredAccount={(account) =>
                account.source === "keychain-fallback"
                  ? void runAction("start-connect", {
                      email: account.email,
                      accessLevel: connectAccessLevel,
                      agentId: selectedAgentId,
                    })
                  : void runAction("import-existing-account", {
                      email: account.email,
                      accessLevel: connectAccessLevel,
                      agentId: selectedAgentId,
                    })
              }
            />
          ) : null}

          {activeView === "details" ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1.95fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Accounts</CardTitle>
                  <CardDescription>
                    Google accounts owned by {selectedAgent?.name || selectedAgentId || "the selected agent"}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(data?.store.accounts || []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-600 dark:border-[#30363d] dark:text-[#a8b0ba]">
                      No Google accounts connected yet.
                    </div>
                  ) : null}
                  {(data?.store.accounts || []).map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        setActiveView("details");
                        setSelectedSlackConnectionId("");
                        setSelectedAccountId(account.id);
                      }}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        selectedAccountId === account.id
                          ? "border-blue-500/50 bg-blue-500/5"
                          : "border-stone-200/80 hover:border-stone-300 dark:border-[#23282e] dark:hover:border-[#30363d]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-stone-900 dark:text-[#f5f7fa]">{account.label}</p>
                          <p className="text-sm text-stone-500 dark:text-[#a8b0ba]">{account.email}</p>
                        </div>
                        <Badge className={cn("border", statusTone(account.status))}>
                          {account.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">Google</Badge>
                        <Badge variant="outline">Owner {account.ownerAgentId}</Badge>
                        <Badge variant="outline">{ACCESS_LEVEL_LABELS[account.accessLevel]}</Badge>
                        <Badge variant="outline">Gmail {account.serviceStates.gmail.scopeStatus}</Badge>
                        <Badge variant="outline">Calendar {account.serviceStates.calendar.scopeStatus}</Badge>
                        <Badge variant="outline">Drive {account.serviceStates.drive.scopeStatus}</Badge>
                        <Badge variant="outline">
                          Watch {account.watch.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-stone-500 dark:text-[#7a8591]">
                        <span>Last checked {formatAgo(account.lastCheckedAt)}</span>
                        <span>Manage Access</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card id="slack-connections">
                <CardHeader>
                  <CardTitle>Slack connections</CardTitle>
                  <CardDescription>
                    Live Slack bindings owned by {selectedAgent?.name || selectedAgentId || "the selected agent"}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ownedSlackConnections.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-600 dark:border-[#30363d] dark:text-[#a8b0ba]">
                      No Slack binding for this agent.
                    </div>
                  ) : null}
                  {ownedSlackConnections.map((connection) => (
                    <button
                      key={connection.id}
                      type="button"
                      onClick={() => {
                        setActiveView("details");
                        setSelectedAccountId("");
                        setSelectedSlackConnectionId(connection.id);
                      }}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        selectedSlackConnectionId === connection.id
                          ? "border-blue-500/50 bg-blue-500/5"
                          : "border-stone-200/80 hover:border-stone-300 dark:border-[#23282e] dark:hover:border-[#30363d]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-stone-900 dark:text-[#f5f7fa]">{connection.label}</p>
                          <p className="text-sm text-stone-500 dark:text-[#a8b0ba]">{connection.externalRef}</p>
                        </div>
                        <Badge className={cn("border", statusTone(connection.status))}>
                          {connection.running ? "running" : connection.configured ? "configured" : "pending"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">Owner {connection.ownerAgentId}</Badge>
                        <Badge variant="outline">{connection.bindingCount} binding{connection.bindingCount === 1 ? "" : "s"}</Badge>
                        <Badge variant="outline">{connection.allowedChannels.length} routes</Badge>
                        <Badge variant="outline">{connection.accountLabel}</Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {activeView === "details" && (
                <>
              {!selectedAccount && !selectedSlackConnection ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Select a connection</CardTitle>
                    <CardDescription>
                      Open a Google or Slack connection to inspect ownership, routes, health, and the exact agent boundary from one place.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : selectedSlackConnection ? (
                <SlackConnectionDetails
                  connection={selectedSlackConnection}
                  onBack={() => {
                    setSelectedSlackConnectionId("");
                    setActiveView("overview");
                  }}
                />
              ) : selectedAccount ? (
                <>
                  {selectedAccount.pendingAuthUrl ? (
                    <Card className="border-blue-500/30 bg-blue-500/5">
                      <CardHeader>
                        <CardTitle className="text-blue-700 dark:text-blue-300">
                          Waiting for Google sign-in
                        </CardTitle>
                        <CardDescription>
                          Started {formatAgo(selectedAccount.pendingAuthStartedAt)}.
                          Open the link below on this machine and sign in. The connection will complete automatically.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                          <a
                            href={selectedAccount.pendingAuthUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-500/20 dark:text-blue-300"
                          >
                            Open Google Sign-In <ExternalLink className="h-4 w-4" />
                          </a>
                          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-[#8d98a5]">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Waiting for callback...
                          </div>
                        </div>

                        <details className="group text-sm">
                          <summary className="cursor-pointer text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-[#8d98a5] dark:hover:text-[#c7d0d9]">
                            Accessing remotely? Use manual mode instead
                          </summary>
                          <div className="mt-3 space-y-3 rounded-lg border border-stone-200/80 p-3 dark:border-[#23282e]">
                            <p className="text-xs text-stone-600 dark:text-[#a8b0ba]">
                              If you are accessing this machine remotely (SSH, VNC, etc.), the automatic
                              callback won&apos;t work from your local browser. Instead:
                            </p>
                            <ol className="list-decimal space-y-1 pl-5 text-xs text-stone-600 dark:text-[#a8b0ba]">
                              <li>Open the sign-in link above and log in with Google.</li>
                              <li>
                                You&apos;ll see <strong>&quot;This site can&apos;t be reached&quot;</strong> — that&apos;s normal.
                              </li>
                              <li>Copy the <strong>full URL</strong> from the address bar and paste it below.</li>
                            </ol>
                            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                              <Input
                                value={redirectUrl}
                                onChange={(event) => setRedirectUrl(event.target.value)}
                                placeholder="http://127.0.0.1:…/oauth2/callback?code=…"
                                className="text-xs"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  void runAction("finish-connect", {
                                    accountId: selectedAccount.id,
                                    authUrl: redirectUrl,
                                  }).then(() => setRedirectUrl(""))
                                }
                                disabled={!redirectUrl.trim() || actionBusy !== null}
                              >
                                Finish
                              </Button>
                            </div>
                          </div>
                        </details>
                      </CardContent>
                    </Card>
                  ) : null}

                  <div id="connection-details" className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button
                        type="button"
                      variant="ghost"
                      className="justify-start px-0 text-stone-600 hover:bg-transparent hover:text-stone-900 dark:text-[#a8b0ba] dark:hover:text-[#f5f7fa]"
                      onClick={() => {
                        setSelectedAccountId("");
                        setActiveView("overview");
                      }}
                    >
                      Back
                    </Button>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-500/20 bg-rose-500/5 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                        onClick={() =>
                          void runAction("disconnect-account", { accountId: selectedAccount.id })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                    </div>

                    <Card className="border-dashed border-stone-300/80 dark:border-[#30363d]">
                      <CardContent className="space-y-6 p-5">
                        <section className="space-y-2">
                          <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-[#7a8591]">
                            Agent Identity
                          </p>
                          <h2 className="text-sm font-semibold text-stone-900 dark:text-[#f5f7fa]">
                            {selectedAgent?.name || "Selected Agent"}
                          </h2>
                          <p className="text-xs text-stone-500 dark:text-[#8d98a5]">
                            This agent owns the selected Google account and is the only one allowed to use it.
                          </p>
                          <div className="max-w-xs pt-1">
                            <label className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-[#7a8591]">
                              Acting agent
                            </label>
                            <select
                              className="mt-1 flex h-8 w-full rounded-lg border border-stone-200 bg-white px-2 text-xs dark:border-[#30363d] dark:bg-[#0f1318] dark:text-[#c7d0d9]"
                              value={selectedAgentId}
                              onChange={(event) => void syncAgentSelection(event.target.value)}
                            >
                              {(data?.agents || []).map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.name}
                                  {agent.isDefault ? " (default)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        </section>

                        <section className="space-y-4">
                          {serviceSummaries.map((service) => {
                            const ServiceIcon = service.service === "gmail" ? Mail : service.service === "calendar" ? CalendarDays : HardDrive;
                            return (
                              <div
                                key={service.service}
                                className="rounded-xl border border-stone-200/80 bg-white p-4 dark:border-[#2c343d] dark:bg-[#171a1d]"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 dark:border-[#30363d] dark:bg-[#111418]">
                                      <ServiceIcon className="h-4 w-4 text-stone-600 dark:text-[#c7d0d9]" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-stone-900 dark:text-[#f5f7fa]">
                                          {service.label}
                                        </h3>
                                        <Badge className={cn("border text-[10px]", serviceStatusTone(service.serviceState.apiStatus))}>
                                          {service.serviceState.apiStatus}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-stone-500 dark:text-[#8d98a5]">
                                        {service.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {service.serviceState.lastError && (
                                      <span className="text-xs text-red-500 dark:text-red-400">API error</span>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() =>
                                        void runAction("check-access", { accountId: selectedAccount.id, agentId: selectedAgentId })
                                      }
                                      disabled={actionBusy !== null}
                                    >
                                      Check APIs
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleServiceAccess(service.service, "read")}
                                    disabled={actionBusy !== null}
                                    className={cn(
                                      "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                                      service.readEnabled && !service.writeEnabled
                                        ? "border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-black"
                                        : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-[#30363d] dark:bg-transparent dark:text-[#c7d0d9] dark:hover:bg-[#111418]",
                                    )}
                                  >
                                    Read
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleServiceAccess(service.service, "write")}
                                    disabled={actionBusy !== null}
                                    className={cn(
                                      "rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                                      service.writeEnabled
                                        ? "border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-black"
                                        : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-[#30363d] dark:bg-transparent dark:text-[#c7d0d9] dark:hover:bg-[#111418]",
                                    )}
                                  >
                                    Write
                                  </button>
                                </div>

                                <p className="mt-4 text-xs text-stone-500 dark:text-[#8d98a5]">
                                  {service.approvalSummary}
                                </p>
                              </div>
                            );
                          })}
                        </section>

                        <div className="flex flex-wrap gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              void runAction("check-access", {
                                accountId: selectedAccount.id,
                                agentId: selectedAgentId,
                              })
                            }
                          >
                            Check Access
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              void runAction("start-connect", {
                                email: selectedAccount.email,
                                accessLevel: selectedAccount.accessLevel,
                              })
                            }
                          >
                            Reconnect Google
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-rose-500/20 bg-rose-500/5 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                            onClick={() =>
                              void runAction("disconnect-account", { accountId: selectedAccount.id })
                            }
                          >
                            Disconnect
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}
            </>
          )}
            </div>
          </div>
          ) : null}
        </div>
      </SectionBody>
    </SectionLayout>
  );
}

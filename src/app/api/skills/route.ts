import { NextRequest, NextResponse } from "next/server";
import { runCliJson } from "@/lib/openclaw";
import { fetchConfig, patchConfig } from "@/lib/gateway-config";
import { access, readFile, readdir } from "fs/promises";
import { constants as FS_CONSTANTS } from "fs";
import { join } from "path";
import { getSharedSkillsDirs } from "@/lib/paths";

export const dynamic = "force-dynamic";

/* ── Types ────────────────────────────────────────── */

type Skill = {
  name: string;
  description: string;
  emoji: string;
  eligible: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  source: string;
  bundled: boolean;
  homepage?: string;
  missing: {
    bins: string[];
    anyBins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
};

type SkillsList = {
  workspaceDir: string;
  managedSkillsDir: string;
  skills: Skill[];
};

type SkillsCheck = {
  summary: {
    total: number;
    eligible: number;
    disabled: number;
    blocked: number;
    missingRequirements: number;
  };
  eligible: string[];
  disabled: string[];
  blocked: string[];
  missingRequirements: { name: string; missing: string[] }[];
};

type SkillDetail = {
  name: string;
  description: string;
  source: string;
  bundled: boolean;
  filePath: string;
  baseDir: string;
  skillKey: string;
  emoji?: string;
  homepage?: string;
  always: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  eligible: boolean;
  requirements: {
    bins: string[];
    anyBins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
  missing: {
    bins: string[];
    anyBins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
  configChecks: unknown[];
  install: { id: string; kind: string; label: string; bins?: string[] }[];
};

type SharedSkillEntry = {
  name: string;
  filePath: string;
  baseDir: string;
  description: string;
  source: string;
};

const EMPTY_MISSING = {
  bins: [],
  anyBins: [],
  env: [],
  config: [],
  os: [],
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, FS_CONSTANTS.F_OK);
    return true;
  } catch {
    return false;
  }
}

function extractDescription(markdown: string): string {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("---"))
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith("```"));
  return lines[0] || "Shared skill";
}

async function loadSharedSkills(): Promise<SharedSkillEntry[]> {
  const dirs = await getSharedSkillsDirs();
  const byName = new Map<string, SharedSkillEntry>();

  for (const baseDir of dirs) {
    let entries: { isDirectory(): boolean; name: string }[] = [];
    try {
      entries = await readdir(baseDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (byName.has(entry.name)) continue;

      const filePath = join(baseDir, entry.name, "SKILL.md");
      if (!(await exists(filePath))) continue;

      let description = "Shared skill";
      try {
        description = extractDescription(await readFile(filePath, "utf-8"));
      } catch {
        // leave fallback description
      }

      byName.set(entry.name, {
        name: entry.name,
        filePath,
        baseDir,
        description,
        source: "local",
      });
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildSharedSkillDetail(skill: SharedSkillEntry): SkillDetail {
  return {
    name: skill.name,
    description: skill.description,
    source: skill.source,
    bundled: false,
    filePath: skill.filePath,
    baseDir: skill.baseDir,
    skillKey: skill.name,
    always: false,
    disabled: false,
    blockedByAllowlist: false,
    eligible: true,
    requirements: EMPTY_MISSING,
    missing: EMPTY_MISSING,
    configChecks: [],
    install: [],
  };
}

/* ── GET ──────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";

  try {
    if (action === "check") {
      const data = await runCliJson<SkillsCheck>(["skills", "check"]);
      return NextResponse.json(data);
    }

    if (action === "info") {
      const name = searchParams.get("name");
      if (!name)
        return NextResponse.json({ error: "name required" }, { status: 400 });

      let data: SkillDetail;
      try {
        data = await runCliJson<SkillDetail>(["skills", "info", name]);
      } catch (err) {
        const sharedSkill = (await loadSharedSkills()).find((skill) => skill.name === name);
        if (!sharedSkill) throw err;
        data = buildSharedSkillDetail(sharedSkill);
      }

      // Try to read the SKILL.md content for display
      let skillMd: string | null = null;
      if (data.filePath) {
        try {
          const raw = await readFile(data.filePath, "utf-8");
          // Truncate very long files
          skillMd = raw.length > 10000 ? raw.slice(0, 10000) + "\n\n...(truncated)" : raw;
        } catch {
          // file may not be readable
        }
      }

      // Check the config for skill-specific settings
      let skillConfig: Record<string, unknown> | null = null;
      try {
        const configData = await fetchConfig(8000);
        const tools = (configData.resolved.tools || {}) as Record<string, unknown>;
        if (tools[data.skillKey || data.name]) {
          skillConfig = tools[data.skillKey || data.name] as Record<string, unknown>;
        }
      } catch {
        // config not available
      }

      return NextResponse.json({ ...data, skillMd, skillConfig });
    }

    if (action === "config") {
      // Get the full config to see skills/tools section
      try {
        const configData = await fetchConfig(8000);

        return NextResponse.json({
          tools: {
            resolved: configData.resolved.tools || {},
            parsed: configData.parsed.tools || {},
          },
          skills: {
            resolved: configData.resolved.skills || {},
            parsed: configData.parsed.skills || {},
          },
          hash: configData.hash,
        });
      } catch (err) {
        return NextResponse.json({
          tools: { resolved: {}, parsed: {} },
          skills: { resolved: {}, parsed: {} },
          hash: null,
          warning: String(err),
          degraded: true,
        });
      }
    }

    // Default: list all skills
    const data = await runCliJson<SkillsList>(["skills", "list"]);
    const sharedSkills = await loadSharedSkills();
    const existing = new Set(data.skills.map((skill) => skill.name));
    for (const skill of sharedSkills) {
      if (existing.has(skill.name)) continue;
      data.skills.push({
        name: skill.name,
        description: skill.description,
        emoji: "🧰",
        eligible: true,
        disabled: false,
        blockedByAllowlist: false,
        source: skill.source,
        bundled: false,
        missing: { ...EMPTY_MISSING },
      });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Skills API error:", err);
    if (action === "check") {
      return NextResponse.json({
        summary: {
          total: 0,
          eligible: 0,
          disabled: 0,
          blocked: 0,
          missingRequirements: 0,
        },
        eligible: [],
        disabled: [],
        blocked: [],
        missingRequirements: [],
        warning: String(err),
        degraded: true,
      });
    }
    if (action === "list") {
      return NextResponse.json({
        workspaceDir: "",
        managedSkillsDir: "",
        skills: [],
        warning: String(err),
        degraded: true,
      });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/* ── POST: install / enable / disable / config ──── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;

    switch (action) {
      case "install-brew": {
        // Install a binary dependency via brew
        const pkg = body.package as string;
        if (!pkg)
          return NextResponse.json(
            { error: "package required" },
            { status: 400 }
          );
        // Run brew install
        const { execFile } = await import("child_process");
        const { promisify } = await import("util");
        const exec = promisify(execFile);
        try {
          const { stdout, stderr } = await exec("brew", ["install", pkg], {
            timeout: 120000,
          });
          return NextResponse.json({
            ok: true,
            action,
            package: pkg,
            output: stdout + stderr,
          });
        } catch (err: unknown) {
          const e = err as { stderr?: string; message?: string };
          return NextResponse.json(
            {
              error: `brew install failed: ${e.stderr || e.message || String(err)}`,
            },
            { status: 500 }
          );
        }
      }

      case "enable-skill":
      case "disable-skill": {
        // Toggle skill via skills.entries.<name>.enabled
        const name = body.name as string;
        if (!name)
          return NextResponse.json(
            { error: "name required" },
            { status: 400 }
          );

        const enabling = action === "enable-skill";

        try {
          await patchConfig({
            skills: {
              entries: {
                [name]: { enabled: enabling },
              },
            },
          }, { restartDelayMs: 2000 });
          return NextResponse.json({ ok: true, action, name });
        } catch (err) {
          return NextResponse.json({ error: String(err) }, { status: 500 });
        }
      }

      case "update-tool-config": {
        // Patch tools.<skillKey> config
        const skillKey = body.skillKey as string;
        const config = body.config as Record<string, unknown>;
        if (!skillKey || !config)
          return NextResponse.json(
            { error: "skillKey and config required" },
            { status: 400 }
          );

        try {
          await patchConfig({ tools: { [skillKey]: config } });
          return NextResponse.json({ ok: true, action, skillKey });
        } catch (err) {
          return NextResponse.json({ error: String(err) }, { status: 500 });
        }
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Skills POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

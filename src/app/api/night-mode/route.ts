import { NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { exec } from "child_process";
import { join } from "path";

export const dynamic = "force-dynamic";

const WORK_STATE_DIR = process.env.WORK_STATE_DIR || "/home/ubuntu/repos/.work-state";

type IssueHistory = {
  phase: string;
  status: string;
  at: string;
  round?: number;
  extra?: string;
};

type IssueState = {
  version: number;
  issue: number;
  title: string;
  repo: string;
  branch: string;
  baseBranch: string;
  size: string;
  phase: string;
  prUrl?: string;
  merged: boolean;
  startedAt: string;
  updatedAt: string;
  duration?: number;
  history: IssueHistory[];
};

type NightModeState = {
  status: string;
  integrationBranch: string;
  startedAt: string;
  finishedAt?: string;
  issues: number[];
  completed: number[];
  merged: number[];
  failed: number[];
};

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function checkProcessRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    exec("ps aux | grep night-mode | grep -v grep", (err, stdout) => {
      resolve(!err && stdout.trim().length > 0);
    });
  });
}

export async function GET() {
  try {
    const [nightMode, isRunning] = await Promise.all([
      readJson<NightModeState>(join(WORK_STATE_DIR, "night-mode.json")),
      checkProcessRunning(),
    ]);

    // Read all issue-*.json files
    let issueFiles: string[] = [];
    try {
      const files = await readdir(WORK_STATE_DIR);
      issueFiles = files.filter((f) => /^issue-\d+\.json$/.test(f));
    } catch {
      // directory may not exist
    }

    const issues: IssueState[] = [];
    await Promise.all(
      issueFiles.map(async (f) => {
        const data = await readJson<IssueState>(join(WORK_STATE_DIR, f));
        if (data && data.version === 2) {
          issues.push(data);
        }
      }),
    );

    // Sort: in-progress first, then by issue number
    const terminalPhases = new Set(["done", "pr-created", "blocked", "aborted", "failed"]);
    issues.sort((a, b) => {
      const aTerminal = terminalPhases.has(a.phase) ? 1 : 0;
      const bTerminal = terminalPhases.has(b.phase) ? 1 : 0;
      if (aTerminal !== bTerminal) return aTerminal - bTerminal;
      return a.issue - b.issue;
    });

    const stats = {
      total: issues.length,
      completed: issues.filter((i) => i.phase === "done" || i.phase === "pr-created").length,
      failed: issues.filter((i) => i.phase === "failed" || i.phase === "aborted").length,
      blocked: issues.filter((i) => i.phase === "blocked").length,
      inProgress: issues.filter((i) => !terminalPhases.has(i.phase)).length,
      prsCreated: issues.filter((i) => !!i.prUrl).length,
    };

    return NextResponse.json({
      isRunning,
      status: nightMode?.status ?? "unknown",
      integrationBranch: nightMode?.integrationBranch ?? null,
      startedAt: nightMode?.startedAt ?? null,
      finishedAt: nightMode?.finishedAt ?? null,
      issues,
      stats,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const ISSUE_LOG_DIR = process.env.ISSUE_LOG_DIR || "/tmp";
const MAX_LINES = 200;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const issue = searchParams.get("issue");

  if (!issue || !/^\d+$/.test(issue)) {
    return NextResponse.json({ error: "issue parameter required (numeric)" }, { status: 400 });
  }

  const logPath = join(ISSUE_LOG_DIR, `claude-issue-${issue}.log`);

  try {
    await stat(logPath);
  } catch {
    return NextResponse.json({ issue: Number(issue), lines: [], exists: false });
  }

  try {
    const content = await readFile(logPath, "utf-8");
    const allLines = content.split("\n");
    const lines = allLines.slice(-MAX_LINES);
    return NextResponse.json({ issue: Number(issue), lines, exists: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getGitHubAccessToken } from "@/lib/github";
import { listBranches } from "@/lib/github-api";

export async function GET(request: Request, { params }: { params: Promise<{ owner: string; repo: string }> }) {
  try {
    const { owner, repo } = await params;
    const token = await getGitHubAccessToken();
    const branches = await listBranches(owner, repo, token);
    return NextResponse.json({ branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to load branches." }, { status: 500 });
  }
}

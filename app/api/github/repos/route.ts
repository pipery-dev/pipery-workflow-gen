import { NextResponse } from "next/server";
import { getGitHubAccessToken } from "@/lib/github";
import { listRepos } from "@/lib/github-api";

export async function GET() {
  try {
    const token = await getGitHubAccessToken();
    const repos = await listRepos(token);
    return NextResponse.json({ repos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to load repositories." }, { status: 500 });
  }
}

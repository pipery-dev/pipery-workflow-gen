import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listGitLabProjects } from "@/lib/gitlab-api";

export async function GET() {
  try {
    const token = await getProviderAccessToken("gitlab");
    const repos = await listGitLabProjects(token);
    return NextResponse.json({ repos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to load GitLab projects." }, { status: 500 });
  }
}

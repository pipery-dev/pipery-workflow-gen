import { NextResponse, NextRequest } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listGitLabBranches } from "@/lib/gitlab-api";

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId." }, { status: 400 });
    }

    const token = await getProviderAccessToken("gitlab");
    const branches = await listGitLabBranches(projectId, token);
    return NextResponse.json({ branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to load GitLab branches." }, { status: 500 });
  }
}

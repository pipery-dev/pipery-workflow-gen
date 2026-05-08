import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listBitbucketBranches } from "@/lib/bitbucket-api";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const workspace = searchParams.get("workspace");
    const repo = searchParams.get("repo");
    if (!workspace || !repo) {
      return NextResponse.json({ error: "Missing workspace or repo." }, { status: 400 });
    }

    const token = await getProviderAccessToken("bitbucket");
    const branches = await listBitbucketBranches(workspace, repo, token);
    return NextResponse.json({ branches });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, "Unable to load Bitbucket branches.") }, { status: 500 });
  }
}

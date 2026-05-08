import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listBitbucketRepos } from "@/lib/bitbucket-api";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET() {
  try {
    const token = await getProviderAccessToken("bitbucket");
    const repos = await listBitbucketRepos(token);
    return NextResponse.json({ repos });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, "Unable to load Bitbucket repositories.") }, { status: 500 });
  }
}

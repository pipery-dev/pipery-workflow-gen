import { NextRequest, NextResponse } from "next/server";
import { PiperyProvider, PIPERY_PROVIDERS } from "@/lib/auth";
import { getProviderAccessToken } from "@/lib/github";

const providerApiBase: Record<PiperyProvider, string> = {
  github: "https://api.github.com",
  gitlab: process.env.GITLAB_API_BASE || "https://gitlab.com/api/v4",
  bitbucket: process.env.BITBUCKET_API_BASE || "https://api.bitbucket.org/2.0"
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function labelFromActionId(actionId: string) {
  return stripActionRef(actionId).split("/").at(-1)?.replace(/^pipery-/, "") || actionId;
}

function stripActionRef(actionId: string) {
  const at = actionId.lastIndexOf("@");
  return at > 0 ? actionId.slice(0, at) : actionId;
}

async function resolveAction(provider: PiperyProvider, actionId: string, token: string) {
  if (provider === "github") {
    const [owner, repo] = stripActionRef(actionId).split("/");
    if (!owner || !repo) throw new Error("GitHub actions must use owner/repo.");
    const response = await fetch(`${providerApiBase.github}/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
    });
    if (!response.ok) throw new Error(`GitHub could not access ${actionId}.`);
    const data = await response.json();
    return { provider, actionId, label: data.name || labelFromActionId(actionId), url: data.html_url };
  }

  if (provider === "gitlab") {
    const projectId = stripActionRef(actionId);
    const response = await fetch(`${providerApiBase.gitlab}/projects/${encodeURIComponent(projectId)}`, {
      headers: { "PRIVATE-TOKEN": token }
    });
    if (!response.ok) throw new Error(`GitLab could not access ${actionId}.`);
    const data = await response.json();
    return { provider, actionId, label: data.name || labelFromActionId(actionId), url: data.web_url };
  }

  const [workspace, repo] = stripActionRef(actionId).split("/");
  if (!workspace || !repo) throw new Error("Bitbucket actions must use workspace/repo.");
  const response = await fetch(`${providerApiBase.bitbucket}/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Bitbucket could not access ${actionId}.`);
  const data = await response.json();
  return { provider, actionId, label: data.name || data.slug || labelFromActionId(actionId), url: data.links?.html?.href };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = PIPERY_PROVIDERS.includes(body.provider) ? (body.provider as PiperyProvider) : null;
    const actionId = typeof body.actionId === "string" ? body.actionId.trim() : "";

    if (!provider || !actionId) {
      return NextResponse.json({ error: "Missing provider or actionId." }, { status: 400 });
    }

    const token = await getProviderAccessToken(provider);
    return NextResponse.json(await resolveAction(provider, actionId, token));
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, "Unable to import action.") }, { status: 400 });
  }
}

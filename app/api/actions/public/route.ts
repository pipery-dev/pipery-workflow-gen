import { NextRequest, NextResponse } from "next/server";
import type { WorkflowPlatform } from "@/lib/workflow-generator";

type GitHubRepository = {
  full_name: string;
  name: string;
  description: string | null;
  stargazers_count: number;
  default_branch: string;
};

type GitHubSearchResponse = {
  items?: GitHubRepository[];
};

type PublicAction = {
  actionId: string;
  label: string;
  description: string;
  stars: number;
  provider: WorkflowPlatform;
};

function searchTerm(request: NextRequest) {
  return request.nextUrl.searchParams.get("q")?.trim() || "action";
}

function providerParam(request: NextRequest): WorkflowPlatform {
  const provider = request.nextUrl.searchParams.get("provider");
  return provider === "gitlab" || provider === "bitbucket" ? provider : "github";
}

function matchesSearch(action: PublicAction, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized || normalized === "action") return true;
  return [action.label, action.actionId, action.description].some(value => value.toLowerCase().includes(normalized));
}

function fallbackActions(provider: WorkflowPlatform): PublicAction[] {
  if (provider === "gitlab") {
    return [
      { provider, actionId: "gitlab-org/ci-cd/catalog/to-be-selected", label: "GitLab Catalog Component", description: "Select a GitLab CI/CD catalog component from gitlab.com/explore/catalog.", stars: 0 },
      { provider, actionId: "gitlab-org/ci-cd/catalog/security-scan", label: "Security Scan Component", description: "Placeholder for a GitLab catalog security scan component.", stars: 0 },
      { provider, actionId: "gitlab-org/ci-cd/catalog/container-build", label: "Container Build Component", description: "Placeholder for a GitLab catalog container build component.", stars: 0 }
    ];
  }
  if (provider === "bitbucket") {
    return [
      { provider, actionId: "bitbucket/pipelines/integration", label: "Bitbucket Pipeline Integration", description: "Select an integration from bitbucket.org/product/features/pipelines/integrations.", stars: 0 },
      { provider, actionId: "bitbucket/pipelines/docker", label: "Docker Pipeline Integration", description: "Placeholder for a Bitbucket Docker pipeline integration.", stars: 0 },
      { provider, actionId: "bitbucket/pipelines/deploy", label: "Deployment Integration", description: "Placeholder for a Bitbucket deployment integration.", stars: 0 }
    ];
  }
  return [];
}

function textBetweenTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function searchGitHub(query: string): Promise<PublicAction[]> {
  const q = encodeURIComponent(`${query || "action"} topic:github-action`);
  const response = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=12`, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: 300 }
  });

  if (!response.ok) throw new Error(await response.text() || "Unable to search GitHub Marketplace actions.");

  const data = await response.json() as GitHubSearchResponse;
  return (data.items || []).map(repo => ({
    provider: "github",
    actionId: `${repo.full_name}@${repo.default_branch || "main"}`,
    label: repo.name,
    description: repo.description || "",
    stars: repo.stargazers_count || 0
  }));
}

async function scrapeCatalog(provider: WorkflowPlatform, query: string, url: string): Promise<PublicAction[]> {
  const response = await fetch(url, {
    headers: { Accept: "text/html" },
    next: { revalidate: 3600 }
  });

  if (!response.ok) return fallbackActions(provider).filter(action => matchesSearch(action, query));

  const html = await response.text();
  const anchors = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
  const seen = new Set<string>();
  const actions: PublicAction[] = [];

  for (const [, href, body] of anchors) {
    const label = textBetweenTags(body);
    if (!label || label.length > 80) continue;
    if (provider === "gitlab" && !href.includes("/-/catalog/") && !href.includes("/components/") && !href.includes("/explore/catalog")) continue;
    if (provider === "bitbucket" && !href.toLowerCase().includes("pipeline") && !label.toLowerCase().includes("pipeline")) continue;
    const absolute = href.startsWith("http") ? href : provider === "gitlab" ? `https://gitlab.com${href}` : `https://bitbucket.org${href}`;
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    actions.push({
      provider,
      actionId: absolute,
      label,
      description: provider === "gitlab" ? "GitLab CI/CD catalog component." : "Bitbucket Pipelines integration.",
      stars: 0
    });
    if (actions.length >= 12) break;
  }

  const result = actions.length ? actions : fallbackActions(provider);
  return result.filter(action => matchesSearch(action, query));
}

export async function GET(request: NextRequest) {
  try {
    const provider = providerParam(request);
    const query = searchTerm(request);
    const actions = provider === "github"
      ? await searchGitHub(query)
      : await scrapeCatalog(
          provider,
          query,
          provider === "gitlab" ? "https://gitlab.com/explore/catalog" : "https://bitbucket.org/product/features/pipelines/integrations"
        );

    return NextResponse.json({ actions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search public actions." }, { status: 500 });
  }
}

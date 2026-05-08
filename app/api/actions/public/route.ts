import { NextRequest, NextResponse } from "next/server";

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

function searchTerm(request: NextRequest) {
  return request.nextUrl.searchParams.get("q")?.trim() || "github action";
}

export async function GET(request: NextRequest) {
  try {
    const q = encodeURIComponent(`${searchTerm(request)} topic:github-action`);
    const response = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=12`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text || "Unable to search public GitHub actions." }, { status: response.status });
    }

    const data = await response.json() as GitHubSearchResponse;
    return NextResponse.json({
      actions: (data.items || []).map(repo => ({
        actionId: `${repo.full_name}@${repo.default_branch || "main"}`,
        label: repo.name,
        description: repo.description || "",
        stars: repo.stargazers_count || 0
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search public GitHub actions." }, { status: 500 });
  }
}

import { NextResponse, NextRequest } from "next/server";
import { getGitHubAccessToken, getProviderAccessToken } from "@/lib/github";
import { generateWorkflow, WorkflowConfig } from "@/lib/workflow-generator";
import { createWorkflowPR } from "@/lib/github-api";
import { createWorkflowMR } from "@/lib/gitlab-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform = "github", owner, repo, workflowName, ...config } = body;

    console.log("[CREATE-PR] Request:", { platform, owner, repo, workflowName, configKeys: Object.keys(config) });

    if (platform === "bitbucket") {
      return NextResponse.json(
        { error: "Bitbucket Cloud build plan generation is supported, but Bitbucket PR creation is not implemented yet. Download bitbucket-pipelines.yml and add it manually." },
        { status: 400 }
      );
    }

    if ((!owner && platform === "github") || !repo || !workflowName) {
      console.error("[CREATE-PR] Missing required fields:", { owner, repo, workflowName });
      return NextResponse.json(
        { error: "Missing required fields: owner, repo/project, or workflowName" },
        { status: 400 }
      );
    }

    const yamlContent = generateWorkflow({ platform, workflowName, ...config } as WorkflowConfig);
    console.log("[CREATE-PR] Generated YAML length:", yamlContent.length);

    const result = platform === "gitlab"
      ? await createWorkflowMR({
          projectId: repo,
          workflowName,
          yamlContent,
          token: await getProviderAccessToken("gitlab")
        })
      : await createWorkflowPR({
          owner,
          repo,
          workflowName,
          yamlContent,
          token: await getGitHubAccessToken()
        });

    console.log("[CREATE-PR] Success:", result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[CREATE-PR] Error:", error);
    console.error("[CREATE-PR] Error stack:", error.stack);
    return NextResponse.json(
      {
        error: error.message || "Failed to create PR.",
        details: error.response?.status || "Unknown"
      },
      { status: 500 }
    );
  }
}

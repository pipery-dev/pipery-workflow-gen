import { NextResponse, NextRequest } from "next/server";
import { getGitHubAccessToken } from "@/lib/github";
import { generateWorkflow, WorkflowConfig } from "@/lib/workflow-generator";
import { createWorkflowPR } from "@/lib/github-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, workflowName, ...config } = body;

    console.log("[CREATE-PR] Request:", { owner, repo, workflowName, configKeys: Object.keys(config) });

    if (!owner || !repo || !workflowName) {
      console.error("[CREATE-PR] Missing required fields:", { owner, repo, workflowName });
      return NextResponse.json(
        { error: "Missing required fields: owner, repo, or workflowName" },
        { status: 400 }
      );
    }

    const token = await getGitHubAccessToken();
    console.log("[CREATE-PR] Got GitHub token");

    const yamlContent = generateWorkflow(config as WorkflowConfig);
    console.log("[CREATE-PR] Generated YAML length:", yamlContent.length);

    const result = await createWorkflowPR({ owner, repo, workflowName, yamlContent, token });

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

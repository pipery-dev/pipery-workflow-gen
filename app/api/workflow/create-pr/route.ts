import { NextResponse, NextRequest } from "next/server";
import { getGitHubAccessToken } from "@/lib/github";
import { generateWorkflow, WorkflowConfig } from "@/lib/workflow-generator";
import { createWorkflowPR } from "@/lib/github-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, workflowName, ...config } = body;

    const token = await getGitHubAccessToken();
    const yamlContent = generateWorkflow(config as WorkflowConfig);
    const result = await createWorkflowPR({ owner, repo, workflowName, yamlContent, token });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create PR." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { loadWorkflowTemplates } from "@/lib/workflow-template-loader";

export async function GET() {
  try {
    const workflows = await loadWorkflowTemplates();
    return NextResponse.json({ workflows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load workflow templates." },
      { status: 500 }
    );
  }
}

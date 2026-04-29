import { NextResponse, NextRequest } from "next/server";
import { generateWorkflow } from "@/lib/workflow-generator";

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    const yaml = generateWorkflow(config);
    return NextResponse.json({ yaml });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate workflow." }, { status: 400 });
  }
}

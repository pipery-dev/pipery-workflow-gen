import { readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type { WorkflowStageConfig } from "./workflow-generator";

export type WorkflowTemplatePreset = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  workflowName: string;
  stages: WorkflowStageConfig[];
};

type WorkflowTemplateFile = {
  workflows?: WorkflowTemplatePreset[];
};

function templatesPath() {
  return path.join(process.cwd(), "lib", "workflow-templates.yaml");
}

export async function loadWorkflowTemplates(filePath = templatesPath()) {
  const contents = await readFile(filePath, "utf8");
  const parsed = yaml.load(contents) as WorkflowTemplateFile | WorkflowTemplatePreset[] | null;
  const workflows = Array.isArray(parsed) ? parsed : parsed?.workflows;

  if (!Array.isArray(workflows)) {
    throw new Error("Workflow template YAML must contain a workflows list.");
  }

  return workflows;
}

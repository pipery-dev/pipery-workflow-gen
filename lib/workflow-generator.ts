import yaml from "js-yaml";
import { CI_ACTIONS, CD_ACTIONS, ActionInput } from "./action-catalog";

export interface WorkflowConfig {
  language: string;
  ciValues: Record<string, string>;
  cdKey: string | null;
  cdValues: Record<string, string>;
  workflowName: string;
  triggers: { pushBranches: string[]; pullRequest: boolean };
}

function buildWith(inputs: ActionInput[], userValues: Record<string, string>) {
  const result: Record<string, string> = {};
  for (const input of inputs) {
    const val = userValues[input.name] ?? input.default;
    if (val !== "") {
      result[input.name] = val;
    }
  }
  return Object.keys(result).length ? result : undefined;
}

export function generateWorkflow(config: WorkflowConfig): string {
  const ci = CI_ACTIONS[config.language];
  if (!ci) throw new Error(`Unknown language: ${config.language}`);

  const cd = config.cdKey ? CD_ACTIONS[config.cdKey] : null;

  const on: Record<string, unknown> = {};
  if (config.triggers.pushBranches.length > 0) {
    on.push = { branches: config.triggers.pushBranches };
  }
  if (config.triggers.pullRequest) {
    on.pull_request = {};
  }

  const ciSteps: any[] = [
    { uses: "actions/checkout@v5" },
    {
      name: `${ci.label} CI`,
      uses: `${ci.actionId}@v1`,
      with: buildWith(ci.inputs, config.ciValues)
    }
  ].filter(s => s.with !== undefined || s.uses);

  const jobs: Record<string, unknown> = {
    ci: {
      "runs-on": "ubuntu-latest",
      permissions: { contents: "write", packages: "write" },
      steps: ciSteps
    }
  };

  if (cd) {
    const cdSteps: any[] = [
      { uses: "actions/checkout@v5" },
      {
        name: `${cd.label} CD`,
        uses: `${cd.actionId}@v1`,
        with: buildWith(cd.inputs, config.cdValues)
      }
    ].filter(s => s.with !== undefined || s.uses);

    jobs.cd = {
      needs: "ci",
      "runs-on": "ubuntu-latest",
      if: config.triggers.pushBranches.length > 0
        ? `github.ref == 'refs/heads/${config.triggers.pushBranches[0]}'`
        : undefined,
      steps: cdSteps
    };
  }

  const workflow = {
    name: config.workflowName || `Pipery ${ci.label} Pipeline`,
    on: Object.keys(on).length > 0 ? on : undefined,
    jobs
  };

  return yaml.dump(workflow, { lineWidth: -1, noRefs: true, quotingType: '"' });
}

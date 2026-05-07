import yaml from "js-yaml";
import { CI_ACTIONS, CD_ACTIONS, ActionInput } from "./action-catalog";

export type WorkflowPlatform = "github" | "gitlab" | "bitbucket";

export interface WorkflowConfig {
  platform?: WorkflowPlatform;
  language: string;
  ciValues: Record<string, string>;
  cdKey: string | null;
  cdValues: Record<string, string>;
  workflowName: string;
  triggers: { pushBranches: string[]; pullRequest: boolean };
}

export function workflowFilePath(config: Pick<WorkflowConfig, "platform" | "workflowName">): string {
  const platform = config.platform || "github";
  if (platform === "gitlab") return ".gitlab-ci.yml";
  if (platform === "bitbucket") return "bitbucket-pipelines.yml";
  return `.github/workflows/${config.workflowName || "pipery"}.yml`;
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
  const platform = config.platform || "github";
  if (platform === "gitlab") {
    return generateGitLabCi(config);
  }
  if (platform === "bitbucket") {
    return generateBitbucketPipelines(config);
  }
  return generateGitHubActions(config);
}

function generateGitHubActions(config: WorkflowConfig): string {
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
  if (Object.keys(on).length === 0) {
    on.workflow_dispatch = {};
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
        : "github.event_name != 'pull_request'",
      steps: cdSteps
    };
  }

  const workflow = {
    name: config.workflowName || `Pipery ${ci.label} Pipeline`,
    on,
    jobs
  };

  return yaml.dump(workflow, { lineWidth: -1, noRefs: true, quotingType: '"' });
}

function toGitLabVariables(inputs: ActionInput[], userValues: Record<string, string>) {
  const variables: Record<string, string> = {};
  for (const input of inputs) {
    const val = userValues[input.name] ?? input.default;
    if (val !== "") {
      variables[input.name.toUpperCase()] = val
        .replaceAll("${{ github.sha }}", "$CI_COMMIT_SHA")
        .replaceAll("${{ secrets.GITHUB_TOKEN }}", "$GITHUB_TOKEN");
    }
  }
  return variables;
}

function mergeGitLabVariables(
  base: Record<string, string>,
  inputs: ActionInput[],
  userValues: Record<string, string>
) {
  const variables = { ...base };
  const values = toGitLabVariables(inputs, userValues);

  for (const [key, value] of Object.entries(values)) {
    if (Object.prototype.hasOwnProperty.call(userValues, key.toLowerCase()) || variables[key] === undefined) {
      variables[key] = value;
    }
  }

  return variables;
}

function generateGitLabCi(config: WorkflowConfig): string {
  const ci = CI_ACTIONS[config.language];
  if (!ci) throw new Error(`Unknown language: ${config.language}`);

  const cd = config.cdKey ? CD_ACTIONS[config.cdKey] : null;
  const includes: any[] = [
    { remote: `https://raw.githubusercontent.com/${ci.actionId}/v1/.gitlab-ci.yml` }
  ];

  if (cd) {
    includes.push({ remote: `https://raw.githubusercontent.com/${cd.actionId}/v1/.gitlab-ci.yml` });
  }

  const workflowRules: any[] = [];
  if (config.triggers.pullRequest) {
    workflowRules.push({ if: "$CI_PIPELINE_SOURCE == \"merge_request_event\"" });
  }
  if (config.triggers.pushBranches.length > 0) {
    workflowRules.push({
      if: `$CI_COMMIT_BRANCH =~ /^(${config.triggers.pushBranches.join("|")})$/`
    });
  }
  workflowRules.push({ when: "never" });

  const variables = cd
    ? mergeGitLabVariables(toGitLabVariables(ci.inputs, config.ciValues), cd.inputs, config.cdValues)
    : toGitLabVariables(ci.inputs, config.ciValues);

  const pipeline = {
    include: includes,
    workflow: { rules: workflowRules },
    variables
  };

  return yaml.dump(pipeline, { lineWidth: -1, noRefs: true, quotingType: '"' });
}

function bitbucketImportSource(actionId: string) {
  return actionId.split("/")[1] || actionId;
}

function bitbucketPipelineName(actionId: string) {
  return bitbucketImportSource(actionId);
}

function generateBitbucketPipelines(config: WorkflowConfig): string {
  const ci = CI_ACTIONS[config.language];
  if (!ci) throw new Error(`Unknown language: ${config.language}`);

  const cd = config.cdKey ? CD_ACTIONS[config.cdKey] : null;
  const ciSource = bitbucketImportSource(ci.actionId);
  const imports: Record<string, string> = {
    [ciSource]: `${ciSource}:master`
  };

  if (cd) {
    const cdSource = bitbucketImportSource(cd.actionId);
    imports[cdSource] = `${cdSource}:master`;
  }

  const ciImport = `${bitbucketPipelineName(ci.actionId)}@${ciSource}`;
  const cdImport = cd ? `${bitbucketPipelineName(cd.actionId)}@${bitbucketImportSource(cd.actionId)}` : undefined;
  const pipelines: Record<string, unknown> = {};

  if (config.triggers.pushBranches.length > 0) {
    pipelines.branches = Object.fromEntries(
      config.triggers.pushBranches.map(branch => [branch, { import: ciImport }])
    );
  }

  if (config.triggers.pullRequest) {
    pipelines["pull-requests"] = {
      "**": { import: ciImport }
    };
  }

  if (cdImport) {
    pipelines.custom = {
      [`deploy-${config.cdKey}`]: { import: cdImport }
    };
  }

  const pipeline = {
    definitions: {
      imports
    },
    pipelines: Object.keys(pipelines).length > 0 ? pipelines : { default: { import: ciImport } }
  };

  return yaml.dump(pipeline, { lineWidth: -1, noRefs: true, quotingType: '"' });
}

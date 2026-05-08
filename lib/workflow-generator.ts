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
  graphStages?: WorkflowStageConfig[];
}

export type WorkflowStageType = "ci" | "cd";

export interface WorkflowStage {
  id: string;
  type: WorkflowStageType;
  actionKey: string;
  actionId: string;
  actionProvider?: WorkflowPlatform;
  label: string;
  icon: string;
  sourcePath: string;
  values: Record<string, string>;
  dependsOn: string[];
}

export interface WorkflowStageConfig {
  id?: string;
  type: WorkflowStageType;
  actionKey: string;
  actionId?: string;
  actionProvider?: WorkflowPlatform;
  label?: string;
  icon?: string;
  sourcePath?: string;
  values: Record<string, string>;
  dependsOn?: string[];
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

function actionInputs(stage: WorkflowStage): ActionInput[] {
  const catalog = stage.type === "ci" ? CI_ACTIONS : CD_ACTIONS;
  const action = catalog[stage.actionKey];
  return action?.inputs || [
    { name: "project_path", description: "Path to the source tree.", default: ".", basic: true }
  ];
}

function stageValues(stage: WorkflowStage) {
  return buildWith(actionInputs(stage), {
    ...stage.values,
    project_path: stage.sourcePath || stage.values.project_path || "."
  });
}

function legacyStages(config: WorkflowConfig): WorkflowStage[] {
  const ci = CI_ACTIONS[config.language];
  if (!ci) throw new Error(`Unknown language: ${config.language}`);

  const stages: WorkflowStage[] = [
    {
      id: "ci",
      type: "ci",
      actionKey: config.language,
      actionId: ci.actionId,
      actionProvider: "github",
      label: `${ci.label} CI`,
      icon: ci.icon,
      sourcePath: config.ciValues.project_path || ".",
      values: config.ciValues,
      dependsOn: []
    }
  ];

  if (config.cdKey) {
    const cd = CD_ACTIONS[config.cdKey];
    if (cd) {
      stages.push({
        id: "cd",
        type: "cd",
        actionKey: config.cdKey,
        actionId: cd.actionId,
        actionProvider: "github",
        label: `${cd.label} CD`,
        icon: cd.icon,
        sourcePath: config.cdValues.project_path || config.ciValues.project_path || ".",
        values: config.cdValues,
        dependsOn: ["ci"]
      });
    }
  }

  return stages;
}

function resolveGraphStage(stage: WorkflowStageConfig, index: number, previousStage?: WorkflowStage): WorkflowStage {
  const catalog = stage.type === "ci" ? CI_ACTIONS : CD_ACTIONS;
  const action = catalog[stage.actionKey];
  if (!action && !stage.actionId) throw new Error(`Unknown ${stage.type.toUpperCase()} stage: ${stage.actionKey}`);

  return {
    ...stage,
    id: stage.id || `${stage.type}-${stage.actionKey}-${index + 1}`,
    actionId: stage.actionId || action!.actionId,
    actionProvider: stage.actionProvider || "github",
    label: stage.label || `${action?.label || stage.actionKey} ${stage.type.toUpperCase()}`,
    icon: stage.icon || action?.icon || stage.type.toUpperCase(),
    sourcePath: stage.sourcePath || stage.values.project_path || ".",
    dependsOn: stage.dependsOn || (previousStage ? [previousStage.id] : [])
  };
}

function graphStages(config: WorkflowConfig): WorkflowStage[] {
  if (!config.graphStages?.length) return legacyStages(config);

  return config.graphStages.reduce<WorkflowStage[]>((acc, stage, index) => {
    acc.push(resolveGraphStage(stage, index, acc[index - 1]));
    return acc;
  }, []);
}

function safeJobId(stage: WorkflowStage, index: number) {
  return (stage.id || `${stage.type}-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function jobIdMap(stages: WorkflowStage[]) {
  return new Map(stages.map((stage, index) => [stage.id, safeJobId(stage, index)]));
}

function actionWithDefaultRef(actionId: string, defaultRef = "v1") {
  return actionId.includes("@") ? actionId : `${actionId}@${defaultRef}`;
}

function actionRepoAndRef(actionId: string, defaultRef = "v1") {
  const at = actionId.lastIndexOf("@");
  if (at > 0) {
    return { repo: actionId.slice(0, at), ref: actionId.slice(at + 1) };
  }
  return { repo: actionId, ref: defaultRef };
}

function gitLabIncludeFor(stage: WorkflowStage) {
  const { repo, ref } = actionRepoAndRef(stage.actionId);
  if (stage.actionProvider === "gitlab") {
    return { remote: `https://gitlab.com/${repo}/-/raw/${ref}/.gitlab-ci.yml` };
  }
  if (stage.actionProvider === "bitbucket") {
    return { remote: `https://bitbucket.org/${repo}/raw/${ref}/.gitlab-ci.yml` };
  }
  return { remote: `https://raw.githubusercontent.com/${repo}/${ref}/.gitlab-ci.yml` };
}

function toBitbucketVariables(stage: WorkflowStage) {
  const values = stageValues(stage);
  if (!values) return undefined;
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toUpperCase(), value]));
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
  const stages = graphStages(config);
  const firstStage = stages[0];
  const jobIds = jobIdMap(stages);

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

  const jobs = Object.fromEntries(stages.map((stage, index) => {
    const jobId = safeJobId(stage, index);
    const needs = stage.dependsOn.map(id => jobIds.get(id)).filter(Boolean);
    const job: Record<string, unknown> = {
      "runs-on": "ubuntu-latest",
      steps: [
        { uses: "actions/checkout@v5" },
        {
          name: stage.label,
          uses: actionWithDefaultRef(stage.actionId),
          with: stageValues(stage)
        }
      ].filter((step: any) => step.with !== undefined || step.uses)
    };
    if (stage.type === "ci") {
      job.permissions = { contents: "write", packages: "write" };
    }
    if (needs.length > 0) job.needs = needs.length === 1 ? needs[0] : needs;
    if (stage.type === "cd") {
      job.if = config.triggers.pushBranches.length > 0
        ? `github.ref == 'refs/heads/${config.triggers.pushBranches[0]}'`
        : "github.event_name != 'pull_request'";
    }
    return [jobId, job];
  }));
  const legacyWorkflowLabel = CI_ACTIONS[config.language]?.label || firstStage?.label || "Workflow";

  const workflow = {
    name: config.workflowName || (
      config.graphStages?.length
        ? `Pipery ${firstStage?.label || "Workflow"}`
        : `Pipery ${legacyWorkflowLabel} Pipeline`
    ),
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
  const stages = graphStages(config);
  const includes: any[] = stages.map(gitLabIncludeFor);

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

  if (config.graphStages?.length) {
    const jobIds = jobIdMap(stages);
    const jobs = Object.fromEntries(stages.map((stage, index) => {
      const jobId = safeJobId(stage, index);
      const needs = stage.dependsOn.map(id => jobIds.get(id)).filter(Boolean);
      const job: Record<string, unknown> = {
        stage: jobId,
        trigger: {
          include: gitLabIncludeFor(stage),
          strategy: "depend"
        },
        variables: toGitLabVariables(actionInputs(stage), {
          ...stage.values,
          project_path: stage.sourcePath || stage.values.project_path || "."
        })
      };
      if (needs.length > 0) job.needs = needs;
      return [jobId, job];
    }));

    return yaml.dump({
      workflow: { rules: workflowRules },
      stages: stages.map((stage, index) => safeJobId(stage, index)),
      ...jobs
    }, { lineWidth: -1, noRefs: true, quotingType: '"' });
  }

  const variables = stages.reduce<Record<string, string>>((acc, stage) => (
    mergeGitLabVariables(acc, actionInputs(stage), { ...stage.values, project_path: stage.sourcePath || stage.values.project_path || "." })
  ), {});

  const pipeline = {
    include: includes,
    workflow: { rules: workflowRules },
    variables
  };

  return yaml.dump(pipeline, { lineWidth: -1, noRefs: true, quotingType: '"' });
}

function bitbucketImportSource(actionId: string) {
  const { repo } = actionRepoAndRef(actionId, "master");
  return repo.split("/")[1] || repo;
}

function bitbucketPipelineName(actionId: string) {
  return bitbucketImportSource(actionId);
}

function generateBitbucketPipelines(config: WorkflowConfig): string {
  const stages = graphStages(config);
  const ciStages = stages.filter(stage => stage.type === "ci");
  const cdStages = stages.filter(stage => stage.type === "cd");
  const imports = Object.fromEntries(
    stages.map(stage => {
      const { ref } = actionRepoAndRef(stage.actionId, "master");
      const source = bitbucketImportSource(stage.actionId);
      return [source, `${source}:${ref}`];
    })
  );

  const stageImport = (stage: WorkflowStage) => {
    const source = bitbucketImportSource(stage.actionId);
    return `${bitbucketPipelineName(stage.actionId)}@${source}`;
  };
  const stageStep = (stage: WorkflowStage) => {
    const variables = toBitbucketVariables(stage);
    return {
      step: {
        name: stage.label,
        import: stageImport(stage),
        ...(variables ? { variables } : {})
      }
    };
  };
  const importStep = (stage: WorkflowStage) => (
    config.graphStages?.length
      ? { import: stageImport(stage), ...(toBitbucketVariables(stage) ? { variables: toBitbucketVariables(stage) } : {}) }
      : { import: stageImport(stage) }
  );
  const pipelines: Record<string, unknown> = {};
  const stagePipeline = stages.length === 1
    ? importStep(stages[0])
    : stages.map(stageStep);
  const ciPipeline = ciStages.length === 1
    ? importStep(ciStages[0])
    : ciStages.map(stageStep);
  const branchPipeline = config.graphStages?.length ? stagePipeline : ciPipeline;

  if (config.triggers.pushBranches.length > 0) {
    pipelines.branches = Object.fromEntries(
      config.triggers.pushBranches.map(branch => [branch, branchPipeline])
    );
  }

  if (config.triggers.pullRequest) {
    pipelines["pull-requests"] = {
      "**": ciPipeline
    };
  }

  if (cdStages.length > 0) {
    pipelines.custom = {
      ...Object.fromEntries(cdStages.map(stage => [`deploy-${stage.actionKey}`, { import: stageImport(stage) }]))
    };
  }

  const pipeline = {
    definitions: {
      imports
    },
    pipelines: Object.keys(pipelines).length > 0 ? pipelines : { default: branchPipeline }
  };

  return yaml.dump(pipeline, { lineWidth: -1, noRefs: true, quotingType: '"' });
}

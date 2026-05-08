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

export type WorkflowStageType = "source" | "ci" | "cd";

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
  actionKey?: string;
  actionId?: string;
  actionProvider?: WorkflowPlatform;
  label?: string;
  icon?: string;
  sourcePath?: string;
  values?: Record<string, string>;
  dependsOn?: string[];
}

export interface WorkflowTemplate {
  platform?: WorkflowPlatform;
  workflowName?: string;
  language?: string;
  ciValues?: Record<string, string>;
  cdKey?: string | null;
  cdValues?: Record<string, string>;
  triggers?: Partial<WorkflowConfig["triggers"]>;
  stages?: WorkflowStageConfig[];
  graphStages?: WorkflowStageConfig[];
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
  if (stage.type === "source") {
    return [
      { name: "repository", description: "Optional owner/repo to checkout instead of the current repository.", default: "", basic: true },
      { name: "ref", description: "Optional branch, tag, or SHA to checkout.", default: "", basic: true },
      { name: "path", description: "Directory where the source should be checked out.", default: ".", basic: true },
      { name: "fetch-depth", description: "Number of commits to fetch. Use 0 for full history.", default: "1", basic: false },
      { name: "token", description: "Token used to fetch private source repositories.", default: "", basic: false, secret: true }
    ];
  }
  const catalog = stage.type === "ci" ? CI_ACTIONS : CD_ACTIONS;
  const action = catalog[stage.actionKey];
  return action?.inputs || [
    { name: "project_path", description: "Path to the source tree.", default: ".", basic: true }
  ];
}

function stageValues(stage: WorkflowStage) {
  if (stage.type === "source") {
    return buildWith(actionInputs(stage), {
      ...stage.values,
      path: stage.sourcePath || stage.values.path || "."
    });
  }

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
  const values = stage.values || {};
  if (stage.type === "source") {
    return {
      id: stage.id || `source-checkout-${index + 1}`,
      type: "source",
      actionKey: stage.actionKey || "checkout",
      actionId: stage.actionId || "actions/checkout",
      actionProvider: stage.actionProvider || "github",
      label: stage.label || "Source Checkout",
      icon: stage.icon || "SRC",
      sourcePath: stage.sourcePath || values.path || ".",
      values,
      dependsOn: stage.dependsOn || (previousStage ? [previousStage.id] : [])
    };
  }

  const catalog = stage.type === "ci" ? CI_ACTIONS : CD_ACTIONS;
  const actionKey = stage.actionKey || "";
  const action = catalog[actionKey];
  if (!action && !stage.actionId) throw new Error(`Unknown ${stage.type.toUpperCase()} stage: ${actionKey}`);

  return {
    ...stage,
    id: stage.id || `${stage.type}-${actionKey}-${index + 1}`,
    actionKey,
    actionId: stage.actionId || action!.actionId,
    actionProvider: stage.actionProvider || "github",
    label: stage.label || `${action?.label || actionKey} ${stage.type.toUpperCase()}`,
    icon: stage.icon || action?.icon || stage.type.toUpperCase(),
    sourcePath: stage.sourcePath || values.project_path || ".",
    values,
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

function checkoutStep(stage?: WorkflowStage) {
  if (!stage) return { uses: "actions/checkout@v5" };
  return {
    name: stage.label,
    uses: actionWithDefaultRef(stage.actionId, "v5"),
    with: stageValues(stage)
  };
}

function sourceDependencies(stage: WorkflowStage, stages: WorkflowStage[]) {
  const byId = new Map(stages.map(item => [item.id, item]));
  const seen = new Set<string>();
  const sources: WorkflowStage[] = [];

  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const dependency = byId.get(id);
    if (!dependency) return;
    if (dependency.type === "source") {
      sources.push(dependency);
      return;
    }
    dependency.dependsOn.forEach(visit);
  };

  stage.dependsOn.forEach(visit);
  return sources;
}

function sourceVariables(stage: WorkflowStage, stages: WorkflowStage[]) {
  const source = sourceDependencies(stage, stages)[0];
  if (!source) return {};
  const values = stageValues(source) || {};
  return Object.fromEntries(Object.entries({
    PIPERY_SOURCE_REPOSITORY: values.repository || "",
    PIPERY_SOURCE_REF: values.ref || "",
    PIPERY_SOURCE_PATH: values.path || source.sourcePath || ".",
    PIPERY_SOURCE_FETCH_DEPTH: values["fetch-depth"] || ""
  }).filter(([, value]) => value !== ""));
}

export function workflowConfigFromTemplate(template: WorkflowTemplate): WorkflowConfig {
  const graphStages = template.graphStages || template.stages;
  const firstCiStage = graphStages?.find(stage => stage.type === "ci");
  const firstCdStage = graphStages?.find(stage => stage.type === "cd");

  return {
    platform: template.platform || "github",
    language: template.language || firstCiStage?.actionKey || "npm",
    ciValues: template.ciValues || firstCiStage?.values || { project_path: "." },
    cdKey: template.cdKey ?? firstCdStage?.actionKey ?? null,
    cdValues: template.cdValues || firstCdStage?.values || {},
    workflowName: template.workflowName || "pipery-workflow",
    triggers: {
      pushBranches: template.triggers?.pushBranches || ["main"],
      pullRequest: template.triggers?.pullRequest ?? true
    },
    ...(graphStages ? { graphStages } : {})
  };
}

export function generateWorkflowFromTemplate(template: WorkflowTemplate): string {
  return generateWorkflow(workflowConfigFromTemplate(template));
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
  const executableStages = stages.filter(stage => stage.type !== "source");
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

  const jobs = Object.fromEntries(executableStages.map((stage, index) => {
    const jobId = safeJobId(stage, index);
    const needs = stage.dependsOn
      .map(id => stages.find(item => item.id === id))
      .filter((item): item is WorkflowStage => !!item && item.type !== "source")
      .map(item => jobIds.get(item.id))
      .filter(Boolean);
    const checkoutStages = sourceDependencies(stage, stages);
    const checkoutSteps = checkoutStages.length ? checkoutStages.map(checkoutStep) : [checkoutStep()];
    const stageStep: Record<string, unknown> = {
      name: stage.label,
      uses: actionWithDefaultRef(stage.actionId),
      with: stageValues(stage)
    };
    if (stageStep.with === undefined) delete stageStep.with;
    const job: Record<string, unknown> = {
      "runs-on": "ubuntu-latest",
      steps: [
        ...checkoutSteps,
        stageStep
      ]
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
  const includes = stages.filter(stage => stage.type !== "source").map(gitLabIncludeFor);

  const workflowRules: Array<Record<string, string>> = [];
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
    const executableStages = stages.filter(stage => stage.type !== "source");
    const jobs = Object.fromEntries(executableStages.map((stage, index) => {
      const jobId = safeJobId(stage, index);
      const needs = stage.dependsOn
        .map(id => stages.find(item => item.id === id))
        .filter((item): item is WorkflowStage => !!item && item.type !== "source")
        .map(item => jobIds.get(item.id))
        .filter(Boolean);
      const job: Record<string, unknown> = {
        stage: jobId,
        trigger: {
          include: gitLabIncludeFor(stage),
          strategy: "depend"
        },
        variables: {
          ...sourceVariables(stage, stages),
          ...toGitLabVariables(actionInputs(stage), {
            ...stage.values,
            project_path: stage.sourcePath || stage.values.project_path || "."
          })
        }
      };
      if (needs.length > 0) job.needs = needs;
      return [jobId, job];
    }));

    return yaml.dump({
      workflow: { rules: workflowRules },
      stages: executableStages.map((stage, index) => safeJobId(stage, index)),
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
    stages.filter(stage => stage.type !== "source").map(stage => {
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
    const variables = {
      ...sourceVariables(stage, stages),
      ...(toBitbucketVariables(stage) || {})
    };

    return {
      step: {
        name: stage.label,
        import: stageImport(stage),
        ...(Object.keys(variables).length ? { variables } : {})
      }
    };
  };
  const importStep = (stage: WorkflowStage) => (
    config.graphStages?.length
      ? { import: stageImport(stage), ...(toBitbucketVariables(stage) ? { variables: toBitbucketVariables(stage) } : {}) }
      : { import: stageImport(stage) }
  );
  const pipelines: Record<string, unknown> = {};
  const stagePipeline = stages.length === 1 && stages[0].type !== "source"
    ? importStep(stages[0])
    : stages.filter(stage => stage.type !== "source").map(stageStep);
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

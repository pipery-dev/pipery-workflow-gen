import { describe, expect, it } from "vitest";
import yaml from "js-yaml";
import { generateWorkflow, workflowFilePath } from "./workflow-generator";

const baseConfig = {
  language: "npm",
  ciValues: { project_path: "." },
  cdKey: null,
  cdValues: {},
  workflowName: "pipery-npm",
  triggers: { pushBranches: ["main"], pullRequest: true }
};

describe("workflowFilePath", () => {
  it("uses platform-specific workflow paths", () => {
    expect(workflowFilePath({ platform: "github", workflowName: "build" })).toBe(".github/workflows/build.yml");
    expect(workflowFilePath({ platform: "gitlab", workflowName: "build" })).toBe(".gitlab-ci.yml");
    expect(workflowFilePath({ platform: "bitbucket", workflowName: "build" })).toBe("bitbucket-pipelines.yml");
  });

  it("falls back to a GitHub workflow path and default name", () => {
    expect(workflowFilePath({ workflowName: "build" })).toBe(".github/workflows/build.yml");
    expect(workflowFilePath({ platform: "github", workflowName: "" })).toBe(".github/workflows/pipery.yml");
  });
});

describe("generateWorkflow", () => {
  it("generates GitHub Actions YAML with CI, PR, and branch triggers", () => {
    const parsed = yaml.load(generateWorkflow({ ...baseConfig, platform: "github" })) as any;

    expect(parsed.on.push.branches).toEqual(["main"]);
    expect(parsed.on.pull_request).toEqual({});
    expect(parsed.jobs.ci.steps[0]).toEqual({ uses: "actions/checkout@v5" });
    expect(parsed.jobs.ci.steps[1].uses).toBe("pipery-dev/pipery-npm-ci@v1");
  });

  it("generates a GitHub CD job after CI for the first selected branch", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "github",
      cdKey: "npm",
      cdValues: {
        project_path: "web",
        package_name: "@acme/web",
        image_name: ""
      },
      triggers: { pushBranches: ["release", "main"], pullRequest: true }
    })) as any;

    expect(parsed.jobs.cd.needs).toBe("ci");
    expect(parsed.jobs.cd.if).toBe("github.ref == 'refs/heads/release'");
    expect(parsed.jobs.cd.steps[0]).toEqual({ uses: "actions/checkout@v5" });
    expect(parsed.jobs.cd.steps[1]).toMatchObject({
      name: "JavaScript CD",
      uses: "pipery-dev/pipery-npm-cd@v1"
    });
    expect(parsed.jobs.cd.steps[1].with).toMatchObject({
      project_path: "web",
      deploy_target: "argocd",
      package_name: "@acme/web"
    });
    expect(parsed.jobs.cd.steps[1].with).not.toHaveProperty("config_file");
    expect(parsed.jobs.cd.steps[1].with).not.toHaveProperty("image_name");
  });

  it("generates a GitHub workflow graph with multiple monorepo CI stages feeding CD", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "github",
      workflowName: "monorepo",
      graphStages: [
        {
          id: "web-ci",
          type: "ci",
          actionKey: "npm",
          values: { project_path: "apps/web" },
          sourcePath: "apps/web",
          dependsOn: []
        },
        {
          id: "api-ci",
          type: "ci",
          actionKey: "python",
          values: { project_path: "services/api", tests_path: "tests/unit" },
          sourcePath: "services/api",
          dependsOn: []
        },
        {
          id: "deploy-web",
          type: "cd",
          actionKey: "helm",
          values: { project_path: "deploy/web", release_name: "web" },
          sourcePath: "deploy/web",
          dependsOn: ["web-ci", "api-ci"]
        }
      ]
    })) as any;

    expect(Object.keys(parsed.jobs)).toEqual(["web-ci", "api-ci", "deploy-web"]);
    expect(parsed.jobs["web-ci"].steps[1]).toMatchObject({
      name: "JavaScript CI",
      uses: "pipery-dev/pipery-npm-ci@v1",
      with: { project_path: "apps/web" }
    });
    expect(parsed.jobs["api-ci"].steps[1].with).toMatchObject({
      project_path: "services/api",
      tests_path: "tests/unit"
    });
    expect(parsed.jobs["deploy-web"].needs).toEqual(["web-ci", "api-ci"]);
    expect(parsed.jobs["deploy-web"].steps[1].with).toMatchObject({
      project_path: "deploy/web",
      release_name: "web"
    });
  });

  it("uses manual GitHub dispatch when no triggers are selected", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "github",
      triggers: { pushBranches: [], pullRequest: false }
    })) as any;

    expect(parsed.on).toEqual({ workflow_dispatch: {} });
    expect(parsed.jobs.ci).toBeDefined();
  });

  it("keeps GitHub CD jobs from running on pull requests when no push branch is selected", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "github",
      cdKey: "helm",
      triggers: { pushBranches: [], pullRequest: true }
    })) as any;

    expect(parsed.on).toEqual({ pull_request: {} });
    expect(parsed.jobs.cd.if).toBe("github.event_name != 'pull_request'");
  });

  it("generates ordered GitHub graph stages with implicit dependencies", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "github",
      graphStages: [
        { id: "build", type: "ci", actionKey: "npm", values: { project_path: "web" } },
        { id: "verify-api", type: "ci", actionKey: "python", values: { project_path: "api" } },
        { id: "deploy-api", type: "cd", actionKey: "helm", values: { project_path: "deploy" } }
      ]
    })) as any;

    expect(Object.keys(parsed.jobs)).toEqual(["build", "verify-api", "deploy-api"]);
    expect(parsed.jobs["verify-api"].needs).toBe("build");
    expect(parsed.jobs["deploy-api"].needs).toBe("verify-api");
    expect(parsed.jobs["deploy-api"].if).toBe("github.ref == 'refs/heads/main'");
    expect(parsed.jobs["verify-api"].steps[1]).toMatchObject({
      name: "Python CI",
      uses: "pipery-dev/pipery-python-ci@v1"
    });
  });

  it("omits empty input defaults and preserves non-empty defaults and values", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "github",
      language: "python",
      ciValues: {
        project_path: "service",
        tests_path: "tests/unit",
        image_name: ""
      }
    })) as any;

    expect(parsed.jobs.ci.steps[1].with).toMatchObject({
      project_path: "service",
      config_file: ".pipery/config.yaml",
      package_manager: "auto",
      tests_path: "tests/unit"
    });
    expect(parsed.jobs.ci.steps[1].with).not.toHaveProperty("image_name");
    expect(parsed.jobs.ci.steps[1].with).not.toHaveProperty("pypi_token");
  });

  it("generates GitLab CI YAML with remote template includes and workflow rules", () => {
    const parsed = yaml.load(generateWorkflow({ ...baseConfig, platform: "gitlab" })) as any;

    expect(parsed.include).toEqual([
      { remote: "https://raw.githubusercontent.com/pipery-dev/pipery-npm-ci/v1/.gitlab-ci.yml" }
    ]);
    expect(parsed.workflow.rules).toContainEqual({ if: "$CI_PIPELINE_SOURCE == \"merge_request_event\"" });
    expect(parsed.workflow.rules).toContainEqual({ if: "$CI_COMMIT_BRANCH =~ /^(main)$/" });
    expect(parsed.workflow.rules.at(-1)).toEqual({ when: "never" });
  });

  it("generates GitLab variables with GitHub expression translations and CD include", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "gitlab",
      language: "python",
      ciValues: {
        project_path: "api",
        github_token: "${{ secrets.GITHUB_TOKEN }}"
      },
      cdKey: "argocd",
      cdValues: {
        argocd_server: "argo.example.com",
        argocd_app: "api",
        argocd_token: "${{ secrets.GITHUB_TOKEN }}"
      }
    })) as any;

    expect(parsed.include).toEqual([
      { remote: "https://raw.githubusercontent.com/pipery-dev/pipery-python-ci/v1/.gitlab-ci.yml" },
      { remote: "https://raw.githubusercontent.com/pipery-dev/pipery-argocd-cd/v1/.gitlab-ci.yml" }
    ]);
    expect(parsed.variables).toMatchObject({
      PROJECT_PATH: "api",
      GITHUB_TOKEN: "$GITHUB_TOKEN",
      IMAGE_TAG: "$CI_COMMIT_SHA",
      ARGOCD_SERVER: "argo.example.com",
      ARGOCD_APP: "api",
      ARGOCD_TOKEN: "$GITHUB_TOKEN"
    });
  });

  it("generates GitLab includes for graph stages and preserves stage source paths", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "gitlab",
      graphStages: [
        {
          id: "web",
          type: "ci",
          actionKey: "npm",
          sourcePath: "apps/web",
          values: { project_path: "apps/web" },
          dependsOn: []
        },
        {
          id: "deploy",
          type: "cd",
          actionKey: "argocd",
          sourcePath: "deploy",
          values: { project_path: "deploy", argocd_app: "web" },
          dependsOn: ["web"]
        }
      ]
    })) as any;

    expect(parsed.stages).toEqual(["web", "deploy"]);
    expect(parsed.web.trigger.include).toEqual({ remote: "https://raw.githubusercontent.com/pipery-dev/pipery-npm-ci/v1/.gitlab-ci.yml" });
    expect(parsed.web.variables.PROJECT_PATH).toBe("apps/web");
    expect(parsed.deploy.trigger.include).toEqual({ remote: "https://raw.githubusercontent.com/pipery-dev/pipery-argocd-cd/v1/.gitlab-ci.yml" });
    expect(parsed.deploy.needs).toEqual(["web"]);
    expect(parsed.deploy.variables.PROJECT_PATH).toBe("deploy");
    expect(parsed.deploy.variables.ARGOCD_APP).toBe("web");
  });

  it("lets explicit GitLab CD values override matching CI variables", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "gitlab",
      language: "python",
      ciValues: {
        project_path: "api"
      },
      cdKey: "argocd",
      cdValues: {
        project_path: "deploy",
        argocd_server: "argo.example.com"
      }
    })) as any;

    expect(parsed.variables.PROJECT_PATH).toBe("deploy");
  });

  it("emits GitLab graph stages in the requested order", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "gitlab",
      graphStages: [
        { id: "build", type: "ci", actionKey: "npm", values: { project_path: "web" } },
        { id: "deploy", type: "cd", actionKey: "argocd", values: { argocd_app: "web" } }
      ]
    })) as any;

    expect(parsed.stages).toEqual(["build", "deploy"]);
    expect(parsed.build.trigger.include).toEqual({ remote: "https://raw.githubusercontent.com/pipery-dev/pipery-npm-ci/v1/.gitlab-ci.yml" });
    expect(parsed.deploy.trigger.include).toEqual({ remote: "https://raw.githubusercontent.com/pipery-dev/pipery-argocd-cd/v1/.gitlab-ci.yml" });
  });

  it("generates Bitbucket imports for branches and pull requests", () => {
    const parsed = yaml.load(generateWorkflow({ ...baseConfig, platform: "bitbucket" })) as any;

    expect(parsed.definitions.imports).toEqual({ "pipery-npm-ci": "pipery-npm-ci:master" });
    expect(parsed.pipelines.branches.main).toEqual({ import: "pipery-npm-ci@pipery-npm-ci" });
    expect(parsed.pipelines["pull-requests"]["**"]).toEqual({ import: "pipery-npm-ci@pipery-npm-ci" });
  });

  it("uses a default Bitbucket pipeline when no triggers are selected", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "bitbucket",
      triggers: { pushBranches: [], pullRequest: false }
    })) as any;

    expect(parsed.pipelines.default).toEqual({ import: "pipery-npm-ci@pipery-npm-ci" });
  });

  it("generates a Bitbucket custom CD import alongside CI imports", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "bitbucket",
      cdKey: "helm"
    })) as any;

    expect(parsed.definitions.imports).toEqual({
      "pipery-npm-ci": "pipery-npm-ci:master",
      "pipery-helm-cd": "pipery-helm-cd:master"
    });
    expect(parsed.pipelines.branches.main).toEqual({ import: "pipery-npm-ci@pipery-npm-ci" });
    expect(parsed.pipelines.custom["deploy-helm"]).toEqual({ import: "pipery-helm-cd@pipery-helm-cd" });
  });

  it("generates ordered Bitbucket graph imports for branch pipelines", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "bitbucket",
      graphStages: [
        {
          id: "web",
          type: "ci",
          actionKey: "npm",
          sourcePath: "apps/web",
          values: { project_path: "apps/web" },
          dependsOn: []
        },
        {
          id: "deploy",
          type: "cd",
          actionKey: "helm",
          sourcePath: "deploy/web",
          values: { project_path: "deploy/web" },
          dependsOn: ["web"]
        }
      ]
    })) as any;

    expect(parsed.definitions.imports).toEqual({
      "pipery-npm-ci": "pipery-npm-ci:master",
      "pipery-helm-cd": "pipery-helm-cd:master"
    });
    expect(parsed.pipelines.branches.main).toEqual([
      { step: { name: "JavaScript CI", import: "pipery-npm-ci@pipery-npm-ci", variables: { PROJECT_PATH: "apps/web" } } },
      { step: { name: "Helm CD", import: "pipery-helm-cd@pipery-helm-cd", variables: expect.objectContaining({ PROJECT_PATH: "deploy/web" }) } }
    ]);
  });

  it("allows imported graph actions with explicit action ids", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "github",
      graphStages: [
        {
          id: "custom-ci",
          type: "ci",
          actionKey: "custom",
          actionId: "acme/private-ci",
          label: "Private CI",
          icon: "CI",
          sourcePath: "packages/private",
          values: { project_path: "packages/private" },
          dependsOn: []
        }
      ]
    })) as any;

    expect(parsed.jobs["custom-ci"].steps[1]).toMatchObject({
      name: "Private CI",
      uses: "acme/private-ci@v1",
      with: { project_path: "packages/private" }
    });
  });

  it("preserves imported action refs and GitLab providers", () => {
    const github = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "github",
      graphStages: [
        {
          id: "custom-ci",
          type: "ci",
          actionKey: "custom",
          actionId: "acme/private-ci@v2",
          label: "Private CI",
          sourcePath: ".",
          values: {},
          dependsOn: []
        }
      ]
    })) as any;

    expect(github.jobs["custom-ci"].steps[1].uses).toBe("acme/private-ci@v2");

    const gitlab = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "gitlab",
      graphStages: [
        {
          id: "custom-ci",
          type: "ci",
          actionKey: "custom",
          actionId: "platform/private-ci@v2",
          actionProvider: "gitlab",
          label: "Private CI",
          sourcePath: ".",
          values: {},
          dependsOn: []
        }
      ]
    })) as any;

    expect(gitlab["custom-ci"].trigger.include).toEqual({
      remote: "https://gitlab.com/platform/private-ci/-/raw/v2/.gitlab-ci.yml"
    });
  });

  it("generates ordered Bitbucket branch graph stages while keeping PRs CI-only", () => {
    const parsed = yaml.load(generateWorkflow({
      ...baseConfig,
      platform: "bitbucket",
      graphStages: [
        { id: "build", type: "ci", actionKey: "npm", values: { project_path: "web" } },
        { id: "scan", type: "ci", actionKey: "docker", values: { project_path: "image" } },
        { id: "deploy", type: "cd", actionKey: "helm", values: { project_path: "chart" } }
      ]
    })) as any;

    expect(parsed.pipelines.branches.main).toEqual([
      { step: { name: "JavaScript CI", import: "pipery-npm-ci@pipery-npm-ci", variables: { PROJECT_PATH: "web" } } },
      { step: { name: "Docker CI", import: "pipery-docker-ci@pipery-docker-ci", variables: expect.objectContaining({ PROJECT_PATH: "image" }) } },
      { step: { name: "Helm CD", import: "pipery-helm-cd@pipery-helm-cd", variables: expect.objectContaining({ PROJECT_PATH: "chart" }) } }
    ]);
    expect(parsed.pipelines["pull-requests"]["**"]).toEqual([
      { step: { name: "JavaScript CI", import: "pipery-npm-ci@pipery-npm-ci", variables: { PROJECT_PATH: "web" } } },
      { step: { name: "Docker CI", import: "pipery-docker-ci@pipery-docker-ci", variables: expect.objectContaining({ PROJECT_PATH: "image" }) } }
    ]);
  });

  it("throws for unknown languages", () => {
    expect(() => generateWorkflow({ ...baseConfig, language: "made-up" })).toThrow("Unknown language");
  });
});

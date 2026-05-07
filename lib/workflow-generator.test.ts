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

  it("throws for unknown languages", () => {
    expect(() => generateWorkflow({ ...baseConfig, language: "made-up" })).toThrow("Unknown language");
  });
});

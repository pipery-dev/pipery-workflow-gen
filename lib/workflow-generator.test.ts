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
});

describe("generateWorkflow", () => {
  it("generates GitHub Actions YAML with CI, PR, and branch triggers", () => {
    const parsed = yaml.load(generateWorkflow({ ...baseConfig, platform: "github" })) as any;

    expect(parsed.on.push.branches).toEqual(["main"]);
    expect(parsed.on.pull_request).toEqual({});
    expect(parsed.jobs.ci.steps[0]).toEqual({ uses: "actions/checkout@v5" });
    expect(parsed.jobs.ci.steps[1].uses).toBe("pipery-dev/pipery-npm-ci@v1");
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

  it("throws for unknown languages", () => {
    expect(() => generateWorkflow({ ...baseConfig, language: "made-up" })).toThrow("Unknown language");
  });
});

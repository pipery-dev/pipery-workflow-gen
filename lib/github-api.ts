import { Octokit } from "@octokit/rest";

export interface Repo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  url: string;
}

export interface Branch {
  name: string;
  protected: boolean;
}

function getOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function listRepos(token: string): Promise<Repo[]> {
  const octokit = getOctokit(token);
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
    affiliation: "owner,collaborator,organization_member"
  });

  return repos.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    private: repo.private,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
    url: repo.html_url
  }));
}

export async function listBranches(owner: string, repo: string, token: string): Promise<Branch[]> {
  const octokit = getOctokit(token);
  const { data: branches } = await octokit.repos.listBranches({
    owner,
    repo,
    per_page: 100
  });

  return branches.map((branch: any) => ({
    name: branch.name,
    protected: branch.protected
  }));
}

export async function createWorkflowPR({
  owner,
  repo,
  workflowName,
  yamlContent,
  token
}: {
  owner: string;
  repo: string;
  workflowName: string;
  yamlContent: string;
  token: string;
}) {
  console.log("[GITHUB-API] Starting PR creation:", { owner, repo, workflowName });
  const octokit = getOctokit(token);

  let baseBranch: string;
  let newBranch: string;
  let baseSha: string;
  let baseTreeSha: string;

  // Step 1: Get repo data to find default branch
  try {
    console.log("[GITHUB-API] Step 1: Getting repo default branch");
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    baseBranch = repoData.default_branch;
    console.log("[GITHUB-API] Step 1 ✓ baseBranch:", baseBranch);
  } catch (e: any) {
    console.error("[GITHUB-API] ✗ STEP 1 FAILED:", e.message);
    throw new Error(`Step 1 failed (repo not found?): ${e.message}`);
  }

  // Step 2: Get base branch commit and tree
  try {
    console.log("[GITHUB-API] Step 2: Getting base commit and tree");
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`
    });
    baseSha = ref.object.sha;

    const { data: commit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: baseSha
    });
    baseTreeSha = commit.tree.sha;
    console.log("[GITHUB-API] Step 2 ✓ baseSha:", baseSha, "baseTreeSha:", baseTreeSha);
  } catch (e: any) {
    console.error("[GITHUB-API] ✗ STEP 2 FAILED:", e.message);
    throw new Error(`Step 2 failed: ${e.message}`);
  }

  // Step 3: Create blob for workflow file
  let blobSha: string;
  try {
    console.log("[GITHUB-API] Step 3: Creating blob");
    const { data: blob } = await octokit.git.createBlob({
      owner,
      repo,
      content: yamlContent,
      encoding: "utf-8"
    });
    blobSha = blob.sha;
    console.log("[GITHUB-API] Step 3 ✓ blobSha:", blobSha);
  } catch (e: any) {
    console.error("[GITHUB-API] ✗ STEP 3 FAILED:", e.message);
    throw new Error(`Step 3 failed: ${e.message}`);
  }

  // Step 4: Create tree with workflow file
  let treeSha: string;
  try {
    console.log("[GITHUB-API] Step 4: Creating tree");
    console.log("[GITHUB-API] baseTreeSha:", baseTreeSha);
    console.log("[GITHUB-API] blobSha:", blobSha);
    console.log("[GITHUB-API] workflowName:", workflowName);

    // Create tree structure - if .github/workflows doesn't exist, need to build the hierarchy
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      tree: [
        {
          path: `.github/workflows/${workflowName}.yml`,
          mode: "100644",
          type: "blob",
          sha: blobSha
        }
      ],
      base_tree: baseTreeSha
    });
    treeSha = tree.sha;
    console.log("[GITHUB-API] Step 4 ✓ treeSha:", treeSha);
  } catch (e: any) {
    console.error("[GITHUB-API] ✗ STEP 4 FAILED:", e.message);
    console.error("[GITHUB-API] Full error:", JSON.stringify({
      status: e.status,
      message: e.message,
      errors: e.errors,
      response: e.response?.data
    }, null, 2));

    // If tree creation failed, try creating directory structure explicitly
    console.log("[GITHUB-API] Attempting fallback: creating directory structure...");
    try {
      const workflowsTree = await octokit.git.createTree({
        owner,
        repo,
        tree: [
          {
            path: workflowName + ".yml",
            mode: "100644",
            type: "blob",
            sha: blobSha
          }
        ]
      });

      const githubTree = await octokit.git.createTree({
        owner,
        repo,
        tree: [
          {
            path: "workflows",
            mode: "040000",
            type: "tree",
            sha: workflowsTree.data.sha
          }
        ]
      });

      const finalTree = await octokit.git.createTree({
        owner,
        repo,
        tree: [
          {
            path: ".github",
            mode: "040000",
            type: "tree",
            sha: githubTree.data.sha
          }
        ],
        base_tree: baseTreeSha
      });

      treeSha = finalTree.data.sha;
      console.log("[GITHUB-API] Step 4 ✓ treeSha (via fallback):", treeSha);
    } catch (fallbackError: any) {
      console.error("[GITHUB-API] ✗ Fallback also failed:", fallbackError.message);
      throw new Error(`Step 4 failed: ${e.message}`);
    }
  }

  // Step 5: Create commit
  let commitSha: string;
  try {
    console.log("[GITHUB-API] Step 5: Creating commit");
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: `add ${workflowName} pipery workflow\n\nGenerated by Pipery Workflow Generator.`,
      tree: treeSha,
      parents: [baseSha]
    });
    commitSha = newCommit.sha;
    console.log("[GITHUB-API] Step 5 ✓ commitSha:", commitSha);
  } catch (e: any) {
    console.error("[GITHUB-API] ✗ STEP 5 FAILED:", e.message);
    throw new Error(`Step 5 failed: ${e.message}`);
  }

  // Step 6: Create ref (branch)
  try {
    console.log("[GITHUB-API] Step 6: Creating branch ref");
    newBranch = `add-pipery-${workflowName}-${Date.now()}`;
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: commitSha
    });
    console.log("[GITHUB-API] Step 6 ✓ newBranch:", newBranch);
  } catch (e: any) {
    console.error("[GITHUB-API] ✗ STEP 6 FAILED:", e.message);
    throw new Error(`Step 6 failed (branch creation): ${e.message}`);
  }

  // Step 7: Create PR
  try {
    console.log("[GITHUB-API] Step 7: Creating pull request");
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title: `Add ${workflowName} Pipery workflow`,
      head: newBranch,
      base: baseBranch,
      body: `Generated by [Pipery Workflow Generator](https://start.pipery.dev).\n\n## What this adds\n\n- CI: \`${workflowName}\`\n- Powered by Pipery GitHub Actions`
    });
    console.log("[GITHUB-API] Step 7 ✓ pr.html_url:", pr.html_url);
    return { prUrl: pr.html_url, branch: newBranch };
  } catch (e: any) {
    console.error("[GITHUB-API] ✗ STEP 7 FAILED:", e.message);
    throw new Error(`Step 7 failed (PR creation): ${e.message}`);
  }
}

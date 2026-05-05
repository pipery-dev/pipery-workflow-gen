"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

interface StepRepoProps {
  repos: any[];
  onReposChange: (repos: any[]) => void;
  selectedRepo: string;
  onRepoChange: (repo: string) => void;
  branches: string[];
  onBranchesChange: (branches: string[]) => void;
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  triggers: { pushBranches: string[]; pullRequest: boolean };
  onTriggersChange: (triggers: { pushBranches: string[]; pullRequest: boolean }) => void;
  platform: "github" | "gitlab";
}

export default function StepRepo({
  repos,
  onReposChange,
  selectedRepo,
  onRepoChange,
  branches,
  onBranchesChange,
  selectedBranch,
  onBranchChange,
  workflowName,
  onWorkflowNameChange,
  triggers,
  onTriggersChange,
  platform
}: StepRepoProps) {
  const { data: session } = useSession();

  useEffect(() => {
    const hasPlatformToken = !!(
      session?.accounts?.[platform]?.accessToken ||
      (session?.provider === platform && session?.accessToken) ||
      (!session?.provider && platform === "github" && session?.accessToken)
    );
    if (!hasPlatformToken) return;

    fetch(platform === "gitlab" ? "/api/gitlab/projects" : "/api/github/repos")
      .then(r => r.json())
      .then(({ repos, error }) => {
        if (repos) onReposChange(repos);
        if (repos && repos.length > 0 && !selectedRepo) {
          onRepoChange(platform === "gitlab" ? String(repos[0].id) : repos[0].fullName);
        }
      });
  }, [session, platform]);

  useEffect(() => {
    if (!selectedRepo) return;

    const url = platform === "gitlab"
      ? `/api/gitlab/branches?projectId=${encodeURIComponent(selectedRepo)}`
      : `/api/github/${selectedRepo.split("/")[0]}/${selectedRepo.split("/")[1]}/branches`;
    fetch(url)
      .then(r => r.json())
      .then(({ branches, error }) => {
        if (branches) {
          const branchNames = branches.map((b: any) => b.name);
          onBranchesChange(branchNames);
          if (!selectedBranch && branchNames.length > 0) {
            onBranchChange(branchNames[0]);
          }
        }
      });
  }, [selectedRepo, platform]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Target {platform === "gitlab" ? "Project" : "Repository"}</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">{platform === "gitlab" ? "Project" : "Repository"}</label>
          <select
            value={selectedRepo}
            onChange={e => onRepoChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">Select a repository</option>
            {repos.map(repo => (
              <option key={repo.id} value={platform === "gitlab" ? String(repo.id) : repo.fullName}>
                {repo.fullName}
              </option>
            ))}
          </select>
        </div>

        {branches.length > 0 && (
          <div>
            <label className="block text-sm font-semibold mb-2">Branch</label>
            <select
              value={selectedBranch}
              onChange={e => onBranchChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            >
              {branches.map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-2">Workflow Name</label>
          <input
            type="text"
            value={workflowName}
            onChange={e => onWorkflowNameChange(e.target.value)}
            placeholder="e.g., build-and-deploy"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-4">Triggers</label>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={triggers.pullRequest}
                onChange={e =>
                  onTriggersChange({ ...triggers, pullRequest: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span>Trigger on Pull Requests</span>
            </label>
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={triggers.pushBranches.length > 0}
                  onChange={e => {
                    if (e.target.checked && triggers.pushBranches.length === 0) {
                      onTriggersChange({
                        ...triggers,
                        pushBranches: selectedBranch ? [selectedBranch] : ["main"]
                      });
                    } else if (!e.target.checked) {
                      onTriggersChange({ ...triggers, pushBranches: [] });
                    }
                  }}
                  className="w-4 h-4"
                />
                <span>Trigger on Push to Branch</span>
              </label>
              {triggers.pushBranches.length > 0 && (
                <input
                  type="text"
                  value={triggers.pushBranches.join(", ")}
                  onChange={e =>
                    onTriggersChange({
                      ...triggers,
                      pushBranches: e.target.value.split(",").map(b => b.trim())
                    })
                  }
                  placeholder="e.g., main, develop"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg ml-6"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

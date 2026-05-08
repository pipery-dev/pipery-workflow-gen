"use client";

import { useState } from "react";
import YamlPreview from "../yaml-preview";
import { WorkflowPlatform } from "@/lib/workflow-generator";

interface StepPreviewProps {
  yaml: string;
  workflowName: string;
  repo: string;
  onComplete: () => void;
  config: any;
  isAuthenticated?: boolean;
  platform?: WorkflowPlatform;
}

const platformLabels: Record<WorkflowPlatform, { file: string; workflow: string; change: string; action: string }> = {
  github: { file: "GitHub Actions", workflow: "GitHub Actions", change: "PR", action: "Create PR" },
  gitlab: { file: "GitLab CI", workflow: "GitLab CI", change: "MR", action: "Create MR" },
  bitbucket: { file: "Bitbucket Pipelines", workflow: "Bitbucket Pipelines", change: "PR", action: "Create PR" }
};

export default function StepPreview({
  yaml,
  workflowName,
  repo,
  onComplete,
  config,
  isAuthenticated = false,
  platform = "github"
}: StepPreviewProps) {
  const [creating, setCreating] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const labels = platformLabels[platform];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([yaml], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = platform === "gitlab" ? ".gitlab-ci.yml" : platform === "bitbucket" ? "bitbucket-pipelines.yml" : `${workflowName}.yml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCreatePr = async () => {
    if (!repo) {
      setError("Please select a repository");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const [owner, repoName] = repo.split("/");
      const response = await fetch("/api/workflow/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          owner: platform === "gitlab" ? undefined : owner,
          repo: platform === "gitlab" ? repo : repoName,
          workflowName,
          ...config
        })
      });

      const data = await response.json();

      if (response.ok && data.prUrl) {
        setPrUrl(data.prUrl);
      } else {
        setError(data.error || "Failed to create PR");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        {isAuthenticated ? "Review & Create PR" : "Download Your Workflow"}
      </h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          {isAuthenticated
            ? `Review the generated ${labels.workflow} workflow below. Click "${labels.action}" to commit it to your repository.`
            : `Copy or download the generated ${labels.file} workflow. You can add it manually to your repository, or sign in to create a ${platform === "gitlab" ? "merge request" : "PR"} automatically.`}
        </p>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-3">Workflow Preview</h3>
        <YamlPreview yaml={yaml} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {prUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-900 mb-3">✓ {labels.change} created successfully!</p>
          <a href={prUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            View {platform === "gitlab" ? "Merge Request" : "Pull Request"} →
          </a>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleCopy}
          className={`px-6 py-2 rounded transition ${
            copied
              ? "bg-green-600 text-white"
              : "bg-slate-600 text-white hover:bg-slate-700"
          }`}
        >
          {copied ? "✓ Copied" : "Copy to Clipboard"}
        </button>

        <button
          onClick={handleDownload}
          className="px-6 py-2 rounded bg-slate-600 text-white hover:bg-slate-700"
        >
          Download YAML
        </button>

        {isAuthenticated && (
          <button
            onClick={handleCreatePr}
            disabled={creating || !repo || !!prUrl}
            className="px-6 py-2 rounded bg-green-600 text-white disabled:opacity-50 hover:bg-green-700"
          >
            {creating ? `Creating ${labels.change}...` : labels.action}
          </button>
        )}

        {prUrl && (
          <button
            onClick={onComplete}
            className="px-6 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Start Over
          </button>
        )}
      </div>
    </div>
  );
}

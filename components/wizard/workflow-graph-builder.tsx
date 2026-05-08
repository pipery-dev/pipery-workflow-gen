"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CI_ACTIONS, CD_ACTIONS, ActionInput } from "@/lib/action-catalog";
import { generateWorkflow, WorkflowPlatform, WorkflowStage, WorkflowStageType } from "@/lib/workflow-generator";
import type { WorkflowTemplatePreset } from "@/lib/workflow-template-loader";
import type { PiperyProvider } from "@/lib/auth";
import type { PiperySession } from "@/lib/provider-session";
import ProfileMenu from "../profile-menu";
import YamlPreview from "../yaml-preview";
import InputField from "../input-field";

type GraphStage = WorkflowStage & { x: number; y: number };

type ImportedAction = {
  key: string;
  type: WorkflowStageType;
  actionId: string;
  actionProvider: WorkflowPlatform;
  label: string;
  icon: string;
  inputs: ActionInput[];
};

type ToolbarAction = ImportedAction;

type RepoRecord = {
  id: string | number;
  fullName: string;
};

type PublicAction = {
  actionId: string;
  label: string;
  description: string;
  stars: number;
};

const platformMeta: Record<WorkflowPlatform, { label: string; icon: string; bg: string; border: string }> = {
  github: { label: "GitHub", icon: "GH", bg: "bg-purple-50", border: "border-purple-200" },
  gitlab: { label: "GitLab", icon: "GL", bg: "bg-orange-50", border: "border-orange-200" },
  bitbucket: { label: "Bitbucket", icon: "BB", bg: "bg-sky-50", border: "border-sky-200" }
};

const defaultTriggers = { pushBranches: ["main"], pullRequest: true };

const sourceInputs: ActionInput[] = [
  { name: "repository", description: "Optional owner/repo to checkout instead of the workflow repository.", default: "", basic: true },
  { name: "ref", description: "Optional branch, tag, or SHA to checkout.", default: "", basic: true },
  { name: "path", description: "Directory where the source should be checked out.", default: ".", basic: true },
  { name: "fetch-depth", description: "Number of commits to fetch. Use 0 for full history.", default: "1", basic: false },
  { name: "token", description: "Token used to fetch private source repositories.", default: "", basic: false, secret: true }
];

const sourceAction: ImportedAction = {
  key: "checkout",
  type: "source",
  actionId: "actions/checkout",
  actionProvider: "github",
  label: "Source Checkout",
  icon: "SRC",
  inputs: sourceInputs
};

function defaults(inputs: ActionInput[], sourcePath = ".") {
  return Object.fromEntries(inputs.map(input => [input.name, input.name === "project_path" ? sourcePath : input.default]));
}

function catalogAction(type: WorkflowStageType, key: string, imports: ImportedAction[]) {
  if (type === "source") return sourceAction;
  const imported = imports.find(action => action.key === key && action.type === type);
  if (imported) return imported;
  const action = type === "ci" ? CI_ACTIONS[key] : CD_ACTIONS[key];
  return action ? { key, type, actionProvider: "github" as WorkflowPlatform, ...action } : undefined;
}

function stageInputs(stage: WorkflowStage, imports: ImportedAction[]) {
  if (stage.type === "source") return sourceInputs;
  return catalogAction(stage.type, stage.actionKey, imports)?.inputs || [
    { name: "project_path", description: "Path to the source tree.", default: ".", basic: true }
  ];
}

function distance(stage: Pick<GraphStage, "x" | "y">, point: Pick<GraphStage, "x" | "y">) {
  return Math.hypot(stage.x - point.x, stage.y - point.y);
}

function nearestConnections(stages: GraphStage[], candidate: Pick<GraphStage, "id" | "x" | "y">) {
  return stages
    .filter(stage => stage.id !== candidate.id)
    .map(stage => ({ id: stage.id, distance: distance(stage, candidate) }))
    .filter(item => item.distance < 250)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 2)
    .map(item => item.id);
}

function ordered(stages: GraphStage[]) {
  return [...stages].sort((left, right) => left.x - right.x || left.y - right.y);
}

function workflowStages(stages: GraphStage[]) {
  return ordered(stages).map(stage => {
    const { x, y, ...workflowStage } = stage;
    void x;
    void y;
    return workflowStage;
  });
}

function matchesQuery(query: string, ...values: string[]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some(value => value.toLowerCase().includes(normalized));
}

function CollapsibleSection({
  id,
  title,
  open,
  onToggle,
  children
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded border border-slate-200 bg-white/80">
      <button onClick={() => onToggle(id)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-900">
        <span>{title}</span>
        <span className="text-xs text-slate-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <div className="border-t border-slate-100 p-3">{children}</div>}
    </section>
  );
}

function platformRepoUrl(platform: WorkflowPlatform) {
  if (platform === "gitlab") return "/api/gitlab/projects";
  if (platform === "bitbucket") return "/api/bitbucket/repos";
  return "/api/github/repos";
}

function platformBranchesUrl(platform: WorkflowPlatform, repo: string) {
  if (platform === "gitlab") return `/api/gitlab/branches?projectId=${encodeURIComponent(repo)}`;
  const [owner, name] = repo.split("/");
  if (platform === "bitbucket") {
    return `/api/bitbucket/branches?workspace=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`;
  }
  return `/api/github/${owner}/${name}/branches`;
}

export default function WorkflowGraphBuilder({
  session,
  onSignIn,
  onLogout
}: {
  session?: PiperySession | null;
  onSignIn: (provider: PiperyProvider) => void;
  onLogout: (provider?: PiperyProvider) => void;
}) {
  const [platform, setPlatform] = useState<WorkflowPlatform>("github");
  const [workflowName, setWorkflowName] = useState("pipery-workflow");
  const [stages, setStages] = useState<GraphStage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imports, setImports] = useState<ImportedAction[]>([]);
  const [importType, setImportType] = useState<WorkflowStageType>("ci");
  const [importActionId, setImportActionId] = useState("");
  const [stageQuery, setStageQuery] = useState("");
  const [workflowQuery, setWorkflowQuery] = useState("");
  const [workflowTemplatePresets, setWorkflowTemplatePresets] = useState<WorkflowTemplatePreset[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showPublicActions, setShowPublicActions] = useState(false);
  const [publicActions, setPublicActions] = useState<PublicAction[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const idSequence = useRef(0);
  const [repo, setRepo] = useState("");
  const [repos, setRepos] = useState<RepoRecord[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [triggers, setTriggers] = useState(defaultTriggers);
  const [prUrl, setPrUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const authenticated = !!session?.accounts?.[platform]?.authenticated;
  const authenticatedProviders = session?.accounts ? (Object.keys(session.accounts) as PiperyProvider[]) : [];
  const selected = stages.find(stage => stage.id === selectedId) || null;

  const toolbarActions = useMemo<ToolbarAction[]>(() => {
    const source = [sourceAction];
    const ci = Object.entries(CI_ACTIONS).map(([key, action]) => ({ key, type: "ci" as const, actionProvider: "github" as WorkflowPlatform, ...action }));
    const cd = Object.entries(CD_ACTIONS).map(([key, action]) => ({ key, type: "cd" as const, actionProvider: "github" as WorkflowPlatform, ...action }));
    const githubPublicActions = showPublicActions && platform === "github"
      ? publicActions.map(action => ({
          key: `public-${action.actionId}`,
          type: importType,
          actionId: action.actionId,
          actionProvider: "github" as WorkflowPlatform,
          label: action.label,
          icon: importType === "ci" ? "CI" : "CD",
          inputs: [{ name: "project_path", description: "Path to the source tree.", default: ".", basic: true }]
        }))
      : [];
    return [...source, ...ci, ...cd, ...imports, ...githubPublicActions]
      .filter(action => matchesQuery(stageQuery, action.label, action.type, action.key, action.actionId));
  }, [imports, importType, platform, publicActions, showPublicActions, stageQuery]);

  const filteredTemplates = useMemo(() => (
    workflowTemplatePresets.filter(template => (
      matchesQuery(workflowQuery, template.name, template.description, template.tags.join(" "))
    ))
  ), [workflowQuery]);

  const sectionOpen = (id: string) => collapsed[id] !== true;
  const toggleSection = (id: string) => setCollapsed(current => ({ ...current, [id]: !current[id] }));

  useEffect(() => {
    let active = true;
    async function loadTemplates() {
      try {
        const response = await fetch("/api/workflows/templates", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load workflow templates.");
        if (active) setWorkflowTemplatePresets(data.workflows || []);
      } catch (err) {
        if (active) setError((err as Error).message);
      } finally {
        if (active) setTemplatesLoading(false);
      }
    }
    loadTemplates();
    return () => {
      active = false;
    };
  }, []);

  const yaml = useMemo(() => {
    if (stages.length === 0) return "# Drag CI and CD stages into the graph to generate a workflow.";
    try {
      const graphStages = workflowStages(stages);
      return generateWorkflow({
        platform,
        language: graphStages.find(stage => stage.type === "ci")?.actionKey || graphStages[0]?.actionKey || "npm",
        ciValues: {},
        cdKey: null,
        cdValues: {},
        workflowName,
        triggers,
        graphStages
      });
    } catch (err) {
      return `# ${(err as Error).message}`;
    }
  }, [platform, stages, workflowName, triggers]);

  const addStage = (type: WorkflowStageType, key: string, point?: { x: number; y: number }, toolbarAction?: ToolbarAction) => {
    const action = toolbarAction || toolbarActions.find(item => item.type === type && item.key === key) || catalogAction(type, key, imports);
    if (!action) return;
    idSequence.current += 1;
    const sourcePath = ".";
    const next: GraphStage = {
      id: `${type}-${key}-${idSequence.current}`,
      type,
      actionKey: key,
      actionId: action.actionId,
      actionProvider: action.actionProvider || "github",
      label: type === "source" ? action.label : `${action.label} ${type.toUpperCase()}`,
      icon: action.icon,
      sourcePath,
      values: defaults(action.inputs, sourcePath),
      dependsOn: [],
      x: point?.x ?? 120 + stages.length * 180,
      y: point?.y ?? 140
    };
    next.dependsOn = nearestConnections(stages, next);
    setStages(current => [...current, next]);
    setSelectedId(next.id);
  };

  const applyTemplate = (template: WorkflowTemplatePreset) => {
    const nextStages: GraphStage[] = template.stages.map((stage, index) => {
      const values = stage.values || {};
      const actionKey = stage.actionKey || (stage.type === "source" ? "checkout" : "");
      const action = catalogAction(stage.type, actionKey, imports);
      const sourcePath = stage.sourcePath || values.project_path || values.path || ".";
      const previousStage = template.stages[index - 1];
      const previousActionKey = previousStage?.actionKey || (previousStage?.type === "source" ? "checkout" : "");
      return {
        id: `${template.id}-${stage.type}-${actionKey}-${index + 1}`,
        type: stage.type,
        actionKey,
        actionId: action?.actionId || "actions/checkout",
        actionProvider: action?.actionProvider || "github",
        label: action?.label ? (stage.type === "source" ? action.label : `${action.label} ${stage.type.toUpperCase()}`) : "Source Checkout",
        icon: action?.icon || "SRC",
        sourcePath,
        values: {
          ...(action ? defaults(action.inputs, sourcePath) : {}),
          ...values
        },
        dependsOn: previousStage ? [`${template.id}-${previousStage.type}-${previousActionKey}-${index}`] : [],
        x: 90 + index * 190,
        y: 140
      };
    });
    setWorkflowName(template.workflowName);
    setStages(nextStages);
    setSelectedId(nextStages[0]?.id || null);
  };

  const updateStage = (id: string, patch: Partial<GraphStage>) => {
    setStages(current => current.map(stage => (stage.id === id ? { ...stage, ...patch } : stage)));
  };

  const moveStage = (id: string, x: number, y: number) => {
    setStages(current => current.map(stage => {
      if (stage.id !== id) return stage;
      const moved = { ...stage, x, y };
      return { ...moved, dependsOn: nearestConnections(current, moved) };
    }));
  };

  const removeStage = (id: string) => {
    setStages(current => current.filter(stage => stage.id !== id).map(stage => ({
      ...stage,
      dependsOn: stage.dependsOn.filter(dep => dep !== id)
    })));
    if (selectedId === id) setSelectedId(null);
  };

  const loadRepos = async () => {
    setError("");
    try {
      const response = await fetch(platformRepoUrl(platform));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load repositories.");
      setRepos(data.repos || []);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const loadBranches = async (nextRepo: string) => {
    setRepo(nextRepo);
    if (!nextRepo) return;
    try {
      const response = await fetch(platformBranchesUrl(platform, nextRepo));
      const data = await response.json();
      if (response.ok && data.branches) {
        const branchNames = data.branches.map((branch: { name: string }) => branch.name);
        setBranches(branchNames);
        setTriggers(current => ({ ...current, pushBranches: current.pushBranches.length ? current.pushBranches : [branchNames[0] || "main"] }));
      }
    } catch {
      setBranches([]);
    }
  };

  const searchPublicActions = async () => {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/actions/public?q=${encodeURIComponent(stageQuery || "github action")}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to search public GitHub actions.");
      setPublicActions(data.actions || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addImportedAction = async () => {
    const actionId = importActionId.trim();
    if (!actionId) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/actions/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: platform, actionId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to import action.");
      idSequence.current += 1;
      const key = `custom-${idSequence.current}`;
      setImports(current => [
        ...current,
        {
          key,
          type: importType,
          actionId: data.actionId || actionId,
          actionProvider: data.provider || platform,
          label: data.label || actionId.split("/").at(-1)?.replace(/^pipery-/, "") || actionId,
          icon: importType === "ci" ? "CI" : "CD",
          inputs: [{ name: "project_path", description: "Path to the source tree.", default: ".", basic: true }]
        }
      ]);
      setImportActionId("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadYaml = () => {
    const element = document.createElement("a");
    element.href = URL.createObjectURL(new Blob([yaml], { type: "text/yaml" }));
    element.download = platform === "github" ? `${workflowName}.yml` : platform === "gitlab" ? ".gitlab-ci.yml" : "bitbucket-pipelines.yml";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const createPr = async () => {
    if (!repo || stages.length === 0) {
      setError("Select a repository and add at least one stage.");
      return;
    }
    const [owner, repoName] = repo.split("/");
    setBusy(true);
    setError("");
    try {
      const graphStages = workflowStages(stages);
      const response = await fetch("/api/workflow/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          owner: platform === "gitlab" ? undefined : owner,
          repo: platform === "gitlab" ? repo : repoName,
          workflowName,
          language: graphStages.find(stage => stage.type === "ci")?.actionKey || graphStages[0].actionKey,
          ciValues: {},
          cdKey: null,
          cdValues: {},
          triggers,
          graphStages
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create PR.");
      setPrUrl(data.prUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`min-h-screen ${platformMeta[platform].bg}`}>
      <header className={`border-b ${platformMeta[platform].border} bg-white/85 px-4 py-3 backdrop-blur`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-950">Pipery Workflow Graph</h1>
            <p className="text-sm text-slate-600">Drag stages onto the graph, wire the delivery flow, then export or open a PR.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["github", "gitlab", "bitbucket"] as WorkflowPlatform[]).map(item => (
              <button
                key={item}
                onClick={() => {
                  setPlatform(item);
                  setRepo("");
                  setRepos([]);
                  setBranches([]);
                }}
                className={`h-9 rounded border px-3 text-sm font-semibold ${platform === item ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}
                title={platformMeta[item].label}
              >
                {platformMeta[item].icon}
              </button>
            ))}
            <ProfileMenu session={session || null} platform={platform} authenticatedProviders={authenticatedProviders} onSignIn={onSignIn} onLogout={onLogout} />
          </div>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-73px)] grid-cols-1 gap-0 lg:grid-cols-[320px_minmax(0,1fr)_420px]">
        <aside className="border-b border-slate-200 bg-white/90 p-4 lg:border-b-0 lg:border-r">
          <div className="space-y-3">
            <CollapsibleSection id="workflow" title="Workflow" open={sectionOpen("workflow")} onToggle={toggleSection}>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Name</label>
              <input value={workflowName} onChange={event => setWorkflowName(event.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </CollapsibleSection>

            <CollapsibleSection id="templates" title="Workflows" open={sectionOpen("templates")} onToggle={toggleSection}>
              <input
                value={workflowQuery}
                onChange={event => setWorkflowQuery(event.target.value)}
                placeholder="Search language or deploy stack"
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="max-h-56 space-y-2 overflow-auto pr-1">
                {templatesLoading && (
                  <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">Loading workflows...</div>
                )}
                {filteredTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="w-full rounded border border-slate-200 bg-white p-3 text-left text-xs hover:border-slate-400"
                  >
                    <span className="block font-semibold text-slate-900">{template.name}</span>
                    <span className="mt-1 block text-slate-600">{template.description}</span>
                    <span className="mt-2 block truncate text-[10px] uppercase text-slate-500">{template.tags.join(" · ")}</span>
                  </button>
                ))}
                {!templatesLoading && filteredTemplates.length === 0 && (
                  <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">No workflows match your search.</div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection id="stages" title="Stages" open={sectionOpen("stages")} onToggle={toggleSection}>
              <input
                value={stageQuery}
                onChange={event => setStageQuery(event.target.value)}
                placeholder="Search stages and actions"
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              {platform === "github" && (
                <label className="mb-3 flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={showPublicActions} onChange={event => setShowPublicActions(event.target.checked)} />
                  <span>Show public GitHub actions</span>
                  <button type="button" onClick={searchPublicActions} className="ml-auto rounded border border-slate-300 px-2 py-1 font-semibold">Search</button>
                </label>
              )}
              <div className="grid grid-cols-3 gap-2">
                {toolbarActions.map(action => (
                  <button
                    key={`${action.type}-${action.key}`}
                    draggable
                    onDragStart={event => event.dataTransfer.setData("application/pipery-stage", JSON.stringify({ type: action.type, key: action.key }))}
                    onClick={() => addStage(action.type, action.key, undefined, action)}
                    className="min-h-16 rounded border border-slate-200 bg-white px-2 py-2 text-left text-xs shadow-sm hover:border-slate-400"
                    title={`${action.label} ${action.type.toUpperCase()}`}
                  >
                    <span className="block text-base">{action.icon}</span>
                    <span className="block truncate font-semibold">{action.label}</span>
                    <span className="text-[10px] uppercase text-slate-500">{action.type}</span>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection id="import" title="Import Action" open={sectionOpen("import")} onToggle={toggleSection}>
              <div className="mb-2 grid grid-cols-2 gap-2">
                {(["ci", "cd"] as WorkflowStageType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setImportType(type)}
                    className={`rounded border px-2 py-1 text-xs font-semibold uppercase ${importType === type ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <input
                value={importActionId}
                onChange={event => setImportActionId(event.target.value)}
                placeholder="owner/repo or group/project"
                className="mb-2 w-full rounded border border-slate-300 px-3 py-2 text-xs"
              />
              <button onClick={addImportedAction} className="w-full rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white">
                Add to Toolbar
              </button>
              <p className="mt-2 text-xs text-slate-500">Private actions work when the selected platform token can read them.</p>
            </CollapsibleSection>

            <CollapsibleSection id="repository" title="Repository" open={sectionOpen("repository")} onToggle={toggleSection}>
              {!authenticated ? (
                <button onClick={() => onSignIn(platform)} className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                  Connect {platformMeta[platform].label}
                </button>
              ) : (
                <div className="space-y-2">
                  <button onClick={loadRepos} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">
                    Load repositories
                  </button>
                  <select value={repo} onChange={event => loadBranches(event.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select repository</option>
                    {repos.map(item => (
                      <option key={item.id} value={platform === "gitlab" ? String(item.id) : item.fullName}>{item.fullName}</option>
                    ))}
                  </select>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection id="triggers" title="Triggers" open={sectionOpen("triggers")} onToggle={toggleSection}>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={triggers.pullRequest} onChange={event => setTriggers({ ...triggers, pullRequest: event.target.checked })} /> Pull request</label>
                <input value={triggers.pushBranches.join(", ")} onChange={event => setTriggers({ ...triggers, pushBranches: event.target.value.split(",").map(v => v.trim()).filter(Boolean) })} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder={branches[0] || "main"} />
              </div>
            </CollapsibleSection>
          </div>
        </aside>

        <section
          className="relative min-h-[560px] overflow-auto p-4"
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            const moveId = event.dataTransfer.getData("application/pipery-move");
            if (moveId) {
              moveStage(moveId, Math.max(16, event.clientX - rect.left - 72), Math.max(16, event.clientY - rect.top - 42));
              return;
            }
            const payload = event.dataTransfer.getData("application/pipery-stage");
            if (!payload) return;
            const { type, key } = JSON.parse(payload);
            const action = toolbarActions.find(item => item.type === type && item.key === key);
            addStage(type, key, { x: event.clientX - rect.left, y: event.clientY - rect.top }, action);
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
          <svg className="pointer-events-none absolute inset-0 hidden h-full min-h-[560px] w-full lg:block">
            {stages.flatMap(stage => stage.dependsOn.map(dep => {
              const from = stages.find(item => item.id === dep);
              if (!from) return null;
              return (
                <line
                  key={`${dep}-${stage.id}`}
                  x1={from.x + 72}
                  y1={from.y + 42}
                  x2={stage.x + 72}
                  y2={stage.y + 42}
                  stroke="#334155"
                  strokeWidth="2"
                  strokeDasharray={stage.type === "cd" ? "6 4" : undefined}
                />
              );
            }))}
          </svg>
          <div className="relative min-h-[520px] lg:hidden">
            {stages.length === 0 && (
              <div className="mx-auto mt-24 max-w-sm rounded border border-dashed border-slate-400 bg-white/80 p-6 text-center text-sm text-slate-600">
                Drop CI/CD stages here. Nearby stages connect automatically; move a stage to reshape the graph.
              </div>
            )}
            <div className="space-y-4">
              {ordered(stages).map((stage, index) => (
                <div key={stage.id} className="relative pl-7">
                  {index > 0 && <div className="absolute left-[13px] -top-4 h-4 w-px bg-slate-400" />}
                  <div className="absolute left-1 top-9 h-3 w-3 rounded-full border-2 border-slate-500 bg-white" />
                  <button
                    onClick={() => setSelectedId(stage.id)}
                    className={`w-full rounded border bg-white p-3 text-left shadow-sm ${selectedId === stage.id ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-300"}`}
                  >
                    <span className="block text-center text-2xl">{stage.icon}</span>
                    <span className="block truncate text-center text-sm font-semibold">{stage.label}</span>
                    <span className="block truncate text-center text-xs text-slate-500">{stage.sourcePath || "."}</span>
                    {stage.dependsOn.length > 0 && <span className="mt-2 block truncate rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600">from {stage.dependsOn.length} stage{stage.dependsOn.length > 1 ? "s" : ""}</span>}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden min-h-[520px] lg:block">
            {stages.length === 0 && (
              <div className="mx-auto mt-24 max-w-sm rounded border border-dashed border-slate-400 bg-white/80 p-6 text-center text-sm text-slate-600">
                Drop CI/CD stages here. Nearby stages connect automatically; move a stage to reshape the graph.
              </div>
            )}
            {stages.map(stage => (
              <button
                key={stage.id}
                draggable
                onDragStart={event => event.dataTransfer.setData("application/pipery-move", stage.id)}
                onDragEnd={event => {
                  if (event.clientX === 0 && event.clientY === 0) return;
                  const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                  if (!rect) return;
                  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
                  moveStage(stage.id, Math.max(16, event.clientX - rect.left - 72), Math.max(16, event.clientY - rect.top - 42));
                }}
                onClick={() => setSelectedId(stage.id)}
                className={`relative w-full rounded border bg-white p-3 text-left shadow-sm transition lg:absolute lg:w-36 ${selectedId === stage.id ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-300"}`}
                style={{ left: stage.x, top: stage.y }}
              >
                <span className="block text-center text-2xl">{stage.icon}</span>
                <span className="block truncate text-center text-sm font-semibold">{stage.label}</span>
                <span className="block truncate text-center text-xs text-slate-500">{stage.sourcePath || "."}</span>
                {stage.dependsOn.length > 0 && <span className="mt-2 block truncate rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600">from {stage.dependsOn.length} stage{stage.dependsOn.length > 1 ? "s" : ""}</span>}
              </button>
            ))}
          </div>
        </section>

        <aside className="border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0">
          <div className="mb-4 flex gap-2">
            <button onClick={downloadYaml} className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Export YAML</button>
            <button onClick={createPr} disabled={busy || !authenticated} className="rounded bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creating..." : "Create PR"}</button>
          </div>
          {prUrl && <a className="mb-4 block text-sm font-semibold text-blue-700 underline" href={prUrl} target="_blank" rel="noreferrer">View Pull Request</a>}
          {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</div>}

          <div className="space-y-3">
            <CollapsibleSection id="yaml" title="Generated YAML" open={sectionOpen("yaml")} onToggle={toggleSection}>
              <YamlPreview yaml={yaml} className="max-h-80" />
            </CollapsibleSection>

            <CollapsibleSection id="inspector" title="Stage Inspector" open={sectionOpen("inspector")} onToggle={toggleSection}>
              {selected ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold">Edit Stage</h2>
                    <button onClick={() => removeStage(selected.id)} className="text-sm text-red-700">Remove</button>
                  </div>
                  <div className="space-y-3">
                    <InputField label="Label" description="Display name on the graph." value={selected.label} onChange={value => updateStage(selected.id, { label: value })} />
                    <InputField
                      label={selected.type === "source" ? "Checkout path" : "Source path"}
                      description={selected.type === "source" ? "Directory where this repository should be checked out." : "Monorepo path shown below the stage icon."}
                      value={selected.sourcePath}
                      onChange={value => updateStage(selected.id, { sourcePath: value, values: { ...selected.values, [selected.type === "source" ? "path" : "project_path"]: value } })}
                    />
                    {stageInputs(selected, imports).filter(input => !(selected.type === "source" && input.name === "path")).map(input => (
                      <InputField
                        key={input.name}
                        label={input.name}
                        description={input.description}
                        value={selected.values[input.name] ?? input.default}
                        onChange={value => updateStage(selected.id, { values: { ...selected.values, [input.name]: value } })}
                        isSecret={input.secret}
                      />
                    ))}
                  </div>
                  <div className="mt-3 rounded bg-slate-50 p-2 text-xs text-slate-600">
                    Connected to: {selected.dependsOn.length ? selected.dependsOn.map(id => stages.find(stage => stage.id === id)?.label || id).join(", ") : "none"}
                  </div>
                </div>
              ) : (
                <div className="rounded border border-slate-200 p-3 text-sm text-slate-600">Select a stage to edit path, inputs, and inspect dynamic connections.</div>
              )}
            </CollapsibleSection>
          </div>
        </aside>
      </main>
    </div>
  );
}

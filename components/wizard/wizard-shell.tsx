"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CI_ACTIONS, CD_ACTIONS } from "@/lib/action-catalog";
import { generateWorkflow } from "@/lib/workflow-generator";
import StepLanguage from "./step-language";
import StepCiConfig from "./step-ci-config";
import StepCdConfig from "./step-cd-config";
import StepRepo from "./step-repo";
import StepPreview from "./step-preview";
import YamlPreview from "../yaml-preview";
import SignInCard from "../sign-in-card";

export default function WizardShell() {
  const { data: session } = useSession();

  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [ciValues, setCiValues] = useState<Record<string, string>>({});
  const [cdKey, setCdKey] = useState<string | null>(null);
  const [cdValues, setCdValues] = useState<Record<string, string>>({});
  const [repos, setRepos] = useState<any[]>([]);
  const [repo, setRepo] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [triggers, setTriggers] = useState({ pushBranches: ["main"], pullRequest: false });

  const generatedYaml = useMemo(() => {
    if (!language) return "";
    try {
      return generateWorkflow({
        language,
        ciValues,
        cdKey,
        cdValues,
        workflowName: workflowName || `pipery-${language}`,
        triggers
      });
    } catch {
      return "# Error generating workflow";
    }
  }, [language, ciValues, cdKey, cdValues, workflowName, triggers]);

  useEffect(() => {
    if (language && Object.keys(ciValues).length === 0) {
      const defaultValues: Record<string, string> = {};
      const ciAction = CI_ACTIONS[language];
      if (ciAction) {
        ciAction.inputs.forEach(input => {
          defaultValues[input.name] = input.default;
        });
      }
      setCiValues(defaultValues);
    }
  }, [language]);

  useEffect(() => {
    if (cdKey && Object.keys(cdValues).length === 0) {
      const defaultValues: Record<string, string> = {};
      const cdAction = CD_ACTIONS[cdKey];
      if (cdAction) {
        cdAction.inputs.forEach(input => {
          defaultValues[input.name] = input.default;
        });
      }
      setCdValues(defaultValues);
    }
  }, [cdKey]);

  if (!session) return <SignInCard />;

  const steps = ["Language", "CI Config", "CD Config", "Repo", "Review"];

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepLanguage selected={language} onSelect={setLanguage} />;
      case 2:
        return (
          <StepCiConfig
            language={language}
            values={ciValues}
            onValuesChange={setCiValues}
            advanced={advanced}
            onAdvancedChange={setAdvanced}
          />
        );
      case 3:
        return (
          <StepCdConfig
            cdKey={cdKey}
            onCdKeyChange={setCdKey}
            values={cdValues}
            onValuesChange={setCdValues}
            advanced={advanced}
            onAdvancedChange={setAdvanced}
          />
        );
      case 4:
        return (
          <StepRepo
            repos={repos}
            onReposChange={setRepos}
            selectedRepo={repo}
            onRepoChange={setRepo}
            branches={branches}
            onBranchesChange={setBranches}
            selectedBranch={branch}
            onBranchChange={setBranch}
            workflowName={workflowName}
            onWorkflowNameChange={setWorkflowName}
            triggers={triggers}
            onTriggersChange={setTriggers}
          />
        );
      case 5:
        return (
          <StepPreview
            yaml={generatedYaml}
            workflowName={workflowName || `pipery-${language}`}
            repo={repo}
            onComplete={() => setStep(1)}
            config={{ language, ciValues, cdKey, cdValues, workflowName: workflowName || `pipery-${language}`, triggers }}
          />
        );
      default:
        return null;
    }
  };

  const handleLogout = () => {
    const callbackUrl = encodeURIComponent("https://create.pipery.dev");
    window.location.href = `https://auth.pipery.dev/api/auth/logout?callbackUrl=${callbackUrl}`;
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="w-1/6 bg-white border-r border-slate-200 p-6 flex flex-col">
        <div>
          <h1 className="text-2xl font-bold mb-8">Pipery Workflow</h1>
          <nav className="space-y-4">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i + 1)}
                className={`block w-full text-left px-4 py-2 rounded transition ${
                  step === i + 1
                    ? "bg-blue-100 text-blue-900 font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="mr-2">
                  {step === i + 1 ? "●" : "○"}
                </span>
                {s}
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="mt-auto px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded transition w-full text-left"
        >
          Sign out
        </button>
      </div>

      <div className="flex-1 flex">
        <div className="w-1/2 flex flex-col p-8 overflow-y-auto">
          <div className="flex-1">{renderStep()}</div>

          <div className="flex gap-4 mt-8 pt-8 border-t border-slate-200">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-6 py-2 rounded border border-slate-300 disabled:opacity-50 hover:bg-slate-100"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(Math.min(5, step + 1))}
              disabled={step === 5 || !language}
              className="px-6 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="w-1/2 bg-white border-l border-slate-200 p-8 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Generated Workflow</h3>
          <YamlPreview yaml={generatedYaml} />
        </div>
      </div>
    </div>
  );
}

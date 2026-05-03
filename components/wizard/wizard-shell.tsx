"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CI_ACTIONS, CD_ACTIONS } from "@/lib/action-catalog";
import { generateWorkflow } from "@/lib/workflow-generator";
import StepLanguageAndCi from "./step-language-and-ci";
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

  const steps = session
    ? ["Language & CI", "CD Config", "Repo", "Review"]
    : ["Language & CI", "CD Config", "Download"];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepLanguageAndCi
            language={language}
            onLanguageSelect={setLanguage}
            ciValues={ciValues}
            onCiValuesChange={setCiValues}
            advanced={advanced}
            onAdvancedChange={setAdvanced}
          />
        );
      case 2:
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
      case 3:
        if (!session) {
          return (
            <div>
              <h2 className="text-2xl font-bold mb-6">Download Your Workflow</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  Copy or download your generated GitHub Actions workflow. You can manually add it to your repository or sign in to create a PR.
                </p>
              </div>
            </div>
          );
        }
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
      case 4:
        return (
          <StepPreview
            yaml={generatedYaml}
            workflowName={workflowName || `pipery-${language}`}
            repo={repo}
            onComplete={() => setStep(1)}
            config={{ language, ciValues, cdKey, cdValues, workflowName: workflowName || `pipery-${language}`, triggers }}
            isAuthenticated={!!session}
          />
        );
      default:
        return null;
    }
  };

  const handleSignIn = () => {
    const callbackUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://auth.pipery.dev?callbackUrl=${callbackUrl}`;
  };

  const handleLogout = () => {
    const callbackUrl = encodeURIComponent("https://start.pipery.dev");
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

        <div className="mt-auto space-y-2">
          {session ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded transition w-full text-left"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition w-full"
            >
              Sign in
            </button>
          )}
        </div>
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
              onClick={() => setStep(Math.min(session ? 4 : 3, step + 1))}
              disabled={(session ? step === 4 : step === 3) || !language}
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

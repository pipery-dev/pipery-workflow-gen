"use client";

import { CI_ACTIONS } from "@/lib/action-catalog";
import InputField from "../input-field";

interface StepLanguageAndCiProps {
  language: string;
  onLanguageSelect: (lang: string) => void;
  ciValues: Record<string, string>;
  onCiValuesChange: (values: Record<string, string>) => void;
  advanced: boolean;
  onAdvancedChange: (advanced: boolean) => void;
}

export default function StepLanguageAndCi({
  language,
  onLanguageSelect,
  ciValues,
  onCiValuesChange,
  advanced,
  onAdvancedChange
}: StepLanguageAndCiProps) {
  const languages = ["golang", "python", "npm", "java", "rust", "cpp", "docker", "terraform"];
  const ciAction = language ? CI_ACTIONS[language] : null;
  const visibleInputs = ciAction ? ciAction.inputs.filter(i => advanced || i.basic) : [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Select Language & Configure CI</h2>

      {/* Language Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">1. Choose Language</h3>
        <div className="grid grid-cols-2 gap-4">
          {languages.map(lang => {
            const action = CI_ACTIONS[lang];
            return (
              <button
                key={lang}
                onClick={() => onLanguageSelect(lang)}
                className={`p-6 rounded-lg border-2 transition ${
                  language === lang
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="text-4xl mb-2">{action.icon}</div>
                <div className="font-semibold text-lg">{action.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CI Configuration */}
      {ciAction && (
        <div className="border-t pt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">2. Configure {ciAction.label}</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={advanced}
                onChange={e => onAdvancedChange(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Advanced</span>
            </label>
          </div>

          <div className="space-y-4">
            {visibleInputs.map(input => (
              <InputField
                key={input.name}
                label={input.name}
                description={input.description}
                value={ciValues[input.name] || input.default}
                onChange={v => onCiValuesChange({ ...ciValues, [input.name]: v })}
                placeholder={input.default}
                isSecret={input.secret}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

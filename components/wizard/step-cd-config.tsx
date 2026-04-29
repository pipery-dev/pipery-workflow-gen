"use client";

import { CD_ACTIONS } from "@/lib/action-catalog";
import InputField from "../input-field";

interface StepCdConfigProps {
  cdKey: string | null;
  onCdKeyChange: (key: string | null) => void;
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  advanced: boolean;
  onAdvancedChange: (advanced: boolean) => void;
}

export default function StepCdConfig({
  cdKey,
  onCdKeyChange,
  values,
  onValuesChange,
  advanced,
  onAdvancedChange
}: StepCdConfigProps) {
  const cdPlatforms = ["argocd", "helm", "cloudrun", "ansible", "terraform", "docker", "npm"];
  const cdAction = cdKey ? CD_ACTIONS[cdKey] : null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Deployment Configuration</h2>

      <div className="mb-8">
        <h3 className="font-semibold mb-4">Select Deployment Target (Optional)</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => onCdKeyChange(null)}
            className={`p-4 rounded-lg border-2 transition ${
              cdKey === null
                ? "border-blue-600 bg-blue-50"
                : "border-slate-300 bg-slate-100 opacity-50"
            }`}
          >
            <div className="font-semibold">Skip CD</div>
          </button>

          {cdPlatforms.map(platform => {
            const action = CD_ACTIONS[platform];
            return (
              <button
                key={platform}
                onClick={() => onCdKeyChange(platform)}
                className={`p-4 rounded-lg border-2 transition ${
                  cdKey === platform
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="text-2xl mb-1">{action.icon}</div>
                <div className="text-sm font-semibold">{action.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {cdAction && (
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-t">
            <h3 className="font-semibold">{cdAction.label} Inputs</h3>
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
            {cdAction.inputs
              .filter(i => advanced || i.basic)
              .map(input => (
                <InputField
                  key={input.name}
                  label={input.name}
                  description={input.description}
                  value={values[input.name] || input.default}
                  onChange={v => onValuesChange({ ...values, [input.name]: v })}
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

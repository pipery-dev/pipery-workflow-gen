"use client";

import { CI_ACTIONS } from "@/lib/action-catalog";
import InputField from "../input-field";

interface StepCiConfigProps {
  language: string;
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  advanced: boolean;
  onAdvancedChange: (advanced: boolean) => void;
}

export default function StepCiConfig({
  language,
  values,
  onValuesChange,
  advanced,
  onAdvancedChange
}: StepCiConfigProps) {
  const ciAction = CI_ACTIONS[language];
  if (!ciAction) return <div>Select a language first</div>;

  const visibleInputs = ciAction.inputs.filter(i => advanced || i.basic);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{ciAction.label} Configuration</h2>
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
            value={values[input.name] || input.default}
            onChange={v => onValuesChange({ ...values, [input.name]: v })}
            placeholder={input.default}
            isSecret={input.secret}
          />
        ))}
      </div>
    </div>
  );
}

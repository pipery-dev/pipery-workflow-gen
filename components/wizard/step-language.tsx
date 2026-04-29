"use client";

import { CI_ACTIONS } from "@/lib/action-catalog";

interface StepLanguageProps {
  selected: string;
  onSelect: (lang: string) => void;
}

export default function StepLanguage({ selected, onSelect }: StepLanguageProps) {
  const languages = ["golang", "python", "npm", "java", "rust", "cpp", "docker", "terraform"];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Select Language</h2>
      <div className="grid grid-cols-2 gap-4">
        {languages.map(lang => {
          const action = CI_ACTIONS[lang];
          return (
            <button
              key={lang}
              onClick={() => onSelect(lang)}
              className={`p-6 rounded-lg border-2 transition ${
                selected === lang
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
  );
}

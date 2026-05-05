"use client";

interface StepPlatformProps {
  platform: "github" | "gitlab";
  onPlatformChange: (platform: "github" | "gitlab") => void;
}

export default function StepPlatform({ platform, onPlatformChange }: StepPlatformProps) {
  const platforms = [
    {
      key: "github" as const,
      title: "GitHub Actions",
      description: "Generate .github/workflows YAML and create a GitHub pull request."
    },
    {
      key: "gitlab" as const,
      title: "GitLab CI",
      description: "Generate .gitlab-ci.yml and create a GitLab merge request."
    }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Choose Build Platform</h2>
      <p className="text-slate-600 mb-6">
        Pick where you want Pipery to create the build plan.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {platforms.map(item => (
          <button
            key={item.key}
            onClick={() => onPlatformChange(item.key)}
            className={`p-6 rounded-lg border-2 text-left transition ${
              platform === item.key
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 hover:border-blue-300"
            }`}
          >
            <div className="font-semibold text-lg">{item.title}</div>
            <div className="text-sm text-slate-600 mt-2">{item.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

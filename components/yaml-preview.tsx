interface YamlPreviewProps {
  yaml: string;
}

export default function YamlPreview({ yaml }: YamlPreviewProps) {
  if (!yaml) {
    return (
      <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 text-slate-600 text-sm">
        Select options to preview your workflow...
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto">
      <pre className="text-xs font-mono whitespace-pre-wrap break-words">
        {yaml}
      </pre>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isSecret?: boolean;
}

export default function InputField({
  label,
  description,
  value,
  onChange,
  placeholder,
  isSecret = false
}: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">
        {label}
        {isSecret && <span className="text-red-600 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-slate-600 mb-2">{description}</p>
      )}
      <input
        type={isSecret ? "password" : "text"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export function FileField({
  label, files, onChange, error, required, multiple, accept, hint,
}: {
  label: string;
  files: FileList | File | null;
  onChange: (files: FileList | null) => void;
  error?: string;
  required?: boolean;
  multiple?: boolean;
  accept?: string;
  hint?: string;
}) {
  const names = files ? (files instanceof FileList ? Array.from(files).map((f) => f.name) : [files.name]) : [];
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">{label}{required && <span className="text-danger"> *</span>}</span>
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => onChange(e.target.files)}
        className={`text-sm border rounded-lg px-3 py-2.5 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 file:text-xs file:font-bold cursor-pointer ${error ? 'border-danger' : 'border-gray-300'}`}
      />
      {names.length > 0 && <span className="text-xs text-gray-500">{names.join(', ')}</span>}
      {hint && !error && <span className="text-xs text-gray-400">{hint}</span>}
      {error && <span className="text-xs font-semibold text-danger">{error}</span>}
    </label>
  );
}

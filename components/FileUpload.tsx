'use client';

export default function FileUpload({
  onFileSelect,
  disabled,
}: {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="file"
      accept=".wav,.aif,.aiff"
      disabled={disabled}
      onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
    />
  );
}

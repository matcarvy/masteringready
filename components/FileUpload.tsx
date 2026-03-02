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
      accept=".wav,.aif,.aiff,.flac,.mp3,.aac,.m4a,.ogg"
      disabled={disabled}
      onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
    />
  );
}

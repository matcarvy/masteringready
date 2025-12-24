'use client';

export default function AnalysisOptions({
  lang,
  mode,
  strict,
  onLangChange,
  onModeChange,
  onStrictChange,
}: any) {
  return (
    <div>
      <button onClick={() => onLangChange(lang === 'es' ? 'en' : 'es')}>
        {lang}
      </button>

      <select value={mode} onChange={(e) => onModeChange(e.target.value)}>
        <option value="write">write</option>
        <option value="short">short</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={strict}
          onChange={(e) => onStrictChange(e.target.checked)}
        />
        strict
      </label>
    </div>
  );
}

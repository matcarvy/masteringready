'use client';

export default function Results({
  data,
  onReset,
}: {
  data: any;
  onReset: () => void;
}) {
  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={onReset}>Reset</button>
    </div>
  );
}

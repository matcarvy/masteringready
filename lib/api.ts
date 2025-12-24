export async function analyzeFile(
  file: File,
  opts: { lang: 'es' | 'en'; mode: string; strict: boolean }
) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error('NEXT_PUBLIC_API_URL not set');

  const form = new FormData();
  form.append('file', file);
  form.append('lang', opts.lang);
  form.append('mode', opts.mode);
  form.append('strict', String(opts.strict));

  const res = await fetch(`${base}/analyze`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  return res.json();
}

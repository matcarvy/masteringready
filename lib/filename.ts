export function stripExtension(filename: string): string {
  if (!filename) return ''
  const idx = filename.lastIndexOf('.')
  if (idx <= 0) return filename
  return filename.substring(0, idx)
}

export function truncateFilename(name: string, max: number): string {
  if (!name) return ''
  if (name.length <= max) return name
  const idx = name.lastIndexOf('.')
  if (idx <= 0 || idx >= name.length - 1) return name.substring(0, max - 1) + '…'
  const ext = name.substring(idx)
  const base = name.substring(0, idx)
  const keep = max - ext.length - 1
  if (keep <= 0) return name.substring(0, max - 1) + '…'
  return base.substring(0, keep) + '…' + ext
}

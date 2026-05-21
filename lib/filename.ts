const AUDIO_EXT_RE = /\.(wav|mp3|aiff|aif|flac|aac|m4a|ogg)$/i

export function stripExtension(filename: string, audioOnly = false): string {
  if (!filename) return ''
  if (audioOnly) return filename.replace(AUDIO_EXT_RE, '')
  const idx = filename.lastIndexOf('.')
  if (idx <= 0) return filename
  return filename.substring(0, idx)
}

interface TruncateOptions {
  ellipsis?: string
  stripAudioExt?: boolean
}

export function truncateFilename(name: string, max: number, options: TruncateOptions = {}): string {
  if (!name) return ''
  const ellipsis = options.ellipsis ?? '…'

  if (options.stripAudioExt) {
    const stripped = name.replace(AUDIO_EXT_RE, '')
    if (stripped.length <= max) return stripped
    return stripped.slice(0, max - ellipsis.length) + ellipsis
  }

  if (name.length <= max) return name
  const idx = name.lastIndexOf('.')
  if (idx <= 0 || idx >= name.length - 1) return name.substring(0, max - 1) + ellipsis
  const ext = name.substring(idx)
  const base = name.substring(0, idx)
  const keep = max - ext.length - 1
  if (keep <= 0) return name.substring(0, max - 1) + ellipsis
  return base.substring(0, keep) + ellipsis + ext
}

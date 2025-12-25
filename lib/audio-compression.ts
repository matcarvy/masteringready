/**
 * Audio Compression Utility
 * Compresses large audio files to fit within size limits
 * without backend changes
 */

export async function compressAudioFile(
  file: File,
  maxSizeMB: number = 50
): Promise<{ file: File; compressed: boolean; originalSize: number; newSize: number }> {
  
  const maxBytes = maxSizeMB * 1024 * 1024
  
  // If file is already under limit, return as-is
  if (file.size <= maxBytes) {
    return {
      file,
      compressed: false,
      originalSize: file.size,
      newSize: file.size
    }
  }

  // Create audio context for compression
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()
  
  // Decode audio
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  
  const duration = audioBuffer.duration
  
  // Strategy: Very aggressive compression to stay well under limit
  // and ensure fast analysis (<30s)
  let targetSampleRate = 44100
  let targetChannels = Math.min(audioBuffer.numberOfChannels, 2)
  
  // For very large files, be more aggressive
  const estimatedSize = duration * targetSampleRate * targetChannels * 2 // 16-bit
  
  if (file.size > 100 * 1024 * 1024) {
    // Very large files (>100MB): Use 22kHz mono
    targetSampleRate = 22050
    targetChannels = 1
  } else if (estimatedSize > maxBytes * 0.8) {
    // Still too big: reduce to 32kHz
    targetSampleRate = 32000
  }
  
  // Create offline context for resampling
  const offlineContext = new OfflineAudioContext(
    targetChannels,
    duration * targetSampleRate,
    targetSampleRate
  )
  
  // Create buffer source
  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineContext.destination)
  source.start()
  
  // Render
  const renderedBuffer = await offlineContext.startRendering()
  
  // Convert to WAV (always WAV, never WebM)
  const wavBlob = audioBufferToWav(renderedBuffer)
  
  const compressedFile = new File(
    [wavBlob],
    file.name.replace(/\.[^/.]+$/, '_compressed.wav'),
    { type: 'audio/wav' }
  )
  
  // Close context
  audioContext.close()
  
  return {
    file: compressedFile,
    compressed: true,
    originalSize: file.size,
    newSize: compressedFile.size
  }
}

// Helper: Convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16
  
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  
  const data = new Float32Array(buffer.length * numChannels)
  
  // Interleave channels
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      data[i * numChannels + channel] = buffer.getChannelData(channel)[i]
    }
  }
  
  // Convert to 16-bit PCM
  const samples = new Int16Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]))
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  
  const dataLength = samples.length * bytesPerSample
  const buffer_array = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer_array)
  
  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true) // byte rate
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)
  
  // Write samples
  const offset = 44
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset + i * 2, samples[i], true)
  }
  
  return new Blob([buffer_array], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

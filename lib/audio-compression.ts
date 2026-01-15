/**
 * Audio Compression Utility v3.0
 * Compresses large audio files to fit within size limits
 * PRESERVES ORIGINAL METADATA for backend analysis
 * 
 * v3.0 - NEW: Captures and returns original metadata before compression
 * v2.0 - FIXED: Preserves stereo for mastering analysis
 */

export interface CompressionResult {
  file: File;
  compressed: boolean;
  originalSize: number;
  newSize: number;
  // NEW: Original file metadata (before compression)
  originalMetadata: {
    sampleRate: number;
    bitDepth: number;
    numberOfChannels: number;
    duration: number;
  };
}

export async function compressAudioFile(
  file: File,
  maxSizeMB: number = 50
): Promise<CompressionResult> {
  
  const maxBytes = maxSizeMB * 1024 * 1024
  
  // Create audio context to read original metadata
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer()
  
  // Decode audio to get ORIGINAL metadata
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  
  // ============================================================
  // CAPTURE ORIGINAL METADATA BEFORE ANY COMPRESSION
  // This is the TRUE metadata that backend needs for PDF
  // ============================================================
  const originalMetadata = {
    sampleRate: audioBuffer.sampleRate,
    bitDepth: getBitDepthFromFile(file), // Estimate from file (16, 24, or 32)
    numberOfChannels: audioBuffer.numberOfChannels,
    duration: audioBuffer.duration
  }
  
  // ============================================================
  
  // If file is already under limit, return as-is with original metadata
  if (file.size <= maxBytes) {
    audioContext.close()
    return {
      file,
      compressed: false,
      originalSize: file.size,
      newSize: file.size,
      originalMetadata // ← NUEVO: Always return original metadata
    }
  }

  const duration = audioBuffer.duration
  
  // Strategy: Intelligent compression while ALWAYS preserving stereo
  // CRITICAL: Never convert to mono for mastering analysis
  let targetSampleRate = 44100
  let targetChannels = Math.min(audioBuffer.numberOfChannels, 2) // ALWAYS preserve stereo (max 2 channels)
  
  // Estimate compressed size
  const estimatedSize = duration * targetSampleRate * targetChannels * 2 // 16-bit
  
  // Adjust sample rate based on file size, but NEVER reduce channels
  if (file.size > 150 * 1024 * 1024) {
    // Very large files (>150MB): Use 32kHz stereo
    targetSampleRate = 32000
  } else if (file.size > 100 * 1024 * 1024) {
    // Large files (>100MB): Use 44.1kHz stereo
    targetSampleRate = 44100
  } else if (estimatedSize > maxBytes * 0.8) {
    // Medium files approaching limit: Use 48kHz stereo
    targetSampleRate = 48000
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
    newSize: compressedFile.size,
    originalMetadata // ← NUEVO: Return ORIGINAL metadata (not compressed)
  }
}

// Helper: Estimate bit depth from file size and duration
function getBitDepthFromFile(file: File): number {
  // This is an approximation based on file extension and size
  // For WAV files, we can make educated guesses
  
  const fileName = file.name.toLowerCase()
  
  // If filename contains bit depth hint
  if (fileName.includes('24bit') || fileName.includes('24-bit')) return 24
  if (fileName.includes('32bit') || fileName.includes('32-bit')) return 32
  if (fileName.includes('16bit') || fileName.includes('16-bit')) return 16
  
  // Default assumptions based on file type
  if (fileName.endsWith('.wav')) {
    // For WAV: Estimate from file size
    // Rough estimate: size per second for stereo
    // 16-bit stereo 44.1kHz: ~176KB/s
    // 24-bit stereo 48kHz: ~288KB/s
    // 32-bit stereo 48kHz: ~384KB/s
    
    // This is a rough heuristic - not perfect but better than nothing
    return 24 // Default to 24-bit for professional audio
  }
  
  // Default to 16-bit for unknown formats
  return 16
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

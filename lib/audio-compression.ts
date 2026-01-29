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
    bitDepth: getBitDepthFromHeader(arrayBuffer, file.name), // Read from WAV/AIFF header
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

// Parse bit depth from WAV/AIFF file header
function getBitDepthFromHeader(arrayBuffer: ArrayBuffer, fileName: string): number {
  const name = fileName.toLowerCase()

  // WAV: RIFF header has bitsPerSample at byte 34 (fmt chunk)
  if (name.endsWith('.wav') && arrayBuffer.byteLength >= 44) {
    const view = new DataView(arrayBuffer)
    // Verify RIFF/WAVE signature
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
    if (riff === 'RIFF' && wave === 'WAVE') {
      // Find fmt chunk (usually at offset 12, but search to be safe)
      let offset = 12
      while (offset + 8 < arrayBuffer.byteLength && offset < 1024) {
        const chunkId = String.fromCharCode(
          view.getUint8(offset), view.getUint8(offset + 1),
          view.getUint8(offset + 2), view.getUint8(offset + 3)
        )
        const chunkSize = view.getUint32(offset + 4, true) // little-endian
        if (chunkId === 'fmt ') {
          const audioFormat = view.getUint16(offset + 8, true) // 1=PCM, 3=IEEE float
          const bitsPerSample = view.getUint16(offset + 22, true)
          // audioFormat 3 = IEEE float (32-bit or 64-bit float)
          // audioFormat 1 = PCM integer
          if (bitsPerSample > 0 && bitsPerSample <= 64) {
            return bitsPerSample
          }
          break
        }
        offset += 8 + chunkSize
        if (chunkSize % 2 !== 0) offset++ // RIFF chunks are word-aligned
      }
    }
  }

  // AIFF: FORM/AIFF header, COMM chunk contains sampleSize
  if ((name.endsWith('.aiff') || name.endsWith('.aif')) && arrayBuffer.byteLength >= 30) {
    const view = new DataView(arrayBuffer)
    const form = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
    const aiff = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))
    if (form === 'FORM' && (aiff === 'AIFF' || aiff === 'AIFC')) {
      let offset = 12
      while (offset + 8 < arrayBuffer.byteLength && offset < 1024) {
        const chunkId = String.fromCharCode(
          view.getUint8(offset), view.getUint8(offset + 1),
          view.getUint8(offset + 2), view.getUint8(offset + 3)
        )
        const chunkSize = view.getUint32(offset + 4, false) // big-endian
        if (chunkId === 'COMM') {
          const sampleSize = view.getInt16(offset + 14, false) // big-endian
          if (sampleSize > 0 && sampleSize <= 64) {
            return sampleSize
          }
          break
        }
        offset += 8 + chunkSize
        if (chunkSize % 2 !== 0) offset++ // AIFF chunks are word-aligned
      }
    }
  }

  // Lossy formats (MP3, AAC) — no meaningful bit depth in header
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

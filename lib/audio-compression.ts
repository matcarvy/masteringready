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
  
  // Calculate target bitrate to achieve size limit
  const duration = audioBuffer.duration
  const targetBitrate = Math.floor((maxBytes * 8) / duration) // bits per second
  
  // Limit bitrate to reasonable range
  const finalBitrate = Math.max(128000, Math.min(targetBitrate, 320000)) // 128-320 kbps
  
  // Resample if needed (降采样 to 48kHz max)
  const targetSampleRate = Math.min(audioBuffer.sampleRate, 48000)
  
  // Create offline context for resampling
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
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
  
  // Convert to WAV (simple format, no additional compression)
  const wavBlob = audioBufferToWav(renderedBuffer)
  
  // If WAV is still too big, we need MP3 encoding
  // For now, we'll use a simplified approach with MediaRecorder API
  if (wavBlob.size > maxBytes) {
    // Use MediaRecorder to encode to mp3/webm
    const compressedBlob = await encodeWithMediaRecorder(renderedBuffer, audioContext.sampleRate, finalBitrate)
    
    const compressedFile = new File(
      [compressedBlob],
      file.name.replace(/\.[^/.]+$/, '.webm'), // Change extension
      { type: 'audio/webm' }
    )
    
    return {
      file: compressedFile,
      compressed: true,
      originalSize: file.size,
      newSize: compressedFile.size
    }
  }
  
  // Return WAV version
  const compressedFile = new File(
    [wavBlob],
    file.name.replace(/\.[^/.]+$/, '_compressed.wav'),
    { type: 'audio/wav' }
  )
  
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

// Helper: Encode using MediaRecorder (for MP3/WebM)
async function encodeWithMediaRecorder(
  audioBuffer: AudioBuffer,
  sampleRate: number,
  bitrate: number
): Promise<Blob> {
  
  // Create a MediaStream from the AudioBuffer
  const audioContext = new AudioContext({ sampleRate })
  const source = audioContext.createBufferSource()
  source.buffer = audioBuffer
  
  const destination = audioContext.createMediaStreamDestination()
  source.connect(destination)
  
  // Create MediaRecorder
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
    ? 'audio/webm;codecs=opus' 
    : 'audio/webm'
  
  const mediaRecorder = new MediaRecorder(destination.stream, {
    mimeType,
    audioBitsPerSecond: bitrate
  })
  
  const chunks: Blob[] = []
  
  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      resolve(blob)
    }
    
    mediaRecorder.onerror = (e) => {
      reject(e)
    }
    
    // Start recording
    mediaRecorder.start()
    source.start()
    
    // Stop after audio finishes
    setTimeout(() => {
      mediaRecorder.stop()
      source.stop()
      audioContext.close()
    }, audioBuffer.duration * 1000 + 100)
  })
}

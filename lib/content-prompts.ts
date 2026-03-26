/**
 * Content Machine — Prompt Templates
 * Hormozi Method: 1 input → 9 content formats
 *
 * Valid input types (must match DB CHECK constraint on content_queue.input_type):
 *   'topic' | 'testimony' | 'before_after' | 'transcript' | 'personal'
 */

export const FORMAT_DEFS = [
  { key: 'reel_script', label: { es: 'Reel / Short', en: 'Reel / Short' }, platforms: ['IG', 'TikTok', 'YT Shorts'] },
  { key: 'carousel', label: { es: 'Carrusel', en: 'Carousel' }, platforms: ['IG'] },
  { key: 'ig_caption', label: { es: 'Caption IG', en: 'IG Caption' }, platforms: ['IG'] },
  { key: 'fb_post', label: { es: 'Post FB', en: 'FB Post' }, platforms: ['FB'] },
  { key: 'linkedin_post', label: { es: 'LinkedIn', en: 'LinkedIn' }, platforms: ['LinkedIn'] },
  { key: 'x_post', label: { es: 'Post X', en: 'X Post' }, platforms: ['X'] },
  { key: 'story_sequence', label: { es: 'Historias', en: 'Stories' }, platforms: ['IG', 'FB'] },
  { key: 'text_post', label: { es: 'Texto Standalone', en: 'Text Post' }, platforms: ['IG', 'FB', 'X', 'LinkedIn'] },
  { key: 'infographic', label: { es: 'Infografía', en: 'Infographic' }, platforms: ['IG', 'FB'] },
] as const

export type FormatKey = typeof FORMAT_DEFS[number]['key']
export type InputType = 'topic' | 'testimony' | 'before_after' | 'transcript' | 'personal'

export const INPUT_TYPE_LABELS: Record<InputType, { es: string; en: string }> = {
  topic: { es: 'Tema / Idea', en: 'Topic / Idea' },
  testimony: { es: 'Testimonio', en: 'Testimonial' },
  before_after: { es: 'Antes / Después', en: 'Before / After' },
  transcript: { es: 'Transcripción', en: 'Transcript' },
  personal: { es: 'Personal / BTS', en: 'Personal / BTS' },
}

export function buildSystemPrompt(): string {
  return `You are the content creator for MasteringReady, a professional audio analysis platform for musicians and producers. Your job is to take a single input and multiply it into 9 content formats following the Hormozi content multiplication method.

## Brand Voice
- MasteringReady sounds like a knowledgeable audio engineer, not a salesy app.
- Factual, direct, technical but accessible.
- Never use hype words like "amazing", "incredible", "game-changer".
- Never moralize or give unsolicited praise. State what's measurable.
- CTA is always to masteringready.com — never pushy, always natural.
- Primary language: ES LATAM Neutro (no regionalismos, no Spain Spanish).
- For LinkedIn and international X: US English.
- Never use em dashes (—) in copy.

## Personal/BTS Content
When the input is personal/behind-the-scenes content:
- Write in first person as if you're the audio engineer behind MasteringReady
- Sound authentic, casual, relatable, like talking to a friend who also makes music
- Don't force a CTA unless the concept naturally leads to one
- Studio life details (tea, headphones, late nights, bugs) make it feel real
- Opinions should be conversational and slightly provocative but never arrogant
- Keep MR mentions subtle in personal posts, the brand is implied through expertise

## The 9 Formats

### 1. Reel/Short Script (30-60 sec)
- Hook (first 3 seconds must stop the scroll)
- Value (the insight/story)
- CTA (subtle, not "BUY NOW")
- Include visual directions in [brackets]
- Language: ES

### 2. Carousel (slide-by-slide copy for Canva)
- 5-7 slides
- Slide 1: Hook headline (big, bold)
- Slides 2-6: One point per slide, short text
- Last slide: CTA
- Language: ES

### 3. IG Caption
- Hook first line (shows before "more...")
- Value paragraphs (short, spaced)
- CTA
- 15-20 relevant hashtags
- Language: ES

### 4. FB Post
- Longer, conversational tone
- Storytelling format
- No hashtags (FB doesn't use them effectively)
- Language: ES

### 5. LinkedIn Post
- Professional angle
- Data-driven insights
- Industry relevance
- Language: EN (English only)

### 6. X Post (Tweet)
- Max 280 chars per version
- Punchy, quotable
- Generate TWO versions:
  - ES version
  - EN version

### 7. Story Sequence (3-5 stories)
- Each story: 1-2 lines max
- Story 1: Hook/question
- Story 2-4: Build the point
- Last story: CTA with link sticker direction
- Language: ES

### 8. Standalone Text Post
- No image/video dependency
- Short lines, spaced, storytelling style
- Start with the most impactful result, NOT with "Esto paso..."
- Include real quote if available
- Generate TWO versions:
  - ES version (for IG, FB, X)
  - EN version (for LinkedIn, X international)

### 9. Single-Image Infographic (copy for design)
- 1080x1080 or 1080x1350 layout
- Max 5 text elements
- Must tell the complete story in one image
- Before/After with big numbers if applicable
- Structure: HEADLINE, BEFORE, AFTER, FIX LINE, BOTTOM
- Language: ES

## Output Format
Return a JSON object with this exact structure:
{
  "reel_script": { "es": "..." },
  "carousel": { "es": "..." },
  "ig_caption": { "es": "..." },
  "fb_post": { "es": "..." },
  "linkedin_post": { "en": "..." },
  "x_post": { "es": "...", "en": "..." },
  "story_sequence": { "es": "..." },
  "text_post": { "es": "...", "en": "..." },
  "infographic": { "es": "..." }
}

Each value should be the complete, ready-to-use content for that format. Use line breaks (\\n) for formatting within each piece.`
}

export function buildUserPrompt(inputType: InputType, inputText: string): string {
  const typeLabels: Record<InputType, string> = {
    topic: 'Topic/Idea',
    testimony: 'User Testimonial',
    before_after: 'Before/After Data',
    transcript: 'Video Transcript',
    personal: 'Personal/BTS Content',
  }

  return `Input type: ${typeLabels[inputType]}

Input:
${inputText}

Generate all 9 content formats from this input. Return ONLY the JSON object, no additional text.`
}

export function buildSingleFormatUserPrompt(inputType: InputType, inputText: string, formatType: FormatKey): string {
  const typeLabels: Record<InputType, string> = {
    topic: 'Topic/Idea',
    testimony: 'User Testimonial',
    before_after: 'Before/After Data',
    transcript: 'Video Transcript',
    personal: 'Personal/BTS Content',
  }

  const formatLabel = FORMAT_DEFS.find(f => f.key === formatType)?.label.en || formatType

  return `Input type: ${typeLabels[inputType]}

Input:
${inputText}

Generate ONLY the "${formatLabel}" format (key: "${formatType}"). Return ONLY a JSON object with this structure:
{ "${formatType}": { "es": "...", "en": "..." } }

Include "en" only if this format requires English (linkedin_post, x_post, text_post). Otherwise just include "es".`
}

/**
 * Content Concept Bank — Personal Brand + MR Mix
 * Auto-rotates concepts for content generation.
 * Ratio target: 60% educational/testimonial, 25% personal/BTS, 10% opinion, 5% CTA
 */

export type ConceptCategory = 'educational' | 'testimonial' | 'personal' | 'bts' | 'opinion' | 'cta'

export interface ContentConcept {
  category: ConceptCategory
  input_type: 'topic' | 'testimony' | 'before_after' | 'transcript' | 'personal'
  prompt_es: string
  prompt_en: string
  needs_photo?: boolean
  photo_suggestion_es?: string
  photo_suggestion_en?: string
}

// --- Educational (MR-focused) ---

const EDUCATIONAL_CONCEPTS: ContentConcept[] = [
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Qué es LUFS y por qué importa para streaming',
    prompt_en: 'What is LUFS and why it matters for streaming',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Tu mezcla tiene demasiado sub? Cómo saberlo sin subwoofer',
    prompt_en: 'Does your mix have too much sub? How to tell without a subwoofer',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'La diferencia entre mezcla y master en 1 minuto',
    prompt_en: 'The difference between mixing and mastering in 1 minute',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Por qué True Peak importa más de lo que crees',
    prompt_en: 'Why True Peak matters more than you think',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Headroom: cuánto dejar y por qué',
    prompt_en: 'Headroom: how much to leave and why',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'PLR bajo = mezcla aplastada. Qué hacer.',
    prompt_en: 'Low PLR = crushed mix. What to do.',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Imagen estéreo: cuándo es mucho y cuándo es poco',
    prompt_en: 'Stereo image: when is it too wide and when too narrow',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Crest Factor explicado para productores',
    prompt_en: 'Crest Factor explained for producers',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Los 3 errores más comunes en mezclas de bedroom producers',
    prompt_en: 'The 3 most common mistakes in bedroom producer mixes',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Frecuencias: dónde vive cada instrumento',
    prompt_en: 'Frequencies: where each instrument lives',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Cómo preparar tu mezcla para mastering (checklist)',
    prompt_en: 'How to prepare your mix for mastering (checklist)',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Referencia vs tu mezcla: cómo comparar correctamente',
    prompt_en: 'Reference vs your mix: how to compare correctly',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'El mito del loudness war: por qué más fuerte no es mejor',
    prompt_en: 'The loudness war myth: why louder is not better',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'Compatibilidad mono: por qué tu mezcla suena raro en un teléfono',
    prompt_en: 'Mono compatibility: why your mix sounds weird on a phone',
  },
  {
    category: 'educational',
    input_type: 'topic',
    prompt_es: 'EQ correctivo vs EQ creativo: cuándo usar cada uno',
    prompt_en: 'Corrective EQ vs creative EQ: when to use each one',
  },
]

// --- Personal / BTS ---

const PERSONAL_CONCEPTS: ContentConcept[] = [
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Sesión de mastering con té y audífonos buenos. Así se empieza el día.',
    prompt_en: 'Mastering session with tea and good headphones. This is how the day starts.',
    needs_photo: true,
    photo_suggestion_es: 'Foto de tu taza de té/café al lado de tu setup de producción',
    photo_suggestion_en: 'Photo of your tea/coffee mug next to your production setup',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Las mejores decisiones de mezcla las tomo a las 2am. O las peores. Nunca se sabe.',
    prompt_en: 'The best mixing decisions happen at 2am. Or the worst. You never know.',
    needs_photo: true,
    photo_suggestion_es: 'Foto de tu pantalla o setup de noche, con poca luz',
    photo_suggestion_en: 'Photo of your screen or setup at night, low light',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Esto es lo que escucho cuando reviso la imagen estéreo de una mezcla.',
    prompt_en: 'This is what I hear when I check a mix\'s stereo image.',
    needs_photo: true,
    photo_suggestion_es: 'Captura de pantalla de un analizador estéreo o de tu DAW con la mezcla abierta',
    photo_suggestion_en: 'Screenshot of a stereo analyzer or your DAW with the mix open',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Hoy arreglé un bug que llevaba 3 días. La satisfacción es real.',
    prompt_en: 'Today I fixed a bug that took 3 days. The satisfaction is real.',
    needs_photo: true,
    photo_suggestion_es: 'Foto de tu pantalla con código o la terminal, sin mostrar datos sensibles',
    photo_suggestion_en: 'Photo of your screen with code or terminal, no sensitive data showing',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Estos audífonos llevan 4 años conmigo. No necesitas lo más caro.',
    prompt_en: 'These headphones have been with me for 4 years. You don\'t need the most expensive.',
    needs_photo: true,
    photo_suggestion_es: 'Foto de tus audífonos, mostrando el uso natural',
    photo_suggestion_en: 'Photo of your headphones, showing natural wear',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Mezcla número [X] analizada en Mastering Ready.',
    prompt_en: 'Mix number [X] analyzed on Mastering Ready.',
    needs_photo: true,
    photo_suggestion_es: 'Captura de pantalla del dashboard de admin mostrando el conteo de análisis',
    photo_suggestion_en: 'Screenshot of admin dashboard showing the analysis count',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Cada mezcla que analizo me enseña algo nuevo sobre cómo producen en [género].',
    prompt_en: 'Every mix I analyze teaches me something new about how they produce in [genre].',
    needs_photo: true,
    photo_suggestion_es: 'Foto de tu DAW o de la interfaz de Mastering Ready con un análisis abierto',
    photo_suggestion_en: 'Photo of your DAW or Mastering Ready interface with an analysis open',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Mi rutina antes de sentarme a masterizar: té, 10 minutos de silencio, calibrar oídos.',
    prompt_en: 'My routine before sitting down to master: tea, 10 minutes of silence, calibrate ears.',
    needs_photo: true,
    photo_suggestion_es: 'Foto de tu espacio de trabajo en calma, antes de empezar a trabajar',
    photo_suggestion_en: 'Photo of your workspace in calm, before starting to work',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Hay días donde nada suena bien. Es normal. Mañana suena mejor.',
    prompt_en: 'There are days where nothing sounds right. It\'s normal. Tomorrow sounds better.',
    needs_photo: true,
    photo_suggestion_es: 'Foto introspectiva: audífonos colgados, pantalla apagada, o mirando por la ventana',
    photo_suggestion_en: 'Introspective photo: headphones hanging, screen off, or looking out the window',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Escuchando [artista] mientras trabajo. La inspiración viene de donde menos esperas.',
    prompt_en: 'Listening to [artist] while working. Inspiration comes from where you least expect.',
    needs_photo: true,
    photo_suggestion_es: 'Captura de pantalla de Spotify/Apple Music con el artista que estás escuchando',
    photo_suggestion_en: 'Screenshot of Spotify/Apple Music with the artist you\'re listening to',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Mi setup no es glamoroso pero hace el trabajo.',
    prompt_en: 'My setup isn\'t glamorous but it gets the job done.',
    needs_photo: true,
    photo_suggestion_es: 'Foto honesta de tu escritorio/setup completo, sin arreglar nada',
    photo_suggestion_en: 'Honest photo of your desk/full setup, without tidying up',
  },
  {
    category: 'personal',
    input_type: 'personal',
    prompt_es: 'Sábado y sigo revisando mezclas. No es trabajo cuando te gusta.',
    prompt_en: 'Saturday and still reviewing mixes. It\'s not work when you enjoy it.',
    needs_photo: true,
    photo_suggestion_es: 'Foto casual de fin de semana: setup con ropa cómoda, luz natural',
    photo_suggestion_en: 'Casual weekend photo: setup with comfy clothes, natural light',
  },
]

// --- Opinion ---

const OPINION_CONCEPTS: ContentConcept[] = [
  {
    category: 'opinion',
    input_type: 'personal',
    prompt_es: 'Opinión impopular: tu mezcla no necesita más agudos.',
    prompt_en: 'Unpopular opinion: your mix doesn\'t need more highs.',
  },
  {
    category: 'opinion',
    input_type: 'personal',
    prompt_es: 'Todos hablan de plugins. Nadie habla de acústica.',
    prompt_en: 'Everyone talks about plugins. Nobody talks about acoustics.',
  },
  {
    category: 'opinion',
    input_type: 'personal',
    prompt_es: 'El mejor plugin del mundo no arregla una mala grabación.',
    prompt_en: 'The best plugin in the world doesn\'t fix a bad recording.',
  },
  {
    category: 'opinion',
    input_type: 'personal',
    prompt_es: 'Masterizar tu propia mezcla es como editarte a ti mismo. Se puede, pero...',
    prompt_en: 'Mastering your own mix is like editing yourself. It\'s possible, but...',
  },
  {
    category: 'opinion',
    input_type: 'personal',
    prompt_es: 'La gente sobrevalora el gear y subestima los oídos entrenados.',
    prompt_en: 'People overvalue gear and undervalue trained ears.',
  },
  {
    category: 'opinion',
    input_type: 'personal',
    prompt_es: 'No necesitas 47 plugins. Necesitas entender 3.',
    prompt_en: 'You don\'t need 47 plugins. You need to understand 3.',
  },
  {
    category: 'opinion',
    input_type: 'personal',
    prompt_es: 'Producir en audífonos no es ideal. Pero es 100% posible.',
    prompt_en: 'Producing on headphones isn\'t ideal. But it\'s 100% possible.',
  },
  {
    category: 'opinion',
    input_type: 'personal',
    prompt_es: 'La mezcla perfecta no existe. Existe la mezcla lista.',
    prompt_en: 'The perfect mix doesn\'t exist. The ready mix does.',
  },
]

// --- CTA (Direct) ---

const CTA_CONCEPTS: ContentConcept[] = [
  {
    category: 'cta',
    input_type: 'topic',
    prompt_es: 'Tu mezcla está lista para mastering? Hay una forma de saberlo. masteringready.com',
    prompt_en: 'Is your mix ready for mastering? There\'s a way to know. masteringready.com',
  },
  {
    category: 'cta',
    input_type: 'topic',
    prompt_es: '2 análisis gratis. Sin tarjeta. Sin trucos. masteringready.com',
    prompt_en: '2 free analyses. No card. No tricks. masteringready.com',
  },
  {
    category: 'cta',
    input_type: 'topic',
    prompt_es: 'Antes de mandar tu mezcla a mastering, verifícala. 2 minutos. masteringready.com',
    prompt_en: 'Before sending your mix to mastering, check it. 2 minutes. masteringready.com',
  },
  {
    category: 'cta',
    input_type: 'topic',
    prompt_es: 'Deja de adivinar si tu mezcla suena bien. Mide. masteringready.com',
    prompt_en: 'Stop guessing if your mix sounds good. Measure. masteringready.com',
  },
  {
    category: 'cta',
    input_type: 'topic',
    prompt_es: 'Tu productor favorito revisa su mezcla antes de entregar. Tú también deberías.',
    prompt_en: 'Your favorite producer checks their mix before delivering. You should too.',
  },
]

// --- All Concepts ---

export const ALL_CONCEPTS: ContentConcept[] = [
  ...EDUCATIONAL_CONCEPTS,
  ...PERSONAL_CONCEPTS,
  ...OPINION_CONCEPTS,
  ...CTA_CONCEPTS,
]

/** Alias for ALL_CONCEPTS — used by admin content page. */
export const CONCEPT_BANK = ALL_CONCEPTS

// --- Helpers ---

/**
 * Get concepts filtered by category.
 */
export function getConceptsByCategory(category: ConceptCategory): ContentConcept[] {
  return ALL_CONCEPTS.filter(c => c.category === category)
}

/**
 * Pick `count` random concepts respecting the given ratio.
 * Default ratio: 60% educational, 25% personal/bts, 10% opinion, 5% cta.
 *
 * "testimonial" concepts share the educational pool.
 * "bts" concepts share the personal pool.
 *
 * If a category pool doesn't have enough concepts to fill its allocation,
 * the remainder is redistributed to other categories.
 */
export function getRandomConcepts(
  count: number,
  ratio?: { educational: number; personal: number; opinion: number; cta: number }
): ContentConcept[] {
  const r = ratio ?? { educational: 60, personal: 25, opinion: 10, cta: 5 }
  const total = r.educational + r.personal + r.opinion + r.cta

  // Calculate how many concepts per category
  const allocations = {
    educational: Math.round((r.educational / total) * count),
    personal: Math.round((r.personal / total) * count),
    opinion: Math.round((r.opinion / total) * count),
    cta: Math.round((r.cta / total) * count),
  }

  // Adjust rounding to match exact count
  const allocated = Object.values(allocations).reduce((a, b) => a + b, 0)
  if (allocated < count) {
    allocations.educational += count - allocated
  } else if (allocated > count) {
    allocations.educational -= allocated - count
  }

  // Build category pools (educational includes testimonial, personal includes bts)
  const pools: Record<string, ContentConcept[]> = {
    educational: ALL_CONCEPTS.filter(c => c.category === 'educational' || c.category === 'testimonial'),
    personal: ALL_CONCEPTS.filter(c => c.category === 'personal' || c.category === 'bts'),
    opinion: ALL_CONCEPTS.filter(c => c.category === 'opinion'),
    cta: ALL_CONCEPTS.filter(c => c.category === 'cta'),
  }

  const result: ContentConcept[] = []
  let overflow = 0

  for (const [cat, needed] of Object.entries(allocations)) {
    const pool = [...pools[cat]]
    shuffleArray(pool)
    const take = Math.min(needed, pool.length)
    result.push(...pool.slice(0, take))
    overflow += needed - take
  }

  // Redistribute overflow: fill from any category with remaining concepts
  if (overflow > 0) {
    const used = new Set(result)
    const remaining = ALL_CONCEPTS.filter(c => !used.has(c))
    shuffleArray(remaining)
    result.push(...remaining.slice(0, overflow))
  }

  // Final shuffle so categories aren't grouped
  shuffleArray(result)

  return result
}

/** Fisher-Yates shuffle (in place). */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

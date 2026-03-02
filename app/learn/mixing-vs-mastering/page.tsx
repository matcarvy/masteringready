'use client'

/**
 * SEO Authority Page: Mixing vs Mastering
 * Target queries: "mixing vs mastering", "difference between mixing and mastering"
 * Bilingual: ES LATAM Neutro + US English
 */

import Link from 'next/link'
import { useLearn, useLearnMeta } from '../LearnContext'

// ============================================================================
// TRANSLATIONS
// ============================================================================

const t = {
  es: {
    h1: 'Mezcla vs Mastering: ¿cuál es la diferencia?',
    opening: `La mezcla y el mastering son dos procesos completamente distintos, con herramientas, objetivos y resultados diferentes. La mezcla toma las pistas individuales de tu proyecto (voces, baterías, guitarras, sintetizadores) y las combina en un archivo estéreo cohesivo. El mastering toma esa mezcla estéreo terminada y la optimiza para distribución: streaming, vinilo, CD o descarga digital.

Muchos productores confunden los dos procesos, o asumen que el mastering va a corregir problemas de la mezcla. La realidad es otra: el mastering no remezcla, refina. Si la base no es sólida, el mastering no puede construir encima de ella. Entender esta diferencia es lo que separa una producción amateur de una profesional. Y ese es el espacio donde Mastering Ready te ayuda a verificar si tu mezcla está lista antes de enviarla a masterizar.`,

    whatIsMixingTitle: '¿Qué es la mezcla?',
    whatIsMixingBody: `La mezcla es el proceso de combinar múltiples pistas de audio en un archivo estéreo (o surround). Es donde tomas las grabaciones individuales y las integras en un todo coherente.

Durante la mezcla, trabajas con:

\u2022 Balance de volumen entre instrumentos y voces
\u2022 Paneo (posición izquierda-derecha de cada elemento)
\u2022 Ecualización por pista (ajustar frecuencias para que cada instrumento tenga su espacio)
\u2022 Compresión y dinámica (controlar los picos y la energía de cada pista)
\u2022 Efectos (reverb, delay, saturación, modulación)
\u2022 Automatización (cambios de volumen, paneo o efectos a lo largo del tiempo)

El objetivo de la mezcla es claro: integrar todos los elementos de forma coherente y crear una base sólida. Si piensas en la mezcla como una receta, es el momento de combinar los ingredientes en las proporciones correctas. Una mezcla bien hecha es como darle a un chef ingredientes de primera calidad: todo lo que viene después va a funcionar mejor.`,

    whatIsMasteringTitle: '¿Qué es el mastering?',
    whatIsMasteringBody: `El mastering es el proceso final que optimiza la mezcla estéreo para distribución. No trabaja con pistas individuales, trabaja con el archivo estéreo completo que salió de la mezcla.

El mastering tiene tres objetivos principales:

1. Uniformidad y coherencia: que todas las canciones de un álbum o EP suenen como parte del mismo proyecto, con niveles consistentes y carácter tonal uniforme.

2. Optimización sónica: sacar el máximo potencial de la mezcla mediante ecualización sutil, compresión de bus master y limitación. Resaltar lo mejor de la mezcla sin alterar su carácter.

3. Compatibilidad técnica: asegurar que el audio cumpla con los estándares de las plataformas de distribución (Spotify, Apple Music, YouTube, CD, vinilo) en términos de loudness, true peak, formato y metadatos.

El mastering no es una varita mágica. Es un proceso de refinamiento que trabaja sobre lo que ya existe en la mezcla. No puede agregar lo que no está, y no puede quitar lo que está demasiado presente.`,

    comparisonTitle: 'Comparación lado a lado',
    comparisonHeaders: ['Aspecto', 'Mezcla', 'Mastering'],
    comparisonRows: [
      ['Entrada', 'Multipista (pistas individuales)', 'Archivo estéreo (mezcla terminada)'],
      ['Herramientas', 'EQ, compresión, efectos por pista', 'EQ, compresión y limitación en master bus'],
      ['Objetivo', 'Balance e integración de elementos', 'Optimización y pulido final'],
      ['Salida', 'Archivo estéreo (la mezcla)', 'Archivo listo para distribución'],
      ['Quién lo hace', 'Ingeniero de mezcla', 'Ingeniero de mastering'],
    ],

    metaphorTitle: 'La metáfora del clear coat',
    metaphorBody: `Piensa en un auto recién pintado. La pintura base es la mezcla: define el color, el acabado, la identidad visual del vehículo. El clear coat (capa transparente) es el mastering: no cambia el color, pero cuando la base es buena, todo brilla. Protege, resalta y da profundidad.

Ahora imagina aplicar clear coat sobre una pintura mal preparada, con imperfecciones, burbujas o zonas sin cubrir. El clear coat no las va a esconder. Las va a resaltar. Lo mismo pasa con el mastering: amplifica lo bueno y lo malo por igual.

Por eso la preparación de la mezcla antes del mastering es tan importante. No se trata de mezclar perfecto. Se trata de mezclar con intención, verificar que la base es sólida, y enviar un archivo que el ingeniero de mastering pueda trabajar con confianza.`,

    cannotFixTitle: 'Lo que el mastering NO puede arreglar',
    cannotFixBody: `Hay problemas fundamentales de la mezcla que el mastering no tiene forma de resolver:

\u2022 Desbalance de frecuencias: si la mezcla tiene demasiado graves o carece de presencia en los agudos, el mastering puede ajustar levemente, pero no puede reestructurar el balance frecuencial sin afectar todos los elementos al mismo tiempo.

\u2022 Problemas de fase: cancelaciones de fase entre micrófonos o pistas duplicadas no se corrigen en mastering. El daño ya está en el archivo estéreo.

\u2022 Distorsión por sobrecompresión: si la mezcla se comprimió en exceso y perdió dinámica, ese daño es permanente. El mastering no puede restaurar transientes que ya se aplastaron.

\u2022 Falta de headroom: si la mezcla clipea o está al límite (0 dBFS), el ingeniero de mastering no tiene espacio para trabajar. Un rango de -6 a -3 dBFS de headroom es lo recomendado.

\u2022 Decisiones de arreglo: si un instrumento está de más, o falta un elemento clave, eso es un problema de producción y arreglo, no de mastering.`,

    gapTitle: 'La brecha entre mezcla y mastering',
    gapBody: `Existe un espacio crítico entre "terminé de mezclar" y "está listo para mastering." Es una zona que la mayoría de productores cruzan sin detenerse a verificar.

Es en esta brecha donde ocurren la mayoría de los problemas: mezclas enviadas sin el headroom suficiente, con picos de true peak que van a distorsionar al convertir a formatos de streaming, con problemas de fase que el productor nunca detectó porque solo escuchó en sus monitores.

Mastering Ready existe para cerrar esta brecha. Es el paso de verificación entre tu mezcla y el mastering. En lugar de adivinar si tu mezcla está lista, lo puedes saber con datos concretos.`,

    closeGapTitle: 'Cómo cerrar la brecha',
    closeGapBody: `Antes de enviar tu mezcla a mastering, analízala. Verifica los puntos técnicos que un ingeniero de mastering va a evaluar:

\u2022 Headroom: ¿tienes entre -6 y -3 dBFS de espacio? Si no, el ingeniero de mastering no tiene dónde trabajar.

\u2022 True Peak: ¿tus picos reales están por debajo de -1 dBTP? Valores por encima generan distorsión en la conversión a formatos de streaming.

\u2022 Imagen estéreo: ¿la correlación estéreo es saludable? Valores bajos pueden causar problemas de compatibilidad mono.

\u2022 Balance de frecuencias: ¿hay un desbalance evidente entre graves, medios y agudos?

\u2022 Puntuación 0 a 100: Mastering Ready analiza tu mezcla y te da una puntuación de 0 a 100. Si tu puntuación es 85 o más, tu mezcla está lista para mastering. Si no, te dice qué revisar y por qué.

Tienes 2 análisis completos gratis, con informe detallado y PDF descargable. Límite de 200 MB por archivo.`,

    ctaHeading: 'Cierra la brecha antes de masterizar',
    ctaSubtext: 'Sube tu mezcla y descubre si está lista. Gratis, sin tarjeta de crédito.',
    ctaButton: 'Analiza tu mezcla gratis',
  },

  en: {
    h1: 'Mixing vs Mastering: what\'s the difference?',
    opening: `Mixing and mastering are two completely different processes, with different tools, objectives, and outcomes. Mixing takes the individual tracks of your project (vocals, drums, guitars, synths) and combines them into a cohesive stereo file. Mastering takes that finished stereo mix and optimizes it for distribution: streaming, vinyl, CD, or digital download.

Many producers confuse the two processes, or assume that mastering will fix mix problems. The reality is different: mastering does not remix, it refines. If the foundation is not solid, mastering cannot build on top of it. Understanding this difference is what separates an amateur production from a professional one. And it is the space where Mastering Ready helps you verify whether your mix is ready before sending it off to be mastered.`,

    whatIsMixingTitle: 'What is mixing?',
    whatIsMixingBody: `Mixing is the process of combining multiple audio tracks into a stereo (or surround) file. It is where you take individual recordings and integrate them into a coherent whole.

During mixing, you work with:

\u2022 Volume balance between instruments and vocals
\u2022 Panning (left-right position of each element)
\u2022 Per-track equalization (adjusting frequencies so each instrument has its own space)
\u2022 Compression and dynamics (controlling peaks and energy of each track)
\u2022 Effects (reverb, delay, saturation, modulation)
\u2022 Automation (volume, panning, or effect changes over time)

The goal of mixing is clear: integrate all elements coherently and create a solid foundation. If you think of mixing as a recipe, this is the moment of combining ingredients in the right proportions. A well-prepared mix is like giving a chef first-quality ingredients: everything that comes after will work better.`,

    whatIsMasteringTitle: 'What is mastering?',
    whatIsMasteringBody: `Mastering is the final process that optimizes the stereo mix for distribution. It does not work with individual tracks. It works with the complete stereo file that came out of the mix.

Mastering has three main objectives:

1. Uniformity and coherence: making all songs on an album or EP sound like part of the same project, with consistent levels and uniform tonal character.

2. Sonic optimization: getting the maximum potential out of the mix through subtle equalization, master bus compression, and limiting. Bringing out the best in the mix without altering its character.

3. Technical compatibility: ensuring the audio meets the standards of distribution platforms (Spotify, Apple Music, YouTube, CD, vinyl) in terms of loudness, true peak, format, and metadata.

Mastering is not a magic wand. It is a refinement process that works with what already exists in the mix. It cannot add what is not there, and it cannot remove what is too present.`,

    comparisonTitle: 'Side-by-side comparison',
    comparisonHeaders: ['Aspect', 'Mixing', 'Mastering'],
    comparisonRows: [
      ['Input', 'Multitrack (individual tracks)', 'Stereo file (finished mix)'],
      ['Tools', 'Per-track EQ, compression, effects', 'Master bus EQ, compression, and limiting'],
      ['Goal', 'Balance and element integration', 'Final optimization and polish'],
      ['Output', 'Stereo file (the mix)', 'Distribution-ready file'],
      ['Who does it', 'Mixing engineer', 'Mastering engineer'],
    ],

    metaphorTitle: 'The clear coat metaphor',
    metaphorBody: `Think of a freshly painted car. The base paint is the mix: it defines the color, the finish, the visual identity of the vehicle. The clear coat is the mastering: it does not change the color, but when the base is good, everything shines. It protects, highlights, and adds depth.

Now imagine applying clear coat over poorly prepared paint, with imperfections, bubbles, or uncovered areas. The clear coat will not hide them. It will highlight them. The same thing happens with mastering: it amplifies the good and the bad equally.

That is why preparing your mix before mastering is so important. It is not about mixing perfectly. It is about mixing with intention, verifying that the foundation is solid, and sending a file that the mastering engineer can work with confidence.`,

    cannotFixTitle: 'What mastering CANNOT fix',
    cannotFixBody: `There are fundamental mix problems that mastering has no way of solving:

\u2022 Frequency imbalance: if the mix has too much low end or lacks presence in the highs, mastering can adjust slightly, but it cannot restructure the frequency balance without affecting all elements at the same time.

\u2022 Phase problems: phase cancellations between microphones or duplicated tracks cannot be corrected in mastering. The damage is already in the stereo file.

\u2022 Distortion from over-compression: if the mix was compressed excessively and lost dynamics, that damage is permanent. Mastering cannot restore transients that were already crushed.

\u2022 Lack of headroom: if the mix clips or is at the limit (0 dBFS), the mastering engineer has no room to work. A headroom range of -6 to -3 dBFS is recommended.

\u2022 Arrangement decisions: if an instrument does not belong, or a key element is missing, that is a production and arrangement problem, not a mastering one.`,

    gapTitle: 'The gap between mixing and mastering',
    gapBody: `There is a critical space between "I finished mixing" and "it is ready for mastering." It is a zone that most producers cross without stopping to verify.

This gap is where most problems happen: mixes sent without enough headroom, with true peak spikes that will distort when converting to streaming formats, with phase issues the producer never detected because they only listened on their monitors.

Mastering Ready exists to close this gap. It is the verification step between your mix and mastering. Instead of guessing whether your mix is ready, you can know with concrete data.`,

    closeGapTitle: 'How to close the gap',
    closeGapBody: `Before sending your mix to mastering, analyze it. Check the technical points that a mastering engineer will evaluate:

\u2022 Headroom: do you have between -6 and -3 dBFS of space? If not, the mastering engineer has nowhere to work.

\u2022 True Peak: are your real peaks below -1 dBTP? Values above that threshold cause distortion when converting to streaming formats.

\u2022 Stereo image: is the stereo correlation healthy? Low values can cause mono compatibility issues.

\u2022 Frequency balance: is there an obvious imbalance between lows, mids, and highs?

\u2022 Score from 0 to 100: Mastering Ready analyzes your mix and gives you a score from 0 to 100. If your score is 85 or above, your mix is ready for mastering. If not, it tells you what to check and why.

You get 2 free full analyses, with a detailed report and downloadable PDF. 200 MB file limit.`,

    ctaHeading: 'Close the gap before mastering',
    ctaSubtext: 'Upload your mix and find out if it is ready. Free, no credit card required.',
    ctaButton: 'Analyze your mix free',
  },
}

// ============================================================================
// STYLES
// ============================================================================

const h2Style: React.CSSProperties = {
  fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
  fontWeight: 700,
  color: 'var(--mr-text-primary)',
  marginTop: '2.5rem',
  marginBottom: '1rem',
}

// ============================================================================
// COMPONENTS
// ============================================================================

function Section({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h2 style={h2Style}>{title}</h2>
      <div style={{
        fontSize: '1rem',
        lineHeight: 1.75,
        color: 'var(--mr-text-secondary)',
        marginBottom: '2.5rem',
        whiteSpace: 'pre-line',
      }}>
        {body}
      </div>
    </>
  )
}

// ============================================================================
// PAGE
// ============================================================================

export default function MixingVsMasteringPage() {
  const { lang } = useLearn()

  useLearnMeta({
    titleEs: 'Mezcla vs Mastering: diferencia, proceso y cuándo tu mezcla está lista',
    titleEn: 'Mixing vs Mastering: Difference, Process, and When Your Mix Is Ready',
    descEs: 'Entiende la diferencia entre mezcla y mastering. Qué hace cada proceso, qué puede y qué no puede corregir el mastering, y cómo saber si tu mezcla está lista.',
    descEn: 'Understand the difference between mixing and mastering. What each process does, what mastering can and cannot fix, and how to know if your mix is ready.',
  })

  const c = t[lang]

  return (
    <article style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: '2rem 1.5rem 4rem',
    }}>
        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: '1.5rem',
          color: 'var(--mr-text-primary)',
        }}>
          {c.h1}
        </h1>

        {/* Answer-first opening */}
        <div style={{
          fontSize: '1.0625rem',
          lineHeight: 1.75,
          color: 'var(--mr-text-secondary)',
          marginBottom: '2.5rem',
          whiteSpace: 'pre-line',
        }}>
          {c.opening}
        </div>

        {/* What is mixing? */}
        <Section title={c.whatIsMixingTitle} body={c.whatIsMixingBody} />

        {/* What is mastering? */}
        <Section title={c.whatIsMasteringTitle} body={c.whatIsMasteringBody} />

        {/* Side-by-side comparison table */}
        <h2 style={h2Style}>{c.comparisonTitle}</h2>
        <div style={{
          overflowX: 'auto',
          marginBottom: '2.5rem',
          border: '1px solid var(--mr-border)',
          borderRadius: 'var(--mr-radius)',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9375rem',
            lineHeight: 1.6,
          }}>
            <thead>
              <tr>
                {c.comparisonHeaders.map((h, i) => (
                  <th key={i} style={{
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    background: 'var(--mr-bg-elevated)',
                    color: 'var(--mr-text-primary)',
                    fontWeight: 700,
                    borderBottom: '1px solid var(--mr-border)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.comparisonRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '0.75rem 1rem',
                      borderBottom: ri < c.comparisonRows.length - 1 ? '1px solid var(--mr-border)' : 'none',
                      color: ci === 0 ? 'var(--mr-text-primary)' : 'var(--mr-text-secondary)',
                      fontWeight: ci === 0 ? 600 : 400,
                      verticalAlign: 'top',
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* The clear coat metaphor */}
        <Section title={c.metaphorTitle} body={c.metaphorBody} />

        {/* What mastering CANNOT fix */}
        <Section title={c.cannotFixTitle} body={c.cannotFixBody} />

        {/* The gap between mixing and mastering */}
        <Section title={c.gapTitle} body={c.gapBody} />

        {/* How to close the gap */}
        <Section title={c.closeGapTitle} body={c.closeGapBody} />

        {/* CTA gradient button */}
        <div style={{
          marginTop: '3rem',
          padding: '2.5rem 2rem',
          borderRadius: 'var(--mr-radius-lg)',
          background: 'var(--mr-gradient)',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: '0.75rem',
            marginTop: 0,
          }}>
            {c.ctaHeading}
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.85)',
            marginBottom: '1.5rem',
            lineHeight: 1.5,
          }}>
            {c.ctaSubtext}
          </p>
          <Link href="/#analyze" style={{
            display: 'inline-block',
            padding: '0.875rem 2rem',
            background: '#ffffff',
            color: '#6366f1',
            fontWeight: 700,
            fontSize: '1rem',
            borderRadius: 'var(--mr-radius)',
            textDecoration: 'none',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            {c.ctaButton}
          </Link>
        </div>

        {/* Related Articles */}
        <div style={{ marginTop: '3rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--mr-text-primary)' }}>
            {lang === 'es' ? 'Artículos relacionados' : 'Related articles'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/learn/is-my-mix-ready" style={{ color: 'var(--mr-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
              {lang === 'es' ? '¿Mi mezcla está lista para mastering?' : 'Is my mix ready for mastering?'}
            </Link>
            <Link href="/learn/prepare-mix-for-mastering" style={{ color: 'var(--mr-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
              {lang === 'es' ? '10 pasos para preparar tu mezcla para mastering' : '10 steps to prepare your mix for mastering'}
            </Link>
            <Link href="/learn/lufs-for-streaming" style={{ color: 'var(--mr-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
              {lang === 'es' ? 'LUFS para streaming: guía práctica' : 'LUFS for streaming: practical guide'}
            </Link>
            <Link href="/learn/mastering-ready-vs-competitors" style={{ color: 'var(--mr-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
              {lang === 'es' ? 'Mastering Ready vs la competencia' : 'Mastering Ready vs competitors'}
            </Link>
          </div>
        </div>

    </article>
  )
}

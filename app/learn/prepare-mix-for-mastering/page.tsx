'use client'

import Link from 'next/link'
import { useLearn, useLearnMeta } from '../LearnContext'

export default function PrepareMixForMasteringPage() {
  const { lang } = useLearn()

  useLearnMeta({
    titleEs: 'Cómo preparar tu mezcla para mastering: guía en 10 pasos',
    titleEn: 'How to Prepare Your Mix for Mastering: 10-Step Guide',
    descEs: 'Guía práctica para preparar tu mezcla antes de enviarla a mastering. Headroom, True Peak, exportación, dithering y más. Verifica gratis con Mastering Ready.',
    descEn: 'Step-by-step guide to prepare your mix before sending it to mastering. Headroom, True Peak, export settings, dithering and more. Verify free with Mastering Ready.',
  })

  return (
    <article style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: 'clamp(2rem, 6vw, 4rem) clamp(1rem, 5vw, 2rem)',
    }}>
        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: '1.5rem',
          color: 'var(--mr-text-primary)',
        }}>
          {lang === 'es'
            ? 'Cómo preparar tu mezcla para mastering'
            : 'How to prepare your mix for mastering'}
        </h1>

        {/* Opening: answer-first summary */}
        <div className="learn-callout" style={{ marginBottom: '2.5rem' }}>
          <p style={{
            fontSize: '1.0625rem',
            lineHeight: 1.7,
            color: 'var(--mr-text-primary)',
            margin: 0,
          }}>
            {lang === 'es'
              ? 'Preparar una mezcla para mastering no es cuestión de suerte. Es un proceso con pasos concretos. En resumen: define tu objetivo antes de tocar un fader, limpia tu sesión, balancea frecuencias con EQ sustractivo, controla la dinámica sin aplastar, usa efectos con intención, compara con tracks de referencia, revisa el balance estéreo y la compatibilidad mono, escucha en distintos sistemas, exporta en WAV o AIFF a 24-bit (o 32-float) con headroom entre -6 y -3 dBFS, y haz una revisión final con oídos frescos. Estos 10 pasos son la diferencia entre una mezcla que el ingeniero de mastering recibe con gusto y una que le genera dudas.'
              : 'Preparing a mix for mastering is not about luck. It is a process with concrete steps. In short: define your objective before touching a fader, clean your session, balance frequencies with subtractive EQ, control dynamics without crushing, use effects with intention, compare against reference tracks, check stereo balance and mono compatibility, listen on different systems, export as WAV or AIFF at 24-bit (or 32-float) with headroom between -6 and -3 dBFS, and do a final review with fresh ears. These 10 steps are the difference between a mix your mastering engineer receives gladly and one that raises questions.'}
          </p>
        </div>

        {/* Epigraph */}
        <p style={{
          fontSize: '1rem',
          fontStyle: 'italic',
          color: 'var(--mr-text-secondary)',
          marginBottom: '3rem',
          textAlign: 'center',
        }}>
          {lang === 'es'
            ? '"No se trata de mezclar perfecto. Se trata de mezclar con intención."'
            : '"It\'s not about mixing perfectly. It\'s about mixing with intention."'}
        </p>

        {/* Section 1 */}
        <Section number={1} lang={lang}
          titleEs="Define tu objetivo"
          titleEn="Define your objective"
        >
          <P lang={lang}
            es="Antes de exportar un solo archivo, hazte una pregunta: ¿qué quieres que suene al final? No es lo mismo preparar un track para un EP indie que para un single de reggaetón que va a competir en playlists de Spotify."
            en="Before you export a single file, ask yourself one question: what do you want the final result to sound like? Preparing a track for an indie EP is not the same as preparing a single meant to compete on Spotify playlists."
          />
          <div className="learn-callout">
            <P lang={lang}
              es="Piensa en la mezcla como los ingredientes de un plato. El ingeniero de mastering es el chef que le da el toque final. Pero si los ingredientes están en mal estado o no combinan, no hay técnica que salve el resultado."
              en="Think of the mix as the ingredients of a dish. The mastering engineer is the chef who gives it the final touch. But if the ingredients are in bad shape or don't combine well, no technique can save the result."
            />
          </div>
          <P lang={lang}
            es="Define el sonido de referencia, el rango dinámico que buscas, y si necesitas versiones alternativas (instrumental, vocal up, TV mix). Eso le da al ingeniero un mapa claro para trabajar."
            en="Define your reference sound, the dynamic range you are aiming for, and whether you need alternate versions (instrumental, vocal up, TV mix). That gives your engineer a clear map to work with."
          />
        </Section>

        {/* Section 2 */}
        <Section number={2} lang={lang}
          titleEs="Limpia tu sesión"
          titleEn="Clean your session"
        >
          <P lang={lang}
            es="Abre tu sesión como si otra persona fuera a abrirla mañana. ¿Se entiende? Nombres claros en cada pista, buses organizados, tracks vacíos eliminados, crossfades en todos los cortes."
            en="Open your session as if someone else were going to open it tomorrow. Does it make sense? Clear names on every track, organized buses, empty tracks deleted, crossfades on every edit."
          />
          <P lang={lang}
            es="Revisa cada pista en solo. Busca ruidos de fondo, clics, pops, respiraciones no deseadas. Lo que no escuchas en la mezcla puede aparecer después del mastering, cuando la compresión y el EQ amplifican lo que estaba oculto."
            en="Solo every track. Look for background noise, clicks, pops, unwanted breaths. What you don't hear in the mix can surface after mastering, when compression and EQ amplify what was hidden."
          />
          <div className="learn-callout">
            <P lang={lang}
              es="Es como los cimientos de un edificio. No los ves, pero si están mal, todo lo que construyas encima se mueve."
              en="It is like a building's foundation. You don't see it, but if it is flawed, everything you build on top shifts."
            />
          </div>
        </Section>

        {/* Section 3 */}
        <Section number={3} lang={lang}
          titleEs="Balancea las frecuencias"
          titleEn="Balance your frequencies"
        >
          <div className="learn-callout">
            <P lang={lang}
              es="Piensa en el espectro de frecuencias como una orquesta. Cada instrumento tiene su rango. Si todos tocan en el mismo registro, se genera un caos donde nadie brilla."
              en="Think of the frequency spectrum like an orchestra. Every instrument has its range. If everyone plays in the same register, you get chaos where nothing shines."
            />
          </div>
          <P lang={lang}
            es="Trabaja con EQ sustractivo antes que aditivo. Antes de subir un brillo, pregúntate qué está ocupando ese espacio y quítalo. Corta los graves innecesarios en voces y guitarras. Limpia el rango medio de acumulaciones. Dale espacio al bajo y al kick para que respiren."
            en="Work with subtractive EQ before additive. Before boosting brightness, ask yourself what is occupying that space and remove it. Cut unnecessary lows on vocals and guitars. Clean up mud in the midrange. Give the bass and kick room to breathe."
          />
          <P lang={lang}
            es="Un gain staging limpio te ayuda: apunta a picos de -18 a -12 dBFS por pista individual. Eso mantiene los plugins trabajando en su rango óptimo y te deja espacio para la mezcla."
            en="Clean gain staging helps: aim for peaks between -18 and -12 dBFS per individual track. That keeps your plugins working in their optimal range and leaves you room to mix."
          />
        </Section>

        {/* Section 4 */}
        <Section number={4} lang={lang}
          titleEs="Controla la dinámica"
          titleEn="Control the dynamics"
        >
          <P lang={lang}
            es="La compresión es una de las herramientas más poderosas y más abusadas. Comprimir bien es saber cuándo apretar y cuándo dejar pasar."
            en="Compression is one of the most powerful and most abused tools. Good compression is knowing when to squeeze and when to let go."
          />
          <div className="learn-callout">
            <P lang={lang}
              es="Comprime donde sea necesario: una voz que se pierde en el coro, un bajo que se descontrola en ciertas notas, un snare que no tiene pegada consistente. Pero no comprimas el master bus para que suene más fuerte. Eso es como intentar meter un elefante en una caja de zapatos."
              en="Compress where it is needed: a vocal that gets lost in the chorus, a bass that gets unruly on certain notes, a snare that lacks consistent punch. But don't compress the master bus just to make it louder. That is like trying to fit an elephant into a shoebox."
            />
          </div>
          <P lang={lang}
            es="Deja que el mastering se encargue de la dinámica global. Tu trabajo es que cada elemento tenga un rango dinámico controlado pero natural. Si aplastas todo, le quitas al ingeniero el material con el que trabaja."
            en="Let mastering handle the global dynamics. Your job is to make sure each element has a controlled but natural dynamic range. If you crush everything, you remove the material the engineer needs to work with."
          />
        </Section>

        {/* Section 5 */}
        <Section number={5} lang={lang}
          titleEs="Usa los efectos con criterio"
          titleEn="Use effects wisely"
        >
          <P lang={lang}
            es="Reverb y delay son tus herramientas de profundidad. Crean la sensación de espacio, de distancia, de atmósfera. Pero cuando se abusan, convierten la mezcla en un charco donde nada se distingue."
            en="Reverb and delay are your depth tools. They create a sense of space, distance, and atmosphere. But when overused, they turn the mix into a puddle where nothing stands out."
          />
          <P lang={lang}
            es="Usa pre-delay en las reverbs para mantener la definición de la fuente. Filtra los graves de la reverb para que no engorde el rango bajo. Y revisa las colas: si la reverb de un elemento todavía suena cuando entra el siguiente, hay conflicto."
            en="Use pre-delay on reverbs to maintain source definition. Filter the lows out of your reverb so it doesn't bloat the low end. And check the tails: if one element's reverb is still ringing when the next element enters, there is a conflict."
          />
          <P lang={lang}
            es="Cada efecto debe tener un propósito. Si no puedes explicar por qué está ahí, probablemente no debería estar."
            en="Every effect should have a purpose. If you can't explain why it is there, it probably shouldn't be."
          />
        </Section>

        {/* Section 6 */}
        <Section number={6} lang={lang}
          titleEs="Usa tracks de referencia"
          titleEn="Use reference tracks"
        >
          <div className="learn-callout">
            <P lang={lang}
              es="Elegir 1 a 3 tracks de referencia del mismo género es una de las decisiones más inteligentes que puedes tomar. No para copiar, sino para tener un norte. Es tu GPS sonoro."
              en="Choosing 1 to 3 reference tracks from the same genre is one of the smartest decisions you can make. Not to copy, but to have a compass. It is your sonic GPS."
            />
          </div>
          <P lang={lang}
            es="Cárgalos en tu sesión, baja su volumen unos -6 dB para compensar el mastering que ya tienen, y compara regularmente. ¿Cómo suenan tus graves en relación a la referencia? ¿Tu voz tiene el mismo espacio? ¿Tu mezcla respira igual?"
            en="Load them into your session, turn them down about -6 dB to compensate for the mastering they already have, and compare regularly. How do your lows sound compared to the reference? Does your vocal have the same space? Does your mix breathe the same way?"
          />
          <P lang={lang}
            es="No se trata de sonar igual. Se trata de estar en el mismo vecindario sonoro. Si tu mezcla vive en un universo completamente distinto al de tus referencias, algo necesita atención."
            en="It is not about sounding identical. It is about being in the same sonic neighborhood. If your mix lives in a completely different universe from your references, something needs attention."
          />
        </Section>

        {/* Section 7 */}
        <Section number={7} lang={lang}
          titleEs="Revisa el balance estéreo"
          titleEn="Check the stereo balance"
        >
          <P lang={lang}
            es="El campo estéreo es tu escenario. Cada instrumento tiene un lugar. Los elementos fundamentales van al centro: voz principal, bajo, kick, snare. Los elementos que aportan textura y amplitud van a los lados: guitarras dobladas, pads, efectos."
            en="The stereo field is your stage. Every instrument has a place. The fundamental elements go in the center: lead vocal, bass, kick, snare. Elements that add texture and width go to the sides: doubled guitars, pads, effects."
          />
          <P lang={lang}
            es="Revisa tu mezcla en mono. Sí, mono. Si algo desaparece o cambia drásticamente al colapsar a mono, tienes problemas de fase que el mastering no va a resolver. Los va a empeorar."
            en="Check your mix in mono. Yes, mono. If something disappears or changes drastically when you collapse to mono, you have phase issues that mastering will not fix. It will make them worse."
          />
          <P lang={lang}
            es="Una distribución estéreo bien pensada hace que la mezcla suene amplia en auriculares, clara en monitores, y no colapse en el parlante del teléfono."
            en="A well-planned stereo distribution makes the mix sound wide on headphones, clear on monitors, and not collapse on a phone speaker."
          />
        </Section>

        {/* Section 8 */}
        <Section number={8} lang={lang}
          titleEs="Monitorea en distintos sistemas"
          titleEn="Monitor on different systems"
        >
          <P lang={lang}
            es="Tu mezcla no vive solo en tus monitores de estudio. Vive en audífonos de $20, en el parlante del teléfono, en el sistema del auto, en los earbuds del metro."
            en="Your mix doesn't live only on your studio monitors. It lives on $20 headphones, on a phone speaker, in a car system, on subway earbuds."
          />
          <P lang={lang}
            es="Monitorea a un nivel constante, idealmente entre 80 y 85 dB SPL. A ese volumen, tus oídos tienen la respuesta en frecuencia más equilibrada. Subir el volumen hace que todo suene bien, y eso es justamente el problema: esconde los errores."
            en="Monitor at a consistent level, ideally between 80 and 85 dB SPL. At that volume, your ears have the most balanced frequency response. Turning the volume up makes everything sound good, and that is the problem: it hides mistakes."
          />
          <P lang={lang}
            es="Si tu mezcla funciona en el parlante del teléfono y suena bien en los monitores, es una buena señal. Si solo funciona en tu sistema de estudio, probablemente estás compensando con tu cuarto en lugar de con tu mezcla."
            en="If your mix works on a phone speaker and sounds good on your monitors, that is a good sign. If it only works on your studio system, you are probably compensating with your room instead of your mix."
          />
        </Section>

        {/* Section 9 */}
        <Section number={9} lang={lang}
          titleEs="Exporta correctamente"
          titleEn="Export correctly"
        >
          <P lang={lang}
            es="Aquí no hay atajos. Hay criterio, oído y decisiones conscientes."
            en="There are no shortcuts here. Just judgment, ears, and conscious decisions."
          />
          <div className="learn-callout" style={{ margin: '1rem 0 1.5rem' }}>
            <h3 style={{
              fontSize: '1.0625rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: 'var(--mr-text-primary)',
            }}>
              {lang === 'es' ? 'Checklist de exportación:' : 'Export checklist:'}
            </h3>
            <ul style={{
              margin: 0,
              paddingLeft: '1.25rem',
              lineHeight: 1.8,
              color: 'var(--mr-text-primary)',
              fontSize: '1rem',
            }}>
              <li><strong>{lang === 'es' ? 'Formato' : 'Format'}:</strong> WAV {lang === 'es' ? 'o' : 'or'} AIFF. {lang === 'es' ? 'Nunca MP3 para mastering.' : 'Never MP3 for mastering.'}</li>
              <li><strong>{lang === 'es' ? 'Profundidad de bits' : 'Bit depth'}:</strong> 24-bit {lang === 'es' ? 'o' : 'or'} 32-bit float.</li>
              <li><strong>Sample rate:</strong> {lang === 'es' ? 'El mismo de tu sesión (44.1 kHz, 48 kHz, 96 kHz). No hagas resampleo.' : 'The same as your session (44.1 kHz, 48 kHz, 96 kHz). Do not resample.'}</li>
              <li><strong>Headroom:</strong> {lang === 'es' ? 'Picos entre -6 y -3 dBFS. Si estás clippeando, baja el fader del master bus.' : 'Peaks between -6 and -3 dBFS. If you are clipping, lower the master bus fader.'}</li>
              <li><strong>{lang === 'es' ? 'Bus de mezcla' : 'Master bus'}:</strong> {lang === 'es' ? 'Sin limiter ni maximizer. Si tienes procesamiento en el master bus (compresión suave, EQ), déjalo si es parte del sonido. Pero quita cualquier limiter.' : 'No limiter or maximizer. If you have processing on the master bus (gentle compression, EQ), leave it if it is part of the sound. But remove any limiter.'}</li>
              <li><strong>Dither:</strong> {lang === 'es' ? 'Solo aplica dither si estás reduciendo la profundidad de bits (por ejemplo, de 32 a 24). Si exportas a la misma profundidad de tu sesión, no apliques dither.' : 'Only apply dither if you are reducing bit depth (for example, from 32 to 24). If you are exporting at the same bit depth as your session, do not apply dither.'}</li>
            </ul>
          </div>
          <div className="learn-callout">
            <P lang={lang}
              es="Es como el barniz transparente de un auto. No lo ves, pero si lo haces mal, arruinas todo el trabajo de pintura que hay debajo."
              en="It is like the clear coat on a car. You don't see it, but if you do it wrong, you ruin all the paint work underneath."
            />
          </div>
        </Section>

        {/* Section 10 */}
        <Section number={10} lang={lang}
          titleEs="Revisión final"
          titleEn="Final review"
        >
          <P lang={lang}
            es="Antes de enviar, tómate un descanso. Mínimo una hora, idealmente una noche. Los oídos frescos detectan cosas que los oídos cansados pasan por alto."
            en="Before sending, take a break. At least an hour, ideally overnight. Fresh ears catch things that tired ears miss."
          />
          <P lang={lang}
            es="Escucha la mezcla completa sin tocar nada. De principio a fin. Anota lo que llama tu atención. Revisa en mono una vez más. Verifica que no hay artefactos: clicks al inicio o final del archivo, silencios incompletos, fades que se cortan."
            en="Listen to the full mix without touching anything. Start to finish. Write down what catches your attention. Check in mono one more time. Verify there are no artifacts: clicks at the beginning or end of the file, incomplete silences, fades that cut off."
          />
          <P lang={lang}
            es="Este paso parece simple. Lo es. Pero la cantidad de mezclas que llegan a mastering con un click en el primer sample o un fade cortado es sorprendente. No seas esa persona."
            en="This step seems simple. It is. But the number of mixes that arrive at mastering with a click on the first sample or a chopped fade is surprising. Don't be that person."
          />
        </Section>

        {/* Closing thought */}
        <div style={{
          borderTop: '1px solid var(--mr-border)',
          marginTop: '3rem',
          paddingTop: '2rem',
        }}>
          <p style={{
            fontSize: '1.0625rem',
            lineHeight: 1.7,
            color: 'var(--mr-text-secondary)',
            fontStyle: 'italic',
            textAlign: 'center',
            marginBottom: '2.5rem',
          }}>
            {lang === 'es'
              ? '"Preparar una mezcla para mastering es un acto de respeto. Por tu música, por tu audiencia, y por el proceso."'
              : '"Preparing a mix for mastering is an act of respect. For your music, for your audience, and for the process."'}
          </p>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: 'center',
          padding: '2rem 0',
        }}>
          <p style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--mr-text-primary)',
            marginBottom: '0.5rem',
          }}>
            {lang === 'es'
              ? '¿Quieres saber si tu mezcla está lista?'
              : 'Want to know if your mix is ready?'}
          </p>
          <p style={{
            fontSize: '0.9375rem',
            color: 'var(--mr-text-secondary)',
            marginBottom: '1.5rem',
          }}>
            {lang === 'es'
              ? 'Mastering Ready analiza tu archivo y te da un Score de 0 a 100 con recomendaciones específicas. 2 análisis completos gratis.'
              : 'Mastering Ready analyzes your file and gives you a score from 0 to 100 with specific recommendations. 2 free full analyses.'}
          </p>
          <Link
            href="/#analyze"
            className="learn-cta"
          >
            {lang === 'es'
              ? 'Verifica tu mezcla con Mastering Ready'
              : 'Verify your mix with Mastering Ready'}
          </Link>
          <p style={{
            fontSize: '0.8125rem',
            color: 'var(--mr-text-secondary)',
            marginTop: '0.75rem',
          }}>
            {lang === 'es'
              ? 'WAV, MP3, AIFF, FLAC, AAC, M4A u OGG. Máximo 200 MB.'
              : 'WAV, MP3, AIFF, FLAC, AAC, M4A or OGG. Max 200 MB.'}
          </p>
        </div>

        {/* Related Articles */}
        <div style={{ marginTop: '3rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--mr-text-primary)' }}>
            {lang === 'es' ? 'Artículos relacionados' : 'Related articles'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/learn/is-my-mix-ready" className="learn-link-card">
              {lang === 'es' ? '¿Mi mezcla está lista para mastering?' : 'Is my mix ready for mastering?'}
            </Link>
            <Link href="/learn/lufs-for-streaming" className="learn-link-card">
              {lang === 'es' ? 'LUFS para streaming: guía práctica' : 'LUFS for streaming: practical guide'}
            </Link>
            <Link href="/learn/mixing-vs-mastering" className="learn-link-card">
              {lang === 'es' ? 'Mezcla vs mastering: diferencias clave' : 'Mixing vs mastering: key differences'}
            </Link>
            <Link href="/learn/mastering-ready-vs-competitors" className="learn-link-card">
              {lang === 'es' ? 'Mastering Ready vs la competencia' : 'Mastering Ready vs competitors'}
            </Link>
          </div>
        </div>

    </article>
  )
}

/* ─── Reusable Components ─── */

function Section({ number, lang, titleEs, titleEn, children }: {
  number: number
  lang: 'es' | 'en'
  titleEs: string
  titleEn: string
  children: React.ReactNode
}) {
  return (
    <div className="learn-section">
      <div className="learn-card">
        <h2 style={{
          fontSize: 'clamp(1.25rem, 3.5vw, 1.5rem)',
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: '1rem',
          color: 'var(--mr-text-primary)',
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            background: 'var(--mr-gradient)',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 800,
            marginRight: '0.75rem',
            flexShrink: 0,
            verticalAlign: 'middle',
          }}>{number}</span>
          {lang === 'es' ? titleEs : titleEn}
        </h2>
        {children}
      </div>
    </div>
  )
}

function P({ lang, es, en }: { lang: 'es' | 'en'; es: string; en: string }) {
  return (
    <p style={{
      fontSize: '1.0625rem',
      lineHeight: 1.75,
      color: 'var(--mr-text-secondary)',
      marginBottom: '1rem',
    }}>
      {lang === 'es' ? es : en}
    </p>
  )
}

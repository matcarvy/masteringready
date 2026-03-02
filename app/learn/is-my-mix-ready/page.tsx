'use client'

import Link from 'next/link'
import { useLearn, useLearnMeta } from '../LearnContext'

export default function IsMyMixReadyPage() {
  const { lang } = useLearn()

  useLearnMeta({
    titleEs: '¿Tu mezcla está lista para mastering? 5 métricas clave',
    titleEn: 'Is Your Mix Ready for Mastering? 5 Key Metrics',
    descEs: 'Descubre si tu mezcla está lista para mastering con 5 métricas técnicas: headroom, True Peak, PLR, imagen estéreo y balance de frecuencias. Analiza gratis con Mastering Ready.',
    descEn: 'Find out if your mix is ready for mastering with 5 technical metrics: headroom, True Peak, PLR, stereo image, and frequency balance. Analyze free with Mastering Ready.',
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
            ? '¿Tu mezcla está lista para mastering?'
            : 'Is your mix ready for mastering?'}
        </h1>

        {/* ===== OPENING PARAGRAPH (answer-first) ===== */}
        <div style={{
          fontSize: '1.0625rem',
          lineHeight: 1.75,
          color: 'var(--mr-text-primary)',
          marginBottom: '2.5rem',
        }}>
          {lang === 'es' ? (
            <>
              <p style={{ marginBottom: '1rem' }}>
                La respuesta corta: si tu mezcla cumple cinco criterios técnicos, sí.
                Si no los cumple, el mastering no va a salvarla. El mastering amplifica
                lo que ya está bien y no puede arreglar lo que está mal.
                Piensa en el mastering como el barniz transparente sobre un auto
                recién pintado. Si la pintura tiene rayones, el barniz los hace más visibles.
              </p>
              <p style={{ marginBottom: '1rem' }}>
                Los cinco puntos que definen si tu mezcla está lista son: headroom
                (espacio entre tus picos y 0 dBFS), True Peak (que no haya clipping
                digital), rango dinámico (medido como PLR), correlación estéreo
                (compatibilidad mono) y balance de frecuencias. Si estas cinco áreas
                están en rango, tu mezcla tiene un Score de 85 o más en Mastering Ready
                y está lista para mastering.
              </p>
              <p>
                Si alguna falla, necesitas volver a tu DAW y corregirla antes de
                enviar. Aquí no hay atajos. Pero la buena noticia es que cada uno
                de estos problemas tiene solución concreta. Te explicamos cada
                punto a continuación.
              </p>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '1rem' }}>
                Short answer: if your mix passes five technical checkpoints, yes.
                If it does not, mastering will not save it. Mastering amplifies what
                is already good and cannot fix what is broken.
                Think of mastering like the clear coat on a freshly painted car.
                If the paint has scratches, the clear coat makes them more visible.
              </p>
              <p style={{ marginBottom: '1rem' }}>
                The five areas that define readiness are: headroom (space between
                your peaks and 0 dBFS), True Peak (no digital clipping), dynamic
                range (measured as PLR), stereo correlation (mono compatibility),
                and frequency balance. If all five are in range, your mix scores
                85 or higher on Mastering Ready and is ready for mastering.
              </p>
              <p>
                If any of them fails, you need to go back to your DAW and fix it
                before sending. There are no shortcuts here. But the good news is
                that every one of these problems has a concrete solution. We break
                down each point below.
              </p>
            </>
          )}
        </div>

        {/* ===== H2: THE 5 METRICS THAT MATTER ===== */}
        <h2 style={h2Style}>
          {lang === 'es'
            ? 'Las 5 métricas que importan'
            : 'The 5 metrics that matter'}
        </h2>

        {/* Headroom */}
        <h3 style={h3Style}>
          {lang === 'es' ? '1. Headroom (margen de picos)' : '1. Headroom (peak margin)'}
        </h3>
        <p style={pStyle}>
          {lang === 'es'
            ? 'Tu mezcla debe tener sus picos entre -6 y -3 dBFS. Esto le da al ingeniero de mastering espacio para trabajar sin que el audio se distorsione. Si tus picos están a -1 dBFS o peor, a 0 dBFS, el mastering no tiene dónde moverse. Es como pedirle a un chef que cocine en una olla que ya está llena hasta el borde.'
            : 'Your mix should have its peaks between -6 and -3 dBFS. This gives the mastering engineer room to work without distortion. If your peaks sit at -1 dBFS or worse, at 0 dBFS, mastering has nowhere to go. It is like asking a chef to cook in a pot that is already full to the brim.'}
        </p>

        {/* True Peak */}
        <h3 style={h3Style}>
          {lang === 'es' ? '2. True Peak (pico real)' : '2. True Peak'}
        </h3>
        <p style={pStyle}>
          {lang === 'es'
            ? 'Los picos reales deben estar por debajo de -1 dBTP. El True Peak mide los picos inter-muestra, los que ocurren entre las muestras digitales y que un medidor convencional no detecta. Si tu True Peak supera -1 dBTP, estás demasiado cerca del techo digital y el ingeniero de mastering no tiene margen para trabajar.'
            : 'True peaks must stay below -1 dBTP. True Peak measures inter-sample peaks, the ones that occur between digital samples and that a conventional meter misses. If your True Peak exceeds -1 dBTP, you are too close to the digital ceiling and the mastering engineer has no room to work.'}
        </p>

        {/* PLR */}
        <h3 style={h3Style}>
          {lang === 'es' ? '3. PLR (rango dinámico)' : '3. PLR (dynamic range)'}
        </h3>
        <p style={pStyle}>
          {lang === 'es'
            ? 'El PLR (Peak-to-Loudness Ratio) mide cuánto espacio hay entre tus picos y tu loudness integrado. Un PLR saludable está por encima de 8 dB, idealmente entre 10 y 14. Si tu PLR es bajo, significa que tu mezcla está sobre-comprimida. Le quitaste la vida al audio. El mastering necesita dinámica para trabajar. Sin dinámica, el resultado final suena plano y fatigante.'
            : 'PLR (Peak-to-Loudness Ratio) measures how much space exists between your peaks and your integrated loudness. A healthy PLR sits above 8 dB, ideally between 10 and 14. If your PLR is low, your mix is over-compressed. You squeezed the life out of the audio. Mastering needs dynamics to work with. Without dynamics, the final result sounds flat and fatiguing.'}
        </p>

        {/* Stereo Correlation */}
        <h3 style={h3Style}>
          {lang === 'es' ? '4. Correlación estéreo' : '4. Stereo correlation'}
        </h3>
        <p style={pStyle}>
          {lang === 'es'
            ? 'La correlación estéreo mide qué tan compatible es tu mezcla con la reproducción mono. Un valor de 1.0 es mono perfecto, 0.0 es estéreo completamente decorrelacionado y los valores negativos significan problemas de fase. Para mastering, necesitas estar por encima de 0.5, idealmente por encima de 0.7. Si tu correlación es baja, tu mezcla puede desaparecer en sistemas mono como teléfonos, PA de clubes o televisores. El mastering no puede arreglar problemas de fase.'
            : 'Stereo correlation measures how compatible your mix is with mono playback. A value of 1.0 is perfect mono, 0.0 is completely decorrelated stereo, and negative values mean phase problems. For mastering, you need to be above 0.5, ideally above 0.7. If your correlation is low, your mix can disappear on mono systems like phones, club PAs, or TVs. Mastering cannot fix phase issues.'}
        </p>

        {/* Frequency Balance */}
        <h3 style={h3Style}>
          {lang === 'es' ? '5. Balance de frecuencias' : '5. Frequency balance'}
        </h3>
        <p style={pStyle}>
          {lang === 'es'
            ? 'El balance de frecuencias revisa cómo se distribuye la energía entre graves, medios y agudos. No existe un balance "perfecto" universal porque depende del género, pero sí existen desbalances que causan problemas. Si tus graves acumulan demasiada energía, el mastering va a generar un master turbio. Si tus agudos están exagerados, el limitador del mastering los va a aplastar. El ingeniero puede hacer ajustes sutiles con EQ, pero no puede reconstruir un balance roto.'
            : 'Frequency balance checks how energy is distributed across lows, mids, and highs. There is no universally "perfect" balance because it depends on genre, but there are imbalances that cause problems. If your lows accumulate too much energy, mastering will produce a muddy master. If your highs are exaggerated, the mastering limiter will crush them. The engineer can make subtle EQ adjustments, but cannot reconstruct a broken balance.'}
        </p>

        {/* Note about LUFS */}
        <div style={{
          background: 'var(--mr-bg-elevated)',
          border: '1px solid var(--mr-border)',
          borderRadius: 'var(--mr-radius)',
          padding: '1rem 1.25rem',
          marginBottom: '2.5rem',
          fontSize: '0.9375rem',
          lineHeight: 1.65,
          color: 'var(--mr-text-secondary)',
        }}>
          <strong style={{ color: 'var(--mr-text-primary)' }}>
            {lang === 'es' ? '¿Y el LUFS?' : 'What about LUFS?'}
          </strong>{' '}
          {lang === 'es'
            ? 'El LUFS (Loudness Units Full Scale) es informativo pero no afecta tu Score. El rango ideal es entre -24 y -16 LUFS integrado, con -18 LUFS como centro. Mastering Ready lo muestra como referencia, pero no te penaliza por él porque el loudness final lo define el mastering, no la mezcla.'
            : 'LUFS (Loudness Units Full Scale) is informational but does not affect your Score. The ideal range is between -24 and -16 integrated LUFS, with -18 LUFS as center. Mastering Ready shows it as a reference but does not penalize you for it because final loudness is defined by mastering, not the mix.'}
        </div>

        {/* ===== H2: WHAT A "READY" MIX LOOKS LIKE ===== */}
        <h2 style={h2Style}>
          {lang === 'es'
            ? 'Cómo se ve una mezcla "lista"'
            : 'What a "ready" mix looks like'}
        </h2>

        <p style={pStyle}>
          {lang === 'es'
            ? 'Mastering Ready analiza tu archivo y te da un Score de 0 a 100. Ese número resume las cinco métricas en un solo indicador. Esto es lo que significa cada rango:'
            : 'Mastering Ready analyzes your file and gives you a Score from 0 to 100. That number summarizes the five metrics in a single indicator. Here is what each range means:'}
        </p>

        {/* Score ranges */}
        <div style={{ marginBottom: '2.5rem' }}>
          {[
            {
              range: '85 – 100',
              color: 'var(--mr-green)',
              bg: 'var(--mr-green-bg)',
              es: 'Lista para mastering. Tus métricas están en rango. Puedes enviar tu mezcla con confianza.',
              en: 'Ready for mastering. Your metrics are in range. You can send your mix with confidence.',
            },
            {
              range: '60 – 84',
              color: 'var(--mr-amber)',
              bg: 'var(--mr-amber-bg)',
              es: 'Casi lista. Hay una o dos áreas que conviene revisar antes de enviar. Los ajustes suelen ser rápidos.',
              en: 'Almost ready. There are one or two areas worth reviewing before sending. The fixes are usually quick.',
            },
            {
              range: '40 – 59',
              color: 'var(--mr-red)',
              bg: 'var(--mr-red-bg)',
              es: 'Necesita trabajo. Hay problemas técnicos que el mastering no puede resolver. Vuelve a tu DAW.',
              en: 'Needs work. There are technical problems that mastering cannot solve. Go back to your DAW.',
            },
            {
              range: '0 – 39',
              color: 'var(--mr-red)',
              bg: 'var(--mr-red-bg)',
              es: 'No lista. La mezcla tiene problemas serios que requieren atención antes de pensar en mastering.',
              en: 'Not ready. The mix has serious issues that need attention before thinking about mastering.',
            },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '0.75rem',
              padding: '0.875rem 1rem',
              borderRadius: 'var(--mr-radius-sm)',
              background: item.bg,
              border: `1px solid ${item.color}20`,
              alignItems: 'flex-start',
            }}>
              <span style={{
                fontWeight: 700,
                fontSize: '0.875rem',
                color: item.color,
                whiteSpace: 'nowrap',
                minWidth: '70px',
              }}>
                {item.range}
              </span>
              <span style={{
                fontSize: '0.9375rem',
                lineHeight: 1.6,
                color: 'var(--mr-text-primary)',
              }}>
                {lang === 'es' ? item.es : item.en}
              </span>
            </div>
          ))}
        </div>

        {/* ===== H2: COMMON PROBLEMS ===== */}
        <h2 style={h2Style}>
          {lang === 'es'
            ? 'Problemas comunes que impiden un buen mastering'
            : 'Common problems that block mastering readiness'}
        </h2>

        <div style={{ marginBottom: '2.5rem' }}>
          {[
            {
              es: 'Mezcla demasiado fuerte (sin headroom)',
              en: 'Mix too loud (no headroom)',
              descEs: 'El error más común. Los picos están a -1 dBFS o más arriba. La solución es bajar el fader del master bus 3 a 6 dB. No toques las proporciones de la mezcla, solo baja el volumen general.',
              descEn: 'The most common mistake. Peaks sit at -1 dBFS or higher. The fix is to pull down the master bus fader 3 to 6 dB. Do not touch the mix proportions, just lower the overall volume.',
            },
            {
              es: 'True Peak sobre -1 dBTP (sin margen)',
              en: 'True Peak above -1 dBTP (no margin)',
              descEs: 'Hay distorsión inter-muestra que se escucha especialmente en conversiones a MP3/AAC. Baja el volumen y revisa si tienes un limitador en el master bus. Si lo tienes, quítalo. El mastering pone el suyo.',
              descEn: 'There is inter-sample distortion that becomes audible especially in MP3/AAC conversions. Lower the volume and check if you have a limiter on the master bus. If you do, remove it. Mastering will apply its own.',
            },
            {
              es: 'Sobre-compresión (PLR bajo)',
              en: 'Over-compression (low PLR)',
              descEs: 'Le quitaste la dinámica a tu mezcla. Esto pasa cuando pones un compresor agresivo o un limitador en el bus master antes de enviar a mastering. Quita el procesamiento del master bus y deja que las dinámicas respiren.',
              descEn: 'You squeezed the dynamics out of your mix. This happens when you put an aggressive compressor or limiter on the master bus before sending to mastering. Remove the master bus processing and let the dynamics breathe.',
            },
            {
              es: 'Problemas de fase (correlación baja o negativa)',
              en: 'Phase issues (low or negative correlation)',
              descEs: 'Tu mezcla tiene elementos fuera de fase que cancelan señal cuando se suman a mono. Esto puede venir de plugins de ensanchamiento estéreo, muestras invertidas de fase o micrófonos mal posicionados. Revisa tus buses de reverb y tus capas de sintetizadores.',
              descEn: 'Your mix has elements out of phase that cancel signal when summed to mono. This can come from stereo widening plugins, phase-inverted samples, or poorly positioned microphones. Check your reverb buses and synth layers.',
            },
            {
              es: 'Frecuencias desbalanceadas',
              en: 'Unbalanced frequencies',
              descEs: 'Demasiada energía en graves, medios o agudos. Generalmente viene de mezclar en un cuarto sin tratamiento acústico o con audífonos que colorean la respuesta. Compara tu mezcla con una referencia comercial del mismo género.',
              descEn: 'Too much energy in lows, mids, or highs. Usually comes from mixing in a room without acoustic treatment or with headphones that color the response. Compare your mix against a commercial reference in the same genre.',
            },
          ].map((item, i) => (
            <div key={i} style={{
              marginBottom: '1.25rem',
              padding: '1rem 1.25rem',
              background: 'var(--mr-bg-card)',
              border: 'var(--mr-card-border)',
              borderRadius: 'var(--mr-radius)',
              boxShadow: 'var(--mr-shadow)',
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--mr-text-primary)',
                marginBottom: '0.5rem',
                marginTop: 0,
              }}>
                {lang === 'es' ? item.es : item.en}
              </h3>
              <p style={{
                fontSize: '0.9375rem',
                lineHeight: 1.65,
                color: 'var(--mr-text-secondary)',
                margin: 0,
              }}>
                {lang === 'es' ? item.descEs : item.descEn}
              </p>
            </div>
          ))}
        </div>

        {/* ===== H2: THE CLEAR COAT ANALOGY ===== */}
        <h2 style={h2Style}>
          {lang === 'es'
            ? 'La analogía del barniz transparente'
            : 'The clear coat analogy'}
        </h2>

        <div style={{
          borderLeft: '3px solid var(--mr-primary)',
          paddingLeft: '1.25rem',
          marginBottom: '1rem',
        }}>
          <p style={{
            ...pStyle,
            fontStyle: 'italic',
            color: 'var(--mr-text-secondary)',
          }}>
            {lang === 'es'
              ? '"El mastering no es una varita mágica."'
              : '"Mastering is not a magic wand."'}
          </p>
        </div>

        <p style={pStyle}>
          {lang === 'es'
            ? 'Imagina que acabas de pintar un auto. Le dedicaste horas al color, a las capas, a cada detalle. El mastering es el barniz transparente que va encima. Protege, da brillo y unifica el acabado. Pero si la pintura tiene rayones, burbujas o imperfecciones, el barniz no las cubre. Las hace más visibles.'
            : 'Imagine you just painted a car. You spent hours on the color, the coats, every detail. Mastering is the clear coat that goes on top. It protects, adds shine, and unifies the finish. But if the paint has scratches, bubbles, or imperfections, the clear coat does not cover them. It makes them more visible.'}
        </p>
        <p style={pStyle}>
          {lang === 'es'
            ? 'Lo mismo pasa con tu mezcla. Si los graves están inflados, el mastering los hace más inflados. Si hay clipping, el mastering lo amplifica. Si no hay dinámica, el mastering no la inventa. El trabajo del ingeniero de mastering es llevar una buena mezcla al siguiente nivel, no rescatar una mezcla con problemas.'
            : 'The same happens with your mix. If the lows are bloated, mastering makes them more bloated. If there is clipping, mastering amplifies it. If there is no dynamic range, mastering does not invent it. The mastering engineer\'s job is to take a good mix to the next level, not to rescue a problematic one.'}
        </p>
        <p style={{
          ...pStyle,
          marginBottom: '2.5rem',
        }}>
          {lang === 'es'
            ? 'Por eso es tan importante saber si tu mezcla está lista antes de enviarla. No reemplazamos al ingeniero de mastering. Te ayudamos a llegar preparado.'
            : 'That is why it is so important to know if your mix is ready before sending it. We do not replace your mastering engineer. We help you arrive prepared.'}
        </p>

        {/* ===== H2: QUICK SELF-CHECK ===== */}
        <h2 style={h2Style}>
          {lang === 'es'
            ? 'Checklist rápido antes de enviar a mastering'
            : 'Quick self-check before sending to mastering'}
        </h2>

        <div style={{
          background: 'var(--mr-bg-card)',
          border: 'var(--mr-card-border)',
          borderRadius: 'var(--mr-radius)',
          padding: '1.5rem',
          marginBottom: '2.5rem',
          boxShadow: 'var(--mr-shadow)',
        }}>
          <ol style={{
            margin: 0,
            paddingLeft: '1.25rem',
            fontSize: '0.9375rem',
            lineHeight: 1.85,
            color: 'var(--mr-text-primary)',
          }}>
            {(lang === 'es' ? [
              'Quita el limitador y el compresor del master bus. El mastering pone los suyos.',
              'Baja el fader del master bus hasta que tus picos estén entre -6 y -3 dBFS.',
              'Revisa que no haya clipping. Tu True Peak debe estar por debajo de -1 dBTP.',
              'Escucha tu mezcla en mono. Si algo desaparece o suena raro, tienes un problema de fase.',
              'Compara tu balance de frecuencias con una referencia comercial del mismo género.',
              'Exporta en WAV o AIFF a la misma resolución de tu sesión (no hagas upsample).',
              'No normalices el bounce. Exporta tal cual está.',
              'Si usaste dithering en tu mezcla, déjalo. Si no, no lo agregues. El mastering lo aplica al final.',
              'Nombra tu archivo con el nombre del track y el BPM. El ingeniero te lo agradece.',
              'Analiza tu mezcla en Mastering Ready. Si tu Score es 85 o más, estás listo.',
            ] : [
              'Remove the limiter and compressor from the master bus. Mastering applies its own.',
              'Pull down the master bus fader until your peaks sit between -6 and -3 dBFS.',
              'Check for clipping. Your True Peak must be below -1 dBTP.',
              'Listen to your mix in mono. If something disappears or sounds weird, you have a phase problem.',
              'Compare your frequency balance against a commercial reference in the same genre.',
              'Export as WAV or AIFF at the same resolution as your session (do not upsample).',
              'Do not normalize the bounce. Export it as is.',
              'If you used dithering in your mix, leave it. If not, do not add it. Mastering applies it at the end.',
              'Name your file with the track name and BPM. The engineer will thank you.',
              'Analyze your mix on Mastering Ready. If your Score is 85 or higher, you are ready.',
            ]).map((item, i) => (
              <li key={i} style={{ marginBottom: '0.375rem' }}>
                {item}
              </li>
            ))}
          </ol>
        </div>

        {/* ===== SPECS CALLOUT ===== */}
        <div style={{
          background: 'var(--mr-bg-elevated)',
          border: '1px solid var(--mr-border)',
          borderRadius: 'var(--mr-radius)',
          padding: '1rem 1.25rem',
          marginBottom: '2.5rem',
          fontSize: '0.875rem',
          lineHeight: 1.65,
          color: 'var(--mr-text-secondary)',
        }}>
          <strong style={{ color: 'var(--mr-text-primary)' }}>
            {lang === 'es' ? 'Especificaciones de Mastering Ready' : 'Mastering Ready specs'}
          </strong>
          <br />
          {lang === 'es'
            ? 'Formatos soportados: WAV, MP3, AIFF, AAC, M4A, OGG. Tamaño máximo: 200 MB. Incluye 2 análisis completos gratis con informe detallado y PDF.'
            : 'Supported formats: WAV, MP3, AIFF, AAC, M4A, OGG. Max file size: 200 MB. Includes 2 free full analyses with detailed report and PDF.'}
        </div>

        {/* ===== CTA SECTION ===== */}
        <div style={{
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          background: 'var(--mr-bg-card)',
          border: 'var(--mr-card-border)',
          borderRadius: 'var(--mr-radius-lg)',
          boxShadow: 'var(--mr-shadow-lg)',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            marginTop: 0,
            color: 'var(--mr-text-primary)',
          }}>
            {lang === 'es'
              ? 'Analiza tu mezcla gratis'
              : 'Analyze your mix free'}
          </h2>
          <p style={{
            fontSize: '0.9375rem',
            color: 'var(--mr-text-secondary)',
            marginBottom: '1.5rem',
            maxWidth: '500px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
          }}>
            {lang === 'es'
              ? 'Sube tu archivo y descubre en 60 segundos si tu mezcla está lista para mastering. Score de 0 a 100 con recomendaciones específicas.'
              : 'Upload your file and find out in 60 seconds if your mix is ready for mastering. 0 to 100 score with specific recommendations.'}
          </p>
          <Link
            href="/#analyze"
            style={{
              display: 'inline-block',
              background: 'var(--mr-gradient)',
              color: '#ffffff',
              padding: '0.875rem 2rem',
              borderRadius: 'var(--mr-radius)',
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            {lang === 'es'
              ? 'Analizar mi mezcla →'
              : 'Analyze my mix →'}
          </Link>
        </div>

        {/* Related Articles */}
        <div style={{ marginTop: '3rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--mr-text-primary)' }}>
            {lang === 'es' ? 'Artículos relacionados' : 'Related articles'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link href="/learn/prepare-mix-for-mastering" style={{ color: 'var(--mr-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
              {lang === 'es' ? '10 pasos para preparar tu mezcla para mastering' : '10 steps to prepare your mix for mastering'}
            </Link>
            <Link href="/learn/lufs-for-streaming" style={{ color: 'var(--mr-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
              {lang === 'es' ? 'LUFS para streaming: guía práctica' : 'LUFS for streaming: practical guide'}
            </Link>
            <Link href="/learn/mixing-vs-mastering" style={{ color: 'var(--mr-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
              {lang === 'es' ? 'Mezcla vs mastering: diferencias clave' : 'Mixing vs mastering: key differences'}
            </Link>
            <Link href="/learn/mastering-ready-vs-competitors" style={{ color: 'var(--mr-primary)', textDecoration: 'none', fontSize: '0.9375rem' }}>
              {lang === 'es' ? 'Mastering Ready vs la competencia' : 'Mastering Ready vs competitors'}
            </Link>
          </div>
        </div>

    </article>
  )
}

// Shared styles
const h2Style: React.CSSProperties = {
  fontSize: 'clamp(1.25rem, 3.5vw, 1.625rem)',
  fontWeight: 700,
  lineHeight: 1.3,
  marginBottom: '1rem',
  marginTop: '2.5rem',
  color: 'var(--mr-text-primary)',
}

const h3Style: React.CSSProperties = {
  fontSize: '1.0625rem',
  fontWeight: 700,
  lineHeight: 1.4,
  marginBottom: '0.5rem',
  marginTop: '1.5rem',
  color: 'var(--mr-text-primary)',
}

const pStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  lineHeight: 1.75,
  color: 'var(--mr-text-secondary)',
  marginBottom: '1rem',
}

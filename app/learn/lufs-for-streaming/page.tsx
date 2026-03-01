'use client'

import Link from 'next/link'
import { useLearn } from '../LearnContext'

type Lang = 'es' | 'en'

const t = {
  es: {
    langToggle: 'EN',
    h1: 'LUFS para streaming: guía de niveles por plataforma',
    intro1: 'Si estás preparando tu mezcla para mastering, probablemente te has topado con el término LUFS. Es la unidad que las plataformas de streaming usan para normalizar el volumen entre canciones.',
    intro2: 'Lo más importante que debes saber: el volumen final no es tu responsabilidad en la mezcla. Esa es la función del mastering. Tu trabajo es entregar una mezcla con buen headroom, dinámica saludable y balance tonal. El nivel de LUFS viene después.',
    intro3: 'No persigas el volumen desde la mezcla.',

    h2What: '¿Qué es LUFS?',
    whatP1: 'LUFS significa Loudness Units Full Scale. Es una medida de volumen percibido, no de nivel de pico. A diferencia de dBFS (que mide el nivel máximo de una señal digital), LUFS considera cómo el oído humano percibe la intensidad sonora a lo largo del tiempo.',
    whatP2: 'La medición integrada (Integrated LUFS) analiza el volumen promedio percibido de toda la pista. Es el número que las plataformas de streaming usan para normalizar.',
    whatP3: 'LUFS reemplazó a dBFS como estándar de referencia de volumen porque dos pistas pueden tener el mismo nivel de pico pero sonar a volúmenes completamente diferentes. LUFS captura esa diferencia perceptual.',

    h2Platforms: 'Niveles de volumen por plataforma',
    platformsIntro: 'Cada plataforma aplica su propia normalización. Si tu master supera el nivel objetivo, lo bajan. Algunas también suben pistas que están por debajo.',
    colPlatform: 'Plataforma',
    colTarget: 'Nivel objetivo',
    colNotes: 'Notas',
    noteSpotify: 'Normalización positiva activada (sube pistas silenciosas)',
    noteApple: 'Sound Check activado por defecto',
    noteYoutube: 'Solo baja, no sube pistas silenciosas',
    noteTidal: 'Normalización activa',
    noteAmazon: 'Normalización activa',
    noteDeezer: 'Normalización activa',
    noteSoundcloud: 'Sin normalización aplicada',
    noteCd: 'Depende del género',

    h2Mix: '¿A cuántos LUFS debería estar TU MEZCLA antes de mastering?',
    mixP1: 'El rango ideal para una mezcla pre-mastering es de -24 a -16 LUFS integrados, con -18 LUFS como punto central ideal.',
    mixP2: 'Este NO es el volumen final. El ingeniero de mastering se encarga de llevar la pista al nivel objetivo de cada plataforma. Si intentas llegar a -14 LUFS desde la mezcla, vas a comprimir la dinámica y reducir el headroom que el mastering necesita.',
    mixP3: 'En Mastering Ready, tratamos el LUFS como una métrica informativa. Tiene peso 0 en la puntuación porque no es un problema que debas resolver en la mezcla. Te lo mostramos para que sepas dónde estás, no para que lo corrijas.',
    mixIdeal: 'Rango ideal pre-mastering: -24 a -16 LUFS (centro: -18)',

    h2War: 'La guerra del volumen terminó',
    warP1: 'Durante años, la industria empujó los masters al máximo volumen posible. La lógica era simple: más fuerte suena "mejor" en una comparación rápida.',
    warP2: 'La normalización de streaming cambió eso. Si tu master está a -8 LUFS y el de otro artista a -14 LUFS, Spotify los baja al mismo nivel. Pero el master más comprimido pierde: menos dinámica, menos impacto, más fatiga auditiva.',
    warP3: 'Hoy, una mezcla con buena dinámica que traduce bien entre sistemas es más valiosa que un master aplastado que "suena fuerte" en tu DAW.',

    h2TruePeak: 'True Peak vs LUFS',
    truePeakP1: 'LUFS mide el volumen promedio percibido. True Peak mide el nivel máximo absoluto de la señal, incluyendo los picos inter-muestra que ocurren entre samples digitales.',
    truePeakP2: 'Son métricas complementarias. LUFS te dice qué tan fuerte suena tu pista en promedio. True Peak te dice si hay picos que podrían distorsionar al convertir a formatos comprimidos (MP3, AAC, OGG).',
    truePeakP3: 'Para tu mezcla pre-mastering, el True Peak debería estar por debajo de 0 dBTP. El ingeniero de mastering apunta a -1 dBTP o -2 dBTP en el master final, dependiendo de la plataforma.',
    truePeakMix: 'Mezcla: por debajo de 0 dBTP',
    truePeakMaster: 'Master: -1 dBTP a -2 dBTP',

    h2MR: 'Cómo mide LUFS Mastering Ready',
    mrP1: 'Mastering Ready mide el LUFS integrado de tu mezcla y lo muestra en el reporte. Si tu nivel está fuera del rango esperado para pre-mastering, te lo señala.',
    mrP2: 'Pero no te penaliza por ello. LUFS tiene peso 0 en la puntuación de 0 a 100 porque no es algo que debas "arreglar" en la mezcla. Es una métrica informativa que te ayuda a entender dónde está tu nivel antes de enviar a mastering.',
    mrP3: 'Lo que sí afecta tu puntuación son las métricas que puedes controlar desde la mezcla: headroom, True Peak, dinámica, imagen estéreo y balance de frecuencias.',

    cta: 'Mide los LUFS de tu mezcla',
    ctaSub: 'Gratis. 2 análisis completos con informe detallado y PDF.',
    backHome: '← Mastering Ready',
  },
  en: {
    langToggle: 'ES',
    h1: 'LUFS for streaming: platform level guide',
    intro1: 'If you\'re preparing your mix for mastering, you\'ve probably come across the term LUFS. It\'s the unit streaming platforms use to normalize volume between songs.',
    intro2: 'The most important thing to know: the final loudness is not your responsibility in the mix. That\'s what mastering is for. Your job is to deliver a mix with good headroom, healthy dynamics, and tonal balance. The LUFS level comes later.',
    intro3: 'Don\'t chase loudness from the mix.',

    h2What: 'What is LUFS?',
    whatP1: 'LUFS stands for Loudness Units Full Scale. It measures perceived loudness, not peak level. Unlike dBFS (which measures the maximum level of a digital signal), LUFS considers how the human ear perceives loudness intensity over time.',
    whatP2: 'The integrated measurement (Integrated LUFS) analyzes the average perceived loudness of the entire track. It\'s the number streaming platforms use for normalization.',
    whatP3: 'LUFS replaced dBFS as the loudness reference standard because two tracks can have the same peak level but sound at completely different volumes. LUFS captures that perceptual difference.',

    h2Platforms: 'Platform loudness targets',
    platformsIntro: 'Each platform applies its own normalization. If your master exceeds the target level, they turn it down. Some also boost tracks that are below the target.',
    colPlatform: 'Platform',
    colTarget: 'Target level',
    colNotes: 'Notes',
    noteSpotify: 'Positive gain normalization ON (boosts quiet tracks)',
    noteApple: 'Sound Check enabled by default',
    noteYoutube: 'Only turns down, does not boost quiet tracks',
    noteTidal: 'Normalization active',
    noteAmazon: 'Normalization active',
    noteDeezer: 'Normalization active',
    noteSoundcloud: 'No normalization applied',
    noteCd: 'Genre dependent',

    h2Mix: 'What LUFS should YOUR MIX be before mastering?',
    mixP1: 'The ideal range for a pre-mastering mix is -24 to -16 integrated LUFS, with -18 LUFS as the ideal center point.',
    mixP2: 'This is NOT the final loudness. The mastering engineer handles bringing the track to each platform\'s target level. If you try to hit -14 LUFS from the mix, you\'ll compress the dynamics and reduce the headroom that mastering needs.',
    mixP3: 'In Mastering Ready, we treat LUFS as an informational metric. It has weight 0 in the scoring because it\'s not a problem you should solve in the mix. We show it so you know where you stand, not so you fix it.',
    mixIdeal: 'Ideal pre-mastering range: -24 to -16 LUFS (center: -18)',

    h2War: 'The loudness war is over',
    warP1: 'For years, the industry pushed masters to maximum possible loudness. The logic was simple: louder sounds "better" in a quick comparison.',
    warP2: 'Streaming normalization changed that. If your master is at -8 LUFS and another artist\'s is at -14 LUFS, Spotify turns both down to the same level. But the more compressed master loses: less dynamics, less impact, more listening fatigue.',
    warP3: 'Today, a mix with good dynamics that translates well across systems is more valuable than a crushed master that "sounds loud" in your DAW.',

    h2TruePeak: 'True Peak vs LUFS',
    truePeakP1: 'LUFS measures average perceived loudness. True Peak measures the absolute maximum level of the signal, including the inter-sample peaks that occur between digital samples.',
    truePeakP2: 'They\'re complementary metrics. LUFS tells you how loud your track sounds on average. True Peak tells you if there are peaks that could distort when converting to compressed formats (MP3, AAC, OGG).',
    truePeakP3: 'For your pre-mastering mix, True Peak should be below 0 dBTP. The mastering engineer targets -1 dBTP or -2 dBTP on the final master, depending on the platform.',
    truePeakMix: 'Mix: below 0 dBTP',
    truePeakMaster: 'Master: -1 dBTP to -2 dBTP',

    h2MR: 'How Mastering Ready measures LUFS',
    mrP1: 'Mastering Ready measures the integrated LUFS of your mix and displays it in the report. If your level is outside the expected range for pre-mastering, it flags it.',
    mrP2: 'But it doesn\'t penalize you for it. LUFS has weight 0 in the 0-to-100 score because it\'s not something you should "fix" in the mix. It\'s an informational metric that helps you understand where your level is before sending to mastering.',
    mrP3: 'What does affect your score are the metrics you can control from the mix: headroom, True Peak, dynamics, stereo image, and frequency balance.',

    cta: 'Measure your mix\'s LUFS',
    ctaSub: 'Free. 2 full analyses with detailed report and PDF.',
    backHome: '← Mastering Ready',
  },
}

const platforms = [
  { name: 'Spotify', target: '-14 LUFS', noteKey: 'noteSpotify' as const },
  { name: 'Apple Music', target: '-16 LUFS', noteKey: 'noteApple' as const },
  { name: 'YouTube', target: '-14 LUFS', noteKey: 'noteYoutube' as const },
  { name: 'Tidal', target: '-14 LUFS', noteKey: 'noteTidal' as const },
  { name: 'Amazon Music', target: '-14 LUFS', noteKey: 'noteAmazon' as const },
  { name: 'Deezer', target: '-15 LUFS', noteKey: 'noteDeezer' as const },
  { name: 'SoundCloud', target: '-', noteKey: 'noteSoundcloud' as const },
  { name: 'CD / Physical', targetEs: '-9 a -12 LUFS', targetEn: '-9 to -12 LUFS', noteKey: 'noteCd' as const },
]

export default function LufsForStreamingPage() {
  const { lang } = useLearn()

  const s = t[lang]

  return (
    <article style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem',
      }}>
        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
          fontWeight: 700,
          lineHeight: 1.25,
          marginBottom: '1.5rem',
          color: 'var(--mr-text-primary)',
        }}>
          {s.h1}
        </h1>

        {/* Opening */}
        <p style={paragraphStyle}>{s.intro1}</p>
        <p style={paragraphStyle}>{s.intro2}</p>
        <p style={{
          ...calloutStyle,
          fontStyle: 'italic',
          fontWeight: 600,
          color: 'var(--mr-primary)',
        }}>
          {s.intro3}
        </p>

        {/* What is LUFS */}
        <h2 style={h2Style}>{s.h2What}</h2>
        <p style={paragraphStyle}>{s.whatP1}</p>
        <p style={paragraphStyle}>{s.whatP2}</p>
        <p style={paragraphStyle}>{s.whatP3}</p>

        {/* Platform targets */}
        <h2 style={h2Style}>{s.h2Platforms}</h2>
        <p style={paragraphStyle}>{s.platformsIntro}</p>

        <div style={{
          overflowX: 'auto',
          marginBottom: '2rem',
          borderRadius: 'var(--mr-radius)',
          border: '1px solid var(--mr-border)',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9375rem',
          }}>
            <thead>
              <tr style={{
                background: 'var(--mr-bg-elevated)',
              }}>
                <th style={thStyle}>{s.colPlatform}</th>
                <th style={thStyle}>{s.colTarget}</th>
                <th style={{ ...thStyle, minWidth: 200 }}>{s.colNotes}</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p, i) => (
                <tr key={p.name} style={{
                  background: i % 2 === 0 ? 'var(--mr-bg-card)' : 'var(--mr-bg-elevated)',
                }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                  <td style={{
                    ...tdStyle,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: 'var(--mr-primary)',
                  }}>
                    {'targetEs' in p ? (lang === 'es' ? p.targetEs : p.targetEn) : p.target}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--mr-text-secondary)' }}>
                    {s[p.noteKey]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mix LUFS */}
        <h2 style={h2Style}>{s.h2Mix}</h2>
        <p style={paragraphStyle}>{s.mixP1}</p>
        <div style={highlightBoxStyle}>
          <span style={{
            fontWeight: 700,
            fontFamily: 'monospace',
            fontSize: '1rem',
          }}>
            {s.mixIdeal}
          </span>
        </div>
        <p style={paragraphStyle}>{s.mixP2}</p>
        <p style={paragraphStyle}>{s.mixP3}</p>

        {/* Loudness war */}
        <h2 style={h2Style}>{s.h2War}</h2>
        <p style={paragraphStyle}>{s.warP1}</p>
        <p style={paragraphStyle}>{s.warP2}</p>
        <p style={paragraphStyle}>{s.warP3}</p>

        {/* True Peak vs LUFS */}
        <h2 style={h2Style}>{s.h2TruePeak}</h2>
        <p style={paragraphStyle}>{s.truePeakP1}</p>
        <p style={paragraphStyle}>{s.truePeakP2}</p>
        <p style={paragraphStyle}>{s.truePeakP3}</p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '2rem',
        }}>
          <div style={chipStyle}>
            {s.truePeakMix}
          </div>
          <div style={chipStyle}>
            {s.truePeakMaster}
          </div>
        </div>

        {/* How MR measures */}
        <h2 style={h2Style}>{s.h2MR}</h2>
        <p style={paragraphStyle}>{s.mrP1}</p>
        <p style={paragraphStyle}>{s.mrP2}</p>
        <p style={paragraphStyle}>{s.mrP3}</p>

        {/* CTA */}
        <div style={{
          textAlign: 'center',
          marginTop: '3rem',
          padding: '2.5rem 1.5rem',
          borderRadius: 'var(--mr-radius-lg)',
          background: 'var(--mr-bg-card)',
          border: '1px solid var(--mr-border)',
        }}>
          <Link href="/#analyze" style={{
            display: 'inline-block',
            background: 'var(--mr-gradient)',
            color: '#ffffff',
            padding: '0.875rem 2rem',
            borderRadius: 'var(--mr-radius)',
            fontSize: '1.0625rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            {s.cta}
          </Link>
          <p style={{
            marginTop: '0.75rem',
            fontSize: '0.8125rem',
            color: 'var(--mr-text-secondary)',
          }}>
            {s.ctaSub}
          </p>
        </div>
    </article>
  )
}

/* ===== Shared inline style objects ===== */

const paragraphStyle: React.CSSProperties = {
  fontSize: '1rem',
  lineHeight: 1.75,
  color: 'var(--mr-text-primary)',
  marginBottom: '1rem',
}

const h2Style: React.CSSProperties = {
  fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
  fontWeight: 700,
  lineHeight: 1.3,
  marginTop: '2.5rem',
  marginBottom: '1rem',
  color: 'var(--mr-text-primary)',
}

const calloutStyle: React.CSSProperties = {
  fontSize: '1.0625rem',
  lineHeight: 1.6,
  marginBottom: '1.5rem',
  paddingLeft: '1rem',
  borderLeft: '3px solid var(--mr-primary)',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontWeight: 600,
  fontSize: '0.8125rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--mr-text-secondary)',
  borderBottom: '1px solid var(--mr-border)',
}

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--mr-border)',
  verticalAlign: 'top',
}

const highlightBoxStyle: React.CSSProperties = {
  background: 'var(--mr-bg-elevated)',
  border: '1px solid var(--mr-border)',
  borderRadius: 'var(--mr-radius-sm)',
  padding: '1rem 1.25rem',
  marginBottom: '1.25rem',
  textAlign: 'center',
  color: 'var(--mr-primary)',
}

const chipStyle: React.CSSProperties = {
  background: 'var(--mr-bg-elevated)',
  border: '1px solid var(--mr-border)',
  borderRadius: 'var(--mr-radius-sm)',
  padding: '0.5rem 1rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  fontFamily: 'monospace',
  color: 'var(--mr-text-primary)',
}

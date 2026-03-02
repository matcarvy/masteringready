'use client'

import Link from 'next/link'
import { useLearn, useLearnMeta } from '../LearnContext'

type Lang = 'es' | 'en'

const t = {
  es: {
    title: 'Mastering Ready vs alternativas: cuál herramienta necesitas',
    metaNote: 'Guía de comparación actualizada a 2026',
    // Opening
    openingP1: 'Mastering Ready es una herramienta de análisis pre-mastering. No masteriza tu audio. No es un medidor. Te dice si tu mezcla está lista para mastering y qué debes corregir antes de enviarla.',
    openingP2: 'Analiza 5 métricas técnicas ponderadas (Headroom, True Peak, PLR, imagen estéreo y balance de frecuencias), te da un puntaje de 0 a 100 con recomendaciones específicas, y genera un informe PDF descargable. Todo desde el navegador, sin instalar nada.',
    openingP3: 'Esta página compara Mastering Ready con las alternativas más conocidas. Sin rodeos, con honestidad.',
    // Section: What category
    categoryTitle: '¿Qué categoría es Mastering Ready?',
    categoryP1: 'Mastering Ready es una herramienta de análisis pre-mastering. Eso significa que no cae en la categoría de:',
    categoryBullet1: 'Servicios de mastering (como LANDR o eMastered)',
    categoryBullet2: 'Plugins de medición en DAW (como LEVELS o iZotope Insight)',
    categoryBullet3: 'Herramientas de mezcla automatizada',
    categoryP2: 'Su función es una sola: decirte qué tan preparada está tu mezcla antes de enviarla a mastering, y qué puedes mejorar.',
    // Philosophy
    philosophyTitle: 'Nuestro enfoque: análisis, no automatización',
    philosophyP1: 'La mayoría de las herramientas de audio con IA quieren hacer el trabajo por ti. Masterizan tu canción, mezclan tus stems, ajustan tu EQ. Mix Check Studio te analiza para después venderte mastering con IA. LANDR y eMastered reemplazan directamente al ingeniero humano con un algoritmo.',
    philosophyP2: 'Mastering Ready hace lo opuesto. Te da datos claros y recomendaciones específicas, y después se hace a un lado. Tu mezcla es tuya. Tus decisiones creativas son tuyas. Nosotros solo te decimos qué corregir desde lo técnico para que llegues preparado.',
    philosophyP3: 'Y si necesitas ayuda con la mezcla o el mastering, el trabajo lo hace un ingeniero humano con más de 300 masters y crédito de Latin Grammy. No un algoritmo. No reemplazamos tu criterio. Te damos la información que necesitas para que tomes mejores decisiones con tu música.',
    // Comparison table
    tableTitle: 'Tabla de comparación',
    tableFeature: 'Característica',
    tableType: 'Tipo',
    tablePlatform: 'Plataforma',
    tablePrice: 'Precio',
    tableFreeTier: 'Nivel gratuito',
    tableScore: 'Puntaje 0-100',
    tablePDF: 'Informe PDF',
    tableRecommendations: 'Recomendaciones específicas',
    tableGenreAware: 'Ajuste por género',
    tablePrivacy: 'Sin almacenamiento de audio',
    tableRealtime: 'Tiempo real en DAW',
    // MR column
    mrType: 'Análisis pre-mastering',
    mrPlatform: 'Web (navegador)',
    mrPrice: 'Gratis / Pro $9.99/mes',
    mrFree: '2 análisis completos',
    mrYes: 'Sí',
    mrNo: 'No',
    // EXPOSE column
    exposeType: 'Plugin de medición',
    exposePlatform: 'Desktop (VST/AU)',
    exposePrice: '$49-61 (único pago)',
    exposeFree: 'No',
    exposeYes: 'Sí',
    exposeNo: 'No',
    // Mix Check column
    mcType: 'Análisis con IA',
    mcPlatform: 'Web',
    mcPrice: 'Gratis',
    mcFree: 'Sí, completo',
    mcYes: 'Sí',
    mcNo: 'No',
    mcLimited: 'Genéricas por género',
    // LANDR column
    landrType: 'Mastering con IA',
    landrPlatform: 'Web',
    landrPrice: 'Desde $12.99/mes',
    landrFree: 'Vista previa limitada',
    landrYes: 'Sí',
    landrNo: 'No',
    landrNA: 'N/A',
    // VS EXPOSE
    vsExposeTitle: 'Mastering Ready vs EXPOSE 2',
    vsExposeP1: 'EXPOSE 2 de Mastering The Mix es un plugin de escritorio (VST/AU) que verifica loudness, dinámica, ancho estéreo, true peak y correlación de fase. Es una herramienta sólida y confiable, muy usada en la industria.',
    vsExposeP2: 'Ambas herramientas verifican calidad técnica antes de mastering. Las diferencias principales son:',
    vsExposeBullet1: 'EXPOSE funciona en tiempo real dentro de tu DAW. Mastering Ready funciona en el navegador, sin instalar nada.',
    vsExposeBullet2: 'EXPOSE cuesta entre $49 y $61 (único pago). Mastering Ready tiene un nivel gratuito con 2 análisis completos.',
    vsExposeBullet3: 'Mastering Ready genera un puntaje unificado de 0 a 100 con recomendaciones escritas y un informe PDF. EXPOSE muestra métricas individuales sin un veredicto global.',
    vsExposeBullet4: 'EXPOSE es mejor si quieres feedback en tiempo real mientras mezclas. Mastering Ready es mejor como chequeo final antes de enviar a mastering.',
    vsExposeP3: 'No son mutuamente excluyentes. Puedes usar EXPOSE durante la mezcla y Mastering Ready como verificación final.',
    // VS Mix Check
    vsMixCheckTitle: 'Mastering Ready vs Mix Check Studio',
    vsMixCheckP1: 'Mix Check Studio de RoEx es una herramienta web gratuita que analiza tu mezcla con feedback basado en IA. Su análisis es gratuito porque funciona como entrada a sus servicios pagos de mastering con IA (Mastering+ y Studio Pro). Es fácil de usar y accesible.',
    vsMixCheckP2: 'Tanto Mix Check como Mastering Ready funcionan en el navegador. Las diferencias:',
    vsMixCheckBullet1: 'Mastering Ready analiza 5 métricas ponderadas con umbrales calibrados para mastering. Mix Check ofrece un análisis más general.',
    vsMixCheckBullet2: 'Mastering Ready genera recomendaciones específicas por métrica con valores exactos de tu archivo (por ejemplo: "tu headroom está en -1.2 dBFS, necesitas al menos -3 dBFS para mastering"). Mix Check ofrece sugerencias generales basadas en el género que seleccionas (por ejemplo: "usa un ecualizador paramétrico para ajustar niveles entre 2-5 kHz"), sin referencia a los valores reales de tu mezcla ni análisis temporal por secciones.',
    vsMixCheckBullet3: 'Mastering Ready incluye ajuste por género en el balance de frecuencias. Mix Check no diferencia por género.',
    vsMixCheckBullet4: 'Mastering Ready genera un informe PDF descargable. Mix Check no.',
    vsMixCheckP3: 'Mix Check es una buena opción para una segunda opinión rápida. Mastering Ready es más preciso si necesitas saber exactamente qué corregir, con qué valores, y en qué parte de tu canción.',
    // VS AI Mastering
    vsAITitle: 'Mastering Ready vs mastering con IA (LANDR, eMastered)',
    vsAIP1: 'LANDR y eMastered son servicios de mastering automatizado con IA. Subes tu mezcla y te devuelven un master. Son categorías completamente distintas a Mastering Ready.',
    vsAIP2: 'Mastering Ready no masteriza tu audio. Lo analiza.',
    vsAIP3: 'Usar mastering con IA sin revisar tu mezcla primero es como pintar sobre óxido. El master puede sonar "bien" superficialmente, pero si la mezcla tiene problemas de headroom, true peak o balance de frecuencias, el resultado final carga con esos problemas.',
    vsAIP4: 'Mastering Ready te dice qué corregir antes de enviar a mastering, ya sea con IA o con un ingeniero humano.',
    // VS Meters
    vsMetersTitle: 'Mastering Ready vs plugins de medición (LEVELS, iZotope Insight 2)',
    vsMetersP1: 'LEVELS (Mastering The Mix) e iZotope Insight 2 son plugins de medición para tu DAW. Muestran números: LUFS, true peak, fase, ancho estéreo.',
    vsMetersP2: 'El problema con los medidores es que muestran datos sin interpretarlos. Te dicen que tu LUFS es -14, pero no te dicen si eso es bueno o malo para tu género, ni qué hacer al respecto.',
    vsMetersP3: 'Mastering Ready interpreta las métricas, las pondera según su impacto en el mastering, y te da recomendaciones accionables. No es un medidor, es un diagnóstico.',
    // When to use what
    whenTitle: 'Cuándo usar cada herramienta',
    whenP1: 'No hay una sola herramienta que lo haga todo. El flujo recomendado es:',
    whenStep1: 'Usa un medidor (LEVELS, Insight) o EXPOSE durante la mezcla para monitorear en tiempo real.',
    whenStep2: 'Cuando creas que tu mezcla está lista, sube el bounce a Mastering Ready para un diagnóstico final.',
    whenStep3: 'Corrige lo que Mastering Ready te indique en tu DAW.',
    whenStep4: 'Envía a mastering (IA o ingeniero humano) con confianza.',
    whenP2: 'Si solo quieres una segunda opinión rápida y gratuita, Mix Check Studio es una opción sólida.',
    whenP3: 'Si quieres mastering con IA, LANDR o eMastered funcionan. Pero revisa tu mezcla primero.',
    // Limitations
    limitationsTitle: 'Limitaciones de Mastering Ready',
    limitationsP1: 'Mastering Ready no es perfecto. Algunas limitaciones que conviene conocer:',
    limitationsBullet1: 'No funciona en tiempo real dentro del DAW. Necesitas exportar y subir el archivo.',
    limitationsBullet2: 'No reemplaza los oídos de un ingeniero experimentado. Es un complemento, no un sustituto.',
    limitationsBullet3: 'No analiza aspectos subjetivos como balance de instrumentos, arreglo o emoción.',
    limitationsP2: 'Mastering Ready fue creado por un ingeniero con más de 300 masters y crédito de Latin Grammy. No reemplazamos al ingeniero de mastering. Te ayudamos a llegar preparado.',
    // CTA
    ctaTitle: 'Prueba Mastering Ready gratis',
    ctaP: 'Sube tu mezcla y descubre si está lista para mastering. 2 análisis completos gratis, con informe PDF.',
    ctaButton: 'Analiza tu mezcla gratis',
  },
  en: {
    title: 'Mastering Ready vs alternatives: which tool do you need',
    metaNote: 'Comparison guide updated for 2026',
    // Opening
    openingP1: 'Mastering Ready is a pre-mastering analysis tool. It does not master your audio. It is not a meter. It tells you if your mix is ready for mastering and what to fix before sending it.',
    openingP2: 'It analyzes 5 weighted technical metrics (Headroom, True Peak, PLR, stereo image, and frequency balance), gives you a 0 to 100 score with specific recommendations, and generates a downloadable PDF report. All from your browser, no installation required.',
    openingP3: 'This page compares Mastering Ready with the most well-known alternatives. Straightforward and honest.',
    // Section: What category
    categoryTitle: 'What category is Mastering Ready?',
    categoryP1: 'Mastering Ready is a pre-mastering analysis tool. That means it does not fall into the category of:',
    categoryBullet1: 'Mastering services (like LANDR or eMastered)',
    categoryBullet2: 'DAW metering plugins (like LEVELS or iZotope Insight)',
    categoryBullet3: 'Automated mixing tools',
    categoryP2: 'It does one thing: tell you how ready your mix is before sending it to mastering, and what you can improve.',
    // Philosophy
    philosophyTitle: 'Our approach: analysis, not automation',
    philosophyP1: 'Most AI audio tools want to do the work for you. They master your song, mix your stems, adjust your EQ. Mix Check Studio analyzes your mix to then sell you AI mastering. LANDR and eMastered replace the human engineer with an algorithm.',
    philosophyP2: 'Mastering Ready does the opposite. It gives you clear data and specific recommendations, then steps aside. Your mix is yours. Your creative decisions are yours. We only tell you what to fix technically so you arrive prepared.',
    philosophyP3: 'And if you need help with mixing or mastering, the work is done by a human engineer with over 300 masters and a Latin Grammy credit. Not an algorithm. We do not replace your judgment. We give you the information you need to make better decisions with your music.',
    // Comparison table
    tableTitle: 'Comparison table',
    tableFeature: 'Feature',
    tableType: 'Type',
    tablePlatform: 'Platform',
    tablePrice: 'Price',
    tableFreeTier: 'Free tier',
    tableScore: '0-100 Score',
    tablePDF: 'PDF Report',
    tableRecommendations: 'Specific recommendations',
    tableGenreAware: 'Genre-aware',
    tablePrivacy: 'No audio storage',
    tableRealtime: 'Real-time in DAW',
    // MR column
    mrType: 'Pre-mastering analysis',
    mrPlatform: 'Web (browser)',
    mrPrice: 'Free / Pro $9.99/mo',
    mrFree: '2 full analyses',
    mrYes: 'Yes',
    mrNo: 'No',
    // EXPOSE column
    exposeType: 'Metering plugin',
    exposePlatform: 'Desktop (VST/AU)',
    exposePrice: '$49-61 (one-time)',
    exposeFree: 'No',
    exposeYes: 'Yes',
    exposeNo: 'No',
    // Mix Check column
    mcType: 'AI-based analysis',
    mcPlatform: 'Web',
    mcPrice: 'Free',
    mcFree: 'Yes, full',
    mcYes: 'Yes',
    mcNo: 'No',
    mcLimited: 'Generic per genre',
    // LANDR column
    landrType: 'AI mastering',
    landrPlatform: 'Web',
    landrPrice: 'From $12.99/mo',
    landrFree: 'Limited preview',
    landrYes: 'Yes',
    landrNo: 'No',
    landrNA: 'N/A',
    // VS EXPOSE
    vsExposeTitle: 'Mastering Ready vs EXPOSE 2',
    vsExposeP1: 'EXPOSE 2 by Mastering The Mix is a desktop plugin (VST/AU) that checks loudness, dynamics, stereo width, true peak, and phase correlation. It is a solid, trusted tool widely used in the industry.',
    vsExposeP2: 'Both tools check technical quality before mastering. The main differences are:',
    vsExposeBullet1: 'EXPOSE runs in real-time inside your DAW. Mastering Ready runs in the browser, no installation needed.',
    vsExposeBullet2: 'EXPOSE costs $49 to $61 (one-time payment). Mastering Ready has a free tier with 2 full analyses.',
    vsExposeBullet3: 'Mastering Ready generates a unified 0-100 score with written recommendations and a PDF report. EXPOSE shows individual metrics without an overall verdict.',
    vsExposeBullet4: 'EXPOSE is better if you want real-time feedback while mixing. Mastering Ready is better as a final check before sending to mastering.',
    vsExposeP3: 'They are not mutually exclusive. You can use EXPOSE during mixing and Mastering Ready as a final verification.',
    // VS Mix Check
    vsMixCheckTitle: 'Mastering Ready vs Mix Check Studio',
    vsMixCheckP1: 'Mix Check Studio by RoEx is a free web-based tool that analyzes your mix with AI-based feedback. Their analysis is free because it serves as an entry point to their paid AI mastering services (Mastering+ and Studio Pro). It is easy to use and accessible.',
    vsMixCheckP2: 'Both Mix Check and Mastering Ready work in the browser. The differences:',
    vsMixCheckBullet1: 'Mastering Ready analyzes 5 weighted metrics with thresholds calibrated for mastering. Mix Check offers a more general analysis.',
    vsMixCheckBullet2: 'Mastering Ready generates specific recommendations per metric with exact values from your file (e.g., "your headroom is at -1.2 dBFS, you need at least -3 dBFS for mastering"). Mix Check offers general suggestions based on the genre you select (e.g., "use a parametric equalizer to adjust levels around 2-5 kHz"), without reference to your actual mix values or temporal analysis by section.',
    vsMixCheckBullet3: 'Mastering Ready includes genre-aware frequency balance. Mix Check does not differentiate by genre.',
    vsMixCheckBullet4: 'Mastering Ready generates a downloadable PDF report. Mix Check does not.',
    vsMixCheckP3: 'Mix Check is a good option for a quick second opinion. Mastering Ready is more precise if you need to know exactly what to fix, with what values, and in which part of your song.',
    // VS AI Mastering
    vsAITitle: 'Mastering Ready vs AI mastering (LANDR, eMastered)',
    vsAIP1: 'LANDR and eMastered are automated AI mastering services. You upload your mix and they return a master. They are completely different categories from Mastering Ready.',
    vsAIP2: 'Mastering Ready does not master your audio. It analyzes it.',
    vsAIP3: 'Using AI mastering without checking your mix first is like painting over rust. The master might sound "fine" on the surface, but if the mix has headroom, true peak, or frequency balance issues, the final result carries those problems.',
    vsAIP4: 'Mastering Ready tells you what to fix before sending to mastering, whether it is AI or a human engineer.',
    // VS Meters
    vsMetersTitle: 'Mastering Ready vs metering plugins (LEVELS, iZotope Insight 2)',
    vsMetersP1: 'LEVELS (Mastering The Mix) and iZotope Insight 2 are metering plugins for your DAW. They show numbers: LUFS, true peak, phase, stereo width.',
    vsMetersP2: 'The problem with meters is that they show data without interpreting it. They tell you your LUFS is -14, but they do not tell you if that is good or bad for your genre, or what to do about it.',
    vsMetersP3: 'Mastering Ready interprets the metrics, weights them by their impact on mastering, and gives you actionable recommendations. It is not a meter, it is a diagnosis.',
    // When to use what
    whenTitle: 'When to use each tool',
    whenP1: 'No single tool does everything. The recommended workflow is:',
    whenStep1: 'Use a meter (LEVELS, Insight) or EXPOSE during mixing for real-time monitoring.',
    whenStep2: 'When you think your mix is ready, upload the bounce to Mastering Ready for a final diagnosis.',
    whenStep3: 'Fix what Mastering Ready flags in your DAW.',
    whenStep4: 'Send to mastering (AI or human engineer) with confidence.',
    whenP2: 'If you just want a quick, free second opinion, Mix Check Studio is a solid option.',
    whenP3: 'If you want AI mastering, LANDR or eMastered work. But check your mix first.',
    // Limitations
    limitationsTitle: 'Mastering Ready limitations',
    limitationsP1: 'Mastering Ready is not perfect. Some limitations worth knowing:',
    limitationsBullet1: 'It does not work in real-time inside the DAW. You need to export and upload the file.',
    limitationsBullet2: 'It does not replace the ears of an experienced engineer. It is a complement, not a substitute.',
    limitationsBullet3: 'It does not analyze subjective aspects like instrument balance, arrangement, or emotion.',
    limitationsP2: 'Mastering Ready was built by an engineer with over 300 masters and a Latin Grammy credit. We do not replace your mastering engineer. We help you arrive prepared.',
    // CTA
    ctaTitle: 'Try Mastering Ready free',
    ctaP: 'Upload your mix and find out if it is ready for mastering. 2 full analyses free, with PDF report.',
    ctaButton: 'Analyze your mix free',
  },
}

export default function MasteringReadyVsCompetitorsPage() {
  const { lang } = useLearn()

  useLearnMeta({
    titleEs: 'Mastering Ready vs EXPOSE 2 vs Mix Check Studio vs LANDR: comparación',
    titleEn: 'Mastering Ready vs EXPOSE 2 vs Mix Check Studio vs LANDR: Comparison',
    descEs: 'Comparación detallada entre Mastering Ready, EXPOSE 2, Mix Check Studio, LANDR y eMastered. Funciones, precios y cuál herramienta necesitas según tu objetivo.',
    descEn: 'Detailed comparison of Mastering Ready, EXPOSE 2, Mix Check Studio, LANDR, and eMastered. Features, pricing, and which tool you need based on your goal.',
  })

  const s = t[lang]

  const cellStyle: React.CSSProperties = {
    padding: '0.625rem 0.75rem',
    borderBottom: '1px solid var(--mr-border)',
    fontSize: '0.875rem',
    lineHeight: 1.5,
    verticalAlign: 'top',
  }

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 600,
    color: 'var(--mr-text-primary)',
    background: 'var(--mr-bg-elevated)',
    position: 'sticky' as const,
    top: 0,
    whiteSpace: 'nowrap',
  }

  const featureCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 500,
    color: 'var(--mr-text-primary)',
    background: 'var(--mr-bg-elevated)',
    whiteSpace: 'nowrap',
  }

  const yesStyle: React.CSSProperties = { color: 'var(--mr-green)', fontWeight: 500 }
  const noStyle: React.CSSProperties = { color: 'var(--mr-text-tertiary)' }
  const naStyle: React.CSSProperties = { color: 'var(--mr-text-tertiary)', fontStyle: 'italic' }

  return (
      <article style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '0 1.5rem 4rem',
      }}>
        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: '0.5rem',
          color: 'var(--mr-text-primary)',
        }}>
          {s.title}
        </h1>

        <p style={{
          fontSize: '0.8125rem',
          color: 'var(--mr-text-tertiary)',
          marginBottom: '2rem',
        }}>
          {s.metaNote}
        </p>

        {/* Opening */}
        <p style={{ lineHeight: 1.7, marginBottom: '1rem', color: 'var(--mr-text-secondary)' }}>
          {s.openingP1}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '1rem', color: 'var(--mr-text-secondary)' }}>
          {s.openingP2}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '2.5rem', color: 'var(--mr-text-secondary)' }}>
          {s.openingP3}
        </p>

        {/* What category */}
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--mr-text-primary)' }}>
          {s.categoryTitle}
        </h2>
        <p style={{ lineHeight: 1.7, marginBottom: '0.75rem', color: 'var(--mr-text-secondary)' }}>
          {s.categoryP1}
        </p>
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem', lineHeight: 1.8 }}>
          <li style={{ color: 'var(--mr-text-secondary)' }}>{s.categoryBullet1}</li>
          <li style={{ color: 'var(--mr-text-secondary)' }}>{s.categoryBullet2}</li>
          <li style={{ color: 'var(--mr-text-secondary)' }}>{s.categoryBullet3}</li>
        </ul>
        <p style={{ lineHeight: 1.7, marginBottom: '2.5rem', color: 'var(--mr-text-secondary)' }}>
          {s.categoryP2}
        </p>

        {/* Philosophy — Our Approach */}
        <div className="learn-callout" style={{ borderLeftColor: 'var(--mr-primary)', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: 0, color: 'var(--mr-text-primary)' }}>
            {s.philosophyTitle}
          </h2>
          <p style={{ lineHeight: 1.7, marginBottom: '0.75rem', color: 'var(--mr-text-secondary)' }}>
            {s.philosophyP1}
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: '0.75rem', color: 'var(--mr-text-secondary)' }}>
            {s.philosophyP2}
          </p>
          <p style={{ lineHeight: 1.7, margin: 0, fontStyle: 'italic', color: 'var(--mr-text-secondary)' }}>
            {s.philosophyP3}
          </p>
        </div>

        {/* Comparison Table */}
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--mr-text-primary)' }}>
          {s.tableTitle}
        </h2>
        <div style={{
          overflowX: 'auto',
          borderRadius: 'var(--mr-radius)',
          border: '1px solid var(--mr-border)',
          marginBottom: '2.5rem',
        }}>
          <table style={{
            width: '100%',
            minWidth: 640,
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
          }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>{s.tableFeature}</th>
                <th style={{ ...headerCellStyle, color: 'var(--mr-primary)' }}>Mastering Ready</th>
                <th style={headerCellStyle}>EXPOSE 2</th>
                <th style={headerCellStyle}>Mix Check Studio</th>
                <th style={headerCellStyle}>LANDR / eMastered</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={featureCellStyle}>{s.tableType}</td>
                <td style={cellStyle}>{s.mrType}</td>
                <td style={cellStyle}>{s.exposeType}</td>
                <td style={cellStyle}>{s.mcType}</td>
                <td style={cellStyle}>{s.landrType}</td>
              </tr>
              <tr>
                <td style={featureCellStyle}>{s.tablePlatform}</td>
                <td style={cellStyle}>{s.mrPlatform}</td>
                <td style={cellStyle}>{s.exposePlatform}</td>
                <td style={cellStyle}>{s.mcPlatform}</td>
                <td style={cellStyle}>{s.landrPlatform}</td>
              </tr>
              <tr>
                <td style={featureCellStyle}>{s.tablePrice}</td>
                <td style={cellStyle}>{s.mrPrice}</td>
                <td style={cellStyle}>{s.exposePrice}</td>
                <td style={cellStyle}>{s.mcPrice}</td>
                <td style={cellStyle}>{s.landrPrice}</td>
              </tr>
              <tr>
                <td style={featureCellStyle}>{s.tableFreeTier}</td>
                <td style={{ ...cellStyle, ...yesStyle }}>{s.mrFree}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.exposeFree}</td>
                <td style={{ ...cellStyle, ...yesStyle }}>{s.mcFree}</td>
                <td style={cellStyle}>{s.landrFree}</td>
              </tr>
              <tr>
                <td style={featureCellStyle}>{s.tableScore}</td>
                <td style={{ ...cellStyle, ...yesStyle }}>{s.mrYes}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.exposeNo}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.mcNo}</td>
                <td style={{ ...cellStyle, ...naStyle }}>{s.landrNA}</td>
              </tr>
              <tr>
                <td style={featureCellStyle}>{s.tablePDF}</td>
                <td style={{ ...cellStyle, ...yesStyle }}>{s.mrYes}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.exposeNo}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.mcNo}</td>
                <td style={{ ...cellStyle, ...naStyle }}>{s.landrNA}</td>
              </tr>
              <tr>
                <td style={featureCellStyle}>{s.tableRecommendations}</td>
                <td style={{ ...cellStyle, ...yesStyle }}>{s.mrYes}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.exposeNo}</td>
                <td style={cellStyle}>{s.mcLimited}</td>
                <td style={{ ...cellStyle, ...naStyle }}>{s.landrNA}</td>
              </tr>
              <tr>
                <td style={featureCellStyle}>{s.tableGenreAware}</td>
                <td style={{ ...cellStyle, ...yesStyle }}>{s.mrYes}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.exposeNo}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.mcNo}</td>
                <td style={{ ...cellStyle, ...naStyle }}>{s.landrNA}</td>
              </tr>
              <tr>
                <td style={featureCellStyle}>{s.tablePrivacy}</td>
                <td style={{ ...cellStyle, ...yesStyle }}>{s.mrYes}</td>
                <td style={{ ...cellStyle, ...yesStyle }}>{s.exposeYes}</td>
                <td style={{ ...cellStyle, ...naStyle }}>{'N/A'}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.landrNo}</td>
              </tr>
              <tr>
                <td style={featureCellStyle}>{s.tableRealtime}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.mrNo}</td>
                <td style={{ ...cellStyle, ...yesStyle }}>{s.exposeYes}</td>
                <td style={{ ...cellStyle, ...noStyle }}>{s.mcNo}</td>
                <td style={{ ...cellStyle, ...naStyle }}>{s.landrNA}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* VS EXPOSE 2 */}
        <div className="learn-section">
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--mr-text-primary)' }}>
          {s.vsExposeTitle}
        </h2>
        <p style={{ lineHeight: 1.7, marginBottom: '1rem', color: 'var(--mr-text-secondary)' }}>
          {s.vsExposeP1}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '0.75rem', color: 'var(--mr-text-secondary)' }}>
          {s.vsExposeP2}
        </p>
        <div className="learn-card">
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '0', lineHeight: 1.8 }}>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.vsExposeBullet1}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.vsExposeBullet2}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.vsExposeBullet3}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.vsExposeBullet4}</li>
        </ul>
        </div>
        <p style={{ lineHeight: 1.7, marginTop: '1rem', marginBottom: '0', color: 'var(--mr-text-secondary)' }}>
          {s.vsExposeP3}
        </p>
        </div>

        {/* VS Mix Check Studio */}
        <div className="learn-section">
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--mr-text-primary)' }}>
          {s.vsMixCheckTitle}
        </h2>
        <p style={{ lineHeight: 1.7, marginBottom: '1rem', color: 'var(--mr-text-secondary)' }}>
          {s.vsMixCheckP1}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '0.75rem', color: 'var(--mr-text-secondary)' }}>
          {s.vsMixCheckP2}
        </p>
        <div className="learn-card">
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '0', lineHeight: 1.8 }}>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.vsMixCheckBullet1}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.vsMixCheckBullet2}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.vsMixCheckBullet3}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.vsMixCheckBullet4}</li>
        </ul>
        </div>
        <p style={{ lineHeight: 1.7, marginTop: '1rem', marginBottom: '0', color: 'var(--mr-text-secondary)' }}>
          {s.vsMixCheckP3}
        </p>
        </div>

        {/* VS AI Mastering */}
        <div className="learn-section">
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--mr-text-primary)' }}>
          {s.vsAITitle}
        </h2>
        <p style={{ lineHeight: 1.7, marginBottom: '1rem', color: 'var(--mr-text-secondary)' }}>
          {s.vsAIP1}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '1rem', color: 'var(--mr-text-secondary)', fontWeight: 600 }}>
          {s.vsAIP2}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '1rem', color: 'var(--mr-text-secondary)' }}>
          {s.vsAIP3}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '0', color: 'var(--mr-text-secondary)' }}>
          {s.vsAIP4}
        </p>
        </div>

        {/* VS Metering plugins */}
        <div className="learn-section">
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--mr-text-primary)' }}>
          {s.vsMetersTitle}
        </h2>
        <p style={{ lineHeight: 1.7, marginBottom: '1rem', color: 'var(--mr-text-secondary)' }}>
          {s.vsMetersP1}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '1rem', color: 'var(--mr-text-secondary)' }}>
          {s.vsMetersP2}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '0', color: 'var(--mr-text-secondary)' }}>
          {s.vsMetersP3}
        </p>
        </div>

        {/* When to use what */}
        <div className="learn-section">
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--mr-text-primary)' }}>
          {s.whenTitle}
        </h2>
        <p style={{ lineHeight: 1.7, marginBottom: '0.75rem', color: 'var(--mr-text-secondary)' }}>
          {s.whenP1}
        </p>
        <div className="learn-card">
        <ol style={{ paddingLeft: '1.25rem', marginBottom: '0', lineHeight: 1.8 }}>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.whenStep1}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.whenStep2}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.whenStep3}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.whenStep4}</li>
        </ol>
        </div>
        <p style={{ lineHeight: 1.7, marginTop: '1rem', marginBottom: '1rem', color: 'var(--mr-text-secondary)' }}>
          {s.whenP2}
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: '0', color: 'var(--mr-text-secondary)' }}>
          {s.whenP3}
        </p>
        </div>

        {/* Limitations */}
        <div className="learn-section">
        <h2 style={{ fontSize: '1.375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--mr-text-primary)' }}>
          {s.limitationsTitle}
        </h2>
        <p style={{ lineHeight: 1.7, marginBottom: '0.75rem', color: 'var(--mr-text-secondary)' }}>
          {s.limitationsP1}
        </p>
        <div className="learn-card">
        <ul style={{ paddingLeft: '1.25rem', marginBottom: '0', lineHeight: 1.8 }}>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.limitationsBullet1}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.limitationsBullet2}</li>
          <li style={{ color: 'var(--mr-text-secondary)', marginBottom: '0.25rem' }}>{s.limitationsBullet3}</li>
        </ul>
        </div>
        <div className="learn-callout" style={{ marginTop: '1rem' }}>
        <p style={{
          lineHeight: 1.7,
          margin: 0,
          color: 'var(--mr-text-secondary)',
          fontStyle: 'italic',
        }}>
          {s.limitationsP2}
        </p>
        </div>
        </div>

        {/* CTA */}
        <div style={{
          background: 'var(--mr-bg-card)',
          border: '1px solid var(--mr-border)',
          borderRadius: 'var(--mr-radius-lg)',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            color: 'var(--mr-text-primary)',
          }}>
            {s.ctaTitle}
          </h2>
          <p style={{
            lineHeight: 1.7,
            marginBottom: '1.5rem',
            color: 'var(--mr-text-secondary)',
            maxWidth: 500,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            {s.ctaP}
          </p>
          <Link
            href="/#analyze"
            className="learn-cta"
          >
            {s.ctaButton}
          </Link>
        </div>

        {/* Related Articles */}
        <div style={{ marginTop: '3rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--mr-text-primary)' }}>
            {lang === 'es' ? 'Artículos relacionados' : 'Related articles'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/learn/is-my-mix-ready" className="learn-link-card" style={{ color: 'var(--mr-primary)', fontSize: '0.9375rem' }}>
              {lang === 'es' ? '¿Mi mezcla está lista para mastering?' : 'Is my mix ready for mastering?'}
            </Link>
            <Link href="/learn/prepare-mix-for-mastering" className="learn-link-card" style={{ color: 'var(--mr-primary)', fontSize: '0.9375rem' }}>
              {lang === 'es' ? '10 pasos para preparar tu mezcla para mastering' : '10 steps to prepare your mix for mastering'}
            </Link>
            <Link href="/learn/lufs-for-streaming" className="learn-link-card" style={{ color: 'var(--mr-primary)', fontSize: '0.9375rem' }}>
              {lang === 'es' ? 'LUFS para streaming: guía práctica' : 'LUFS for streaming: practical guide'}
            </Link>
            <Link href="/learn/mixing-vs-mastering" className="learn-link-card" style={{ color: 'var(--mr-primary)', fontSize: '0.9375rem' }}>
              {lang === 'es' ? 'Mezcla vs mastering: diferencias clave' : 'Mixing vs mastering: key differences'}
            </Link>
          </div>
        </div>

      </article>
  )
}

import type { Metadata } from 'next'

// =============================================================================
// SEO METADATA - MasteringReady
// =============================================================================

const siteConfig = {
  name: 'Mastering Ready',
  url: 'https://masteringready.com',
  author: 'Matías Carvajal',
  twitter: '@matcarvy',
  locale: {
    default: 'es_CO',
    alternate: 'en_US'
  }
}

export const metadata: Metadata = {
  // ─────────────────────────────────────────────────────────────────────────────
  // BASIC META
  // ─────────────────────────────────────────────────────────────────────────────
  title: {
    default: '¿Tu mezcla está lista para mastering? | Mastering Ready',
    template: '%s | Mastering Ready'
  },
  description: 'Analiza tu mezcla en 60 segundos. Detecta problemas de headroom, LUFS, true peak y balance antes de enviarla a mastering. Metodología probada en +300 producciones profesionales.',
  keywords: [
    'análisis de mezcla',
    'preparar mezcla para mastering',
    'headroom',
    'LUFS',
    'true peak',
    'balance estéreo',
    'mix analyzer',
    'audio analysis',
    'mastering preparation',
    'mezcla profesional',
    'ingeniería de audio',
    'pre-mastering checklist'
  ],
  authors: [{ name: siteConfig.author, url: 'https://matcarvy.com' }],
  creator: siteConfig.author,
  publisher: siteConfig.name,
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CANONICAL & ALTERNATES
  // ─────────────────────────────────────────────────────────────────────────────
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: '/',
    languages: {
      'es': '/',
      'en': '/?lang=en'
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // OPEN GRAPH (Facebook, LinkedIn, WhatsApp)
  // ─────────────────────────────────────────────────────────────────────────────
  openGraph: {
    type: 'website',
    locale: siteConfig.locale.default,
    alternateLocale: siteConfig.locale.alternate,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: '¿Tu mezcla está lista para mastering?',
    description: 'Análisis técnico en 60 segundos. Headroom, LUFS, True Peak, balance estéreo y más. Metodología probada en +300 producciones.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mastering Ready - Analiza tu mezcla antes del mastering',
        type: 'image/png'
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TWITTER CARD
  // ─────────────────────────────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: '¿Tu mezcla está lista para mastering?',
    description: 'Análisis técnico en 60 segundos. Headroom, LUFS, True Peak y más. Metodología probada en +300 producciones.',
    site: siteConfig.twitter,
    creator: siteConfig.twitter,
    images: ['/og-image.png']
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ROBOTS & INDEXING
  // ─────────────────────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // VERIFICATION (agregar tus IDs cuando los tengas)
  // ─────────────────────────────────────────────────────────────────────────────
  verification: {
    // google: 'tu-google-site-verification-id',
    // yandex: 'tu-yandex-verification-id',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // APP & ICONS
  // ─────────────────────────────────────────────────────────────────────────────
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name
  },
  formatDetection: {
    telephone: false
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY
  // ─────────────────────────────────────────────────────────────────────────────
  category: 'technology'
}

// =============================================================================
// STRUCTURED DATA (JSON-LD)
// =============================================================================

const structuredData = {
  // Software Application Schema
  softwareApplication: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Mastering Ready',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2026-02-01' // Ajustar cuando termine beta
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '50',
      bestRating: '5',
      worstRating: '1'
    },
    author: {
      '@type': 'Person',
      name: 'Matías Carvajal',
      url: 'https://matcarvy.com'
    },
    description: 'Analiza tu mezcla de audio en 60 segundos. Detecta problemas de headroom, LUFS, true peak y balance estéreo antes de enviarla a mastering.',
    url: 'https://masteringready.com',
    screenshot: 'https://masteringready.com/og-image.png',
    featureList: [
      'Análisis de Headroom',
      'Medición LUFS',
      'True Peak Detection',
      'Balance Estéreo',
      'Análisis de Frecuencias',
      'Reporte PDF descargable'
    ]
  },

  // HowTo Schema - Para aparecer en rich snippets
  howTo: {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Cómo analizar tu mezcla antes del mastering',
    description: 'Guía paso a paso para verificar que tu mezcla está lista para mastering profesional usando Mastering Ready.',
    totalTime: 'PT2M',
    tool: [
      {
        '@type': 'HowToTool',
        name: 'Archivo de audio (WAV, MP3 o AIFF)'
      }
    ],
    step: [
      {
        '@type': 'HowToStep',
        name: 'Sube tu mezcla',
        text: 'Arrastra y suelta tu archivo de audio (WAV, MP3 o AIFF, máximo 50MB) en el analizador.',
        position: 1
      },
      {
        '@type': 'HowToStep',
        name: 'Espera el análisis',
        text: 'El sistema analiza headroom, LUFS, true peak, balance estéreo y frecuencias en menos de 60 segundos.',
        position: 2
      },
      {
        '@type': 'HowToStep',
        name: 'Revisa los resultados',
        text: 'Obtén un puntaje de 0-100 con interpretaciones y recomendaciones específicas para tu mezcla.',
        position: 3
      },
      {
        '@type': 'HowToStep',
        name: 'Descarga el reporte',
        text: 'Genera un PDF profesional con todos los detalles técnicos para compartir o archivar.',
        position: 4
      }
    ]
  },

  // Organization Schema
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Mastering Ready',
    url: 'https://masteringready.com',
    logo: 'https://masteringready.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'mat@matcarvy.com',
      contactType: 'customer service',
      availableLanguage: ['Spanish', 'English']
    },
    sameAs: [
      'https://instagram.com/matcarvy',
      'https://wa.me/573155576115'
    ]
  },

  // Product Schema (para el eBook relacionado)
  product: {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: 'Mastering Ready — Asegura el éxito de tu mastering desde la mezcla',
    author: {
      '@type': 'Person',
      name: 'Matías Carvajal'
    },
    description: 'Guía para entender qué decisiones importan realmente cuando preparas una mezcla para mastering. Aprende a entregar mezclas claras, estables y bien preparadas.',
    url: 'https://payhip.com/b/TXrCn',
    offers: {
      '@type': 'Offer',
      price: '23.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    },
    inLanguage: 'es'
  }
}

// =============================================================================
// ROOT LAYOUT
// =============================================================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData.softwareApplication)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData.howTo)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData.organization)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData.product)
          }}
        />
        
        {/* Favicon - agregar estos archivos a /public */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#667eea" />
        
        {/* Preconnect para performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/auth'

// =============================================================================
// SEO METADATA - Mastering Ready
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  // ─────────────────────────────────────────────────────────────────────────────
  // BASIC META
  // ─────────────────────────────────────────────────────────────────────────────
  title: {
    default: 'Mastering Ready | Analyze your mix before mastering',
    template: '%s | Mastering Ready'
  },
  description: "Upload your mix and find out if it's ready for mastering. 0-100 score, professional metrics and specific recommendations in 60 seconds. 2 free analyses.",
  keywords: [
    'mix analysis',
    'prepare mix for mastering',
    'headroom',
    'LUFS',
    'true peak',
    'stereo balance',
    'mix analyzer',
    'audio analysis',
    'mastering preparation',
    'professional mix',
    'audio engineering',
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
    title: 'Is your mix ready for mastering? Find out in 60 seconds',
    description: 'Professional technical analysis: LUFS, True Peak, headroom, frequency balance. 0-100 score with specific recommendations. 2 free analyses.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mastering Ready - Analyze your mix before mastering',
        type: 'image/png'
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TWITTER CARD
  // ─────────────────────────────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'Is your mix ready for mastering? Find out in 60 seconds',
    description: 'Professional technical analysis: LUFS, True Peak, headroom, frequency balance. 0-100 score with specific recommendations. 2 free analyses.',
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
      priceValidUntil: '2026-12-31'
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
    description: 'Analyze your audio mix in 60 seconds. Detect headroom, LUFS, true peak and stereo balance issues before sending to mastering.',
    url: 'https://masteringready.com',
    screenshot: 'https://masteringready.com/og-image.png',
    featureList: [
      'Headroom Analysis',
      'LUFS Measurement',
      'True Peak Detection',
      'Stereo Balance',
      'Frequency Analysis',
      'Downloadable PDF Report'
    ]
  },

  // HowTo Schema - Para aparecer en rich snippets
  howTo: {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to analyze your mix before mastering',
    description: 'Step-by-step guide to verify your mix is ready for professional mastering using Mastering Ready.',
    totalTime: 'PT2M',
    tool: [
      {
        '@type': 'HowToTool',
        name: 'Audio file (WAV, MP3, AIFF, AAC, M4A or OGG)'
      }
    ],
    step: [
      {
        '@type': 'HowToStep',
        name: 'Upload your mix',
        text: 'Drag and drop your audio file (WAV, MP3, AIFF, AAC, M4A or OGG, max 500MB) into the analyzer.',
        position: 1
      },
      {
        '@type': 'HowToStep',
        name: 'Wait for analysis',
        text: 'The system analyzes headroom, LUFS, true peak, stereo balance and frequencies in under 60 seconds.',
        position: 2
      },
      {
        '@type': 'HowToStep',
        name: 'Review results',
        text: 'Get a score from 0-100 with interpretations and specific recommendations for your mix.',
        position: 3
      },
      {
        '@type': 'HowToStep',
        name: 'Download report',
        text: 'Generate a professional PDF with all technical details to share or archive.',
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
    name: 'Mastering Ready: Ensure mastering success from the mix',
    author: {
      '@type': 'Person',
      name: 'Matías Carvajal'
    },
    description: 'A guide to understanding which decisions truly matter when preparing a mix for mastering. Learn to deliver clear, stable, and well-prepared mixes.',
    url: 'https://payhip.com/b/TXrCn',
    offers: {
      '@type': 'Offer',
      price: '15',
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
        {/* Prevent Safari text inflation on iOS accessibility text scaling */}
        <style dangerouslySetInnerHTML={{ __html: `
          html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
          @supports (-webkit-touch-callout: none) {
            input, textarea, select { font-size: 16px !important; }
          }
        `}} />

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
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

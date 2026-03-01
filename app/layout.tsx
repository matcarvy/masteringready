import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/auth'
import { QueryProvider } from '@/components/QueryProvider'
import './globals.css'

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
    default: 'Mastering Ready | Analiza tu mezcla antes de masterizar',
    template: '%s | Mastering Ready'
  },
  description: 'Sube tu mezcla y descubre si está lista para mastering. Puntuación de 0 a 100, métricas profesionales y recomendaciones específicas en 60 segundos. 2 análisis completos gratis.',
  keywords: [
    'mix analysis',
    'prepare mix for mastering',
    'is my mix ready for mastering',
    'mix analysis tool online',
    'check mix before mastering',
    'analizar mezcla antes de mastering',
    'mezcla lista para mastering',
    'headroom',
    'LUFS',
    'true peak',
    'stereo balance',
    'mix analyzer',
    'audio analysis',
    'mastering preparation',
    'pre-mastering checklist',
    'análisis de mezcla',
    'preparar mezcla para mastering'
  ],
  authors: [{ name: siteConfig.author, url: 'https://matcarvy.com' }],
  creator: siteConfig.author,
  publisher: siteConfig.name,
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CANONICAL & ALTERNATES
  // ─────────────────────────────────────────────────────────────────────────────
  metadataBase: new URL(siteConfig.url),
  alternates: {
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
    description: 'Professional technical analysis: LUFS, True Peak, headroom, frequency balance. 0-100 score with specific recommendations. 2 free full analyses.',
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
    description: 'Professional technical analysis: LUFS, True Peak, headroom, frequency balance. 0-100 score with specific recommendations. 2 free full analyses.',
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
    google: '8PArBzTf2vdnQ0brJTy7sYNQU0ySC5qGPkDa4EMD-z4',
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
    // aggregateRating removed — will add when real reviews exist
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
        name: 'Audio file (WAV, MP3, AIFF, FLAC, AAC, M4A or OGG)'
      }
    ],
    step: [
      {
        '@type': 'HowToStep',
        name: 'Upload your mix',
        text: 'Drag and drop your audio file (WAV, MP3, AIFF, FLAC, AAC, M4A or OGG, max 200MB) into the analyzer.',
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
    logo: 'https://masteringready.com/icon-512.png',
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

  // FAQPage Schema — targets high-intent queries for both SEO rich snippets and AI citation
  faqPage: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What does Mastering Ready do?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Mastering Ready analyzes your audio mix and tells you if it is ready for mastering. It measures headroom, LUFS, true peak, stereo balance, and frequency distribution, then gives you a 0 to 100 score with specific recommendations. It does not master your audio. It helps you identify what to fix before sending your mix to a mastering engineer.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is my audio stored after analysis?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Mastering Ready never stores your audio files. Your file is analyzed in memory and immediately deleted. Only the derived metrics and scores are saved to your account. Your music stays yours.'
        }
      },
      {
        '@type': 'Question',
        name: 'How much headroom should my mix have before mastering?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A well-prepared mix should have between -6 dBFS and -3 dBFS of headroom (peak level). This gives the mastering engineer enough room to work with EQ, compression, and limiting without clipping. Mastering Ready measures your headroom and tells you if it falls within the recommended range.'
        }
      },
      {
        '@type': 'Question',
        name: 'What LUFS should my mix be before mastering?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Before mastering, your mix should typically sit between -18 and -14 LUFS integrated. This is not the final loudness target, which depends on the streaming platform. Mastering Ready measures your integrated LUFS and flags if your mix is too loud or too quiet for optimal mastering results.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is Mastering Ready free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. You get 2 free full analyses with complete reports and PDF downloads when you create an account. No credit card required. After that, you can purchase individual analyses for $5.99 or subscribe to Pro for $9.99 per month (30 analyses, regional pricing available).'
        }
      },
      {
        '@type': 'Question',
        name: 'What audio formats does Mastering Ready support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Mastering Ready supports WAV, MP3, AIFF, AIF, AAC, M4A, and OGG files up to 500 MB. For the most accurate analysis, we recommend uploading WAV files at the highest resolution available from your DAW.'
        }
      },
      {
        '@type': 'Question',
        name: 'How is the 0 to 100 score calculated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The score is based on weighted analysis of five technical metrics: headroom, true peak, peak to loudness ratio (PLR), stereo correlation, and frequency balance. Each metric is evaluated against professional mastering standards. A score of 85 or above means your mix is technically ready for mastering.'
        }
      },
      {
        '@type': 'Question',
        name: 'Can mastering fix a bad mix?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Mastering can enhance a good mix but cannot fix fundamental problems like poor balance, excessive headroom issues, or phase problems. That is why analyzing your mix before mastering matters. Mastering Ready identifies the specific issues you should address in your mix so the mastering engineer can do their best work.'
        }
      }
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
    inLanguage: 'es',
    bookFormat: 'https://schema.org/EBook'
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
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Theme initialization — runs before paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('mr-theme');var q=window.matchMedia('(prefers-color-scheme:dark)').matches;var t=s==='dark'?'dark':s==='light'?'light':q?'dark':'light';document.documentElement.setAttribute('data-theme',t)})()` }} />

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
            __html: JSON.stringify(structuredData.faqPage)
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

        {/* Meta Pixel */}
        <script dangerouslySetInnerHTML={{ __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1634157831233542');
          fbq('track', 'PageView');
        `}} />
        <noscript>
          <img height="1" width="1" style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1634157831233542&ev=PageView&noscript=1"
          />
        </noscript>
      </head>
      <body>
        <AuthProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

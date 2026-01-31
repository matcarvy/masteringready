'use client'

/**
 * Terms of Service Page / Página de Términos de Servicio
 * Bilingual: ES LATAM Neutro + US English
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { ArrowLeft, FileText } from 'lucide-react'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    title: 'Términos de Servicio',
    lastUpdated: 'Última actualización',
    backToHome: 'Volver al inicio',
    sections: {
      intro: {
        title: 'Introducción',
        content: `Bienvenido a MasteringReady. Al acceder o utilizar nuestro servicio de análisis de audio, aceptas estos Términos de Servicio. Lee este documento con atención antes de usar la plataforma.

MasteringReady es un servicio de análisis técnico de mezclas de audio que te ayuda a evaluar si tu mezcla está lista para el proceso de mastering.`
      },
      service: {
        title: 'Descripción del Servicio',
        content: `MasteringReady proporciona:

• Análisis técnico de archivos de audio (WAV, MP3, AIFF)
• Métricas como LUFS, True Peak, Headroom, correlación estéreo y balance frecuencial
• Reportes descargables en formato PDF (según tu plan)
• Recomendaciones basadas en estándares profesionales de la industria

El servicio está diseñado como herramienta educativa y de referencia. Los resultados son orientativos y no sustituyen el criterio de un ingeniero de audio profesional.`
      },
      plans: {
        title: 'Planes y Pagos',
        content: `Ofrecemos diferentes niveles de servicio:

• Gratis: 2 análisis para empezar, solo modo rápido y resumen
• Análisis Individual: $5.99 USD, un análisis completo con PDF
• Pro: $9.99/mes USD, 30 análisis mensuales con todas las funciones
• Pack Adicional (solo Pro): $3.99 USD por 10 análisis extra

Los precios pueden variar según tu ubicación geográfica (precios regionales). Los pagos se procesan a través de Stripe. Las suscripciones se renuevan automáticamente hasta que las canceles.

Debido a la naturaleza digital e inmediata del servicio, todos los pagos son finales salvo que la ley aplicable requiera lo contrario.`
      },
      usage: {
        title: 'Uso Aceptable',
        content: `Al usar MasteringReady, te comprometes a:

• Subir únicamente archivos de audio de los cuales tienes los derechos necesarios
• No intentar vulnerar, hackear o sobrecargar nuestros sistemas
• No usar el servicio para fines ilegales o no autorizados
• No revender o redistribuir el servicio sin autorización
• Proporcionar información veraz al registrarte

Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos.

Podemos limitar o suspender temporalmente el acceso en casos de uso excesivo, mantenimiento del sistema, o comportamiento que pueda afectar la estabilidad de la plataforma.`
      },
      privacy: {
        title: 'Privacidad y Datos',
        content: `Tu privacidad es fundamental para nosotros:

• Nunca almacenamos tus archivos de audio de forma permanente
• Los archivos se procesan en memoria y se eliminan inmediatamente después del análisis
• Solo guardamos los resultados del análisis (métricas y reportes) si tienes una cuenta
• No compartimos tus datos con terceros para fines publicitarios

Consulta nuestra Política de Privacidad para más detalles.`
      },
      ip: {
        title: 'Propiedad Intelectual',
        content: `• Tú conservas todos los derechos sobre tus archivos de audio
• MasteringReady conserva los derechos sobre su metodología, algoritmos, código y diseño
• Los reportes generados son para tu uso personal o profesional
• La marca "MasteringReady" y el logo son propiedad de Matías Carvajal

La lógica de análisis, el sistema de puntuación y las recomendaciones se basan en know-how propietario desarrollado por MasteringReady y no se derivan de ningún archivo de audio individual de los usuarios.`
      },
      liability: {
        title: 'Limitación de Responsabilidad',
        content: `MasteringReady se proporciona "tal cual" sin garantías de ningún tipo. No garantizamos:

• Que el servicio esté libre de errores o interrupciones
• Que los resultados del análisis sean 100% precisos en todos los casos
• Resultados comerciales específicos derivados del uso del servicio

En ningún caso seremos responsables por daños indirectos, incidentales o consecuentes derivados del uso del servicio.`
      },
      changes: {
        title: 'Cambios en los Términos',
        content: `Podemos actualizar estos Términos de Servicio ocasionalmente. Te notificaremos sobre cambios significativos por correo electrónico o mediante un aviso en la plataforma. El uso continuado del servicio después de dichos cambios constituye tu aceptación de los nuevos términos.`
      },
      governing: {
        title: 'Ley Aplicable',
        content: `Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa estará sujeta a la jurisdicción exclusiva de los tribunales de Colombia.`
      },
      contact: {
        title: 'Contacto',
        content: null,
        contactLinks: true
      }
    }
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated',
    backToHome: 'Back to home',
    sections: {
      intro: {
        title: 'Introduction',
        content: `Welcome to MasteringReady. By accessing or using our audio analysis service, you agree to these Terms of Service. Please read this document carefully before using the platform.

MasteringReady is a technical mix analysis service that helps you evaluate whether your mix is ready for the mastering process.`
      },
      service: {
        title: 'Service Description',
        content: `MasteringReady provides:

• Technical analysis of audio files (WAV, MP3, AIFF)
• Metrics such as LUFS, True Peak, Headroom, stereo correlation, and frequency balance
• Downloadable PDF reports (depending on your plan)
• Recommendations based on professional industry standards

The service is designed as an educational and reference tool. Results are indicative and do not replace the judgment of a professional audio engineer.`
      },
      plans: {
        title: 'Plans and Payments',
        content: `We offer different service levels:

• Free: 2 analyses to get started, quick and summary mode only
• Single Analysis: $5.99 USD, one complete analysis with PDF
• Pro: $9.99/month USD, 30 monthly analyses with all features
• Add-on Pack (Pro only): $3.99 USD for 10 extra analyses

Prices may vary based on your geographic location (regional pricing). Payments are processed through Stripe. Subscriptions renew automatically until you cancel.

Due to the digital and immediate nature of the service, all payments are final unless required otherwise by applicable law.`
      },
      usage: {
        title: 'Acceptable Use',
        content: `When using MasteringReady, you agree to:

• Upload only audio files for which you have the necessary rights
• Not attempt to breach, hack, or overload our systems
• Not use the service for illegal or unauthorized purposes
• Not resell or redistribute the service without authorization
• Provide truthful information when registering

We reserve the right to suspend or cancel accounts that violate these terms.

We may temporarily limit or suspend access in cases of excessive usage, system maintenance, or behavior that may affect platform stability.`
      },
      privacy: {
        title: 'Privacy and Data',
        content: `Your privacy is fundamental to us:

• We never permanently store your audio files
• Files are processed in memory and deleted immediately after analysis
• We only save analysis results (metrics and reports) if you have an account
• We do not share your data with third parties for advertising purposes

Please refer to our Privacy Policy for more details.`
      },
      ip: {
        title: 'Intellectual Property',
        content: `• You retain all rights to your audio files
• MasteringReady retains rights to its methodology, algorithms, code, and design
• Generated reports are for your personal or professional use
• The "MasteringReady" brand and logo are property of Matías Carvajal

The analysis logic, scoring system, and recommendations are based on proprietary know-how developed by MasteringReady and are not derived from any single user's audio file.`
      },
      liability: {
        title: 'Limitation of Liability',
        content: `MasteringReady is provided "as is" without warranties of any kind. We do not guarantee:

• That the service will be error-free or uninterrupted
• That analysis results will be 100% accurate in all cases
• Specific commercial results derived from using the service

In no event shall we be liable for indirect, incidental, or consequential damages arising from the use of the service.`
      },
      changes: {
        title: 'Changes to Terms',
        content: `We may update these Terms of Service from time to time. We will notify you of significant changes via email or through a notice on the platform. Continued use of the service after such changes constitutes your acceptance of the new terms.`
      },
      governing: {
        title: 'Governing Law',
        content: `These Terms shall be governed by the laws of the Republic of Colombia. Any disputes shall be subject to the exclusive jurisdiction of Colombian courts.`
      },
      contact: {
        title: 'Contact',
        content: null,
        contactLinks: true
      }
    }
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TermsPage() {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [isMobile, setIsMobile] = useState(false)
  const t = translations[lang]

  useEffect(() => {
    setLang(detectLanguage())
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <ArrowLeft size={18} />
            {t.backToHome}
          </Link>

          <button
            onClick={() => {
              const newLang = lang === 'es' ? 'en' : 'es'
              setLang(newLang)
              setLanguageCookie(newLang)
            }}
            style={{
              background: '#f3f4f6',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: isMobile ? '1.5rem 1rem 3rem' : '2rem 1.5rem 4rem'
      }}>
        {/* Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? '2rem' : '3rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? '48px' : '64px',
            height: isMobile ? '48px' : '64px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '1rem',
            marginBottom: '1rem'
          }}>
            <FileText size={isMobile ? 24 : 32} color="white" />
          </div>
          <h1 style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            {t.title}
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            {t.lastUpdated}: 28 de enero de 2026
          </p>
        </div>

        {/* Sections */}
        <div style={{
          background: 'white',
          borderRadius: isMobile ? '0.75rem' : '1rem',
          padding: isMobile ? '1.25rem' : '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          {Object.values(t.sections).map((section: any, index) => (
            <section
              key={index}
              style={{
                marginBottom: index < Object.values(t.sections).length - 1 ? '2rem' : 0,
                paddingBottom: index < Object.values(t.sections).length - 1 ? '2rem' : 0,
                borderBottom: index < Object.values(t.sections).length - 1 ? '1px solid #e5e7eb' : 'none'
              }}
            >
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '1rem'
              }}>
                {section.title}
              </h2>
              <div style={{
                color: '#4b5563',
                fontSize: '0.95rem',
                lineHeight: '1.75',
                whiteSpace: 'pre-line'
              }}>
                {section.contactLinks ? (
                  <>
                    <p>{lang === 'es' ? 'Si tienes preguntas sobre estos Términos de Servicio, contáctanos:' : 'If you have questions about these Terms of Service, contact us:'}</p>
                    <p style={{ marginTop: '0.75rem' }}>
                      {'• Email: '}
                      <a href="mailto:mat@matcarvy.com" style={{ color: '#667eea', textDecoration: 'underline' }}>mat@matcarvy.com</a>
                    </p>
                    <p>
                      {'• WhatsApp: '}
                      <a href="https://wa.me/573155576115" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'underline' }}>+57 315 557 6115</a>
                    </p>
                  </>
                ) : section.content}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

'use client'

/**
 * Privacy Policy Page / Página de Política de Privacidad
 * Bilingual: ES LATAM Neutro + US English
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { detectLanguage, setLanguageCookie } from '@/lib/language'
import { ArrowLeft, Shield } from 'lucide-react'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    title: 'Política de Privacidad',
    lastUpdated: 'Última actualización',
    backToHome: 'Volver al inicio',
    sections: {
      intro: {
        title: 'Resumen',
        content: `En MasteringReady, tu privacidad es nuestra prioridad. Este documento explica qué datos recopilamos, cómo los usamos y tus derechos sobre ellos.

Lo más importante que debes saber: nunca almacenamos tus archivos de audio. Se procesan en memoria y se eliminan inmediatamente después del análisis.`
      },
      collect: {
        title: 'Datos que Recopilamos',
        content: `Recopilamos la siguiente información:

Información de cuenta (si te registras):
• Nombre y correo electrónico
• Preferencia de idioma
• País (para precios regionales)

Datos de análisis (si tienes cuenta):
• Nombre del archivo (no el archivo en sí)
• Métricas técnicas del análisis (LUFS, True Peak, etc.)
• Puntuación y veredicto
• Reportes generados
• Fecha y hora del análisis

Datos técnicos:
• Dirección IP (para detección de país)
• Tipo de navegador y dispositivo
• Cookies de sesión`
      },
      audio: {
        title: 'Sobre tus Archivos de Audio',
        content: `Esta es nuestra política estricta sobre archivos de audio:

• Tus archivos se suben temporalmente a nuestros servidores solo para el análisis
• El procesamiento ocurre en memoria (RAM)
• Los archivos se eliminan automáticamente inmediatamente después del análisis
• No guardamos copias de respaldo de tus archivos
• No tenemos acceso al contenido de tu audio después del análisis
• No usamos tu audio para entrenar modelos de IA ni ningún otro propósito

Solo guardamos los resultados numéricos y textuales del análisis, nunca el audio en sí.`
      },
      usage: {
        title: 'Cómo Usamos tus Datos',
        content: `Usamos tus datos para:

• Proporcionar el servicio de análisis
• Guardar tu historial de análisis (si tienes cuenta)
• Procesar pagos de forma segura
• Enviar comunicaciones relacionadas con tu cuenta
• Mejorar el servicio y corregir errores
• Cumplir con obligaciones legales

No vendemos ni compartimos tus datos con terceros para publicidad.`
      },
      cookies: {
        title: 'Cookies',
        content: `Usamos cookies para:

• Mantener tu sesión iniciada
• Recordar tu preferencia de idioma
• Detectar tu país para precios regionales
• Análisis básico de uso (sin rastreo publicitario)

Puedes configurar tu navegador para rechazar cookies, pero algunas funciones del servicio podrían no funcionar correctamente.`
      },
      thirdparty: {
        title: 'Servicios de Terceros',
        content: `Utilizamos los siguientes servicios de terceros:

• Supabase: Base de datos y autenticación (almacenamiento seguro)
• Stripe: Procesamiento de pagos (PCI-DSS compliant)
• Vercel: Hospedaje web (infraestructura segura)

Cada uno de estos servicios tiene sus propias políticas de privacidad y cumple con estándares de seguridad de la industria.`
      },
      rights: {
        title: 'Tus Derechos',
        content: `Tienes derecho a:

• Acceder a tus datos personales
• Corregir datos inexactos
• Eliminar tu cuenta y datos asociados
• Exportar tus datos en formato legible
• Retirar tu consentimiento en cualquier momento

Para ejercer estos derechos, contáctanos a mat@matcarvy.com

Si te encuentras en el Espacio Económico Europeo, tienes derechos adicionales bajo las leyes de protección de datos aplicables.`
      },
      security: {
        title: 'Seguridad',
        content: `Implementamos medidas de seguridad que incluyen:

• Conexiones cifradas (HTTPS/TLS)
• Almacenamiento seguro de contraseñas (hash + salt)
• Acceso restringido a datos personales
• Monitoreo de actividad sospechosa
• Respaldos regulares de datos

Aunque implementamos medidas robustas, ningún sistema es 100% seguro. En caso de brecha de seguridad, te notificaremos según lo requiera la ley.`
      },
      retention: {
        title: 'Retención de Datos',
        content: `• Datos de cuenta: Se conservan mientras tu cuenta esté activa
• Historial de análisis: Se conserva mientras tu cuenta esté activa
• Datos de pago: Se conservan según requisitos legales (generalmente 7 años)
• Archivos de audio: Se eliminan inmediatamente después del análisis

Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento.`
      },
      changes: {
        title: 'Cambios a esta Política',
        content: `Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos sobre cambios significativos por correo electrónico o mediante un aviso en la plataforma.`
      },
      contact: {
        title: 'Contacto',
        content: null,
        contactLinks: true
      }
    }
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated',
    backToHome: 'Back to home',
    sections: {
      intro: {
        title: 'Summary',
        content: `At MasteringReady, your privacy is our priority. This document explains what data we collect, how we use it, and your rights regarding it.

The most important thing to know: we never store your audio files. They are processed in memory and deleted immediately after analysis.`
      },
      collect: {
        title: 'Data We Collect',
        content: `We collect the following information:

Account information (if you register):
• Name and email address
• Language preference
• Country (for regional pricing)

Analysis data (if you have an account):
• File name (not the file itself)
• Technical analysis metrics (LUFS, True Peak, etc.)
• Score and verdict
• Generated reports
• Date and time of analysis

Technical data:
• IP address (for country detection)
• Browser and device type
• Session cookies`
      },
      audio: {
        title: 'About Your Audio Files',
        content: `This is our strict policy on audio files:

• Your files are temporarily uploaded to our servers only for analysis
• Processing occurs in memory (RAM)
• Files are automatically deleted immediately after analysis
• We do not keep backup copies of your files
• We have no access to your audio content after analysis
• We do not use your audio to train AI models or for any other purpose

We only save the numerical and textual results of the analysis, never the audio itself.`
      },
      usage: {
        title: 'How We Use Your Data',
        content: `We use your data to:

• Provide the analysis service
• Save your analysis history (if you have an account)
• Process payments securely
• Send communications related to your account
• Improve the service and fix bugs
• Comply with legal obligations

We do not sell or share your data with third parties for advertising.`
      },
      cookies: {
        title: 'Cookies',
        content: `We use cookies to:

• Keep you logged in
• Remember your language preference
• Detect your country for regional pricing
• Basic usage analytics (no ad tracking)

You can configure your browser to reject cookies, but some service features may not work properly.`
      },
      thirdparty: {
        title: 'Third-Party Services',
        content: `We use the following third-party services:

• Supabase: Database and authentication (secure storage)
• Stripe: Payment processing (PCI-DSS compliant)
• Vercel: Web hosting (secure infrastructure)

Each of these services has its own privacy policies and complies with industry security standards.`
      },
      rights: {
        title: 'Your Rights',
        content: `You have the right to:

• Access your personal data
• Correct inaccurate data
• Delete your account and associated data
• Export your data in a readable format
• Withdraw your consent at any time

To exercise these rights, contact us at mat@matcarvy.com

If you are located in the European Economic Area, you have additional rights under applicable data protection laws.`
      },
      security: {
        title: 'Security',
        content: `We implement security measures including:

• Encrypted connections (HTTPS/TLS)
• Secure password storage (hash + salt)
• Restricted access to personal data
• Monitoring of suspicious activity
• Regular data backups

Although we implement robust measures, no system is 100% secure. In case of a security breach, we will notify you as required by law.`
      },
      retention: {
        title: 'Data Retention',
        content: `• Account data: Retained while your account is active
• Analysis history: Retained while your account is active
• Payment data: Retained according to legal requirements (generally 7 years)
• Audio files: Deleted immediately after analysis

You can request deletion of your account and data at any time.`
      },
      changes: {
        title: 'Changes to This Policy',
        content: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through a notice on the platform.`
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

export default function PrivacyPage() {
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
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '1rem',
            marginBottom: '1rem'
          }}>
            <Shield size={isMobile ? 24 : 32} color="white" />
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

        {/* Privacy First Badge */}
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '1px solid #86efac',
          borderRadius: isMobile ? '0.75rem' : '1rem',
          padding: isMobile ? '1rem' : '1.5rem',
          marginBottom: isMobile ? '1.5rem' : '2rem',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#065f46',
            marginBottom: '0.5rem'
          }}>
            {lang === 'es' ? 'Privacidad Primero' : 'Privacy First'}
          </p>
          <p style={{
            color: '#047857',
            fontSize: '0.95rem'
          }}>
            {lang === 'es'
              ? 'Tus archivos de audio nunca se almacenan. Se procesan en memoria y se eliminan inmediatamente.'
              : 'Your audio files are never stored. They are processed in memory and deleted immediately.'}
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
                    <p>{lang === 'es' ? 'Si tienes preguntas sobre esta Política de Privacidad:' : 'If you have questions about this Privacy Policy:'}</p>
                    <p style={{ marginTop: '0.75rem' }}>
                      {'• Email: '}
                      <a href="mailto:mat@matcarvy.com" style={{ color: '#667eea', textDecoration: 'underline' }}>mat@matcarvy.com</a>
                    </p>
                    <p>
                      {'• WhatsApp: '}
                      <a href="https://wa.me/573155576115" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'underline' }}>+57 315 557 6115</a>
                    </p>
                    <p style={{ marginTop: '1rem' }}>
                      {lang === 'es' ? 'Responsable del tratamiento de datos:' : 'Data controller:'}
                      <br />
                      {'Matías Carvajal'}
                      <br />
                      <a href="mailto:mat@matcarvy.com" style={{ color: '#667eea', textDecoration: 'underline' }}>mat@matcarvy.com</a>
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

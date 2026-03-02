'use client'

import Link from 'next/link'
import { Music } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LearnProvider, useLearn } from './LearnContext'

function LearnHeader() {
  const { lang, toggleLang, isMobile } = useLearn()

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      width: '100%',
      background: 'var(--mr-bg-card)',
      backdropFilter: 'blur(10px)',
      boxShadow: 'var(--mr-shadow)',
      zIndex: 50,
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '64px',
          gap: '0.5rem',
        }}>
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
              minWidth: 0,
              flex: '1 1 auto',
              overflow: 'hidden',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              background: 'var(--mr-gradient)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Music size={18} color="white" />
            </div>
            {!isMobile && (
              <span style={{
                fontWeight: '700',
                background: 'var(--mr-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                whiteSpace: 'nowrap',
              }}>
                Mastering Ready
              </span>
            )}
          </Link>

          {/* Right side controls */}
          <div style={{
            display: 'flex',
            gap: isMobile ? '0.5rem' : '0.75rem',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              style={{
                padding: '0.5rem 0.75rem',
                minWidth: '2.75rem',
                minHeight: '2.75rem',
                textAlign: 'center',
                background: 'transparent',
                color: 'var(--mr-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem',
              }}
              aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>

            {/* Theme Toggle */}
            <ThemeToggle lang={lang} />

            {/* CTA */}
            <Link
              href="/#analyze"
              style={{
                background: 'var(--mr-gradient)',
                color: 'white',
                padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1.25rem',
                borderRadius: '9999px',
                fontWeight: '600',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                textDecoration: 'none',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {lang === 'es' ? 'Analizar' : 'Analyze'}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

function LearnFooter() {
  const { lang, isMobile } = useLearn()

  const footerLinkStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.7)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'color 0.2s',
  }

  return (
    <footer style={{
      background: 'linear-gradient(to bottom, #1e1b4b 0%, #312e81 100%)',
      color: 'white',
      textAlign: 'center',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          textAlign: 'left',
          padding: isMobile ? '1.75rem 1.5rem 1.5rem' : '2.5rem 1.5rem 1.75rem',
        }}>
          {/* Brand */}
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Music size={24} style={{ color: '#ffffff', flexShrink: 0 }} /> Mastering Ready
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              {lang === 'es'
                ? 'Analiza tu mezcla antes de masterizar.'
                : 'Analyze your mix before mastering.'}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontWeight: '600', color: '#ffffff', marginBottom: '1rem' }}>
              {lang === 'es' ? 'Contacto' : 'Contact'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a href="mailto:mat@matcarvy.com" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                <span>📧</span><span>mat@matcarvy.com</span>
              </a>
              <a href="https://wa.me/573155576115" target="_blank" rel="noopener noreferrer" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                <span>📱</span><span>WhatsApp</span>
              </a>
              <a href="https://instagram.com/matcarvy" target="_blank" rel="noopener noreferrer" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                <span>📷</span><span>@matcarvy</span>
              </a>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 style={{ fontWeight: '600', color: '#ffffff', marginBottom: '1rem' }}>
              {lang === 'es' ? 'Recursos' : 'Resources'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/learn/is-my-mix-ready" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                {lang === 'es' ? '¿Mi mezcla está lista?' : 'Is my mix ready?'}
              </Link>
              <Link href="/learn/prepare-mix-for-mastering" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                {lang === 'es' ? 'Preparar mezcla para mastering' : 'Prepare mix for mastering'}
              </Link>
              <Link href="/learn/lufs-for-streaming" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                {lang === 'es' ? 'LUFS para streaming' : 'LUFS for streaming'}
              </Link>
              <Link href="/learn/mixing-vs-mastering" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                {lang === 'es' ? 'Mezcla vs mastering' : 'Mixing vs mastering'}
              </Link>
              <Link href="/learn/mastering-ready-vs-competitors" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                {lang === 'es' ? 'Mastering Ready vs alternativas' : 'Mastering Ready vs alternatives'}
              </Link>
              <a href="https://payhip.com/b/TXrCn" target="_blank" rel="noopener noreferrer" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                <span>📖</span><span>{lang === 'es' ? 'eBook Mastering Ready' : 'Mastering Ready eBook'}</span>
              </a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontWeight: '600', color: '#ffffff', marginBottom: '1rem' }}>
              {lang === 'es' ? 'Legal' : 'Legal'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/terms" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                <span>📄</span><span>{lang === 'es' ? 'Términos de Servicio' : 'Terms of Service'}</span>
              </Link>
              <Link href="/privacy" style={footerLinkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                <span>🛡️</span><span>{lang === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          padding: '1.5rem 1rem',
        }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '0.5rem', margin: '0 0 0.5rem' }}>
            {lang === 'es'
              ? '© 2026 Mastering Ready. Todos los derechos reservados.'
              : '© 2026 Mastering Ready. All rights reserved.'}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
            {lang === 'es'
              ? 'Basado en la metodología "Mastering Ready"'
              : 'Based on the "Mastering Ready" methodology'}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <LearnProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--mr-bg-base)', color: 'var(--mr-text-primary)' }}>
        <LearnHeader />
        <main style={{ flex: 1, paddingTop: '80px' }}>
          {children}
        </main>
        <LearnFooter />
      </div>
    </LearnProvider>
  )
}

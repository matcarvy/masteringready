'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1.5rem',
            padding: 'clamp(1.5rem, 5vw, 2.5rem)',
            width: 'calc(100% - 1rem)',
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '1.5rem'
            }}>
              🎧
            </div>

            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              Algo no funciono bien
            </h1>
            <p style={{
              color: '#9ca3af',
              fontSize: '0.95rem',
              marginBottom: '0.5rem'
            }}>
              Something went wrong
            </p>
            <p style={{
              color: '#6b7280',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              marginBottom: '2rem'
            }}>
              Intenta de nuevo o vuelve al inicio.
              <br />
              Try again or go back to the home page.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Intentar de nuevo / Try again
              </button>
              <a
                href="/"
                style={{
                  padding: '0.875rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                Inicio / Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

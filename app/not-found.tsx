import Link from 'next/link'
import { Headphones } from 'lucide-react'

export default function NotFound() {
  return (
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
        background: 'var(--mr-bg-card)',
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
          margin: '0 auto 1.5rem'
        }}>
          <Headphones size={32} color="white" />
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 8vw, 3rem)',
          fontWeight: 'bold',
          color: 'var(--mr-text-primary)',
          marginBottom: '0.5rem'
        }}>
          404
        </h1>
        <p style={{
          color: 'var(--mr-text-secondary)',
          fontSize: '1.1rem',
          marginBottom: '0.25rem'
        }}>
          Página no encontrada
        </p>
        <p style={{
          color: 'var(--mr-text-tertiary)',
          fontSize: '0.95rem',
          marginBottom: '0.5rem'
        }}>
          Page not found
        </p>
        <p style={{
          color: 'var(--mr-text-tertiary)',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          marginBottom: '2rem'
        }}>
          La página que buscas no existe o fue movida.
          <br />
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.875rem 2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '600',
            textDecoration: 'none',
            transition: 'opacity 0.2s'
          }}
        >
          Volver al inicio / Back to home
        </Link>
      </div>
    </div>
  )
}

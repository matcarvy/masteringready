'use client'

/**
 * Subscription Page / Página de Suscripción
 * Shows current plan, usage, upgrade/addon options, billing info
 * Muestra plan actual, uso, opciones de actualización/addon, info de facturación
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, UserMenu } from '@/components/auth'
import { supabase, getUserAnalysisStatus, checkCanBuyAddon, UserDashboardStatus } from '@/lib/supabase'
import { useGeo } from '@/lib/useGeo'
import { getPlanDisplayPrice, PRICING } from '@/lib/geoip'
import { getLanguageCookie, setLanguageCookie } from '@/lib/language'
import {
  Music,
  Zap,
  Crown,
  Check,
  CreditCard,
  X,
  AlertTriangle,
  Star,
  Package
} from 'lucide-react'

// ============================================================================
// TRANSLATIONS / TRADUCCIONES
// ============================================================================

const translations = {
  es: {
    title: 'Tu Suscripción',
    loading: 'Cargando...',
    analyze: 'Analizar',
    currentPlan: 'Plan actual',
    free: 'Gratis',
    pro: 'MasteringReady Pro',
    proBadge: 'PRO',
    // Free plan
    analysisUsage: 'Uso de análisis',
    lifetimeAnalyses: 'análisis de por vida',
    getMoreWithPro: 'Obtén más con Pro',
    benefit1: '30 análisis al mes',
    benefit2: 'Análisis Completo y Detallado',
    benefit3: 'Descarga de PDFs',
    benefit4: 'Procesamiento prioritario',
    upgradeToPro: 'Actualizar a Pro',
    cancelAnytime: 'Cancela cuando quieras',
    justNeedOne: '¿Solo necesitas un análisis?',
    buySingle: 'Comprar análisis individual',
    // Pro plan
    usageThisMonth: 'Uso este mes',
    analysesOf30: 'análisis',
    resetsOn: 'Se reinicia el',
    needMore: '¿Necesitas más análisis?',
    addExtra: 'Agrega 10 análisis extra este mes',
    add10: 'Agregar 10 análisis',
    maxPacks: 'Máximo 2 packs por mes',
    // Billing
    billingInfo: 'Información de facturación',
    nextBilling: 'Próximo cobro',
    paymentMethod: 'Método de pago',
    updatePayment: 'Actualizar método de pago',
    cancelSubscription: 'Cancelar suscripción',
    // Cancel modal
    cancelTitle: '¿Cancelar suscripción?',
    cancelMessage: 'Mantendrás acceso hasta el final del periodo. Tus análisis guardados no se eliminarán.',
    yesCancel: 'Sí, cancelar',
    goBack: 'Volver',
    // Payment history
    paymentHistory: 'Historial de pagos',
    noPayments: 'No hay pagos registrados aún',
    colDate: 'Fecha',
    colDescription: 'Descripción',
    colAmount: 'Monto',
    colStatus: 'Estado',
    manageSubscription: 'Administrar suscripción',
    perMonth: '/mes'
  },
  en: {
    title: 'Your Subscription',
    loading: 'Loading...',
    analyze: 'Analyze',
    currentPlan: 'Current plan',
    free: 'Free',
    pro: 'MasteringReady Pro',
    proBadge: 'PRO',
    // Free plan
    analysisUsage: 'Analysis usage',
    lifetimeAnalyses: 'lifetime analyses',
    getMoreWithPro: 'Get more with Pro',
    benefit1: '30 analyses per month',
    benefit2: 'Complete and Detailed analysis',
    benefit3: 'PDF downloads',
    benefit4: 'Priority processing',
    upgradeToPro: 'Upgrade to Pro',
    cancelAnytime: 'Cancel anytime',
    justNeedOne: 'Just need one analysis?',
    buySingle: 'Buy single analysis',
    // Pro plan
    usageThisMonth: 'Usage this month',
    analysesOf30: 'analyses',
    resetsOn: 'Resets on',
    needMore: 'Need more analyses?',
    addExtra: 'Add 10 extra analyses this month',
    add10: 'Add 10 analyses',
    maxPacks: 'Maximum 2 packs per month',
    // Billing
    billingInfo: 'Billing information',
    nextBilling: 'Next billing',
    paymentMethod: 'Payment method',
    updatePayment: 'Update payment method',
    cancelSubscription: 'Cancel subscription',
    // Cancel modal
    cancelTitle: 'Cancel subscription?',
    cancelMessage: "You'll keep access until the end of the period. Your saved analyses won't be deleted.",
    yesCancel: 'Yes, cancel',
    goBack: 'Go back',
    // Payment history
    paymentHistory: 'Payment history',
    noPayments: 'No payments recorded yet',
    colDate: 'Date',
    colDescription: 'Description',
    colAmount: 'Amount',
    colStatus: 'Status',
    manageSubscription: 'Manage subscription',
    perMonth: '/month'
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubscriptionPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [loading, setLoading] = useState(true)
  const [userStatus, setUserStatus] = useState<UserDashboardStatus | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [canBuyAddon, setCanBuyAddon] = useState(false)
  const [hasStripe, setHasStripe] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const { geo } = useGeo()
  const t = translations[lang]

  const proPrice = getPlanDisplayPrice(PRICING.PRO_MONTHLY, geo)
  const singlePrice = getPlanDisplayPrice(PRICING.SINGLE, geo)
  const addonPrice = getPlanDisplayPrice(PRICING.ADDON_PACK, geo)

  // Detect language
  useEffect(() => {
    const cookieLang = getLanguageCookie()
    if (cookieLang) {
      setLang(cookieLang)
    } else if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0]
      setLang(browserLang === 'es' ? 'es' : 'en')
    }
  }, [])

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [authLoading, user, router])

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      if (!user) return
      setLoading(true)

      try {
        // Check language preference
        const { data: profileData } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .single()

        if (profileData?.preferred_language === 'en' || profileData?.preferred_language === 'es') {
          setLang(profileData.preferred_language as 'es' | 'en')
        }

        // Check subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*, plan:plans(type, name)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (subData?.plan?.type === 'pro' || subData?.plan?.type === 'studio') {
          setIsPro(true)
        }
        if (subData?.stripe_subscription_id) {
          setHasStripe(true)
        }

        // Get usage status
        const status = await getUserAnalysisStatus()
        if (status) {
          setUserStatus(status)

          if (status.plan_type === 'pro') {
            const addonCheck = await checkCanBuyAddon()
            setCanBuyAddon(addonCheck.can_buy)
          }
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  // Handle checkout
  const handleCheckout = async (productType: 'pro_monthly' | 'single' | 'addon') => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, countryCode: geo.countryCode })
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(lang === 'es' ? 'Error al iniciar el pago' : 'Error starting payment')
      }
    } catch (error) {
      console.error('Checkout error:', error)
    }
  }

  // Handle manage subscription (Stripe portal)
  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/customer-portal', { method: 'POST' })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal error:', error)
    }
  }

  // Calculate usage
  const usedAnalyses = userStatus?.analyses_used || 0
  const maxAnalyses = isPro ? 30 : 2
  const remaining = Math.max(0, isPro
    ? (30 - usedAnalyses + (userStatus?.addon_remaining || 0))
    : (2 - usedAnalyses)
  )

  // Loading state
  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '1.25rem' }}>{t.loading}</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
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
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Music size={18} color="white" />
            </div>
            <span style={{
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              MasteringReady
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                const newLang = lang === 'es' ? 'en' : 'es'
                setLang(newLang)
                setLanguageCookie(newLang)
                if (user) {
                  supabase
                    .from('profiles')
                    .update({ preferred_language: newLang })
                    .eq('id', user.id)
                    .then(({ error }) => {
                      if (error) console.error('Error saving language preference:', error)
                    })
                }
              }}
              style={{
                padding: '0.375rem 0.75rem',
                minWidth: '2.5rem',
                textAlign: 'center',
                background: 'transparent',
                color: '#6b7280',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>

            <UserMenu lang={lang} />

            <Link
              href="/#analyze"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontWeight: '600',
                fontSize: '0.875rem',
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <Zap size={16} />
              {t.analyze}
            </Link>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '2rem 1.5rem'
      }}>
        {/* Page Header */}
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '2rem'
        }}>
          {t.title}
        </h1>

        {/* Current Plan Card */}
        <div style={{
          background: isPro
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
          color: isPro ? 'white' : '#111827'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', opacity: isPro ? 0.9 : 0.6 }}>
              {t.currentPlan}
            </span>
            {isPro && (
              <span style={{
                padding: '0.25rem 0.75rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {t.proBadge}
              </span>
            )}
          </div>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {isPro ? <Crown size={24} /> : <Star size={24} style={{ color: '#6b7280' }} />}
            {isPro ? t.pro : t.free}
          </p>
        </div>

        {/* Usage Card */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '1rem'
          }}>
            {isPro ? t.usageThisMonth : t.analysisUsage}
          </h2>

          {/* Progress bar */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              marginBottom: '0.5rem'
            }}>
              <span style={{ color: '#374151', fontWeight: '600' }}>
                {usedAnalyses} / {maxAnalyses + (userStatus?.addon_remaining || 0)}
              </span>
              <span style={{ color: '#6b7280' }}>
                {isPro ? t.analysesOf30 : t.lifetimeAnalyses}
              </span>
            </div>
            <div style={{
              background: '#e5e7eb',
              borderRadius: '9999px',
              height: '0.625rem',
              overflow: 'hidden'
            }}>
              <div style={{
                background: remaining === 0 ? '#ef4444' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                height: '100%',
                borderRadius: '9999px',
                width: `${Math.min(100, (usedAnalyses / (maxAnalyses + (userStatus?.addon_remaining || 0))) * 100)}%`,
                transition: 'width 0.5s ease-out'
              }} />
            </div>
          </div>

          {isPro && userStatus?.current_period_end && (
            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              {t.resetsOn} {new Date(userStatus.current_period_end).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                day: 'numeric',
                month: 'long'
              })}
            </p>
          )}
        </div>

        {/* Pro-specific: Add-on option */}
        {isPro && canBuyAddon && (
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#eef2ff',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Package size={20} style={{ color: '#667eea' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                  {t.needMore}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  {t.addExtra}
                </p>
                <button
                  onClick={() => handleCheckout('addon')}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t.add10} ({addonPrice.showLocal ? `~${addonPrice.formattedLocal}` : addonPrice.formatted})
                </button>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  {t.maxPacks}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Free-specific: Upgrade CTA */}
        {!isPro && (
          <>
            {/* Upgrade Card */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '1rem',
              padding: '2rem',
              color: 'white',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.25rem' }}>
                {t.getMoreWithPro}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[t.benefit1, t.benefit2, t.benefit3, t.benefit4].map((benefit, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check size={14} />
                    </div>
                    <span style={{ fontSize: '0.95rem' }}>{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                {proPrice.showLocal ? (
                  <>
                    <span style={{ fontSize: '2rem', fontWeight: '700' }}>
                      ~{proPrice.formattedLocal}
                    </span>
                    <span style={{ fontSize: '0.875rem', opacity: 0.9, display: 'block', marginTop: '0.25rem' }}>
                      ({proPrice.formatted}{t.perMonth})
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '2rem', fontWeight: '700' }}>
                    {proPrice.formatted}{t.perMonth}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleCheckout('pro_monthly')}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Crown size={20} />
                {t.upgradeToPro}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.8, marginTop: '0.75rem' }}>
                {t.cancelAnytime}
              </p>
            </div>

            {/* Single Analysis Option */}
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                {t.justNeedOne}
              </h3>
              <button
                onClick={() => handleCheckout('single')}
                style={{
                  padding: '0.625rem 1.5rem',
                  background: 'transparent',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t.buySingle} ({singlePrice.showLocal ? `~${singlePrice.formattedLocal}` : singlePrice.formatted})
              </button>
            </div>
          </>
        )}

        {/* Billing Info (Pro only) */}
        {isPro && hasStripe && (
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CreditCard size={20} style={{ color: '#667eea' }} />
              {t.billingInfo}
            </h2>

            {userStatus?.current_period_end && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f3f4f6',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#6b7280' }}>{t.nextBilling}</span>
                <span style={{ color: '#374151', fontWeight: '500' }}>
                  {new Date(userStatus.current_period_end).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginTop: '1.25rem'
            }}>
              <button
                onClick={handleManageSubscription}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {t.manageSubscription}
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'white',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {t.cancelSubscription}
              </button>
            </div>
          </div>
        )}

        {/* Payment History */}
        {isPro && (
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '1rem'
            }}>
              {t.paymentHistory}
            </h2>

            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: '#9ca3af',
              fontSize: '0.875rem'
            }}>
              {t.noPayments}
            </div>
          </div>
        )}
      </main>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div
          onClick={() => setShowCancelModal(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1.5rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: '#fef3c7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <AlertTriangle size={28} style={{ color: '#d97706' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                {t.cancelTitle}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
                {t.cancelMessage}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  handleManageSubscription()
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t.yesCancel}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {t.goBack}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

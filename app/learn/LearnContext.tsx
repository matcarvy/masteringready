'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { detectLanguage, setLanguageCookie } from '@/lib/language'

type LearnContextType = {
  lang: 'es' | 'en'
  setLang: (lang: 'es' | 'en') => void
  toggleLang: () => void
  isMobile: boolean
}

const LearnContext = createContext<LearnContextType>({
  lang: 'es',
  setLang: () => {},
  toggleLang: () => {},
  isMobile: false,
})

export function LearnProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<'es' | 'en'>('es')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setLangState(detectLanguage() as 'es' | 'en')
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const setLang = (next: 'es' | 'en') => {
    setLangState(next)
    setLanguageCookie(next)
  }

  const toggleLang = () => {
    const next = lang === 'es' ? 'en' : 'es'
    setLang(next)
  }

  return (
    <LearnContext.Provider value={{ lang, setLang, toggleLang, isMobile }}>
      {children}
    </LearnContext.Provider>
  )
}

export function useLearn() {
  return useContext(LearnContext)
}

export function useLearnMeta(meta: { titleEs: string; titleEn: string; descEs: string; descEn: string }) {
  const { lang } = useLearn()

  useEffect(() => {
    const title = lang === 'es' ? meta.titleEs : meta.titleEn
    const desc = lang === 'es' ? meta.descEs : meta.descEn

    document.title = `${title} | Mastering Ready`

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', `${title} | Mastering Ready`)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:type', 'article')
  }, [lang, meta.titleEs, meta.titleEn, meta.descEs, meta.descEn])
}

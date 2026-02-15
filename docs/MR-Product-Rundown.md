# Mastering Ready — Product Rundown

**Domain**: masteringready.com
**Launched**: February 11, 2026
**Status**: Live in production

---

## 1. WHAT IT IS

Mastering Ready is a professional audio analysis platform for musicians, producers, and mix engineers to evaluate their mixes **before mastering**. It provides a privacy-first technical assessment in 60 seconds that tells you exactly what to review before sending a track to a mastering engineer.

**Core value proposition**: "Don't guess if your mix is ready — we tell you exactly what to check before sending it to master."

It does NOT replace the mastering engineer. It helps you arrive prepared.

---

## 2. HOW IT WORKS

1. **Upload**: Drag and drop your mix file (WAV, MP3, AIFF, AAC, M4A, or OGG — max 500MB)
2. **60-second analysis**: Python-based audio analysis engine (FastAPI on Render) processes the file
3. **0-100 score**: MasteringReady score with color-coded verdict (8 tiers from "Optimal" to "Requires review")
4. **Detailed report**: Three viewing modes (Rápido, Resumen, Completo) with technical metrics and specific recommendations
5. **PDF download**: Full report as PDF (Pro and Single users only)

**Privacy-first**: Audio files are NEVER stored. Only derived metrics (LUFS, True Peak, PLR, headroom, stereo correlation, frequency balance) are saved. Files are deleted immediately after analysis.

---

## 3. TECHNICAL METRICS ANALYZED

Six scored metrics (with strict/normal mode toggle):
- **Headroom** (dBFS) — optimal: -3.0 to -6.0 dBFS
- **True Peak** (dBTP) — optimal: ≤-3.0 dBTP
- **PLR (Peak-to-Loudness Ratio)** — optimal: ≥14 dB (strict), ≥12 dB (normal)
- **LUFS (integrated loudness)** — informational, not scored (weight=0)
- **Stereo correlation** — optimal: ≥0.75 (strict), ≥0.70 (normal)
- **Frequency balance** (6-band spectral analysis)

Two informational metrics:
- **Temporal analysis** (energy distribution across track)
- **Spectral profile** (mid-focused vs balanced vs bright)

**Analyzer version**: 7.4.2 (finalized — algorithms DO NOT change)

---

## 4. TARGET AUDIENCE

**Primary**: Musicians and producers evaluating their own mixes before sending to mastering
**Secondary**: Mix engineers providing pre-master checks for clients
**Tertiary**: Content creators (for Stream Ready — separate product, shared backend)

**Geography**: Global with regional pricing focus on Latin America (Colombia, Mexico, Argentina, Brazil, Peru, Chile, Ecuador, Uruguay)

**Language**: Fully bilingual ES LATAM Neutro (Colombian Spanish, neutral across region) + US English. Browser detection → persist preference → never change on logout.

---

## 5. CURRENT FEATURES

### Core Analysis
- 3 report views: Rápido (overview), Resumen (summary), Completo (full technical detail)
- PDF download (Pro + Single users only)
- Score count-up animation (1.2s, cubic ease-out, respects prefers-reduced-motion)
- File info strip: format, sample rate, bit depth, duration, file size, channels
- Expandable glossary (6 terms, bilingual, links to eBook)
- Rotating methodology loading messages (6 messages, 2.5s cycle)
- Compression for files >50MB (Web Audio API compression before upload)

### Auth & Users
- Google OAuth, Email+Password (Facebook OAuth configured but hidden pending Meta App Review)
- Cookie-based language persistence across auth flows
- Terms of Service acceptance on signup
- Privacy Policy + Terms of Service pages (bilingual, 11 + 9 sections)
- Profile settings page
- Password reset flow
- Account deletion with anti-abuse tracking
- "Remember this device" checkbox on login (toggles localStorage vs sessionStorage for session persistence)

### Payments & Subscriptions (Stripe)
- Pro Monthly checkout ($9.99 USD base, regional pricing)
- Single Analysis purchase ($5.99 USD base)
- Pro Add-on Pack ($3.99 USD, 10 extra analyses, max 2 packs/cycle)
- Stripe Customer Portal (manage subscription, payment method, cancel)
- Pro welcome bonus (restores used free analyses as first-month addon)
- Regional pricing multipliers for 18 LATAM countries
- GeoIP country detection (Vercel edge header primary, ipinfo.io fallback)
- Stripe webhook handler (6 events: checkout.completed, invoice.paid, invoice.payment_failed, charge.failed, subscription.deleted, subscription.updated)

### Dashboard & History
- "Mis Análisis" (not "Dashboard" — forbidden word)
- Stat cards: analyses used, plan, score average
- Analyses list with expandable detail view
- Welcome banner after Pro checkout (with bonus info, dismissible)
- Upgrade modal, Contact modal
- Payment history table (desktop table, mobile cards)
- History page with filters, analysis detail modal, PDF download

### Dark/Light Mode
- System-aware with manual override (system/light/dark)
- CSS variables with `--mr-` prefix (25 variables, 5-layer bg system)
- Blocking `<script>` in `<head>` prevents flash
- Settings page has 3-way theme selector (Sistema/Claro/Oscuro)
- ThemeToggle component (Sun/Moon) in header of all pages

### CTAs & Conversion
- Contextual CTAs (mastering help + mix help contact modals with WhatsApp/Email/Instagram)
- Score-based CTA sublines (7 tiers, encourages contact with context-appropriate messaging)
- Feedback widget (thumbs up/down + optional detailed form)
- CTA click tracking (mastering/mix_help → contact_requests table)
- Anonymous analysis tracking (sessionStorage-based funnel, links to user on signup)
- UTM attribution capture (5 params: source, medium, campaign, content, term)
- Device type tracking (mobile/tablet/desktop from user agent)

### Admin Dashboard (6 tabs)
- **Overview**: 6 KPI cards, score + verdict distribution charts, anonymous funnel with device breakdown, recent anonymous analyses table
- **Users**: Searchable user list, expandable per-user analysis detail, subscription info
- **Analytics**: Analyses per day (30d), format breakdown, top countries, conversion metrics (satisfaction, CTA clicks, contacts), Technical Insights (spectral profiles, categorical flags, energy patterns)
- **Revenue**: Revenue breakdown (subscriptions/single/addon), recent payments table
- **Leads**: Contact requests with user/analysis context, 4 KPI cards, method + date filters
- **Feedback**: User feedback with status filters, admin response system, priority flagging

### Security
- 6-layer quota defense (proactive useEffect → cached quick check → RPC call → post-analysis re-check → QuotaGuard on login → AuthProvider signals)
- Fail-closed security patterns (all catch blocks deny access on error)
- IP rate limiting for anonymous users (active by default)
- Stripe webhook signature verification
- Supabase Row-Level Security (RLS) on all 13 tables
- Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- No audio file storage (only derived metrics)

---

## 6. PRICING STRUCTURE

### Free Plan (Gratis)
- **2 full analyses** to get started (includes Rápido + Resumen + Completo + PDF)
- Anonymous users get 1 Rápido trial before signup prompt
- NEVER say "de por vida"/"lifetime" — always "para empezar"/"to get started"

### Single Analysis (Análisis individual)
- **$5.99 USD** one-off (regional pricing applies)
- 1 full analysis (includes Completo + PDF)

### Pro Monthly (MasteringReady Pro)
- **$9.99/mo USD** base price (regional pricing applies)
- **30 analyses per month** (NEVER say "ilimitados"/"unlimited")
- Includes Completo + PDF
- Welcome bonus: restores up to 2 used free analyses as first-month addon

### Pro Add-on Pack (Pack adicional)
- **$3.99 USD** (regional pricing applies)
- 10 extra analyses (Pro users only, max 2 packs per billing cycle)

### Regional Pricing (with local currency display)

**Tier 1 (local currency via Stripe):**
- US: $9.99 USD
- EU (20 countries): €10 EUR
- UK: £10 GBP
- Canada: $13.99 CAD
- Australia: $14.99 AUD

**Tier 2-6 (USD with PPP multiplier, displayed in local currency):**
- Chile, Uruguay: $7.49 (0.75x)
- Mexico: $6.99 (0.70x)
- Brazil: $5.99 (0.60x)
- Colombia, Peru, Ecuador: $5.49 (0.55x)
- Argentina: $3.99 (0.40x)

**Pricing source of truth**: `lib/pricing-config.ts` for ALL price display AND checkout.

---

## 7. WHAT MAKES IT DIFFERENT

### 1. Privacy-First Architecture
- No audio storage — only derived metrics saved
- Files deleted immediately after analysis
- Clear messaging: "Tu audio se analiza y elimina. Nunca lo almacenamos."

### 2. Criterio Técnico Aplicado (Not Automation)
- Sells: **technical judgment** (human-guided analysis methodology)
- Does NOT sell: loudness presets, magic buttons, automatic mastering
- Tone: technical but human, sounds like an engineer not an app
- **Connects to human engineer** — WhatsApp/Email/Instagram CTAs with analysis context

### 3. Bilingual by Design
- Every string exists in ES LATAM Neutro + US English
- Browser detection → persist preference → never change on logout
- ES LATAM Neutro: No regionalismos, no Spain Spanish

### 4. Regional Pricing with Local Currency
- 18 LATAM countries with PPP-adjusted pricing
- Local currency display (e.g., "20.100 COP/mes" for Colombia)
- Tier 1 countries: native currency via Stripe (EUR, GBP, CAD, AUD)

### 5. Transparent Pre-Master Analysis (Not Black Box)
- Clear score methodology (6 weighted metrics + 2 informational)
- Strict/normal mode toggle
- Interpretive texts explain what each metric means

---

## 8. USER FUNNEL

### Anonymous Trial (No Signup Required)
1. User lands on masteringready.com
2. Uploads file → gets Rápido report immediately (no signup)
3. Blur overlay on Resumen/Completo tabs: "Ver mi análisis" CTA
4. Tracked in anonymous_analyses table

### Signup Conversion
1. User clicks CTA → AuthModal (Google OAuth or Email+Password)
2. On signup: pending analysis saved to DB, unlocks full report
3. User gets 2 full analyses to get started (Completo + PDF included)
4. UTM params captured from URL → saved to profile on signup
5. Anonymous analyses linked to user ID (conversion tracking)

### Paywall Experience
1. After 2 analyses: FreeLimitModal appears
2. Two upgrade paths: Single ($5.99 one-off) or Pro ($9.99/mo for 30)
3. Stripe Checkout (regional pricing, local currency display)
4. Webhook updates subscription → dashboard shows Pro welcome banner with bonus

---

## 9. CTA SYSTEM (Score-Based Sublines)

| Score | ES Button | ES Subline |
|-------|-----------|------------|
| 95-100 | Masterizar este track | Escríbenos y coordinamos |
| 85-94 | Masterizar este track | Escríbenos y coordinamos |
| 75-84 | Preparar mi mezcla | Te orientamos antes del mastering |
| 60-74 | Revisar mi mezcla | Te ayudamos a identificar los ajustes |
| 40-59 | Trabajar mi mezcla | Escríbenos y revisamos juntos |
| 20-39 | Trabajar mi mezcla | Escríbenos y revisamos juntos |
| 0-19 | Revisar mi proyecto | Escríbenos, te ayudamos a armar un plan |

Contact messages differentiate 3 actions: mastering, preparation, review — with filename + score + verdict context pre-filled in WhatsApp/email.

---

## 10. BRAND VOICE & POSITIONING

### Brand Name Rules
- **"Mastering Ready"** (WITH space) in ALL user-facing text
- **"MasteringReady"** (no space) ONLY for URLs, domains, code identifiers

### Tone
- Technical but human
- Sounds like an audio engineer, not an app
- Calm, precise, no hype
- Example: "No reemplazamos al ingeniero de mastering. Te ayudamos a llegar preparado."
- Bridge statement: "Lo importante no es la métrica. Es saber qué hacer con ella."

### Forbidden Words
- "Automático", "Dashboard", "Bloqueado", "Fallido/Malo/Error", "Compra ahora/Contrata ya"
- "de por vida"/"lifetime", "ilimitados"/"unlimited"

---

## 11. TECH STACK

- **Frontend**: Next.js 15 (React 18), TypeScript, Vercel
- **Backend**: Python 3.12, FastAPI, librosa/soundfile/numpy/scipy, Render Starter (512MB)
- **Database**: Supabase (PostgreSQL + Auth + RLS), 13 tables
- **Payments**: Stripe (Checkout + Customer Portal + Webhooks, 6 events)
- **Domain**: masteringready.com (Namecheap DNS → Vercel)
- **Analysis benchmark**: 68-73s for 6.5min WAV (14 chunks at 30s each)

---

## 12. UPCOMING FEATURES

### Short-term
1. eBook migration from Payhip ($15 USD flat, Stripe product + protected PDF download)
2. Persona Mode (Músico/Productor/Ingeniero) — maps to display mode + scoring strictness
3. Shared secret Vercel ↔ Render (X-API-Secret header)
4. Google Search Console + SEO
5. Facebook OAuth (pending Meta App Review)

### Medium-term
1. Priority Queue System (paid users first, spec ready)
2. DLocal for LATAM local payment methods (Pix, OXXO, Mercado Pago)
3. Smart Leveler (per-section gain adjustment using energy data)
4. Transactional emails (welcome, receipt, renewal)

### Upcoming Products
1. **Stream Ready** — Audio analysis for video creators (YouTubers, TikTokers, podcasters). Separate codebase, shared backend. Phase 1 MVP built, not deployed. Target: July 2026.
2. Client-Friendly Report mode (traffic light system)
3. Before/After comparison mode
4. Mix vs Reference mode

---

*This rundown is current as of February 15, 2026.*

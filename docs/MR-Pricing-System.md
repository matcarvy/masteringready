# Mastering Ready — Pricing System

**Source of truth**: `lib/pricing-config.ts`
**Last updated**: February 15, 2026

---

## 1. PLANS

### Free (Gratis)
- **2 full analyses** to get started (includes Rapido + Resumen + Completo + PDF)
- Anonymous users get 1 Rapido trial before signup prompt (IP-limited)
- NEVER say "de por vida"/"lifetime" — always "para empezar"/"to get started"

### Single Analysis (Analisis individual)
- **$5.99 USD** base price (one-time)
- 1 full analysis (Completo + PDF)

### Pro Monthly (MasteringReady Pro)
- **$9.99/month USD** base price (recurring)
- **30 analyses per month** (NEVER say "ilimitados"/"unlimited")
- Includes Completo + PDF
- Welcome bonus: restores up to 2 used free analyses as first-month addon

### Pro Add-on Pack (Pack adicional)
- **$3.99 USD** base price (one-time)
- 10 extra analyses
- Pro users only, max 2 packs per billing cycle

---

## 2. REGIONAL PRICING TIERS

All Tier 2-6 prices are charged in USD via Stripe but displayed in local currency for the user.

### Tier 1 — Local Currency (charged in local currency via Stripe)

| Country | Currency | Pro Monthly | Single | Add-on |
|---------|----------|-------------|--------|--------|
| United States | USD | $9.99 | $5.99 | $3.99 |
| Eurozone (20 countries) | EUR | €10.00 | €6.00 | €4.00 |
| United Kingdom | GBP | £10.00 | £6.00 | £4.00 |
| Canada | CAD | $13.99 CAD | $7.99 CAD | $4.99 CAD |
| Australia | AUD | $14.99 AUD | $8.99 AUD | $5.99 AUD |

**Eurozone countries**: DE, FR, ES, IT, NL, BE, AT, PT, IE, FI, GR, SK, SI, LT, LV, EE, LU, MT, CY, HR

### Tier 2 — 0.75x (Chile, Uruguay)

| Product | USD charged | Example local display |
|---------|------------|----------------------|
| Pro Monthly | $7.49 | 7.160 CLP/mes |
| Single | $4.49 | 4.290 CLP |
| Add-on | $2.99 | 2.860 CLP |

### Tier 3 — 0.70x (Mexico)

| Product | USD charged | Example local display |
|---------|------------|----------------------|
| Pro Monthly | $6.99 | 120.35 MXN/mes |
| Single | $4.19 | 72.13 MXN |
| Add-on | $2.79 | 48.02 MXN |

### Tier 4 — 0.60x (Brazil)

| Product | USD charged | Example local display |
|---------|------------|----------------------|
| Pro Monthly | $5.99 | 34,74 BRL/mes |
| Single | $3.59 | 20,82 BRL |
| Add-on | $2.39 | 13,86 BRL |

### Tier 5 — 0.55x (Colombia, Peru, Ecuador)

| Product | USD charged | Example local display (CO) |
|---------|------------|---------------------------|
| Pro Monthly | $5.49 | 20.100 COP/mes |
| Single | $3.29 | 12.000 COP |
| Add-on | $2.19 | 8.000 COP |

Ecuador and Panama use USD natively — no conversion needed.

### Tier 6 — 0.40x (Argentina)

| Product | USD charged | Example local display |
|---------|------------|----------------------|
| Pro Monthly | $3.99 | 4.285 ARS/mes |
| Single | $2.39 | 2.567 ARS |
| Add-on | $1.59 | 1.708 ARS |

### All other countries — Default (USD, full price)

Same as US: $9.99 / $5.99 / $3.99.

---

## 3. HOW IT WORKS (Technical Flow)

### Country Detection
1. **Vercel edge header** (`X-Vercel-IP-Country`) — primary, instant, works on all devices
2. **ipinfo.io** — fallback for local development
3. **US default** — if both fail

Result cached in `localStorage` (`mr_geo_country`) for 24 hours.

### Price Display
- `getAllPricesForCountry(countryCode)` in `lib/pricing-config.ts` is the single source of truth
- Tier 1: returns exact local currency price (what Stripe charges)
- Tier 2-6: converts USD cents to local currency using `EXCHANGE_RATES` from `lib/geoip.ts`
- Local currency display uses `Intl.NumberFormat` with locale-appropriate formatting (e.g., `20.100 COP`, `34,74 BRL`)

### Checkout Flow
1. Frontend calls `POST /api/checkout` with `{ productType, countryCode }`
2. Server validates country via `X-Vercel-IP-Country` header (prevents client-side manipulation)
3. `getProductPrice(countryCode, productType)` returns `{ currency, amount }` in cents
4. Stripe price created dynamically at checkout time (no pre-created Stripe Products)
5. Stripe Checkout session opened in correct currency
6. Webhook processes payment events

### Stripe Webhook Events (6)
1. `checkout.session.completed` — new subscription or one-time purchase
2. `invoice.paid` — recurring subscription payment succeeded
3. `invoice.payment_failed` — recurring payment failed
4. `charge.failed` — one-time payment failed
5. `customer.subscription.deleted` — subscription cancelled
6. `customer.subscription.updated` — subscription changed (e.g., reactivated)

### Payment Deduplication
- `insertPaymentIfNew()` checks both `stripe_payment_intent_id` and `stripe_invoice_id`
- Prevents duplicate records from webhook replays or concurrent events

---

## 4. EXCHANGE RATES

Static rates updated monthly. Used for display only — actual charge is always in the currency defined by the tier.

**Last updated**: February 10, 2026

| Currency | Code | Rate (1 USD =) |
|----------|------|----------------|
| Canadian Dollar | CAD | 1.436 |
| Mexican Peso | MXN | 17.22 |
| Euro | EUR | 0.841 |
| British Pound | GBP | 0.732 |
| Colombian Peso | COP | 3,660 |
| Brazilian Real | BRL | 5.80 |
| Argentine Peso | ARS | 1,074 |
| Chilean Peso | CLP | 955 |
| Peruvian Sol | PEN | 3.66 |
| Uruguayan Peso | UYU | 43.34 |
| Australian Dollar | AUD | 1.594 |
| Guatemalan Quetzal | GTQ | 7.67 |
| Costa Rican Colon | CRC | 505 |
| Honduran Lempira | HNL | 25.47 |
| Nicaraguan Cordoba | NIO | 36.63 |
| Dominican Peso | DOP | 62.66 |
| Bolivian Boliviano | BOB | 6.92 |
| Venezuelan Bolivar | VES | 78 |

---

## 5. QUOTA SYSTEM

### Free Users
- 2 full analyses lifetime (tracked by `profiles.analyses_lifetime_used`)
- IP rate limit: 1 anonymous analysis per IP before requiring signup
- Supabase RPC `can_user_analyze()` enforces limit server-side

### Pro Users
- 30 analyses per billing cycle (tracked by `subscriptions.analyses_used_this_cycle`)
- Resets on each billing renewal (`invoice.paid` webhook)
- Up to 2 add-on packs per cycle (10 analyses each, tracked by `addon_analyses_remaining`)

### Admin
- Unlimited analyses (`can_user_analyze` RPC has admin bypass)
- `is_test_analysis = true` flag excludes admin analyses from stats

### 6-Layer Quota Defense
1. **Proactive useEffect** on page load — checks quota, shows FreeLimitModal if exhausted
2. **Cached quick check** — `userAnalysisStatus` or module-level `_quotaCache` blocks re-clicks
3. **RPC call** — server-side `checkCanAnalyze()` with ANONYMOUS session guard
4. **Post-analysis re-check** — blocks display + save if quota drifted (only for login-during-analysis)
5. **QuotaGuard on login** — clears anonymous results immediately, checks quota before displaying
6. **AuthProvider signals** — `pendingAnalysisSaved` / `pendingAnalysisQuotaExceeded`

---

## 6. KEY FILES

| File | Purpose |
|------|---------|
| `lib/pricing-config.ts` | All pricing by country, formatting, source of truth |
| `lib/geoip.ts` | Country detection, exchange rates, local currency conversion |
| `app/api/checkout/route.ts` | Stripe Checkout session creation |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler (6 events) |
| `app/api/customer-portal/route.ts` | Stripe Customer Portal session |
| `app/api/cancel-subscription/route.ts` | Direct subscription cancellation |
| `app/api/geo/route.ts` | Vercel edge country detection endpoint |
| `lib/stripe.ts` | Stripe client + customer management |

---

## 7. IMPORTANT RULES

1. **`pricing-config.ts` is the ONLY source of truth** for price display AND checkout. Never use `geoip.ts` exchange rate conversion for display — it can disagree with Stripe charges.
2. **Server-side country validation** — `X-Vercel-IP-Country` header overrides client-sent country code to prevent pricing manipulation.
3. **Prices created dynamically** — No pre-created Stripe Products/Prices. Each checkout creates a new Stripe Price with correct currency and amount.
4. **No "unlimited"** — Pro plan is always "30 analyses per month", never "ilimitados"/"unlimited".
5. **No "lifetime"** — Free plan is "to get started"/"para empezar", never "de por vida"/"lifetime".
6. **Exchange rates are display-only** — Tier 2-6 are always charged in USD. Local currency display is approximate.
7. **Promotion codes enabled** — `allow_promotion_codes: true` on all Stripe Checkout sessions.

---

*Current as of February 15, 2026.*

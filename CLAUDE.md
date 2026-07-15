# CLAUDE.md: MasteringReady

Full session history: CLAUDE-archive.md in this directory. Load it only when asked about past sessions or past decisions.

## Overview

- **Product**: Professional audio analysis platform for musicians and producers to evaluate mixes before mastering. Privacy first: audio is never stored, only derived metrics.
- **Status**: LAUNCHED Feb 11, 2026. Live at masteringready.com. Distribution and validation phase; product is stable, work now serves getting clients.
- **Codebase**: /Users/matcarvy/masteringready
- **Spec (source of truth)**: ~/Downloads/mastering-ready-launch-spec-FINAL.xml
- **What it sells**: criterio técnico aplicado (technical judgment). It does NOT sell loudness, presets, magic, or automatic results. Tone: technical but human, sounds like an engineer, not an app.
- **Mastering service is real**: Mat masters songs as a paid service. The results-screen "Masterizar" CTA is a genuine lead path (ContactModal, WhatsApp/Email/IG). Contextual $80 mastering CTA only appears at score >= 85. Services section prices: Mix Review + Master $249 launch ($349 standard), Full Mix + Master $697 ($997), Workshop $97, Audit $97, Intensive $399. `SERVICES_CONFIG` URLs start empty; empty URL = ContactModal.
- **Founder credibility copy is LOCKED**: Cumbiana (Carlos Vives) credit as one of the credited engineers, 300+ productions over 12 years, mastering engineer by trade but never conflate the Cumbiana credit with the mastering role. Canonical verification link: AllMusic credits page. Single source of truth: memory `mat-credentials-cumbiana.md`.

## Stack & Architecture

- **Frontend**: Next.js 15 (App Router), deployed on Vercel. Prod domain masteringready.com serves directly (www 301s to non-www). Dev previews: masteringready-git-dev-*.vercel.app.
- **Auth + DB**: Supabase (project `cetgbmrylzgaqnrlfamt`, "masteringready-prod"). Google OAuth (published) + Email/Password. Facebook OAuth fully configured but button hidden pending Meta App Review (re-enable: remove filter in `SocialLoginButtons.tsx`). No Apple login.
- **Payments**: Stripe, live keys. Prices created dynamically at checkout (no pre-created Products). Webhook `https://masteringready.com/api/webhooks/stripe`, 6 events: checkout.session.completed, invoice.paid, invoice.payment_failed, charge.failed, customer.subscription.deleted, customer.subscription.updated. Payment dedup on payment_intent_id AND invoice_id; purchase dedup on checkout_session_id.
- **Analyzer backend**: FastAPI + analyzer.py (v7.5.0, LOCKED again) on Render Starter (512MB). Prod: https://masteringready.onrender.com (health at `/health`, not `/api/health`). Dev: https://masteringready-dev.onrender.com. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT` (never add `--limit-max-requests` on bare uvicorn; it manufactures instance failures).
- **Branch strategy**: work on `dev`, merge to `main` when ready. Push to `main` auto-deploys Vercel (frontend) and Render (backend).

### Pricing plans
- **Free**: 2 full analyses (Completo + PDF) for registered users; anonymous gets 1 Rápido trial, then IP block funnels to signup (`MAX_FREE_ANALYSES_PER_IP = 1`).
- **Single**: $5.99 one-off (grants a `purchases` row credit; consumed via `consume_purchase_credit` after free allowance is spent).
- **Pro Monthly**: $9.99/mo, 30 análisis al mes (NEVER say "ilimitados/unlimited").
- **Add-on Pack**: $3.99, 10 extra analyses, Pro only, max 2 packs/cycle.
- **Regional pricing**: `lib/pricing-config.ts` is the single source of truth for displayed AND charged prices. Tier 1 local currency (US $9.99, EU €10, UK £10, CA $13.99, AU $14.99). Tiers 2-6 PPP USD (CL/UY $7.49, MX $6.99, BR $5.99, CO/PE/EC $5.49, AR $3.99), displayed in local currency for LATAM. GeoIP: Vercel `X-Vercel-IP-Country` header primary, ipinfo.io fallback; checkout re-verifies country server side.

### Quota and credit system (server authoritative)
- Supabase RPCs: `can_user_analyze` (admin bypass; free limit 2; purchase-credit fallback returns reason `USING_PURCHASE`), `increment_analysis_count`, `consume_purchase_credit` (FIFO over purchases), `consume_analysis_credit(p_user_id, p_nonce)` (service-role only, nonce ledger `analysis_credit_ledger`, idempotent, failed analysis never burns a credit), `check_ip_limit`.
- Signed token gate: every analysis fetches a 10-minute HMAC token from `/api/analyze-token` (verifies session + quota server side). Render validates when `ANALYZE_TOKEN_SECRET` is set (it is, prod). Client `fetchAnalyzeToken`: 403 → FreeLimitModal, transient → 3 retries then retryable error, never proceeds tokenless.
- 6-layer frontend quota defense plus module-level `_quotaCache` (survives React state resets). All catch blocks deny on failure (fail closed).
- Admin (`matcarvy@gmail.com`): `is_admin = true`, unlimited analyses, analyses flagged `is_test_analysis` and excluded from all stats queries.

### Key architectural patterns (do not regress)
- **Fresh client pattern**: all authenticated data fetches use `createFreshQueryClient(sessionTokens)`; singleton only for fire-and-forget analytics. Session tokens always from `useAuth()` context, never `supabase.auth.getSession()` on the singleton.
- **Navigator Lock**: both Supabase clients use a no-op `lock` function; fresh client uses separate `storageKey: 'sb-fresh-query-token'`. Never remove.
- **Auth init is 3-phase**: sync JWT decode from storage first (no network, cannot abort on force reload), async `getSession()` upgrade second, guarded `onAuthStateChange` third.
- **Progress bar**: direct DOM manipulation (`#mr-progress-fill` / `#mr-progress-text` via ref + interval); React 18 batching prevents paint during async handlers.
- **Chunked analysis is universal**: every file goes through the 30s-chunk path (bounded ~10MB peak per chunk). LUFS measured globally via `ffmpeg_integrated_lufs()` (EBU R128), not per-chunk averages. Uploads stream to disk in bounded chunks.
- **Render memory**: `MALLOC_ARENA_MAX=2` env var on Render dashboard (off-repo; re-verify if OOM recurs). `gc.collect()` + `malloc_trim(0)` in analyzer.
- **PDF downloads**: all 3 pages use `analysis_data` mode (full data inline), never `request_id` (Render in-memory jobs expire).
- **IP limiter**: persistent Supabase store via `SupabaseRpcClient` (aiohttp adapter); needs `SUPABASE_URL` + anon or service key on Render, else memory fallback. `ENABLE_IP_RATE_LIMIT` defaults true. `TRUSTED_PROXY_HOPS` opt-in for XFF handling.
- **React Query** on dashboard/history (`lib/query-client.ts`, `lib/queries/`); the analyzer page keeps its imperative flow deliberately.
- **Emoji regexes**: always the `u` flag on any regex containing emoji (surrogate pair bug).
- **Modal dismiss**: informational modals close on backdrop click; destructive modals (cancel subscription, delete account) require explicit button.
- **Shared utils live in `lib/`**: scoreColor, formatDate, cleanReportText, filename, email, cta, nbsp, scoreCard, verifyAdmin, shared `<Spinner/>`. Never re-duplicate per page.

### Design system
- All theme colors via `--mr-*` CSS variables in `app/globals.css` (25 vars per theme); dark/light via `data-theme` on `<html>`, `lib/theme.ts` hook, blocking script prevents flash. Landing redesign uses `.mr-rd-*` class system (dark-first, waveform brand mark, accent tokens `--mr-accent-bright` #818cf8 / `--mr-accent-deep` #4f46e5).
- Brand gradient `#667eea → #764ba2` restricted to brand mark and primary CTA. CTA on gradient: hardcoded `#ffffff` bg / `#6366f1` text (must pop in both themes). Score colors: >= 85 green, 60-84 amber, < 60 red.
- Intentionally hardcoded (do not migrate to vars): brand/decorative gradients, data-visualization colors, white text on gradient surfaces, platform brand colors (WhatsApp `#25d366`, Instagram `#e1306c`).
- No lock icons/emojis anywhere (use Lucide Shield). No emoji in headings. No markdown in report text. Touch targets 44px minimum.

### Key files
| File | Purpose |
|------|---------|
| `app/page.tsx` | Main analyzer + landing (~6300 lines, god component, split deferred) |
| `app/dashboard/page.tsx`, `app/history/page.tsx` | Mis Análisis + history |
| `app/admin/page.tsx` | Admin dashboard (6 tabs) |
| `app/admin/comparison`, `app/admin/mastering-lab`, `app/admin/content`, `app/prospecting` | Admin tools (frequency A/B + reference, 4-file mastering cross-exam, Hormozi content generator, lead prospector UI) |
| `app/api/checkout`, `app/api/customer-portal`, `app/api/cancel-subscription`, `app/api/webhooks/stripe` | Stripe routes (auth via Bearer token header, not SSR cookies) |
| `app/api/analyze-token/route.ts` | HMAC token issuance + server quota gate |
| `app/api/health`, `app/api/log-event`, `app/api/geo` | Keep-alive, client event logging (throttled), GeoIP |
| `lib/pricing-config.ts`, `lib/geoip.ts` | Pricing source of truth, country detection + exchange rates |
| `lib/api.ts`, `lib/error-messages.ts` | Analyzer API client + bilingual error classifier (7 categories) |
| `lib/supabase.ts`, `components/auth/AuthProvider.tsx` | Clients (no-op lock), auth context |
| `main.py`, `analyzer.py` (~8200 lines, LOCKED), `interpretative_texts.py`, `ip_limiter.py` | FastAPI backend on Render |
| `app/learn/*` (5 pages) | Bilingual SEO authority pages |
| `scripts/prospector/` + `.github/workflows/prospector.yml` | Lead scraper (YouTube + HN + Stack Exchange, cron 6h) |
| `supabase/migrations/` | Applied MANUALLY in Supabase SQL editor, never auto-pushed |

### Env vars (names only, never values)
- **Vercel**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_API_URL (per environment: Preview → dev Render, Production → prod Render), ANALYZE_TOKEN_SECRET, PROSPECTING_SECRET, STATS_SECRET (inert until set), ANTHROPIC_API_KEY (needed for /admin/content, pending).
- **Render**: ANALYZE_TOKEN_SECRET (same value as Vercel; when rotating set Vercel FIRST, then Render, never the reverse), SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, MALLOC_ARENA_MAX=2, ENABLE_IP_RATE_LIMIT (default true).
- **GitHub Secrets**: YouTube API key (prospector), SUPABASE_ANON_KEY (keep-alive workflow).
- **Stripe coupons**: names and IDs live in memory `mr-stripe-coupons.md` (FOUNDING50 private). Founding member DM plan references a FOUNDING10 coupon (50% off Pro, 10 redemptions); confirm against the memory file before using.

### Keep-alives and monitoring
- Render: cron-job.org GET `/health` every 10 min (prevents cold starts). Supabase: GitHub Actions `.github/workflows/supabase-keepalive.yml` every 5 days (hits `/rest/v1/profiles?select=id&limit=1`; root `/rest/v1/` is deprecated).
- Analysis benchmark: 68-73s warm (Paraíso Fractal 6.5min WAV). Over 80s sustained → clean Render rebuild. First run after any deploy is ~40s slower (numba/librosa JIT cold start, expected).
- Watch in admin: anonymous funnel conversion, free → paid conversion, country/device breakdown, prospector leads contacted vs converted.

## Commands

- **Dev**: `npm run dev` (frontend, localhost:3000)
- **Build check (required before any push)**: `npx next build` and `npx tsc --noEmit`, both must be clean
- **Python syntax check**: `python3 -m py_compile main.py analyzer.py interpretative_texts.py ip_limiter.py`
- **Migrations**: paste into Supabase Dashboard → SQL Editor and run manually (CLI installed but not linked)
- **Deploy**: merge `dev` → `main`, one push per work unit; Vercel + Render auto-deploy
- **Stripe test card**: 4242 4242 4242 4242 (account is in Live mode; use real card for prod verification)

## Hard Rules

1. **DO NOT MODIFY THE ANALYZER.** Audio analysis algorithms, metrics, scoring, and processing are FINALIZED (v7.5.0). Copy/text inside analyzer files may change; math may not. The lock was broken once, deliberately, for master mode (7.4.2 → 7.5.0, 2026-07-13, explicit go). It is closed again: any further scoring change needs the same explicit go and a version bump.
   - **Three profiles, not a matrix**: `mix`, `mix_strict`, `master`. `strict` does not compose with `master`. A file is scored against exactly one, chosen by `detect_mastered_file` unless the user ticks the master checkbox (which always wins).
   - **Scores are not comparable across profiles or versions.** Never average or compare a master score against a mix score, or a 7.4.x score against a 7.5.x score, in any admin or analytics query. The `analyses.profile` column exists to keep them apart; NULL means pre-7.5.0.
   - **`hard_fail` is a kill switch, not a penalty**: it bypasses the weighted score and returns a flat 5. True Peak >= +3.0 dBTP is the ONLY thing that triggers it. Sample clipping deliberately does not, in any profile: a sample at full scale is what most finished masters do on purpose. Clipping is scored through Headroom going critical.
   - **Anything that maps a score to a label must take the profile**: the verdict, the CTA, the PDF, the score card, and the metric bars. There were five hand-copied verdict tables; they are now one function (`verdict_for_score`) plus its TS mirror in `lib/scoreColor.ts`. Do not add a sixth.
2. **ES LATAM Neutro + US English.** Every user-facing string exists in both languages, with proper Spanish accents (análisis, suscripción, sesión...). No regionalisms, no Spain Spanish. Language only changes when the user explicitly changes it (cookie persisted, survives auth flows).
3. **No dashes as punctuation** in any copy, ES or EN. Use commas, periods, semicolons, parentheses. Hyphens in compounds and numeric ranges are fine.
4. **Voice guide** (memory `mr-voice-guide.md`): no imperatives in report copy ("Conviene reducir", never "Reduce"), no alarmism ("muy" not "demasiado"), observation not commands, no first person in reports, no praise inflation. Terminology lexicon (memory `mr-terminology-es.md`): Tier 1 stays English (plugin, LUFS, True Peak, dBFS, dBTP, PLR, M/S, EQ, mono, Crest Factor); Tier 2 anchored once then Spanish (headroom → "margen", clipping → "saturación digital"); Tier 3 fully localized (bus principal, umbral, techo, ensanchamiento estéreo, estructura de ganancia, exportación).
5. **Forbidden words**: "Automático", "Dashboard" (use "Mis Análisis"), "Bloqueado", "Fallido/Malo/Error" in status copy, "Compra ahora/Contrata ya", "ilimitados/unlimited", "de por vida"/"lifetime" (use "para empezar" or "fijo").
6. **Brand name**: "Mastering Ready" (with space) in ALL user-facing text. "MasteringReady" (no space) ONLY for URLs, domains, code identifiers, email addresses.
7. **Git**: never commit or push without Mat's request. One bundled commit/push per work unit. Build must pass clean (next build + tsc + py_compile where touched) before pushing. Preview deploys off. Work on `dev`, merge to `main` on go.
8. **Migrations are manual and hard to reverse**: never apply a prod Supabase migration without Mat's go. Always smoke-test quota/credit RPCs as a NON-admin user (the admin bypass masks outages; this hid a 3-day outage once). **The migration files are NOT a mirror of production**: live function signatures have drifted from the repo (see Current State). Before replacing a live function, verify its real signature against the DB and cast every returned column explicitly; a signature mismatch compiles fine and throws `42804` on every call.
9. **LUFS is informational** (weight 0). Never present it as scored. The 5 scored metrics: Headroom, True Peak, PLR, Stereo Correlation, Frequency Balance.
10. **No stretching proof points**: honesty rules on credentials (see Overview). Testimonials verbatim, never invented or tightened.
11. **Privacy**: never store audio, only derived analysis data. Uploaded reference tracks (future feature) are analyzed only, never stored.
12. **Verify visually with screenshots** for UI claims; build-pass does not equal app-runs (headless smoke test the built app for risky changes).

## Current State & Next Steps

**Git state (2026-07-14)**: `main` and `dev` both on `caceba6` (analyzer v7.6.0, master mode profile sweep), pushed and deployed and verified live. Build clean (next build + tsc + py_compile). Untracked `content/` + 3 `content_queue` migrations belong to the content-creator feature; keep them out of unrelated commits. `CLAUDE-archive.md` is untracked and holds the pre-2026-07-13 session log; the same content is permanently in git at `624343d:CLAUDE.md`, so nothing depends on that file being committed. The two `docs/MR-*-Plan.md` files are now tracked.

### The money path is proven (2026-07-13)

The Single purchase was tested end to end on production with a real card (CO pricing, $3.29 USD, refunded after). Every hop verified against the database, not the screen:
- Paywall fires at the free limit; checkout charges the correct **regional** price (server re-verifies country, `purchases.amount` came back 3.29 not 5.99).
- Webhook grants the credit: one `payments` row, one `purchases` row with `analyses_granted 1 / analyses_used 0`.
- Analysis consumes exactly one credit: `analyses_used` 0→1, ledger row `source: purchase` (server-authoritative path fired, no double burn).
- Next analysis is denied. A purchase does not become an unlimited pass.

**Do not re-run this test casually.** It costs a real charge plus the Stripe fee (refunds do not return the fee). The path is proven; only re-test if the webhook, checkout route, or credit RPCs change.

### Two structural facts learned the hard way (read before touching the DB)

1. **The migration files do not match production.** `get_user_analysis_status` was recreated from `20260125000001_pricing_restructure.sql`, but the live function had a different signature (`plans.name` is `varchar(50)`, the file declared `TEXT`). The recreate succeeded and then threw `42804` on every call, briefly breaking the dashboard for all users. Something has been changed directly in the SQL editor without a migration recording it. **Before replacing any live function, verify its real signature against the database, not the repo.** Cast defensively (`::TEXT`, `::INTEGER`) on every returned column.
2. **Purchases were a second class citizen in the data model.** `can_user_analyze` (the gate) knew about the `purchases` table; nothing else did. The display RPC, the refund handling, and the paywall copy all still assume free-or-Pro. Assume any new quota-adjacent code has the same blind spot until proven otherwise.

**Recently shipped and verified live**:
- **Paywall CTAs open Stripe in one click** (`9c5b898`). Both FreeLimitModal buttons were `<a href="/dashboard?upgrade=pro|single">` and **nothing ever read the `upgrade` param**: they dead-ended on the dashboard, so buying at the moment of intent took three clicks and Single was reachable only behind a button labelled "Actualizar a Pro". Checkout call extracted to `lib/checkout.ts`, reused by the dashboard (which also dropped a `supabase.auth.getSession()` singleton read).
- **Purchased credits are visible** (`624343d`). Migration `20260713000001_status_includes_purchases.sql` extends `get_user_analysis_status` with `purchased_remaining` and folds it into `can_analyze`; dashboard + subscription page show "+N análisis comprado disponible" and no longer show the limit-reached paywall to someone who has paid. `can_user_analyze` deliberately untouched (`consume_analysis_credit` branches on its exact `USING_PURCHASE` string). Added the `auth.uid()` IDOR guard the July hardening pass used; the function was `SECURITY DEFINER` with an unguarded `p_user_id`.
- **Stripe checkout is localized**: product name + Stripe UI `locale` follow `lang` (a Spanish buyer was reading "Single Analysis"). COP display rate corrected to 3376 (Stripe's actual presentment rate 2026-07-13; it was 3682).
- Server-authoritative credit consume (`consume_analysis_credit`, nonce ledger, 19/19 DB tests green) plus `can_user_analyze` ambiguity hotfix (Postgres 42702 had blocked ALL non-admin analyses Jun 30 to Jul 3).
- C1 (token gate hardening: 403 → FreeLimitModal, transient retries) + C2 (Single purchase grants usable credit via purchases fallback), commit `a130dda`.
- Security hardening bundle + Tier A optimizations (`41efe1d`): profiles priv-esc trigger, streaming uploads, IDOR guards on credit RPCs, stats gating, dep bumps, lazy html2canvas/recharts.
- Landing redesign ported to `.mr-rd-*` on the real app; utility extraction to `lib/`; full code-quality sweep (55 files).

### Master mode, second pass (v7.6.0, 2026-07-14): the bars and the prose now follow the profile

v7.5.0 made the SCORE profile-aware and stopped there. Everything that explains the score stayed mix-only, so a 95-scoring master showed a red 40% LUFS bar labelled "Compromised margin", and its PDF told it "your mix's headroom is insufficient for mastering. Verify peaks land around -6 dBFS". The score was right and every sentence around it was wrong.

**The score math is untouched.** `WEIGHTS`, `WEIGHTS_MASTER` and `ScoringThresholds` are byte-identical, the regression harness returns the same 83 to 98 / mean 92.1, and scores stay comparable across 7.x. What changed is the bars and the copy.

- **LUFS never goes red in master profile** (floor 65). Loudness damages nothing by itself in a finished master, and LUFS carries weight 0 in every profile, so a red bar on a zero-weight metric next to a 95 was the tool arguing with itself. What loudness COSTS is already measured twice, by PLR and True Peak. Master bands: -16 to -6 green, quieter than -16 or -6 to -5 blue, louder than -5 amber.
- **True Peak master ladder tightened above the ceiling**, not below it. At or under 0.0 dBTP stays green at every value (a master ceilinging at -0.1 is standard practice, and the detailed report already told the user so). 0.0 to +1.0 used to read as a blue "sufficient margin", which waved through the exact condition where a lossy encoder distorts; it is now amber. The -1.0 dBTP codec recommendation lives in the tooltip, where it informs without alarming.
- **Sample clipping folds into True Peak (master only), and can only push the bar down.** In the mix profiles clipping is already scored through Headroom going critical; folding it in twice would double-count. It keys on the NUMBER OF DISTINCT REGIONS, deliberately not on `severity` or `affected_percentage`: **those two fields mean opposite things on the two analysis paths.** The sync path measures clipped samples against total samples; the chunked path (the universal one in production) flags a whole 5-second window and measures its duration against the track, so ONE clipped sample in a six-minute track reports `localized` on one path and `widespread` on the other. Keying on severity would have demoted nearly every commercial master.
- **The "margin" frame is wrong for a master** and now switches with the profile. A finished master has no downstream stage to keep margin for. Legend goes Comfortable/Sufficient/Reduced/Compromised margin → On target/Correct/Worth reviewing/Priority review, on screen and in the PDF; the score footnote becomes "technical delivery of the master".
- **The prose layer follows the profile.** `interpretative_texts.py` had no concept of a master (it only took `strict`), so every sentence was written to a mix. Headroom, level and dynamics now have master generators; stereo and crest factor were made subject-neutral instead ("The stereo image is...", not "Your mix's stereo image is..."), because the judgment is identical in both worlds and a blind noun swap breaks Spanish gender agreement.
- **`write_report` ran a THIRD mastered-file heuristic** of its own, independent of both `detect_mastered_file` and the checkbox, and hedged across two branches ("if this is a mix... if this is a master..."). It now takes the profile: when the user ticked the box we know, so the "IF THIS FILE IS INTENDED TO BE A MIX" section does not print. **Its caller on the polling endpoint (`main.py`, the production path) had to be patched separately** and would have silently kept the old narrative.
- **The hot mix is now a lead, not a wrong answer.** `profile_source == "auto"` means WE guessed master from the file being loud; the user never said. That file is just as likely a hot mix headed to a mastering engineer, and it was being told "ready to release" and sold nothing. It now gets a two-door CTA (`action: "hot_mix"`, watch it in `cta_clicks`): if it is your final master you are good; if it is a mix you want mastered, it needs headroom, and here is the button. A user who TICKED the box is never pitched mastering.
- **The loud-master observation** fires only when the level demonstrably cost something (above -9 LUFS AND PLR under 9 or TP over the ceiling). Never for loudness alone: the footnote promises technical delivery, not artistic quality, and contradicting it to slip in a pitch would hollow out the score.

**The checkbox asks about DESTINATION, not loudness** ("This is a finished master, going straight to release"). The analyzer can already see that a file is loud; only the user knows where it is going. A loud mix headed to mastering MUST stay on the mix rubric, or it gets told it is ready to release when what it needs is headroom.

**The one failure mode with no code guard: a hot mix that ticks the box.** It will be told it is ready to release. Intent cannot be measured, so the guard is said out loud instead: the dual-score block now always prints, and a user-ticked master reads "It was scored as a master, so it is not asked to leave headroom. If it is actually a mix you plan to send to mastering, even a loud one, it is worth analyzing it again with the checkbox unchecked."

**Verified live on production, 2026-07-14**, all four combinations (EN/ES x ticked/auto): no red bars, correct legend, correct verdict, zero mix-language leaks in the PDFs, and both CTA branches render (ticked = "ready to release" with no button; auto = the two-door message with the mastering button). **375px is still unchecked.**

Three defects got through every automated gate and were caught only by looking at the live app. Worth remembering, because the same gates will pass next time too:
1. **The PDF never received the profile at all** (`e75cdfb`). The frontend's `analysis_data` payload omitted `profile`, so `main.py` fell back to `"mix"` on every download. Master mode had been shipping a profile-aware PDF verdict since 7.5.0 that **could never fire**: a ticked master and an auto-detected one produced byte-identical PDFs, both headed "Optimal margin for mastering". The regression harness and a locally-rendered PDF both passed, because both bypass the frontend payload.
2. **`generate_visual_report` turned any warning-status metric into an action item** (`8834908`), so a master verdicted "listo para publicar" was told to "revisar nivel general, ajustar niveles de ganancia". LUFS goes warning on any loud master and carries weight 0, so that was an instruction the score itself contradicted, printed under the verdict.
3. **The CTA lived only on the results screen** (`caceba6`). The best mastering lead the product makes could download a clean report that never mentioned the service exists. It now closes the PDF; the button only prints when the CTA has one.

**Only open item on v7.6.0: check the results card at 375px on a phone.** Master mode added a checkbox, the dual-score block, the guard line and the PDF-download CTA block to that card; none of it has been seen below desktop width. Everything else is verified live.

### Master mode LIVE IN PRODUCTION (v7.5.0, 2026-07-13)

Built per `docs/MR-Master-Mode-Plan.md`, shipped as `a2a0bde`. Backend `/health` confirmed serving 7.5.0. Every gate in the plan's section 1.6 passes: py_compile, `next build`, `tsc --noEmit`, the 18 commercial masters score 83 to 98 (mean 92.1) where they used to score 26 to 29, the 6 controls behave, the crushed master lands at 55, a real master driven through both analysis paths returns a master verdict and a master CTA, the PDF verdict matches the screen verdict in both profiles and both languages, and status agrees with the metric bar across all 12 path/file/profile combinations.

Migration `20260713000002_analyses_profile.sql` was **applied to production before the push** (column, CHECK constraint and partial index all verified in the live DB).

**The migration-before-deploy order is not optional, and the failure is silent.** The frontend puts `profile` in the insert payload, and PostgREST rejects an insert naming a column it does not know (`PGRST204`) **even when the value is null**, because it validates the key. That insert is fire-and-forget behind a bare `catch {}` in `app/page.tsx`, so shipping code ahead of the schema would have looked completely fine: the user still sees their analysis, the credit is still consumed server-side, and the row is simply never written, so it never appears in Mis Análisis. An additive migration is a no-op against the old code, so **always apply the migration first, then deploy. Never the reverse.**

**Still unverified (needs Mat, not code):** no real analysis has been run through production. The admin account's `can_user_analyze` bypass means a test on `matcarvy@gmail.com` proves nothing (that blind spot already masked a three-day outage once), so the real proof is a finished master uploaded by a non-admin user. Mobile at 375px is also unchecked: master mode added a checkbox and a dual-score block to the results card.

Four things the plan got wrong, found while building. They are fixed, but they are the reason the plan cannot be followed literally next time:
1. **The PLR tuning knob was specified backwards.** The plan said extend `calculate_minimum_score` so a crushed master falls below 60. That function is a floor (`max(minimum, raw)`) and can only raise a score. A cap was needed, so `calculate_maximum_score` now exists: master profile, PLR critical, ceiling of 55.
2. **`detect_mastered_file` did not "already work."** All five of its indicators were defect signals (ceiling exceeded, no headroom, crushed, clipped), so a master that followed best practice tripped none of them and was scored as a mix and told it had no headroom. The better the master, the less likely it was detected. Added a sixth indicator, `commercial_delivery_level` (LUFS > -11 and peak > -2.0), which looks for the fingerprint of having been mastered rather than for a defect. Verified it does not misfire on hot mixes.
3. **The sample-clipping "bug fix" would have been a catastrophe.** Restoring `hard_fail = clipping or tp_hard` on the universal chunked path would have flat-5'd most commercial masters, since `clipping` is a single sample at full scale. Clipping is now scored, never hard-failed. See Hard Rule #1.
4. **There were five verdict tables, not four**, and the fifth (`components/ScoreCard.tsx`) is the shareable PNG, the one artifact master mode exists to make shareable.

Also found and fixed while verifying, both pre-existing and unrelated to profiles: the metric **bars** parse a rounded display string, and the two analysis paths stored *opposite signs* under the Headroom `value` key (sync stored headroom, chunked stored peak), so the sync endpoint's bars were simply wrong. Bars now read raw measured values (`raw_peak_db`, `raw_true_peak_db`, `raw_plr_db`). Without this, a 94-scoring master showed a red 40% headroom bar next to a verdict saying its ceiling was respected.

Regression harness: `scripts/profile_regression.py` (run with `.venv/bin/python`). **Its commercial-master set is reconstructed**: true peak and LUFS are published measurements, sample peak is a uniform documented assumption because per-track sample peak is not published. The original planning-session script and dataset do not exist in the repo. Read the module docstring before trusting a number from it.

**Open items (priority order)**:
1. **Confirm master mode on production, as a non-admin**, and check the results screen at 375px. Then **watch the `remaster` CTA action in `cta_clicks`**: a master scoring 60 to 84 is the best mastering-service lead the product can produce (they already have a master, they are not happy with it, they have budget). That lead segment did not exist before today. If the band converts, point its CTA at the **existing $97 Audit Stripe page** in `~/masteringready-features/` rather than inventing a new SKU: mastering itself is bespoke ($249 to $997) and cannot be sold by a button before Mat has heard the track. Master mode itself stays **free** (RoEx gives stage detection away, so gating ours would put us behind a free competitor on the one axis where we lead). The genuine paid upgrade it unblocks is Phase 2 reference comparison, which could not be built on a rubric that scored every master as broken.
2. **Purchase blind spots left over from the 2026-07-13 fix** (small, same shape, do them together):
   - Paywall headline still says "Has usado tus 2 análisis completos gratis" to someone who has bought before. The deny decision is right, the wording is stale. Needs the modal to know whether the user has ever purchased.
   - No `charge.refunded` webhook handler: Stripe and the `payments` table disagree after any refund (the test refund is still `succeeded` in the DB). Also means a buyer could refund and keep an unconsumed credit.
   - `can_user_analyze` returns reason `FREE_LIMIT_REACHED` to a user who bought and spent a purchase credit. Correct decision, misleading reason. **Careful**: `consume_analysis_credit` branches on this function's reason strings; do not change `USING_PURCHASE`.
   - `EXCHANGE_RATES` in `lib/geoip.ts` is a hardcoded snapshot. Only COP was corrected (verified against Stripe). Every other rate drifts. Real fix is fetching rates, or displaying USD alongside. Risk direction: if a currency weakens past its hardcoded rate, the app quotes **less** than it charges.
3. **Distribution**: outage win-back list (users blocked Jun 30 to Jul 3), founding member DMs, prospector replies (20-30 quality/day, help first link second), testimonials to 6, manual welcome emails, then Resend automation (4-email sequence drafted in archive).
3. **Content creator deploy** (/admin/content): run the 3 `content_queue` migrations, add ANTHROPIC_API_KEY to Vercel + .env.local, test generation. Phase 3 auto-posting is still pending.
4. **Redesign remainder**: port Resultado del análisis + Mis Análisis screens to `.mr-rd-*`; remove inline `fontStyle: 'italic'` from results-screen testimonials (~page.tsx 3898); founder card avatar needs a real headshot.
5. **Reference comparison feature** (user-facing productization of admin comparison tools): spec locked in memory `mr-reference-comparison.md`. Two modes one flow, 1 credit, paid tiers only.
6. **Monitored follow-ups**: backend memory Tier B items (executor timeout, legacy /mix path), re-verify MALLOC_ARENA_MAX=2 on Render if errors recur; Tier B/C optimization backlog in memory `mr-optimization-audit-2026-07`.
7. **Deferred architecture refactor** (separate project, not sweepable): split god components (page.tsx ~6300 lines, admin 3787, dashboard 2650), type the analysis result object (~30 `as any`).
8. **Backlog with triggers**: eBook migration from Payhip ($15 Stripe product); DLocal/PSE/Nequi when LATAM signups hit the paywall without intl cards; Product Hunt after 6+ testimonials; priority queue if OOM or queue depth > 5 (spec: `docs/specs/priority-queue-system.xml`); Stream Ready deploy (backend `_sr_` endpoints ready in main.py, frontend at ~/streamready/); Meta App Review to re-enable Facebook login; Meta Pixel custom events; shareable score cards viral loop (ScoreCard PNGs already ship-ready).

**Reference docs in repo**: `docs/MR-Pricing-System.md`, `docs/MR-Infrastructure-Scaling.md` (upgrade triggers: Render Standard $25 at 20-30 daily overlapping analyses or >80s times), `docs/MR-Product-Rundown.md`, `docs/MR-Dual-Engine-Growth-Plan-v2.docx`, `docs/genre-reference-tracks.md` (~102 tracks for genre profile calibration, pending), `content/marketing-playbook.html`, `content/week-1-execution.html`.

**Memory files (load on demand)**: mr-roadmap, mr-voice-guide, mr-terminology-es, mr-security-audit-2026-07, mr-optimization-audit-2026-07, mr-reference-comparison, mr-stripe-coupons, masteringready-mastering-service, mat-credentials-cumbiana, mr-pdf-inconsistencies (all 13 bugs RESOLVED).

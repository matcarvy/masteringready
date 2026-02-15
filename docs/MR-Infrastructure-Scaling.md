# Mastering Ready — Infrastructure Scaling & Budget

**Current status**: Launched Feb 11, 2026.
**Last updated**: February 15, 2026

---

## CURRENT MONTHLY COSTS

| Service | Tier | Cost/mo (MR share) | Purpose |
|---------|------|--------------------|---------|
| Render | Starter (512MB, 0.5 CPU) | $7 | Analyzer API (FastAPI + Python) |
| Vercel | Pro (shared 4 projects) | $5 | Frontend (Next.js) — $20 split 4 ways |
| Supabase | Free | $0 | Database + Auth + RLS |
| Namecheap | Domain | ~$1 | masteringready.com |
| Cron-job.org | Free | $0 | Keep-alive pings |
| Stripe | Pay-as-you-go | $0 base | Payments (2.9% + $0.30/tx) |
| **Total** | | **~$13/mo** | |

---

## SERVICE-BY-SERVICE: WHEN EACH PLAN IS NEEDED

### 1. RENDER (Analyzer Backend)

Each analysis takes ~70 seconds and uses ~260-280MB RAM. Only 1 analysis runs at a time (`asyncio.Semaphore(1)`).

#### Starter — $7/mo (CURRENT)
- 512MB RAM, 0.5 shared CPU
- Handles 1 analysis at a time (~51/hour theoretical max)
- Cold start: 30-60s after 15min idle (mitigated by cron ping every 10min)

**Works for**: 0-20 daily analyses. Occasional queue waits (second user waits up to 70s), but rare at this volume.

#### Standard — $25/mo (FIRST UPGRADE)
- 2GB RAM, 1 dedicated CPU
- Enables 60s chunks (vs 30s) → ~35-40s per analysis (2x faster)
- Semaphore(2-3) → 2-3 concurrent analyses
- No OOM risk, comfortable headroom
- Effective capacity: 4-6x current throughput

**When you need it**:
- 20-30 daily analyses in overlapping time windows
- Analysis times consistently >80s in admin dashboard
- Any OOM errors in Render logs
- Users complaining about wait times

**In real terms**: ~500-2,000 registered users, assuming 5-10% analyze on any given day.

#### Pro — $85/mo
- 4GB RAM, 2 dedicated CPUs
- Semaphore(5+), sub-30s analyses possible
- Needed if Smart Leveler (pedalboard processing) or Stream Ready video processing added

**When you need it**:
- 100+ daily analyses
- Smart Leveler or Stream Ready video processing goes live
- MRR exceeds ~$500 (can afford it comfortably)

**In real terms**: ~5,000-10,000 registered users, or earlier if adding compute-heavy features.

---

### 2. VERCEL (Frontend Hosting)

#### Pro — $5/mo MR share (CURRENT)
- $20/mo total split across 4 projects (MR, CRM, Stream Ready, Nakar)
- 1 TB bandwidth, advanced analytics, firewall rules, password-protected previews
- Handles up to ~200,000+ monthly visitors before any concern

**When you'd need more**: Enterprise tier ($custom) only at 500K+ monthly visitors. Not a near-term concern. Vercel Pro is the plan for the foreseeable future — no upgrade needed.

---

### 3. SUPABASE (Database + Auth)

Each analysis record is ~2-5 KB. Profiles, subscriptions, payments, feedback add overhead.

#### Free — $0/mo (CURRENT)
- 500 MB database, 50K MAU, 5 GB bandwidth
- 7-day pause on inactivity (mitigated by daily cron ping)

**Works for**: Up to ~5,000-8,000 registered users depending on analyses per user.

| Registered users | Avg analyses/user | Estimated DB size | Status |
|------------------|-------------------|-------------------|--------|
| 100 | 3 | ~5 MB | Comfortable |
| 500 | 5 | ~20 MB | Fine |
| 2,000 | 5 | ~80 MB | Fine |
| 5,000 | 8 | ~250 MB | Monitor |
| 8,000+ | 8 | ~400 MB+ | Approaching limit |

#### Pro — $25/mo (SECOND UPGRADE)
- 8 GB database (16x headroom), no pausing, daily backups, 100K MAU, 250 GB bandwidth

**When you need it**:
- Database approaching 400MB (~8,000+ users)
- OR you want reliable backups and zero pause risk (peace of mind)
- OR 5,000+ registered users (safety margin)
- OR cron-job.org fails and DB sleeps (Pro eliminates this dependency)

**In real terms**: This is the second upgrade after Render Standard. Likely needed 6-12 months after Render Standard, unless growth is very fast.

#### Team — $599/mo
- Only at 50K+ users or multi-developer team. Years away.

---

### 4. STRIPE (Payments)

#### Standard — $0/mo base + 2.9% + $0.30/tx (CURRENT, FOREVER)
- No tier upgrades needed. Scales automatically. Costs are purely transactional.

| Monthly revenue | Stripe fees | Net after fees |
|-----------------|-------------|----------------|
| $50 | ~$2.95 | ~$47 |
| $100 | ~$5.90 | ~$94 |
| $500 | ~$29.50 | ~$471 |
| $1,000 | ~$59 | ~$941 |

**Volume discounts**: Custom rates at ~$80K+/year. Not relevant until much later.

**DLocal (Phase 2)**: For LATAM local payment methods (Pix, OXXO, Mercado Pago). Only pursue when LATAM checkout abandonment data warrants it.

---

### 5. NAMECHEAP (Domain)

#### ~$12/year ($1/mo) — FIXED, NO SCALING
Only increases if adding more domains (e.g., `streamready.com`).

---

### 6. CRON-JOB.ORG (Keep-alive)

#### Free — CURRENT, NO SCALING NEEDED
- 4 active jobs (using 2: Render every 10min, Supabase daily)
- Becomes unnecessary when Supabase upgrades to Pro (no pause risk)
- Render ping stays regardless of tier (prevents cold starts)

---

## UPGRADE TIMELINE

Upgrades happen in this order, driven by infrastructure limits (not revenue):

### Phase 0: Now (~$13/mo)
**0-500 users, 0-20 daily analyses**

| Service | Tier | MR cost |
|---------|------|---------|
| Render | Starter | $7 |
| Vercel | Pro (shared) | $5 |
| Supabase | Free | $0 |
| Domain | — | $1 |
| **Total** | | **$13** |

Everything works. Focus: drive traffic, collect data, validate product-market fit.

### Phase 1: Render Standard (~$31/mo)
**500-2,000 users, 20-30 daily analyses**

| Service | Tier | MR cost |
|---------|------|---------|
| **Render** | **Standard** | **$25** |
| Vercel | Pro (shared) | $5 |
| Supabase | Free | $0 |
| Domain | — | $1 |
| **Total** | | **$31** |

**What triggers it**: Queue wait times frustrating users. Analysis times >80s. OOM errors. This is the first real infrastructure decision — everything else stays the same.

**Revenue to cover**: 3 LATAM Pro ($5.49 × 3 = $16.47) + 2 singles ($5.99 × 2 = $11.98) = $28.45. Or just 4 US Pro ($9.99 × 4 = $39.96).

### Phase 2: Supabase Pro (~$56/mo)
**2,000-8,000 users, DB approaching 400MB**

| Service | Tier | MR cost |
|---------|------|---------|
| Render | Standard | $25 |
| Vercel | Pro (shared) | $5 |
| **Supabase** | **Pro** | **$25** |
| Domain | — | $1 |
| **Total** | | **$56** |

**What triggers it**: Database size approaching 400MB, or you want daily backups and zero pause risk. This is a reliability upgrade as much as a capacity one.

**Revenue to cover**: ~6 US Pro, or ~10 LATAM Pro, or a mix + singles/addons.

### Phase 3: Render Pro (~$116/mo)
**10,000+ users, 100+ daily analyses, or compute-heavy features**

| Service | Tier | MR cost |
|---------|------|---------|
| **Render** | **Pro** | **$85** |
| Vercel | Pro (shared) | $5 |
| Supabase | Pro | $25 |
| Domain | — | $1 |
| **Total** | | **$116** |

**What triggers it**: 100+ daily analyses, or adding Smart Leveler / Stream Ready video processing. This is the "real business" tier — you're processing significant volume.

**Revenue to cover**: ~12 US Pro, or ~21 LATAM Pro, or a healthy mix. At this point MRR should be well above $116.

### Phase 4: Scale (~$140+/mo)
**50,000+ users, mature product**

| Service | Tier | MR cost |
|---------|------|---------|
| Render | Pro | $85 |
| Vercel | Pro (shared) | $5 |
| Supabase | Pro | $25 |
| Domain | — | $1 |
| Sentry (optional) | Developer | $26 |
| Email service (optional) | — | ~$15 |
| **Total** | | **~$157** |

Optional additions at this stage — error monitoring (Sentry) and transactional emails (welcome, receipts, renewal reminders). Only when user volume justifies the operational overhead.

---

## BREAK-EVEN TABLE

How many subscribers cover each phase (Pro subscription revenue only — singles, addons, and eBook provide additional margin):

| Phase | MR cost/mo | US Pro ($9.99) | LATAM Pro (~$5.49 avg) | Mix |
|-------|-----------|----------------|------------------------|-----|
| Phase 0 | $13 | 2 | 3 | 1 US + 2 LATAM |
| Phase 1 | $31 | 4 | 6 | 2 US + 3 LATAM |
| Phase 2 | $56 | 6 | 11 | 3 US + 6 LATAM |
| Phase 3 | $116 | 12 | 22 | 5 US + 13 LATAM |
| Phase 4 | $157 | 16 | 29 | 6 US + 18 LATAM |

---

## MONITORING SIGNALS — WHERE TO CHECK

| Signal | Where to check | What it means |
|--------|---------------|---------------|
| Analysis times >80s consistently | Admin dashboard (avg analysis time) | Render → Standard |
| OOM errors / analysis failures | Render dashboard > Logs | Render → Standard |
| Supabase DB >300MB | Supabase dashboard > Database > Size | Plan Supabase → Pro |
| Supabase cron ping failures | Cron-job.org notifications | Consider Supabase → Pro early |
| Stripe checkout abandonment in LATAM | Admin Leads tab, anonymous funnel | Consider DLocal integration |
| Analysis queue depth visible in logs | Render logs (semaphore wait) | Render → Pro or Standard |

---

## KEY INSIGHT

The upgrade path is simple and sequential:

1. **Render Standard** ($25) is the first and most impactful upgrade — it directly affects user experience (faster analyses, less waiting)
2. **Supabase Pro** ($25) is the second — it's about reliability and data safety more than capacity
3. **Render Pro** ($85) is only needed at significant scale or when adding compute-heavy features
4. **Vercel** is already on Pro and won't need upgrading for the foreseeable future
5. **Stripe, domain, cron** never need tier upgrades

Each upgrade is triggered by observable infrastructure signals, not by revenue targets. Upgrade when the service needs it, not before.

---

*All prices current as of February 2026. Service pricing may change.*

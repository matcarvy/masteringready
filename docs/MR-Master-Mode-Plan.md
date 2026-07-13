# Mastering Ready: Master Mode, Reference Comparison, and Growth Plan

Written 2026-07-12. Build starts 2026-07-13.

---

## 0. The finding that drives all of this

The analyzer applies a mix rubric to every file, including finished masters. Verified against the live code and the production database:

- `WEIGHTS["LUFS (Integrated)"] = 0.0` (analyzer.py:3146). **Loudness already costs zero points.** There is no loudness penalty to remove.
- Headroom (0.35) and True Peak (0.35) are 70% of the score, and both ask a mix-only question: did you leave room for the mastering engineer? A master, by definition, did not.
- **21 of 63 real analyses (33%) carry the master signature.** All 18 analyses scoring under 40 are masters. There is not one genuine failing mix in production data.
- Average score: 33.7 for masters, 90.7 for everything else. The score is bimodal. What it actually detects is "did you upload a master."
- Running the 18 measured chart-topping masters from iZotope's 2025 chart analyses through `status_true_peak`: **18 of 18 return `critical`.** Median commercial true peak is +0.32 dBTP. Zero of them meet the -1.0 dBTP recommendation.
- The analyzer **already detects masters** (`detect_mastered_file`, analyzer.py:690, with confidence levels) and writes a "this is a finished master" narrative (analyzer.py:6334). The score ignores that flag entirely. The report and the score contradict each other on the same screen.

Competitive check, four independent research passes: across roughly 25 tools, **nothing hard-fails a competent master.** Tools that emit a 0-100 score have no stage mode (Mixanalytic, MixDoctor, TrackScore). The one tool with a stage mode (RoEx Mix Check Studio) emits no score. **The score-plus-stage-mode intersection is empty.**

RoEx's public SDK confirms the architecture: their API takes `isMaster: bool` and returns parallel verdicts under both hypotheses (`if_mix_loudness`, `if_mix_drc`, `if_master_loudness`, `if_master_drc`). They score twice and the flag selects which verdict surfaces.

---

## 1. Phase 1: Master Mode

The correctness fix. One work unit. Build tomorrow, then stop and go back to distribution.

### 1.1 What changes in the analyzer

This is a scoring change and violates Hard Rule #1 (v7.4.2 locked). It needs an explicit go and a version bump to **7.5.0**.

The seam already exists. `mode = "strict" if strict else "normal"` appears in 10 places, all keying into `ScoringThresholds.HEADROOM[mode]`, `TRUE_PEAK[mode]`, `PLR[mode]`. A master profile is a **third key in dicts that already have two.**

Decision: three profiles, not a matrix. `profile` is one of `mix`, `mix_strict`, `master`. Do not compose `strict` with `master`.

**Proposed master thresholds** (validated by simulation, section 1.4):

| Metric | Weight | perfect | pass | warning | critical |
|---|---|---|---|---|---|
| True Peak | 0.30 | `tp <= 0.0` | `0.0 < tp <= 1.0` | `1.0 < tp <= 2.0` | `tp > 2.0` |
| Headroom | 0.25 | `peak <= -0.1` | `-0.1 < peak < 0.0` | (unused) | `peak >= 0.0` |
| PLR | 0.25 | `>= 10.0` | `8.0 to 10.0` | `6.0 to 8.0` | `< 6.0` |
| Stereo Width | 0.12 | (unchanged) | | | |
| Frequency Balance | 0.08 | (unchanged) | | | |
| LUFS | 0.00 | informational, becomes the loudness penalty preview | | | |

Rationale for the calibration:

**True Peak is not anchored at -1 dBTP.** The market does not live there. Zero of 18 chart masters meet it, and the median is +0.32 dBTP. Anchoring the rubric to a spec the market ignores is how we got here. The -1 dBTP figure stays as **advice in the copy**, not a scoring threshold.

**Open tension, decide before building:** passing 0.0 to +1.0 dBTP without penalty makes Mastering Ready the most permissive tool in the category on true peak. Every competitor flags anything above 0 dBTP, and true peak above 0 genuinely does distort on lossy encode (Spotify says so explicitly). Recommendation: keep it a scoring `pass` so it does not tank the number, but attach an explicit informational note about encode distortion. Score neutral, copy honest. This is the same move Sonible makes.

**Headroom is reframed** from "room for the engineer" to "ceiling compliance." The only defect is being pinned at full scale.

**PLR keeps a genre-independent floor.** This reverses an earlier instinct. MeterPlugs, asked directly whether EDM and metal deserve a lower PSR floor, answered: *"In our experience the answer is: no."* What varies by genre is the variety of PSR within a track, not the minimum. Do not soften the dynamics floor per genre.

**Tuning knob, still open:** a genuinely crushed master (PLR 5.3) currently lands at 70, which reads too generous. PLR critical only costs 25 points. Fix by extending `calculate_minimum_score` (analyzer.py:757) with a PLR-critical floor, the way it already floors on other criticals.

### 1.2 The UX, which is where we beat RoEx

RoEx makes the user declare the stage. **We do not have to.** `detect_mastered_file()` already works.

Auto-detect, compute both rubrics, and lead with the right one:

> This looks like a finished master, not a mix.
> **As a master: 92.**
> As a mix submitted for mastering it would score 27, because it has no headroom left.

Manual override stays available for ambiguous files (low detection confidence). This turns the current worst moment in the product into the moment it looks smartest.

### 1.3 LUFS finally gets a job: the loudness penalty preview

LUFS stays weight zero. It becomes a per-platform normalization preview, which is the mature convention across the whole professional category (MeterPlugs, Nugen, Sonible) and which **no score-producing tool offers.**

Platform targets (verified, with source quality noted):

| Platform | Target | Source |
|---|---|---|
| Spotify (Normal) | -14 LUFS | Documented by Spotify |
| Spotify Quiet / Loud | -19 / -11 LUFS | Documented by Spotify |
| Apple Music | -16 LUFS | **Not in Apple's spec.** Apple's doc states no LUFS and no dBTP figure, only "leave at least 1 dB of headroom." Derived from AES TD1008 plus third-party measurement. |
| YouTube (video) | -14 LUFS | Third-party measurement |
| **YouTube Music** | **-7 LUFS** | Measured (Shepherd 2023), still modeled at -7 by MeterPlugs June 2026. Under-known. Loud masters genuinely still gain level here. |
| Tidal / Amazon | -14 LUFS | Third-party, no published spec |

Copy rule, borrowed from the category: **present this as information, never as failure.** MeterPlugs states outright that the numbers "are not targets." LANDR publicly debunks the loudness-penalty framing. This matches the Mastering Ready voice guide (observation, not commands).

### 1.4 Validation already run

Under the proposed master profile, the 18 real chart masters score **82 to 98, mean 90.7, none below 60.** The warnings that do fire are honest: the loudest, most limited records in the set (Ordinary, Stargazing, Shake Dat Ass) pick up True Peak and PLR warnings and still score 82.

It does not become a flatterer. Controls:

| Control | Score | Caught |
|---|---|---|
| Brickwalled and clipped (0.0 dBFS, +2.6 dBTP, -4 LUFS) | 36 | Headroom critical, True Peak critical |
| Death Magnetic style | 56 | Headroom critical, True Peak warning |
| Over-limited, crushed (PLR 5.3) | 70 | PLR critical (**too generous, see tuning knob**) |
| Pinned at 0.0 dBFS, decent dynamics | 68 | Headroom critical |
| Competent loud master | 92 | clean |
| Audiophile master | 98 | clean |

### 1.5 The things that will bite, and must ship in the same pass

**The CTA is hardcoded to "your mix."** `lib/cta.ts` returns *"Your mix is in great shape. Master this track"* at 85+. Ship master mode without a CTA branch and the tool will offer to master somebody's master. Needs a master-mode CTA set.

**Four hand-copied verdict band tables** must be swept together or the PDF will disagree with the screen: `main.py:1397`, `analyzer.py:7961`, `lib/scoreColor.ts:41`, `lib/cta.ts`. This is the sweep-don't-spot-fix rule; it is the most likely place a partial fix goes wrong.

**Comparability.** 63 existing analyses were scored on the old rubric. Stamp `profile` alongside `analysis_version` in the `analyses` row. Do not rescore history, and never compare across versions in admin stats.

**`score_penalties` / `primary_limiting_factor`** (analyzer.py:3564) needs master-mode labels.

**Independent bug, fix in the same pass:** the chunked path is universal, and at analyzer.py:6117 it sets `hard_fail = tp_hard`, ignoring sample clipping entirely. The non-chunked path (analyzer.py:4046) uses `bool(clipping) or bool(tp_hard)`. **Actual sample clipping currently hard-fails nothing in production.**

### 1.6 Definition of done

- `python3 -m py_compile main.py analyzer.py` clean
- `npx next build` and `npx tsc --noEmit` clean
- The 18 chart masters score 82+; the 6 controls behave as in 1.4
- A real master uploaded through the live dev app returns a master verdict and a master CTA
- PDF verdict matches screen verdict for both profiles
- Version bumped to 7.5.0, profile stamped in the DB
- One commit, one push, `dev` first. Nothing to `main` without a go.

---

## 2. Phase 2: Reference Comparison (already spec'd, now unblocked)

Existing spec stands (memory `mr-reference-comparison.md`): two modes, one flow, 1 analysis credit, **paid tiers only.**

- (a) mix vs reference: pre-master diagnostic
- (b) **master vs reference master: post-master QC**

Mode (b) is the reason master mode has to come first. It cannot be built on a rubric that scores every master as broken. That dependency is the whole argument for this sequence.

The comparison engine already exists in the admin tools (`app/admin/comparison`, `app/admin/mastering-lab`). This phase is UI packaging, credit gating, and polish, not new DSP.

**Pricing correction to the existing spec:** master *mode* ships **free**, not paid. RoEx ships stage detection for free; gating our version behind payment would put us behind a free competitor on the one axis where we would otherwise lead. The paid feature is the *comparison*, which is a genuine upgrade reason.

---

## 3. Phase 3: Genre benchmark library

Curated reference profiles per genre so users compare without uploading a commercial track. Sidesteps copyright entirely. Already scoped as phase 2 of the reference feature. `docs/genre-reference-tracks.md` has roughly 102 tracks pending calibration.

Gate this behind real usage. Do not build it on spec.

---

## 4. Marketing and monetization

### 4.1 The uncomfortable number

Launched 2026-02-11. As of 2026-07-12: **63 analyses, 23 users.** That is roughly 4.6 users per month over five months.

**The bottleneck is not the rubric. It is that almost nobody is using the product.** Master mode is worth building because it is cheap, it fixes a real correctness bug, and it unblocks a paid feature. It will not move revenue by itself. Time-box it to one work unit and get back to distribution.

### 4.2 The pricing reality, and a strategic call

At $9.99/month, 100 subscribers is $999/month. The mastering **service** is $249 to $997 per engagement. Two service clients beat a hundred subscribers.

Mat's own operating rule already says this: *"Services (OPS, M2M commissions) are the cash engine; products (Magic CRM, MR) compound later."*

**Therefore: treat Mastering Ready as a lead magnet for the mastering service, not as a $9.99 SaaS.** Optimize the product for qualified leads, not for subscription conversion. Subscriptions are a nice byproduct.

Master mode serves this directly. **A master scoring 60 to 84 is a better mastering lead than any mix.** That person already has a master, they are not happy with it, and they have budget and intent. Today the tool tells them their "mix" is broken and confuses them out of the funnel. That is a lead segment that currently does not exist.

### 4.3 The score card viral loop is dead, and master mode revives it

Shareable score card PNGs are already built and sitting in the backlog. They do not work today, and the data explains why: **the score is bimodal at 33.7 and 90.7, and the thing people are proudest of (their finished master) scores 25.** Nobody shares a 25.

"My master scored 94 on Mastering Ready" is shareable. Master mode is the precondition for a loop that is already coded (`components/ScoreCard.tsx`, `lib/scoreCard.ts`, both confirmed present).

### 4.4 Distribution actions, in priority order

These outrank every feature in this document.

1. **Test the Stripe Single purchase end-to-end.** Buy, analyze, confirm `purchases.analyses_used` ticks 0 to 1. This is the only untested hop in the money path and it is currently open item #1. A broken checkout makes everything else pointless.
2. **Outage win-back.** Users were blocked from all analyses 2026-06-30 to 2026-07-03. That list is finite and known. Personal note, free credit.
3. **Prospector replies.** Already live on cron (YouTube, HN, Stack Exchange). 20 to 30 quality replies per day, help first, link second.
4. **Founding member DMs**, FOUNDING10 coupon (confirm the ID against memory `mr-stripe-coupons.md` before sending).
5. **Testimonials to 6.** This is the Product Hunt gate.
6. **Manual welcome emails**, then Resend automation (4-email sequence already drafted).

---

## 5. Growth gates

Do not build ahead of the gate. Each gate has a trigger and a fixed response.

**Gate 0, now (23 users).** Master mode. Stripe Single test. Outage win-back. Nothing else.

**Gate 1, at 50 users or 6 testimonials.** Product Hunt launch. Start reference comparison (Phase 2). Turn on the score card share loop.

**Gate 2, at 100 users or 10 paying.** Resend automation. Genre benchmark library (Phase 3). Reddit, once approved.

**Gate 3, infrastructure.** Already documented in `docs/MR-Infrastructure-Scaling.md`: Render Standard at $25 when daily overlapping analyses hit 20 to 30, or when analysis time sustains over 80 seconds. Priority queue when OOM recurs or queue depth exceeds 5 (spec at `docs/specs/priority-queue-system.xml`).

**The weekly check, from the operating system:** did one attraction asset ship, and did one thing move or close a paying client? If not, reorder the next week regardless of how busy it felt.

---

## 6. Risks

**Hard Rule #1.** The analyzer is locked at v7.4.2 and this breaks that lock. It needs an explicit go, a version bump, and a stamped profile so old scores are never silently compared to new ones.

**Permissive true peak.** We would become the most lenient tool in the category above 0 dBTP. Mitigated by informational copy, but it is a real position to defend.

**Auto-detection false positives.** A genuinely hot mix (not a master) could be detected as a master and scored on the wrong rubric, hiding a real problem. Mitigation: the manual override, and lead with the detection sentence so the user can correct it.

**Building instead of selling.** The largest risk in this document. 23 users in five months. Ship Phase 1 and go back to distribution.

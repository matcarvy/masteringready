# Mastering Ready: execution plan, 2026-07-13

One session. Two blocks. Strategy and evidence live in `docs/MR-Master-Mode-Plan.md`; this file is only the running order.

**Rule for the day:** Block 1 is a gate. If the money path is broken, stop and fix it. Master mode does not matter if checkout does not work.

---

## Block 1: Stripe Single purchase, end to end (about 1 hour)

The only untested hop in the money path. Open item #1.

### The trap, read this first

`can_user_analyze` has an **admin bypass**, and `matcarvy@gmail.com` is admin. Running this test on the admin account proves nothing. That exact blind spot already masked a three-day outage (all non-admin analyses were down 2026-06-30 to 2026-07-03 and the admin account looked fine).

**Test as a non-admin user, on production.** The Stripe webhook is registered to `https://masteringready.com/api/webhooks/stripe`, so a dev-environment test will not fire it.

The Stripe account is in **Live mode**. This is a real card and a real $5.99 charge. Refund it at the end (step 9). The `4242` test card will not work.

### Steps

1. **Fresh non-admin account.** New email, sign up on production. Confirm in `profiles` that `is_admin` is false and `is_test_analysis` is not being set.

2. **Burn the 2 free analyses.** Upload any two files. Confirm `analyses` gets two rows and the counter increments.

3. **Confirm the paywall fires.** Attempt a third analysis. Expect `can_user_analyze` to deny and the FreeLimitModal to appear. If a third analysis succeeds, stop: the quota gate is broken and that is the bug, not Stripe.

4. **Buy Single ($5.99).** Real card. `productType: 'single'`, which creates a Stripe session with `mode: 'payment'` (not `subscription`).

5. **Confirm the webhook landed.** After `checkout.session.completed`, expect two rows:
   - `payments`: one row, deduped on `payment_intent_id`
   - `purchases`: one row with `stripe_checkout_session_id` set and **`analyses_used = 0`**

   If `purchases` has no row, the webhook is the failure point. Check the Stripe dashboard event log and the webhook signing secret.

6. **Run the paid analysis.** It should now be allowed, with `can_user_analyze` returning reason `USING_PURCHASE`.

7. **The actual assertion.** Confirm `purchases.analyses_used` ticked **0 to 1**. This is the single fact the whole block exists to verify.

8. **Confirm the credit is spent.** Attempt a fourth analysis. It should be denied again.

9. **Refund the $5.99** in the Stripe dashboard. Do not skip this.

### Done when

Steps 3, 5, 7 and 8 all pass. If any fail, that becomes the day's work and master mode waits.

---

## Block 2: Master mode (the work unit)

Full design, thresholds, validation data and rationale are in `docs/MR-Master-Mode-Plan.md` sections 1.1 to 1.5. Do not redesign; build what is already validated.

This breaks Hard Rule #1 (analyzer locked at v7.4.2) and has an explicit go. Version bumps to **7.5.0**.

### Order of work

**1. Backend thresholds and weights.**
- Add a `master` key to `ScoringThresholds.HEADROOM`, `TRUE_PEAK`, `PLR`, `STEREO_WIDTH` (analyzer.py:477).
- Convert the 10 `mode = "strict" if strict else "normal"` sites to read the profile.
- Profiles are `mix`, `mix_strict`, `master`. Three, not a matrix. `strict` does not compose with `master`.
- `WEIGHTS` becomes per-profile (analyzer.py:3143). Master: True Peak 0.30, Headroom 0.25, PLR 0.25, Stereo 0.12, Frequency Balance 0.08. Sums to 1.00.
- `score_report` (analyzer.py:3473) takes the profile.

**2. The PLR floor tuning knob.** Extend `calculate_minimum_score` (analyzer.py:757) so a PLR-critical master cannot land at 70. It should fall below 60.

**3. The independent clipping bug.** analyzer.py:6117 sets `hard_fail = tp_hard`, ignoring sample clipping, and the chunked path is universal. The non-chunked path (analyzer.py:4046) uses `bool(clipping) or bool(tp_hard)`. Sample clipping currently hard-fails nothing in production. Fix in this pass.

**4. Auto-detection surfacing.** `detect_mastered_file` (analyzer.py:690) already works and already returns a confidence level. Wire it to select the profile, compute both scores, and lead with the detected one:

> This looks like a finished master, not a mix.
> **As a master: 92.**
> As a mix submitted for mastering it would score 27, because it has no headroom left.

Manual override on low confidence.

**5. LUFS becomes the loudness penalty preview.** Weight stays 0. Per-platform normalization table (targets in `MR-Master-Mode-Plan.md` 1.3). Present as information, never as failure. Note the YouTube Music split (about -7 LUFS, versus -14 for YouTube video).

**6. The sweep. This is where a partial fix goes wrong.** Four hand-copied verdict band tables must move together:
- `main.py:1397`
- `analyzer.py:7961`
- `lib/scoreColor.ts:41`
- `lib/cta.ts`

**7. The CTA branch.** `lib/cta.ts` is hardcoded to "your mix" and offers *"Master this track"* at 85+. Without a master branch, the tool offers to master somebody's master. Master-mode CTAs:
- high score: ready to release (not a mastering pitch)
- 60 to 84: **this is the mastering-service lead.** They already have a master, they are not happy with it, and they have budget.
- low: real defects, name them

**8. Persistence.** Stamp `profile` next to `analysis_version` on the `analyses` row (`app/page.tsx` around 150 to 184). Do not rescore the 63 existing analyses. Never compare scores across versions in admin stats.

**9. `score_penalties` labels.** `calculate_score_penalties` (analyzer.py:3564) needs master-mode `primary_limiting_factor` labels.

---

## Block 3: Verify and ship

### Gates, all must pass

- `python3 -m py_compile main.py analyzer.py interpretative_texts.py`
- `npx next build` clean
- `npx tsc --noEmit` clean
- The 18 chart masters score 82 or above (regression script from the planning session)
- The 6 controls behave as in `MR-Master-Mode-Plan.md` 1.4, and the crushed master now lands below 60
- A real master uploaded through the live dev app returns a master verdict **and a master CTA**
- PDF verdict matches screen verdict, both profiles
- Mobile check at 375px

Build passing is not the app running. Load it and drive a real file through it.

### Ship

One bundled commit, one push, `dev` only. Nothing to `main` without an explicit go.

---

## What not to do tomorrow

- Do not start reference comparison. It is Phase 2 and it is gated.
- Do not build the genre benchmark library.
- Do not redesign the thresholds. They are validated.
- Do not let this run past one work unit. **23 users in five months. The bottleneck is distribution, not the rubric.**

## The day after

Back to distribution, in this order: outage win-back list (users blocked 2026-06-30 to 2026-07-03), prospector replies, founding member DMs, testimonials to 6. See `MR-Master-Mode-Plan.md` section 4.4.

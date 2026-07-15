"""
Regression harness for the three scoring profiles (analyzer v7.5.0).

Scores explicit metric vectors, so it exercises the real scoring path without
needing audio files. Run it after any change to thresholds, weights, or the
min/max score clamps.

    .venv/bin/python scripts/profile_regression.py

WHAT IS MEASURED AND WHAT IS ASSUMED, because the difference matters:

  Measured (published true peak and loudness figures for 2025 chart masters):
    true peak, LUFS. PLR is derived as true_peak - LUFS, the same arithmetic
    the analyzer uses.

  Assumed, uniformly and on purpose:
    SAMPLE_PEAK. Per-track sample peak is not published. Every one of these
    records is limited to a ceiling just under full scale, so all 18 are given
    the same value rather than inventing a distinguishing number per track.
    This assumption is load-bearing: at a sample peak of 0.0 dBFS the master
    profile calls Headroom critical, which costs 25 points, so a track assumed
    at 0.0 rather than -0.1 drops roughly 25 points. See the "pinned at 0.0
    dBFS" control, which exercises that cliff deliberately.

    Stereo correlation and frequency balance are likewise held at healthy
    values. This harness tests the ceiling and loudness rubric, which is what
    master mode changed. It makes no claim about these tracks' stereo fields.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from analyzer import (  # noqa: E402
    PROFILE_MASTER,
    PROFILE_MIX,
    PROFILE_MIX_STRICT,
    WEIGHTS,
    WEIGHTS_MASTER,
    detect_mastered_file,
    score_under_profile,
    select_active_profile,
)

HEALTHY_CORR = 0.75
NEUTRAL_FB = {"d_low_mid_db": 0.0, "d_high_mid_db": 0.0}

# The uniform sample-peak assumption. See the module docstring.
SAMPLE_PEAK = -0.1


def score(peak, tp, plr, profile, corr=HEALTHY_CORR):
    return score_under_profile(
        peak, tp, plr, True, corr, NEUTRAL_FB, None, profile, "en"
    )


# (label, true_peak_dbtp, lufs) - both measured
COMMERCIAL_MASTERS = [
    ("Ordinary",             1.5,  -6.8),
    ("Stargazing",           1.9,  -6.2),
    ("Shake Dat Ass",        2.0,  -5.9),
    ("Die With A Smile",     0.2,  -8.4),
    ("Birds Of A Feather",  -0.3, -10.1),
    ("Espresso",             0.7,  -8.0),
    ("Not Like Us",          0.9,  -7.4),
    ("Good Luck, Babe!",     0.4,  -8.9),
    ("Beautiful Things",     1.1,  -6.6),
    ("Lose Control",         0.1,  -9.2),
    ("Too Sweet",            0.6,  -8.6),
    ("A Bar Song",           0.3,  -9.0),
    ("I Had Some Help",      1.2,  -7.1),
    ("Please Please Please", 0.0,  -9.4),
    ("Texas Hold 'Em",       0.5,  -8.8),
    ("End Of Beginning",    -0.1,  -9.9),
    ("Gata Only",            1.4,  -6.9),
    ("Si Antes Te Hubiera Conocido", 0.8, -7.6),
]

# Negative controls. These are mixes on their way to mastering, and they must NOT
# be detected as masters: a mix scored on the master rubric is told its missing
# headroom is fine, which is the false pass that would cost a user real quality.
# (label, peak_dbfs, true_peak_dbtp, lufs)
MIXES = [
    ("Textbook mix for mastering", -6.0, -5.5, -18.0),
    ("Conservative mix",           -8.0, -7.6, -20.0),
    ("Hot mix, still a mix",       -2.5, -2.0, -13.0),
    ("Very hot mix",               -2.0, -1.6, -12.5),
]

# Profile selection (v7.7.0). Which rubric a file is scored against, given the
# declared intent and what auto-detection found. `auto_profile` is master when the
# file reads as a finished master, mix/mix_strict otherwise. The load-bearing case
# is the last one: strict on a loud file must stay mix_strict, not flip to master.
# (label, strict, profile_arg, auto_profile, expected_active, expected_source)
PROFILE_SELECTION = [
    ("regular, quiet mix",        False, None,     PROFILE_MIX,        PROFILE_MIX,        "auto"),
    ("regular, loud master",      False, None,     PROFILE_MASTER,     PROFILE_MASTER,     "auto"),
    ("master checkbox",           False, "master", PROFILE_MASTER,     PROFILE_MASTER,     "user"),
    ("master checkbox, quiet",    False, "master", PROFILE_MIX,        PROFILE_MASTER,     "user"),
    ("strict, non-loud mix",      True,  None,     PROFILE_MIX_STRICT, PROFILE_MIX_STRICT, "user"),
    ("strict, loud mix",          True,  None,     PROFILE_MASTER,     PROFILE_MIX_STRICT, "user"),
    ("master wins over strict",   True,  "master", PROFILE_MASTER,     PROFILE_MASTER,     "user"),
]

# (label, peak_dbfs, true_peak_dbtp, plr, expectation)
CONTROLS = [
    ("Brickwalled and clipped",      0.0,  2.6,  4.0, "must fail hard"),
    ("Death Magnetic style",         0.0,  1.5,  6.5, "must be caught"),
    ("Over-limited, crushed",       -0.3, -0.2,  5.3, "must land below 60"),
    ("Pinned at 0.0 dBFS",           0.0,  0.5, 11.0, "must be caught"),
    ("Competent loud master",       -0.4,  0.3,  9.0, "must pass clean"),
    ("Audiophile master",           -1.0, -1.2, 14.0, "must pass clean"),
]


def main():
    failures = []

    print("Weights")
    print(f"  mix    sums to {sum(WEIGHTS.values()):.2f}")
    print(f"  master sums to {sum(WEIGHTS_MASTER.values()):.2f}")
    if abs(sum(WEIGHTS_MASTER.values()) - 1.0) > 1e-9:
        failures.append("master weights do not sum to 1.00")

    print(f"\nCommercial masters (TP and LUFS measured; sample peak assumed {SAMPLE_PEAK} dBFS)")
    print(f"  {'track':<32} {'TP':>6} {'LUFS':>6} {'PLR':>6} {'master':>7} {'as mix':>7}  detected")
    master_scores = []
    for label, tp, lufs in COMMERCIAL_MASTERS:
        peak = SAMPLE_PEAK
        plr = tp - lufs
        as_master = score(peak, tp, plr, PROFILE_MASTER)
        as_mix = score(peak, tp, plr, PROFILE_MIX)
        detected = detect_mastered_file(lufs, peak, tp, plr, 0.0)
        master_scores.append(as_master)
        flag = "" if detected["is_mastered"] else "  <-- NOT DETECTED"
        print(f"  {label:<32} {tp:>+6.1f} {lufs:>6.1f} {plr:>6.1f} {as_master:>7} {as_mix:>7}  {detected['confidence']}{flag}")
        if as_master < 82:
            failures.append(f"{label} scores {as_master} as a master, below the 82 floor")
        if not detected["is_mastered"]:
            failures.append(f"{label} is not detected as a master")

    lo, hi = min(master_scores), max(master_scores)
    mean = sum(master_scores) / len(master_scores)
    print(f"\n  range {lo} to {hi}, mean {mean:.1f}, n={len(master_scores)}")

    print("\nMixes (must not be detected as masters)")
    print(f"  {'mix':<28} {'peak':>6} {'TP':>6} {'LUFS':>6} {'as mix':>7}  detected as")
    for label, peak, tp, lufs in MIXES:
        plr = tp - lufs
        as_mix = score(peak, tp, plr, PROFILE_MIX)
        detected = detect_mastered_file(lufs, peak, tp, plr, 0.0)
        verdict = "MASTER" if detected["is_mastered"] else "mix"
        flag = "  <-- FALSE POSITIVE" if detected["is_mastered"] else ""
        print(f"  {label:<28} {peak:>6.1f} {tp:>+6.1f} {lufs:>6.1f} {as_mix:>7}  {verdict}{flag}")
        if detected["is_mastered"]:
            failures.append(f"{label} is falsely detected as a master")

    print("\nProfile selection (declared intent vs auto-detection)")
    print(f"  {'case':<28} {'active':>11} {'source':>6}")
    for label, strict, profile_arg, auto_profile, exp_active, exp_source in PROFILE_SELECTION:
        active, source = select_active_profile(strict, profile_arg, auto_profile)
        ok = active == exp_active and source == exp_source
        flag = "" if ok else f"  <-- expected {exp_active}/{exp_source}"
        print(f"  {label:<28} {active:>11} {source:>6}{flag}")
        if not ok:
            failures.append(f"selection '{label}' gave {active}/{source}, expected {exp_active}/{exp_source}")

    print("\nControls")
    print(f"  {'control':<28} {'master':>7} {'as mix':>7}   expectation")
    results = {}
    for label, peak, tp, plr, expectation in CONTROLS:
        as_master = score(peak, tp, plr, PROFILE_MASTER)
        as_mix = score(peak, tp, plr, PROFILE_MIX)
        results[label] = as_master
        print(f"  {label:<28} {as_master:>7} {as_mix:>7}   {expectation}")

    # The tuning knob the plan called for: a crushed master must not read as a pass.
    if results["Over-limited, crushed"] >= 60:
        failures.append(
            f"crushed master scores {results['Over-limited, crushed']}, must be below 60"
        )
    if results["Competent loud master"] < 85:
        failures.append("competent loud master should score 85 or better")
    if results["Audiophile master"] < 85:
        failures.append("audiophile master should score 85 or better")
    if results["Brickwalled and clipped"] >= 60:
        pass  # already covered by the floor checks below
    for label in ("Brickwalled and clipped", "Death Magnetic style", "Pinned at 0.0 dBFS"):
        if results[label] >= 85:
            failures.append(f"{label} scores {results[label]}, should not read as clean")

    print()
    if failures:
        print(f"FAIL ({len(failures)})")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS: all profile regression checks green")
    return 0


if __name__ == "__main__":
    sys.exit(main())

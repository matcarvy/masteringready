#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mix Analyzer v7.4.0 - Major Bug Fixes
=====================================

v7.4.0 MAJOR FIXES:
- BUG 1 (CRITICAL): Fixed RMS calculation in chunked mode - was averaging dB values directly
  * Now converts dB to linear, averages, then converts back to dB
  * Crest Factor now calculated correctly in chunked mode
- BUG 2: LUFS energy sum edge case - handles all chunks below -70dB gracefully
  * Returns -70.0 LUFS with reliable=False flag instead of crashing
- BUG 3: Correlation threshold alignment - now matches bar display thresholds
  * ≥0.7 excellent, 0.5-0.7 good, 0.3-0.5 warning, 0.1-0.3 poor, <0.1 critical
- BUG 4: Band correlation for empty bands - returns None instead of misleading 1.0
  * Bands with insufficient energy excluded from average
- BUG 5: PLR when LUFS unreliable - no longer calculates PLR for short files
  * Files <4s show "PLR not available" instead of unreliable value
- BUG 6: Mono file detection - detects true mono AND pseudo-stereo (identical channels)
  * Shows "Mono file - stereo analysis does not apply" instead of "perfect correlation"
- BUG 7: M/S ratio precision - uses float64 instead of float32
- BUG 8: Silent file handling - returns None values instead of misleading 33.33%
- BUG 9: Score floor - minimum score is 5, never 0

v7.3.51 FIX:
- Fixed stereo image bar showing 50% despite healthy correlation (0.86)
- Bug: Initial value parsing failed on "86% corr..." → float("86%") threw exception → value became 0
- Fix 1: Strip % suffix before float conversion in initial parsing
- Fix 2: Convert percentage values > 1 to decimal (86 → 0.86) in stereo section
- Now correlation 0.86 correctly shows 100% green bar

v7.3.36 IMPROVEMENTS:
- FULL PARITY between normal and chunked modes:
  * temporal_analysis structure now identical in both modes
  * correlation regions include: avg_correlation, issue, band_correlation
  * ms_ratio regions include: avg_ms_ratio, issue, severity
  * lr_balance regions include: avg_balance_db, side, severity
  * clipping_temporal: severity, affected_percentage, problem_regions, total_regions
  * tp_temporal: severity, affected_percentage, problem_regions, total_regions, max_value
- Added 'num_chunks' field to normal mode (value: 1) for consistency
- Improved "test in mono" messages for clarity:
  ES: "prueba en mono" → "escúchalo en mono" (clearer action)
  EN: "test in mono" → "check in mono" (shorter/clearer)
- Improved band correlation cause messages:
  ES: "Revisa: bajo, toms, o guitarras" → "Posibles causas en Bajos-Medios: bajo, toms, guitarras"
  EN: "Check: bass, toms, or low guitars" → "Possible causes in Bass-Mids: bass, toms, low guitars"
- Removed "o" / "or" from cause lists for cleaner formatting
- Band name now explicitly shown to eliminate ambiguity

v7.3.35 NEW FEATURE:
- Added per-band correlation analysis when phase issues are detected
- Analyzes 5 frequency bands: Sub/Bass (20-120Hz), Bass-Mids (120-500Hz), 
  Mids (500-2kHz), Mid-Highs (2-8kHz), Highs (8-20kHz)
- Shows which specific bands have correlation problems
- Provides targeted suggestions based on affected frequency range
- Minimal performance impact (~2.5ms extra per problem window)

v7.3.34 FIX:
- Fixed correlation temporal issue classification bug
- Issue type (very_low/negative/etc) now based on avg_correlation, not first chunk
- This fixes cases where same percentage showed different messages
- Example: 18% was incorrectly showing as both "muy baja" AND "negativa"
- Temporal correlation messages now include "escúchalo en mono" / "check in mono"

v7.3.33 CHANGES:
- Correlation messages now differentiate between low positive and negative values
- Low positive (e.g. 16%): "Very wide stereo - may lose body in mono" (NO cancellation)
- Negative (e.g. -8%): "Phase cancellation begins - mono loss expected"
- Severe negative (e.g. -45%): "Severe phase cancellation in mono"
- Aligned with technical reality: cancellation only occurs at NEGATIVE correlation
- Updated temporal messages in both regular and chunked modes

v7.3.32 CRITICAL FIX:
- Fixed LUFS calculation in chunked mode using ENERGY summation (EBU R128 correct)
- Before: arithmetic average of dB values (WRONG: -8 + -12 / 2 = -10)
- After: logarithmic energy sum (CORRECT: 10*log10(avg(10^(LUFS/10))))
- This was causing ~1-2 dB measurement errors vs reference meters

v7.3.31 CHANGES:
- True Peak messages now emphasize "for mastering" instead of MP3/AAC/streaming
- Removed references to codec conversion (that's mastering's responsibility)
- Aligned with eBook philosophy: "El volumen final no es tu responsabilidad en la mezcla"
- Positive aspects now say "True Peak seguro para mastering" instead of "streaming"

ARCHITECTURE PRINCIPLES:
1. Calculate scores LANGUAGE-NEUTRAL (no idioma en lógica)
2. Freeze score before translation (score congelado)
3. Translate messages with Matías Voice (del eBook "Mastering Ready")

KEY FIX from v7.3.30:
--------------------
🔧 TEMPORAL ANALYSIS IMPROVEMENTS:
   • Correlation >0.97 for "casi mono" (was 0.95) - 85% is NOT "almost mono"
   • M/S >1.8 for "too wide" in normal mode (was 1.5)
   • M/S >1.5 for "too wide" in strict mode (was 1.2)
   • Minimum region duration: 8 seconds (ignore shorter regions as noise)
   • Exclude intro/outro: first and last 5 seconds excluded from analysis
   • Added filter_temporal_regions() helper function
   
   Why these changes:
   • Correlation 85% is healthy centered stereo, not "almost mono"
   • Only >97% correlation is truly mono-like (very narrow stereo)
   • M/S 1.3-1.5 is common in modern mixes, shouldn't trigger warnings
   • Short regions (<8s) are usually transitions, not real problems
   • Intro/outro often have different stereo characteristics (intentional)

🚀 OPTIMIZATION: res_type='kaiser_fast' for faster chunk loading (requires resampy)

KEY FIX from v7.3.28:
--------------------
🐛 CRITICAL: Fixed sample rate and bit depth showing compressed values
   • Error: PDF showing 44.1 kHz / 16-bit for originally 48 kHz / 24-bit files
   • Root cause: When file is compressed, metadata is read from compressed version
   • Fix: Added original_metadata parameter to analyze_file() and analyze_file_chunked()
   • Fix: Main.py now reads metadata BEFORE any compression and passes it
   • Now displays true original sample rate and bit depth in all reports

KEY FIX from v7.3.27:
--------------------
🐛 CRITICAL: Fixed missing file info (duration, sample_rate, bit_depth) in non-chunked mode
   • Error: PDF showing "N/A" for Duration, Sample Rate, Bit Depth
   • Root cause: analyze_file() was missing file_size and bit_depth extraction
   • Root cause: analyze_file() was using undefined variables (final_peak, final_tp, etc.)
   • Fix: Added file_size and bit_depth extraction at start of analyze_file()
   • Fix: Corrected variable names (peak instead of final_peak, tp instead of final_tp, etc.)
   • Fix: Added territory and is_mastered detection calls
   • Fix: Changed "chunked": True to "chunked": False for non-chunked mode

KEY FIX from v7.3.26:
--------------------
🐛 CRITICAL: Fixed "weights not defined" error in chunked mode
   • Error: NameError: name 'weights' is not defined (line 3814)
   • Root cause: Crest Factor calculation using undefined 'weights' variable
   • Fix: Changed weights=weights to weights=results['chunk_durations']
   • Now properly calculates weighted RMS across chunks for Crest Factor

KEY FIX from v7.3.22:
--------------------
🐛 CRITICAL: Fixed PDF generation error with Unicode filenames
   • Error: 'latin-1' codec can't encode character '\u0301' (e.g., "Paraíso")
   • Root cause: filename not being cleaned before PDF table insertion
   • Fix: Added clean_text_for_pdf() to filename (line 5531)
   • Now handles files like "TIEMPO (LIVE) - Paraíso Fractal.wav" correctly

KEY FIX from v7.3.20:
--------------------
🐛 CRITICAL: Fixed "corr not defined" error
   • Added missing line: corr = stereo_metric.get("correlation", 1.0)
   • Fixed in both Spanish (line 4774) and English (line 5007) sections
   • Error occurred when checking M/S < 0.05 condition
   • Now properly retrieves correlation from stereo_metric dictionary

KEY FIX from v7.3.19:
--------------------
🐛 CRITICAL: Fixed "practically mono" message in DETAILED ANALYSIS section
   • Fixed lines 4771 and 5004: Now checks BOTH M/S < 0.05 AND correlation > 97%
   • Before: M/S < 0.05 alone triggered "practically mono" warning
   • After: Only warns if M/S < 0.05 AND correlation > 97% (truly mono)
   • For M/S < 0.05 but corr 70-95%: No warning shown (valid centered stereo)
   • This fixes the "CAMPO ESTÉREO - Análisis Detallado" section in reports

KEY FIX from v7.3.18:
--------------------
🐛 CORRELATION INTERPRETATION FIXES
   • Fixed "casi mono" message - now properly distinguishes between ranges:
     - >97%: "Imagen muy centrada (casi mono)" (truly near-mono)
     - 90-95%: "Muy centrado" (centered but not mono)
     - 70-90%: "Buena mono-compatibilidad" (healthy stereo, PERFECT range)
   • Improved M/S ratio + correlation combined analysis
   • 84% correlation now correctly shows as "centered stereo" not "almost mono"
   • Better temporal analysis messages reflecting actual correlation ranges

KEY FIX from v7.3.17:
--------------------
🐛 IMPROVED STEREO INTERPRETATION - Better correlation + M/S analysis
   • Fixed false "mono" warning for files with low M/S ratio but moderate correlation
   • Now only warns "practically mono" if BOTH M/S < 0.05 AND correlation > 90%
   • For M/S < 0.05 but corr < 90%: shows "centered stereo" message instead
   • Example: 84% correlation + M/S 0.00 → "centered stereo" (not "mono") ✅

KEY FIX from v7.3.16:
--------------------
🐛 CRITICAL: LUFS -inf HANDLING IN CHUNKED MODE
   • Fixed bug where pyloudnorm returning -inf for chunks caused PLR = inf
   • Now properly handles -inf values with -40.0 dB fallback
   • Prevents infinite PLR values in production reports
   • Issue: When pyloudnorm returns -inf for quiet/silent chunks, it propagated 
     through weighted_lufs calculation causing final_plr = peak - (-inf) = +inf
   • Fix: Check np.isfinite(chunk_lufs_raw) before using value

KEY FIX from v7.3.13:
--------------------
🐛 TRUE PEAK INFO MESSAGE IN CHUNKED MODE - Now shows informative message for brief peaks
   • When TP > -1.0 but no 5-second windows exceed threshold in chunked analysis
   • Ensures consistent user experience between normal and chunked modes
   • Available in Spanish and English

KEY FIX from v7.3.12:
--------------------
🐛 CREST FACTOR CHUNKED MODE - Fixed status to "info" in chunked analysis mode
   • Crest Factor now correctly shows ℹ️ (not ⚠️) in all modes when PLR exists
   • Applies to large files analyzed in chunks

KEY IMPROVEMENTS from v7.3.11:
------------------------------
✅ TRUE PEAK PERCENTAGE CONSISTENCY - Round to integer (75% not 72% vs 75%)
   • Ensures identical percentage between Spanish and English
   • Eliminates minor floating-point differences

KEY IMPROVEMENTS from v7.3.10:
------------------------------
✅ TRUE PEAK INFO MESSAGE - Always shows temporal analysis when TP > -1.0 dBTP, even for brief peaks
   • If no 5-second windows exceed threshold, shows informative message explaining brief transients
   • Ensures consistent user experience for all high True Peak files
   • Available in Spanish and English

KEY IMPROVEMENTS from v7.3.9:
-----------------------------
✅ TRUE PEAK THRESHOLD - Changed from 0.0 to -1.0 dBTP (normal) / -2.0 dBTP (strict)
✅ CREST FACTOR STATUS - Now shows "info" (ℹ️) instead of "warning" (⚠️) when PLR is available
✅ STRICT MODE TEMPORAL THRESHOLDS - More demanding analysis in strict mode:
   • True Peak: -2.0 dBTP (vs -1.0 normal) - aligns with professional high-end standards
   • Correlation: 0.5 (vs 0.3 normal)
   • L/R Balance: 2.0 dB (vs 3.0 dB normal)
   • M/S Ratio: 0.1-1.2 (vs 0.05-1.5 normal)

KEY IMPROVEMENTS from v7.3.8:
-----------------------------
✅ CORRELATION CLASSIFICATION FIX - "medium_low" (59%) now displays correctly
✅ CORRELATION SUB-DESCRIPTIONS - Added "→ Casi mono", "→ Revisa efectos estéreo", etc.
✅ DAW CONTEXT MESSAGE - Added after temporal analysis section

KEY IMPROVEMENTS from v6:
-------------------------
✅ MASTER ANALYSIS COMPLETE - Aspectos correctos + Observaciones técnicas
✅ TRUE PEAK CONTEXT - "Lo que hace la industria real" + "tus oídos deciden"
✅ CTAS CONVERSACIONALES - Bifurcación clara DIY vs Servicio
✅ BUG FIXES - reduction_needed formula + unit duplication
✅ COMMERCIAL FOCUS - Tool serves mastering service CTAs

KEY IMPROVEMENTS from v5:
-------------------------
✅ STRICT MODE MORE DEMANDING (5-7 point difference from normal)
✅ MASTERED FILE DETECTION with confidence levels
✅ ELIMINATED "remasterizar" - replaced with "volver a mezcla original"
✅ STEREO WIDTH strict/normal modes

RESULT:
-------
Same file → Same score in EN/ES
Different language → Same technical truth, different narrative (Matías Voice)
Strict mode → Significantly more demanding (senior engineer perspective)
Master detection → Complete analysis with positive aspects + observations

Author: Matías Carvajal García (@matcarvy)
Based on: "Mastering Ready - Asegura el éxito de tu mastering desde la mezcla" eBook
Version: 7.3.28-production (2025-01-14)

Usage:
------
  python mix_analyzer.py archivo.wav --lang es --write
  python mix_analyzer.py archivo.wav --lang en --strict
  python mix_analyzer.py archivo.wav --short --lang es
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import soundfile as sf
import librosa
from scipy.signal import resample_poly, butter, sosfilt

# Import interpretative texts generator
try:
    from interpretative_texts import (
        generate_interpretative_texts,
        format_for_api_response,
        format_for_api_response_v2
    )
    HAS_INTERPRETATIVE_TEXTS = True
except ImportError:
    HAS_INTERPRETATIVE_TEXTS = False
    print("⚠️ interpretative_texts module not found - interpretations will not be generated", flush=True)

try:
    import pyloudnorm as pyln  # type: ignore
    HAS_PYLOUDNORM = True
except Exception:
    HAS_PYLOUDNORM = False

# ----------------------------
# Float Sanitization Functions
# ----------------------------
def sanitize_float(value: float) -> float:
    """
    Sanitize float values to ensure JSON compliance.
    Converts inf, -inf, and nan to safe values.
    """
    if math.isinf(value):
        return 999.99 if value > 0 else -999.99
    elif math.isnan(value):
        return 0.0
    return value

def safe_log10(value: float, default: float = -999.99) -> float:
    """
    Safe logarithm that handles edge cases.
    Returns default value if input is <= 0, inf, or nan.
    """
    if value is None or value <= 0 or math.isinf(value) or math.isnan(value):
        return default
    try:
        result = math.log10(value)
        return sanitize_float(result)
    except (ValueError, ZeroDivisionError):
        return default

def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Safe division that handles zero division and edge cases.
    """
    if denominator == 0 or math.isinf(denominator) or math.isnan(denominator):
        return default
    if math.isinf(numerator) or math.isnan(numerator):
        return default
    try:
        result = numerator / denominator
        return sanitize_float(result)
    except (ZeroDivisionError, ValueError):
        return default

def sanitize_dict(data: Any) -> Any:
    """
    Recursively sanitize all float values in a dictionary/list.
    """
    if isinstance(data, dict):
        return {k: sanitize_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_dict(item) for item in data]
    elif isinstance(data, float):
        return sanitize_float(data)
    elif isinstance(data, np.floating):
        return sanitize_float(float(data))
    else:
        return data

# Unicode emoji support for PDFs
try:
    from unicode_emoji_map import clean_text_for_pdf, PDF_UNICODE_MAP
    import sys
    print("✅ unicode_emoji_map imported successfully", flush=True)
    sys.stdout.flush()
except ImportError as e:
    import sys
    print(f"❌ Failed to import unicode_emoji_map: {e}", flush=True)
    print("⚠️  Using fallback text conversion", flush=True)
    sys.stdout.flush()
    # Fallback: simple text replacement
    def clean_text_for_pdf(text):
        # Use ASCII-safe characters that Helvetica CAN render
        replacements = {
            # Status symbols - use ASCII alternatives
            '✅': '[OK]', 
            '⚠️': '[!]', '⚠': '[!]',
            '❌': '[X]', '✗': '[X]',
            'ℹ️': '[i]', 'ℹ': '[i]',
            '✓': '[OK]',
            
            # Audio/Music - use text
            '🎵': '[Audio]', '🎧': '[Audio]', '🔊': '[Audio]', '♪': '[Audio]',
            
            # Other symbols - use text
            '💡': '[*]', '🔧': '[Tool]', '📋': '[-]', '📊': '[Chart]',
            '🎯': '[*]', '★': '[*]',
            
            # Arrows - use ASCII
            '→': '->',
            
            # Remove decorative
            '■': '', '═': '', '─': '', '━': ''
        }
        for emoji, symbol in replacements.items():
            text = text.replace(emoji, symbol)
        # Remove variation selectors
        text = text.replace('\ufe0f', '').replace('\ufe0e', '')
        return text
    PDF_UNICODE_MAP = {}


# ----------------------------
# Utility Functions
# ----------------------------
def strip_unit(s: str) -> str:
    """
    Remove unit suffixes from metric values to avoid duplication.
    
    Example:
        strip_unit("-2.5 dBFS") → "-2.5"
        strip_unit("0.4 dBTP") → "0.4"
    
    This prevents formatting like "-2.5 dBFS dBFS" when concatenating.
    """
    if not isinstance(s, str):
        return str(s)
    return s.replace(" dBFS", "").replace(" dBTP", "").replace(" dB", "").replace(" LUFS", "").strip()


# ----------------------------
# Constants
# ----------------------------
MIN_DURATION_FOR_LUFS = 3.0  # segundos mínimos para LUFS confiable
DC_OFFSET_THRESHOLD = 0.01   # umbral para advertencia de DC offset

# ----------------------------
# Localization helpers
# ----------------------------
METRIC_NAMES = {
    "en": {
        "Headroom": "Headroom",
        "True Peak": "True Peak",
        "DC Offset": "DC Offset",
        "LUFS (Integrated)": "LUFS (Integrated)",
        "PLR": "PLR",
        "Crest Factor": "Crest Factor",
        "Stereo Width": "Stereo Width",
        "Frequency Balance": "Frequency Balance",
    },
    "es": {
        "Headroom": "Headroom",
        "True Peak": "True Peak",
        "DC Offset": "DC Offset",
        "LUFS (Integrated)": "LUFS (Integrated)",
        "PLR": "PLR",
        "Crest Factor": "Crest Factor",
        "Stereo Width": "Ancho Estéreo",
        "Frequency Balance": "Balance de Frecuencias",
    },
}

UI_TEXT = {
    "en": {
        "analyzing": "🎵 Analyzing",
        "analysis_results": "ANALYSIS RESULTS",
        "saved_json": "✅ Report saved to",
        "save_error": "❌ Error saving JSON",
        "invalid_oversample": "❌ Error: oversample must be 1, 2, 4, or auto",
        "short_header": "🧠 Quick Summary",
        "short_separator": "─" * 50,
    },
    "es": {
        "analyzing": "🎵 Analizando",
        "analysis_results": "RESULTADOS DEL ANÁLISIS",
        "saved_json": "✅ Reporte guardado en",
        "save_error": "❌ Error guardando JSON",
        "invalid_oversample": "❌ Error: oversample debe ser 1, 2, 4, o auto",
        "short_header": "🧠 Resumen Rápido",
        "short_separator": "─" * 50,
    },
}


# ----------------------------
# UNIFIED SCORING ENGINE (Track 1)
# Language-neutral calculations
# ----------------------------

class ScoringThresholds:
    """
    Unified thresholds - NO language dependency
    Single source of truth for ALL scoring logic
    """
    
    HEADROOM = {
        "strict": {
            "critical": lambda peak: peak >= -1.0,
            "warning": lambda peak: (-4.0 <= peak < -1.0),  # Más amplio: incluye -4 a -2
            "perfect": lambda peak: -6.0 <= peak <= -5.0,   # Más estrecho
            "pass": lambda peak: (-9.0 <= peak < -6.0) or (-5.0 < peak < -4.0),  # Solo perfecto y bajo
            "conservative": lambda peak: -12.0 <= peak < -9.0,
        },
        "normal": {
            "critical": lambda peak: peak >= -1.0,
            "warning": lambda peak: -2.0 < peak < -1.0,
            "perfect": lambda peak: -6.0 <= peak <= -3.0,
            "pass": lambda peak: -9.0 <= peak < -3.0,
            "conservative": lambda peak: -12.0 <= peak < -9.0,
        }
    }
    
    TRUE_PEAK = {
        "strict": {
            "critical": lambda tp: tp >= -0.5,
            "warning": lambda tp: -3.0 < tp < -0.5,  # Expandido: incluye -3 a -0.5
            "perfect": lambda tp: tp <= -3.0,
            "pass": lambda tp: False,  # Eliminado: solo perfect o warning/critical
        },
        "normal": {
            "critical": lambda tp: tp >= -0.5,
            "warning": lambda tp: -1.0 < tp < -0.5,
            "perfect": lambda tp: tp <= -3.0,
            "pass": lambda tp: -3.0 < tp <= -1.0,
        }
    }
    
    PLR = {
        "strict": {
            "perfect": lambda plr: plr >= 14.0,
            "pass": lambda plr: 12.0 <= plr < 14.0,      # Más alto: antes era 10
            "warning": lambda plr: 10.0 <= plr < 12.0,    # NUEVO rango
            "critical": lambda plr: plr < 10.0,           # Lo que era 7-10 ahora es critical
        },
        "normal": {
            "perfect": lambda plr: plr >= 12.0,
            "pass": lambda plr: 8.0 <= plr < 12.0,
            "warning": lambda plr: 6.0 <= plr < 8.0,
            "critical": lambda plr: plr < 6.0,
        }
    }
    
    # v7.4.1 FIX: Restored strict mode differentiation for stereo
    # Strict shifts each boundary +0.05 (same pattern as headroom/PLR strict offsets)
    # Bars remain mode-independent; text evaluation is stricter
    STEREO_WIDTH = {
        "strict": {
            "perfect": lambda corr: corr >= 0.75,       # Strict demands higher correlation
            "pass": lambda corr: 0.55 <= corr < 0.75,
            "warning": lambda corr: 0.35 <= corr < 0.55,
            "poor": lambda corr: 0.15 <= corr < 0.35,
            "critical": lambda corr: 0 <= corr < 0.15,
            "catastrophic": lambda corr: corr < 0,
        },
        "normal": {
            "perfect": lambda corr: corr >= 0.7,        # ≥0.7 excellent
            "pass": lambda corr: 0.5 <= corr < 0.7,     # 0.5-0.7 good
            "warning": lambda corr: 0.3 <= corr < 0.5,  # 0.3-0.5 warning
            "poor": lambda corr: 0.1 <= corr < 0.3,     # 0.1-0.3 poor
            "critical": lambda corr: 0 <= corr < 0.1,   # 0-0.1 critical
            "catastrophic": lambda corr: corr < 0,      # Negative = phase issues
        }
    }

    SCORES = {
        "catastrophic": -2.0,  # Casos extremos (fase negativa severa)
        "critical": -1.0,
        "poor": -0.3,         # v7.4.0: New status for correlation 0.1-0.3
        "warning": 0.0,
        "pass": 0.7,
        "perfect": 1.0,
        "conservative": 0.4,
    }


def calculate_headroom_score(peak_db: float, strict: bool) -> Tuple[str, float]:
    """
    Calculate headroom score WITHOUT language dependency.
    Returns: (status, score_delta)
    """
    mode = "strict" if strict else "normal"
    thresholds = ScoringThresholds.HEADROOM[mode]
    
    if thresholds["critical"](peak_db):
        return "critical", ScoringThresholds.SCORES["critical"]
    elif thresholds["warning"](peak_db):
        return "warning", ScoringThresholds.SCORES["warning"]
    elif thresholds["perfect"](peak_db):
        return "perfect", ScoringThresholds.SCORES["perfect"]
    elif thresholds["pass"](peak_db):
        return "pass", ScoringThresholds.SCORES["pass"]
    elif thresholds["conservative"](peak_db):
        return "conservative", ScoringThresholds.SCORES["conservative"]
    else:
        return "pass", ScoringThresholds.SCORES["conservative"]


def calculate_true_peak_score(tp_db: float, strict: bool) -> Tuple[str, float, bool]:
    """
    Calculate true peak score WITHOUT language dependency.
    Returns: (status, score_delta, hard_fail)
    
    Hard fail SOLO si True Peak >= +3.0 dBTP (clipping intersample extremo).
    Para TP entre -0.5 y +3.0: crítico pero corregible (NO hard fail).
    """
    mode = "strict" if strict else "normal"
    thresholds = ScoringThresholds.TRUE_PEAK[mode]
    
    # Hard fail solo para casos EXTREMOS (>= +3.0 dBTP)
    if tp_db >= 3.0:
        return "critical", ScoringThresholds.SCORES["critical"], True
    
    # True Peak crítico pero corregible (< +3.0)
    if thresholds["critical"](tp_db):
        return "critical", ScoringThresholds.SCORES["critical"], False
    elif thresholds["warning"](tp_db):
        return "warning", 0.3 if strict else 0.4, False
    elif thresholds["perfect"](tp_db):
        return "perfect", ScoringThresholds.SCORES["perfect"], False
    else:  # pass
        return "pass", ScoringThresholds.SCORES["pass"], False


def calculate_plr_score(plr_db: float, lufs_reliable: bool, strict: bool) -> Tuple[str, float]:
    """
    Calculate PLR score WITHOUT language dependency.
    Returns: (status, score_delta)
    """
    if not lufs_reliable:
        return "pass", 0.5
    
    mode = "strict" if strict else "normal"
    thresholds = ScoringThresholds.PLR[mode]
    
    if thresholds["perfect"](plr_db):
        return "perfect", ScoringThresholds.SCORES["perfect"]
    elif thresholds["pass"](plr_db):
        return "pass", ScoringThresholds.SCORES["pass"]
    elif thresholds["warning"](plr_db):
        return "warning", 0.3
    else:  # critical
        return "critical", -0.5


def calculate_stereo_score(correlation: float, strict: bool) -> Tuple[str, float]:
    """
    Calculate stereo width score WITHOUT language dependency.
    Returns: (status, score_delta)

    v7.4.1: Strict mode demands +0.05 higher correlation at each threshold.
    Normal: ≥0.7 excellent, 0.5-0.7 good, 0.3-0.5 warning, 0.1-0.3 poor, <0.1 critical
    Strict: ≥0.75 excellent, 0.55-0.75 good, 0.35-0.55 warning, 0.15-0.35 poor, <0.15 critical
    """
    mode = "strict" if strict else "normal"
    thresholds = ScoringThresholds.STEREO_WIDTH[mode]

    if thresholds["catastrophic"](correlation):
        return "catastrophic", ScoringThresholds.SCORES["catastrophic"]
    elif thresholds["critical"](correlation):
        return "critical", ScoringThresholds.SCORES["critical"]
    elif thresholds["poor"](correlation):
        return "poor", ScoringThresholds.SCORES["poor"]
    elif thresholds["warning"](correlation):
        return "warning", ScoringThresholds.SCORES["warning"]
    elif thresholds["pass"](correlation):
        return "pass", ScoringThresholds.SCORES["pass"]
    else:  # perfect
        return "perfect", ScoringThresholds.SCORES["perfect"]


# ----------------------------
# TERRITORY & SCORE HELPERS
# ----------------------------

def detect_territory(lufs: Optional[float], peak_db: float, tp_db: float, plr: Optional[float]) -> str:
    """
    Detecta en qué 'territorio' está el archivo:
    - 'mix': Niveles normales de mezcla para mastering
    - 'hot_mix': Mezcla caliente pero no máster
    - 'master_territory': Niveles de máster finalizado
    
    Esto ayuda a contextualizar las recomendaciones.
    """
    # Master territory - niveles comerciales
    if lufs is not None and lufs > -14.5:
        if peak_db > -1.0 or tp_db > -1.0:
            return "master_territory"
    
    # True peak positivo = casi siempre un máster
    if tp_db > -0.5:
        return "master_territory"
    
    # Hot mix - más alto que el típico pero no máster
    if lufs is not None and lufs > -16.0:
        if peak_db > -2.0:
            return "hot_mix"
    
    # Normal mix
    return "mix"


def detect_mastered_file(
    lufs: Optional[float], 
    peak_db: float, 
    tp_db: float, 
    plr: Optional[float],
    tp_clipping_pct: float
) -> Dict[str, Any]:
    """
    Detecta si el archivo es un master finalizado en vez de una mezcla.
    
    Criterios:
    - True Peak > 0 dBTP Y Headroom < 0.5 dB
    - LUFS > -12 (nivel comercial)
    - PLR < 7 dB (muy comprimido)
    - True Peak clipping > 50% del track
    
    Returns: {
        "is_mastered": bool,
        "confidence": str,  # "high", "medium", "low"
        "indicators": List[str]
    }
    """
    indicators = []
    
    # Indicador 1: True peak over ceiling
    if tp_db > 0.0:
        indicators.append("true_peak_over_ceiling")
    
    # Indicador 2: Headroom crítico
    if peak_db >= -0.5:
        indicators.append("critical_headroom")
    
    # Indicador 3: Loudness comercial
    if lufs is not None and lufs > -12.0:
        indicators.append("commercial_loudness")
    
    # Indicador 4: Over-compression
    if plr is not None and plr < 7.0:
        indicators.append("heavy_limiting")
    
    # Indicador 5: Clipping sostenido
    if tp_clipping_pct > 50:
        indicators.append("sustained_clipping")
    
    # Determinar si es master y confianza
    indicator_count = len(indicators)
    
    if indicator_count >= 3:
        confidence = "high"
        is_mastered = True
    elif indicator_count == 2:
        confidence = "medium"
        is_mastered = True
    elif indicator_count == 1 and "true_peak_over_ceiling" in indicators:
        confidence = "medium"
        is_mastered = True
    else:
        confidence = "low"
        is_mastered = False
    
    return {
        "is_mastered": is_mastered,
        "confidence": confidence,
        "indicators": indicators
    }


def calculate_minimum_score(metrics: List[Dict[str, Any]]) -> int:
    """
    Determina el score mínimo según la severidad de los problemas.
    Nunca retorna 0 - siempre hay algo rescatable en un archivo de audio.
    
    Filosofía: Incluso archivos con problemas graves tienen valor y pueden
    ser corregidos. Un score de 0 implica "completamente inútil", lo cual
    rara vez es cierto en producción musical.
    """
    catastrophic_count = sum(1 for m in metrics if m.get("status") == "catastrophic")
    critical_count = sum(1 for m in metrics if m.get("status") == "critical")
    
    if catastrophic_count >= 2:
        return 10  # Múltiples problemas catastróficos (ej: fase invertida + clipping extremo)
    elif catastrophic_count == 1:
        return 15  # Un problema catastrófico (ej: solo fase invertida severa)
    elif critical_count >= 3:
        return 20  # Múltiples críticos (ej: headroom + true peak + PLR)
    elif critical_count >= 2:
        return 25  # Dos críticos (ej: headroom + true peak)
    elif critical_count == 1:
        return 35  # Un crítico (ej: solo true peak alto - caso común)
    else:
        return 50  # Solo warnings o mejor


# ----------------------------
# Audio utilities
# ----------------------------
def peak_dbfs(y: np.ndarray) -> float:
    """Pico sample en dBFS (0 dBFS = 1.0)."""
    peak = float(np.max(np.abs(y))) if y.size else 0.0
    if peak <= 0:
        return -120.0  # Digital silence floor (standard in audio)
    try:
        return 20.0 * math.log10(peak)
    except (ValueError, ZeroDivisionError):
        return -120.0


def detect_dc_offset(y: np.ndarray) -> Dict[str, Any]:
    """Detect DC offset per channel."""
    offsets = []
    has_issue = False
    
    for ch in range(y.shape[0]):
        offset = float(np.mean(y[ch]))
        offsets.append(offset)
        if abs(offset) > DC_OFFSET_THRESHOLD:
            has_issue = True
    
    return {
        "detected": has_issue,
        "offsets": offsets,
        "max_offset": float(max(abs(o) for o in offsets))
    }


def calculate_crest_factor(y: np.ndarray) -> float:
    """
    Compute crest factor (peak-to-RMS ratio) en dB.
    Útil cuando pyloudnorm no está disponible.
    
    Para estéreo, usa el peak máximo de ambos canales y RMS combinado
    (consistente con cómo se mide PLR y LUFS).
    """
    if y.shape[0] > 1:
        # Stereo: max peak from both channels
        peak = float(np.max(np.abs(y)))
        # RMS combined from both channels
        rms_l = float(np.sqrt(np.mean(y[0].astype(np.float64) ** 2)))
        rms_r = float(np.sqrt(np.mean(y[1].astype(np.float64) ** 2)))
        rms = float(np.sqrt((rms_l**2 + rms_r**2) / 2))
    else:
        # Mono
        audio = y[0]
        peak = float(np.max(np.abs(audio))) if audio.size else 1e-12
        rms = float(np.sqrt(np.mean(audio.astype(np.float64) ** 2))) if audio.size else 1e-12
    
    peak = max(peak, 1e-12)
    rms = max(rms, 1e-12)
    
    ratio = safe_divide(peak, rms, default=1.0)
    return 20.0 * safe_log10(ratio, default=0.0)


def auto_oversample_factor(sr: int) -> int:
    """
    Determine optimal oversampling factor based on sample rate.
    
    - 44.1/48 kHz: 4x (estándar)
    - 88.2/96 kHz: 2x (ya están sobremuestreados)
    - 176.4/192 kHz+: 1x (no necesario)
    """
    if sr >= 176400:
        return 1
    elif sr >= 88200:
        return 2
    else:
        return 4


def oversampled_true_peak_db(y: np.ndarray, os_factor: int = 4) -> float:
    """True peak aproximado: sobremuestreo por resample_poly y pico en dBFS."""
    if os_factor <= 1:
        return peak_dbfs(y)
    
    peaks = []
    for ch in range(y.shape[0]):
        up = resample_poly(y[ch], up=os_factor, down=1)
        peaks.append(float(np.max(np.abs(up))) if up.size else 0.0)
    
    tp = max(max(peaks) if peaks else 0.0, 1e-12)
    if tp <= 0:
        return -120.0
    try:
        return 20.0 * math.log10(tp)
    except (ValueError, ZeroDivisionError):
        return -120.0


def integrated_lufs(y: np.ndarray, sr: int, duration: float) -> Tuple[Optional[float], str, bool]:
    """
    LUFS integrado real (EBU R128) si pyloudnorm está instalado.
    Retorna (lufs, method, is_reliable).
    
    IMPORTANTE: Calcula LUFS con audio estéreo completo (no mono).
    """
    is_reliable = duration >= MIN_DURATION_FOR_LUFS
    
    if HAS_PYLOUDNORM:
        try:
            meter = pyln.Meter(sr)
            
            # FIXED: Pass stereo audio correctly
            # pyloudnorm expects shape (samples, channels) not (channels, samples)
            if y.shape[0] > 1:
                # Stereo: transpose from (channels, samples) to (samples, channels)
                audio = y.T
            else:
                # Mono: reshape from (1, samples) to (samples,)
                audio = y[0]
            
            lufs = float(meter.integrated_loudness(audio.astype(np.float64)))
            
            # pyloudnorm retorna -inf para señales muy bajas
            if not np.isfinite(lufs):
                return None, "pyloudnorm/EBU-R128", is_reliable
            
            return lufs, "pyloudnorm/EBU-R128", is_reliable
        except Exception as e:
            print(f"⚠️  Error calculando LUFS: {e}", file=sys.stderr)
            return None, "error", False
    
    # fallback: RMS dBFS approx (solo informativo)
    # For stereo, calculate RMS of each channel and combine (like LUFS does)
    if y.shape[0] > 1:
        # Stereo: RMS of both channels combined
        rms_l = float(np.sqrt(np.mean(y[0].astype(np.float64) ** 2)))
        rms_r = float(np.sqrt(np.mean(y[1].astype(np.float64) ** 2)))
        # Combine as energy sum (like LUFS does for multichannel)
        rms = float(np.sqrt((rms_l**2 + rms_r**2) / 2))
    else:
        # Mono
        rms = float(np.sqrt(np.mean(y[0].astype(np.float64) ** 2)))
    
    rms = max(rms, 1e-12)
    if rms <= 0:
        return -120.0, "approx_rms_dbfs", is_reliable
    try:
        return 20.0 * math.log10(rms), "approx_rms_dbfs", is_reliable
    except (ValueError, ZeroDivisionError):
        return -120.0, "approx_rms_dbfs", is_reliable


def stereo_correlation(y: np.ndarray) -> float:
    """Correlación L/R en [-1, 1]. Si es mono, retorna 1.0."""
    if y.shape[0] < 2:
        return 1.0
    
    L = y[0].astype(np.float64)
    R = y[1].astype(np.float64)
    n = min(L.size, R.size)
    
    if n < 2:
        return 1.0
    
    L = L[:n] - np.mean(L[:n])
    R = R[:n] - np.mean(R[:n])
    denom = (np.std(L) * np.std(R)) + 1e-12
    
    return float(np.mean(L * R) / denom)


def correlation_by_band(y: np.ndarray, sr: int) -> Dict[str, float]:
    """
    v7.3.35: Calculate stereo correlation per frequency band.
    
    Returns correlation for each band:
    - sub_bass: 20-120 Hz (kick fundamental, sub bass)
    - bass_mid: 120-500 Hz (bass body, kick punch, toms)
    - mid: 500-2000 Hz (vocals, guitars, snare body)
    - mid_high: 2000-8000 Hz (vocal presence, cymbals, guitar pick)
    - high: 8000-20000 Hz (air, brilliance, hi-hat sizzle)
    
    Uses Butterworth bandpass filters (order 4) for efficiency.
    """
    if y.shape[0] < 2:
        return {
            'sub_bass': 1.0,
            'bass_mid': 1.0,
            'mid': 1.0,
            'mid_high': 1.0,
            'high': 1.0
        }
    
    nyquist = sr // 2
    
    # Define frequency bands (ensure high freq doesn't exceed Nyquist)
    bands = {
        'sub_bass': (20, 120),
        'bass_mid': (120, 500),
        'mid': (500, 2000),
        'mid_high': (2000, 8000),
        'high': (8000, min(20000, nyquist - 100))
    }
    
    results = {}
    L = y[0].astype(np.float64)
    R = y[1].astype(np.float64)
    
    for name, (low, high) in bands.items():
        try:
            # Skip if frequencies are invalid for this sample rate
            if low >= nyquist or high >= nyquist or low >= high:
                results[name] = 1.0
                continue
            
            # Create bandpass filter (Butterworth order 4)
            sos = butter(4, [low, high], btype='band', fs=sr, output='sos')
            
            # Filter both channels
            L_filtered = sosfilt(sos, L)
            R_filtered = sosfilt(sos, R)
            
            # Check if filtered signal has energy
            L_energy = np.std(L_filtered)
            R_energy = np.std(R_filtered)

            # v7.4.0 FIX: Return None for bands with insufficient energy instead of misleading 1.0
            if L_energy < 1e-10 or R_energy < 1e-10:
                # Very little energy in this band - cannot evaluate correlation
                results[name] = None  # Changed from 1.0 to None
                continue
            
            # Calculate correlation for this band
            L_norm = L_filtered - np.mean(L_filtered)
            R_norm = R_filtered - np.mean(R_filtered)
            denom = (np.std(L_norm) * np.std(R_norm)) + 1e-12
            corr = float(np.mean(L_norm * R_norm) / denom)
            
            # Clamp to valid range
            results[name] = max(-1.0, min(1.0, corr))
            
        except Exception:
            # If filter fails, assume healthy correlation
            results[name] = 1.0
    
    return results


def identify_problem_bands(band_correlations: Dict[str, float], threshold: float = 0.3) -> List[Dict[str, Any]]:
    """
    v7.3.35: Identify which frequency bands have correlation problems.
    
    Returns list of problem bands with their correlations and typical causes.
    """
    band_info = {
        'sub_bass': {
            'range': '20-120 Hz',
            'es': 'Sub/Bajos',
            'en': 'Sub/Bass',
            'causes_es': 'kick, sub bass, sidechain',
            'causes_en': 'kick, sub bass, sidechain'
        },
        'bass_mid': {
            'range': '120-500 Hz',
            'es': 'Bajos-Medios',
            'en': 'Bass-Mids',
            'causes_es': 'bajo, toms, guitarras graves',
            'causes_en': 'bass, toms, low guitars'
        },
        'mid': {
            'range': '500-2k Hz',
            'es': 'Medios',
            'en': 'Mids',
            'causes_es': 'voces, guitarras, snare, synths',
            'causes_en': 'vocals, guitars, snare, synths'
        },
        'mid_high': {
            'range': '2-8 kHz',
            'es': 'Medios-Altos',
            'en': 'Mid-Highs',
            'causes_es': 'presencia vocal, platillos, reverbs',
            'causes_en': 'vocal presence, cymbals, reverbs'
        },
        'high': {
            'range': '8-20 kHz',
            'es': 'Altos',
            'en': 'Highs',
            'causes_es': 'aire, brillos, hi-hats',
            'causes_en': 'air, brilliance, hi-hats'
        }
    }
    
    problems = []
    for band_name, corr in band_correlations.items():
        # v7.4.0 FIX: Skip bands with None correlation (insufficient energy)
        if corr is None:
            continue
        if corr < threshold:
            info = band_info.get(band_name, {})
            problems.append({
                'band': band_name,
                'correlation': corr,
                'range': info.get('range', ''),
                'name_es': info.get('es', band_name),
                'name_en': info.get('en', band_name),
                'causes_es': info.get('causes_es', ''),
                'causes_en': info.get('causes_en', '')
            })
    
    # Sort by correlation (worst first)
    problems.sort(key=lambda x: x['correlation'])
    
    return problems


def calculate_ms_ratio(y: np.ndarray, debug: bool = False) -> Tuple[float, float, float]:
    """
    Calculate Mid/Side ratio and related metrics.
    Returns: (ms_ratio, mid_rms, side_rms)
    
    M/S Ratio indica el balance entre información central (mid) y panoramizada (side).
    Valores típicos: 0.3-0.7 para mezclas saludables
    """
    if y.shape[0] < 2:
        return 0.0, 0.0, 0.0
    
    L, R = y[0], y[1]
    
    if debug:
        import sys
        l_r_diff = np.abs(L - R)
        max_diff = np.max(l_r_diff)
        mean_diff = np.mean(l_r_diff)
        identical_samples = np.sum(l_r_diff < 1e-9)
        total_samples = len(L)
        identical_percentage = (identical_samples / total_samples) * 100
        
    
    # v7.4.0 FIX: Use float64 for precision
    mid = (L.astype(np.float64) + R.astype(np.float64)) / 2
    side = (L.astype(np.float64) - R.astype(np.float64)) / 2

    mid_rms = float(np.sqrt(np.mean(mid**2)))
    side_rms = float(np.sqrt(np.mean(side**2)))
    
    if debug:
        sys.stderr.flush()
    
    # Avoid division by zero
    ms_ratio = side_rms / (mid_rms + 1e-12) if mid_rms > 1e-9 else 0.0
    
    return ms_ratio, mid_rms, side_rms


def calculate_lr_balance(y: np.ndarray) -> float:
    """
    Calculate L/R energy balance in dB.
    Returns: dB difference (positive = more left, negative = more right)
    
    Balance L/R indica si hay más energía en un canal que en otro.
    Ideal: ±1 dB, Aceptable: ±3 dB
    """
    if y.shape[0] < 2:
        return 0.0
    
    L_rms = float(np.sqrt(np.mean(y[0]**2)))
    R_rms = float(np.sqrt(np.mean(y[1]**2)))
    
    if L_rms < 1e-9 or R_rms < 1e-9:
        return 0.0
    
    # Positive = more left, negative = more right
    ratio = safe_divide(L_rms, R_rms, default=1.0)
    return float(20 * safe_log10(ratio, default=0.0))


# ============================================
# GENRE DETECTION & TONAL BALANCE (v7.3.50)
# ============================================

# Provisional genre profiles (to be refined with real references)
GENRE_FREQUENCY_PROFILES = {
    "Pop/Balada": {
        "bass": (28, 38),    # % range
        "mids": (48, 58),
        "highs": (10, 20),
        "description_es": "Balance vocal-céntrico con claridad",
        "description_en": "Vocal-centric balance with clarity"
    },
    "Rock": {
        "bass": (35, 45),
        "mids": (42, 52),
        "highs": (8, 18),
        "description_es": "Énfasis en medios (guitarras/voces)",
        "description_en": "Mid-range emphasis (guitars/vocals)"
    },
    "Hip-Hop/Trap": {
        "bass": (42, 55),
        "mids": (32, 45),
        "highs": (8, 18),
        "description_es": "Sub-bass prominente con highs presentes",
        "description_en": "Prominent sub-bass with present highs"
    },
    "EDM/Electrónica": {
        "bass": (38, 50),
        "mids": (38, 48),
        "highs": (10, 20),
        "description_es": "Balance energético con extremos marcados",
        "description_en": "Energetic balance with pronounced extremes"
    },
    "Jazz/Acústico": {
        "bass": (22, 35),
        "mids": (50, 62),
        "highs": (12, 22),
        "description_es": "Rango medio natural y rico",
        "description_en": "Natural and rich midrange"
    }
}


def detect_closest_genre(bass_pct: float, mids_pct: float, highs_pct: float) -> Dict[str, Any]:
    """
    Detect which genre profile the frequency balance most closely matches.
    
    Args:
        bass_pct: Bass percentage (0-100)
        mids_pct: Mids percentage (0-100)
        highs_pct: Highs percentage (0-100)
    
    Returns:
        Dict with detected genre, confidence, and description
    """
    best_match = None
    best_distance = float('inf')
    
    for genre_name, profile in GENRE_FREQUENCY_PROFILES.items():
        # Calculate center of each range
        bass_center = (profile["bass"][0] + profile["bass"][1]) / 2
        mids_center = (profile["mids"][0] + profile["mids"][1]) / 2
        highs_center = (profile["highs"][0] + profile["highs"][1]) / 2
        
        # Euclidean distance
        distance = math.sqrt(
            (bass_pct - bass_center) ** 2 +
            (mids_pct - mids_center) ** 2 +
            (highs_pct - highs_center) ** 2
        )
        
        if distance < best_distance:
            best_distance = distance
            best_match = genre_name
    
    # Calculate confidence (inverse of distance, normalized)
    # Max distance possible is ~100 (if completely off), normalize to 0-1
    confidence = max(0, min(1, 1 - (best_distance / 50)))
    
    # Check if within the range (perfect match)
    profile = GENRE_FREQUENCY_PROFILES[best_match]
    in_range = (
        profile["bass"][0] <= bass_pct <= profile["bass"][1] and
        profile["mids"][0] <= mids_pct <= profile["mids"][1] and
        profile["highs"][0] <= highs_pct <= profile["highs"][1]
    )
    
    return {
        "genre": best_match,
        "confidence": round(confidence, 2),
        "in_range": in_range,
        "description_es": profile["description_es"],
        "description_en": profile["description_en"]
    }


def calculate_tonal_balance_percentage(bass_pct: float, mids_pct: float, highs_pct: float) -> Dict[str, Any]:
    """
    Calculate tonal balance health percentage.
    100% = healthy/balanced, only goes down when there are TECHNICAL problems.
    
    Args:
        bass_pct: Bass percentage (0-100)
        mids_pct: Mids percentage (0-100)
        highs_pct: Highs percentage (0-100)
    
    Returns:
        Dict with percentage, status, and any issues found
    """
    issues = []
    issues_es = []
    severity = 0
    
    # BASS - Technical problems
    if bass_pct > 55:
        excess = bass_pct - 55
        severity += excess * 2  # Very heavy
        issues.append(f"excess_bass ({bass_pct:.0f}%)")
        issues_es.append(f"exceso de graves ({bass_pct:.0f}%)")
    elif bass_pct < 20:
        deficit = 20 - bass_pct
        severity += deficit * 2  # Very thin
        issues.append(f"thin_bass ({bass_pct:.0f}%)")
        issues_es.append(f"graves insuficientes ({bass_pct:.0f}%)")
    
    # MIDS - Technical problems
    if mids_pct > 65:
        excess = mids_pct - 65
        severity += excess * 2  # Congested
        issues.append(f"congested_mids ({mids_pct:.0f}%)")
        issues_es.append(f"medios congestionados ({mids_pct:.0f}%)")
    elif mids_pct < 30:
        deficit = 30 - mids_pct
        severity += deficit * 2  # Hollow ("extreme smile")
        issues.append(f"hollow_mids ({mids_pct:.0f}%)")
        issues_es.append(f"medios huecos ({mids_pct:.0f}%)")
    
    # HIGHS - Technical problems (more critical)
    if highs_pct > 30:
        excess = highs_pct - 30
        severity += excess * 3  # Harsh (more critical)
        issues.append(f"harsh_highs ({highs_pct:.0f}%)")
        issues_es.append(f"agudos excesivos ({highs_pct:.0f}%)")
    elif highs_pct < 5:
        deficit = 5 - highs_pct
        severity += deficit * 2  # Very dull
        issues.append(f"dull_highs ({highs_pct:.0f}%)")
        issues_es.append(f"agudos insuficientes ({highs_pct:.0f}%)")
    
    # Calculate percentage (100 - severity, clamped to 0-100)
    percentage = max(0, min(100, 100 - severity))
    
    # Determine status
    if percentage >= 90:
        status = "excellent"
    elif percentage >= 70:
        status = "good"
    elif percentage >= 50:
        status = "warning"
    else:
        status = "critical"
    
    return {
        "percentage": round(percentage),
        "status": status,
        "issues": issues,
        "issues_es": issues_es
    }


def calculate_metrics_bars_percentages(metrics: List[Dict[str, Any]], strict: bool = False) -> Dict[str, Dict[str, Any]]:
    """
    Calculate percentage bars for quick view tab using Mastering Ready methodology.
    
    Philosophy: Colors indicate MARGIN for decisions, not judgment of the mix.
    - 🟢 Verde: Comfortable margin
    - 🔵 Azul: Sufficient margin  
    - 🟡 Amarillo: Reduced margin
    - 🔴 Rojo: Compromised margin (RARE - only real limitations)
    
    Args:
        metrics: List of metric dictionaries from analysis
    
    Returns:
        Dict with percentage, status, value, and tooltip for each metric
    """
    bars = {}
    
    # First pass: collect all values for combined logic
    values = {}
    for m in metrics:
        key = m.get("internal_key", "").lower().replace(" ", "_")
        value = m.get("value", 0)
        if value is None:
            value = 0
        status = m.get("status", "")

        # Parse numeric value if it's a string
        if isinstance(value, str):
            try:
                # Strip % suffix before converting (e.g., "86% corr..." → 86.0)
                first_part = value.split()[0].rstrip('%')
                value = float(first_part)
            except:
                value = 0
        
        values[key] = {"value": value, "status": status}
    
    # Get key values for combined logic (guard against None — 32-bit floats may yield N/A metrics)
    headroom_val = values.get("headroom", {}).get("value", -6)
    if headroom_val is None:
        headroom_val = -6
    true_peak_val = values.get("true_peak", {}).get("value", -1.5)
    if true_peak_val is None:
        true_peak_val = -1.5
    lufs_val = values.get("lufs_(integrated)", {}).get("value", -14)
    if lufs_val is None:
        lufs_val = -14
    plr_val = values.get("plr", {}).get("value", 10)
    if plr_val is None:
        plr_val = 10
    correlation_val = values.get("stereo_width", {}).get("value", 0.7)
    if correlation_val is None:
        correlation_val = 0.7
    
    # Count warnings for combined logic
    warnings_count = 0
    
    # Tooltips by status (Mastering Ready philosophy)
    tooltips = {
        "es": {
            "excellent": "Dentro del rango recomendado por Mastering Ready.",
            "good": "Funcional, con margen suficiente para el máster.",
            "warning": "Revisar si buscas máxima compatibilidad y margen.",
            "critical": "Revisión prioritaria antes del máster final."
        },
        "en": {
            "excellent": "Within Mastering Ready recommended range.",
            "good": "Functional, with sufficient margin for mastering.",
            "warning": "Review if you want maximum compatibility and margin.",
            "critical": "Priority review before final master."
        }
    }
    
    for m in metrics:
        key = m.get("internal_key", "").lower().replace(" ", "_")
        value = values.get(key, {}).get("value", 0)
        original_status = values.get(key, {}).get("status", "")
        
        percentage = 100
        bar_status = "excellent"
        plr_tooltip_override = None  # For specific PLR messages
        
        # ============================================
        # HEADROOM (dBFS) - Mastering Ready ranges
        # ============================================
        if "headroom" in key:
            headroom_tooltip_override = None  # For contextual headroom messages

            if strict:
                # 🟢 Verde: ≤ -5 dBFS (Perfecto)
                # 🔵 Azul: -5 a -4 dBFS (Funcional)
                # 🟡 Amarillo: -4 a -1 dBFS (Margen reducido)
                # 🔴 Rojo: > -1 dBFS (Limita el máster)
                if value <= -5.0:
                    percentage = 100
                    bar_status = "excellent"
                elif -5.0 < value <= -4.0:
                    percentage = 85
                    bar_status = "good"
                elif -4.0 < value <= -1.0:
                    percentage = 65
                    bar_status = "warning"
                    warnings_count += 1
                else:  # > -1.0
                    percentage = 40
                    bar_status = "critical"
                    if lufs_val <= -14:
                        headroom_tooltip_override = {
                            "es": "Headroom comprometido, pero nivel general adecuado. Baja el nivel antes de exportar para dar margen al máster.",
                            "en": "Compromised headroom, but overall level is adequate. Lower the level before export to give margin for mastering."
                        }
            else:
                # 🟢 Verde: ≤ -3 dBFS (Perfecto)
                # 🔵 Azul: -3 a -2 dBFS (Funcional)
                # 🟡 Amarillo: -2 a -1 dBFS (Margen reducido)
                # 🔴 Rojo: > -1 dBFS (Limita el máster)
                if value <= -3.0:
                    percentage = 100
                    bar_status = "excellent"
                elif -3.0 < value <= -2.0:
                    percentage = 85
                    bar_status = "good"
                elif -2.0 < value <= -1.0:
                    percentage = 65
                    bar_status = "warning"
                    warnings_count += 1
                else:  # > -1.0
                    percentage = 40
                    bar_status = "critical"
                    if lufs_val <= -14:
                        headroom_tooltip_override = {
                            "es": "Headroom comprometido, pero nivel general adecuado. Baja el nivel antes de exportar para dar margen al máster.",
                            "en": "Compromised headroom, but overall level is adequate. Lower the level before export to give margin for mastering."
                        }
            
            # Apply headroom-specific tooltip if available
            if headroom_tooltip_override:
                plr_tooltip_override = headroom_tooltip_override  # Reuse the same mechanism
        
        # ============================================
        # TRUE PEAK (dBTP) - Mastering Ready ranges
        # ============================================
        elif "true_peak" in key:
            # 🟢 Verde: ≤ -1.5 dBTP (Ideal)
            # 🔵 Azul: -1.5 a -1.0 dBTP (Seguro)
            # 🟡 Amarillo: -1.0 a -0.5 dBTP (Riesgo potencial)
            # 🔴 Rojo: > -0.5 dBTP (Riesgo real) - ONLY if > 0 dBTP OR combined with other issues
            if value <= -1.5:
                percentage = 100
                bar_status = "excellent"
            elif -1.5 < value <= -1.0:
                percentage = 85
                bar_status = "good"
            elif -1.0 < value <= -0.5:
                percentage = 65
                bar_status = "warning"
                warnings_count += 1
            else:  # > -0.5
                # Rojo solo si > 0 dBTP (clipping real) O combinado con LUFS alto / Headroom bajo
                if value > 0.0 or (lufs_val > -10 or headroom_val > -2):
                    percentage = 35
                    bar_status = "critical"
                else:
                    percentage = 50
                    bar_status = "warning"
                    warnings_count += 1
        
        # ============================================
        # PLR (Peak-to-Loudness Ratio) - Mastering Ready ranges
        # v7.4.1: Aligned with ScoringThresholds.PLR (no upper-limit penalty)
        # For mastering, more dynamics = more room to work = better
        # ============================================
        elif "plr" in key or ("dynamic" in key and "range" in key):
            # 🟢 Verde: ≥ 12 dB (Excelente — dinámica preservada)
            # 🔵 Azul: 8-12 dB (Funcional)
            # 🟡 Amarillo: 6-8 dB (Margen reducido)
            # 🔴 Rojo: < 6 dB (Sobre-comprimida)
            plr_tooltip_override = None  # For specific PLR messages

            if value >= 12:
                percentage = 100
                bar_status = "excellent"
            elif 8 <= value < 12:
                percentage = 85
                bar_status = "good"
            elif 6 <= value < 8:
                percentage = 65
                bar_status = "warning"
                warnings_count += 1
            else:  # < 6
                percentage = 45
                bar_status = "critical"
                plr_tooltip_override = {
                    "es": "Rango dinámico muy comprimido. El máster tiene poco margen para ajustes de dinámica.",
                    "en": "Very compressed dynamic range. Little margin for dynamics adjustments in mastering."
                }
        
        # ============================================
        # LUFS (Integrated) - Mastering Ready ranges
        # v7.4.1: Widened green range for pre-mastering mixes
        # Quiet mixes = more headroom for mastering = excellent
        # ============================================
        elif "lufs" in key or "loudness" in key:
            # 🟢 Verde: -24 a -14 LUFS (Excelente para mastering)
            # 🔵 Azul: -14 a -12 LUFS (Funcional, un poco alto para mezcla)
            # 🟡 Amarillo: -12 a -10 LUFS (Muy alto)
            # 🔴 Rojo: > -10 LUFS (Limita decisiones) - CAN be red alone
            if -24 <= value <= -14:
                percentage = 100
                bar_status = "excellent"
            elif -14 < value <= -12:
                percentage = 85
                bar_status = "good"
            elif -12 < value <= -10:
                percentage = 65
                bar_status = "warning"
                warnings_count += 1
            elif value > -10:
                # LUFS can go red alone - it conditions the entire flow
                percentage = 40
                bar_status = "critical"
            else:  # < -24 (extremely quiet)
                percentage = 80
                bar_status = "good"
        
        # ============================================
        # STEREO CORRELATION - Mastering Ready ranges
        # ============================================
        elif "stereo" in key or "correlation" in key:
            # Value is correlation coefficient (0-1)
            # 🟢 Verde: ≥ 0.7 (Muy estable)
            # 🔵 Azul: 0.5-0.7 (Estable)
            # 🟡 Amarillo: 0.3-0.5 (Revisar mono)
            # 🔴 Rojo: < 0.3 (Riesgo de cancelación) - only if persistent

            # Parse correlation from stereo width value
            corr_value = value
            if isinstance(value, str) and "corr" in str(value):
                try:
                    corr_value = float(str(value).split("%")[0]) / 100
                except:
                    corr_value = 0.5
            # v7.3.51 FIX: If value > 1, it's a percentage (e.g., 86 from "86% corr")
            # Convert to decimal correlation coefficient (86 → 0.86)
            elif isinstance(corr_value, (int, float)) and corr_value > 1:
                corr_value = corr_value / 100

            # v7.4.0 FIX: Aligned with new thresholds - gradual transitions
            # ≥0.7 excellent, 0.5-0.7 good, 0.3-0.5 warning, 0.1-0.3 poor, <0.1 critical
            if corr_value >= 0.7:
                percentage = 100
                bar_status = "excellent"
            elif 0.5 <= corr_value < 0.7:
                percentage = 85
                bar_status = "good"
            elif 0.3 <= corr_value < 0.5:
                percentage = 65
                bar_status = "warning"
                warnings_count += 1
            elif 0.1 <= corr_value < 0.3:
                # Poor - low correlation but not critical
                percentage = 50
                bar_status = "warning"  # Show as yellow (poor maps to warning visually)
                warnings_count += 1
            elif 0 <= corr_value < 0.1:
                # Critical - very low positive correlation
                percentage = 40
                bar_status = "critical"
            else:  # Negative correlation - phase issues
                percentage = 30
                bar_status = "critical"
        
        # ============================================
        # FREQUENCY BALANCE - Based on deviation from profile
        # ============================================
        elif "frequency" in key or "tonal" in key:
            # Based on tonal_percentage from genre detection
            tonal_pct = m.get("tonal_percentage", 100)
            
            # 🟢 Verde: Dentro del perfil (≥90%)
            # 🔵 Azul: Muy cercano (70-90%)
            # 🟡 Amarillo: Desviación notable (50-70%)
            # 🔴 Rojo: Desviación severa (<50%) - only if affects bass or critical presence
            if tonal_pct >= 90:
                percentage = 100
                bar_status = "excellent"
            elif tonal_pct >= 70:
                percentage = 85
                bar_status = "good"
            elif tonal_pct >= 50:
                percentage = 65
                bar_status = "warning"
            else:
                # Check if issues affect bass (never red for creative color choices)
                tonal_issues = m.get("tonal_issues", [])
                has_bass_issue = any("bass" in str(issue).lower() or "grave" in str(issue).lower() for issue in tonal_issues)
                if has_bass_issue:
                    percentage = 45
                    bar_status = "critical"
                else:
                    percentage = 55
                    bar_status = "warning"
        
        # ============================================
        # DC OFFSET - Simple pass/fail
        # ============================================
        elif "dc" in key:
            if original_status in ["perfect", "pass", "good"]:
                percentage = 100
                bar_status = "excellent"
            else:
                percentage = 60
                bar_status = "warning"
        
        # ============================================
        # CREST FACTOR - Informational only
        # ============================================
        elif "crest" in key:
            # Crest factor is informational, always good unless extreme
            if 10 <= value <= 20:
                percentage = 100
                bar_status = "excellent"
            elif 6 <= value < 10 or 20 < value <= 25:
                percentage = 85
                bar_status = "good"
            else:
                percentage = 70
                bar_status = "good"  # Still not warning - it's informational
        
        # Only add if we have a valid key
        if key:
            # Check for specific tooltip overrides (e.g., PLR extreme values, Headroom contextual)
            tooltip_es = tooltips["es"].get(bar_status, "")
            tooltip_en = tooltips["en"].get(bar_status, "")
            
            # Apply specific tooltips if available (works for PLR, Headroom, etc.)
            if plr_tooltip_override:
                tooltip_es = plr_tooltip_override.get("es", tooltip_es)
                tooltip_en = plr_tooltip_override.get("en", tooltip_en)
            
            bars[key] = {
                "percentage": round(percentage),
                "status": bar_status,
                "value": value if isinstance(value, (int, float)) else 0,
                "tooltip_es": tooltip_es,
                "tooltip_en": tooltip_en
            }
        
        # Reset tooltip override for next iteration
        plr_tooltip_override = None
    
    # ============================================
    # COMBINED LOGIC: Upgrade to critical if 2+ warnings reinforce each other
    # ============================================
    if warnings_count >= 2:
        # Check for reinforcing combinations
        headroom_warning = bars.get("headroom", {}).get("status") == "warning"
        true_peak_warning = bars.get("true_peak", {}).get("status") == "warning"
        lufs_warning = bars.get("lufs_(integrated)", {}).get("status") == "warning"
        plr_warning = bars.get("plr", {}).get("status") == "warning"
        
        # True Peak + LUFS both warning → True Peak goes critical
        if true_peak_warning and lufs_warning:
            if "true_peak" in bars:
                bars["true_peak"]["status"] = "critical"
                bars["true_peak"]["percentage"] = 40
                bars["true_peak"]["tooltip_es"] = tooltips["es"]["critical"]
                bars["true_peak"]["tooltip_en"] = tooltips["en"]["critical"]
        
        # Headroom + PLR both warning → Headroom goes critical
        if headroom_warning and plr_warning:
            if "headroom" in bars:
                bars["headroom"]["status"] = "critical"
                bars["headroom"]["percentage"] = 40
                bars["headroom"]["tooltip_es"] = tooltips["es"]["critical"]
                bars["headroom"]["tooltip_en"] = tooltips["en"]["critical"]
    
    return bars


# ----------------------------
# TEMPORAL ANALYSIS FUNCTIONS
# ----------------------------

def format_timestamp(seconds: float) -> str:
    """Convert seconds to MM:SS format."""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes}:{secs:02d}"


# ============================================
# TEMPORAL ANALYSIS FILTERS (v7.3.30)
# ============================================
# Constants for filtering noise in temporal analysis
MIN_REGION_DURATION = 8.0  # Ignore regions shorter than 8 seconds
INTRO_OUTRO_EXCLUDE = 5.0  # Exclude first and last 5 seconds

def filter_temporal_regions(
    regions: List[Dict[str, Any]], 
    track_duration: float,
    min_duration: float = MIN_REGION_DURATION,
    exclude_intro_outro: float = INTRO_OUTRO_EXCLUDE
) -> List[Dict[str, Any]]:
    """
    Filter temporal analysis regions to reduce noise.
    
    Removes:
    - Regions shorter than min_duration (default 8s)
    - Regions entirely within intro (first 5s) or outro (last 5s)
    
    Args:
        regions: List of region dicts with start_seconds, end_seconds
        track_duration: Total track duration in seconds
        min_duration: Minimum region duration to keep (default 8s)
        exclude_intro_outro: Seconds to exclude from start/end (default 5s)
    
    Returns:
        Filtered list of regions
    """
    if not regions:
        return []
    
    filtered = []
    
    for region in regions:
        start = region.get('start_seconds', 0)
        end = region.get('end_seconds', start)
        duration = end - start + 5.0  # Add window duration since end is window start
        
        # Skip if too short
        if duration < min_duration:
            continue
        
        # Skip if entirely in intro
        if end < exclude_intro_outro:
            continue
        
        # Skip if entirely in outro
        if start > (track_duration - exclude_intro_outro):
            continue
        
        # Adjust region boundaries if they extend into intro/outro
        adjusted_start = max(start, exclude_intro_outro)
        adjusted_end = min(end, track_duration - exclude_intro_outro)
        
        # Check if adjusted region is still long enough
        adjusted_duration = adjusted_end - adjusted_start + 5.0
        if adjusted_duration < min_duration:
            continue
        
        # Keep the region (with original timestamps for user reference)
        filtered.append(region)
    
    return filtered


def format_temporal_message(temporal_data: Dict[str, Any], parameter_name: str, lang: str = 'en') -> str:
    """
    Format temporal analysis data into human-readable message.
    Returns additional message to append to base message.
    """
    if not temporal_data or temporal_data.get("severity") == "none":
        return ""
    
    severity = temporal_data.get("severity")
    affected_pct = temporal_data.get("affected_percentage", 0)
    problem_moments = temporal_data.get("problem_moments", [])
    total_occurrences = temporal_data.get("total_occurrences", 0)
    
    lang = _pick_lang(lang)
    
    if severity == "widespread":
        if lang == 'es':
            return f"\n\n▶ Temporal: Presente durante la mayor parte del track ({affected_pct:.0f}% del tiempo)."
        else:
            return f"\n\n▶ Temporal: Present throughout most of the track ({affected_pct:.0f}% of the time)."
    
    elif severity == "localized" and problem_moments:
        # Format timestamps
        timestamps_str = ", ".join([m["time"] for m in problem_moments[:5]])
        
        if total_occurrences > 5:
            if lang == 'es':
                timestamps_str += f" (y {total_occurrences - 5} más)"
            else:
                timestamps_str += f" (and {total_occurrences - 5} more)"
        
        if lang == 'es':
            return f"\n\n▶ Temporal: Detectado en {total_occurrences} momento(s) específico(s): {timestamps_str}."
        else:
            return f"\n\n▶ Temporal: Detected in {total_occurrences} specific moment(s): {timestamps_str}."
    
    return ""


def analyze_true_peak_temporal(y: np.ndarray, sr: int, oversample: int = 4, threshold: float = 0.0) -> Dict[str, Any]:
    """
    Temporal analysis of true peak.
    Detects REGIONS where true peak exceeds threshold (not just individual moments).
    
    Returns:
    - severity: "localized" or "widespread"
    - affected_percentage: % of track with issue
    - problem_regions: list of (start, end) timestamp pairs
    - max_value: maximum true peak found
    """
    # Calculate true peak for entire track
    tp = oversampled_true_peak_db(y, os_factor=oversample)
    
    # Window-based analysis (5 second windows)
    window_duration = 5.0  # seconds
    window_samples = int(window_duration * sr)
    hop_samples = window_samples // 2  # 50% overlap
    
    problem_windows = []
    total_windows = 0
    
    for start in range(0, y.shape[1] - window_samples, hop_samples):
        end = start + window_samples
        window = y[:, start:end]
        
        window_tp = oversampled_true_peak_db(window, os_factor=oversample)
        total_windows += 1
        
        timestamp = start / sr
        
        if window_tp > threshold:
            problem_windows.append({
                "time_seconds": timestamp,
                "value": round(window_tp, 1)
            })
    
    # Now detect CONTINUOUS REGIONS from problem windows
    problem_regions = []
    
    if problem_windows:
        current_region_start = problem_windows[0]["time_seconds"]
        current_region_end = problem_windows[0]["time_seconds"]
        
        for i in range(1, len(problem_windows)):
            prev_time = problem_windows[i-1]["time_seconds"]
            curr_time = problem_windows[i]["time_seconds"]
            
            # If gap is less than 10 seconds, consider it same region
            if curr_time - prev_time <= 10.0:
                current_region_end = curr_time
            else:
                # Save previous region and start new one
                problem_regions.append({
                    "start": format_timestamp(current_region_start),
                    "end": format_timestamp(current_region_end),
                    "start_seconds": current_region_start,
                    "end_seconds": current_region_end
                })
                current_region_start = curr_time
                current_region_end = curr_time
        
        # Don't forget the last region
        problem_regions.append({
            "start": format_timestamp(current_region_start),
            "end": format_timestamp(current_region_end),
            "start_seconds": current_region_start,
            "end_seconds": current_region_end
        })
    
    affected_percentage = (len(problem_windows) / total_windows * 100) if total_windows > 0 else 0
    severity = "widespread" if affected_percentage >= 20 else "localized"
    
    return {
        "severity": severity,
        "affected_percentage": round(affected_percentage, 0),  # Round to integer for consistency
        "problem_regions": problem_regions,  # Now returns REGIONS not moments
        "total_regions": len(problem_regions),
        "max_value": round(tp, 1)
    }


def analyze_clipping_temporal(y: np.ndarray, sr: int, threshold: float = 0.999999) -> Dict[str, Any]:
    """
    Temporal analysis of clipping.
    Detects REGIONS where samples clip (not just individual moments).
    """
    # Find clipped samples
    clipped_samples = np.where(np.abs(y) >= threshold)[1]
    
    if len(clipped_samples) == 0:
        return {
            "severity": "none",
            "affected_percentage": 0.0,
            "problem_regions": [],
            "total_regions": 0
        }
    
    # Group clipped samples into moments (within 0.1s of each other)
    problem_moments = []
    last_time = -999
    
    for sample_idx in clipped_samples:
        time_seconds = sample_idx / sr
        
        # Only add if it's a new moment (>0.1s from last)
        if time_seconds - last_time > 0.1:
            problem_moments.append({"time_seconds": time_seconds})
            last_time = time_seconds
    
    # Now detect CONTINUOUS REGIONS from problem moments
    problem_regions = []
    
    if problem_moments:
        current_region_start = problem_moments[0]["time_seconds"]
        current_region_end = problem_moments[0]["time_seconds"]
        
        for i in range(1, len(problem_moments)):
            prev_time = problem_moments[i-1]["time_seconds"]
            curr_time = problem_moments[i]["time_seconds"]
            
            # If gap is less than 5 seconds, consider it same region (shorter for clipping)
            if curr_time - prev_time <= 5.0:
                current_region_end = curr_time
            else:
                # Save previous region and start new one
                problem_regions.append({
                    "start": format_timestamp(current_region_start),
                    "end": format_timestamp(current_region_end),
                    "start_seconds": current_region_start,
                    "end_seconds": current_region_end
                })
                current_region_start = curr_time
                current_region_end = curr_time
        
        # Don't forget the last region
        problem_regions.append({
            "start": format_timestamp(current_region_start),
            "end": format_timestamp(current_region_end),
            "start_seconds": current_region_start,
            "end_seconds": current_region_end
        })
    
    total_samples = y.shape[1]
    affected_percentage = (len(clipped_samples) / total_samples * 100)
    severity = "widespread" if affected_percentage >= 1.0 else "localized"
    
    return {
        "severity": severity,
        "affected_percentage": round(affected_percentage, 3),
        "problem_regions": problem_regions,
        "total_regions": len(problem_regions)
    }


def analyze_correlation_temporal(y: np.ndarray, sr: int, threshold: float = 0.5) -> Dict[str, Any]:
    """
    Temporal analysis of stereo correlation.
    Detects REGIONS where correlation is problematic (not just individual moments).
    
    v7.3.51: Changed threshold from 0.3 to 0.5 - only report regions that need attention
    v7.3.36: Added band_correlation for parity with chunked mode
    v7.3.30: Added filtering for:
    - Regions < 8 seconds (noise)
    - Intro (first 5s) and outro (last 5s)
    """
    if y.shape[0] < 2:
        return {"severity": "none", "affected_percentage": 0.0, "problem_regions": [], "total_regions": 0}
    
    # Calculate track duration for filtering
    track_duration = y.shape[1] / sr
    
    # Window-based analysis (5 second windows)
    window_duration = 5.0
    window_samples = int(window_duration * sr)
    hop_samples = window_samples // 2
    
    problem_windows = []
    total_windows = 0
    min_corr = 1.0
    
    for start in range(0, y.shape[1] - window_samples, hop_samples):
        end = start + window_samples
        window = y[:, start:end]
        
        corr = stereo_correlation(window)
        total_windows += 1
        
        if corr < min_corr:
            min_corr = corr
        
        timestamp = start / sr
        
        if corr < threshold:
            # v7.3.36: Calculate band correlation for problem windows
            band_corr = None
            if corr < 0.3:  # Only for significant issues
                band_corr = correlation_by_band(window, sr)
            
            problem_windows.append({
                "time_seconds": timestamp,
                "value": round(corr * 100, 0),
                "correlation": corr,
                "band_correlation": band_corr
            })
    
    # Now detect CONTINUOUS REGIONS from problem windows
    problem_regions = []
    
    if problem_windows:
        current_region_start = problem_windows[0]["time_seconds"]
        current_region_end = problem_windows[0]["time_seconds"]
        current_region_windows = [problem_windows[0]]
        
        for i in range(1, len(problem_windows)):
            prev_time = problem_windows[i-1]["time_seconds"]
            curr_time = problem_windows[i]["time_seconds"]
            
            # If gap is less than 10 seconds, consider it same region
            if curr_time - prev_time <= 10.0:
                current_region_end = curr_time
                current_region_windows.append(problem_windows[i])
            else:
                # Save previous region and start new one
                # v7.3.36: Calculate average correlation and band_correlation for region
                avg_corr = sum(w['correlation'] for w in current_region_windows) / len(current_region_windows)
                
                # Aggregate band correlations
                band_corrs = [w.get('band_correlation') for w in current_region_windows if w.get('band_correlation')]
                avg_band_corr = None
                if band_corrs:
                    avg_band_corr = {}
                    for band in ['sub_bass', 'bass_mid', 'mid', 'mid_high', 'high']:
                        values = [bc[band] for bc in band_corrs if band in bc and bc[band] is not None]
                        if values:
                            avg_band_corr[band] = sum(values) / len(values)
                
                # v7.3.51: Classify issue type - only < 0.5 is reported
                # High correlation is NOT a problem
                if avg_corr >= 0.5:
                    issue_type = 'healthy'  # Won't be included in report
                elif avg_corr >= 0.3 and avg_corr < 0.5:
                    issue_type = 'medium_low'
                elif avg_corr >= 0.0 and avg_corr < 0.3:
                    issue_type = 'very_low'
                elif avg_corr >= -0.2 and avg_corr < 0.0:
                    issue_type = 'negative'
                else:
                    issue_type = 'negative_severe'
                
                problem_regions.append({
                    "start": format_timestamp(current_region_start),
                    "end": format_timestamp(current_region_end),
                    "start_seconds": current_region_start,
                    "end_seconds": current_region_end,
                    "avg_correlation": avg_corr,
                    "issue": issue_type,
                    "band_correlation": avg_band_corr
                })
                current_region_start = curr_time
                current_region_end = curr_time
                current_region_windows = [problem_windows[i]]
        
        # Don't forget the last region
        avg_corr = sum(w['correlation'] for w in current_region_windows) / len(current_region_windows)
        
        # Aggregate band correlations for last region
        band_corrs = [w.get('band_correlation') for w in current_region_windows if w.get('band_correlation')]
        avg_band_corr = None
        if band_corrs:
            avg_band_corr = {}
            for band in ['sub_bass', 'bass_mid', 'mid', 'mid_high', 'high']:
                values = [bc[band] for bc in band_corrs if band in bc and bc[band] is not None]
                if values:
                    avg_band_corr[band] = sum(values) / len(values)
        
        # v7.3.51: Classify issue type - only < 0.5 is reported
        if avg_corr >= 0.5:
            issue_type = 'healthy'  # Won't be included in report
        elif avg_corr >= 0.3 and avg_corr < 0.5:
            issue_type = 'medium_low'
        elif avg_corr >= 0.0 and avg_corr < 0.3:
            issue_type = 'very_low'
        elif avg_corr >= -0.2 and avg_corr < 0.0:
            issue_type = 'negative'
        else:
            issue_type = 'negative_severe'
        
        problem_regions.append({
            "start": format_timestamp(current_region_start),
            "end": format_timestamp(current_region_end),
            "start_seconds": current_region_start,
            "end_seconds": current_region_end,
            "avg_correlation": avg_corr,
            "issue": issue_type,
            "band_correlation": avg_band_corr
        })
    
    # v7.3.51: Filter out 'healthy' regions (correlation >= 0.5 is not a problem)
    problem_regions = [r for r in problem_regions if r.get('issue') != 'healthy']
    
    # v7.3.30: Filter regions (min duration 8s, exclude intro/outro 5s)
    problem_regions = filter_temporal_regions(problem_regions, track_duration)
    
    affected_percentage = (len(problem_windows) / total_windows * 100) if total_windows > 0 else 0
    severity = "widespread" if affected_percentage >= 20 else "localized"
    
    # If all regions were filtered out, set severity to none
    if not problem_regions:
        severity = "none"
    
    return {
        "severity": severity,
        "affected_percentage": round(affected_percentage, 1),
        "problem_regions": problem_regions,
        "total_regions": len(problem_regions),
        "min_value": round(min_corr * 100, 0)
    }


def analyze_lr_balance_temporal(y: np.ndarray, sr: int, threshold: float = 3.0) -> Dict[str, Any]:
    """
    Temporal analysis of L/R balance.
    Detects REGIONS where balance exceeds threshold (not just individual moments).
    
    v7.3.36: Added avg_balance_db, side, severity for parity with chunked mode
    v7.3.30: Added filtering for:
    - Regions < 8 seconds (noise)
    - Intro (first 5s) and outro (last 5s)
    """
    if y.shape[0] < 2:
        return {"severity": "none", "affected_percentage": 0.0, "problem_regions": [], "total_regions": 0}
    
    # Calculate track duration for filtering
    track_duration = y.shape[1] / sr
    
    # Window-based analysis (5 second windows)
    window_duration = 5.0
    window_samples = int(window_duration * sr)
    hop_samples = window_samples // 2
    
    problem_windows = []
    total_windows = 0
    max_imbalance = 0.0
    
    for start in range(0, y.shape[1] - window_samples, hop_samples):
        end = start + window_samples
        window = y[:, start:end]
        
        balance = calculate_lr_balance(window)
        total_windows += 1
        
        if abs(balance) > abs(max_imbalance):
            max_imbalance = balance
        
        timestamp = start / sr
        
        if abs(balance) > threshold:
            problem_windows.append({
                "time_seconds": timestamp,
                "value": round(balance, 1),
                "balance_db": balance,
                "side": "left" if balance > 0 else "right",
                "severity": "critical" if abs(balance) > 3.0 else "warning"
            })
    
    # Now detect CONTINUOUS REGIONS from problem windows
    problem_regions = []
    
    if problem_windows:
        current_region_start = problem_windows[0]["time_seconds"]
        current_region_end = problem_windows[0]["time_seconds"]
        current_region_windows = [problem_windows[0]]
        
        for i in range(1, len(problem_windows)):
            prev_time = problem_windows[i-1]["time_seconds"]
            curr_time = problem_windows[i]["time_seconds"]
            
            # If gap is less than 10 seconds, consider it same region
            if curr_time - prev_time <= 10.0:
                current_region_end = curr_time
                current_region_windows.append(problem_windows[i])
            else:
                # Save previous region and start new one
                avg_balance = sum(w['balance_db'] for w in current_region_windows) / len(current_region_windows)
                max_severity = max(w['severity'] for w in current_region_windows)
                
                problem_regions.append({
                    "start": format_timestamp(current_region_start),
                    "end": format_timestamp(current_region_end),
                    "start_seconds": current_region_start,
                    "end_seconds": current_region_end,
                    "avg_balance_db": avg_balance,
                    "side": "left" if avg_balance > 0 else "right",
                    "severity": max_severity
                })
                current_region_start = curr_time
                current_region_end = curr_time
                current_region_windows = [problem_windows[i]]
        
        # Don't forget the last region
        avg_balance = sum(w['balance_db'] for w in current_region_windows) / len(current_region_windows)
        max_severity = max(w['severity'] for w in current_region_windows)
        
        problem_regions.append({
            "start": format_timestamp(current_region_start),
            "end": format_timestamp(current_region_end),
            "start_seconds": current_region_start,
            "end_seconds": current_region_end,
            "avg_balance_db": avg_balance,
            "side": "left" if avg_balance > 0 else "right",
            "severity": max_severity
        })
    
    # v7.3.30: Filter regions (min duration 8s, exclude intro/outro 5s)
    problem_regions = filter_temporal_regions(problem_regions, track_duration)
    
    affected_percentage = (len(problem_windows) / total_windows * 100) if total_windows > 0 else 0
    severity = "widespread" if affected_percentage >= 20 else "localized"
    
    # If all regions were filtered out, set severity to none
    if not problem_regions:
        severity = "none"
    
    return {
        "severity": severity,
        "affected_percentage": round(affected_percentage, 1),
        "problem_regions": problem_regions,
        "total_regions": len(problem_regions),
        "max_imbalance": round(max_imbalance, 1)
    }


def analyze_ms_ratio_temporal(y: np.ndarray, sr: int, low_threshold: float = 0.05, high_threshold: float = 1.5) -> Dict[str, Any]:
    """
    Temporal analysis of M/S ratio.
    Detects REGIONS where M/S ratio is problematic (too low or too high).
    
    v7.3.36: Added avg_ms_ratio, issue, severity for parity with chunked mode
    v7.3.30: Added filtering for:
    - Regions < 8 seconds (noise)
    - Intro (first 5s) and outro (last 5s)
    """
    if y.shape[0] < 2:
        return {"severity": "none", "affected_percentage": 0.0, "problem_regions": [], "total_regions": 0}
    
    # Calculate track duration for filtering
    track_duration = y.shape[1] / sr
    
    # Window-based analysis (5 second windows)
    window_duration = 5.0
    window_samples = int(window_duration * sr)
    hop_samples = window_samples // 2
    
    problem_windows = []
    total_windows = 0
    min_ms = 999.0
    max_ms = 0.0
    
    for start in range(0, y.shape[1] - window_samples, hop_samples):
        end = start + window_samples
        window = y[:, start:end]
        
        ms_ratio, _, _ = calculate_ms_ratio(window)
        total_windows += 1
        
        if ms_ratio < min_ms:
            min_ms = ms_ratio
        if ms_ratio > max_ms:
            max_ms = ms_ratio
        
        is_problem = ms_ratio < low_threshold or ms_ratio > high_threshold
        
        timestamp = start / sr
        
        if is_problem:
            problem_type = "mono" if ms_ratio < low_threshold else "too_wide"
            problem_windows.append({
                "time_seconds": timestamp,
                "value": round(ms_ratio, 2),
                "ms_ratio": ms_ratio,
                "issue": problem_type,
                "severity": "warning"
            })
    
    # Now detect CONTINUOUS REGIONS from problem windows
    problem_regions = []
    
    if problem_windows:
        current_region_start = problem_windows[0]["time_seconds"]
        current_region_end = problem_windows[0]["time_seconds"]
        current_region_windows = [problem_windows[0]]
        
        for i in range(1, len(problem_windows)):
            prev_time = problem_windows[i-1]["time_seconds"]
            curr_time = problem_windows[i]["time_seconds"]
            
            # If gap is less than 10 seconds, consider it same region
            if curr_time - prev_time <= 10.0:
                current_region_end = curr_time
                current_region_windows.append(problem_windows[i])
            else:
                # Save previous region and start new one
                avg_ms = sum(w['ms_ratio'] for w in current_region_windows) / len(current_region_windows)
                issue_type = current_region_windows[0]['issue']  # Use first window's issue type
                
                problem_regions.append({
                    "start": format_timestamp(current_region_start),
                    "end": format_timestamp(current_region_end),
                    "start_seconds": current_region_start,
                    "end_seconds": current_region_end,
                    "avg_ms_ratio": avg_ms,
                    "issue": issue_type,
                    "severity": "warning"
                })
                current_region_start = curr_time
                current_region_end = curr_time
                current_region_windows = [problem_windows[i]]
        
        # Don't forget the last region
        avg_ms = sum(w['ms_ratio'] for w in current_region_windows) / len(current_region_windows)
        issue_type = current_region_windows[0]['issue']
        
        problem_regions.append({
            "start": format_timestamp(current_region_start),
            "end": format_timestamp(current_region_end),
            "start_seconds": current_region_start,
            "end_seconds": current_region_end,
            "avg_ms_ratio": avg_ms,
            "issue": issue_type,
            "severity": "warning"
        })
    
    # v7.3.30: Filter regions (min duration 8s, exclude intro/outro 5s)
    problem_regions = filter_temporal_regions(problem_regions, track_duration)
    
    affected_percentage = (len(problem_windows) / total_windows * 100) if total_windows > 0 else 0
    severity = "widespread" if affected_percentage >= 20 else "localized"
    
    # If all regions were filtered out, set severity to none
    if not problem_regions:
        severity = "none"
    
    return {
        "severity": severity,
        "affected_percentage": round(affected_percentage, 1),
        "problem_regions": problem_regions,
        "total_regions": len(problem_regions),
        "min_ms": round(min_ms, 2),
        "max_ms": round(max_ms, 2)
    }


def evaluate_stereo_field_comprehensive(corr: float, ms_ratio: float, lr_balance: float, lang: str = 'en', strict: bool = False) -> Tuple[str, str]:
    """
    Comprehensive stereo field evaluation considering:
    - Correlation (phase relationship)
    - M/S Ratio (stereo width)
    - L/R Balance (channel balance)
    
    Returns enhanced message with contextual information.
    In strict mode, adds commercial delivery standards.
    """
    lang = _pick_lang(lang)
    
    # Get base correlation status and message
    base_status, base_message, _ = _status_stereo_en(corr) if lang == 'en' else _status_stereo_es(corr)
    
    # Build additional context
    context_parts = []
    
    # Check M/S Ratio
    if ms_ratio < 0.05:
        # M/S ratio muy bajo sugiere poca información Side, PERO debemos considerar correlación también
        # CORRELACIÓN: +1.0 = mono puro, 0.97-1.0 = casi mono, 0.7-0.95 = estéreo saludable
        if corr > 0.97:  # Solo si correlación es MUY alta (>97%) = verdaderamente mono
            if lang == 'es':
                context_parts.append("⚠️ La mezcla no tiene información estéreo (prácticamente mono). ¿Es intencional? Verifica si exportaste en mono por error.")
            else:
                context_parts.append("⚠️ Mix has no stereo information (practically mono). Is this intentional? Check if you exported in mono by mistake.")
        elif corr > 0.90:
            # Correlación muy alta pero no extrema = muy centrado
            if lang == 'es':
                context_parts.append(f"ℹ️ Mezcla muy centrada (corr: {corr:.2f}, M/S: {ms_ratio:.2f}). Predomina contenido mono con estéreo sutil.")
            else:
                context_parts.append(f"ℹ️ Very centered mix (corr: {corr:.2f}, M/S: {ms_ratio:.2f}). Mono content predominates with subtle stereo.")
        else:
            # Correlación moderada (70-90%) pero M/S bajo = estéreo centrado pero presente
            if lang == 'es':
                context_parts.append(f"ℹ️ Imagen estéreo centrada (corr: {corr:.2f}, M/S: {ms_ratio:.2f}). Buena mono-compatibilidad con información estéreo presente.")
            else:
                context_parts.append(f"ℹ️ Centered stereo image (corr: {corr:.2f}, M/S: {ms_ratio:.2f}). Good mono compatibility with stereo information present.")
    elif ms_ratio > 1.5:
        if lang == 'es':
            context_parts.append(f"⚠️ Estéreo muy ancho (M/S: {ms_ratio:.2f}). Puede sonar débil en parlantes o mono. Considera reducir stereo widening.")
        else:
            context_parts.append(f"⚠️ Very wide stereo (M/S: {ms_ratio:.2f}). May sound weak on speakers or mono. Consider reducing stereo widening.")
    
    # Check L/R Balance
    if abs(lr_balance) > 3.0:
        side = "izquierdo" if lr_balance > 0 else "derecho" if lang == 'es' else "left" if lr_balance > 0 else "right"
        if lang == 'es':
            context_parts.append(f"⚠️ Desbalance L/R: {abs(lr_balance):.1f} dB más energía en canal {side}. Verifica paneo y volumen de canales.")
        else:
            context_parts.append(f"⚠️ L/R imbalance: {abs(lr_balance):.1f} dB more energy in {side} channel. Check panning and channel volumes.")
    
    # Combine base message with context
    if context_parts:
        enhanced_message = base_message + "\n\n" + "\n".join(context_parts)
    else:
        # Add M/S and LR info - with commercial standards in strict mode
        if strict:
            if lang == 'es':
                enhanced_message = (base_message + 
                    f" M/S Ratio: {ms_ratio:.2f} (rango comercial: 0.3-0.7), "
                    f"Balance L/R: {lr_balance:+.1f} dB (tolerancia profesional: ±3 dB).")
            else:
                enhanced_message = (base_message + 
                    f" M/S Ratio: {ms_ratio:.2f} (commercial range: 0.3-0.7), "
                    f"L/R Balance: {lr_balance:+.1f} dB (professional tolerance: ±3 dB).")
        else:
            if lang == 'es':
                enhanced_message = base_message + f" M/S Ratio: {ms_ratio:.2f} (balanceado), Balance L/R: {lr_balance:+.1f} dB (centrado)."
            else:
                enhanced_message = base_message + f" M/S Ratio: {ms_ratio:.2f} (balanced), L/R Balance: {lr_balance:+.1f} dB (centered)."
    
    return base_status, enhanced_message


def band_balance_db(y: np.ndarray, sr: int) -> Dict[str, float]:
    """
    Calcula niveles por banda (dB) usando análisis perceptual con K-weighting.
    También calcula porcentajes de energía por banda para mejor comprensión.
    
    Usa K-weighting (ITU-R BS.1770) para match con LUFS y percepción humana.
    
    Para estéreo, promedia la señal temporal (aceptable para análisis espectral).
    Nota: A diferencia de LUFS, para análisis de frecuencias promediar la señal
    es una práctica estándar ya que estamos midiendo contenido espectral, no loudness.
    
    Bandas:
      Low: 20–250 Hz
      Mid: 250–4000 Hz
      High: 4000–min(20000, Nyquist) Hz
    """
    audio = y.mean(axis=0) if y.shape[0] > 1 else y[0]
    audio = audio.astype(np.float64)

    # Parámetros STFT optimizados
    n_fft = 8192  # Mayor resolución para bajos
    hop = 2048
    
    S = librosa.stft(audio, n_fft=n_fft, hop_length=hop, window="hann", center=True)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
    
    # Aplicar K-weighting (ITU-R BS.1770 simplificado)
    #Highpass ~38 Hz + Highshelf ~1.5kHz
    k_weight = np.ones_like(freqs)
    
    # Stage 1: Highpass filter (shelf at ~38 Hz)
    f_hp = 38.0
    for i, f in enumerate(freqs):
        if f > 0:
            # Simplified highpass response
            k_weight[i] *= (f**2) / (f**2 + f_hp**2)
    
    # Stage 2: High-frequency shelf boost (~+4dB at 1.5kHz and above)
    f_shelf = 1500.0
    for i, f in enumerate(freqs):
        if f > 0:
            # Simplified high shelf
            shelf_gain = 1.0 + 0.58 * (f**2) / (f**2 + f_shelf**2)  # ~+4dB boost
            k_weight[i] *= shelf_gain
    
    # Calcular magnitud con K-weighting aplicado
    magnitude = np.abs(S) * k_weight[:, np.newaxis]
    
    # Usar percentil 75 en vez de mean para mejor representación
    # Esto evita que bass sostenido domine sobre transientes
    # Usar múltiples percentiles para mayor robustez en tracks comprimidos
    # Percentil 60, 75, 90 capturan mejor la distribución real
    P60 = np.percentile(magnitude**2, 60, axis=1)
    P75 = np.percentile(magnitude**2, 75, axis=1)
    P90 = np.percentile(magnitude**2, 90, axis=1)
    # Promedio ponderado: más peso a P75 (standard), menos a extremos
    P = (P60 * 0.2 + P75 * 0.6 + P90 * 0.2)
    
    nyq = sr / 2.0
    hi_max = min(20000.0, nyq)

    def band_power(f_lo: float, f_hi: float) -> float:
        idx = np.where((freqs >= f_lo) & (freqs < f_hi))[0]
        if idx.size == 0:
            return 1e-12
        # Integrar potencia ponderada con floor mínimo
        power = float(np.sum(P[idx]))
        return max(power, 1e-12)  # Garantizar mínimo detectable

    low_p = band_power(20.0, 250.0)
    mid_p = band_power(250.0, 4000.0)
    high_p = band_power(4000.0, hi_max)

    # 6-band spectral breakdown for v1.5/v2 data capture
    sub_p = band_power(20.0, 60.0)
    low6_p = band_power(60.0, 250.0)
    low_mid_p = band_power(250.0, 500.0)
    mid6_p = band_power(500.0, 2000.0)
    high_mid_p = band_power(2000.0, 6000.0)
    high6_p = band_power(6000.0, hi_max)

    # Calcular dB con floor de -120 dB (silence digital standard)
    def power_to_db(power: float) -> float:
        if power <= 0 or power < 1e-12:
            return -120.0
        try:
            return 10.0 * math.log10(power)
        except (ValueError, ZeroDivisionError):
            return -120.0
    
    low_db = power_to_db(low_p)
    mid_db = power_to_db(mid_p)
    high_db = power_to_db(high_p)
    
    # Calculate percentages for easier understanding
    total_energy = low_p + mid_p + high_p
    if total_energy > 1e-12:
        # Calcular porcentajes raw
        low_percent_raw = (low_p / total_energy) * 100.0
        mid_percent_raw = (mid_p / total_energy) * 100.0
        high_percent_raw = (high_p / total_energy) * 100.0
        
        # Normalizar para que sumen EXACTAMENTE 100%
        # (elimina errores de redondeo que pueden causar 99.9% o 100.1%)
        total_raw = low_percent_raw + mid_percent_raw + high_percent_raw
        low_percent = (low_percent_raw / total_raw) * 100.0
        mid_percent = (mid_percent_raw / total_raw) * 100.0
        high_percent = (high_percent_raw / total_raw) * 100.0
        
        # Sanitizar (por si acaso)
        low_percent = max(0.0, min(100.0, low_percent))
        mid_percent = max(0.0, min(100.0, mid_percent))
        high_percent = max(0.0, min(100.0, high_percent))
    else:
        # v7.4.0 FIX: Return 0.0 for silent files (not 33.33%) with is_silent flag
        return {
            "low_db": -120.0,
            "mid_db": -120.0,
            "high_db": -120.0,
            "d_low_mid_db": 0.0,
            "d_high_mid_db": 0.0,
            "low_percent": 0.0,
            "mid_percent": 0.0,
            "high_percent": 0.0,
            "spectral_6band": {
                "sub": 0.0, "low": 0.0, "low_mid": 0.0,
                "mid": 0.0, "high_mid": 0.0, "high": 0.0
            },
            "is_silent": True,
            "message_es": "Archivo silencioso o con nivel muy bajo para analizar",
            "message_en": "Silent file or level too low to analyze"
        }

    # 6-band spectral percentages
    total_6 = sub_p + low6_p + low_mid_p + mid6_p + high_mid_p + high6_p
    if total_6 > 1e-12:
        s6 = {
            "sub": round((sub_p / total_6) * 100.0, 2),
            "low": round((low6_p / total_6) * 100.0, 2),
            "low_mid": round((low_mid_p / total_6) * 100.0, 2),
            "mid": round((mid6_p / total_6) * 100.0, 2),
            "high_mid": round((high_mid_p / total_6) * 100.0, 2),
            "high": round((high6_p / total_6) * 100.0, 2)
        }
    else:
        s6 = {"sub": 0.0, "low": 0.0, "low_mid": 0.0, "mid": 0.0, "high_mid": 0.0, "high": 0.0}

    return {
        "low_db": low_db,
        "mid_db": mid_db,
        "high_db": high_db,
        "d_low_mid_db": low_db - mid_db,
        "d_high_mid_db": high_db - mid_db,
        "low_percent": low_percent,
        "mid_percent": mid_percent,
        "high_percent": high_percent,
        "spectral_6band": s6,
        "is_silent": False
    }


def calculate_energy_curve(y: np.ndarray, sr: int, window_ms: int = 500) -> Dict[str, Any]:
    """
    Calculate normalized energy curve for the entire track.
    Returns one RMS value per window_ms segment, normalized 0-1.
    Also returns peak energy position as percentage of track length.
    """
    audio = y.mean(axis=0) if y.ndim > 1 and y.shape[0] > 1 else (y[0] if y.ndim > 1 else y)
    audio = audio.astype(np.float64)

    window_samples = int(sr * window_ms / 1000)
    if window_samples < 1:
        window_samples = 1

    num_windows = max(1, len(audio) // window_samples)
    rms_values = []

    for i in range(num_windows):
        start = i * window_samples
        end = min(start + window_samples, len(audio))
        segment = audio[start:end]
        rms = float(np.sqrt(np.mean(segment ** 2)))
        rms_values.append(rms)

    if not rms_values:
        return {"energy_curve": [], "peak_energy_time_pct": 0.0, "energy_distribution": {"low": 0.0, "mid": 0.0, "high": 0.0}}

    max_rms = max(rms_values)
    if max_rms > 0:
        normalized = [round(v / max_rms, 4) for v in rms_values]
    else:
        normalized = [0.0] * len(rms_values)

    # Peak energy position as % of track
    peak_idx = rms_values.index(max_rms)
    peak_energy_time_pct = round((peak_idx / len(rms_values)) * 100.0, 1) if len(rms_values) > 0 else 0.0

    # Energy distribution: split track into 3 equal parts
    third = max(1, len(rms_values) // 3)
    low_energy = sum(rms_values[:third])
    mid_energy = sum(rms_values[third:2*third])
    high_energy = sum(rms_values[2*third:])
    total_e = low_energy + mid_energy + high_energy
    if total_e > 0:
        energy_dist = {
            "low": round((low_energy / total_e) * 100.0, 1),
            "mid": round((mid_energy / total_e) * 100.0, 1),
            "high": round((high_energy / total_e) * 100.0, 1)
        }
    else:
        energy_dist = {"low": 0.0, "mid": 0.0, "high": 0.0}

    return {
        "energy_curve": normalized,
        "peak_energy_time_pct": peak_energy_time_pct,
        "energy_distribution": energy_dist
    }


def calculate_categorical_flags(peak: float, tp: float, plr, corr: float, ms_ratio: float) -> Dict[str, Any]:
    """
    Derive categorical boolean/text flags from existing metrics.
    These are for analytics and quick filtering, not for display.
    """
    headroom_ok = peak <= -3.0
    true_peak_safe = tp <= -1.0
    dynamic_ok = plr is not None and plr >= 8.0

    # Stereo risk assessment
    if ms_ratio < 0.05 and corr > 0.95:
        stereo_risk = "high"
    elif ms_ratio < 0.15 or corr > 0.90 or corr < 0.1:
        stereo_risk = "mild"
    else:
        stereo_risk = "none"

    return {
        "headroom_ok": headroom_ok,
        "true_peak_safe": true_peak_safe,
        "dynamic_ok": dynamic_ok,
        "stereo_risk": stereo_risk
    }


# ----------------------------
# Reglas / estados
# ----------------------------
def _status_headroom_en(peak_db: float, strict: bool = False) -> Tuple[str, str, float]:
    """
    English headroom evaluation using UNIFIED scoring engine.
    Now uses calculate_headroom_score() for language-neutral consistency.
    """
    # TRACK 1: Calculate (language-neutral)
    status, score = calculate_headroom_score(peak_db, strict)
    
    # TRACK 2: Format message (Matías Voice - English)
    mode = "strict" if strict else "normal"
    
    messages = {
        "critical": "Too little headroom / clipping risk. Use a Gain/Utility plugin AFTER your master bus chain (lower 6-8 dB), then re-export. This preserves your mix balance and plugin sound.",
        "warning": {
            "strict": "Mix is running hot. Lower ~1–2 dB to leave comfortable headroom.",
            "normal": "Mix is a bit hot. Lower ~1–2 dB to leave margin.",
        },
        "perfect": {
            "strict": "Ideal headroom for commercial mastering delivery.",
            "normal": f"Headroom of {abs(peak_db):.1f} dB is exactly what I'm looking for - gives me room to work with EQ, compression and limiting without compromising quality.",
        },
        "pass": {
            "strict": "Headroom is acceptable for mastering delivery.",
            "normal": "Headroom is appropriate for mastering.",
        },
        "conservative": "Very conservative level. Not wrong, but you could raise ~1–3 dB if desired.",
    }
    
    # Select appropriate message
    if status in ["warning", "perfect", "pass"]:
        message = messages[status][mode]
    else:
        message = messages[status]
    
    return status, message, score

def _status_true_peak_en(tp_db: float, strict: bool = False) -> Tuple[str, str, float, bool]:
    """
    English true peak evaluation using UNIFIED scoring engine.
    Now uses calculate_true_peak_score() for language-neutral consistency.
    Returns (status, message, score, hard_fail).
    """
    # TRACK 1: Calculate (language-neutral)
    status, score, hard_fail = calculate_true_peak_score(tp_db, strict)
    
    # TRACK 2: Format message (Matías Voice - English)
    mode = "strict" if strict else "normal"
    
    messages = {
        "critical": "True peak is dangerously high. Lower the level and re-export to give mastering room to work.",
        "warning": {
            "strict": "True peak should be ≤ -3.0 dBTP for professional commercial delivery.",
            "normal": "True peak is close to the limit. Aim for ≤ -1.0 dBTP to give mastering flexibility.",
        },
        "perfect": "True peak is safe for mastering. Provides enough margin for processing without quality compromises.",
        "pass": {
            "strict": "True peak is acceptable, but -2 dBTP or better is ideal for clients/labels.",
            "normal": "True peak is safe for mastering.",
        },
    }
    
    # Select appropriate message
    if status in ["warning", "pass"]:
        message = messages[status][mode]
    else:
        message = messages[status]
    
    return status, message, score, hard_fail

def _status_lufs_en(lufs: Optional[float], method: str, is_reliable: bool) -> Tuple[str, str, float]:
    """Evaluate LUFS with reliability consideration."""
    if lufs is None:
        return "info", "Could not calculate LUFS.", 0.0
    
    if not is_reliable:
        return "info", f"File too short (<{MIN_DURATION_FOR_LUFS}s). LUFS may not be reliable.", 0.3
    
    if method == "approx_rms_dbfs":
        return "pass", "Informational level (approx RMS). Install 'pyloudnorm' for real LUFS.", 0.2
    
    # Real LUFS: for mixes it's informational, not prescriptive
    # Range -15 to -35 LUFS is completely normal for pre-mastering mixes
    if lufs > -10.0:
        return "warning", "Mix is very loud. Possible over-limiting on the bus. Check PLR.", 0.3
    if lufs < -40.0:
        return "info", "Level very low; check for excessive silence or incorrect export.", 0.5
    
    # Everything between -10 and -40 LUFS is valid for mixes
    return "perfect", "Loudness is informational; final level is set during mastering.", 1.0

def _status_plr_en(plr: Optional[float], has_real_lufs: bool, strict: bool = False) -> Tuple[str, str, float]:
    """
    English PLR evaluation using UNIFIED scoring engine.
    Now uses calculate_plr_score() for language-neutral consistency.
    """
    if not has_real_lufs or plr is None:
        return "info", "PLR is available only with real LUFS (install 'pyloudnorm').", 0.0
    
    # TRACK 1: Calculate (language-neutral)
    status, score = calculate_plr_score(plr, has_real_lufs, strict)
    
    # TRACK 2: Format message (Matías Voice - English)
    mode = "strict" if strict else "normal"
    
    messages = {
        "perfect": {
            "strict": "Excellent PLR: optimal dynamics for commercial delivery.",
            "normal": f"Dynamics are very well preserved (PLR: {plr:.1f} dB). You haven't over-limited on the master bus, which gives me plenty of room to work the final loudness without sacrificing musicality.",
        },
        "pass": {
            "strict": "Good PLR for commercial, but ≥14 dB is ideal for maximum flexibility.",
            "normal": "Adequate PLR for mastering.",
        },
        "warning": f"The mix may already be quite limited (PLR: {plr:.1f} dB). Check master bus limiters/compressors. If you like their color, keep them but adjust so they don't reduce gain (raise threshold/ceiling). This preserves the character while recovering dynamics.",
        "critical": f"PLR very low ({plr:.1f} dB): over-compressed/limited. Remove limiters or adjust them to pass audio without gain reduction (for color only). Alternatively, use less compression on group buses.",
    }
    
    # Select appropriate message
    if status in ["perfect", "pass"]:
        message = messages[status][mode]
    else:
        message = messages[status]
    
    return status, message, score

def _status_stereo_en(corr: float, strict: bool = False) -> Tuple[str, str, float]:
    """
    English stereo correlation evaluation using UNIFIED scoring engine.
    Now uses calculate_stereo_score() for language-neutral consistency.
    """
    # TRACK 1: Calculate (language-neutral)
    status, score = calculate_stereo_score(corr, strict)
    
    # TRACK 2: Format message (Matías Voice - English)
    # v7.4.0: Added "poor" status for correlation 0.1-0.3
    if status == "poor":
        # Low positive correlation - possible phase issues
        message = f"Low stereo correlation ({corr:.0%}). Possible phase issues detected. Check in mono for volume loss. Review wideners, chorus effects, or stereo plugins."
    elif status == "warning":
        # Reduced correlation - worth checking
        message = f"Reduced stereo correlation ({corr:.0%}). Check mono compatibility. Review stereo widening plugins or M/S processing."
    elif status == "critical":
        message = f"Very low stereo correlation ({corr:.0%}). Significant mono compatibility issues expected. Check stereo plugins, channel polarity, or phase relationships."
    elif status == "catastrophic":
        message = f"SEVERE: Phase cancellation detected ({corr:.0%}). The mix will lose significant content in mono. Check for: inverted channels, phase-inverted plugins, or M/S processing errors."
    elif status == "perfect":
        message = "Excellent stereo correlation (mono compatible). The mix will translate well on all playback systems."
    else:  # pass
        message = "Good stereo correlation. The mix maintains a healthy stereo image with good mono compatibility."

    return status, message, score

def _status_freq_en(fb: Dict[str, float], genre: Optional[str] = None, strict: bool = False) -> Tuple[str, str, float]:
    """
    Evaluate frequency balance relative to midrange using dB deltas.
    Percentages are informational only (arrangement-dependent).
    
    UNIFIED THRESHOLDS (language-neutral): Match ES for consistency.
    """
    dL = fb["d_low_mid_db"]
    dH = fb["d_high_mid_db"]

    # Normal, wide "mix-for-mastering" ranges (UNIFIED)
    low_perfect = (-6.0, 6.0)
    low_pass = (-9.0, 9.0)
    high_perfect = (-15.0, 10.0)  # UNIFIED: was (-12.0, 6.0)
    high_pass = (-18.0, 12.0)      # UNIFIED: was (-15.0, 9.0)

    # Strict mode: slightly narrower tolerance (commercial delivery)
    if strict:
        low_perfect = (-5.0, 5.0)
        low_pass = (-8.0, 8.0)
        high_perfect = (-12.0, 8.0)   # UNIFIED: was (-11.0, 5.0)
        high_pass = (-15.0, 10.0)     # UNIFIED: was (-14.0, 8.0)

    def in_range(x, r):
        return r[0] <= x <= r[1]

    if in_range(dL, low_perfect) and in_range(dH, high_perfect):
        return "perfect", "Tonal balance is healthy for mastering.", 1.0
    if in_range(dL, low_pass) and in_range(dH, high_pass):
        return "pass", "Tonal balance is generally healthy for mastering.", 0.7

    # Outside pass range: warn, but don't over-penalize (can be artistic)
    msg_parts = []
    if dL > low_pass[1]:
        msg_parts.append("Low end is heavy vs mids")
    elif dL < low_pass[0]:
        msg_parts.append("Low end is light vs mids")
    if dH > high_pass[1]:
        msg_parts.append("High end is bright vs mids")
    elif dH < high_pass[0]:
        msg_parts.append("High end is dark vs mids")

    msg = "Tonal balance shows some character; check translation across systems. (" + ", ".join(msg_parts) + ")." if msg_parts else "Tonal balance shows some character; check translation across systems."
    return "warning", msg, 0.4

def _status_crest_factor_en(crest: float) -> Tuple[str, str, float]:
    """Evaluate crest factor when LUFS is not available."""
    if crest >= 18.0:
        return "perfect", "Excellent dynamics preserved (high crest factor).", 1.0
    if crest >= 14.0:
        return "pass", "Good dynamics for mastering.", 0.7
    if crest >= 10.0:
        return "warning", "Dynamics somewhat compressed. Check bus compression.", 0.4
    return "critical", "Dynamics very compressed/limited. Reduce master bus processing.", -0.5

def _status_dc_offset_en(dc_data: Dict[str, Any]) -> Tuple[str, str, float]:
    """Evaluate DC offset."""
    if not dc_data["detected"]:
        return "perfect", "No DC offset detected.", 1.0
    
    max_offset = dc_data["max_offset"]
    if max_offset > 0.05:
        return "warning", f"Significant DC offset ({max_offset:.3f}). Apply DC offset removal before exporting.", 0.3
    return "pass", f"Minor DC offset detected ({max_offset:.3f}). Consider cleaning.", 0.6


# ----------------------------
# Scoring / reporte
# ----------------------------
WEIGHTS = {
    "Headroom": 0.35,              # Crítico - aumentado
    "True Peak": 0.35,             # Crítico - aumentado
    "LUFS (Integrated)": 0.0,      # Solo informativo - sin peso
    "PLR": 0.15,                   # Importante - aumentado
    "Crest Factor": 0.0,           # Redundante con PLR - sin peso cuando hay PLR
    "Stereo Width": 0.10,         # Importante pero no crítico
    "Frequency Balance": 0.05, # Informativo - reducido
    "DC Offset": 0.0,              # Auto-crítico si detectado, no suma
}



def _status_headroom_es(peak_db: float, strict: bool = False) -> Tuple[str, str, float]:
    """
    Evaluación de headroom en español usando scoring engine UNIFICADO.
    Ahora usa calculate_headroom_score() para consistencia language-neutral.
    """
    # TRACK 1: Calcular (language-neutral)
    status, score = calculate_headroom_score(peak_db, strict)
    
    # TRACK 2: Formatear mensaje (Matías Voice - del eBook)
    mode = "strict" if strict else "normal"
    
    messages = {
        "critical": "Muy poco headroom / riesgo de clipping. Usa un plugin de Gain/Utility DESPUÉS de tu cadena del master bus (bájalo 6-8 dB), luego re-exporta. Esto preserva el balance de tu mezcla y el sonido de tus plugins.",
        "warning": {
            "strict": "Headroom insuficiente para entrega comercial. Ideal: -6 a -4 dBFS.",
            "normal": "La mezcla está algo caliente. Baja 1–2 dB para dejar margen.",
        },
        "perfect": {
            "strict": "Headroom perfecto para entrega comercial profesional.",
            "normal": f"El headroom de {abs(peak_db):.1f} dB es exactamente lo que busco - me da espacio para trabajar EQ, compresión y limiting sin comprometer la calidad.",
        },
        "pass": {
            "strict": "Headroom aceptable, pero -6 a -4 dBFS es ideal para clientes/labels.",
            "normal": "Headroom adecuado para mastering.",
        },
        "conservative": "Nivel muy conservador. No es un problema, pero podrías subir 1–3 dB si lo deseas.",
    }
    
    # Seleccionar mensaje apropiado
    if status in ["warning", "perfect", "pass"]:
        message = messages[status][mode]
    else:
        message = messages[status]
    
    return status, message, score

def _status_true_peak_es(tp_db: float, strict: bool = False) -> Tuple[str, str, float, bool]:
    """
    Evaluación de true peak en español usando scoring engine UNIFICADO.
    Ahora usa calculate_true_peak_score() para consistencia language-neutral.
    Retorna (status, message, score, hard_fail).
    """
    # TRACK 1: Calcular (language-neutral)
    status, score, hard_fail = calculate_true_peak_score(tp_db, strict)
    
    # TRACK 2: Formatear mensaje (Matías Voice - del eBook)
    mode = "strict" if strict else "normal"
    
    messages = {
        "critical": "True peak demasiado alto. Baja el nivel y re-exporta para que el mastering pueda trabajar con margen.",
        "warning": {
            "strict": "True peak debe ser ≤ -3.0 dBTP para entrega comercial profesional.",
            "normal": "True peak muy cerca del límite. Apunta a ≤ -1.0 dBTP para dar flexibilidad al mastering.",
        },
        "perfect": "True peak seguro para mastering. Deja margen suficiente para procesar sin comprometer la calidad.",
        "pass": {
            "strict": "True peak aceptable, pero -2 dBTP o menos es ideal para clientes/labels.",
            "normal": "True peak seguro para mastering.",
        },
    }
    
    # Seleccionar mensaje apropiado
    if status in ["warning", "pass"]:
        message = messages[status][mode]
    else:
        message = messages[status]
    
    return status, message, score, hard_fail

def _status_lufs_es(lufs: Optional[float], method: str, is_reliable: bool) -> Tuple[str, str, float]:
    """Evalúa LUFS con consideración de confiabilidad."""
    if lufs is None:
        return "info", "No se pudo calcular LUFS.", 0.0
    
    if not is_reliable:
        return "info", f"Archivo muy corto (<{MIN_DURATION_FOR_LUFS}s). LUFS puede no ser confiable.", 0.3
    
    if method == "approx_rms_dbfs":
        return "pass", "Nivel informativo (RMS aprox). Instala 'pyloudnorm' para LUFS real.", 0.2
    
    # LUFS real: en mezclas es informativo, no prescriptivo
    # Rango -15 a -35 LUFS es completamente normal para mezclas pre-mastering
    if lufs > -10.0:
        return "warning", "Mezcla muy fuerte. Probable over-limitación en el bus. Verifica PLR.", 0.3
    if lufs < -40.0:
        return "info", "Nivel muy bajo; revisa si hay silencio excesivo o exportación incorrecta.", 0.5
    
    # Todo entre -10 y -40 LUFS es válido para mezclas
    return "perfect", "LUFS informativo. El volumen final se ajusta en mastering.", 1.0

def _status_plr_es(plr: Optional[float], has_real_lufs: bool, strict: bool = False) -> Tuple[str, str, float]:
    """
    Evaluación de PLR en español usando scoring engine UNIFICADO.
    Ahora usa calculate_plr_score() para consistencia language-neutral.
    """
    if not has_real_lufs or plr is None:
        return "info", "PLR disponible solo con LUFS real (instala 'pyloudnorm').", 0.0
    
    # TRACK 1: Calcular (language-neutral)
    status, score = calculate_plr_score(plr, has_real_lufs, strict)
    
    # TRACK 2: Formatear mensaje (Matías Voice - del eBook)
    mode = "strict" if strict else "normal"
    
    messages = {
        "perfect": {
            "strict": "Excelente PLR: dinámica óptima para entrega comercial.",
            "normal": f"La dinámica está muy bien preservada (PLR: {plr:.1f} dB). No has sobre-limitado en el master bus, lo que me da mucho espacio para trabajar el volumen final sin sacrificar la musicalidad.",
        },
        "pass": {
            "strict": "PLR bueno para comercial, pero ≥14 dB es ideal para máxima flexibilidad.",
            "normal": "PLR adecuado para mastering.",
        },
        "warning": f"La mezcla ya puede estar bastante limitada (PLR: {plr:.1f} dB). Revisa limitadores/compresores en el master bus. Si te gusta su color, manténlos pero ajústalos para que no reduzcan ganancia (sube threshold/ceiling). Así conservas el carácter mientras recuperas dinámica.",
        "critical": f"PLR muy bajo ({plr:.1f} dB): sobre-comprimida/limitada. Quita limitadores o ajústalos para que el audio solo PASE sin reducción de ganancia (solo para color). Alternativamente, usa menos compresión en buses de grupos.",
    }
    
    # Seleccionar mensaje apropiado
    if status in ["perfect", "pass"]:
        message = messages[status][mode]
    else:
        message = messages[status]
    
    return status, message, score

def _status_stereo_es(corr: float, strict: bool = False) -> Tuple[str, str, float]:
    """
    Evaluación de correlación estéreo en español usando scoring engine UNIFICADO.
    Ahora usa calculate_stereo_score() para consistencia language-neutral.
    """
    # TRACK 1: Calcular (language-neutral)
    status, score = calculate_stereo_score(corr, strict)
    
    # TRACK 2: Formatear mensaje (Matías Voice - del eBook)
    # v7.4.0: Agregado estado "poor" para correlación 0.1-0.3
    if status == "poor":
        # Correlación baja - posibles problemas de fase
        message = f"Correlación estéreo baja ({corr:.0%}). Posibles problemas de fase detectados. Escúchalo en mono para verificar pérdida de volumen. Revisa ensanchadores, chorus o plugins estéreo."
    elif status == "warning":
        # Correlación reducida - vale la pena revisar
        message = f"Correlación estéreo reducida ({corr:.0%}). Revisa compatibilidad mono. Verifica plugins de ensanchamiento estéreo o procesamiento M/S."
    elif status == "critical":
        message = f"Correlación estéreo muy baja ({corr:.0%}). Problemas significativos de compatibilidad mono esperados. Verifica plugins estéreo, polaridad de canales o relaciones de fase."
    elif status == "catastrophic":
        message = f"SEVERO: Cancelación de fase detectada ({corr:.0%}). La mezcla perderá contenido significativo en mono. Verifica: canales invertidos, plugins con fase invertida, o errores en procesamiento M/S."
    elif status == "perfect":
        message = "Excelente correlación estéreo (mono compatible). La mezcla se traducirá bien en todos los sistemas de reproducción."
    else:  # pass
        message = "Buena correlación estéreo. La mezcla mantiene una imagen estéreo saludable con buena compatibilidad en mono."

    return status, message, score

def _status_freq_es(fb: Dict[str, float], genre: Optional[str] = None, strict: bool = False) -> Tuple[str, str, float]:
    """
    Evalúa balance de frecuencias relativo a los medios usando deltas dB.
    Porcentajes son informativos únicamente (dependen del arreglo).
    
    UMBRALES UNIFICADOS (language-neutral): Idénticos a EN para consistencia.
    """
    dL = fb["d_low_mid_db"]
    dH = fb["d_high_mid_db"]
    
    # Rangos amplios "mix-for-mastering" (UNIFICADOS)
    low_perfect = (-6.0, 6.0)
    low_pass = (-9.0, 9.0)
    high_perfect = (-15.0, 10.0)  # UNIFICADO: era muy permisivo
    high_pass = (-18.0, 12.0)      # UNIFICADO: era muy permisivo

    # Strict mode: tolerancia ligeramente más estrecha (entrega comercial)
    if strict:
        low_perfect = (-5.0, 5.0)
        low_pass = (-8.0, 8.0)
        high_perfect = (-12.0, 8.0)   # UNIFICADO
        high_pass = (-15.0, 10.0)     # UNIFICADO

    def in_range(x, r):
        return r[0] <= x <= r[1]

    if in_range(dL, low_perfect) and in_range(dH, high_perfect):
        return "perfect", "Balance tonal saludable para mastering.", 1.0
    if in_range(dL, low_pass) and in_range(dH, high_pass):
        return "pass", "Balance tonal generalmente saludable para mastering.", 0.7

    # Fuera de rango pass: advertir, pero no sobre-penalizar (puede ser artístico)
    msg_parts = []
    if dL > low_pass[1]:
        msg_parts.append("Graves pesados vs medios")
    elif dL < low_pass[0]:
        msg_parts.append("Graves ligeros vs medios")
    if dH > high_pass[1]:
        msg_parts.append("Agudos brillantes vs medios")
    elif dH < high_pass[0]:
        msg_parts.append("Agudos oscuros vs medios")

    msg = "Balance tonal con carácter; verifica traducción en múltiples sistemas. (" + ", ".join(msg_parts) + ")." if msg_parts else "Balance tonal con carácter; verifica traducción en múltiples sistemas."
    return "warning", msg, 0.4

def _status_crest_factor_es(crest: float) -> Tuple[str, str, float]:
    """Evalúa crest factor cuando LUFS no está disponible."""
    if crest >= 18.0:
        return "perfect", "Excelente dinámica preservada (crest factor alto).", 1.0
    if crest >= 14.0:
        return "pass", "Buena dinámica para mastering.", 0.7
    if crest >= 10.0:
        return "warning", "Dinámica algo comprimida. Revisa compresión en el bus.", 0.4
    return "critical", "Dinámica muy comprimida/limitada. Reduce procesamiento en master bus.", -0.5

def _status_dc_offset_es(dc_data: Dict[str, Any]) -> Tuple[str, str, float]:
    """Evalúa DC offset."""
    if not dc_data["detected"]:
        return "perfect", "Sin DC offset detectado.", 1.0
    
    max_offset = dc_data["max_offset"]
    if max_offset > 0.05:
        return "warning", f"DC offset significativo ({max_offset:.3f}). Aplica DC offset removal antes de exportar.", 0.3
    return "pass", f"DC offset menor detectado ({max_offset:.3f}). Considerar limpiar.", 0.6


# ----------------------------
# Status evaluators (bilingual)
# ----------------------------

def _pick_lang(lang: str) -> str:

    lang = (lang or 'en').lower().strip()

    return 'es' if lang.startswith('es') else 'en'



def status_headroom(peak_db: float, strict: bool = False, lang: str = 'en') -> Tuple[str, str, float]:

    lang = _pick_lang(lang)

    return _status_headroom_es(peak_db, strict) if lang == 'es' else _status_headroom_en(peak_db, strict)



def status_true_peak(tp_db: float, strict: bool = False, lang: str = 'en') -> Tuple[str, str, float, bool]:

    lang = _pick_lang(lang)

    return _status_true_peak_es(tp_db, strict) if lang == 'es' else _status_true_peak_en(tp_db, strict)



def status_lufs(lufs: Optional[float], method: str, is_reliable: bool, lang: str = 'en') -> Tuple[str, str, float]:

    lang = _pick_lang(lang)

    return _status_lufs_es(lufs, method, is_reliable) if lang == 'es' else _status_lufs_en(lufs, method, is_reliable)



def status_plr(plr: Optional[float], has_real_lufs: bool, strict: bool = False, lang: str = 'en') -> Tuple[str, str, float]:

    lang = _pick_lang(lang)

    return _status_plr_es(plr, has_real_lufs, strict) if lang == 'es' else _status_plr_en(plr, has_real_lufs, strict)



def status_stereo(corr: float, lang: str = 'en') -> Tuple[str, str, float]:

    lang = _pick_lang(lang)

    return _status_stereo_es(corr) if lang == 'es' else _status_stereo_en(corr)



def status_freq(fb: Dict[str, float], genre: Optional[str] = None, strict: bool = False, lang: str = 'en') -> Tuple[str, str, float]:

    lang = _pick_lang(lang)

    return _status_freq_es(fb, genre, strict) if lang == 'es' else _status_freq_en(fb, genre, strict)



def status_crest_factor(crest: float, lang: str = 'en') -> Tuple[str, str, float]:

    lang = _pick_lang(lang)

    return _status_crest_factor_es(crest) if lang == 'es' else _status_crest_factor_en(crest)



def status_dc_offset(dc_data: Dict[str, Any], lang: str = 'en') -> Tuple[str, str, float]:

    lang = _pick_lang(lang)

    return _status_dc_offset_es(dc_data) if lang == 'es' else _status_dc_offset_en(dc_data)



def score_report(metrics: List[Dict[str, Any]], hard_fail: bool, strict: bool = False, lang: str = 'en') -> Tuple[int, str]:
    """Calculate global score (0-100) and verdict with localization support."""
    lang = _pick_lang(lang)

    # v7.4.0 FIX: Minimum score is 5, never 0
    if hard_fail:
        if lang == 'es':
            return 5, "❌ Requiere revisión antes del mastering"
        return 5, "❌ Requires review before mastering"

    # v7.4.0: Added "poor" status for correlation 0.1-0.3
    mult = {"perfect": 1.0, "pass": 0.9, "warning": 0.7, "poor": 0.4, "critical": 0.0, "catastrophic": 0.0, "info": 1.0}
    total = 0.0
    wsum = 0.0
    
    for m in metrics:
        # Use internal_key for weight lookup (always English)
        internal_key = m.get("internal_key", m["name"])
        w = WEIGHTS.get(internal_key, 0.0)
        if w <= 0:
            continue
        
        # Crest Factor solo cuenta si no hay PLR real
        if internal_key == "Crest Factor":
            has_plr = any(
                metric.get("internal_key", metric["name"]) == "PLR" 
                and metric.get("value") != "N/A" 
                for metric in metrics
            )
            if has_plr:
                continue  # Skip crest factor si tenemos PLR
            else:
                w = 0.15  # Usar peso de PLR si no hay PLR
        
        wsum += w
        total += w * mult.get(m["status"], 0.0)

    if wsum <= 0:
        if lang == 'es':
            return 50, "⚠️ Resultados parciales"
        return 50, "⚠️ Partial results"

    raw_score = int(round(100.0 * (total / wsum)))

    # Apply intelligent minimum score
    minimum_score = calculate_minimum_score(metrics)
    # v7.4.0 FIX: Floor at 5, never return scores below 5
    score = max(5, max(minimum_score, raw_score))

    # Localized verdicts with MARGIN philosophy (not judgment)
    # v7.4.0: Added verdicts for scores 5-19
    if lang == 'es':
        if score >= 95:
            verdict = "✅ Margen óptimo para mastering"
        elif score >= 85:
            verdict = "✅ Lista para mastering"
        elif score >= 75:
            verdict = "⚠️ Margen suficiente (revisar sugerencias)"
        elif score >= 60:
            verdict = "⚠️ Margen reducido - revisar antes de mastering"
        elif score >= 40:
            verdict = "⚠️ Margen limitado - ajustes recomendados"
        elif score >= 20:
            verdict = "❌ Margen comprometido para mastering"
        elif score >= 5:
            # v7.4.0: New verdict for scores 5-19
            verdict = "❌ Requiere revisión - tu archivo necesita trabajo antes del mastering"
        else:
            verdict = "❌ Sin margen para procesamiento adicional"
    else:
        if score >= 95:
            verdict = "✅ Optimal margin for mastering"
        elif score >= 85:
            verdict = "✅ Ready for mastering"
        elif score >= 75:
            verdict = "⚠️ Sufficient margin (review suggestions)"
        elif score >= 60:
            verdict = "⚠️ Reduced margin - review before mastering"
        elif score >= 40:
            verdict = "⚠️ Limited margin - adjustments recommended"
        elif score >= 20:
            verdict = "❌ Compromised margin for mastering"
        elif score >= 5:
            # v7.4.0: New verdict for scores 5-19
            verdict = "❌ Requires review - your file needs work before mastering"
        else:
            verdict = "❌ No margin for additional processing"

    return score, verdict


def analyze_file(path: Path, oversample: int = 4, genre: Optional[str] = None, strict: bool = False, lang: str = "en", original_metadata: Optional[Dict] = None) -> Dict[str, Any]:
    """Analyze a full audio file."""
    start_time = time.time()  # Start timing
    try:
        info = sf.info(str(path))
    except Exception as e:
        raise RuntimeError(f"Error leyendo archivo: {e}. Archivo corrupto o formato no soportado.")
    
    sr = int(info.samplerate)
    channels = int(info.channels)
    duration = float(info.duration)
    
    # Extract file size
    file_size = path.stat().st_size
    
    # Extract bit depth - USE ORIGINAL METADATA if provided
    if original_metadata and original_metadata.get('bit_depth'):
        bit_depth = original_metadata['bit_depth']
        sr = original_metadata.get('sample_rate', sr)  # Also use original sample rate
    else:
        # Fallback to reading from current file
        subtype = info.subtype
        bit_depth = 0
        if 'PCM_' in subtype:
            try:
                bit_depth = int(subtype.split('_')[1])
            except:
                bit_depth = 16
        elif subtype == 'DOUBLE':
            bit_depth = 64
        elif 'FLOAT' in subtype:
            bit_depth = 32

    # Validar duración mínima
    if duration < 0.5:
        raise RuntimeError(f"Archivo demasiado corto ({duration:.2f}s). Mínimo 0.5s.")
    
    try:
        y, sr_loaded = librosa.load(str(path), sr=sr, mono=False)
    except Exception as e:
        raise RuntimeError(f"Error cargando audio con librosa: {e}")
    
    if sr_loaded != sr:
        sr = int(sr_loaded)
    
    if y.ndim == 1:
        y = y[np.newaxis, :]

    # v7.4.1 FIX: Detect mono/pseudo-stereo (parity with chunked mode)
    # Check a middle segment — skip first/last 5s per temporal analysis rules
    is_true_mono = False
    if y.shape[0] < 2:
        is_true_mono = True
        print("ℹ️  Mono file detected - stereo analysis will not apply")
    elif y.shape[0] >= 2:
        skip_samples = min(int(5 * sr), y.shape[1] // 10)  # 5s or 10% of file
        end_samples = max(y.shape[1] - skip_samples, skip_samples + int(sr))  # At least 1s of data
        if skip_samples < end_samples:
            if np.allclose(y[0, skip_samples:end_samples], y[1, skip_samples:end_samples], rtol=1e-5, atol=1e-8):
                is_true_mono = True
                print(f"ℹ️  Pseudo-stereo (identical channels) detected in body ({skip_samples/sr:.1f}s-{end_samples/sr:.1f}s) - treating as mono")

    # Auto-ajustar oversample si es necesario
    if oversample == 0:  # "auto" mode
        oversample = auto_oversample_factor(sr)

    metrics: List[Dict[str, Any]] = []

    # 1. Headroom with Clipping Temporal Analysis
    peak = peak_dbfs(y)
    headroom = -peak
    sample_peak = float(np.max(np.abs(y))) if y.size else 0.0
    clipping = sample_peak >= 0.999999
    
    # Temporal analysis if clipping detected
    clipping_temporal = None
    if clipping:
        clipping_temporal = analyze_clipping_temporal(y, sr, threshold=0.999999)

    st, msg, _ = status_headroom(peak, strict, lang)
    
    headroom_metric = {
        "name": METRIC_NAMES[_pick_lang(lang)]["Headroom"],
        "internal_key": "Headroom",
        "value": f"{headroom:.1f} dB",
        "peak_db": f"{peak:.1f} dBFS",
        "status": st,
        "message": msg
    }
    
    if clipping_temporal:
        headroom_metric["clipping_temporal"] = clipping_temporal
    
    metrics.append(headroom_metric)

    # 2. True Peak with Temporal Analysis
    tp = oversampled_true_peak_db(y, os_factor=oversample)
    st_tp, msg_tp, _, tp_hard = status_true_peak(tp, strict, lang)
    
    # Temporal analysis if problematic
    tp_temporal = None
    if tp > -1.0:  # Analyze if close to or above limit
        # Strict mode uses more conservative threshold (-2.0 dBTP vs -1.0 dBTP)
        # -2.0 aligns with professional high-end standards (~-6 dBFS headroom from eBook)
        tp_threshold = -2.0 if strict else -1.0
        tp_temporal = analyze_true_peak_temporal(y, sr, oversample, threshold=tp_threshold)
        
        # If no regions found but TP is high, create informative message
        # This happens when peak is brief (transient) but still problematic
        if tp_temporal and tp_temporal.get('total_regions', 0) == 0:
            lang_picked = _pick_lang(lang)
            if lang_picked == 'es':
                info_message = (
                    f"El pico máximo ({tp:.1f} dBTP) está cerca del límite digital, "
                    "pero ocurre en momentos muy breves (transitorios). "
                    "Aunque no se mantiene de forma sostenida durante 5 segundos o más a lo largo de la canción, "
                    "sigue siendo un indicador de procesamiento de master."
                )
            else:
                info_message = (
                    f"The maximum peak ({tp:.1f} dBTP) is close to the digital ceiling, "
                    "but occurs in very brief moments (transients). "
                    "Although it is not sustained for 5 seconds or longer throughout the song, "
                    "it remains an indicator of mastering-level processing."
                )
            
            # Add info fields to the temporal data
            tp_temporal['info_only'] = True
            tp_temporal['info_message'] = info_message
    
    tp_metric = {
        "name": METRIC_NAMES[_pick_lang(lang)]["True Peak"],
        "internal_key": "True Peak",
        "value": f"{tp:.1f} dBTP",
        "status": st_tp,
        "message": msg_tp
    }
    
    if tp_temporal:
        tp_metric["temporal_analysis"] = tp_temporal
    
    metrics.append(tp_metric)

    # 3. DC Offset
    dc_data = detect_dc_offset(y)
    st_dc, msg_dc, _ = status_dc_offset(dc_data, lang)
    
    lang_picked = _pick_lang(lang)
    dc_value = f"{dc_data['max_offset']:.4f}" if dc_data["detected"] else ("No detectado" if lang_picked == 'es' else "Not detected")
    
    metrics.append({
        "name": METRIC_NAMES[lang_picked]["DC Offset"],
        "internal_key": "DC Offset",  # For WEIGHTS lookup
        "value": dc_value,
        "status": st_dc,
        "message": msg_dc,
        "details": dc_data
    })

    # 4. LUFS
    lufs, lufs_method, lufs_reliable = integrated_lufs(y, sr, duration)
    lufs_label = "LUFS" if HAS_PYLOUDNORM else "RMS(dBFS) approx"
    st_l, msg_l, _ = status_lufs(lufs, lufs_method, lufs_reliable, lang)
    
    metrics.append({
        "name": METRIC_NAMES[_pick_lang(lang)]["LUFS (Integrated)"],
        "internal_key": "LUFS (Integrated)",  # For WEIGHTS lookup
        "value": f"{lufs:.1f} {lufs_label}" if lufs is not None else "N/A",
        "status": st_l,
        "message": f"{msg_l} (method: {lufs_method})",
        "method": lufs_method,
        "reliable": lufs_reliable
    })

    # 5. PLR
    plr = None
    has_real_lufs = HAS_PYLOUDNORM and lufs_method.startswith("pyloudnorm")
    if has_real_lufs and lufs is not None and tp is not None:
        plr = tp - lufs
    
    st_p, msg_p, _ = status_plr(plr, has_real_lufs, strict, lang)
    metrics.append({
        "name": METRIC_NAMES[_pick_lang(lang)]["PLR"],
        "internal_key": "PLR",  # For WEIGHTS lookup
        "value": f"{plr:.1f} dB" if plr is not None else "N/A",
        "status": st_p,
        "message": msg_p
    })

    # 6. Crest Factor (alternativa a PLR cuando no hay LUFS real)
    crest = calculate_crest_factor(y)
    st_cf, msg_cf, _ = status_crest_factor(crest, lang)
    
    lang_picked = _pick_lang(lang)
    if has_real_lufs:
        # When PLR is available, Crest Factor is informational only
        cf_status = "info"
        cf_message = "Informativo (usa PLR como métrica principal de dinámica)." if lang_picked == 'es' else "Informational (use PLR as the primary dynamics metric)."
    else:
        # When no PLR, use Crest Factor scoring
        cf_status = st_cf
        cf_message = msg_cf
    
    metrics.append({
        "name": METRIC_NAMES[lang_picked]["Crest Factor"],
        "internal_key": "Crest Factor",  # For WEIGHTS lookup
        "value": f"{crest:.1f} dB",
        "status": cf_status,
        "message": cf_message
    })

    # 7. Stereo Field Analysis (Correlation + M/S + L/R Balance) with Temporal Analysis
    corr = stereo_correlation(y)
    ms_ratio, mid_rms, side_rms = calculate_ms_ratio(y, debug=True)  # Enable debug for investigation
    lr_balance_db = calculate_lr_balance(y)
    
    # Temporal analysis for each parameter if problematic
    corr_temporal = None
    ms_temporal = None
    lr_temporal = None
    
    # Strict mode uses more demanding thresholds for temporal analysis
    corr_threshold = 0.5 if strict else 0.3
    ms_low_threshold = 0.1 if strict else 0.05
    ms_high_threshold = 1.5 if strict else 1.8  # FIX: Was 1.2/1.5, now 1.5/1.8 (more permissive)
    lr_threshold = 2.0 if strict else 3.0
    
    if corr < 0.5:  # Analyze if correlation is problematic
        corr_temporal = analyze_correlation_temporal(y, sr, threshold=corr_threshold)
    
    if ms_ratio < ms_low_threshold or ms_ratio > ms_high_threshold:  # Analyze if M/S is problematic
        ms_temporal = analyze_ms_ratio_temporal(y, sr, low_threshold=ms_low_threshold, high_threshold=ms_high_threshold)
    
    if abs(lr_balance_db) > lr_threshold:  # Analyze if L/R balance is problematic
        lr_temporal = analyze_lr_balance_temporal(y, sr, threshold=lr_threshold)
    
    # Comprehensive evaluation with M/S and L/R context
    st_s, msg_s = evaluate_stereo_field_comprehensive(corr, ms_ratio, lr_balance_db, lang, strict)
    
    # Enhanced stereo metric with M/S and L/R info
    stereo_metric = {
        "name": METRIC_NAMES[_pick_lang(lang)]["Stereo Width"],
        "internal_key": "Stereo Width",
        "value": f"{corr*100:.0f}% corr | M/S: {ms_ratio:.2f} | L/R: {lr_balance_db:+.1f} dB",
        "correlation": corr,
        "ms_ratio": round(ms_ratio, 2),
        "lr_balance_db": round(lr_balance_db, 1),
        "status": st_s,
        "message": msg_s
    }
    
    # Add temporal analysis if available - v7.3.36: Unified structure with chunked mode
    stereo_temporal = {}
    
    if corr_temporal and corr_temporal.get('problem_regions'):
        # Transform to match chunked mode structure
        regions = corr_temporal.get('problem_regions', [])
        stereo_temporal['correlation'] = {
            'num_regions': len(regions),
            'regions': [
                {
                    'start': r.get('start_seconds', 0),
                    'end': r.get('end_seconds', 0),
                    'duration': r.get('end_seconds', 0) - r.get('start_seconds', 0),
                    'avg_correlation': r.get('avg_correlation', 0),
                    'issue': r.get('issue', 'very_low'),
                    'band_correlation': r.get('band_correlation')
                }
                for r in regions[:25]
            ]
        }
    
    if ms_temporal and ms_temporal.get('problem_regions'):
        regions = ms_temporal.get('problem_regions', [])
        stereo_temporal['ms_ratio'] = {
            'num_regions': len(regions),
            'regions': [
                {
                    'start': r.get('start_seconds', 0),
                    'end': r.get('end_seconds', 0),
                    'duration': r.get('end_seconds', 0) - r.get('start_seconds', 0),
                    'avg_ms_ratio': r.get('avg_ms_ratio', r.get('ms_ratio', 0)),
                    'issue': r.get('issue', 'mono'),
                    'severity': r.get('severity', 'warning')
                }
                for r in regions[:25]
            ]
        }
    
    if lr_temporal and lr_temporal.get('problem_regions'):
        regions = lr_temporal.get('problem_regions', [])
        stereo_temporal['lr_balance'] = {
            'num_regions': len(regions),
            'regions': [
                {
                    'start': r.get('start_seconds', 0),
                    'end': r.get('end_seconds', 0),
                    'duration': r.get('end_seconds', 0) - r.get('start_seconds', 0),
                    'avg_balance_db': r.get('avg_balance_db', r.get('balance_db', 0)),
                    'side': r.get('side', 'left' if r.get('avg_balance_db', 0) > 0 else 'right'),
                    'severity': r.get('severity', 'warning')
                }
                for r in regions[:25]
            ]
        }
    
    if stereo_temporal:
        stereo_metric["temporal_analysis"] = stereo_temporal

    # v7.4.1 FIX: Override stereo metric for mono/pseudo-stereo files (parity with chunked mode)
    if is_true_mono:
        mono_msg_es = "Archivo mono detectado. El análisis estéreo no aplica."
        mono_msg_en = "Mono file detected. Stereo analysis does not apply."
        stereo_metric = {
            "name": METRIC_NAMES[_pick_lang(lang)]["Stereo Width"],
            "internal_key": "Stereo Width",
            "value": "Mono",
            "correlation": 1.0,
            "ms_ratio": 0.0,
            "lr_balance_db": 0.0,
            "status": "info",
            "message": mono_msg_es if lang == "es" else mono_msg_en,
            "is_mono": True
        }
    else:
        stereo_metric["is_mono"] = False

    metrics.append(stereo_metric)

    # 8. Frequency Balance
    fb = band_balance_db(y, sr)
    st_f, msg_f, _ = status_freq(fb, genre, strict, lang)  # ← FIXED: Added strict and lang parameters
    
    # NEW v7.3.50: Detect genre and calculate tonal health
    genre_detection = detect_closest_genre(fb['low_percent'], fb['mid_percent'], fb['high_percent'])
    tonal_health = calculate_tonal_balance_percentage(fb['low_percent'], fb['mid_percent'], fb['high_percent'])
    
    # Localize frequency band labels for Spanish users
    lang_picked = _pick_lang(lang)
    if lang_picked == 'es':
        low_label, mid_label, high_label = "Graves", "Medios", "Agudos"
        delta_low_mid = "ΔG-M"
        delta_high_mid = "ΔA-M"
    else:
        low_label, mid_label, high_label = "Low", "Mid", "High"
        delta_low_mid = "ΔL-M"
        delta_high_mid = "ΔH-M"
    
    metrics.append({
        "name": METRIC_NAMES[lang_picked]["Frequency Balance"],
        "internal_key": "Frequency Balance",  # For WEIGHTS lookup
        "value": (
            f"{low_label}: {fb['low_percent']:.0f}% | "
            f"{mid_label}: {fb['mid_percent']:.0f}% | "
            f"{high_label}: {fb['high_percent']:.0f}%"
        ),
        "value_detailed": (
            f"{low_label}: {fb['low_db']:.1f} dB ({fb['low_percent']:.0f}%) | "
            f"{mid_label}: {fb['mid_db']:.1f} dB ({fb['mid_percent']:.0f}%) | "
            f"{high_label}: {fb['high_db']:.1f} dB ({fb['high_percent']:.0f}%) | "
            f"{delta_low_mid}: {fb['d_low_mid_db']:+.1f} dB | "
            f"{delta_high_mid}: {fb['d_high_mid_db']:+.1f} dB"
        ),
        **fb,
        "status": st_f,
        "message": msg_f,
        # NEW v7.3.50: Genre detection fields
        "detected_genre": genre_detection["genre"],
        "genre_confidence": genre_detection["confidence"],
        "genre_in_range": genre_detection["in_range"],
        "genre_description": genre_detection["description_es"] if lang_picked == 'es' else genre_detection["description_en"],
        "tonal_percentage": tonal_health["percentage"],
        "tonal_status": tonal_health["status"],
        "tonal_issues": tonal_health["issues_es"] if lang_picked == 'es' else tonal_health["issues"]
    })

    # Hard fail conditions - only for severe technical issues
    # True peak hard fail comes from calculate_true_peak_score
    # Clipping detection
    hard_fail = bool(clipping) or bool(tp_hard)
    score, verdict = score_report(metrics, hard_fail, strict, lang)  # ← FIXED: Added strict and lang
    
 # Generate CTA for frontend
    cta_data = generate_cta(score, strict, lang, mode="write")
    
    # ========== NEW: Generate interpretative texts ==========
    interpretations = None
    if HAS_INTERPRETATIVE_TEXTS:
        try:
            # Extract key metrics for interpretation
            interpretation_metrics = {}
            
            # Extract headroom (use peak_db directly - already negative in dBFS)
            interpretation_metrics['headroom'] = float(peak)  # Convert numpy to Python float (e.g., -6.3 dBFS)
            
            # Extract true peak
            interpretation_metrics['true_peak'] = float(tp)
            
            # Extract dynamic range (PLR)
            interpretation_metrics['dynamic_range'] = float(plr) if plr is not None and plr > 0 else 0.0
            
            # Extract LUFS
            interpretation_metrics['lufs'] = float(lufs) if lufs is not None and lufs != 0 else -14.0
            
            # Extract stereo balance
            # Calculate balance from L/R balance dB
            # Convert dB difference to ratio (0.5 = perfect balance)
            if lr_balance_db == 0:
                balance_ratio = 0.5
            elif lr_balance_db > 0:  # R louder
                balance_ratio = 0.5 + (lr_balance_db / 20.0)
            else:  # L louder
                balance_ratio = 0.5 + (lr_balance_db / 20.0)
            
            balance_ratio = max(0.0, min(1.0, balance_ratio))  # Clamp 0-1
            interpretation_metrics['stereo_balance'] = balance_ratio
            
            # Extract correlation
            interpretation_metrics['stereo_correlation'] = float(corr)
            interpretation_metrics['ms_ratio'] = float(stereo_metric.get('ms_ratio', 0))
            
            # Generate interpretative texts
            interpretations_raw = generate_interpretative_texts(
                metrics=interpretation_metrics,
                lang=lang,
                strict=strict
            )
            interpretations = format_for_api_response(
                interpretations_raw,
                interpretation_metrics
            )
            
        except Exception as e:
            import traceback
            print(f"❌ ERROR generating interpretations: {e}", flush=True)
            traceback.print_exc()
            interpretations = None
    # ========== END: Interpretative texts generation ==========
    
    # Detect territory and mastered status
    territory = detect_territory(lufs, peak, tp, plr)
    
    # Calculate True Peak clipping percentage for mastered detection
    tp_clipping_pct = 0.0
    if tp_temporal:
        tp_clipping_pct = tp_temporal.get("affected_percentage", 0.0)
    
    is_mastered = detect_mastered_file(lufs, peak, tp, plr, tp_clipping_pct)

    # v1.5: Energy curve analysis
    energy_data = calculate_energy_curve(y, sr)

    # v1.5: Categorical flags for analytics
    cat_flags = calculate_categorical_flags(peak, tp, plr, corr, ms_ratio)

    # Build full result
    result = {
        "file": {
            "name": path.name,
            "size": file_size,
            "duration": duration,
            "sample_rate": sr,
            "channels": channels,
            "bit_depth": bit_depth
        },
        "technical": {
            "peak_dbfs": peak,
            "true_peak_dbtp": tp,
            "lufs": lufs,
            "plr": plr,
            "stereo_correlation": corr,
            "lr_balance_db": lr_balance_db,
            "ms_ratio": ms_ratio
        },
        "metrics": metrics,
        "score": score,
        "verdict": verdict,
        "territory": territory,
        "is_mastered": is_mastered,
        "cta": cta_data,  # Add CTA data for frontend
        "interpretations": interpretations,  # NEW: Add interpretations
        "chunked": False,
        "num_chunks": 1,  # v7.3.36: Added for parity with chunked mode
        "notes": {
            "lufs_is_real": HAS_PYLOUDNORM and lufs is not None,
            "lufs_reliable": duration >= MIN_DURATION_FOR_LUFS,
            "oversample_factor": oversample,
            "auto_oversample": oversample == 0,
            "clipping_detected": clipping
        },
        "metrics_bars": calculate_metrics_bars_percentages(metrics, strict=strict),  # NEW v7.3.50: Quick view bars
        "analysis_time_seconds": round(time.time() - start_time, 1),  # Time elapsed
        # v1.5: New data capture fields
        "spectral_6band": fb.get("spectral_6band", {}),
        "energy_analysis": energy_data,
        "categorical_flags": cat_flags
    }

    # CRITICAL: Sanitize all float values to ensure JSON compliance
    result = sanitize_dict(result)

    return result

def generate_recommendations(metrics: List[Dict[str, Any]], score: int, genre: Optional[str], lang: str = 'en') -> List[str]:
    """Generate specific recommendations based on analysis with language support and temporal context."""
    lang = _pick_lang(lang)
    recs = []
    
    for m in metrics:
        # Skip informational metrics (like Crest Factor when PLR is available)
        internal_key = m.get("internal_key", m.get("name", ""))
        if internal_key == "Crest Factor" and "Informativo" in m.get("message", ""):
            continue
        if internal_key == "Crest Factor" and "use PLR" in m.get("message", ""):
            continue
        
        if m["status"] in ["critical", "warning"]:
            base_message = f"• {m['name']}: {m['message']}"
            
            # Add temporal context if available
            temporal_suffix = ""
            
            # Check for various temporal analyses
            if "temporal_analysis" in m:
                temporal_suffix = format_temporal_message(m["temporal_analysis"], m['name'], lang)
            elif "clipping_temporal" in m:
                temporal_suffix = format_temporal_message(m["clipping_temporal"], m['name'], lang)
            elif "correlation_temporal" in m:
                temporal_suffix = format_temporal_message(m["correlation_temporal"], "Correlation", lang)
            elif "ms_temporal" in m:
                temporal_suffix = format_temporal_message(m["ms_temporal"], "M/S Ratio", lang)
            elif "lr_temporal" in m:
                temporal_suffix = format_temporal_message(m["lr_temporal"], "L/R Balance", lang)
            
            recs.append(base_message + temporal_suffix)
    
    if score < 75:
        if lang == 'es':
            recs.append("• Considera revisar tu mezcla antes de enviarla a mastering")
        else:
            recs.append("• Consider reviewing your mix before sending to mastering")
    
    if not HAS_PYLOUDNORM:
        if lang == 'es':
            recs.append("• Instala 'pyloudnorm' para mediciones LUFS precisas: pip install pyloudnorm")
        else:
            recs.append("• Install 'pyloudnorm' for precise LUFS measurements: pip install pyloudnorm")
    
    if genre:
        if lang == 'es':
            recs.append(f"• Análisis optimizado para género: {genre}")
        else:
            recs.append(f"• Analysis optimized for genre: {genre}")
    
    if not recs:
        if lang == 'es':
            return ["• Tu mezcla está bien preparada para mastering"]
        else:
            return ["• Your mix is well prepared for mastering"]
    
    return recs




def generate_cta(score: int, strict: bool, lang: str, mode: str = "write") -> Dict[str, str]:
    """
    Generate conversational CTA with button text based on mix score.
    
    Returns:
        dict: {"message": "CTA text", "button": "Button text", "action": "mastering|preparation|review"}
    
    Score ranges:
    - 95-100: Perfect - offer mastering
    - 85-94: Ready - offer mastering
    - 75-84: Acceptable - offer preparation
    - 60-74: Minor adjustments - offer adjustments
    - 40-59: Significant work - offer review
    - 20-39: Urgent correction - offer review
    - 0-19: Critical - offer project review
    """
    # SHORT MODE: Never show CTA
    if mode == "short":
        return {"message": "", "button": "", "action": ""}
    
    if lang == 'es':
        # Spanish CTAs - Español Colombiano
        if score >= 95:
            # Perfect for mastering
            return {
                "message": (
                    "🎧 ¿Quieres darle el toque final?\n"
                    "Tu mezcla está bien balanceada. Puedo masterizarla para que suene coherente "
                    "y competitiva en plataformas de streaming."
                ),
                "button": "Masterizar mi canción",
                "action": "mastering"
            }
        
        elif score >= 85:
            # Ready for mastering
            return {
                "message": (
                    "🎧 ¿Quieres que masterice tu canción?\n"
                    "Tu mezcla está bien preparada. Puedo trabajar con libertad para que suene "
                    "coherente y competitiva en plataformas de streaming."
                ),
                "button": "Masterizar mi canción",
                "action": "mastering"
            }
        
        elif score >= 75:
            # Acceptable - needs minor tweaks before mastering
            return {
                "message": (
                    "🔧 ¿Necesitas ajustar algunos detalles antes del mastering?\n"
                    "Tu mezcla está cerca, pero hay algunos puntos técnicos por revisar. "
                    "Puedo ayudarte a prepararla correctamente, y luego hablamos del mastering."
                ),
                "button": "Preparar mi mezcla",
                "action": "preparation"
            }
        
        elif score >= 60:
            # Minor adjustments needed
            return {
                "message": (
                    "🔧 ¿Te ayudo a preparar tu mezcla?\n"
                    "Hay varios aspectos técnicos por ajustar antes del mastering. "
                    "Puedo revisar tu sesión y hacer los cambios necesarios para dejarla lista."
                ),
                "button": "Realizar mis ajustes",
                "action": "preparation"
            }
        
        elif score >= 40:
            # Significant work needed
            return {
                "message": (
                    "🔧 ¿Revisamos tu mezcla juntos?\n"
                    "El mastering no es una varita mágica - tu mezcla necesita trabajo técnico primero. "
                    "Puedo ayudarte a corregir los problemas desde la sesión."
                ),
                "button": "Revisar mi mezcla",
                "action": "review"
            }
        
        elif score >= 20:
            # Urgent correction required
            return {
                "message": (
                    "🔧 ¿Necesitas ayuda con tu sesión de mezcla?\n"
                    "Tu mezcla requiere atención en varios aspectos técnicos. "
                    "Puedo revisar tu proyecto y trabajar contigo para resolver los problemas detectados."
                ),
                "button": "Revisar mi mezcla",
                "action": "review"
            }
        
        else:
            # Critical - multiple issues
            return {
                "message": (
                    "🔧 ¿Hablamos de tu proyecto?\n"
                    "Detecté varios problemas críticos que necesitan resolverse en la etapa de mezcla. "
                    "Puedo ayudarte a corregirlos paso a paso."
                ),
                "button": "Revisar mi proyecto",
                "action": "review"
            }
    
    else:
        # English CTAs - American English
        if score >= 95:
            # Perfect for mastering
            return {
                "message": (
                    "🎧 Ready for the final touch?\n"
                    "Your mix is well balanced. I can master it to sound coherent and competitive "
                    "on streaming platforms."
                ),
                "button": "Master my song",
                "action": "mastering"
            }
        
        elif score >= 85:
            # Ready for mastering
            return {
                "message": (
                    "🎧 Want me to master your song?\n"
                    "Your mix is well prepared. I can work freely to make it sound coherent and "
                    "competitive on streaming platforms."
                ),
                "button": "Master my song",
                "action": "mastering"
            }
        
        elif score >= 75:
            # Acceptable - needs minor tweaks before mastering
            return {
                "message": (
                    "🔧 Need to adjust some details before mastering?\n"
                    "Your mix is close, but there are some technical points to review. "
                    "I can help you prepare it correctly, then we'll talk about mastering."
                ),
                "button": "Prepare my mix",
                "action": "preparation"
            }
        
        elif score >= 60:
            # Minor adjustments needed
            return {
                "message": (
                    "🔧 Need help preparing your mix?\n"
                    "There are several technical aspects to adjust before mastering. "
                    "I can review your session and make the necessary changes to get it ready."
                ),
                "button": "Make my adjustments",
                "action": "preparation"
            }
        
        elif score >= 40:
            # Significant work needed
            return {
                "message": (
                    "🔧 Let's review your mix together?\n"
                    "Mastering isn't a magic wand - your mix needs technical work first. "
                    "I can help you fix the issues from the session."
                ),
                "button": "Review my mix",
                "action": "review"
            }
        
        elif score >= 20:
            # Urgent correction required
            return {
                "message": (
                    "🔧 Need help with your mix session?\n"
                    "Your mix requires attention to several technical aspects. "
                    "I can review your project and work with you to solve the detected issues."
                ),
                "button": "Review my mix",
                "action": "review"
            }
        
        else:
            # Critical - multiple issues
            return {
                "message": (
                    "🔧 Let's talk about your project?\n"
                    "I detected several critical issues that need to be resolved in the mixing stage. "
                    "I can help you fix them step by step."
                ),
                "button": "Review my project",
                "action": "review"
            }


def build_technical_details(metrics: List[Dict], lang: str = 'es') -> str:
    """
    Build comprehensive technical details section.
    Used ONLY in write mode for well-scored mixes (≥85).
    Includes explanation of EVERY metric with context.
    """
    lang = _pick_lang(lang)
    
    if lang == 'es':
        details = "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        details += "📊 DETALLES TÉCNICOS COMPLETOS\n"
        details += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        
        # HEADROOM
        headroom_metric = next((m for m in metrics if "Headroom" in m.get("internal_key", "")), None)
        if headroom_metric:
            peak_val = headroom_metric.get("peak_db", "")
            details += f"🎚️ HEADROOM: {peak_val}\n"
            details += "   → Los picos dejan suficiente espacio para procesamiento\n"
            details += "     sin riesgo de clipping durante el mastering.\n"
            
            # Add temporal info if exists
            if "temporal_analysis" in headroom_metric:
                temporal = format_temporal_message(
                    headroom_metric["temporal_analysis"], 
                    "Headroom", 
                    lang
                )
                if temporal:
                    details += "  " + temporal.strip() + "\n"
            else:
                details += "   → Headroom consistente en toda la canción.\n"
            details += "\n"
        
        # TRUE PEAK
        tp_metric = next((m for m in metrics if "True Peak" in m.get("internal_key", "")), None)
        if tp_metric:
            tp_val = tp_metric.get("value", "")
            details += f"🔊 TRUE PEAK: {tp_val}\n"
            details += "   → Seguro para el proceso de mastering.\n"
            details += "     El control de picos finales y compatibilidad con codecs se gestiona en mastering.\n"
            
            # Add temporal info
            if "temporal_analysis" in tp_metric:
                temporal = format_temporal_message(
                    tp_metric["temporal_analysis"],
                    "True Peak",
                    lang
                )
                if temporal:
                    details += "  " + temporal.strip() + "\n"
            else:
                details += "   → Márgenes de seguridad cumplidos en todo el track.\n"
            details += "\n"
        
        # PLR (Dynamic Range)
        plr_metric = next((m for m in metrics if "PLR" in m.get("internal_key", "")), None)
        if plr_metric and plr_metric.get("value") != "N/A":
            plr_val = plr_metric.get("value", "")
            details += f"📈 RANGO DINÁMICO (PLR): {plr_val}\n"
            
            # Contextual explanation based on value
            if isinstance(plr_val, str):
                try:
                    plr_num = float(plr_val.split()[0])
                    if plr_num >= 12:
                        details += "   → Excelente preservación de dinámica. La mezcla respira bien.\n"
                        details += "   → Ideal para mastering expresivo con punch natural.\n"
                    elif plr_num >= 8:
                        details += "   → Buen rango dinámico, apropiado para mastering.\n"
                    else:
                        details += "   → Algo comprimida, pero aún trabajable en mastering.\n"
                except:
                    details += "   → Rango dinámico medido.\n"
            details += "\n"
        
        # STEREO FIELD
        stereo_metric = next((m for m in metrics if "Stereo" in m.get("internal_key", "")), None)
        if stereo_metric:
            corr_val = stereo_metric.get("value", "")
            ms_ratio = stereo_metric.get("ms_ratio", 0)
            lr_balance = stereo_metric.get("lr_balance_db", 0)
            
            details += "🎧 CAMPO ESTÉREO:\n"
            details += f"   • Correlación: {corr_val}\n"
            if ms_ratio:
                details += f"   • M/S Ratio: {ms_ratio:.2f}\n"
            if lr_balance is not None:
                details += f"   • L/R Balance: {abs(lr_balance):.1f} dB\n"
            details += "\n"
            
            # Check for temporal analysis (from chunked mode)
            if "temporal_analysis" in stereo_metric:
                temporal = stereo_metric["temporal_analysis"]
                
                details += "▶ ANÁLISIS TEMPORAL:\n\n"
                
                # v7.3.51: Feedback positivo sobre coherencia mono
                global_corr = stereo_metric.get("correlation", 0)
                if global_corr and global_corr >= 0.7:
                    details += "✅ Alta coherencia mono detectada\n"
                    details += "La mezcla mantiene buena correlación entre canales.\n"
                    details += "Favorece el proceso de mastering y la compatibilidad en sistemas mono.\n\n"
                
                # Correlation temporal - solo regiones que necesitan atención
                if 'correlation' in temporal:
                    corr_data = temporal['correlation']
                    num_regions = corr_data.get('num_regions', 0)
                    regions = corr_data.get('regions', [])
                    
                    if num_regions > 0:
                        region_word = "región" if num_regions == 1 else "regiones"
                        details += f"⚠️ Correlación ({num_regions} {region_word} para prestar atención):\n"
                        
                        # v7.3.36.4: Variaciones de mensajes de mono para evitar repetición
                        variaciones_mono_es = [
                            "verifica comportamiento en mono",
                            "posible pérdida de cuerpo en mono",
                            "puede perder impacto en mono"
                        ]
                        
                        max_regions_to_show = 25
                        for region_idx, region in enumerate(regions[:max_regions_to_show]):
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            corr = region['avg_correlation']
                            issue = region['issue']
                            band_corr = region.get('band_correlation')
                            
                            details += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            
                            # v7.3.51: Only report issues that need attention (< 0.5)
                            # Removed 'high' issue type - high correlation is not a problem
                            if issue == 'medium_low':
                                details += f"Correlación moderada ({corr*100:.0f}%)\n"
                                details += "      → Revisa efectos estéreo y reverbs\n"
                            elif issue == 'very_low':
                                details += f"Correlación muy baja ({corr*100:.0f}%)\n"
                                # Rotate variation based on region index
                                mono_msg = variaciones_mono_es[region_idx % len(variaciones_mono_es)]
                                details += f"      → Estéreo muy amplio - {mono_msg}\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_es']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        details += f"      📊 Bandas afectadas: {', '.join(band_names)}\n"
                                        details += f"      💡 Posibles causas en {problem_bands[0]['name_es']}: {problem_bands[0]['causes_es']}\n"
                            elif issue == 'negative':
                                details += f"Correlación negativa ({corr*100:.0f}%)\n"
                                details += "      → Empieza cancelación de fase - pérdida en mono\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_es']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        details += f"      📊 Bandas afectadas: {', '.join(band_names)}\n"
                                        details += f"      💡 Posibles causas en {problem_bands[0]['name_es']}: {problem_bands[0]['causes_es']}\n"
                            elif issue == 'negative_severe':
                                details += f"Correlación negativa severa ({corr*100:.0f}%)\n"
                                details += "      → Cancelación de fase severa en mono\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_es']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        details += f"      📊 Bandas afectadas: {', '.join(band_names)}\n"
                                        details += f"      💡 Posibles causas en {problem_bands[0]['name_es']}: {problem_bands[0]['causes_es']}\n"
                            else:  # Fallback
                                details += f"Correlación: {corr*100:.0f}%\n"
                            
                            # Add spacing between regions for readability
                            details += "\n"
                        
                        # Show remaining count if more than max_regions_to_show
                        if num_regions > max_regions_to_show:
                            remaining = num_regions - max_regions_to_show
                            details += f"   ... y {remaining} región{'es' if remaining > 1 else ''} adicional{'es' if remaining > 1 else ''}\n"
                        
                        details += "\n"
                
                # M/S Ratio temporal
                if 'ms_ratio' in temporal:
                    ms_data = temporal['ms_ratio']
                    num_regions = ms_data.get('num_regions', 0)
                    regions = ms_data.get('regions', [])
                    
                    if num_regions > 0:
                        region_word = "región" if num_regions == 1 else "regiones"
                        attention_word = "a revisar"
                        details += f"📐 M/S Ratio ({num_regions} {region_word} {attention_word}):\n"
                        
                        # v7.3.51: Variaciones de mensajes para M/S bajo (eBook philosophy)
                        variaciones_ms_bajo_es = [
                            "Contenido estéreo reducido en este tramo.\n         Puede ser intencional según el arreglo.",
                            "Contenido estéreo reducido.\n         Común en secciones centradas (intros, versos, breaks).",
                            "Contenido estéreo reducido.\n         Verifica si el ancho estéreo coincide con la intención musical."
                        ]
                        
                        max_regions_to_show = 25
                        for region_idx, region in enumerate(regions[:max_regions_to_show]):
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            ms = region['avg_ms_ratio']
                            issue = region['issue']
                            
                            details += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            if issue == 'mono':
                                details += f"Ratio bajo ({ms:.2f})\n"
                                ms_msg = variaciones_ms_bajo_es[region_idx % len(variaciones_ms_bajo_es)]
                                details += f"      → {ms_msg}\n"
                            else:
                                details += f"Ratio alto ({ms:.2f})\n"
                                details += "      → Estéreo muy amplio - verifica comportamiento en mono\n"
                            
                            # Add spacing between regions for readability
                            details += "\n"
                        
                        # Show remaining count if more than max_regions_to_show
                        if num_regions > max_regions_to_show:
                            remaining = num_regions - max_regions_to_show
                            details += f"   ... y {remaining} región{'es' if remaining > 1 else ''} adicional{'es' if remaining > 1 else ''}\n"
                        
                        details += "\n"
                
                # L/R Balance temporal
                if 'lr_balance' in temporal:
                    lr_data = temporal['lr_balance']
                    num_regions = lr_data.get('num_regions', 0)
                    regions = lr_data.get('regions', [])
                    
                    if num_regions > 0:
                        region_word = "región" if num_regions == 1 else "regiones"
                        attention_word = "a revisar"
                        details += f"⚖️ Balance L/R ({num_regions} {region_word} {attention_word}):\n"
                        
                        max_regions_to_show = 25
                        for region in regions[:max_regions_to_show]:
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            balance = region['avg_balance_db']
                            side = region['side']
                            
                            details += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            if side == 'left':
                                details += f"Desbalance L: +{abs(balance):.1f} dB\n"
                            else:
                                details += f"Desbalance R: {balance:.1f} dB\n"
                            
                            # Add spacing between regions for readability
                            details += "\n"
                        
                        # Show remaining count if more than max_regions_to_show
                        if num_regions > max_regions_to_show:
                            remaining = num_regions - max_regions_to_show
                            details += f"   ... y {remaining} región{'es' if remaining > 1 else ''} adicional{'es' if remaining > 1 else ''}\n"
                        
                        details += "\n"
                
                details += "💡 Revisa los tiempos indicados arriba en tu DAW para evaluar si lo detectado en el Análisis Temporal responde a una decisión artística o si requiere un ajuste técnico antes del mastering.\n\n"
            
            else:
                # No temporal analysis available
                details += "   → Imagen estéreo con buena compatibilidad mono.\n"
                details += "     Se traducirá bien en diferentes sistemas.\n\n"
        
        # FREQUENCY BALANCE
        freq_metric = next((m for m in metrics if "Frequency" in m.get("internal_key", "")), None)
        if freq_metric:
            bass = freq_metric.get("low_percent", 0)  # FIXED: was "bass_pct"
            mid = freq_metric.get("mid_percent", 0)    # FIXED: was "mid_pct"
            high = freq_metric.get("high_percent", 0)  # FIXED: was "high_pct"
            
            details += "🎼 BALANCE DE FRECUENCIAS:\n"
            if bass:
                details += f"   • Graves (20-250 Hz): {bass:.0f}%\n"
            if mid:
                details += f"   • Medios (250 Hz-4 kHz): {mid:.0f}%\n"
            if high:
                details += f"   • Agudos (4 kHz-20 kHz): {high:.0f}%\n"
            details += "\n"
            
            # NEW v7.3.50: Genre detection message
            detected_genre = freq_metric.get("detected_genre", "")
            tonal_percentage = freq_metric.get("tonal_percentage", 100)
            tonal_issues = freq_metric.get("tonal_issues", [])
            
            if detected_genre:
                if tonal_percentage >= 90:
                    status_word = "saludable"
                elif tonal_percentage >= 70:
                    status_word = "aceptable"
                else:
                    status_word = "revisar"
                
                details += f"   📊 Balance de frecuencias similar a: {detected_genre} ({status_word})\n"
                
                if tonal_issues:
                    details += f"   ⚠️ Notas: {', '.join(tonal_issues)}\n"
                else:
                    details += "   → Distribución tonal balanceada.\n"
            else:
                details += "   → Distribución tonal balanceada.\n"
        
        return details
    
    else:  # English
        details = "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        details += "📊 COMPLETE TECHNICAL DETAILS\n"
        details += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        
        # HEADROOM
        headroom_metric = next((m for m in metrics if "Headroom" in m.get("internal_key", "")), None)
        if headroom_metric:
            peak_val = headroom_metric.get("peak_db", "")
            details += f"🎚️ HEADROOM: {peak_val}\n"
            details += "   → Peaks leave sufficient space for processing\n"
            details += "     without risk of clipping during mastering.\n"
            
            if "temporal_analysis" in headroom_metric:
                temporal = format_temporal_message(
                    headroom_metric["temporal_analysis"], 
                    "Headroom", 
                    lang
                )
                if temporal:
                    details += "  " + temporal.strip() + "\n"
            else:
                details += "   → Consistent headroom throughout the song.\n"
            details += "\n"
        
        # TRUE PEAK
        tp_metric = next((m for m in metrics if "True Peak" in m.get("internal_key", "")), None)
        if tp_metric:
            tp_val = tp_metric.get("value", "")
            details += f"🔊 TRUE PEAK: {tp_val}\n"
            details += "   → Safe for the mastering process.\n"
            details += "     Final peak control and codec compatibility are handled in mastering.\n"
            
            if "temporal_analysis" in tp_metric:
                temporal = format_temporal_message(
                    tp_metric["temporal_analysis"],
                    "True Peak",
                    lang
                )
                if temporal:
                    details += "  " + temporal.strip() + "\n"
            else:
                details += "   → Safety margins met throughout the track.\n"
            details += "\n"
        
        # PLR
        plr_metric = next((m for m in metrics if "PLR" in m.get("internal_key", "")), None)
        if plr_metric and plr_metric.get("value") != "N/A":
            plr_val = plr_metric.get("value", "")
            details += f"📈 DYNAMIC RANGE (PLR): {plr_val}\n"
            
            if isinstance(plr_val, str):
                try:
                    plr_num = float(plr_val.split()[0])
                    if plr_num >= 12:
                        details += "   → Excellent dynamic preservation. Mix breathes well.\n"
                        details += "   → Ideal for expressive mastering with natural punch.\n"
                    elif plr_num >= 8:
                        details += "   → Good dynamic range, appropriate for mastering.\n"
                    else:
                        details += "   → Somewhat compressed, but still workable in mastering.\n"
                except:
                    details += "   → Dynamic range measured.\n"
            details += "\n"
        
        # STEREO FIELD
        stereo_metric = next((m for m in metrics if "Stereo" in m.get("internal_key", "")), None)
        if stereo_metric:
            corr_val = stereo_metric.get("value", "")
            ms_ratio = stereo_metric.get("ms_ratio", 0)
            lr_balance = stereo_metric.get("lr_balance_db", 0)
            
            details += "🎧 STEREO FIELD:\n"
            details += f"   • Correlation: {corr_val}\n"
            if ms_ratio:
                details += f"   • M/S Ratio: {ms_ratio:.2f}\n"
            if lr_balance is not None:
                details += f"   • L/R Balance: {abs(lr_balance):.1f} dB\n"
            details += "\n"
            
            # Check for temporal analysis (from chunked mode)
            if "temporal_analysis" in stereo_metric:
                temporal = stereo_metric["temporal_analysis"]
                
                details += "▶ TEMPORAL ANALYSIS:\n\n"
                
                # v7.3.51: Positive feedback about mono coherence
                global_corr = stereo_metric.get("correlation", 0)
                if global_corr and global_corr >= 0.7:
                    details += "✅ High mono coherence detected\n"
                    details += "The mix maintains good correlation between channels.\n"
                    details += "Favors the mastering process and mono system compatibility.\n\n"
                
                # Correlation temporal - only regions that need attention
                if 'correlation' in temporal:
                    corr_data = temporal['correlation']
                    num_regions = corr_data.get('num_regions', 0)
                    regions = corr_data.get('regions', [])
                    
                    if num_regions > 0:
                        details += f"⚠️ Correlation ({num_regions} region{'s' if num_regions > 1 else ''} to pay attention to):\n"
                        
                        # v7.3.36.4: Variations to avoid mechanical repetition
                        variaciones_mono_en = [
                            "verify mono behavior",
                            "possible body loss in mono",
                            "may lose impact in mono"
                        ]
                        
                        max_regions_to_show = 25
                        for region_idx, region in enumerate(regions[:max_regions_to_show]):
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            corr = region['avg_correlation']
                            issue = region['issue']
                            band_corr = region.get('band_correlation')
                            
                            details += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            
                            # v7.3.51: Only report issues that need attention (< 0.5)
                            # Removed 'high' issue type - high correlation is not a problem
                            if issue == 'medium_low':
                                details += f"Moderate correlation ({corr*100:.0f}%)\n"
                                details += "      → Check stereo effects and reverbs\n"
                            elif issue == 'very_low':
                                details += f"Very low correlation ({corr*100:.0f}%)\n"
                                # Rotate variation based on region index
                                mono_msg = variaciones_mono_en[region_idx % len(variaciones_mono_en)]
                                details += f"      → Very wide stereo - {mono_msg}\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_en']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        details += f"      📊 Affected bands: {', '.join(band_names)}\n"
                                        details += f"      💡 Possible causes in {problem_bands[0]['name_en']}: {problem_bands[0]['causes_en']}\n"
                            elif issue == 'negative':
                                details += f"Negative correlation ({corr*100:.0f}%)\n"
                                details += "      → Phase cancellation begins - mono loss\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_en']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        details += f"      📊 Affected bands: {', '.join(band_names)}\n"
                                        details += f"      💡 Possible causes in {problem_bands[0]['name_en']}: {problem_bands[0]['causes_en']}\n"
                            elif issue == 'negative_severe':
                                details += f"Severe negative correlation ({corr*100:.0f}%)\n"
                                details += "      → Severe phase cancellation in mono\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_en']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        details += f"      📊 Affected bands: {', '.join(band_names)}\n"
                                        details += f"      💡 Possible causes in {problem_bands[0]['name_en']}: {problem_bands[0]['causes_en']}\n"
                            else:  # Fallback
                                details += f"Correlation: {corr*100:.0f}%\n"
                            
                            # Add spacing between regions for readability
                            details += "\n"
                        
                        # Show remaining count if more than max_regions_to_show
                        if num_regions > max_regions_to_show:
                            remaining = num_regions - max_regions_to_show
                            details += f"   ... and {remaining} additional region{'s' if remaining > 1 else ''}\n"
                        
                        details += "\n"
                
                # M/S Ratio temporal
                if 'ms_ratio' in temporal:
                    ms_data = temporal['ms_ratio']
                    num_regions = ms_data.get('num_regions', 0)
                    regions = ms_data.get('regions', [])
                    
                    if num_regions > 0:
                        details += f"📐 M/S Ratio ({num_regions} region{'s' if num_regions > 1 else ''} to review):\n"
                        
                        # v7.3.51: Message variations for low M/S (eBook philosophy)
                        variaciones_ms_bajo_en = [
                            "Reduced stereo content in this section.\n         May be intentional based on the arrangement.",
                            "Reduced stereo content.\n         Common in centered sections (intros, verses, breaks).",
                            "Reduced stereo content.\n         Verify if stereo width matches the musical intention."
                        ]
                        
                        max_regions_to_show = 25
                        for region_idx, region in enumerate(regions[:max_regions_to_show]):
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            ms = region['avg_ms_ratio']
                            issue = region['issue']
                            
                            details += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            if issue == 'mono':
                                details += f"Low ratio ({ms:.2f})\n"
                                ms_msg = variaciones_ms_bajo_en[region_idx % len(variaciones_ms_bajo_en)]
                                details += f"      → {ms_msg}\n"
                            else:
                                details += f"High ratio ({ms:.2f})\n"
                                details += "      → Very wide stereo - verify mono behavior\n"
                            
                            # Add spacing between regions for readability
                            details += "\n"
                        
                        # Show remaining count if more than max_regions_to_show
                        if num_regions > max_regions_to_show:
                            remaining = num_regions - max_regions_to_show
                            details += f"   ... and {remaining} additional region{'s' if remaining > 1 else ''}\n"
                        
                        details += "\n"
                
                # L/R Balance temporal
                if 'lr_balance' in temporal:
                    lr_data = temporal['lr_balance']
                    num_regions = lr_data.get('num_regions', 0)
                    regions = lr_data.get('regions', [])
                    
                    if num_regions > 0:
                        details += f"⚖️ L/R Balance ({num_regions} region{'s' if num_regions > 1 else ''} to review):\n"
                        
                        max_regions_to_show = 25
                        for region in regions[:max_regions_to_show]:
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            balance = region['avg_balance_db']
                            side = region['side']
                            
                            details += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            if side == 'left':
                                details += f"L imbalance: +{abs(balance):.1f} dB\n"
                            else:
                                details += f"R imbalance: {balance:.1f} dB\n"
                            
                            # Add spacing between regions for readability
                            details += "\n"
                        
                        # Show remaining count if more than max_regions_to_show
                        if num_regions > max_regions_to_show:
                            remaining = num_regions - max_regions_to_show
                            details += f"   ... and {remaining} additional region{'s' if remaining > 1 else ''}\n"
                        
                        details += "\n"
                
                details += "💡 Review the timestamps above in your DAW to evaluate if what's detected in the Temporal Analysis is an artistic decision or if it requires a technical adjustment before mastering.\n\n"
            
            else:
                # No temporal analysis available
                details += "   → Stereo image with good mono compatibility.\n"
                details += "     Will translate well across systems.\n\n"
        
        # FREQUENCY BALANCE
        freq_metric = next((m for m in metrics if "Frequency" in m.get("internal_key", "")), None)
        if freq_metric:
            bass = freq_metric.get("low_percent", 0)  # FIXED: was "bass_pct"
            mid = freq_metric.get("mid_percent", 0)    # FIXED: was "mid_pct"
            high = freq_metric.get("high_percent", 0)  # FIXED: was "high_pct"
            
            details += "🎼 FREQUENCY BALANCE:\n"
            if bass:
                details += f"   • Lows (20-250 Hz): {bass:.0f}%\n"
            if mid:
                details += f"   • Mids (250 Hz-4 kHz): {mid:.0f}%\n"
            if high:
                details += f"   • Highs (4 kHz-20 kHz): {high:.0f}%\n"
            details += "\n"
            
            # NEW v7.3.50: Genre detection message
            detected_genre = freq_metric.get("detected_genre", "")
            tonal_percentage = freq_metric.get("tonal_percentage", 100)
            tonal_issues = freq_metric.get("tonal_issues", [])
            
            if detected_genre:
                if tonal_percentage >= 90:
                    status_word = "healthy"
                elif tonal_percentage >= 70:
                    status_word = "acceptable"
                else:
                    status_word = "review"
                
                details += f"   📊 Frequency balance similar to: {detected_genre} ({status_word})\n"
                
                if tonal_issues:
                    details += f"   ⚠️ Notes: {', '.join(tonal_issues)}\n"
                else:
                    details += "   → Balanced tonal distribution.\n"
            else:
                details += "   → Balanced tonal distribution.\n"
        
        return details


def analyze_file_chunked(
    path: Path,
    oversample: int = 4,
    genre: Optional[str] = None,
    strict: bool = False,
    lang: str = "en",
    chunk_duration: float = 30.0,
    progress_callback = None,
    original_metadata: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Memory-optimized analysis for large files using chunked processing.
    Processes audio in chunks to avoid loading entire file into memory.
    
    Args:
        path: Audio file path
        oversample: Oversampling factor for true peak (1, 2, 4, or 'auto')
        genre: Genre hint for frequency balance evaluation
        strict: Use stricter commercial standards
        lang: Language for reports ('en' or 'es')
        chunk_duration: Duration of each chunk in seconds (default: 30s)
        progress_callback: Optional callback function(progress_value) for progress updates
        original_metadata: Optional dict with original file metadata (sample_rate, bit_depth)
    
    Returns:
        Same structure as analyze_file() but with chunked=True flag
    """
    analysis_start_time = time.time()  # Start timing (renamed to avoid conflict with chunk offset)
    
    print("🔄 CHUNKED ANALYSIS - Memory Optimized")
    
    # 1. Get file metadata without loading audio
    import soundfile as sf
    
    file_info = sf.info(str(path))
    sr = file_info.samplerate
    channels = file_info.channels
    duration = file_info.duration
    file_size = path.stat().st_size
    
    
    # Extract bit depth - USE ORIGINAL METADATA if provided
    if original_metadata and original_metadata.get('bit_depth'):
        bit_depth = original_metadata['bit_depth']
        sr = original_metadata.get('sample_rate', sr)  # Also use original sample rate
        print(f"✅ Using ORIGINAL metadata: {sr} Hz, {bit_depth}-bit")
    else:
        # Fallback to reading from current file
        subtype = file_info.subtype
        bit_depth = 0
        if 'PCM_' in subtype:
            try:
                bit_depth = int(subtype.split('_')[1])
            except:
                bit_depth = 16
        elif subtype == 'DOUBLE':
            bit_depth = 64
        elif 'FLOAT' in subtype:
            bit_depth = 32
    
    print(f"📁 File: {path.name}")
    print(f"📦 Chunk size: {chunk_duration} seconds")
    print(f"⏱️  Duration: {duration:.1f} seconds ({duration/60:.1f} minutes)")
    print(f"🔊 Channels: {channels}")
    print(f"💾 File size: {file_size / (1024*1024):.1f} MB")
    
    # Calculate number of chunks
    num_chunks = int(np.ceil(duration / chunk_duration))
    print(f"📦 Processing in {num_chunks} chunks")

    # v7.4.1 FIX: Detect mono file BEFORE processing
    # Check a representative MIDDLE segment (skip intro/outro per temporal analysis rules)
    # Old v7.4.0 checked only 0.5s from the start — too aggressive, intros are often mono/centered
    check_offset = min(5.0, duration * 0.1)   # Skip first 5s (or 10% for short files)
    check_duration = min(10.0, duration * 0.3)  # Check 10s (or 30% for short files)
    # Ensure we don't exceed file duration
    if check_offset + check_duration > duration:
        check_offset = 0.0
        check_duration = min(duration, 10.0)

    y_check, _ = librosa.load(str(path), sr=sr, offset=check_offset, duration=check_duration, mono=False, res_type='kaiser_fast')
    is_true_mono = False
    if y_check.ndim == 1:
        # File is natively mono
        is_true_mono = True
        print("ℹ️  Mono file detected - stereo analysis will not apply")
    elif y_check.shape[0] >= 2:
        # Check if stereo channels are identical (pseudo-stereo / bounced mono)
        if y_check.shape[0] > y_check.shape[1]:
            y_check = y_check.T
        if np.allclose(y_check[0], y_check[1], rtol=1e-5, atol=1e-8):
            is_true_mono = True
            print(f"ℹ️  Pseudo-stereo (identical channels) detected at {check_offset:.1f}s-{check_offset+check_duration:.1f}s - treating as mono")
    del y_check  # Free memory

    # 2. Initialize accumulators
    results = {
        'peaks': [],
        'tps': [],
        'lufs_values': [],
        'rms_values': [],                      # NEW: Track RMS for proper Crest Factor
        'correlations': [],
        'lr_balances': [],
        'ms_ratios': [],
        'chunk_durations': [],
        'freq_balance_data': [],                # NEW: Track frequency balance per chunk
        'tp_problem_chunks': [],           # Track chunks with TP > -1.0 dBTP
        'clipping_chunks': [],              # Track chunks with sample clipping
        'correlation_problem_chunks': [],   # Track chunks with correlation issues
        'ms_ratio_problem_chunks': [],      # Track chunks with M/S ratio issues
        'lr_balance_problem_chunks': [],    # Track chunks with L/R balance issues
        'is_true_mono': is_true_mono,       # v7.4.0: Track mono status
        'energy_rms_per_chunk': []          # v1.5: Raw RMS per 500ms window per chunk
    }
    
    # 3. Process each chunk
    for i in range(num_chunks):
        start_time = i * chunk_duration
        actual_chunk_duration = min(chunk_duration, duration - start_time)
        
        print(f"📦 Chunk {i+1}/{num_chunks} (offset: {start_time:.1f}s, duration: {actual_chunk_duration:.1f}s)")
        
        # Load only this chunk (STEREO)
        # Using res_type='kaiser_fast' for faster resampling (requires resampy)
        y, _ = librosa.load(
            str(path),
            sr=sr,
            offset=start_time,
            duration=actual_chunk_duration,
            mono=False,  # ← CRITICAL: Keep stereo
            res_type='kaiser_fast'  # ← Faster resampling for chunked analysis
        )
        
        # Ensure correct format (channels, samples)
        if y.ndim == 1:
            # Mono file - convert to pseudo-stereo
            y = np.stack([y, y])
        elif y.shape[0] > y.shape[1]:
            # Transpose if needed
            y = y.T
        
        print(f"   Loaded: {y.shape[0]} channels, {y.shape[1]} samples (~{y.nbytes / (1024*1024):.1f} MB)")
        
        # Calculate metrics for this chunk
        try:
            # Peak
            chunk_peak = np.max(np.abs(y))
            if chunk_peak <= 0:
                chunk_peak_db = -120.0
            else:
                try:
                    chunk_peak_db = 20 * math.log10(chunk_peak)
                except (ValueError, ZeroDivisionError):
                    chunk_peak_db = -120.0
            
            # True Peak (oversampled)
            chunk_tp_db = oversampled_true_peak_db(y, oversample)
            
            # LUFS (integrated)
            if HAS_PYLOUDNORM:
                meter = pyln.Meter(sr)
                chunk_lufs_raw = meter.integrated_loudness(y.T)
                # Handle -inf from pyloudnorm for very quiet signals or silence
                if np.isfinite(chunk_lufs_raw):
                    chunk_lufs = float(chunk_lufs_raw)
                else:
                    chunk_lufs = -40.0  # Safe fallback for -inf cases
                    print(f"⚠️  Chunk LUFS is -inf, using fallback value", file=sys.stderr)
            else:
                chunk_lufs = -23.0  # Safe default
            
            # Spatial metrics
            chunk_corr = stereo_correlation(y)
            chunk_lr = calculate_lr_balance(y)
            
            debug_ms = (i == 0)  # Only first chunk to avoid spam
            chunk_ms, _, _ = calculate_ms_ratio(y, debug=debug_ms)
            
            # Frequency balance (NEW - calculate per chunk)
            chunk_fb = band_balance_db(y, sr)
            
            # Store results
            results['peaks'].append(chunk_peak_db)
            results['tps'].append(chunk_tp_db)
            
            # Calculate RMS for this chunk (for proper Crest Factor)
            if y.shape[0] > 1:
                # Stereo: combined RMS
                rms_l = float(np.sqrt(np.mean(y[0].astype(np.float64) ** 2)))
                rms_r = float(np.sqrt(np.mean(y[1].astype(np.float64) ** 2)))
                chunk_rms = float(np.sqrt((rms_l**2 + rms_r**2) / 2))
            else:
                # Mono
                chunk_rms = float(np.sqrt(np.mean(y[0].astype(np.float64) ** 2)))
            
            chunk_rms_db = 20 * math.log10(chunk_rms) if chunk_rms > 0 else -120.0
            results['rms_values'].append(chunk_rms_db)
            results['lufs_values'].append(chunk_lufs)
            results['correlations'].append(chunk_corr)
            results['lr_balances'].append(chunk_lr)
            results['ms_ratios'].append(chunk_ms)
            results['chunk_durations'].append(actual_chunk_duration)
            
            # Store frequency balance data (weighted by duration for averaging later)
            if 'freq_balance_data' not in results:
                results['freq_balance_data'] = []
            results['freq_balance_data'].append({
                'duration': actual_chunk_duration,
                'low_percent': chunk_fb['low_percent'],
                'mid_percent': chunk_fb['mid_percent'],
                'high_percent': chunk_fb['high_percent'],
                'low_db': chunk_fb['low_db'],
                'mid_db': chunk_fb['mid_db'],
                'high_db': chunk_fb['high_db'],
                'd_low_mid_db': chunk_fb['d_low_mid_db'],
                'd_high_mid_db': chunk_fb['d_high_mid_db'],
                'spectral_6band': chunk_fb.get('spectral_6band', {})
            })

            # v1.5: Store raw RMS per 500ms window for energy curve aggregation
            _e_audio = y.mean(axis=0) if y.ndim > 1 and y.shape[0] > 1 else (y[0] if y.ndim > 1 else y)
            _e_audio = _e_audio.astype(np.float64)
            _e_win = int(sr * 500 / 1000)
            if _e_win < 1:
                _e_win = 1
            _e_n = max(1, len(_e_audio) // _e_win)
            _e_rms_list = []
            for _e_i in range(_e_n):
                _e_s = _e_i * _e_win
                _e_e = min(_e_s + _e_win, len(_e_audio))
                _e_rms_list.append(float(np.sqrt(np.mean(_e_audio[_e_s:_e_e] ** 2))))
            results['energy_rms_per_chunk'].append(_e_rms_list)

            # ═══════════════════════════════════════════════════════════
            # SUB-CHUNK TEMPORAL ANALYSIS (5-second windows with 50% overlap)
            # Provides terminal-level precision (±2-3s) for problem detection
            # Uses same parameters as terminal: 5s windows, 50% overlap, 0.0 dBTP threshold
            # ═══════════════════════════════════════════════════════════
            
            window_duration = 5.0  # seconds
            hop_duration = 2.5     # 50% overlap (like terminal)
            window_samples = int(window_duration * sr)
            hop_samples = int(hop_duration * sr)
            
            # Calculate number of windows with overlap
            num_samples = y.shape[1]
            num_windows = int(np.ceil((num_samples - window_samples) / hop_samples)) + 1
            
            for w in range(num_windows):
                window_offset = w * hop_samples
                window_end = min(window_offset + window_samples, num_samples)
                
                # Skip if window is too short
                if window_end - window_offset < sr:  # Less than 1 second
                    continue
                
                window = y[:, window_offset:window_end]
                window_time = start_time + (window_offset / sr)
                window_dur = (window_end - window_offset) / sr
                
                # 1. True Peak temporal (per window)
                # Terminal uses threshold of 0.0 dBTP (not -1.0)
                window_tp = oversampled_true_peak_db(window, oversample)
                if window_tp > 0.0:  # Changed from -1.0 to 0.0 (terminal threshold)
                    results['tp_problem_chunks'].append({
                        'chunk': i + 1,
                        'window': w + 1,
                        'start_time': window_time,
                        'end_time': window_time + window_dur,
                        'tp_db': window_tp
                    })
                
                # 2. Sample clipping temporal (per window)
                window_peak = np.max(np.abs(window))
                if window_peak >= 0.999999:
                    results['clipping_chunks'].append({
                        'chunk': i + 1,
                        'window': w + 1,
                        'start_time': window_time,
                        'end_time': window_time + window_dur,
                        'peak': window_peak
                    })
                
                # 3. Stereo correlation temporal (per window)
                # v7.3.30: Only flag as problem if truly problematic:
                # - high (>0.97): Nearly mono (was 0.95)
                # - very_low (<0.3): Severe phase issues
                # - negative (<0.0): Phase inversion
                # NOTE: 0.3-0.7 (30-70%) is HEALTHY stereo, NOT a problem!
                window_corr = stereo_correlation(window)
                
                # v7.3.35: Calculate band correlation only when there's a problem
                # (to avoid overhead on healthy windows)
                band_corr = None
                
                # v7.3.51: REMOVED correlation > 0.97 detection
                # High correlation is NOT a problem - it's excellent mono compatibility
                # Only report correlation issues that need attention (< 0.5)
                
                # v7.3.51: Added 0.3-0.5 range as "medium_low" (needs review)
                if window_corr >= 0.3 and window_corr < 0.5:
                    # Medium-low correlation - worth reviewing
                    results['correlation_problem_chunks'].append({
                        'chunk': i + 1,
                        'window': w + 1,
                        'start_time': window_time,
                        'end_time': window_time + window_dur,
                        'correlation': window_corr,
                        'issue': 'medium_low',
                        'severity': 'warning',
                        'band_correlation': None
                    })
                elif window_corr < 0.3 and window_corr >= 0.0:
                    # Very low correlation - v7.3.35: analyze which bands have the problem
                    band_corr = correlation_by_band(window, sr)
                    results['correlation_problem_chunks'].append({
                        'chunk': i + 1,
                        'window': w + 1,
                        'start_time': window_time,
                        'end_time': window_time + window_dur,
                        'correlation': window_corr,
                        'issue': 'very_low',
                        'severity': 'critical',
                        'band_correlation': band_corr
                    })
                elif window_corr < 0.0 and window_corr >= -0.2:
                    # Negative correlation - v7.3.35: analyze which bands have the problem
                    band_corr = correlation_by_band(window, sr)
                    results['correlation_problem_chunks'].append({
                        'chunk': i + 1,
                        'window': w + 1,
                        'start_time': window_time,
                        'end_time': window_time + window_dur,
                        'correlation': window_corr,
                        'issue': 'negative',
                        'severity': 'critical',
                        'band_correlation': band_corr
                    })
                elif window_corr < -0.2:
                    # Severe negative correlation - v7.3.35: analyze which bands have the problem
                    band_corr = correlation_by_band(window, sr)
                    results['correlation_problem_chunks'].append({
                        'chunk': i + 1,
                        'window': w + 1,
                        'start_time': window_time,
                        'end_time': window_time + window_dur,
                        'correlation': window_corr,
                        'issue': 'negative_severe',
                        'severity': 'critical',
                        'band_correlation': band_corr
                    })
                
                # 4. M/S Ratio temporal (per window)
                window_ms, _, _ = calculate_ms_ratio(window)
                if window_ms < 0.1:
                    results['ms_ratio_problem_chunks'].append({
                        'chunk': i + 1,
                        'window': w + 1,
                        'start_time': window_time,
                        'end_time': window_time + window_dur,
                        'ms_ratio': window_ms,
                        'issue': 'mono',
                        'severity': 'warning'
                    })
                elif window_ms > 1.2:
                    results['ms_ratio_problem_chunks'].append({
                        'chunk': i + 1,
                        'window': w + 1,
                        'start_time': window_time,
                        'end_time': window_time + window_dur,
                        'ms_ratio': window_ms,
                        'issue': 'too_wide',
                        'severity': 'warning'
                    })
                
                # 5. L/R Balance temporal (per window)
                window_lr = calculate_lr_balance(window)
                if abs(window_lr) > 2.0:
                    results['lr_balance_problem_chunks'].append({
                        'chunk': i + 1,
                        'window': w + 1,
                        'start_time': window_time,
                        'end_time': window_time + window_dur,
                        'lr_balance_db': window_lr,
                        'side': 'left' if window_lr > 0 else 'right',
                        'severity': 'critical' if abs(window_lr) > 3.0 else 'warning'
                    })
            
            print(f"   ✅ Peak: {chunk_peak_db:.1f} dBFS, TP: {chunk_tp_db:.1f} dBTP, LUFS: {chunk_lufs:.1f}")
            
            # Update progress callback if provided
            # Progress: 10% (file loaded) + 60% (chunks processing) = 10-70%
            if progress_callback:
                chunk_progress = 10 + int((i + 1) / num_chunks * 60)
                progress_callback(chunk_progress)
            
        except Exception as e:
            print(f"   ❌ Error in chunk {i+1}: {e}")
            # Use safe defaults
            results['peaks'].append(-60.0)
            results['tps'].append(-60.0)
            results['lufs_values'].append(-40.0)
            results['correlations'].append(0.5)
            results['lr_balances'].append(0.0)
            results['ms_ratios'].append(0.3)
            results['chunk_durations'].append(actual_chunk_duration)
    
    print("Aggregating results...")
    
    # 4. Aggregate results using weighted average
    total_duration = sum(results['chunk_durations'])
    
    # Weighted averages
    final_peak = max(results['peaks']) if results['peaks'] else -60.0
    final_tp = max(results['tps']) if results['tps'] else -60.0
    
    # LUFS: weighted average using ENERGY (not dB arithmetic)
    # EBU R128 specifies loudness is summed in linear domain, not dB
    # Formula: LUFS_total = 10 * log10(sum(10^(LUFS_i/10) * duration_i) / total_duration)
    # v7.4.0 FIX: Handle edge case where ALL chunks are below -70dB
    lufs_reliable = True
    if total_duration > 0 and results['lufs_values']:
        # Filter valid LUFS values (not None and above -70dB threshold)
        valid_lufs_data = [
            (lufs, dur)
            for lufs, dur in zip(results['lufs_values'], results['chunk_durations'])
            if lufs is not None and lufs > -70
        ]

        if valid_lufs_data:
            lufs_energy_sum = sum((10 ** (lufs / 10)) * dur for lufs, dur in valid_lufs_data)
            if lufs_energy_sum > 0:
                weighted_lufs = 10 * math.log10(lufs_energy_sum / total_duration)
            else:
                weighted_lufs = -70.0
                lufs_reliable = False
        else:
            # v7.4.0: All chunks below -70dB - file is essentially silent
            weighted_lufs = -70.0
            lufs_reliable = False
            print("⚠️  All chunks below -70 LUFS - file is very quiet or silent", file=sys.stderr)
    else:
        weighted_lufs = -23.0
        lufs_reliable = False
    
    # PLR: difference between peak and LUFS
    # v7.4.0 FIX: Only calculate PLR if LUFS is reliable
    if lufs_reliable:
        final_plr = final_peak - weighted_lufs
        plr_reliable = True
    else:
        final_plr = None
        plr_reliable = False
        print("⚠️  PLR not calculated - LUFS measurement unreliable", file=sys.stderr)
    
    # Stereo metrics: weighted averages (filter None as defensive measure)
    valid_corr = [(c, d) for c, d in zip(results['correlations'], results['chunk_durations']) if c is not None]
    valid_corr_dur = sum(d for _, d in valid_corr)
    final_correlation = sum(c * d for c, d in valid_corr) / valid_corr_dur if valid_corr_dur > 0 else 0.5

    valid_lr = [(v, d) for v, d in zip(results['lr_balances'], results['chunk_durations']) if v is not None]
    valid_lr_dur = sum(d for _, d in valid_lr)
    final_lr_balance = sum(v * d for v, d in valid_lr) / valid_lr_dur if valid_lr_dur > 0 else 0.0

    valid_ms = [(v, d) for v, d in zip(results['ms_ratios'], results['chunk_durations']) if v is not None]
    valid_ms_dur = sum(d for _, d in valid_ms)
    final_ms_ratio = sum(v * d for v, d in valid_ms) / valid_ms_dur if valid_ms_dur > 0 else 0.3
    
    print(f"✅ Peak: {final_peak:.2f} dBFS")
    print(f"✅ True Peak: {final_tp:.2f} dBTP")
    print(f"✅ LUFS: {weighted_lufs:.2f}" + (" (unreliable)" if not lufs_reliable else ""))
    print(f"✅ PLR: {final_plr:.2f} dB" if plr_reliable else "⚠️  PLR: N/A (LUFS unreliable)")
    print(f"✅ Correlation: {final_correlation:.3f}")
    print(f"✅ L/R Balance: {final_lr_balance:+.2f} dB")
    print(f"✅ M/S Ratio: {final_ms_ratio:.2f}")

    # 5. Detect territory and mastered status
    # v7.4.0: Pass None for PLR if unreliable
    territory = detect_territory(weighted_lufs if lufs_reliable else None, final_peak, final_tp, final_plr)
    is_mastered = detect_mastered_file(weighted_lufs if lufs_reliable else None, final_peak, final_tp, final_plr, 0.0)
    
    print(f"📍 Territory: {territory}")
    print(f"🎛️  {'Mastered' if is_mastered else 'Mix (not mastered)'}")
    
    # v7.3.51 FIX: Helper function to classify correlation issue based on actual value
    # Only issues < 0.5 are reported - high correlation is NOT a problem
    def _classify_correlation_issue(corr: float) -> str:
        """
        Classify correlation issue based on the actual correlation value.
        v7.3.51: Removed 'high' classification - high correlation is not a problem.
        Only correlation < 0.5 is reported.
        """
        if corr >= 0.5:
            return 'healthy'  # Not a problem - won't be reported
        elif corr >= 0.3 and corr < 0.5:
            return 'medium_low'  # Worth reviewing
        elif corr >= 0.0 and corr < 0.3:
            return 'very_low'
        elif corr >= -0.2 and corr < 0.0:
            return 'negative'
        else:
            return 'negative_severe'
    
    # Helper function to merge consecutive chunks into regions
    def merge_chunks_into_regions(problem_chunks, gap_threshold=2.5, track_duration=None, 
                                     min_region_duration=8.0, exclude_intro_outro=5.0):
        """
        Merge consecutive problem chunks into continuous regions.
        
        v7.3.30: Added filtering:
        - min_region_duration: Ignore regions shorter than this (default 8s)
        - exclude_intro_outro: Exclude first and last N seconds (default 5s)
        
        Gap threshold of 2.5s matches terminal behavior:
        - Small gaps (< 2.5s) are absorbed into continuous regions
        - Larger gaps create separate regions
        - Results in practical, user-friendly region reporting
        
        Example:
          Windows: 30-35s, 35-40s, [gap 2s], 42-47s, 47-52s
          Result: One region 30-52s (gap < 2.5s absorbed)
        """
        print(f"🔧 merge_chunks_into_regions called with gap_threshold={gap_threshold}s")
        if not problem_chunks:
            return []
        
        regions = []
        current_region = {
            'start': problem_chunks[0]['start_time'],
            'end': problem_chunks[0]['end_time'],
            'chunks': [problem_chunks[0]]
        }
        
        for chunk in problem_chunks[1:]:
            # Calculate gap between end of current region and start of next chunk
            # With 50% overlap, chunks can overlap (negative gap), treat as 0
            gap = max(0, chunk['start_time'] - current_region['end'])
            print(f"   Gap: {gap:.2f}s (threshold: {gap_threshold}s) - {'MERGE' if gap <= gap_threshold else 'NEW REGION'}")
            
            # Use <= to include exact threshold (2.5s gap should merge)
            if gap <= gap_threshold:
                current_region['end'] = chunk['end_time']
                current_region['chunks'].append(chunk)
            else:
                # Save current region and start new one
                regions.append(current_region)
                current_region = {
                    'start': chunk['start_time'],
                    'end': chunk['end_time'],
                    'chunks': [chunk]
                }
        
        # Don't forget last region
        regions.append(current_region)
        
        # v7.3.30: Apply filters
        filtered_regions = []
        for r in regions:
            region_duration = r['end'] - r['start']
            
            # Skip if too short
            if region_duration < min_region_duration:
                print(f"   ⏭️ Skipping region {r['start']:.0f}-{r['end']:.0f}s (duration {region_duration:.1f}s < {min_region_duration}s)")
                continue
            
            # Skip if entirely in intro
            if r['end'] <= exclude_intro_outro:
                print(f"   ⏭️ Skipping region {r['start']:.0f}-{r['end']:.0f}s (in intro)")
                continue
            
            # Skip if entirely in outro (if track_duration is known)
            if track_duration and r['start'] >= (track_duration - exclude_intro_outro):
                print(f"   ⏭️ Skipping region {r['start']:.0f}-{r['end']:.0f}s (in outro)")
                continue
            
            filtered_regions.append(r)
        
        return filtered_regions
    
    # Build metrics array using the ACTUAL evaluation functions from analyzer
    # This ensures IDENTICAL scoring between normal and chunked analysis
    
    metrics = []
    lang_picked = "es" if lang == "es" else "en"
    
    # Import evaluation functions
    from analyzer import (
        status_headroom, status_true_peak, status_dc_offset,
        status_lufs, status_plr, status_crest_factor,
        evaluate_stereo_field_comprehensive, status_freq
    )
    
    # 1. Headroom
    # In dBFS, headroom is the peak level itself (negative value)
    # Headroom = distance to 0 dBFS ceiling = peak value
    headroom = final_peak  # Both are negative in dBFS (e.g., -6.28 dBFS)
    st_h, msg_h, _ = status_headroom(final_peak, strict, lang)
    
    # Build clipping temporal analysis if there are clipping chunks
    # v7.3.36: Unified structure with normal mode
    clipping_temporal = None
    if results['clipping_chunks']:
        # Merge consecutive chunks into regions (clipping doesn't need intro/outro filter)
        regions = merge_chunks_into_regions(results['clipping_chunks'], track_duration=duration, min_region_duration=0)
        
        # Calculate affected percentage based on clipping duration vs total duration
        clipping_duration = sum(r['end'] - r['start'] for r in regions)
        affected_percentage = (clipping_duration / duration * 100) if duration > 0 else 0
        severity = "widespread" if affected_percentage >= 1.0 else "localized"
        
        clipping_temporal = {
            'severity': severity,
            'affected_percentage': round(affected_percentage, 3),
            'problem_regions': [
                {
                    'start': format_timestamp(r['start']),
                    'end': format_timestamp(r['end']),
                    'start_seconds': r['start'],
                    'end_seconds': r['end']
                }
                for r in regions[:10]
            ],
            'total_regions': len(regions)
        }
    
    headroom_metric = {
        "name": "Headroom",
        "internal_key": "Headroom",
        "value": f"{headroom:.1f} dBFS",
        "status": st_h,
        "message": msg_h,
        "peak_db": f"{final_peak:.1f} dBFS"
    }
    
    if clipping_temporal:
        headroom_metric["clipping_temporal"] = clipping_temporal
    
    metrics.append(headroom_metric)
    
    # 2. True Peak
    st_tp, msg_tp, _, tp_hard = status_true_peak(final_tp, strict, lang)
    
    # Build temporal analysis if there are problem chunks
    # v7.3.36: Unified structure with normal mode
    tp_temporal = None
    if results['tp_problem_chunks']:
        # FIRST: Merge consecutive chunks into regions (True Peak uses 10s minimum)
        regions = merge_chunks_into_regions(results['tp_problem_chunks'], track_duration=duration, min_region_duration=10.0)
        
        # THEN: Calculate percentage based on MERGED REGIONS (not individual windows)
        # This avoids double-counting overlapping windows
        problem_duration = sum(
            region['end'] - region['start']
            for region in regions
        )
        percentage = (problem_duration / duration) * 100 if duration > 0 else 0
        severity = "widespread" if percentage >= 20 else "localized"
        
        tp_temporal = {
            'severity': severity,
            'affected_percentage': round(percentage, 0),
            'problem_regions': [
                {
                    'start': format_timestamp(r['start']),
                    'end': format_timestamp(r['end']),
                    'start_seconds': r['start'],
                    'end_seconds': r['end']
                }
                for r in regions[:10]
            ],
            'total_regions': len(regions),
            'max_value': round(final_tp, 1)
        }
    elif final_tp > -1.0:
        # If no regions found but TP is high, create informative message
        # This happens when peak is brief (transient) but still problematic
        lang_picked = _pick_lang(lang)
        if lang_picked == 'es':
            info_message = (
                f"El pico máximo ({final_tp:.1f} dBTP) está cerca del límite digital, "
                "pero ocurre en momentos muy breves (transitorios). "
                "Aunque no se mantiene de forma sostenida durante 5 segundos o más a lo largo de la canción, "
                "sigue siendo un indicador de procesamiento de master."
            )
        else:
            info_message = (
                f"The maximum peak ({final_tp:.1f} dBTP) is close to the digital ceiling, "
                "but occurs in very brief moments (transients). "
                "Although it is not sustained for 5 seconds or longer throughout the song, "
                "it remains an indicator of mastering-level processing."
            )
        
        tp_temporal = {
            'severity': 'none',
            'affected_percentage': 0,
            'problem_regions': [],
            'total_regions': 0,
            'max_value': round(final_tp, 1),
            'info_only': True,
            'info_message': info_message
        }
    
    tp_metric = {
        "name": "True Peak",
        "internal_key": "True Peak",
        "value": f"{final_tp:.1f} dBTP",
        "status": st_tp,
        "message": msg_tp
    }
    
    if tp_temporal:
        tp_metric["temporal_analysis"] = tp_temporal
    
    metrics.append(tp_metric)
    
    # 3. DC Offset (assume not detected in chunked analysis)
    dc_data = {"detected": False, "max_offset": 0.0}
    st_dc, msg_dc, _ = status_dc_offset(dc_data, lang)
    
    metrics.append({
        "name": "DC Offset",
        "internal_key": "DC Offset",
        "value": "No detectado" if lang == "es" else "Not detected",
        "status": st_dc,
        "message": msg_dc,
        "details": dc_data
    })
    
    # 4. LUFS
    lufs_reliable = duration >= MIN_DURATION_FOR_LUFS
    st_l, msg_l, _ = status_lufs(weighted_lufs, "chunked", lufs_reliable, lang)
    
    metrics.append({
        "name": "LUFS (Integrated)",
        "internal_key": "LUFS (Integrated)",
        "value": f"{weighted_lufs:.1f} LUFS",
        "status": st_l,
        "message": f"{msg_l} (method: chunked)",
        "method": "chunked",
        "reliable": lufs_reliable
    })
    
    # 5. PLR
    # v7.4.0 FIX: Only include PLR if LUFS is reliable
    if plr_reliable and final_plr is not None:
        st_p, msg_p, _ = status_plr(final_plr, True, strict, lang)
        metrics.append({
            "name": "PLR",
            "internal_key": "PLR",
            "value": f"{final_plr:.1f} dB",
            "status": st_p,
            "message": msg_p,
            "reliable": True
        })
    else:
        # PLR not available - LUFS unreliable
        plr_msg = "PLR no disponible (archivo muy corto o silencioso para medición confiable)" if lang == "es" else "PLR not available (file too short or silent for reliable measurement)"
        metrics.append({
            "name": "PLR",
            "internal_key": "PLR",
            "value": "N/A",
            "status": "info",
            "message": plr_msg,
            "reliable": False
        })
    
    # 6. Crest Factor (proper calculation with RMS)
    # v7.4.0 FIX: RMS values are in dB - must convert to linear, average, then back to dB
    # Arithmetic averaging of dB values is mathematically incorrect
    if results['rms_values'] and results['chunk_durations']:
        # Convert dB to linear: linear = 10^(dB/20)
        linear_rms_values = [10 ** (db / 20) for db in results['rms_values'] if db > -120]
        if linear_rms_values:
            # Weighted average in linear domain
            weights_for_rms = results['chunk_durations'][:len(linear_rms_values)]
            weighted_linear_rms = np.average(linear_rms_values, weights=weights_for_rms)
            # Convert back to dB: dB = 20 * log10(linear)
            weighted_rms = 20 * np.log10(weighted_linear_rms) if weighted_linear_rms > 0 else -120.0
        else:
            weighted_rms = -120.0
    else:
        weighted_rms = -120.0

    # Crest Factor = Peak - RMS (NOT Peak - LUFS like PLR)
    crest = final_peak - weighted_rms
    st_cf, msg_cf, _ = status_crest_factor(crest, lang)
    
    # Always use "info" status when PLR is available (chunked mode always has PLR)
    metrics.append({
        "name": "Crest Factor",
        "internal_key": "Crest Factor",
        "value": f"{crest:.1f} dB",
        "status": "info",  # Always info when PLR exists
        "message": "Informativo (usa PLR como métrica principal de dinámica)." if lang == "es" else "Informational (use PLR as the primary dynamics metric)."
    })
    
    # 7. Stereo Field (comprehensive evaluation)
    st_s, msg_s = evaluate_stereo_field_comprehensive(
        final_correlation, 
        final_ms_ratio, 
        final_lr_balance, 
        lang, 
        strict
    )
    
    # Build comprehensive stereo temporal analysis
    stereo_temporal = None
    has_stereo_problems = (
        results['correlation_problem_chunks'] or 
        results['ms_ratio_problem_chunks'] or 
        results['lr_balance_problem_chunks']
    )
    
    if has_stereo_problems:
        stereo_temporal = {}
        
        # 1. Correlation temporal analysis
        # v7.3.34 FIX: Recalculate issue based on avg_correlation, not first chunk
        if results['correlation_problem_chunks']:
            corr_regions = merge_chunks_into_regions(results['correlation_problem_chunks'], track_duration=duration)
            
            # Build regions with corrected issue classification
            corrected_regions = []
            for r in corr_regions[:25]:  # Show up to 25 regions
                avg_corr = sum(c['correlation'] for c in r['chunks']) / len(r['chunks'])
                
                # v7.3.35: Aggregate band correlations from chunks that have them
                band_corrs = [c.get('band_correlation') for c in r['chunks'] if c.get('band_correlation')]
                avg_band_corr = None
                if band_corrs:
                    # Average the band correlations across chunks
                    avg_band_corr = {}
                    for band in ['sub_bass', 'bass_mid', 'mid', 'mid_high', 'high']:
                        values = [bc[band] for bc in band_corrs if band in bc and bc[band] is not None]
                        if values:
                            avg_band_corr[band] = sum(values) / len(values)
                
                corrected_regions.append({
                    'start': r['start'],
                    'end': r['end'],
                    'duration': r['end'] - r['start'],
                    'avg_correlation': avg_corr,
                    'issue': _classify_correlation_issue(avg_corr),  # FIX: Reclassify based on average
                    'severity': max(c['severity'] for c in r['chunks']),
                    'band_correlation': avg_band_corr  # v7.3.35: Per-band analysis
                })
            
            stereo_temporal['correlation'] = {
                'num_regions': len(corr_regions),
                'regions': corrected_regions
            }
        
        # 2. M/S Ratio temporal analysis
        if results['ms_ratio_problem_chunks']:
            ms_regions = merge_chunks_into_regions(results['ms_ratio_problem_chunks'], track_duration=duration)
            stereo_temporal['ms_ratio'] = {
                'num_regions': len(ms_regions),
                'regions': [
                    {
                        'start': r['start'],
                        'end': r['end'],
                        'duration': r['end'] - r['start'],
                        'avg_ms_ratio': sum(c['ms_ratio'] for c in r['chunks']) / len(r['chunks']),
                        'issue': r['chunks'][0]['issue'],  # 'mono' or 'too_wide'
                        'severity': max(c['severity'] for c in r['chunks'])
                    }
                    for r in ms_regions[:25]
                ]
            }
        
        # 3. L/R Balance temporal analysis
        if results['lr_balance_problem_chunks']:
            lr_regions = merge_chunks_into_regions(results['lr_balance_problem_chunks'], track_duration=duration)
            stereo_temporal['lr_balance'] = {
                'num_regions': len(lr_regions),
                'regions': [
                    {
                        'start': r['start'],
                        'end': r['end'],
                        'duration': r['end'] - r['start'],
                        'avg_balance_db': sum(c['lr_balance_db'] for c in r['chunks']) / len(r['chunks']),
                        'side': r['chunks'][0]['side'],  # 'left' or 'right'
                        'severity': max(c['severity'] for c in r['chunks'])
                    }
                    for r in lr_regions[:25]
                ]
            }
    
    # v7.4.0 FIX: Handle mono files properly
    if results.get('is_true_mono', False):
        # Mono file - stereo analysis does not apply
        mono_msg_es = "Archivo mono detectado. El análisis estéreo no aplica."
        mono_msg_en = "Mono file detected. Stereo analysis does not apply."
        stereo_metric = {
            "name": "Stereo Width",
            "internal_key": "Stereo Width",
            "value": "Mono" if lang != "es" else "Mono",
            "correlation": 1.0,
            "ms_ratio": 0.0,
            "lr_balance_db": 0.0,
            "status": "info",
            "message": mono_msg_es if lang == "es" else mono_msg_en,
            "is_mono": True
        }
    else:
        stereo_metric = {
            "name": "Stereo Width",
            "internal_key": "Stereo Width",
            "value": f"{final_correlation*100:.0f}% corr | M/S: {final_ms_ratio:.2f} | L/R: {final_lr_balance:+.1f} dB",
            "correlation": final_correlation,
            "ms_ratio": round(final_ms_ratio, 2),
            "lr_balance_db": round(final_lr_balance, 1),
            "status": st_s,
            "message": msg_s,
            "is_mono": False
        }

        if stereo_temporal:
            stereo_metric["temporal_analysis"] = stereo_temporal

    metrics.append(stereo_metric)
    
    # 8. Frequency Balance (calculated from chunks with weighted average)
    # Calculate weighted average of frequency balance across all chunks
    if 'freq_balance_data' in results and results['freq_balance_data']:
        total_duration = sum(chunk['duration'] for chunk in results['freq_balance_data'])
        
        # Weighted average for percentages
        final_low_percent = sum(chunk['low_percent'] * chunk['duration'] for chunk in results['freq_balance_data']) / total_duration
        final_mid_percent = sum(chunk['mid_percent'] * chunk['duration'] for chunk in results['freq_balance_data']) / total_duration
        final_high_percent = sum(chunk['high_percent'] * chunk['duration'] for chunk in results['freq_balance_data']) / total_duration
        
        # Weighted average for dB values
        final_low_db = sum(chunk['low_db'] * chunk['duration'] for chunk in results['freq_balance_data']) / total_duration
        final_mid_db = sum(chunk['mid_db'] * chunk['duration'] for chunk in results['freq_balance_data']) / total_duration
        final_high_db = sum(chunk['high_db'] * chunk['duration'] for chunk in results['freq_balance_data']) / total_duration
        
        # Calculate deltas
        final_d_low_mid_db = final_low_db - final_mid_db
        final_d_high_mid_db = final_high_db - final_mid_db
        
        # Aggregate spectral 6-band from chunks (weighted average)
        spectral_6band_agg = {"sub": 0.0, "low": 0.0, "low_mid": 0.0, "mid": 0.0, "high_mid": 0.0, "high": 0.0}
        for chunk_data in results['freq_balance_data']:
            s6 = chunk_data.get('spectral_6band', {})
            for band in spectral_6band_agg:
                spectral_6band_agg[band] += s6.get(band, 0.0) * chunk_data['duration']
        for band in spectral_6band_agg:
            spectral_6band_agg[band] = round(spectral_6band_agg[band] / total_duration, 2)

        fb = {
            "low_percent": final_low_percent,
            "mid_percent": final_mid_percent,
            "high_percent": final_high_percent,
            "low_db": final_low_db,
            "mid_db": final_mid_db,
            "high_db": final_high_db,
            "d_low_mid_db": final_d_low_mid_db,
            "d_high_mid_db": final_d_high_mid_db,
            "spectral_6band": spectral_6band_agg
        }

        print(f"\n✅ Frequency Balance calculated from {len(results['freq_balance_data'])} chunks")
        print(f"   Low (20-250Hz): {final_low_percent:.1f}% | Mid (250Hz-4kHz): {final_mid_percent:.1f}% | High (4kHz-20kHz): {final_high_percent:.1f}%")
    else:
        # Fallback if no frequency data (shouldn't happen)
        fb = {
            "low_percent": 33.0,
            "mid_percent": 34.0,
            "high_percent": 33.0,
            "low_db": 0.0,
            "mid_db": 0.0,
            "high_db": 0.0,
            "d_low_mid_db": 0.0,
            "d_high_mid_db": 0.0,
            "spectral_6band": {"sub": 0.0, "low": 0.0, "low_mid": 0.0, "mid": 0.0, "high_mid": 0.0, "high": 0.0}
        }
        print("\n⚠️  No frequency balance data available (using fallback)")
    
    st_f, msg_f, _ = status_freq(fb, genre, strict, lang)
    
    # NEW v7.3.50: Detect genre and calculate tonal health
    genre_detection = detect_closest_genre(fb['low_percent'], fb['mid_percent'], fb['high_percent'])
    tonal_health = calculate_tonal_balance_percentage(fb['low_percent'], fb['mid_percent'], fb['high_percent'])
    
    # Localize frequency band labels
    lang_picked = _pick_lang(lang)
    if lang_picked == 'es':
        low_label, mid_label, high_label = "Graves", "Medios", "Agudos"
        delta_low_mid = "ΔG-M"
        delta_high_mid = "ΔA-M"
    else:
        low_label, mid_label, high_label = "Low", "Mid", "High"
        delta_low_mid = "ΔL-M"
        delta_high_mid = "ΔH-M"
    
    metrics.append({
        "name": METRIC_NAMES[lang_picked]["Frequency Balance"],
        "internal_key": "Frequency Balance",
        "value": (
            f"{low_label}: {fb['low_percent']:.0f}% | "
            f"{mid_label}: {fb['mid_percent']:.0f}% | "
            f"{high_label}: {fb['high_percent']:.0f}%"
        ),
        "value_detailed": (
            f"{low_label}: {fb['low_db']:.1f} dB ({fb['low_percent']:.0f}%) | "
            f"{mid_label}: {fb['mid_db']:.1f} dB ({fb['mid_percent']:.0f}%) | "
            f"{high_label}: {fb['high_db']:.1f} dB ({fb['high_percent']:.0f}%) | "
            f"{delta_low_mid}: {fb['d_low_mid_db']:+.1f} dB | "
            f"{delta_high_mid}: {fb['d_high_mid_db']:+.1f} dB"
        ),
        "status": st_f,
        "message": msg_f,
        **fb,
        # NEW v7.3.50: Genre detection fields
        "detected_genre": genre_detection["genre"],
        "genre_confidence": genre_detection["confidence"],
        "genre_in_range": genre_detection["in_range"],
        "genre_description": genre_detection["description_es"] if lang_picked == 'es' else genre_detection["description_en"],
        "tonal_percentage": tonal_health["percentage"],
        "tonal_status": tonal_health["status"],
        "tonal_issues": tonal_health["issues_es"] if lang_picked == 'es' else tonal_health["issues"]
    })
    
    # Calculate score using the same score_report function as analyze_file
    hard_fail = tp_hard  # Use the hard fail from status_true_peak
    
    # Import and use the actual score_report function
    from analyzer import score_report
    score, verdict = score_report(metrics, hard_fail, strict, lang)
    
    # Generate CTA for frontend
    cta_data = generate_cta(score, strict, lang, mode="write")
    
    # ========== NEW: Generate interpretative texts ==========
    interpretations = None
    if HAS_INTERPRETATIVE_TEXTS:
        try:
            # Extract key metrics for interpretation
            interpretation_metrics = {}
            
            # Extract headroom (use peak_db directly - already negative in dBFS)
            interpretation_metrics['headroom'] = float(final_peak)  # Convert numpy to Python float (e.g., -6.3 dBFS)
            
            # Extract true peak
            interpretation_metrics['true_peak'] = float(final_tp)
            
            # Extract dynamic range (PLR)
            interpretation_metrics['dynamic_range'] = float(final_plr) if final_plr is not None and final_plr > 0 else 0.0
            
            # Extract LUFS
            interpretation_metrics['lufs'] = float(weighted_lufs) if weighted_lufs != 0 else -14.0
            
            # Extract stereo balance
            # Calculate balance from L/R balance dB
            lr_balance_db = final_lr_balance
            # Convert dB difference to ratio (0.5 = perfect balance)
            if lr_balance_db == 0:
                balance_ratio = 0.5
            elif lr_balance_db > 0:  # R louder
                balance_ratio = 0.5 + (lr_balance_db / 20.0)
            else:  # L louder
                balance_ratio = 0.5 + (lr_balance_db / 20.0)
            
            balance_ratio = max(0.0, min(1.0, balance_ratio))  # Clamp 0-1
            interpretation_metrics['stereo_balance'] = balance_ratio
            
            # Extract correlation
            interpretation_metrics['stereo_correlation'] = float(final_correlation)
            interpretation_metrics['ms_ratio'] = float(stereo_metric.get('ms_ratio', 0))
            
            # Generate interpretative texts
            interpretations_raw = generate_interpretative_texts(
                metrics=interpretation_metrics,
                lang=lang,
                strict=strict
            )
            interpretations = format_for_api_response(
                interpretations_raw,
                interpretation_metrics
            )
            
        except Exception as e:
            # If interpretation generation fails, continue without it
            import traceback
            print(f"❌ ERROR generating interpretations (CHUNKED): {e}", flush=True)
            traceback.print_exc()
            interpretations = None
    # ========== END: Interpretative texts generation ==========

    # v1.5: Aggregate energy curve from per-chunk raw RMS values
    _all_rms = []
    for _chunk_rms_list in results.get('energy_rms_per_chunk', []):
        _all_rms.extend(_chunk_rms_list)
    if _all_rms:
        _max_rms_val = max(_all_rms)
        if _max_rms_val > 0:
            _energy_norm = [round(v / _max_rms_val, 4) for v in _all_rms]
        else:
            _energy_norm = [0.0] * len(_all_rms)
        _peak_e_idx = _all_rms.index(_max_rms_val)
        _peak_e_pct = round((_peak_e_idx / len(_all_rms)) * 100.0, 1)
        _e_third = max(1, len(_all_rms) // 3)
        _e_low = sum(_all_rms[:_e_third])
        _e_mid = sum(_all_rms[_e_third:2*_e_third])
        _e_high = sum(_all_rms[2*_e_third:])
        _e_total = _e_low + _e_mid + _e_high
        if _e_total > 0:
            _e_dist = {
                "low": round((_e_low / _e_total) * 100.0, 1),
                "mid": round((_e_mid / _e_total) * 100.0, 1),
                "high": round((_e_high / _e_total) * 100.0, 1)
            }
        else:
            _e_dist = {"low": 0.0, "mid": 0.0, "high": 0.0}
        energy_data = {
            "energy_curve": _energy_norm,
            "peak_energy_time_pct": _peak_e_pct,
            "energy_distribution": _e_dist
        }
    else:
        energy_data = {
            "energy_curve": [],
            "peak_energy_time_pct": 0.0,
            "energy_distribution": {"low": 0.0, "mid": 0.0, "high": 0.0}
        }

    # v1.5: Categorical flags for analytics
    cat_flags = calculate_categorical_flags(final_peak, final_tp, final_plr, final_correlation, final_ms_ratio)

    # Build full result using the same structure as analyze_file
    result = {
        "file": {
            "name": path.name,
            "size": file_size,
            "duration": duration,
            "sample_rate": sr,
            "channels": channels,
            "bit_depth": bit_depth
        },
        "technical": {
            "peak_dbfs": final_peak,
            "true_peak_dbtp": final_tp,
            "lufs": weighted_lufs,
            "plr": final_plr,
            "stereo_correlation": final_correlation,
            "lr_balance_db": final_lr_balance,
            "ms_ratio": final_ms_ratio
        },
        "metrics": metrics,
        "score": score,
        "verdict": verdict,
        "territory": territory,
        "is_mastered": is_mastered,
        "cta": cta_data,  # Add CTA data for frontend
        "interpretations": interpretations,  # NEW: Add interpretations
        "chunked": True,
        "num_chunks": num_chunks,
        "notes": {
            "lufs_is_real": True,
            "lufs_reliable": duration >= MIN_DURATION_FOR_LUFS,
            "oversample_factor": oversample,
            "auto_oversample": True,
            "clipping_detected": bool(results['clipping_chunks'])
        },
        "metrics_bars": calculate_metrics_bars_percentages(metrics, strict=strict),  # NEW v7.3.50: Quick view bars
        "analysis_time_seconds": round(time.time() - analysis_start_time, 1),  # Time elapsed (uses renamed variable)
        # v1.5: New data capture fields
        "spectral_6band": fb.get("spectral_6band", {}),
        "energy_analysis": energy_data,
        "categorical_flags": cat_flags
    }

    # CRITICAL: Sanitize all float values to ensure JSON compliance
    result = sanitize_dict(result)

    return result

def write_report(report: Dict[str, Any], strict: bool = False, lang: str = 'en', filename: str = "mix") -> str:
    """
    Generate narrative engineer-style feedback from analysis report.
    Perfect for emails, web UI, or written reports.
    Includes detection for already-mastered tracks.
    """
    lang = _pick_lang(lang)
    
    score = report.get("score", 0)
    verdict = report.get("verdict", "")
    metrics = report.get("metrics", [])
    notes = report.get("notes", {})
    
    # ============= MASTERED TRACK DETECTION =============
    # Detect if this is already a finished master (not suitable for mastering)
    lufs_metric = next((m for m in metrics if "LUFS" in m.get("internal_key", "")), None)
    peak_metric = next((m for m in metrics if "Headroom" in m.get("internal_key", "")), None)
    tp_metric = next((m for m in metrics if "True Peak" in m.get("internal_key", "")), None)
    
    # Extract numerical values
    lufs_value = None
    if lufs_metric and lufs_metric.get("value") != "N/A":
        try:
            # Extract LUFS value (e.g., "-12.1 LUFS" -> -12.1)
            lufs_str = lufs_metric.get("value", "")
            lufs_value = float(lufs_str.split()[0])
        except:
            pass
    
    peak_value = None
    if peak_metric:
        try:
            # Extract peak dBFS (e.g., "-0.1 dBFS" -> -0.1)
            peak_str = peak_metric.get("peak_db", "")
            peak_value = float(peak_str.replace(" dBFS", "").replace("dBFS", ""))
        except:
            pass
    
    tp_value = None
    if tp_metric:
        try:
            # Extract true peak dBTP (e.g., "-0.1 dBTP" -> -0.1)
            tp_str = tp_metric.get("value", "")
            tp_value = float(tp_str.replace(" dBTP", "").replace("dBTP", ""))
        except:
            pass
    
    # Detection criteria for mastered track:
    # 1. LUFS > -14 (commercial loudness level)
    # 2. AND (Peak > -1.0 dBFS OR True Peak > -1.0 dBTP)
    is_mastered = False
    if lufs_value is not None and lufs_value > -14:
        if (peak_value is not None and peak_value > -1.0) or (tp_value is not None and tp_value > -1.0):
            is_mastered = True
    
    # If mastered track detected, build comprehensive master analysis message
    if is_mastered:
        # Extract all metrics for comprehensive analysis
        plr_metric = next((m for m in metrics if "PLR" in m.get("internal_key", "")), None)
        stereo_metric = next((m for m in metrics if "Stereo" in m.get("internal_key", "")), None)
        freq_metric = next((m for m in metrics if "Frequency" in m.get("internal_key", "")), None)
        
        # Check for clipping (actual sample clipping)
        clipping_detected = notes.get("clipping_detected", False)
        
        # Get temporal analysis for True Peak if available
        tp_temporal = None
        if tp_metric and "temporal_analysis" in tp_metric:
            tp_temporal = tp_metric["temporal_analysis"]
        
        if lang == 'es':
            headroom_str = f"{abs(peak_value):.1f} dB" if peak_value is not None else "0 dB"
            tp_str = f"{tp_value:.1f} dBTP" if tp_value is not None else "0.0 dBTP"
            lufs_str = f"{lufs_value:.1f} LUFS" if lufs_value is not None else "nivel comercial"
            
            # SECTION 1: Header + Detection Reason
            filename_ref = f"🎵 Sobre \"{filename}\"\n\n"
            message = (
                filename_ref +
                "🎯 Este archivo parece ser un máster finalizado, no una mezcla para entregar a mastering.\n\n"
                "El análisis muestra:\n"
                f"• Loudness comercial ({lufs_str})\n"
                f"• Headroom muy reducido ({headroom_str})\n"
                f"• True Peak que excede el límite digital ({tp_str})\n\n"
                "Estas características son normales en un master terminado, pero lo hacen inadecuado para procesarlo nuevamente en mastering.\n\n"
            )
            
            # SECTION 2: Positive Aspects
            positive_aspects = []
            
            # Check stereo correlation
            if stereo_metric:
                stereo_status = stereo_metric.get("status", "")
                stereo_value = stereo_metric.get("value")
                if stereo_status in ["perfect", "pass"]:
                    if isinstance(stereo_value, (int, float)):
                        positive_aspects.append(f"• Balance estéreo: excelente correlación ({stereo_value:.2f})")
                    else:
                        positive_aspects.append("• Balance estéreo: buena compatibilidad mono")
            
            # Check frequency balance
            if freq_metric:
                freq_status = freq_metric.get("status", "")
                if freq_status in ["perfect", "pass"]:
                    positive_aspects.append("• Balance tonal: saludable")
            
            # Check PLR (if reasonable for a master)
            if plr_metric:
                plr_value = plr_metric.get("value")
                if isinstance(plr_value, (int, float)) and plr_value >= 7:
                    positive_aspects.append(f"• Rango dinámico: conservado ({plr_value:.1f} dB PLR)")
            
            if positive_aspects:
                message += "✅ Aspectos técnicamente correctos:\n"
                message += "\n".join(positive_aspects)
                message += "\n\n"
            
            # SECTION 2.5: Temporal Analysis (if available from chunked mode)
            has_temporal = False
            temporal_message = ""
            
            # Check for True Peak temporal analysis
            if tp_metric and "temporal_analysis" in tp_metric:
                tp_temporal_data = tp_metric["temporal_analysis"]
                num_regions = tp_temporal_data.get('num_regions', 0)
                percentage = tp_temporal_data.get('percentage_above_threshold', 0)
                regions = tp_temporal_data.get('regions', [])
                info_only = tp_temporal_data.get('info_only', False)
                info_message = tp_temporal_data.get('info_message', '')
                
                # Show temporal analysis if there are regions OR if it's info-only
                if num_regions > 0:
                    has_temporal = True
                    temporal_message += f"🔊 True Peak: Presente durante {percentage:.0f}% del tiempo.\n"
                    temporal_message += f"   Regiones afectadas ({num_regions}):\n"
                    for region in regions[:10]:  # Max 10 regions
                        start_min = int(region['start'] // 60)
                        start_sec = int(region['start'] % 60)
                        end_min = int(region['end'] // 60)
                        end_sec = int(region['end'] % 60)
                        temporal_message += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d}\n"
                    temporal_message += "\n"
                    temporal_message += "💡 El track está procesado a nivel de master con limitación agresiva.\n\n"
                elif info_only and info_message:
                    # Show info message for brief peaks
                    has_temporal = True
                    temporal_message += f"🔊 True Peak:\n"
                    temporal_message += f"   {info_message}\n\n"
                    temporal_message += "💡 El track está procesado a nivel de master con limitación agresiva.\n\n"
            
            # Check for Stereo temporal analysis
            if stereo_metric and "temporal_analysis" in stereo_metric:
                temporal = stereo_metric["temporal_analysis"]
                
                # v7.3.51: Feedback positivo sobre coherencia mono
                global_corr = stereo_metric.get("correlation", 0)
                if global_corr and global_corr >= 0.7:
                    has_temporal = True
                    temporal_message += "✅ Alta coherencia mono detectada\n"
                    temporal_message += "La mezcla mantiene buena correlación entre canales.\n"
                    temporal_message += "Favorece el proceso de mastering y la compatibilidad en sistemas mono.\n\n"
                
                # Correlation temporal - solo regiones que necesitan atención
                if 'correlation' in temporal:
                    corr_data = temporal['correlation']
                    num_regions = corr_data.get('num_regions', 0)
                    regions = corr_data.get('regions', [])
                    
                    if num_regions > 0:
                        has_temporal = True
                        region_word = "región" if num_regions == 1 else "regiones"
                        temporal_message += f"⚠️ Correlación ({num_regions} {region_word} para prestar atención):\n"
                        
                        # v7.3.36.4: Variaciones de mensajes de mono para evitar repetición
                        variaciones_mono_es = [
                            "verifica comportamiento en mono",
                            "posible pérdida de cuerpo en mono",
                            "puede perder impacto en mono"
                        ]
                        
                        for region_idx, region in enumerate(regions[:10]):
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            corr = region['avg_correlation']
                            issue = region['issue']
                            band_corr = region.get('band_correlation')
                            
                            temporal_message += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            
                            # v7.3.51: Only report issues that need attention (< 0.5)
                            # Removed 'high' issue type - high correlation is not a problem
                            if issue == 'medium_low':
                                temporal_message += f"Correlación moderada ({corr*100:.0f}%)\n"
                                temporal_message += "      → Revisa efectos estéreo y reverbs\n"
                            elif issue == 'very_low':
                                temporal_message += f"Correlación muy baja ({corr*100:.0f}%)\n"
                                # Rotate variation based on region index
                                mono_msg = variaciones_mono_es[region_idx % len(variaciones_mono_es)]
                                temporal_message += f"      → Estéreo muy amplio - {mono_msg}\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_es']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        temporal_message += f"      📊 Bandas afectadas: {', '.join(band_names)}\n"
                                        temporal_message += f"      💡 Posibles causas en {problem_bands[0]['name_es']}: {problem_bands[0]['causes_es']}\n"
                            elif issue == 'negative':
                                temporal_message += f"Correlación negativa ({corr*100:.0f}%)\n"
                                temporal_message += "      → Empieza cancelación de fase - pérdida en mono\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_es']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        temporal_message += f"      📊 Bandas afectadas: {', '.join(band_names)}\n"
                                        temporal_message += f"      💡 Posibles causas en {problem_bands[0]['name_es']}: {problem_bands[0]['causes_es']}\n"
                            elif issue == 'negative_severe':
                                temporal_message += f"Correlación negativa severa ({corr*100:.0f}%)\n"
                                temporal_message += "      → Cancelación de fase severa en mono\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_es']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        temporal_message += f"      📊 Bandas afectadas: {', '.join(band_names)}\n"
                                        temporal_message += f"      💡 Posibles causas en {problem_bands[0]['name_es']}: {problem_bands[0]['causes_es']}\n"
                            else:  # Fallback
                                temporal_message += f"Correlación: {corr*100:.0f}%\n"
                            
                            # Add spacing between regions for readability
                            temporal_message += "\n"
                        temporal_message += "\n"
                
                # M/S Ratio temporal
                if 'ms_ratio' in temporal:
                    ms_data = temporal['ms_ratio']
                    num_regions = ms_data.get('num_regions', 0)
                    regions = ms_data.get('regions', [])
                    
                    if num_regions > 0:
                        has_temporal = True
                        region_word = "región" if num_regions == 1 else "regiones"
                        attention_word = "a revisar"
                        temporal_message += f"📐 M/S Ratio ({num_regions} {region_word} {attention_word}):\n"
                        
                        # v7.3.51: Variaciones de mensajes para M/S bajo (eBook philosophy)
                        variaciones_ms_bajo_es = [
                            "Contenido estéreo reducido en este tramo.\n         Puede ser intencional según el arreglo.",
                            "Contenido estéreo reducido.\n         Común en secciones centradas (intros, versos, breaks).",
                            "Contenido estéreo reducido.\n         Verifica si el ancho estéreo coincide con la intención musical."
                        ]
                        
                        for region_idx, region in enumerate(regions[:10]):
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            ms = region['avg_ms_ratio']
                            issue = region['issue']
                            
                            temporal_message += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            if issue == 'mono':
                                temporal_message += f"Ratio bajo ({ms:.2f})\n"
                                ms_msg = variaciones_ms_bajo_es[region_idx % len(variaciones_ms_bajo_es)]
                                temporal_message += f"      → {ms_msg}\n"
                            else:
                                temporal_message += f"Ratio alto ({ms:.2f})\n"
                                temporal_message += "      → Estéreo muy amplio - verifica comportamiento en mono\n"
                            
                            # Add spacing between regions for readability
                            temporal_message += "\n"
                        temporal_message += "\n"
                
                # L/R Balance temporal
                if 'lr_balance' in temporal:
                    lr_data = temporal['lr_balance']
                    num_regions = lr_data.get('num_regions', 0)
                    regions = lr_data.get('regions', [])
                    
                    if num_regions > 0:
                        has_temporal = True
                        region_word = "región" if num_regions == 1 else "regiones"
                        attention_word = "a revisar"
                        temporal_message += f"⚖️ Balance L/R ({num_regions} {region_word} {attention_word}):\n"
                        for region in regions[:10]:
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            balance = region['avg_balance_db']
                            side = region['side']
                            
                            temporal_message += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            if side == 'left':
                                temporal_message += f"Desbalance L: +{abs(balance):.1f} dB\n"
                            else:
                                temporal_message += f"Desbalance R: {balance:.1f} dB\n"
                            
                            # Add spacing between regions for readability
                            temporal_message += "\n"
                        temporal_message += "\n"
            
            # Add temporal analysis section if there's any temporal data
            if has_temporal:
                message += "▶ ANÁLISIS TEMPORAL:\n\n"
                message += temporal_message
                message += "💡 Revisa los tiempos indicados arriba en tu DAW para evaluar si lo detectado en el Análisis Temporal responde a una decisión artística o si requiere un ajuste técnico antes del mastering.\n\n"
            
            # SECTION 3: Technical Observations
            observations = []
            
            # PLR observation (over-compression)
            if plr_metric:
                plr_value = plr_metric.get("value")
                if isinstance(plr_value, (int, float)) and plr_value < 7:
                    observations.append(
                        f"• PLR: {plr_value:.1f} dB - dinámicas muy reducidas por limiting agresivo.\n"
                        "  Normal en masters comerciales loud, pero reduce micro-dinámica."
                    )
            
            # Frequency balance observation
            if freq_metric:
                freq_status = freq_metric.get("status", "")
                if freq_status == "warning":
                    freq_msg = freq_metric.get("message", "")
                    observations.append(
                        f"• Balance tonal: {freq_msg}\n"
                        "  Puede ser decisión creativa, pero verifica traducción en múltiples sistemas."
                    )
            
            # Stereo correlation observation
            if stereo_metric:
                stereo_value = stereo_metric.get("value")
                stereo_status = stereo_metric.get("status", "")
                if isinstance(stereo_value, (int, float)) and stereo_value < 0.60:
                    observations.append(
                        f"• Ancho estéreo muy amplio (correlación {stereo_value:.2f}).\n"
                        "  Verifica compatibilidad en reproducción mono y sistemas Bluetooth."
                    )
            
            if observations:
                message += "📊 Observaciones técnicas del master:\n"
                message += "\n".join(observations)
                message += "\n\n"
                message += "💡 Estas observaciones NO invalidan el master, solo contextualizan las decisiones técnicas tomadas durante el proceso.\n\n"
            
            # SECTION 4: Bifurcation - If Mix
            # Calculate how much to reduce (correct formula)
            target_peak_dbfs = -6.0
            if peak_value is not None:
                reduction_needed = max(0.0, peak_value - target_peak_dbfs)
                reduction_rounded = round(reduction_needed)
            else:
                reduction_rounded = 6
            
            message += (
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "⚠️ SI ESTE ARCHIVO CORRESPONDE A UNA MEZCLA:\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "Si tu intención es enviarla a mastering, vuelve a la sesión original sin limitación "
                "en el bus maestro y ajusta el nivel antes del bounce:\n\n"
                "1. Vuelve a tu sesión de mezcla\n"
                "2. Inserta un plugin de Gain/Utility al final del bus master (DESPUÉS de toda tu cadena)\n"
                f"3. Reduce el nivel aproximadamente {reduction_rounded} dB\n"
                "4. Verifica que los picos queden alrededor de -6 dBFS\n"
                "5. Re-exporta\n\n"
                "Esto le devuelve al mastering el espacio necesario para trabajar sin distorsión.\n\n"
            )
            
            # SECTION 5: Bifurcation - If Master
            message += (
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "✅ SI ESTE ES TU MASTER FINAL:\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            )
            
            if tp_value is not None and tp_value > -1.0:
                message += (
                    f"🔧 True Peak: {tp_str}\n\n"
                    "📋 Lo que recomiendan las plataformas: ≤ -1.0 dBTP\n\n"
                    "📊 Lo que hace la industria real:\n"
                    "Muchos masters comerciales loud (EDM, pop, trap, reggaeton) están entre -0.3 y +0.5 dBTP. "
                    "Los algoritmos de normalización modernos lo toleran bien.\n\n"
                    "💡 Tu decisión:\n"
                    "Si tu master traduce bien en diferentes sistemas y suena como buscas, el archivo es "
                    "funcional para distribución. El riesgo de clipping intersample es bajo en codecs modernos.\n\n"
                    "Si prefieres máxima seguridad técnica: reduce 1–2 dB con Gain/Utility al final de la cadena "
                    "y re-exporta.\n\n"
                    "🎧 Al final del día, tus oídos tienen la última palabra. Si el master suena balanceado, "
                    "impactante y se traduce bien en múltiples sistemas, confía en tu decisión."
                )
            else:
                message += "El archivo está listo para distribución."
            
            return message
            
        else:  # English
            headroom_str = f"{abs(peak_value):.1f} dB" if peak_value is not None else "0 dB"
            tp_str = f"{tp_value:.1f} dBTP" if tp_value is not None else "0.0 dBTP"
            lufs_str = f"{lufs_value:.1f} LUFS" if lufs_value is not None else "commercial level"
            
            # SECTION 1: Header + Detection Reason
            filename_ref = f"🎵 Regarding \"{filename}\"\n\n"
            message = (
                filename_ref +
                "🎯 This file appears to be a finished master, not a mix prepared for mastering delivery.\n\n"
                "The analysis shows:\n"
                f"• Commercial loudness level ({lufs_str})\n"
                f"• Very reduced headroom ({headroom_str})\n"
                f"• True peak exceeding digital ceiling ({tp_str})\n\n"
                "These characteristics are normal in a finished master, but make it unsuitable for additional mastering processing.\n\n"
            )
            
            # SECTION 2: Positive Aspects
            positive_aspects = []
            
            # Check stereo correlation
            if stereo_metric:
                stereo_status = stereo_metric.get("status", "")
                stereo_value = stereo_metric.get("value")
                if stereo_status in ["perfect", "pass"]:
                    if isinstance(stereo_value, (int, float)):
                        positive_aspects.append(f"• Stereo balance: excellent correlation ({stereo_value:.2f})")
                    else:
                        positive_aspects.append("• Stereo balance: good mono compatibility")
            
            # Check frequency balance
            if freq_metric:
                freq_status = freq_metric.get("status", "")
                if freq_status in ["perfect", "pass"]:
                    positive_aspects.append("• Tonal balance: healthy")
            
            # Check PLR (if reasonable for a master)
            if plr_metric:
                plr_value = plr_metric.get("value")
                if isinstance(plr_value, (int, float)) and plr_value >= 7:
                    positive_aspects.append(f"• Dynamic range: preserved ({plr_value:.1f} dB PLR)")
            
            if positive_aspects:
                message += "✅ Technically correct aspects:\n"
                message += "\n".join(positive_aspects)
                message += "\n\n"
            
            # SECTION 2.5: Temporal Analysis (if available from chunked mode)
            has_temporal = False
            temporal_message = ""
            
            # Check for True Peak temporal analysis
            if tp_metric and "temporal_analysis" in tp_metric:
                tp_temporal_data = tp_metric["temporal_analysis"]
                num_regions = tp_temporal_data.get('num_regions', 0)
                percentage = tp_temporal_data.get('percentage_above_threshold', 0)
                regions = tp_temporal_data.get('regions', [])
                info_only = tp_temporal_data.get('info_only', False)
                info_message = tp_temporal_data.get('info_message', '')
                
                # Show temporal analysis if there are regions OR if it's info-only
                if num_regions > 0:
                    has_temporal = True
                    temporal_message += f"🔊 True Peak: Present for {percentage:.0f}% of the time.\n"
                    temporal_message += f"   Affected regions ({num_regions}):\n"
                    for region in regions[:10]:  # Max 10 regions
                        start_min = int(region['start'] // 60)
                        start_sec = int(region['start'] % 60)
                        end_min = int(region['end'] // 60)
                        end_sec = int(region['end'] % 60)
                        temporal_message += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d}\n"
                    temporal_message += "\n"
                    temporal_message += "💡 The track is processed at master level with aggressive limiting.\n\n"
                elif info_only and info_message:
                    # Show info message for brief peaks
                    has_temporal = True
                    temporal_message += f"🔊 True Peak:\n"
                    temporal_message += f"   {info_message}\n\n"
                    temporal_message += "💡 The track is processed at master level with aggressive limiting.\n\n"
            
            # Check for Stereo temporal analysis
            if stereo_metric and "temporal_analysis" in stereo_metric:
                temporal = stereo_metric["temporal_analysis"]
                
                # v7.3.51: Positive feedback about mono coherence
                global_corr = stereo_metric.get("correlation", 0)
                if global_corr and global_corr >= 0.7:
                    has_temporal = True
                    temporal_message += "✅ High mono coherence detected\n"
                    temporal_message += "The mix maintains good correlation between channels.\n"
                    temporal_message += "Favors the mastering process and mono system compatibility.\n\n"
                
                # Correlation temporal - only regions that need attention
                if 'correlation' in temporal:
                    corr_data = temporal['correlation']
                    num_regions = corr_data.get('num_regions', 0)
                    regions = corr_data.get('regions', [])
                    
                    if num_regions > 0:
                        has_temporal = True
                        temporal_message += f"⚠️ Correlation ({num_regions} region{'s' if num_regions > 1 else ''} to pay attention to):\n"
                        
                        # v7.3.36.4: Variations to avoid mechanical repetition
                        variaciones_mono_en = [
                            "verify mono behavior",
                            "possible body loss in mono",
                            "may lose impact in mono"
                        ]
                        
                        for region_idx, region in enumerate(regions[:10]):
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            corr = region['avg_correlation']
                            issue = region['issue']
                            band_corr = region.get('band_correlation')
                            
                            temporal_message += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            
                            # v7.3.51: Only report issues that need attention (< 0.5)
                            # Removed 'high' issue type - high correlation is not a problem
                            if issue == 'medium_low':
                                temporal_message += f"Moderate correlation ({corr*100:.0f}%)\n"
                                temporal_message += "      → Check stereo effects and reverbs\n"
                            elif issue == 'very_low':
                                temporal_message += f"Very low correlation ({corr*100:.0f}%)\n"
                                # Rotate variation based on region index
                                mono_msg = variaciones_mono_en[region_idx % len(variaciones_mono_en)]
                                temporal_message += f"      → Very wide stereo - {mono_msg}\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_en']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        temporal_message += f"      📊 Affected bands: {', '.join(band_names)}\n"
                                        temporal_message += f"      💡 Possible causes in {problem_bands[0]['name_en']}: {problem_bands[0]['causes_en']}\n"
                            elif issue == 'negative':
                                temporal_message += f"Negative correlation ({corr*100:.0f}%)\n"
                                temporal_message += "      → Phase cancellation begins - mono loss\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_en']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        temporal_message += f"      📊 Affected bands: {', '.join(band_names)}\n"
                                        temporal_message += f"      💡 Possible causes in {problem_bands[0]['name_en']}: {problem_bands[0]['causes_en']}\n"
                            elif issue == 'negative_severe':
                                temporal_message += f"Severe negative correlation ({corr*100:.0f}%)\n"
                                temporal_message += "      → Severe phase cancellation in mono\n"
                                # v7.3.35: Show band breakdown if available
                                if band_corr:
                                    problem_bands = identify_problem_bands(band_corr, threshold=0.3)
                                    if problem_bands:
                                        band_names = [f"{b['name_en']} ({b['correlation']*100:.0f}%)" for b in problem_bands[:3]]
                                        temporal_message += f"      📊 Affected bands: {', '.join(band_names)}\n"
                                        temporal_message += f"      💡 Possible causes in {problem_bands[0]['name_en']}: {problem_bands[0]['causes_en']}\n"
                            else:  # Fallback
                                temporal_message += f"Correlation: {corr*100:.0f}%\n"
                            
                            # Add spacing between regions for readability
                            temporal_message += "\n"
                        temporal_message += "\n"
                
                # M/S Ratio temporal
                if 'ms_ratio' in temporal:
                    ms_data = temporal['ms_ratio']
                    num_regions = ms_data.get('num_regions', 0)
                    regions = ms_data.get('regions', [])
                    
                    if num_regions > 0:
                        has_temporal = True
                        temporal_message += f"📐 M/S Ratio ({num_regions} region{'s' if num_regions > 1 else ''} to review):\n"
                        
                        # v7.3.51: Message variations for low M/S (eBook philosophy)
                        variaciones_ms_bajo_en = [
                            "Reduced stereo content in this section.\n         May be intentional based on the arrangement.",
                            "Reduced stereo content.\n         Common in centered sections (intros, verses, breaks).",
                            "Reduced stereo content.\n         Verify if stereo width matches the musical intention."
                        ]
                        
                        for region_idx, region in enumerate(regions[:10]):
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            ms = region['avg_ms_ratio']
                            issue = region['issue']
                            
                            temporal_message += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            if issue == 'mono':
                                temporal_message += f"Low ratio ({ms:.2f})\n"
                                ms_msg = variaciones_ms_bajo_en[region_idx % len(variaciones_ms_bajo_en)]
                                temporal_message += f"      → {ms_msg}\n"
                            else:
                                temporal_message += f"High ratio ({ms:.2f})\n"
                                temporal_message += "      → Very wide stereo - verify mono behavior\n"
                            
                            # Add spacing between regions for readability
                            temporal_message += "\n"
                        temporal_message += "\n"
                
                # L/R Balance temporal
                if 'lr_balance' in temporal:
                    lr_data = temporal['lr_balance']
                    num_regions = lr_data.get('num_regions', 0)
                    regions = lr_data.get('regions', [])
                    
                    if num_regions > 0:
                        has_temporal = True
                        temporal_message += f"⚖️ L/R Balance ({num_regions} region{'s' if num_regions > 1 else ''} to review):\n"
                        for region in regions[:10]:
                            start_min = int(region['start'] // 60)
                            start_sec = int(region['start'] % 60)
                            end_min = int(region['end'] // 60)
                            end_sec = int(region['end'] % 60)
                            dur = int(region['duration'])
                            balance = region['avg_balance_db']
                            side = region['side']
                            
                            temporal_message += f"   • {start_min}:{start_sec:02d} → {end_min}:{end_sec:02d} ({dur}s): "
                            if side == 'left':
                                temporal_message += f"L imbalance: +{abs(balance):.1f} dB\n"
                            else:
                                temporal_message += f"R imbalance: {balance:.1f} dB\n"
                            
                            # Add spacing between regions for readability
                            temporal_message += "\n"
                        temporal_message += "\n"
            
            # Add temporal analysis section if there's any temporal data
            if has_temporal:
                message += "▶ TEMPORAL ANALYSIS:\n\n"
                message += temporal_message
                message += "💡 Review the timestamps above in your DAW to evaluate if what's detected in the Temporal Analysis is an artistic decision or if it requires a technical adjustment before mastering.\n\n"
            
            # SECTION 3: Technical Observations
            observations = []
            
            # PLR observation (over-compression)
            if plr_metric:
                plr_value = plr_metric.get("value")
                if isinstance(plr_value, (int, float)) and plr_value < 7:
                    observations.append(
                        f"• PLR: {plr_value:.1f} dB - dynamics heavily reduced by aggressive limiting.\n"
                        "  Normal in loud commercial masters, but reduces micro-dynamics."
                    )
            
            # Frequency balance observation
            if freq_metric:
                freq_status = freq_metric.get("status", "")
                if freq_status == "warning":
                    freq_msg = freq_metric.get("message", "")
                    observations.append(
                        f"• Tonal balance: {freq_msg}\n"
                        "  May be a creative decision, but verify translation across systems."
                    )
            
            # Stereo correlation observation
            if stereo_metric:
                stereo_value = stereo_metric.get("value")
                stereo_status = stereo_metric.get("status", "")
                if isinstance(stereo_value, (int, float)) and stereo_value < 0.60:
                    observations.append(
                        f"• Very wide stereo field (correlation {stereo_value:.2f}).\n"
                        "  Check mono playback compatibility and Bluetooth systems."
                    )
            
            if observations:
                message += "📊 Technical observations of this master:\n"
                message += "\n".join(observations)
                message += "\n\n"
                message += "💡 These observations do NOT invalidate the master—they simply contextualize the technical decisions made during the process.\n\n"
            
            # SECTION 4: Bifurcation - If Mix
            # Calculate how much to reduce (correct formula)
            target_peak_dbfs = -6.0
            if peak_value is not None:
                reduction_needed = max(0.0, peak_value - target_peak_dbfs)
                reduction_rounded = round(reduction_needed)
            else:
                reduction_rounded = 6
            
            message += (
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "⚠️ IF THIS FILE IS INTENDED TO BE A MIX:\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "If your intention is to send it to mastering, go back to the original session without "
                "bus limiting and adjust the level before bouncing:\n\n"
                "1. Return to your mix session\n"
                "2. Insert a Gain/Utility plugin at the end of your master bus (AFTER all processing)\n"
                f"3. Lower the level by approximately {reduction_rounded} dB\n"
                "4. Verify peaks land around -6 dBFS\n"
                "5. Re-export\n\n"
                "This restores the headroom needed for proper mastering without distortion.\n\n"
            )
            
            # SECTION 5: Bifurcation - If Master
            message += (
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "✅ IF THIS IS YOUR FINAL MASTER:\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            )
            
            if tp_value is not None and tp_value > -1.0:
                message += (
                    f"🔧 True Peak: {tp_str}\n\n"
                    "📋 What platforms recommend: ≤ -1.0 dBTP\n\n"
                    "📊 What the industry actually does:\n"
                    "Many loud commercial masters (EDM, pop, trap, reggaeton) sit between -0.3 and +0.5 dBTP. "
                    "Modern normalization algorithms handle this well.\n\n"
                    "💡 Your decision:\n"
                    "If your master translates well across systems and sounds the way you want, the file is "
                    "functional for distribution. The risk of intersample clipping is low in modern codecs.\n\n"
                    "If you prefer maximum technical safety: lower by 1–2 dB with a Gain/Utility plugin at the "
                    "end of your chain and re-export.\n\n"
                    "🎧 At the end of the day, your ears have the final say. If the master sounds balanced, "
                    "impactful, and translates well across systems, trust your decision."
                )
            else:
                message += "The file is ready for distribution."
            
            return message
    
    # ============= NORMAL MIX PROCESSING (NOT MASTERED) =============
    # Count issues by severity
    critical_issues = [f"{m['name']}: {m['message']}" for m in metrics if m.get("status") == "critical"]
    warnings = [f"{m['name']}: {m['message']}" for m in metrics if m.get("status") == "warning"]
    
    # Build narrative based on score and issues
    if lang == 'es':
        # Spanish narrative
        if score >= 95:
            intro = "Tu mezcla está en un estado excelente para mastering."
        elif score >= 85:
            intro = "Tu mezcla está en muy buen punto para mastering."
        elif score >= 75:
            intro = "Tu mezcla está lista para mastering, aunque hay algunos puntos menores que podrías revisar."
        elif score >= 60:
            intro = "Tu mezcla necesita algunos ajustes antes de enviarla a mastering."
        else:
            intro = "Tu mezcla requiere atención en varios aspectos técnicos antes del mastering."
        
        # Technical assessment
        tech_parts = []
        
        # Headroom & True Peak
        headroom_metric = next((m for m in metrics if "Headroom" in m.get("internal_key", "")), None)
        truepeak_metric = next((m for m in metrics if "True Peak" in m.get("internal_key", "")), None)
        
        if headroom_metric and headroom_metric.get("status") in ["perfect", "pass"]:
            tech_parts.append("Headroom apropiado")
        elif headroom_metric and headroom_metric.get("status") == "warning":
            tech_parts.append("Headroom un poco ajustado")
        elif headroom_metric and headroom_metric.get("status") == "critical":
            tech_parts.append("Headroom insuficiente (riesgo de clipping)")
        
        # PLR / Dynamics
        plr_metric = next((m for m in metrics if "PLR" in m.get("internal_key", "")), None)
        if plr_metric and plr_metric.get("value") != "N/A":
            if plr_metric.get("status") in ["perfect", "pass"]:
                tech_parts.append("Excelente rango dinámico")
            elif plr_metric.get("status") == "warning":
                tech_parts.append("Rango dinámico algo comprimido")
        
        # Stereo
        stereo_metric = next((m for m in metrics if "Stereo" in m.get("internal_key", "")), None)
        if stereo_metric and stereo_metric.get("status") in ["perfect", "pass"]:
            tech_parts.append("Imagen estéreo sólida y bien centrada")
        elif stereo_metric and stereo_metric.get("status") == "warning":
            tech_parts.append("Algunas inconsistencias de fase en imagen estéreo")
        
        # Frequency Balance
        freq_metric = next((m for m in metrics if "Frequency" in m.get("internal_key", "")), None)
        if freq_metric and freq_metric.get("status") in ["perfect", "pass"]:
            tech_parts.append("Balance tonal generalmente saludable")
        elif freq_metric and freq_metric.get("status") == "warning":
            tech_parts.append("Balance tonal que podría mejorarse")
        
        tech_assessment = ", ".join(tech_parts) if tech_parts else "características técnicas aceptables"
        
        # Construir frase de manera correcta
        if tech_parts:
            tech_sentence = f"En general, la mezcla presenta:\n- " + "\n- ".join(tech_parts)
        else:
            tech_sentence = "La mezcla tiene características técnicas aceptables."
        
        # Issues summary with EXPLICIT list of ALL problems
        if critical_issues:
            issues_list = "\n".join([f"   • {issue}" for issue in critical_issues])
            issues_sentence = f"\n\n⚠️ Se detectaron {len(critical_issues)} problema(s) crítico(s) que requieren atención inmediata:\n{issues_list}"
        elif warnings:
            # FIXED: Listar explícitamente los warnings con contexto
            issues_details = []
            
            # Construir lista detallada de warnings
            for m in metrics:
                if m.get("status") == "warning":
                    metric_name = m.get("name", "Métrica")
                    metric_value = m.get("value")
                    internal_key = m.get("internal_key", "")
                    
                    # Headroom warning
                    if "Headroom" in internal_key:
                        # metric_value already includes unit (e.g., "-2.5 dBFS")
                        peak_val = str(metric_value) if not isinstance(metric_value, (int, float)) else f"{metric_value:.1f} dBFS"
                        issues_details.append(
                            f"• Headroom general: los picos están alrededor de {peak_val}. "
                            f"Para un margen óptimo en mastering, ideal entre -6 y -4 dBFS."
                        )
                    
                    # True Peak warning
                    elif "True Peak" in internal_key:
                        # metric_value already includes unit (e.g., "-2.3 dBTP")
                        tp_val = str(metric_value) if not isinstance(metric_value, (int, float)) else f"{metric_value:.1f} dBTP"
                        issues_details.append(
                            f"• True Peak: está en {tp_val}. Para máxima seguridad en "
                            f"conversiones de formato, se recomienda ≤-3.0 dBTP."
                        )
                    
                    # PLR warning
                    elif "PLR" in internal_key:
                        plr_val = f"{metric_value:.1f}" if isinstance(metric_value, (int, float)) else str(metric_value)
                        issues_details.append(
                            f"• Rango Dinámico (PLR): está en {plr_val} dB. "
                            f"Para máxima flexibilidad en mastering, ideal 12-14 dB en modo strict."
                        )
                    
                    # Stereo warning
                    elif "Stereo" in internal_key or "Ancho" in internal_key:
                        corr_val = f"{metric_value:.2f}" if isinstance(metric_value, (int, float)) else str(metric_value)
                        issues_details.append(
                            f"• Campo Estéreo: correlación {corr_val}. "
                            f"Revisar compatibilidad mono y balance L/R."
                        )
                    
                    # Frequency Balance warning
                    elif "Frequency" in internal_key or "Balance" in internal_key:
                        issues_details.append(
                            f"• Balance Tonal: revisar distribución de frecuencias "
                            f"(graves, medios, agudos)."
                        )
            
            if issues_details:
                issues_list_formatted = "\n".join(issues_details)
                scope_note = "\n\n📍 Alcance: Estos puntos afectan a todo el track, no a secciones específicas." if strict else ""
                issues_sentence = f"\n\n📋 Puntos a revisar (no críticos):\n{issues_list_formatted}{scope_note}"
            else:
                issues_sentence = f"\n\n📋 Hay {len(warnings)} punto(s) que podrías revisar, aunque no son críticos para el mastering."
        else:
            issues_sentence = "\n\n✅ No se detectaron problemas técnicos críticos."
        
        # Stereo Field Detailed Section (ONLY if issues detected)
        stereo_detail = ""
        if stereo_metric:
            ms_ratio = stereo_metric.get("ms_ratio", 0)
            lr_balance = stereo_metric.get("lr_balance_db", 0)
            corr = stereo_metric.get("correlation", 1.0)  # Get correlation from metric
            
            # Show detailed section ONLY if there are stereo issues
            has_stereo_issue = False
            stereo_issues = []
            
            # Check M/S Ratio issues
            if ms_ratio < 0.05:
                # M/S ratio muy bajo, pero debemos verificar correlación también
                # Solo es "prácticamente mono" si AMBOS M/S bajo Y correlación muy alta (>97%)
                if corr > 0.97:
                    # Verdaderamente casi mono
                    has_stereo_issue = True
                    stereo_issues.append(
                        "⚠️ La mezcla no tiene información estéreo (prácticamente mono).\n\n"
                        "   🤔 ¿Es esto intencional?\n\n"
                        "   Si SÍ es intencional:\n"
                        "   • Perfecto - algunas producciones vintage o artísticas usan mono\n"
                        "   • Solo confirma que sea la decisión correcta\n\n"
                        "   Si NO es intencional, verifica:\n"
                        "   • ¿Exportaste en mono por error? Revisa configuración de bounce\n"
                        "   • ¿Tienes routing mal configurado en el DAW?\n"
                        "   • ¿Todos los elementos están centrados sin paneo?\n\n"
                        "   💡 Para mastering:\n"
                        "   Si fue error, re-exporta en estéreo para aprovechar el paneo\n"
                        "   y espacialización que diseñaste en la mezcla."
                    )
                elif corr > 0.85:
                    # M/S bajo pero correlación moderada-alta = imagen muy centrada (no mono)
                    # NO es un problema, solo informativo
                    pass  # No mostrar como issue
                else:
                    # M/S bajo pero correlación saludable (<85%) = estéreo centrado válido
                    pass  # No mostrar como issue
            elif ms_ratio > 1.5:
                has_stereo_issue = True
                stereo_issues.append(
                    f"⚠️ La información estéreo es muy amplia (M/S Ratio: {ms_ratio:.2f}).\n\n"
                    "   Esto puede sonar impresionante en auriculares pero débil en parlantes\n"
                    "   o sistemas mono (Bluetooth, teléfonos, algunos clubes).\n\n"
                    "   🔍 Causas comunes:\n"
                    "   • Demasiados plugins de ensanchamiento estéreo\n"
                    "   • Exceso de reverb/delay en los sides\n"
                    "   • Efectos estéreo muy agresivos\n\n"
                    "   💡 Cómo corregirlo:\n"
                    "   1. Reduce o quita plugins de 'stereo widening'\n"
                    "   2. Baja el nivel de reverbs y delays panoramizados\n"
                    "   3. Trae elementos importantes más al centro\n"
                    "   4. Prueba la mezcla en MONO - si pierde mucho cuerpo, está muy ancha"
                )
            
            # Check L/R Balance issues
            if abs(lr_balance) > 3.0:
                has_stereo_issue = True
                side = "izquierdo" if lr_balance > 0 else "derecho"
                stereo_issues.append(
                    f"⚠️ La mezcla tiene más energía en el canal {side}\n"
                    f"   ({abs(lr_balance):.1f} dB de diferencia).\n\n"
                    "   🤔 ¿Es intencional?\n\n"
                    "   Si SÍ (efecto artístico):\n"
                    "   • Algunos productores usan paneo asimétrico intencionalmente\n"
                    "   • Si es tu visión creativa, adelante\n\n"
                    "   Si NO es intencional:\n"
                    "   • Revisa el paneo general - puede haber demasiados elementos en un lado\n"
                    "   • Verifica que no haya un canal con volumen incorrecto\n"
                    "   • Chequea plugins que puedan estar afectando el balance\n"
                    "   • Usa un medidor de fase/balance en el master para monitorear\n\n"
                    "   💡 Recomendación:\n"
                    "   Prueba la mezcla en diferentes sistemas (auriculares, parlantes, mono)\n"
                    "   para confirmar que el desbalance funciona musicalmente."
                )
            
            # Add stereo detail section if issues found
            if has_stereo_issue:
                stereo_detail = "\n\n📊 CAMPO ESTÉREO - Análisis Detallado:\n" + "\n\n".join(stereo_issues)
        
        # Recommendation
        if score >= 85:
            # Add technical details for high-scoring mixes
            tech_details = build_technical_details(metrics, lang)
            
            if strict:
                recommendation = "\n\n💡 Recomendación: Esta mezcla cumple con los estándares profesionales para entrega comercial. Puedes enviarla a mastering con confianza."
            else:
                recommendation = "\n\n💡 Recomendación: Envíala a mastering tal como está."
        elif score >= 75:
            tech_details = ""
            recommendation = "\n\n💡 Recomendación: Revisa los puntos mencionados si buscas la máxima calidad, pero la mezcla es aceptable para mastering."
        else:
            tech_details = ""
            recommendation = "\n\n💡 Recomendación: Atiende los problemas identificados antes de enviar a mastering para obtener los mejores resultados."
        
        # Mode note
        if strict:
            mode_note = "\n\n📊 Análisis realizado con estándares comerciales estrictos (modo strict)."
        else:
            mode_note = ""
        
        # Add filename reference at the beginning (natural narrative style)
        filename_ref = f"🎵 Sobre \"{filename}\"\n\n"
        
        # Generate CTA based on score
        cta_data = generate_cta(score, strict, lang, mode="write")
        cta_message = f"\n\n{cta_data['message']}" if cta_data['message'] else ""
        
        return f"{filename_ref}{intro}\n\n{tech_sentence}{issues_sentence}{stereo_detail}{tech_details}{recommendation}{mode_note}{cta_message}"
    
    else:
        # English narrative
        if score >= 95:
            intro = "Your mix is in excellent shape for mastering."
        elif score >= 85:
            intro = "Your mix is in very good shape for mastering."
        elif score >= 75:
            intro = "Your mix is ready for mastering, though there are a few minor points you could review."
        elif score >= 60:
            intro = "Your mix needs some adjustments before sending to mastering."
        else:
            intro = "Your mix requires attention to several technical aspects before mastering."
        
        # Technical assessment
        tech_parts = []
        
        # Headroom & True Peak
        headroom_metric = next((m for m in metrics if "Headroom" in m.get("internal_key", "")), None)
        truepeak_metric = next((m for m in metrics if "True Peak" in m.get("internal_key", "")), None)
        
        if headroom_metric and headroom_metric.get("status") in ["perfect", "pass"]:
            tech_parts.append("appropriate headroom")
        elif headroom_metric and headroom_metric.get("status") == "warning":
            tech_parts.append("slightly tight headroom")
        elif headroom_metric and headroom_metric.get("status") == "critical":
            tech_parts.append("insufficient headroom (clipping risk)")
        
        # PLR / Dynamics
        plr_metric = next((m for m in metrics if "PLR" in m.get("internal_key", "")), None)
        if plr_metric and plr_metric.get("value") != "N/A":
            if plr_metric.get("status") in ["perfect", "pass"]:
                tech_parts.append("excellent dynamic range")
            elif plr_metric.get("status") == "warning":
                tech_parts.append("somewhat compressed dynamic range")
        
        # Stereo
        stereo_metric = next((m for m in metrics if "Stereo" in m.get("internal_key", "")), None)
        if stereo_metric and stereo_metric.get("status") in ["perfect", "pass"]:
            tech_parts.append("a solid, well-centered stereo image")
        elif stereo_metric and stereo_metric.get("status") == "warning":
            tech_parts.append("some phase inconsistencies in stereo image")
        
        # Frequency Balance
        freq_metric = next((m for m in metrics if "Frequency" in m.get("internal_key", "")), None)
        if freq_metric and freq_metric.get("status") in ["perfect", "pass"]:
            tech_parts.append("generally healthy tonal balance")
        elif freq_metric and freq_metric.get("status") == "warning":
            tech_parts.append("tonal balance with room for improvement")
        
        tech_assessment = ", ".join(tech_parts) if tech_parts else "acceptable technical characteristics"
        
        # Construir frase de manera correcta
        if tech_parts:
            tech_sentence = f"Overall, the mix shows:\n- " + "\n- ".join([part.capitalize() for part in tech_parts])
        else:
            tech_sentence = "The mix has acceptable technical characteristics."
        
        # Issues summary with EXPLICIT list of ALL problems
        if critical_issues:
            issues_list = "\n".join([f"   • {issue}" for issue in critical_issues])
            issues_sentence = f"\n\n⚠️ {len(critical_issues)} critical issue(s) detected that require immediate attention:\n{issues_list}"
        elif warnings:
            # FIXED: List warnings explicitly with context
            issues_details = []
            
            # Build detailed warnings list
            for m in metrics:
                if m.get("status") == "warning":
                    metric_name = m.get("name", "Metric")
                    metric_value = m.get("value")
                    internal_key = m.get("internal_key", "")
                    
                    # Headroom warning
                    if "Headroom" in internal_key:
                        # metric_value already includes unit (e.g., "-2.5 dBFS")
                        peak_val = str(metric_value) if not isinstance(metric_value, (int, float)) else f"{metric_value:.1f} dBFS"
                        issues_details.append(
                            f"• Overall headroom: peak levels sit around {peak_val}. "
                            f"For optimal mastering flexibility, peaks closer to -6 to -4 dBFS are recommended."
                        )
                    
                    # True Peak warning
                    elif "True Peak" in internal_key:
                        # metric_value already includes unit (e.g., "-2.3 dBTP")
                        tp_val = str(metric_value) if not isinstance(metric_value, (int, float)) else f"{metric_value:.1f} dBTP"
                        issues_details.append(
                            f"• True Peak: currently at {tp_val}. For maximum safety in "
                            f"format conversions, ≤-3.0 dBTP is recommended."
                        )
                    
                    # PLR warning
                    elif "PLR" in internal_key:
                        plr_val = f"{metric_value:.1f}" if isinstance(metric_value, (int, float)) else str(metric_value)
                        issues_details.append(
                            f"• Dynamic Range (PLR): currently at {plr_val} dB. "
                            f"For maximum mastering flexibility, 12-14 dB is ideal in strict mode."
                        )
                    
                    # Stereo warning
                    elif "Stereo" in internal_key or "Width" in internal_key:
                        corr_val = f"{metric_value:.2f}" if isinstance(metric_value, (int, float)) else str(metric_value)
                        issues_details.append(
                            f"• Stereo Field: correlation {corr_val}. "
                            f"Review mono compatibility and L/R balance."
                        )
                    
                    # Frequency Balance warning
                    elif "Frequency" in internal_key or "Balance" in internal_key:
                        issues_details.append(
                            f"• Tonal Balance: review frequency distribution "
                            f"(lows, mids, highs)."
                        )
            
            if issues_details:
                issues_list_formatted = "\n".join(issues_details)
                scope_note = "\n\n📍 Scope: These points apply to the entire track, not specific sections." if strict else ""
                issues_sentence = f"\n\n📋 Points to review (non-critical):\n{issues_list_formatted}{scope_note}"
            else:
                issues_sentence = f"\n\n📋 There are {len(warnings)} point(s) you could review, though they're not critical for mastering."
        else:
            issues_sentence = "\n\n✅ No critical technical issues detected."
        
        # Stereo Field Detailed Section (ONLY if issues detected)
        stereo_detail = ""
        if stereo_metric:
            ms_ratio = stereo_metric.get("ms_ratio", 0)
            lr_balance = stereo_metric.get("lr_balance_db", 0)
            corr = stereo_metric.get("correlation", 1.0)  # Get correlation from metric
            
            # Show detailed section ONLY if there are stereo issues
            has_stereo_issue = False
            stereo_issues = []
            
            # Check M/S Ratio issues
            if ms_ratio < 0.05:
                # M/S ratio very low, but we must also check correlation
                # Only "practically mono" if BOTH low M/S AND very high correlation (>97%)
                if corr > 0.97:
                    # Truly almost mono
                    has_stereo_issue = True
                    stereo_issues.append(
                        "⚠️ Mix has no stereo information (practically mono).\n\n"
                        "   🤔 Is this intentional?\n\n"
                        "   If YES, it's intentional:\n"
                        "   • Perfect - some vintage or artistic productions use mono\n"
                        "   • Just confirm it's the right decision for your project\n\n"
                        "   If NOT intentional, check:\n"
                        "   • Did you export in mono by mistake? Review bounce settings\n"
                        "   • Is your DAW routing misconfigured?\n"
                        "   • Are all elements completely centered with no panning?\n\n"
                        "   💡 For mastering:\n"
                        "   If it was an error, re-export in stereo to take advantage of all\n"
                        "   the panning and spatialization you designed in your mix."
                    )
                elif corr > 0.85:
                    # Low M/S but moderate-high correlation = very centered (not mono)
                    # Not an issue, just informational
                    pass  # Don't show as issue
                else:
                    # Low M/S but healthy correlation (<85%) = valid centered stereo
                    pass  # Don't show as issue
            elif ms_ratio > 1.5:
                has_stereo_issue = True
                stereo_issues.append(
                    f"⚠️ Stereo information is very wide (M/S Ratio: {ms_ratio:.2f}).\n\n"
                    "   This may sound impressive on headphones but weak on speakers or\n"
                    "   mono systems (Bluetooth, phones, some clubs).\n\n"
                    "   🔍 Common causes:\n"
                    "   • Too many stereo widening plugins\n"
                    "   • Excessive reverb/delay on the sides\n"
                    "   • Very aggressive stereo effects\n\n"
                    "   💡 How to fix it:\n"
                    "   1. Reduce or remove 'stereo widening' plugins\n"
                    "   2. Lower the level of panned reverbs and delays\n"
                    "   3. Bring important elements more to the center\n"
                    "   4. Test the mix in MONO - if it loses a lot of body, it's too wide"
                )
            
            # Check L/R Balance issues
            if abs(lr_balance) > 3.0:
                has_stereo_issue = True
                side = "left" if lr_balance > 0 else "right"
                stereo_issues.append(
                    f"⚠️ Mix has more energy in the {side} channel\n"
                    f"   ({abs(lr_balance):.1f} dB difference).\n\n"
                    "   🤔 Is this intentional?\n\n"
                    "   If YES (artistic effect):\n"
                    "   • Some producers use asymmetric panning intentionally\n"
                    "   • If it's your creative vision, go ahead\n\n"
                    "   If NOT intentional:\n"
                    "   • Check overall panning - there may be too many elements on one side\n"
                    "   • Verify that a channel doesn't have incorrect volume\n"
                    "   • Check plugins that might be affecting balance\n"
                    "   • Use a phase/balance meter on the master to monitor\n\n"
                    "   💡 Recommendation:\n"
                    "   Test the mix on different systems (headphones, speakers, mono)\n"
                    "   to confirm the imbalance works musically."
                )
            
            # Add stereo detail section if issues found
            if has_stereo_issue:
                stereo_detail = "\n\n📊 STEREO FIELD - Detailed Analysis:\n" + "\n\n".join(stereo_issues)
        
        # Recommendation
        if score >= 85:
            # Add technical details for high-scoring mixes
            tech_details = build_technical_details(metrics, lang)
            
            if strict:
                recommendation = "\n\n💡 Recommendation: This mix meets professional standards for commercial delivery. You can send it to mastering with confidence."
            else:
                recommendation = "\n\n💡 Recommendation: Send it to mastering as-is."
        elif score >= 75:
            tech_details = ""
            recommendation = "\n\n💡 Recommendation: Review the mentioned points if you're seeking maximum quality, but the mix is acceptable for mastering."
        else:
            tech_details = ""
            recommendation = "\n\n💡 Recommendation: Address the identified issues before sending to mastering for best results."
        
        # Mode note
        if strict:
            mode_note = "\n\n📊 Analysis performed with strict commercial delivery standards (strict mode)."
        else:
            mode_note = ""
        
        # Add filename reference at the beginning (natural narrative style)
        filename_ref = f"🎵 Regarding \"{filename}\"\n\n"
        
        # Generate CTA based on score
        cta_data = generate_cta(score, strict, lang, mode="write")
        cta_message = f"\n\n{cta_data['message']}" if cta_data['message'] else ""
        
        return f"{filename_ref}{intro}\n\n{tech_sentence}{issues_sentence}{stereo_detail}{tech_details}{recommendation}{mode_note}{cta_message}"


def iter_audio_files(p: Path) -> List[Path]:
    """Itera archivos de audio en path o directorio."""
    exts = {".wav", ".aif", ".aiff", ".flac", ".mp3", ".ogg", ".m4a"}
    if p.is_file():
        return [p]
    files = []
    for f in sorted(p.glob("**/*")):
        if f.suffix.lower() in exts and f.is_file():
            files.append(f)
    return files


def generate_short_mode_report(report: Dict[str, Any], strict: bool = False, lang: str = 'en', filename: str = "") -> str:
    """
    Generate short mode report with bullets showing positive aspects and areas to improve.
    
    Structure:
    - Header (filename, score, verdict)
    - Positive aspects (bullets)
    - Areas to improve (bullets) 
    - Recommendation
    """
    lang = _pick_lang(lang)
    
    score = report.get("score", 0)
    verdict = report.get("verdict", "")
    metrics = report.get("metrics", [])
    
    # Build positive aspects list
    positive_aspects = []
    areas_to_improve = []
    
    for metric in metrics:
        status = metric.get("status", "")
        name = metric.get("name", "")
        message = metric.get("message", "")
        
        # Skip informational metrics
        if status == "info":
            continue
            
        # Add to appropriate list
        if status in ["perfect", "pass", "good"]:
            positive_aspects.append(f"• {name}: {message}")
        elif status in ["warning", "critical", "catastrophic"]:
            areas_to_improve.append(f"• {name}: {message}")
    
    # Build report
    if lang == 'es':
        header = ""
        if filename:
            header = f"🎵 Sobre \"{filename}\"\n\n"
        
        header += f"Puntuación MR: {score}/100\n"
        header += f"Veredicto: {verdict}\n\n"
        
        body = ""
        
        if positive_aspects:
            body += "✅ Aspectos Positivos:\n"
            body += "\n".join(positive_aspects[:5])  # Limit to 5
            body += "\n\n"
        
        if areas_to_improve:
            body += "⚠️ Áreas a Mejorar:\n"
            body += "\n".join(areas_to_improve[:5])  # Limit to 5
            body += "\n\n"
        
        # Recommendation based on score
        if score >= 85:
            recommendation = "💡 Recomendación: Envíala a mastering tal como está."
        elif score >= 70:
            recommendation = "💡 Recomendación: Con algunos ajustes menores, estará lista para mastering."
        elif score >= 50:
            recommendation = "💡 Recomendación: Necesita varios ajustes antes de enviar a mastering."
        else:
            recommendation = "💡 Recomendación: Requiere recuperar margen técnico antes de mastering."
        
        # Generate CTA - modo short nunca muestra CTA, solo lo agregamos al resultado
        cta_data = generate_cta(score, strict, lang, mode="short")
        cta_message = ""  # Short mode doesn't show CTA in text
        
        return header + body + recommendation + cta_message
    
    else:  # English
        header = ""
        if filename:
            header = f"🎵 Regarding \"{filename}\"\n\n"
        
        header += f"MR Score: {score}/100\n"
        header += f"Verdict: {verdict}\n\n"
        
        body = ""
        
        if positive_aspects:
            body += "✅ Positive Aspects:\n"
            body += "\n".join(positive_aspects[:5])
            body += "\n\n"
        
        if areas_to_improve:
            body += "⚠️ Areas to Improve:\n"
            body += "\n".join(areas_to_improve[:5])
            body += "\n\n"
        
        # Recommendation based on score
        if score >= 85:
            recommendation = "💡 Recommendation: Send it to mastering as-is."
        elif score >= 70:
            recommendation = "💡 Recommendation: With minor adjustments, it'll be ready for mastering."
        elif score >= 50:
            recommendation = "💡 Recommendation: Needs several adjustments before sending to mastering."
        else:
            recommendation = "💡 Recommendation: Requires recovering technical margin before mastering."
        
        # Generate CTA - modo short nunca muestra CTA, solo lo agregamos al resultado
        cta_data = generate_cta(score, strict, lang, mode="short")
        cta_message = ""  # Short mode doesn't show CTA in text
        
        return header + body + recommendation + cta_message


# =============================================================================
# FUNCIÓN 3: generate_visual_report - INSERTAR DESPUÉS DE generate_short_mode_report
# =============================================================================

def generate_visual_report(report: Dict[str, Any], strict: bool = False, lang: str = 'en', filename: str = "") -> str:
    """
    Generate visual mode report with bullets showing positive aspects and areas to review.
    Educational and constructive tone.
    """
    lang = _pick_lang(lang)
    
    metrics = report.get("metrics", [])
    
    # Build positive aspects and areas to review
    positive_aspects = []
    areas_to_review = []
    
    for metric in metrics:
        status = metric.get("status", "")
        name = metric.get("name", "")
        message = metric.get("message", "")
        
        # Skip informational metrics
        if status == "info":
            continue
            
        # Add to appropriate list with educational, positive framing
        if status in ["perfect", "pass", "good"]:
            # Extract the positive aspect concisely
            if "Headroom" in name:
                positive_aspects.append("Headroom apropiado para mastering" if lang == "es" else "Appropriate headroom for mastering")
            elif "True Peak" in name:
                positive_aspects.append("True Peak seguro para mastering" if lang == "es" else "Safe True Peak for mastering")
            elif "PLR" in name or "dinám" in message.lower() or "dynamic" in message.lower():
                positive_aspects.append("Excelente rango dinámico" if lang == "es" else "Excellent dynamic range")
            elif "Stereo" in name or "stéreo" in name.lower():
                positive_aspects.append("Imagen estéreo sólida y centrada" if lang == "es" else "Solid and centered stereo image")
            elif "Frequency" in name or "Frecuen" in name:
                positive_aspects.append("Balance tonal saludable" if lang == "es" else "Healthy tonal balance")
            elif "LUFS" in name:
                positive_aspects.append("Nivel apropiado para mastering" if lang == "es" else "Appropriate level for mastering")
            elif "DC Offset" in name:
                positive_aspects.append("Sin DC offset detectado" if lang == "es" else "No DC offset detected")
        
        elif status in ["warning", "critical", "catastrophic"]:
            # Frame as "areas to review" with educational tone
            if "Headroom" in name:
                areas_to_review.append("Revisar headroom - Considerar dejar más espacio en los picos" if lang == "es" else "Review headroom - Consider leaving more headroom in peaks")
            elif "True Peak" in name:
                areas_to_review.append("Revisar True Peak - Ajustar limitadores para evitar clipping" if lang == "es" else "Review True Peak - Adjust limiters to avoid clipping")
            elif "PLR" in name:
                areas_to_review.append("Revisar dinámica - Considerar reducir compresión/limitación" if lang == "es" else "Review dynamics - Consider reducing compression/limiting")
            elif "Stereo" in name or "stéreo" in name.lower():
                areas_to_review.append("Revisar imagen estéreo - Verificar balance y correlación" if lang == "es" else "Review stereo image - Check balance and correlation")
            elif "Frequency" in name or "Frecuen" in name:
                areas_to_review.append("Revisar balance de frecuencias - Ajustar EQ si es necesario" if lang == "es" else "Review frequency balance - Adjust EQ if needed")
            elif "LUFS" in name:
                areas_to_review.append("Revisar nivel general - Ajustar gain staging" if lang == "es" else "Review overall level - Adjust gain staging")
    
    # Remove duplicates while preserving order
    positive_aspects = list(dict.fromkeys(positive_aspects))
    areas_to_review = list(dict.fromkeys(areas_to_review))
    
    # Build report
    if lang == 'es':
        # Add filename header if provided
        report_text = ""
        if filename:
            report_text = f"🎵 Sobre \"{filename}\"\n\n"
        
        if positive_aspects:
            report_text += "ASPECTOS POSITIVOS\n"
            report_text += "─" * 50 + "\n"
            for aspect in positive_aspects[:6]:  # Limit to 6
                report_text += f"✓ {aspect}\n"
            report_text += "\n"
        
        if areas_to_review:
            report_text += "ASPECTOS PARA REVISAR\n"
            report_text += "─" * 50 + "\n"
            for aspect in areas_to_review[:6]:  # Limit to 6
                report_text += f"→ {aspect}\n"
        
        return report_text.strip()
    
    else:  # English
        # Add filename header if provided
        report_text = ""
        if filename:
            report_text = f"🎵 Regarding \"{filename}\"\n\n"
        
        if positive_aspects:
            report_text += "POSITIVE ASPECTS\n"
            report_text += "─" * 50 + "\n"
            for aspect in positive_aspects[:6]:
                report_text += f"✓ {aspect}\n"
            report_text += "\n"
        
        if areas_to_review:
            report_text += "AREAS TO REVIEW\n"
            report_text += "─" * 50 + "\n"
            for aspect in areas_to_review[:6]:
                report_text += f"→ {aspect}\n"
        
        return report_text.strip()


def generate_complete_pdf(
    report: Dict[str, Any],
    output_path: str,
    strict: bool = False,
    lang: str = 'en',
    filename: str = ""
) -> bool:
    """
    Generate a complete PDF report with all analysis modes.
    
    Args:
        report: Analysis report dictionary
        output_path: Path where PDF will be saved
        strict: Whether strict mode is enabled
        lang: Language ('es' or 'en')
        filename: Original audio filename
    
    Returns:
        bool: True if successful, False otherwise
    """
    import sys
    sys.stdout.flush()
    
    # Test clean_text_for_pdf is working
    test_emoji = "⚠️ Test 🔊"
    cleaned_test = clean_text_for_pdf(test_emoji)
    sys.stdout.flush()
    
    # Check if report content has emojis BEFORE cleaning
    if report.get('report_write'):
        sample = report['report_write'][:100]
        sys.stdout.flush()
    
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from datetime import datetime
    except ImportError:
        print("❌ Error: reportlab no está instalado. Instala con: pip install reportlab --break-system-packages")
        return False
    
    try:
        # Register DejaVu Sans font for Unicode support
        dejavu_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
        dejavu_bold_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        
        try:
            pdfmetrics.registerFont(TTFont('DejaVu', dejavu_path))
            pdfmetrics.registerFont(TTFont('DejaVu-Bold', dejavu_bold_path))
            use_unicode_font = True
            print("✅ DejaVu Sans font registered for Unicode support", flush=True)
        except Exception as e:
            print(f"⚠️  Could not register DejaVu font: {e}", flush=True)
            print("   Falling back to Helvetica (ASCII only)", flush=True)
            use_unicode_font = False
        
        # Create PDF
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # Select font based on availability
        base_font = 'DejaVu' if use_unicode_font else 'Helvetica'
        bold_font = 'DejaVu-Bold' if use_unicode_font else 'Helvetica-Bold'
        
        # Custom styles with Unicode font
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName=bold_font
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#374151'),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName=base_font
        )
        
        section_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#667eea'),
            spaceAfter=12,
            fontName=bold_font
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['BodyText'],
            fontSize=10,
            leading=14,
            spaceAfter=8,
            fontName=base_font
        )
        
        # Header subtitle style (centered, elegant, not bold)
        header_subtitle_style = ParagraphStyle(
            'HeaderSubtitle',
            parent=styles['BodyText'],
            fontSize=14,
            leading=18,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName=base_font,  # Normal, not bold
            textColor=colors.HexColor('#4b5563')  # Medium gray
        )
        
        # Subtitle style for section titles (bold, larger)
        subtitle_style = ParagraphStyle(
            'SectionSubtitle',
            parent=styles['BodyText'],
            fontSize=12,  # Increased from 11
            leading=16,
            spaceAfter=6,
            fontName='DejaVu-Bold' if use_unicode_font else 'Helvetica-Bold',
            textColor=colors.HexColor('#111827')  # Darker for more contrast
        )
        
        # Style for numeric data (italic)
        data_style = ParagraphStyle(
            'NumericData',
            parent=styles['BodyText'],
            fontSize=10,
            leading=14,
            spaceAfter=4,
            fontName=base_font,
            fontStyle='italic',  # This may not work, so we'll use <i> tags
            textColor=colors.HexColor('#374151')  # Slightly darker gray
        )
        
        # Header
        story.append(Paragraph("MASTERING READY", title_style))
        story.append(Paragraph(
            "Reporte Completo de Análisis" if lang == 'es' else "Complete Analysis Report",
            header_subtitle_style
        ))
        story.append(Spacer(1, 0.3*inch))
        
        # File Info
        story.append(Paragraph(
            "INFORMACIÓN DEL ARCHIVO" if lang == 'es' else "FILE INFORMATION",
            section_style
        ))
        
        # Clean verdict text - use Unicode symbols
        verdict_text = report.get('verdict', 'N/A')
        verdict_text = clean_text_for_pdf(verdict_text).strip()
        
        # Clean filename - handle Unicode characters like "Paraíso"
        clean_filename = clean_text_for_pdf(filename or report.get('filename', 'Unknown')).strip()
        
        # Extract audio file information
        file_dict = report.get('file', {})
        duration = file_dict.get('duration', 0) or report.get('duration', 0)
        sample_rate = file_dict.get('sample_rate', 0) or report.get('sample_rate', 0)
        bit_depth = file_dict.get('bit_depth', 0) or report.get('bit_depth', 0)
        
        # Debug: print what we got
        import sys
        print(f"   Duration: {duration}", file=sys.stderr, flush=True)
        print(f"   Sample Rate: {sample_rate}", file=sys.stderr, flush=True)
        print(f"   Bit Depth: {bit_depth}", file=sys.stderr, flush=True)
        print(f"   File dict keys: {list(file_dict.keys())}", file=sys.stderr, flush=True)
        sys.stderr.flush()
        
        # Format duration as MM:SS
        duration_str = f"{int(duration // 60)}:{int(duration % 60):02d}" if duration > 0 else "N/A"
        
        # Format sample rate as kHz
        sample_rate_str = f"{sample_rate / 1000:.1f} kHz" if sample_rate > 0 else "N/A"
        
        # Format bit depth
        bit_depth_str = f"{bit_depth}-bit" if bit_depth > 0 else "N/A"
        
        # NEW v7.3.50: Format analysis time
        analysis_time = report.get('analysis_time_seconds', 0)
        analysis_time_str = f"{analysis_time:.1f}s" if analysis_time > 0 else "N/A"
        
        file_info_data = [
            ["Archivo" if lang == 'es' else "File", clean_filename],
            ["Fecha" if lang == 'es' else "Date", datetime.now().strftime('%d/%m/%Y %H:%M')],
            ["Duración" if lang == 'es' else "Duration", duration_str],
            ["Sample Rate" if lang == 'es' else "Sample Rate", sample_rate_str],
            ["Bit Depth" if lang == 'es' else "Bit Depth", bit_depth_str],
            ["Tiempo de análisis" if lang == 'es' else "Analysis time", analysis_time_str],  # v7.3.50 (no emoji for PDF compatibility)
            ["Puntuación MR" if lang == 'es' else "MR Score", f"{report.get('score', 0)}/100"],
            ["Veredicto" if lang == 'es' else "Verdict", verdict_text]
        ]
        
        file_table = Table(file_info_data, colWidths=[2*inch, 4.5*inch])
        file_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
            ('FONTNAME', (0, 0), (0, -1), bold_font),
            ('FONTNAME', (1, 0), (1, -1), base_font),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(file_table)
        
        # Nota aclaratoria sobre el MR Score
        score_note = "Este índice evalúa margen técnico para procesamiento, no calidad artística." if lang == 'es' else "This index evaluates technical margin for processing, not artistic quality."
        story.append(Paragraph(
            clean_text_for_pdf(score_note),
            ParagraphStyle('ScoreNote', parent=body_style, fontSize=8, textColor=colors.HexColor('#6b7280'), fontStyle='italic')
        ))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Metrics Table
        if report.get('metrics'):
            story.append(Paragraph(
                "MÉTRICAS TÉCNICAS" if lang == 'es' else "TECHNICAL METRICS",
                section_style
            ))
            
            metrics_data = [[
                "Métrica" if lang == 'es' else "Metric",
                "Valor" if lang == 'es' else "Value",
                "Estado" if lang == 'es' else "Status"
            ]]
            
            for metric in report['metrics'][:8]:
                # Use Unicode symbols for status
                status_text = {
                    'perfect': '✓',
                    'pass': '✓',
                    'warning': '⚠',
                    'critical': '✗',
                    'catastrophic': '✗',
                    'info': 'ℹ'
                }.get(metric.get('status', 'info'), 'ℹ')
                
                # Clean all metric fields to ensure no emojis slip through
                metric_name = clean_text_for_pdf(str(metric.get('name', 'N/A')))
                metric_value = clean_text_for_pdf(str(metric.get('value', 'N/A')))
                
                metrics_data.append([
                    metric_name,
                    metric_value,
                    status_text
                ])
            
            metrics_table = Table(metrics_data, colWidths=[2.2*inch, 3.3*inch, 1*inch])
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), bold_font),
                ('FONTNAME', (0, 1), (-1, -1), base_font),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (2, 0), (2, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            
            story.append(metrics_table)
            
            # NEW v7.3.50: Add genre detection note if available
            freq_metric = next((m for m in report['metrics'] if m.get('internal_key') == 'Frequency Balance'), None)
            if freq_metric and freq_metric.get('detected_genre'):
                detected_genre = freq_metric.get('detected_genre', '')
                tonal_percentage = freq_metric.get('tonal_percentage', 100)
                
                if tonal_percentage >= 90:
                    status_word = "saludable" if lang == 'es' else "healthy"
                elif tonal_percentage >= 70:
                    status_word = "aceptable" if lang == 'es' else "acceptable"
                else:
                    status_word = "revisar" if lang == 'es' else "review"
                
                genre_text = f"Balance de frecuencias similar a: {detected_genre} ({status_word})" if lang == 'es' else f"Frequency balance similar to: {detected_genre} ({status_word})"
                
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph(
                    clean_text_for_pdf(f"▪ {genre_text}"),
                    ParagraphStyle(
                        'GenreNote',
                        parent=body_style,
                        fontSize=10,
                        textColor=colors.HexColor('#4b5563'),
                        leftIndent=10
                    )
                ))
            
            # NEW: Add contextual note for True Peak if critical
            tp_metric = next((m for m in report['metrics'] if m.get('internal_key') == 'True Peak'), None)
            if tp_metric and tp_metric.get('status') in ['critical', 'catastrophic']:
                tp_note = "* True Peak: Estado crítico solo si el archivo será re-masterizado. Ver análisis completo." if lang == 'es' else "* True Peak: Critical status only if file will be re-mastered. See full analysis."
                story.append(Spacer(1, 0.05*inch))
                story.append(Paragraph(
                    clean_text_for_pdf(tp_note),
                    ParagraphStyle('TPNote', parent=body_style, fontSize=8, textColor=colors.HexColor('#6b7280'), fontStyle='italic')
                ))
            
            story.append(Spacer(1, 0.3*inch))
        
        # ========== NEW v7.3.50: BARRAS VISUALES DE MÉTRICAS ==========
        if report.get('metrics_bars'):
            story.append(Paragraph(
                "ÁREAS DE ATENCIÓN PRIORITARIA" if lang == 'es' else "PRIORITY ATTENTION AREAS",
                section_style
            ))
            story.append(Spacer(1, 0.05*inch))
            
            # Subtexto explicativo - Mastering Ready philosophy
            subtext = "Estos indicadores no significan que tu mezcla esté mal, sino que hay decisiones técnicas que vale la pena revisar antes del máster final." if lang == 'es' else "These indicators don't mean your mix is wrong, but there are technical decisions worth reviewing before the final master."
            story.append(Paragraph(
                clean_text_for_pdf(subtext),
                ParagraphStyle('Subtext', parent=body_style, fontSize=8, textColor=colors.HexColor('#6b7280'), fontStyle='italic')
            ))
            story.append(Spacer(1, 0.1*inch))
            
            bars = report['metrics_bars']
            
            # Define labels and order
            metric_labels = {
                'headroom': ('Headroom', 'Headroom'),
                'true_peak': ('True Peak', 'True Peak'),
                'dynamic_range': ('Rango Dinámico', 'Dynamic Range'),
                'plr': ('PLR', 'PLR'),
                'loudness': ('Loudness (LUFS)', 'Loudness (LUFS)'),
                'lufs': ('LUFS', 'LUFS'),
                'lufs_(integrated)': ('LUFS', 'LUFS'),
                'stereo_width': ('Imagen Estéreo', 'Stereo Width'),
                'stereo_correlation': ('Correlación', 'Correlation'),
                'frequency_balance': ('Balance Frecuencias', 'Freq. Balance'),
                'tonal_balance': ('Balance Frecuencias', 'Freq. Balance')
            }
            
            status_colors = {
                'excellent': '#10b981',  # Green
                'good': '#3b82f6',       # Blue
                'warning': '#f59e0b',    # Yellow/Orange
                'critical': '#ef4444'    # Red
            }
            
            # Order of metrics to display
            ordered_keys = ['headroom', 'true_peak', 'plr', 'dynamic_range', 'lufs', 'lufs_(integrated)', 'loudness', 
                           'stereo_width', 'stereo_correlation', 'frequency_balance', 'tonal_balance']
            
            bars_data = [["Métrica" if lang == 'es' else "Metric", "Estado" if lang == 'es' else "Status", "%"]]
            bar_colors = []
            
            for key in ordered_keys:
                if key in bars:
                    bar = bars[key]
                    labels = metric_labels.get(key, (key, key))
                    label = labels[0] if lang == 'es' else labels[1]
                    percentage = bar.get('percentage', 0)
                    status = bar.get('status', 'good')
                    
                    # Create visual bar representation using Unicode blocks
                    filled = int(percentage / 10)
                    empty = 10 - filled
                    bar_visual = "█" * filled + "░" * empty
                    
                    bars_data.append([label, bar_visual, f"{percentage}%"])
                    bar_colors.append(status_colors.get(status, '#6b7280'))
            
            if len(bars_data) > 1:  # Only if we have data
                bars_table = Table(bars_data, colWidths=[1.8*inch, 3.5*inch, 0.7*inch])
                
                # Build table style
                table_style = [
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('FONTNAME', (0, 0), (-1, 0), bold_font),
                    ('FONTNAME', (0, 1), (-1, -1), base_font),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]
                
                # Add color to each bar row
                for i, color in enumerate(bar_colors):
                    table_style.append(('TEXTCOLOR', (1, i+1), (1, i+1), colors.HexColor(color)))
                
                bars_table.setStyle(TableStyle(table_style))
                story.append(bars_table)
                
                # Legend - Mastering Ready philosophy: margin, not judgment (WITH COLORS)
                story.append(Spacer(1, 0.1*inch))
                if lang == 'es':
                    legend_text = '<font color="#10b981">●</font> Margen cómodo  <font color="#3b82f6">●</font> Margen suficiente  <font color="#f59e0b">●</font> Margen reducido  <font color="#ef4444">●</font> Margen comprometido'
                else:
                    legend_text = '<font color="#10b981">●</font> Comfortable margin  <font color="#3b82f6">●</font> Sufficient margin  <font color="#f59e0b">●</font> Reduced margin  <font color="#ef4444">●</font> Compromised margin'
                
                story.append(Paragraph(
                    legend_text,
                    ParagraphStyle('Legend', parent=body_style, fontSize=8, textColor=colors.HexColor('#6b7280'))
                ))
                
                # Footer note
                footer_note = "Basado en criterios de Mastering Ready para compatibilidad, margen y traducción." if lang == 'es' else "Based on Mastering Ready criteria for compatibility, margin and translation."
                story.append(Paragraph(
                    clean_text_for_pdf(footer_note),
                    ParagraphStyle('FooterNote', parent=body_style, fontSize=7, textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)
                ))
            
            story.append(Spacer(1, 0.3*inch))
        
        # ========== NEW: ANÁLISIS TÉCNICO DETALLADO (from interpretations) ==========
        if report.get('interpretations'):
            story.append(PageBreak())
            story.append(Paragraph(
                clean_text_for_pdf("📊 ANÁLISIS TÉCNICO DETALLADO") if lang == 'es' else clean_text_for_pdf("📊 TECHNICAL ANALYSIS DETAILED"),
                section_style
            ))
            story.append(Spacer(1, 0.05*inch))  # Reduced from 0.1 to 0.05 for tighter spacing
            
            interps = report['interpretations']
            
            # Order: Headroom, Dynamic Range, Overall Level, Stereo Balance
            sections = [
                ('headroom', 'Headroom', 'Headroom'),
                ('dynamic_range', 'Rango Dinámico (PLR)', 'Dynamic Range (PLR)'),
                ('overall_level', 'Nivel General (LUFS)', 'Overall Level (LUFS)'),
                ('stereo_balance', 'Balance Estéreo', 'Stereo Balance')
            ]
            
            for section_key, title_es, title_en in sections:
                if section_key in interps:
                    section_data = interps[section_key]
                    
                    # Section Title
                    story.append(Paragraph(
                        f"{title_es if lang == 'es' else title_en}",
                        subtitle_style
                    ))
                    story.append(Spacer(1, 0.05*inch))  # Reducido de 0.1 a 0.05
                    
                    # 1. NUMERIC DATA (metrics)
                    if 'metrics' in section_data:
                        metrics_info = section_data['metrics']
                        
                        if section_key == 'headroom':
                            hr_val = metrics_info.get('headroom_dbfs', 0)
                            tp_val = metrics_info.get('true_peak_dbtp', 0)
                            
                            # Create table with gray background for metrics
                            data = [
                                [f"Headroom dBFS: {hr_val:.2f}"],
                                [f"True Peak dBTP: {tp_val:.2f}"]
                            ]
                            
                            table = Table(data, colWidths=[5*inch])
                            table.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),  # Light gray
                                ('PADDING', (0, 0), (-1, -1), 8),
                                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                ('FONTNAME', (0, 0), (-1, -1), base_font),
                                ('FONTSIZE', (0, 0), (-1, -1), 10),
                                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),  # Dark gray
                                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),  # Border
                            ]))
                            story.append(table)
                        
                        elif section_key == 'dynamic_range':
                            # Support both old and new field names
                            plr_val = metrics_info.get('plr', metrics_info.get('dr_lu', 0))
                            
                            # Create table with gray background
                            data = [[f"PLR: {plr_val:.1f} dB"]]
                            
                            table = Table(data, colWidths=[5*inch])
                            table.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
                                ('PADDING', (0, 0), (-1, -1), 8),
                                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                ('FONTNAME', (0, 0), (-1, -1), base_font),
                                ('FONTSIZE', (0, 0), (-1, -1), 10),
                                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
                                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                            ]))
                            story.append(table)
                        
                        elif section_key == 'overall_level':
                            lufs_val = metrics_info.get('lufs', 0)
                            
                            # Create table with gray background
                            data = [[f"LUFS (Integrated): {lufs_val:.1f}"]]
                            
                            table = Table(data, colWidths=[5*inch])
                            table.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
                                ('PADDING', (0, 0), (-1, -1), 8),
                                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                ('FONTNAME', (0, 0), (-1, -1), base_font),
                                ('FONTSIZE', (0, 0), (-1, -1), 10),
                                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
                                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                            ]))
                            story.append(table)
                        
                        elif section_key == 'stereo_balance':
                            # Support both old and new field names
                            bal_val = metrics_info.get('balance_l_r', metrics_info.get('balance_lr', 0))
                            corr_val = metrics_info.get('correlation', 0)
                            ms_val = metrics_info.get('ms_ratio', 0)
                            
                            # Create table with gray background
                            data = [
                                [f"Balance L/R: {bal_val:+.1f} dB"],
                                [f"M/S Ratio: {ms_val:.2f}"],
                                [f"Correlación: {corr_val:.2f}"]
                            ]
                            
                            table = Table(data, colWidths=[5*inch])
                            table.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
                                ('PADDING', (0, 0), (-1, -1), 8),
                                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                ('FONTNAME', (0, 0), (-1, -1), base_font),
                                ('FONTSIZE', (0, 0), (-1, -1), 10),
                                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
                                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                            ]))
                            story.append(table)
                    
                    story.append(Spacer(1, 0.05*inch))  # Reducido de 0.1 a 0.05
                    
                    # 2. INTERPRETATION
                    if 'interpretation' in section_data:
                        interp_text = clean_text_for_pdf(section_data['interpretation'])
                        for line in interp_text.split('\n'):
                            if line.strip():
                                story.append(Paragraph(line.strip(), body_style))
                    
                    story.append(Spacer(1, 0.05*inch))  # Reducido de 0.1 a 0.05
                    
                    # 3. RECOMMENDATION
                    if 'recommendation' in section_data:
                        rec_text = clean_text_for_pdf(section_data['recommendation'])
                        for line in rec_text.split('\n'):
                            if line.strip():
                                story.append(Paragraph(line.strip(), body_style))
                    
                    story.append(Spacer(1, 0.1*inch))
                    
                    # Add separator line between sections (except after last section)
                    if section_key != 'stereo_balance':
                        story.append(HRFlowable(
                            width="100%",
                            thickness=1,
                            color=colors.HexColor('#e5e7eb'),
                            spaceBefore=0,
                            spaceAfter=0.1*inch
                        ))
                    else:
                        story.append(Spacer(1, 0.05*inch))
        
        # ========== END: ANÁLISIS TÉCNICO DETALLADO ==========
        
        # Analysis Modes
        for mode_key, mode_title_es, mode_title_en in [
            ('report_visual', 'ANÁLISIS RÁPIDO', 'QUICK ANALYSIS'),
            ('report_short', 'ANÁLISIS RESUMEN', 'SUMMARY ANALYSIS'),
            ('report_write', 'ANÁLISIS COMPLETO', 'COMPLETE ANALYSIS')
        ]:
            if report.get(mode_key):
                story.append(PageBreak())
                story.append(Paragraph(
                    mode_title_es if lang == 'es' else mode_title_en,
                    section_style
                ))
                
                # Clean text - use Unicode symbols
                text = report[mode_key]
                
                import sys
                sample_before = text[:200] if len(text) > 200 else text
                print(f"   Sample: {repr(sample_before)}", flush=True)
                print(f"   Has ■: {'■' in text}", flush=True)
                print(f"   Has ⚠️: {'⚠️' in text or '⚠' in text}", flush=True)
                print(f"   Has 🔊: {'🔊' in text}", flush=True)
                sys.stdout.flush()
                
                text = clean_text_for_pdf(text)
                
                sample_after = text[:200] if len(text) > 200 else text
                print(f"   Sample: {repr(sample_after)}", flush=True)
                print(f"   Has ■: {'■' in text}", flush=True)
                print(f"   Has ⚠: {'⚠' in text}", flush=True)
                print(f"   Has ♪: {'♪' in text}", flush=True)
                sys.stdout.flush()
                
                # Remove multiple consecutive newlines
                while '\n\n\n' in text:
                    text = text.replace('\n\n\n', '\n\n')
                text = text.strip()
                
                # Section headers that need visual separation (for ANÁLISIS COMPLETO)
                section_keywords = [
                    '▶ ANÁLISIS TEMPORAL', '▶ TEMPORAL ANALYSIS',
                    'Correlación', 'Correlation',
                    'M/S Ratio',
                    'SI ESTE ARCHIVO', 'IF THIS FILE',
                    'SI ESTE ES TU MASTER', 'IF THIS IS YOUR MASTER',
                    'Lo que recomiendan', 'What platforms recommend',
                    'Lo que hace la industria', 'What the industry does',
                    'Tu decisión', 'Your decision',
                    'Al final del día', 'At the end of the day'
                ]
                
                for line in text.split('\n'):
                    line_stripped = line.strip()
                    if line_stripped:
                        if line_stripped and line_stripped[0].isdigit():
                            print(f"   📌 Line starts with digit: {repr(line_stripped[:50])}", flush=True)
                            sys.stdout.flush()
                        
                        # Check if this line is a section header - add spacing before it
                        is_section_header = any(keyword in line_stripped for keyword in section_keywords)
                        if is_section_header:
                            story.append(Spacer(1, 0.15*inch))  # Add space before section headers
                        
                        try:
                            # Use subtitle style for certain headers
                            if '▶ ANÁLISIS TEMPORAL' in line_stripped or '▶ TEMPORAL ANALYSIS' in line_stripped:
                                story.append(Paragraph(line_stripped, subtitle_style))
                            elif line_stripped.startswith('Correlación') or line_stripped.startswith('Correlation') or line_stripped.startswith('M/S Ratio'):
                                # Sub-section headers
                                story.append(Paragraph(line_stripped, ParagraphStyle(
                                    'SubSection',
                                    parent=body_style,
                                    fontName=bold_font,
                                    fontSize=10,
                                    textColor=colors.HexColor('#374151')
                                )))
                            else:
                                story.append(Paragraph(line_stripped, body_style))
                        except Exception as e:
                            # Fallback for problematic characters
                            print(f"   ⚠️  Paragraph creation failed: {repr(line_stripped[:50])} - Error: {e}", flush=True)
                            sys.stdout.flush()
                            clean_line = line_stripped.encode('ascii', 'ignore').decode('ascii')
                            if clean_line.strip():
                                story.append(Paragraph(clean_line, body_style))
                
                story.append(Spacer(1, 0.2*inch))
        
        # Footer
        story.append(Spacer(1, 0.4*inch))
        
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#6b7280'),
            alignment=TA_CENTER
        )
        
        story.append(Paragraph(
            "Analizado con Mastering Ready" if lang == 'es' else "Analyzed with Mastering Ready",
            footer_style
        ))
        story.append(Paragraph("www.masteringready.com", footer_style))
        story.append(Paragraph("by Matías Carvajal", footer_style))
        
        # Build PDF
        doc.build(story)
        return True
        
    except Exception as e:
        print(f"❌ Error generando PDF: {e}")
        import traceback
        traceback.print_exc()
        return False


def main() -> None:
    """Main entry point."""
    ap = argparse.ArgumentParser(
        description="Analyze mixes to verify they are ready for mastering delivery"
    )
    ap.add_argument("path", help="Archivo de audio o carpeta")
    ap.add_argument(
        "--oversample", 
        default="auto",
        help="Factor de sobremuestreo para true peak (default: auto, opciones: 1, 2, 4, auto)"
    )
    ap.add_argument(
        "--genre",
        choices=["rock", "pop", "edm", "electronic", "trap", "hip-hop", "jazz", "classical", "acoustic"],
        help="Género musical para ajustar evaluación de frecuencias (opcional)"
    )
    ap.add_argument(
        "--lang",
        choices=["en", "es"],
        default="en",
        help="Output language / Idioma de salida (en/es)"
    )

    ap.add_argument("--json", dest="json_path", default=None, help="Guardar reporte JSON")
    ap.add_argument("--pdf", dest="pdf_path", default=None, help="Guardar reporte completo en PDF")
    
    ap.add_argument(
        "--strict",
        action="store_true",
        help="Use stricter commercial-delivery thresholds (recommended for client/label delivery)."
    )
    ap.add_argument(
        "--notes-only",
        action="store_true",
        help="Print feedback without score/verdict (observations only)."
    )
    ap.add_argument(
        "--short",
        action="store_true",
        help="Short tips-only output (verdict + score + recommendations, no detailed metrics)."
    )
    ap.add_argument(
        "--write",
        action="store_true",
        help="Narrative written feedback (engineer-style paragraph, perfect for emails/reports)."
    )
    args = ap.parse_args()

    lang = _pick_lang(args.lang)

    # Parse oversample
    if args.oversample.lower() == "auto":
        oversample = 0  # señal para auto-detect
    else:
        try:
            oversample = int(args.oversample)
            if oversample not in [1, 2, 4]:
                raise ValueError
        except ValueError:
            print("❌ Error: --oversample debe ser 1, 2, 4 o 'auto'", file=sys.stderr)
            sys.exit(1)

    target = Path(args.path).expanduser()
    
    if not target.exists():
        print(f"❌ Error: No existe {target}", file=sys.stderr)
        sys.exit(1)
    
    files = iter_audio_files(target)
    
    if not files:
        print("❌ No audio files found / No se encontraron archivos de audio en la ruta indicada.", file=sys.stderr)
        sys.exit(1)

    reports = []
    for f in files:
        try:
            print(f"\n{UI_TEXT[lang]['analyzing']}: {f.name}...")
            report = analyze_file(f, oversample=oversample, genre=args.genre, strict=args.strict, lang=lang)
            reports.append(report)
        except Exception as e:
            print(f"❌ Error analyzing {f.name} / Error analizando {f.name}: {e}", file=sys.stderr)
            continue

    if not reports:
        print("❌ No se pudo analizar ningún archivo", file=sys.stderr)
        sys.exit(1)

    # Build output (full vs notes-only)
    def _notes_only_view(r: dict) -> dict:
        out = {
            "file": r.get("file", {}),
            "issues": [],
            "notes": {},
        }
        for mtr in r.get("metrics", []) or []:
            if mtr.get("status") in ("warning", "critical"):
                out["issues"].append({
                    "name": mtr.get("name"),
                    "status": mtr.get("status"),
                    "value": mtr.get("value"),
                    "message": mtr.get("message"),
                })

        meta = r.get("notes", {}) or {}
        # Keep a few useful diagnostics (optional)
        for k in ("clipping_detected", "dc_offset_detected", "lufs_is_real", "lufs_reliable",
                  "oversample_factor", "auto_oversample"):
            if k in meta:
                out["notes"][k] = meta.get(k)

        out["mode"] = "strict" if args.strict else "normal"

        if not out["issues"]:
            if lang == 'es':
                out["summary"] = "✅ No se detectaron problemas. Esta mezcla está lista para entrega a mastering."
            else:
                out["summary"] = "✅ No issues detected. This mix is ready for mastering delivery."
        else:
            if lang == 'es':
                out["summary"] = f"⚠️ {len(out['issues'])} problema(s) a revisar antes de la entrega a mastering."
            else:
                out["summary"] = f"⚠️ {len(out['issues'])} issue(s) to review before mastering delivery."
        return out


    def _localize_report(r: dict) -> dict:
        """
        Minimal post-processing for edge cases.
        Most localization is now handled at the source.
        """
        # No changes needed - all localization done at source
        return r

    reports_out = []
    for r in reports:
        r_out = _notes_only_view(r) if args.notes_only else r
        r_out = _localize_report(r_out)
        reports_out.append(r_out)

        # ==================== SHORT MODE ====================
        # Tips-only output: verdict + score + recommendations
        # Perfect for WhatsApp, web UI, quick feedback
        if args.short:
            # Check if this is a mastered track
            score = r_out.get('score', 0)
            metrics = r_out.get('metrics', [])
            
            # Detect mastered track (same logic as write_report)
            lufs_metric = next((m for m in metrics if "LUFS" in m.get("internal_key", "")), None)
            peak_metric = next((m for m in metrics if "Headroom" in m.get("internal_key", "")), None)
            tp_metric = next((m for m in metrics if "True Peak" in m.get("internal_key", "")), None)
            
            lufs_value = None
            if lufs_metric and lufs_metric.get("value") != "N/A":
                try:
                    lufs_value = float(lufs_metric.get("value", "").split()[0])
                except:
                    pass
            
            peak_value = None
            if peak_metric:
                try:
                    peak_str = peak_metric.get("peak_db", "")
                    peak_value = float(peak_str.replace(" dBFS", "").replace("dBFS", ""))
                except:
                    pass
            
            tp_value = None
            if tp_metric:
                try:
                    tp_str = tp_metric.get("value", "")
                    tp_value = float(tp_str.replace(" dBTP", "").replace("dBTP", ""))
                except:
                    pass
            
            is_mastered = False
            if lufs_value is not None and lufs_value > -14:
                if (peak_value is not None and peak_value > -1.0) or (tp_value is not None and tp_value > -1.0):
                    is_mastered = True
            
            print()
            # Show filename in short mode
            if lang == 'es':
                print(f"🎵 {f.name}")
            else:
                print(f"🎵 {f.name}")
            print(UI_TEXT[lang]["short_header"])
            print(UI_TEXT[lang]["short_separator"])
            
            if is_mastered:
                # Special output for mastered tracks with updated CTA (no score/verdict)
                print()
                if lang == 'es':
                    print("🎛️ Tipo: Máster Finalizado")
                    print()
                    print("💼 Este archivo parece ser un master o hotmix.")
                    print()
                    print("Si tu intención era enviar una mezcla para mastering, necesitas:")
                    print("• Volver a la sesión sin limitador en el bus maestro")
                    print("• Bajar ~6 dB (picos en -6 dBFS)")
                    print("• Re-exportar la mezcla")
                    print()
                    print("¿Quieres hacer los ajustes, subirla de nuevo y revisar si ya está")
                    print("lista para masterizar? O si prefieres, puedo ayudarte a dejarla")
                    print("lista como mezcla para luego masterizarla.")
                    print()
                    print("Sube los archivos y con gusto te la preparo.")
                else:
                    print("🎛️ Type: Finished Master")
                    print()
                    print("💼 This file appears to be a master or hotmix.")
                    print()
                    print("If your goal was to send a mix for mastering, you need:")
                    print("• Go back to session without limiter on master bus")
                    print("• Lower ~6 dB (peaks at -6 dBFS)")
                    print("• Re-export the mix")
                    print()
                    print("Want to make the adjustments yourself, re-upload it, and check if it's")
                    print("ready for mastering? Or if you prefer, I can help you get it ready")
                    print("as a mix and then master it.")
                    print()
                    print("Upload the files and I'll gladly prep it for you.")
            else:
                # Normal short output for mixes
                print(f"\n📊 Score: {score}/100")
                print(f"🎯 {r_out.get('verdict', '')}")
                print()
                recs = r_out.get("notes", {}).get("recommendations", [])
                if recs:
                    if lang == 'es':
                        print("💡 Recomendaciones:")
                    else:
                        print("💡 Recommendations:")
                    for rec in recs:
                        print(f"  {rec}")
                
                # Add CTA for normal mixes (CLI doesn't show CTA, only for web)
                cta_data = generate_cta(score, args.strict, lang, mode="short")
                if cta_data and cta_data.get('message'):
                    print(f"\n{cta_data['message']}")
            
            print()
            continue  # Skip JSON output

        # ==================== WRITE MODE ====================
        # Narrative engineer-style feedback
        # Perfect for emails, reports, web copy
        if args.write:
            narrative = write_report(r_out, args.strict, lang, filename=f.name)
            print()
            print(narrative)
            print()
            continue  # Skip JSON output

        # ==================== NORMAL/NOTES-ONLY MODE ====================
        # Full JSON output (default behavior)
        print("\n" + "="*60)
        print(UI_TEXT[lang]["analysis_results"])
        print("="*60)
        print(json.dumps(r_out, ensure_ascii=False, indent=2))

    # Save JSON
    if args.json_path:

        outp = Path(args.json_path).expanduser()
        try:
            if len(reports_out) == 1:
                outp.write_text(json.dumps(reports_out[0], ensure_ascii=False, indent=2), encoding="utf-8")
            else:
                outp.write_text(json.dumps(reports_out, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"\n✅ Reporte guardado en: {outp}")
        except Exception as e:
            print(f"❌ Error guardando JSON: {e}", file=sys.stderr)

    # PDF generation
    if args.pdf_path:
        pdf_path = Path(args.pdf_path).expanduser()
        try:
            if len(reports_out) == 1:
                success = generate_complete_pdf(
                    reports_out[0],
                    str(pdf_path),
                    strict=args.strict,
                    lang=lang,
                    filename=reports_out[0].get('filename', '')
                )
                if success:
                    print(f"\n✅ PDF guardado en: {pdf_path}")
                else:
                    print(f"❌ Error generando PDF", file=sys.stderr)
            else:
                print("⚠️ PDF solo soporta un archivo a la vez", file=sys.stderr)
        except Exception as e:
            print(f"❌ Error guardando PDF: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()

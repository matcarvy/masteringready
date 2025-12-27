#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mix Analyzer v7.3 - BETA RELEASE
================================

ARCHITECTURE PRINCIPLES:
1. Calculate scores LANGUAGE-NEUTRAL (no idioma en lógica)
2. Freeze score before translation (score congelado)
3. Translate messages with Matías Voice (del eBook "Mastering Ready")

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
Version: 7.3.0-beta (2025-12-22)

Usage:
------
  python mix_analyzer.py archivo.wav --lang es --write
  python mix_analyzer.py archivo.wav --lang en --strict
  python mix_analyzer.py archivo.wav --short --lang es
"""
from __future__ import annotations

import argparse
import gc
import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import soundfile as sf
import librosa
from scipy.signal import resample_poly

try:
    import pyloudnorm as pyln  # type: ignore
    HAS_PYLOUDNORM = True
except Exception:
    HAS_PYLOUDNORM = False


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
    
    STEREO_WIDTH = {
        "strict": {
            "perfect": lambda corr: 0.75 <= corr <= 0.85,  # Más estrecho que normal
            "pass": lambda corr: (0.70 <= corr < 0.75) or (0.85 < corr <= 0.90),
            "warning": lambda corr: (0.60 <= corr < 0.70) or (0.90 < corr <= 0.95) or (-0.2 < corr < 0.60),
            "critical": lambda corr: -0.5 <= corr <= -0.2,
            "catastrophic": lambda corr: corr < -0.5,  # Antifase severa
        },
        "normal": {
            "perfect": lambda corr: 0.7 <= corr <= 0.95,
            "pass": lambda corr: (0.5 <= corr < 0.7) or (0.95 < corr <= 1.0),
            "warning": lambda corr: (0.3 <= corr < 0.5) or (-0.2 < corr <= 0.3),
            "critical": lambda corr: -0.5 <= corr <= -0.2,
            "catastrophic": lambda corr: corr < -0.5,  # Antifase severa
        }
    }

    SCORES = {
        "catastrophic": -2.0,  # Nuevo: casos extremos
        "critical": -1.0,
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
    """
    mode = "strict" if strict else "normal"
    thresholds = ScoringThresholds.STEREO_WIDTH[mode]
    
    if thresholds["catastrophic"](correlation):
        return "catastrophic", ScoringThresholds.SCORES["catastrophic"]
    elif thresholds["critical"](correlation):
        return "critical", ScoringThresholds.SCORES["critical"]
    elif thresholds["perfect"](correlation):
        return "perfect", ScoringThresholds.SCORES["perfect"]
    elif thresholds["pass"](correlation):
        return "pass", ScoringThresholds.SCORES["pass"]
    else:  # warning
        return "warning", 0.3


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
    peak = max(peak, 1e-12)
    return 20.0 * math.log10(peak)


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
    
    return 20.0 * math.log10(peak / rms)


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
    
    tp = max(max(peaks), 1e-12)
    return 20.0 * math.log10(tp)


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
    return 20.0 * math.log10(rms), "approx_rms_dbfs", is_reliable


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


def calculate_ms_ratio(y: np.ndarray) -> Tuple[float, float, float]:
    """
    Calculate Mid/Side ratio and related metrics.
    Returns: (ms_ratio, mid_rms, side_rms)
    
    M/S Ratio indica el balance entre información central (mid) y panoramizada (side).
    Valores típicos: 0.3-0.7 para mezclas saludables
    """
    if y.shape[0] < 2:
        return 0.0, 0.0, 0.0
    
    L, R = y[0], y[1]
    mid = (L + R) / 2
    side = (L - R) / 2
    
    mid_rms = float(np.sqrt(np.mean(mid**2)))
    side_rms = float(np.sqrt(np.mean(side**2)))
    
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
    return 20 * np.log10(L_rms / R_rms)


# ----------------------------
# TEMPORAL ANALYSIS FUNCTIONS
# ----------------------------

def format_timestamp(seconds: float) -> str:
    """Convert seconds to MM:SS format."""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes}:{secs:02d}"


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
            return f"\n\n⏱️ Temporal: Presente durante la mayor parte del track ({affected_pct:.0f}% del tiempo)."
        else:
            return f"\n\n⏱️ Temporal: Present throughout most of the track ({affected_pct:.0f}% of the time)."
    
    elif severity == "localized" and problem_moments:
        # Format timestamps
        timestamps_str = ", ".join([m["time"] for m in problem_moments[:5]])
        
        if total_occurrences > 5:
            if lang == 'es':
                timestamps_str += f" (y {total_occurrences - 5} más)"
            else:
                timestamps_str += f" (and {total_occurrences - 5} more)"
        
        if lang == 'es':
            return f"\n\n⏱️ Temporal: Detectado en {total_occurrences} momento(s) específico(s): {timestamps_str}."
        else:
            return f"\n\n⏱️ Temporal: Detected in {total_occurrences} specific moment(s): {timestamps_str}."
    
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
        "affected_percentage": round(affected_percentage, 1),
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


def analyze_correlation_temporal(y: np.ndarray, sr: int, threshold: float = 0.3) -> Dict[str, Any]:
    """
    Temporal analysis of stereo correlation.
    Detects REGIONS where correlation is problematic (not just individual moments).
    """
    if y.shape[0] < 2:
        return {"severity": "none", "affected_percentage": 0.0, "problem_regions": [], "total_regions": 0}
    
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
            problem_windows.append({
                "time_seconds": timestamp,
                "value": round(corr * 100, 0)
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
        "affected_percentage": round(affected_percentage, 1),
        "problem_regions": problem_regions,
        "total_regions": len(problem_regions),
        "min_value": round(min_corr * 100, 0)
    }


def analyze_lr_balance_temporal(y: np.ndarray, sr: int, threshold: float = 3.0) -> Dict[str, Any]:
    """
    Temporal analysis of L/R balance.
    Detects REGIONS where balance exceeds threshold (not just individual moments).
    """
    if y.shape[0] < 2:
        return {"severity": "none", "affected_percentage": 0.0, "problem_regions": [], "total_regions": 0}
    
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
                "value": round(balance, 1)
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
        "affected_percentage": round(affected_percentage, 1),
        "problem_regions": problem_regions,
        "total_regions": len(problem_regions),
        "max_imbalance": round(max_imbalance, 1)
    }


def analyze_ms_ratio_temporal(y: np.ndarray, sr: int, low_threshold: float = 0.05, high_threshold: float = 1.5) -> Dict[str, Any]:
    """
    Temporal analysis of M/S ratio.
    Detects REGIONS where M/S ratio is problematic (too low or too high).
    """
    if y.shape[0] < 2:
        return {"severity": "none", "affected_percentage": 0.0, "problem_regions": [], "total_regions": 0}
    
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
                "type": problem_type
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
        if lang == 'es':
            context_parts.append("⚠️ La mezcla no tiene información estéreo (prácticamente mono). ¿Es intencional? Verifica si exportaste en mono por error.")
        else:
            context_parts.append("⚠️ Mix has no stereo information (practically mono). Is this intentional? Check if you exported in mono by mistake.")
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
    P = np.percentile(magnitude**2, 75, axis=1)  # 75th percentile de potencia
    
    nyq = sr / 2.0
    hi_max = min(20000.0, nyq)

    def band_power(f_lo: float, f_hi: float) -> float:
        idx = np.where((freqs >= f_lo) & (freqs < f_hi))[0]
        if idx.size == 0:
            return 1e-12
        # Integrar potencia ponderada
        return float(np.sum(P[idx]) + 1e-12)

    low_p = band_power(20.0, 250.0)
    mid_p = band_power(250.0, 4000.0)
    high_p = band_power(4000.0, hi_max)

    low_db = 10.0 * math.log10(low_p)
    mid_db = 10.0 * math.log10(mid_p)
    high_db = 10.0 * math.log10(high_p)
    
    # Calculate percentages for easier understanding
    total_energy = low_p + mid_p + high_p
    if total_energy > 0:
        low_percent = (low_p / total_energy) * 100.0
        mid_percent = (mid_p / total_energy) * 100.0
        high_percent = (high_p / total_energy) * 100.0
    else:
        low_percent = mid_percent = high_percent = 0.0

    return {
        "low_db": low_db,
        "mid_db": mid_db,
        "high_db": high_db,
        "d_low_mid_db": low_db - mid_db,
        "d_high_mid_db": high_db - mid_db,
        "low_percent": low_percent,
        "mid_percent": mid_percent,
        "high_percent": high_percent,
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
        "critical": "True peak is dangerously high. It may clip after conversion/encoding. Lower the level and re-export.",
        "warning": {
            "strict": "True peak should be ≤ -3.0 dBTP for professional commercial delivery.",
            "normal": "True peak is close to the limit. Streaming codecs (MP3, AAC, Opus) may clip. Better to aim for ≤ -1.0 dBTP.",
        },
        "perfect": "True peak is very safe for mastering. No issues converting to formats like MP3, AAC or for streaming.",
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
            "normal": "Very good PLR for mastering.",
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
    messages = {
        "perfect": "Excellent stereo correlation (mono compatible). The mix will translate well on all playback systems.",
        "pass": "Good stereo correlation. The mix maintains a healthy stereo image with good mono compatibility.",
        "warning": "Stereo correlation shows some phase issues. Check stereo effects, reverbs, and panning. Test in mono to ensure nothing important disappears.",
        "critical": f"Low stereo correlation ({corr:.2f}). Significant phase cancellation risk in mono playback. This can cause instruments or vocals to lose volume or disappear entirely on mono systems (Bluetooth speakers, phones, clubs).",
        "catastrophic": f"SEVERE: Near-total phase inversion detected ({corr:.2f}). The mix will almost completely cancel out in mono. Check for: inverted phase plugins, M/S processing errors, or accidentally inverted channels.",
    }
    
    message = messages[status]
    
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
        "critical": "True peak demasiado alto. Puede distorsionar al convertir/streaming. Baja el nivel y re-exporta.",
        "warning": {
            "strict": "True peak debe ser ≤ -3.0 dBTP para entrega comercial profesional.",
            "normal": "True peak muy cerca del límite. Los codecs de streaming (MP3, AAC, Opus) pueden clipear. Mejor apuntar a ≤ -1.0 dBTP.",
        },
        "perfect": "True peak muy seguro para mastering. No habrá problemas al convertir a formatos como MP3, AAC o para streaming.",
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
            "normal": "Muy buen PLR para mastering.",
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
    messages = {
        "perfect": "Excelente correlación estéreo (mono compatible). La mezcla se traducirá bien en todos los sistemas de reproducción.",
        "pass": "Buena correlación estéreo. La mezcla mantiene una imagen estéreo saludable con buena compatibilidad en mono.",
        "warning": "La correlación estéreo muestra algunos problemas de fase. Revisa efectos estéreo, reverbs y paneo. Prueba en mono para asegurarte de que no se pierde nada importante.",
        "critical": f"Correlación estéreo baja ({corr:.2f}). Riesgo significativo de cancelación de fase en reproducción mono. Esto puede hacer que instrumentos o voces pierdan volumen o desaparezcan completamente en sistemas mono (parlantes Bluetooth, teléfonos, clubes).",
        "catastrophic": f"SEVERO: Inversión de fase casi total detectada ({corr:.2f}). La mezcla se cancelará casi por completo en mono. Verifica: plugins con fase invertida, errores en procesamiento M/S, o canales accidentalmente invertidos.",
    }
    
    message = messages[status]
    
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
    
    if hard_fail:
        if lang == 'es':
            return 0, "❌ Se requieren ajustes antes del mastering"
        return 0, "❌ Adjustments required before mastering"

    mult = {"perfect": 1.0, "pass": 0.9, "warning": 0.7, "critical": 0.0, "catastrophic": 0.0, "info": 1.0}
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
    
    # Apply intelligent minimum score - never 0
    minimum_score = calculate_minimum_score(metrics)
    score = max(minimum_score, raw_score)
    
    # Localized verdicts with territory context
    if lang == 'es':
        if score >= 95:
            verdict = "✅ Perfecta para mastering"
        elif score >= 85:
            verdict = "✅ Lista para mastering"
        elif score >= 75:
            verdict = "⚠️ Aceptable (revisar recomendaciones)"
        elif score >= 60:
            verdict = "⚠️ Ajustes menores recomendados"
        elif score >= 40:
            verdict = "❌ Ajustes significativos necesarios"
        elif score >= 20:
            verdict = "❌ Requiere corrección urgente"
        else:
            verdict = "🚨 Problemas críticos múltiples detectados"
    else:
        if score >= 95:
            verdict = "✅ Perfect for mastering"
        elif score >= 85:
            verdict = "✅ Ready for mastering"
        elif score >= 75:
            verdict = "⚠️ Acceptable (review recommendations)"
        elif score >= 60:
            verdict = "⚠️ Minor adjustments recommended"
        elif score >= 40:
            verdict = "❌ Significant adjustments needed"
        elif score >= 20:
            verdict = "❌ Urgent correction required"
        else:
            verdict = "🚨 Multiple critical issues detected"
    
    return score, verdict


def analyze_file(path: Path, oversample: int = 4, genre: Optional[str] = None, strict: bool = False, lang: str = "en") -> Dict[str, Any]:
    """Analyze a full audio file."""
    try:
        info = sf.info(str(path))
    except Exception as e:
        raise RuntimeError(f"Error leyendo archivo: {e}. Archivo corrupto o formato no soportado.")
    
    sr = int(info.samplerate)
    channels = int(info.channels)
    duration = float(info.duration)
    
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
        tp_temporal = analyze_true_peak_temporal(y, sr, oversample, threshold=0.0)
    
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
    if has_real_lufs and lufs is not None:
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
        cf_message = "Informativo (usa PLR como métrica principal de dinámica)." if lang_picked == 'es' else "Informational (use PLR as the primary dynamics metric)."
    else:
        cf_message = msg_cf
    
    metrics.append({
        "name": METRIC_NAMES[lang_picked]["Crest Factor"],
        "internal_key": "Crest Factor",  # For WEIGHTS lookup
        "value": f"{crest:.1f} dB",
        "status": st_cf,
        "message": cf_message
    })

    # 7. Stereo Field Analysis (Correlation + M/S + L/R Balance) with Temporal Analysis
    corr = stereo_correlation(y)
    ms_ratio, mid_rms, side_rms = calculate_ms_ratio(y)
    lr_balance_db = calculate_lr_balance(y)
    
    # Temporal analysis for each parameter if problematic
    corr_temporal = None
    ms_temporal = None
    lr_temporal = None
    
    if corr < 0.5:  # Analyze if correlation is problematic
        corr_temporal = analyze_correlation_temporal(y, sr, threshold=0.3)
    
    if ms_ratio < 0.05 or ms_ratio > 1.5:  # Analyze if M/S is problematic
        ms_temporal = analyze_ms_ratio_temporal(y, sr, low_threshold=0.05, high_threshold=1.5)
    
    if abs(lr_balance_db) > 3.0:  # Analyze if L/R balance is problematic
        lr_temporal = analyze_lr_balance_temporal(y, sr, threshold=3.0)
    
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
    
    # Add temporal analysis if available
    if corr_temporal:
        stereo_metric["correlation_temporal"] = corr_temporal
    if ms_temporal:
        stereo_metric["ms_temporal"] = ms_temporal
    if lr_temporal:
        stereo_metric["lr_temporal"] = lr_temporal
    
    metrics.append(stereo_metric)

    # 8. Frequency Balance
    fb = band_balance_db(y, sr)
    st_f, msg_f, _ = status_freq(fb, genre, strict, lang)  # ← FIXED: Added strict and lang parameters
    
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
        "message": msg_f
    })

    # Hard fail conditions - only for severe technical issues
    # True peak hard fail comes from calculate_true_peak_score
    # Clipping detection
    hard_fail = bool(clipping) or bool(tp_hard)
    score, verdict = score_report(metrics, hard_fail, strict, lang)  # ← FIXED: Added strict and lang

    return {
        "file": {
            "path": str(path),
            "duration_seconds": round(duration, 2),
            "sample_rate_hz": sr,
            "channels": channels,
            "genre": genre if genre else "not specified"
        },
        "metrics": metrics,
        "score": score,
        "verdict": verdict,
        "notes": {
            "lufs_is_real": has_real_lufs,
            "lufs_reliable": lufs_reliable,
            "oversample_factor": oversample,
            "auto_oversample": oversample == auto_oversample_factor(sr),
            "clipping_detected": clipping,
            "dc_offset_detected": dc_data["detected"],
            "recommendations": generate_recommendations(metrics, score, genre, lang)
        }
    }


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




def generate_cta(score: int, strict: bool, lang: str, mode: str = "write") -> str:
    """
    Generate conversational CTA based on mix score and mode.
    
    CRITICAL:
    - Short mode: NO CTA (returns empty string)
    - Write mode score ≥85: NO CTA (mix is ready)
    - Write mode score <85: CTA with next steps
    """
    # SHORT MODE: Never show CTA
    if mode == "short":
        return ""
    
    # WRITE MODE: Only show CTA if score <85
    if lang == 'es':
        # Spanish CTAs
        if score >= 85:
            # Mix is ready - no CTA needed
            return ""
        
        elif score >= 60:
            # Mix needs adjustments
            return (
                "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "🔧 SIGUIENTES PASOS\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "Esta mezcla necesita algunos ajustes antes de estar lista para mastering.\n\n"
                "Tienes dos caminos claros:\n\n"
                "1️⃣ Puedes hacer los ajustes recomendados en tu sesión, re-exportar la mezcla "
                "y volver a analizarla aquí para confirmar que ya está lista.\n\n"
                "2️⃣ Si prefieres, puedes compartirme los archivos de tu sesión y con gusto hago "
                "los ajustes necesarios para dejarla lista, y luego la masterizamos.\n\n"
                "La idea es que llegue al mastering con el espacio correcto para trabajar fino "
                "y que la música respire."
            )
        
        else:
            # Mix requires significant work
            return (
                "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "🔧 SIGUIENTES PASOS\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "Esta mezcla necesita atención en varios aspectos técnicos antes del mastering.\n\n"
                "Tienes dos caminos claros:\n\n"
                "1️⃣ Puedes hacer los ajustes recomendados en tu sesión, re-exportar la mezcla "
                "y volver a analizarla aquí para confirmar que ya está lista.\n\n"
                "2️⃣ Si prefieres, puedes compartirme los archivos de tu sesión y con gusto hago "
                "los ajustes necesarios para dejarla lista, y luego la masterizamos.\n\n"
                "La idea es que llegue al mastering con el espacio correcto para trabajar fino "
                "y que la música respire."
            )
    
    else:
        # English CTAs
        if score >= 85:
            # Mix is ready - no CTA needed
            return ""
        
        elif score >= 60:
            # Mix needs adjustments
            return (
                "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "🔧 NEXT STEPS\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "This mix needs a few adjustments before it's truly mastering-ready.\n\n"
                "You have two clear options:\n\n"
                "1️⃣ Apply the recommended tweaks in your session, re-export the mix, and "
                "re-run the analysis to confirm it's ready.\n\n"
                "2️⃣ If you prefer, you can share your session files and I'll help make the "
                "necessary adjustments to get it ready, then we can move on to mastering.\n\n"
                "The goal is for the mix to arrive with proper space so the mastering can be "
                "done with finesse and musicality."
            )
        
        else:
            # Mix requires significant work
            return (
                "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "🔧 NEXT STEPS\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "This mix requires attention to several technical aspects before mastering.\n\n"
                "You have two clear options:\n\n"
                "1️⃣ Apply the recommended tweaks in your session, re-export the mix, and "
                "re-run the analysis to confirm it's ready.\n\n"
                "2️⃣ If you prefer, you can share your session files and I'll help make the "
                "necessary adjustments to get it ready, then we can move on to mastering.\n\n"
                "The goal is for the mix to arrive with proper space so the mastering can be "
                "done with finesse and musicality."
            )


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
            details += "   → Seguro para conversión a formatos con pérdida (MP3, AAC, Spotify).\n"
            details += "     No habrá distorsión intersample en streaming.\n"
            
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
            details += "   → Imagen estéreo con buena compatibilidad mono.\n"
            details += "     Se traducirá bien en diferentes sistemas.\n\n"
        
        # FREQUENCY BALANCE
        freq_metric = next((m for m in metrics if "Frequency" in m.get("internal_key", "")), None)
        if freq_metric:
            bass = freq_metric.get("bass_pct", 0)
            mid = freq_metric.get("mid_pct", 0)
            high = freq_metric.get("high_pct", 0)
            
            details += "🎼 BALANCE DE FRECUENCIAS:\n"
            if bass:
                details += f"   • Graves (20-250 Hz): {bass:.0f}%\n"
            if mid:
                details += f"   • Medios (250 Hz-4 kHz): {mid:.0f}%\n"
            if high:
                details += f"   • Agudos (4 kHz-20 kHz): {high:.0f}%\n"
            details += "\n"
            details += "   → Distribución tonal balanceada.\n"
        
        return details
    
        return report_text.strip()

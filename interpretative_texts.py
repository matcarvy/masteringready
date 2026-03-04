#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Interpretative Texts Generator for Mastering Ready
=================================================

CORRECTED VERSION - Aligned with analyzer.py v7.3.30 thresholds

Key fixes:
1. Stereo correlation thresholds aligned with ScoringThresholds
2. Headroom thresholds corrected for normal/strict modes
3. Dynamic Range (PLR) strict mode thresholds fixed
4. Added M/S ratio consideration to stereo evaluation
5. LUFS text adjusted to reflect "informative" nature

Author: Mastering Ready Team
Version: 1.1.0 (corrected)
"""

from typing import Dict, Any


def generate_interpretative_texts(
    metrics: Dict[str, Any],
    lang: str = 'es',
    strict: bool = False
) -> Dict[str, Dict[str, str]]:
    """
    Generate interpretative texts for all 4 main sections.
    
    Args:
        metrics: Dictionary with all technical metrics
        lang: Language ('es' or 'en')
        strict: Whether to use strict mode criteria
    
    Returns:
        Dictionary with interpretations for each section
    """
    
    # Extract metrics
    headroom = metrics.get('headroom', 0)
    true_peak = metrics.get('true_peak', 0)
    dr_value = metrics.get('dynamic_range', 0)
    lufs = metrics.get('lufs', 0)
    stereo_balance = metrics.get('stereo_balance', 0.5)
    stereo_correlation = metrics.get('stereo_correlation', 0.85)
    ms_ratio = metrics.get('ms_ratio', 0.5)  # ADDED: M/S ratio support
    crest_factor = metrics.get('crest_factor', 0)

    # Determine status for each metric (considering strict mode)
    headroom_status = _get_headroom_status(headroom, strict)
    dr_status = _get_dr_status(dr_value, strict)
    level_status = _get_level_status(lufs, strict)
    stereo_status = _get_stereo_status(stereo_balance, stereo_correlation, ms_ratio, strict)

    # LUFS + PLR correlation: only flag LUFS as actionable when corroborated by low dynamics
    # lufs > -12: above "good" upper bound (genre-safe for modern loud mixes)
    # dr_value < 8: PLR in warning/critical territory (aligned with ScoringThresholds)
    compression_suspected = (lufs > -12) and (dr_value < 8)

    if lang == 'es':
        return {
            "headroom": _generate_headroom_text_es(headroom, true_peak, headroom_status, strict),
            "dynamic_range": _generate_dr_text_es(dr_value, dr_status),
            "overall_level": _generate_level_text_es(lufs, level_status, compression_suspected),
            "stereo_balance": _generate_stereo_text_es(stereo_balance, stereo_correlation, ms_ratio, stereo_status),
            "crest_factor": _generate_crest_factor_text_es(crest_factor)
        }
    else:
        return {
            "headroom": _generate_headroom_text_en(headroom, true_peak, headroom_status, strict),
            "dynamic_range": _generate_dr_text_en(dr_value, dr_status),
            "overall_level": _generate_level_text_en(lufs, level_status, compression_suspected),
            "stereo_balance": _generate_stereo_text_en(stereo_balance, stereo_correlation, ms_ratio, stereo_status),
            "crest_factor": _generate_crest_factor_text_en(crest_factor)
        }


# ============================================================================
# STATUS DETERMINATION FUNCTIONS - ALIGNED WITH analyzer.py v7.3.30
# ============================================================================

def _get_headroom_status(headroom: float, strict: bool = False) -> str:
    """
    Determine headroom status - aligned with bar thresholds in analyzer.py

    Headroom-only thresholds (true_peak has its own metric):
    - NORMAL: excellent ≤ -3, good -3 to -2, warning -2 to -1, error ≥ -1
    - STRICT: excellent ≤ -5, good -5 to -4, warning -4 to -1, error ≥ -1

    Note: In digital audio (dBFS), headroom is NEGATIVE.
    -6 dBFS means 6 dB of space below the 0 dBFS ceiling.
    More negative = more headroom (better).
    """
    if strict:
        if headroom <= -5.0:
            return "excellent"
        elif -5.0 < headroom <= -4.0:
            return "good"
        elif -4.0 < headroom <= -1.0:
            return "warning"
        else:  # > -1.0
            return "error"
    else:
        if headroom <= -3.0:
            return "excellent"
        elif -3.0 < headroom <= -2.0:
            return "good"
        elif -2.0 < headroom <= -1.0:
            return "warning"
        else:  # > -1.0
            return "error"


def _get_dr_status(dr_value: float, strict: bool = False) -> str:
    """
    Determine dynamic range (PLR) status - CORRECTED to match analyzer.py
    
    analyzer.py thresholds:
    - NORMAL: perfect >= 12, pass 8-12, warning 6-8, critical < 6
    - STRICT: perfect >= 14, pass 12-14, warning 10-12, critical < 10
    """
    if strict:
        # Strict mode: require more dynamics - FIXED thresholds
        if dr_value >= 14:
            return "excellent"
        elif dr_value >= 12:
            return "good"
        elif dr_value >= 10:  # FIXED: was 8, now 10 per analyzer
            return "warning"
        else:
            return "error"
    else:
        # Normal mode
        if dr_value >= 12:
            return "excellent"
        elif dr_value >= 8:
            return "good"
        elif dr_value >= 6:
            return "warning"
        else:
            return "error"


def _get_level_status(lufs: float, strict: bool = False) -> str:
    """
    Determine overall level status.
    
    NOTE: LUFS is INFORMATIVE for pre-mastering mixes.
    Range -15 to -35 LUFS is completely normal.
    The analyzer treats LUFS with weight 0.0 (informative only).
    
    We keep status determination for text generation, but the texts
    should reflect that LUFS is informative, not prescriptive.
    """
    if strict:
        # Strict mode: narrower acceptable range for commercial delivery
        if -24 <= lufs <= -18:
            return "excellent"
        elif -26 <= lufs <= -16:
            return "good"
        elif -30 <= lufs <= -14:
            return "warning"
        else:
            return "error"
    else:
        # Normal mode - wider range is acceptable for mixes
        if -24 <= lufs <= -16:
            return "excellent"
        elif -28 <= lufs <= -12:
            return "good"
        elif -35 <= lufs <= -10:
            return "warning"
        else:
            return "error"


def _get_stereo_status(balance: float, correlation: float, ms_ratio: float = 0.5, strict: bool = False) -> str:
    """
    Determine stereo balance status - CORRECTED to match analyzer.py v7.3.30
    
    analyzer.py ScoringThresholds.STEREO_WIDTH:
    - NORMAL: perfect 0.70-0.97, pass (0.50-0.70 or 0.97-1.0), warning 0.30-0.50, critical -0.5 to -0.2, catastrophic < -0.5
    - STRICT: perfect 0.75-0.85, pass (0.70-0.75 or 0.85-0.90), warning 0.60-0.70 or 0.90-0.97, critical -0.5 to -0.2
    
    v7.3.30 changes:
    - Correlation > 0.97 for "casi mono" (was 0.95) - 85% is NOT "almost mono"
    - M/S > 1.8 for "too wide" in normal mode (was 1.5)
    - M/S > 1.5 for "too wide" in strict mode (was 1.2)
    """
    # Check for catastrophic phase issues first (applies to both modes)
    if correlation < -0.5:
        return "catastrophic"
    if -0.5 <= correlation <= -0.2:
        return "critical"
    
    # Check for L/R balance issues
    balance_centered = 0.35 <= balance <= 0.65  # Wider tolerance
    
    if strict:
        # Strict mode thresholds
        # M/S ratio checks (v7.3.30: > 1.5 is too wide in strict)
        if ms_ratio > 1.5:
            return "warning"  # Too wide for commercial
        
        # Correlation checks
        if 0.75 <= correlation <= 0.85 and balance_centered:
            return "excellent"
        elif (0.70 <= correlation < 0.75 or 0.85 < correlation <= 0.90) and balance_centered:
            return "good"
        elif 0.60 <= correlation < 0.70 or 0.90 < correlation <= 0.97:
            return "warning"
        elif correlation > 0.97:  # Almost mono
            return "warning"  # In strict mode, almost mono is a warning
        else:
            return "warning"
    else:
        # Normal mode thresholds (v7.3.30)
        # M/S ratio checks (v7.3.30: > 1.8 is too wide in normal)
        if ms_ratio > 1.8:
            return "warning"  # Too wide
        
        # Correlation checks - CORRECTED per v7.3.30
        # 0.70-0.97 is PERFECT (85% is healthy stereo, NOT almost mono)
        if 0.70 <= correlation <= 0.97 and balance_centered:
            return "excellent"
        # 0.50-0.70 or 0.97-1.0 is PASS
        elif (0.50 <= correlation < 0.70 or 0.97 < correlation <= 1.0) and balance_centered:
            return "good"
        # 0.30-0.50 is WARNING
        elif 0.30 <= correlation < 0.50:
            return "warning"
        # Almost mono (> 0.97) with very low M/S - only warn if M/S < 0.05 AND corr > 0.97
        elif correlation > 0.97 and ms_ratio < 0.05:
            return "warning"  # Practically mono
        else:
            return "warning"


# ============================================================================
# SPANISH TEXT GENERATORS - UPDATED
# ============================================================================

def _generate_headroom_text_es(headroom: float, true_peak: float, status: str, strict: bool = False) -> Dict[str, str]:
    """Generate Spanish interpretation for headroom & true peak"""
    # Dynamic reduction calculation aligned with calculate_headroom_recommendation()
    target = -6.0 if strict else -4.0
    reduction = max(1, round(headroom - target))

    if status == "excellent":
        return {
            "interpretation": (
                "Tu mezcla presenta un headroom (margen antes del máximo digital) óptimo para mastering. "
                "Hay espacio sobrado entre los picos y 0 dBFS, lo que permite aplicar "
                "procesamiento dinámico, ecualización y limitación de manera transparente "
                "sin riesgo de distorsión digital."
            ),
            "recommendation": (
                "No es necesario realizar ningún ajuste de ganancia antes del mastering. "
                "El nivel actual es ideal para trabajar con libertad."
            )
        }

    elif status == "good":
        return {
            "interpretation": (
                "Tu mezcla presenta un margen adecuado para mastering. "
                "Hay suficiente espacio entre los picos y 0 dBFS para aplicar compresión, "
                "ecualización y limitación sin comprometer la claridad ni introducir distorsión."
            ),
            "recommendation": (
                "No es necesario realizar ajustes de ganancia antes del mastering. "
                "El margen actual permite trabajar cómodamente."
            )
        }

    elif status == "warning":
        return {
            "interpretation": (
                "Tu mezcla necesita más margen antes del mastering. "
                "Los picos están muy cerca de 0 dBFS, lo que limita el espacio disponible "
                "para aplicar compresión y limitación de manera transparente durante el mastering."
            ),
            "recommendation": (
                f"Se recomienda reducir el nivel del bus principal entre {reduction}-{reduction+1} dB antes de exportar. "
                f"Esto dejará un margen de aproximadamente {abs(headroom) + reduction + 0.5:.1f} dBFS, "
                f"ideal para la sesión de mastering."
            )
        }

    else:  # error
        return {
            "interpretation": (
                "El margen de tu mezcla es insuficiente para el proceso de mastering. "
                "Los picos están demasiado cerca o tocando 0 dBFS, lo que no deja espacio "
                "para aplicar procesamiento sin introducir distorsión digital o limitar "
                "las posibilidades creativas del mastering."
            ),
            "recommendation": (
                f"Es necesario reducir el nivel del bus principal entre {reduction}-{reduction+1} dB antes de exportar. "
                f"Esto creará el espacio necesario (aproximadamente {abs(headroom) + reduction + 0.5:.1f} dBFS) "
                f"para que el ingeniero de mastering pueda trabajar correctamente."
            )
        }


def _generate_dr_text_es(dr_value: float, status: str) -> Dict[str, str]:
    """Generate Spanish interpretation for dynamic range (PLR)"""
    
    if status == "excellent":
        return {
            "interpretation": (
                "Tu mezcla mantiene un rango dinámico excelente. "
                "Hay buen contraste entre las secciones suaves y fuertes de la canción, "
                "lo que permite que el mastering pueda darle más impacto y energía sin "
                "sacrificar la musicalidad ni la expresividad de la interpretación."
            ),
            "recommendation": (
                "No comprimas más la mezcla - este nivel de dinámica es perfecto para "
                "el proceso de mastering. Mantén los compresores de bus con ajustes conservadores."
            )
        }
    
    elif status == "good":
        return {
            "interpretation": (
                "Tu mezcla presenta un rango dinámico adecuado para mastering. "
                "Hay contraste suficiente entre las partes suaves y fuertes, lo que da "
                "espacio al ingeniero de mastering para trabajar con la dinámica y crear "
                "una versión final con buen impacto."
            ),
            "recommendation": (
                "El rango dinámico actual es apropiado. Si estás usando compresión en el bus, "
                "verifica que no esté trabajando de forma agresiva en las secciones más densas."
            )
        }
    
    elif status == "warning":
        return {
            "interpretation": (
                "El rango dinámico de tu mezcla está algo comprimido. "
                "Hay poco contraste entre las secciones suaves y fuertes, lo que puede "
                "hacer que el mastering tenga menos margen para añadir impacto o que "
                "el resultado final suene algo plano o fatigante."
            ),
            "recommendation": (
                "El rango dinámico se encuentra reducido en esta mezcla. "
                "Esto puede indicar un nivel alto de compresión o limitación antes del mastering. "
                "Si no es una decisión intencional, conviene revisar cómo está siendo controlada la dinámica."
            )
        }
    
    else:  # error
        return {
            "interpretation": (
                "El rango dinámico de tu mezcla está severamente comprimido. "
                "Casi no hay contraste entre las partes suaves y fuertes de la canción, "
                "lo que resulta en un sonido plano, fatigante y sin espacio para que "
                "el mastering pueda añadir el impacto final deseado."
            ),
            "recommendation": (
                "La dinámica general es limitada para esta etapa. "
                "Esto puede afectar la sensación de profundidad y contraste en mastering. "
                "Revise si el nivel de compresión aplicado responde a la intención estética buscada."
            )
        }


def _generate_level_text_es(lufs: float, status: str, compression_suspected: bool = False) -> Dict[str, str]:
    """
    Generate Spanish interpretation for overall level.

    NOTE: LUFS is INFORMATIVE for pre-mastering mixes.
    It should never generate "reduce X dB" target advice.
    It CAN flag possible over-compression when corroborated by low PLR
    (compression_suspected flag computed upstream).
    """

    if status == "excellent":
        return {
            "interpretation": (
                "El nivel general de tu mezcla está dentro del margen recomendado para mastering. "
                "Permite al ingeniero trabajar con libertad para alcanzar el loudness objetivo "
                "de la plataforma de destino sin comprometer la dinámica."
            ),
            "recommendation": (
                "El nivel actual no requiere ajustes de niveles de ganancia. "
                "LUFS se incluye como referencia. No incide en la puntuación. "
                "El volumen final se define en mastering."
            )
        }

    elif status == "good":
        return {
            "interpretation": (
                "El nivel general de tu mezcla está bien para mastering. "
                "El loudness actual permite trabajar cómodamente para alcanzar los "
                "objetivos de las plataformas de streaming sin forzar el procesamiento."
            ),
            "recommendation": (
                "El nivel es adecuado. "
                "LUFS se incluye como referencia. No incide en la puntuación. "
                "El volumen final se define en mastering."
            )
        }

    elif status == "warning":
        if lufs > -14:
            if compression_suspected:
                return {
                    "interpretation": (
                        f"El nivel general de tu mezcla ({lufs:.1f} LUFS) es elevado. "
                        "Combinado con un rango dinámico reducido (PLR bajo), esto puede indicar "
                        "que la mezcla ya está muy comprimida o limitada antes del mastering. "
                        "Si no estás usando limitador en el bus principal, este dato es solo informativo."
                    ),
                    "recommendation": (
                        "Verifica si hay limitación o compresión agresiva en el bus principal. "
                        "Si el nivel alto responde a una decisión creativa, no es necesario cambiarlo. "
                        "El volumen final se define en mastering."
                    )
                }
            else:
                return {
                    "interpretation": (
                        f"El nivel general de tu mezcla ({lufs:.1f} LUFS) es elevado, "
                        "pero la dinámica está preservada. Esto puede ser normal según el género "
                        "y el estilo de mezcla."
                    ),
                    "recommendation": (
                        "LUFS es informativo. El volumen final se define en mastering."
                    )
                }
        else:
            return {
                "interpretation": (
                    f"El nivel general de tu mezcla ({lufs:.1f} LUFS) está por debajo del rango típico, "
                    "pero esto es informativo. Para mezclas pre-mastering, un rango amplio es aceptable. "
                    "El loudness final se ajusta en mastering."
                ),
                "recommendation": (
                    "LUFS es informativo. Si deseas, puedes ajustar los niveles de ganancia para un nivel "
                    "más cómodo de monitoreo, pero no es obligatorio."
                )
            }

    else:  # error
        if lufs > -10:
            if compression_suspected:
                return {
                    "interpretation": (
                        f"El nivel general de tu mezcla ({lufs:.1f} LUFS) es muy elevado. "
                        "Junto con un rango dinámico muy reducido, esto sugiere sobrecompresión "
                        "o limitación agresiva en la cadena del bus principal, lo que puede reducir "
                        "el margen disponible para el mastering."
                    ),
                    "recommendation": (
                        "Revisa la cadena de procesamiento del bus principal. "
                        "Si hay limitadores o compresores, verifica que estén cumpliendo una función "
                        "creativa y no solo subiendo el nivel. El volumen final se define en mastering."
                    )
                }
            else:
                return {
                    "interpretation": (
                        f"El nivel general de tu mezcla ({lufs:.1f} LUFS) es muy elevado, "
                        "aunque la dinámica se mantiene. Esto puede ser intencional según el género."
                    ),
                    "recommendation": (
                        "LUFS es informativo. Si no estás usando procesamiento en el bus principal "
                        "para subir el nivel, este dato no requiere acción. "
                        "El volumen final se define en mastering."
                    )
                }
        else:
            return {
                "interpretation": (
                    f"El nivel general de tu mezcla está en {lufs:.1f} LUFS. "
                    "Este valor es más bajo que el rango habitual para mezclas pre-mastering. "
                    "El volumen final se ajusta durante el proceso de mastering."
                ),
                "recommendation": (
                    "Un ingeniero de mastering puede trabajar con cualquier nivel "
                    "siempre que la mezcla tenga buena estructura de ganancia interna."
                )
            }


def _generate_stereo_text_es(balance: float, correlation: float, ms_ratio: float, status: str) -> Dict[str, str]:
    """
    Generate Spanish interpretation for stereo balance.
    UPDATED: Now considers M/S ratio per analyzer v7.3.30
    """
    
    if status == "catastrophic":
        return {
            "interpretation": (
                "SEVERO: Se detectó inversión de fase casi total en tu mezcla. "
                f"La correlación estéreo ({correlation:.2f}) indica que la mezcla se cancelará "
                "casi por completo cuando se reproduzca en mono. Esto es un problema crítico "
                "que hará que tu música suene mal o desaparezca en muchos sistemas."
            ),
            "recommendation": (
                "Revisa urgentemente: plugins con fase invertida, errores en procesamiento M/S, "
                "o canales accidentalmente invertidos. Verifica la fase de todos los buses estéreo."
            )
        }
    
    elif status == "critical":
        return {
            "interpretation": (
                f"La correlación estéreo de tu mezcla es muy baja ({correlation:.2f}). "
                "Hay riesgo significativo de cancelación de fase en reproducción mono. "
                "Instrumentos o voces pueden perder volumen o desaparecer en sistemas mono "
                "(parlantes Bluetooth, teléfonos, clubes)."
            ),
            "recommendation": (
                "Revisa plugins de ensanchamiento estéreo, reverbs con mucha información Side, "
                "y la fase de instrumentos grabados en estéreo. Prueba siempre en mono."
            )
        }
    
    elif status == "excellent":
        # Check if it's "almost mono" (high correlation + very low M/S)
        if correlation > 0.97 and ms_ratio < 0.05:
            return {
                "interpretation": (
                    "Tu mezcla presenta alta coherencia entre canales (excelente compatibilidad mono). "
                    f"Correlación muy alta ({correlation:.2f}) con relación M/S baja ({ms_ratio:.2f}). "
                    "Esto puede ser intencional o indicar que se exportó en mono."
                ),
                "recommendation": (
                    "Si buscas más amplitud estéreo, revisa la exportación y panoramas. "
                    "Si la mezcla centrada es intencional, está perfecta así."
                )
            }
        else:
            return {
                "interpretation": (
                    "La imagen estéreo de tu mezcla está perfectamente balanceada y centrada. "
                    "Los elementos centrales (voz, bajo, kick) mantienen su posición correctamente, "
                    "mientras que el campo estéreo presenta buen ancho sin perder enfoque ni coherencia mono."
                ),
                "recommendation": (
                    "El balance estéreo es correcto. No se requieren ajustes de panoramas."
                )
            }
    
    elif status == "good":
        return {
            "interpretation": (
                "La imagen estéreo de tu mezcla está bien balanceada. "
                "La distribución L/R es adecuada y la correlación estéreo indica que "
                "la mezcla mantiene coherencia cuando se escucha en mono, sin problemas "
                "de fase evidentes."
            ),
            "recommendation": (
                "El balance estéreo es adecuado. Si haces ajustes, que sean menores y específicos."
            )
        }
    
    elif status == "warning":
        # Determine the specific issue
        if ms_ratio > 1.5:  # Too wide (v7.3.30 threshold)
            return {
                "interpretation": (
                    f"La imagen estéreo de tu mezcla está muy ancha (M/S: {ms_ratio:.2f}). "
                    "Puede sonar débil en parlantes o perder impacto en mono. "
                    "Los efectos de ensanchamiento estéreo pueden estar exagerados."
                ),
                "recommendation": (
                    "Se detecta una correlación estéreo baja en algunos pasajes. "
                    "Esto puede generar cancelaciones parciales al reproducirse en mono. "
                    "Conviene verificar el comportamiento en mono y revisar los procesos estéreo aplicados."
                )
            }
        elif correlation > 0.97:  # Almost mono
            return {
                "interpretation": (
                    f"La imagen estéreo de tu mezcla está muy centrada (correlación: {correlation:.2f}). "
                    "El contenido estéreo es muy reducido. "
                    "Esto puede ser intencional según el género."
                ),
                "recommendation": (
                    "Si deseas más amplitud estéreo, considera panoramear algunos elementos "
                    "o añadir sutilmente efectos estéreo a guitarras, pads o ambientes."
                )
            }
        elif balance < 0.35 or balance > 0.65:
            return {
                "interpretation": (
                    "La imagen estéreo de tu mezcla presenta un desbalance notable entre canales L/R. "
                    "Esto puede indicar que hay elementos importantes posicionados muy a un lado "
                    "o que el nivel general entre canales no está equilibrado."
                ),
                "recommendation": (
                    f"Revisa los panoramas y niveles de los elementos principales. El balance L/R "
                    f"actual ({balance:.2f}) debería estar más cerca de 0.5 para una imagen centrada."
                )
            }
        else:
            # v7.3.51: Adjusted language - descriptive, not alarmist
            return {
                "interpretation": (
                    "La imagen estéreo de tu mezcla presenta correlación moderada entre canales. "
                    "Esto puede deberse a efectos estéreo amplios o elementos muy panoramizados. "
                    "Verifica el comportamiento en mono para asegurar compatibilidad."
                ),
                "recommendation": (
                    "Revisa los plugins de ensanchamiento estéreo y verifica la fase en instrumentos "
                    "grabados en estéreo. Considera ajustar el width en algunos elementos si es necesario."
                )
            }
    
    else:  # error (fallback)
        return {
            "interpretation": (
                "La imagen estéreo de tu mezcla presenta problemas significativos. "
                "Hay un desbalance severo entre canales o correlación estéreo muy baja, "
                "lo que resultará en una mezcla que suena descentrada o con cancelaciones "
                "importantes cuando se escucha en mono."
            ),
            "recommendation": (
                "Es necesario revisar toda la imagen estéreo: panoramas de elementos centrales, "
                "fase de instrumentos estéreo, y efectos de ensanchamiento. Verifica siempre en mono "
                "para detectar cancelaciones de fase."
            )
        }


# ============================================================================
# ENGLISH TEXT GENERATORS - UPDATED
# ============================================================================

def _generate_headroom_text_en(headroom: float, true_peak: float, status: str, strict: bool = False) -> Dict[str, str]:
    """Generate English interpretation for headroom & true peak"""
    # Dynamic reduction calculation aligned with calculate_headroom_recommendation()
    target = -6.0 if strict else -4.0
    reduction = max(1, round(headroom - target))

    if status == "excellent":
        return {
            "interpretation": (
                "Your mix presents optimal headroom for mastering. "
                "There's plenty of space between peaks and 0 dBFS, allowing for transparent "
                "dynamic processing, EQ, and limiting without risk of digital distortion."
            ),
            "recommendation": (
                "No gain adjustments needed before mastering. "
                "The current level is ideal for working with freedom."
            )
        }

    elif status == "good":
        return {
            "interpretation": (
                "Your mix presents adequate headroom for mastering. "
                "There's sufficient space between peaks and 0 dBFS to apply compression, "
                "EQ, and limiting without compromising clarity or introducing distortion."
            ),
            "recommendation": (
                "No gain adjustments needed before mastering. "
                "Current headroom allows comfortable working space."
            )
        }

    elif status == "warning":
        return {
            "interpretation": (
                "Your mix needs more headroom before mastering. "
                "Peaks are very close to 0 dBFS, limiting available space for transparent "
                "compression and limiting during the mastering process."
            ),
            "recommendation": (
                f"Consider reducing master bus level by {reduction}-{reduction+1} dB before export. "
                f"This will provide approximately {abs(headroom) + reduction + 0.5:.1f} dBFS headroom, "
                f"ideal for the mastering session."
            )
        }

    else:  # error
        return {
            "interpretation": (
                "Your mix's headroom is insufficient for mastering. "
                "Peaks are too close to or hitting 0 dBFS, leaving no space for processing "
                "without introducing digital distortion or limiting creative mastering possibilities."
            ),
            "recommendation": (
                f"Reduce master bus level by {reduction}-{reduction+1} dB before export. "
                f"This will create necessary space (approximately {abs(headroom) + reduction + 0.5:.1f} dBFS) "
                f"for proper mastering work."
            )
        }


def _generate_dr_text_en(dr_value: float, status: str) -> Dict[str, str]:
    """Generate English interpretation for dynamic range (PLR)"""
    
    if status == "excellent":
        return {
            "interpretation": (
                "Your mix maintains excellent dynamic range. "
                "Good contrast between soft and loud sections allows mastering to add "
                "impact and energy without sacrificing musicality or performance expression."
            ),
            "recommendation": (
                "Don't compress further - this dynamic level is perfect for mastering. "
                "Keep bus compressors with conservative settings."
            )
        }
    
    elif status == "good":
        return {
            "interpretation": (
                "Your mix presents adequate dynamic range for mastering. "
                "Sufficient contrast between soft and loud parts gives the mastering engineer "
                "space to work with dynamics and create a final version with good impact."
            ),
            "recommendation": (
                "Current dynamic range is appropriate. If using bus compression, verify it's not "
                "working aggressively during dense sections."
            )
        }
    
    elif status == "warning":
        return {
            "interpretation": (
                "Your mix's dynamic range is somewhat compressed. "
                "Little contrast between soft and loud sections may limit mastering's ability "
                "to add impact or result in a final product that sounds flat or fatiguing."
            ),
            "recommendation": (
                "The dynamic range appears reduced in this mix. "
                "This can indicate heavy compression or limiting before mastering. "
                "If this is not intentional, it may be worth reviewing how dynamics are being controlled."
            )
        }
    
    else:  # error
        return {
            "interpretation": (
                "Your mix's dynamic range is severely compressed. "
                "Almost no contrast between soft and loud parts results in flat, fatiguing sound "
                "with no space for mastering to add desired final impact."
            ),
            "recommendation": (
                "The overall dynamics are limited at this stage. "
                "This may affect depth and contrast during mastering. "
                "Review whether the amount of compression aligns with the intended aesthetic."
            )
        }


def _generate_level_text_en(lufs: float, status: str, compression_suspected: bool = False) -> Dict[str, str]:
    """
    Generate English interpretation for overall level.

    NOTE: LUFS is INFORMATIVE for pre-mastering mixes.
    It should never generate "reduce X dB" target advice.
    It CAN flag possible over-compression when corroborated by low PLR
    (compression_suspected flag computed upstream).
    """

    if status == "excellent":
        return {
            "interpretation": (
                "Your mix's overall level is within the recommended margin for mastering. "
                "It allows the mastering engineer to work freely toward target loudness "
                "without compromising dynamics."
            ),
            "recommendation": (
                "Current level requires no gain staging adjustments. "
                "LUFS is included as a reference. It does not affect the score. "
                "Final loudness is set during mastering."
            )
        }

    elif status == "good":
        return {
            "interpretation": (
                "Your mix's overall level is good for mastering. "
                "Current loudness provides sufficient headroom for comfortable mastering "
                "work to achieve streaming platform targets."
            ),
            "recommendation": (
                "Level is adequate. "
                "LUFS is included as a reference. It does not affect the score. "
                "Final loudness is set during mastering."
            )
        }

    elif status == "warning":
        if lufs > -14:
            if compression_suspected:
                return {
                    "interpretation": (
                        f"Your mix's overall level ({lufs:.1f} LUFS) is elevated. "
                        "Combined with a reduced dynamic range (low PLR), this may indicate "
                        "that the mix is already heavily compressed or limited before mastering. "
                        "If you're not using a limiter on the master bus, this is just informational."
                    ),
                    "recommendation": (
                        "Check for limiting or aggressive compression on the master bus. "
                        "If the high level is a creative decision, no changes are needed. "
                        "Final loudness is set during mastering."
                    )
                }
            else:
                return {
                    "interpretation": (
                        f"Your mix's overall level ({lufs:.1f} LUFS) is elevated, "
                        "but dynamics are preserved. This can be normal depending on genre "
                        "and mixing style."
                    ),
                    "recommendation": (
                        "LUFS is informational. Final loudness is set during mastering."
                    )
                }
        else:
            return {
                "interpretation": (
                    f"Your mix's overall level ({lufs:.1f} LUFS) is below the typical range, "
                    "but this is informational. For pre-mastering mixes, a wide range is acceptable. "
                    "Final loudness is adjusted during mastering."
                ),
                "recommendation": (
                    "LUFS is informational. You may adjust gain staging for more comfortable "
                    "monitoring, but it's not required."
                )
            }

    else:  # error
        if lufs > -10:
            if compression_suspected:
                return {
                    "interpretation": (
                        f"Your mix's overall level ({lufs:.1f} LUFS) is very high. "
                        "Combined with very reduced dynamic range, this suggests over-compression "
                        "or aggressive limiting on the master bus chain, which may reduce "
                        "the margin available for mastering."
                    ),
                    "recommendation": (
                        "Review the master bus processing chain. "
                        "If there are limiters or compressors, verify they serve a creative purpose "
                        "and are not just raising the level. Final loudness is set during mastering."
                    )
                }
            else:
                return {
                    "interpretation": (
                        f"Your mix's overall level ({lufs:.1f} LUFS) is very high, "
                        "though dynamics are maintained. This may be intentional depending on genre."
                    ),
                    "recommendation": (
                        "LUFS is informational. If you're not using master bus processing "
                        "to raise the level, no action is needed. "
                        "Final loudness is set during mastering."
                    )
                }
        else:
            return {
                "interpretation": (
                    f"Your mix's overall level ({lufs:.1f} LUFS) is very low. "
                    "While final loudness is adjusted in mastering, a very low level "
                    "may indicate gain staging issues in the mix."
                ),
                "recommendation": (
                    "Review your session's gain staging. "
                    "If everything sounds fine at your monitoring level, the mastering engineer "
                    "can work with this level without issue."
                )
            }


def _generate_stereo_text_en(balance: float, correlation: float, ms_ratio: float, status: str) -> Dict[str, str]:
    """
    Generate English interpretation for stereo balance.
    UPDATED: Now considers M/S ratio per analyzer v7.3.30
    """
    
    if status == "catastrophic":
        return {
            "interpretation": (
                "SEVERE: Near-total phase inversion detected in your mix. "
                f"Stereo correlation ({correlation:.2f}) indicates the mix will almost completely "
                "cancel out when played in mono. This is a critical issue that will make your "
                "music sound bad or disappear on many playback systems."
            ),
            "recommendation": (
                "Urgently check for: inverted phase plugins, M/S processing errors, "
                "or accidentally inverted channels. Verify phase on all stereo buses."
            )
        }
    
    elif status == "critical":
        return {
            "interpretation": (
                f"Your mix's stereo correlation is very low ({correlation:.2f}). "
                "Significant phase cancellation risk in mono playback. "
                "Instruments or vocals may lose volume or disappear entirely on mono systems "
                "(Bluetooth speakers, phones, clubs)."
            ),
            "recommendation": (
                "Review stereo widening plugins, reverbs with heavy Side content, "
                "and phase of stereo-recorded instruments. Always test in mono."
            )
        }
    
    elif status == "excellent":
        # Check if it's "almost mono" (high correlation + very low M/S)
        if correlation > 0.97 and ms_ratio < 0.05:
            return {
                "interpretation": (
                    "Your mix shows high channel coherence (excellent mono compatibility). "
                    f"Very high correlation ({correlation:.2f}) with low M/S ratio ({ms_ratio:.2f}). "
                    "This may be intentional or indicate a mono export."
                ),
                "recommendation": (
                    "If you want more stereo width, review export settings and panning. "
                    "If the centered mix is intentional, it's perfect as is."
                )
            }
        else:
            return {
                "interpretation": (
                    "Your mix's stereo image is perfectly balanced and centered. "
                    "Center elements (vocal, bass, kick) maintain correct position, "
                    "while stereo field presents good width without losing focus or mono coherence."
                ),
                "recommendation": (
                    "Stereo balance is correct. No pan adjustments needed."
                )
            }
    
    elif status == "good":
        return {
            "interpretation": (
                "Your mix's stereo image is well balanced. "
                "L/R distribution is adequate and stereo correlation indicates mix "
                "maintains coherence in mono playback without evident phase issues."
            ),
            "recommendation": (
                "Stereo balance is adequate. Any adjustments should be minor and specific."
            )
        }
    
    elif status == "warning":
        # Determine the specific issue
        if ms_ratio > 1.5:  # Too wide (v7.3.30 threshold)
            return {
                "interpretation": (
                    f"Your mix's stereo image is very wide (M/S: {ms_ratio:.2f}). "
                    "May sound weak on speakers or lose impact in mono. "
                    "Stereo widening effects may be exaggerated."
                ),
                "recommendation": (
                    "Low stereo correlation is detected in certain passages. "
                    "This may cause partial cancellations when summed to mono. "
                    "It is advisable to check mono compatibility and review stereo processing in those sections."
                )
            }
        elif correlation > 0.97:  # Almost mono
            return {
                "interpretation": (
                    f"Your mix's stereo image is very centered (corr: {correlation:.2f}). "
                    "Stereo content is very limited. "
                    "This may be intentional depending on genre."
                ),
                "recommendation": (
                    "If you want more stereo width, consider panning some elements "
                    "or subtly adding stereo effects to guitars, pads, or ambiences."
                )
            }
        elif balance < 0.35 or balance > 0.65:
            return {
                "interpretation": (
                    "Your mix's stereo image presents notable L/R channel imbalance. "
                    "This may indicate important elements positioned too far to one side "
                    "or unbalanced overall level between channels."
                ),
                "recommendation": (
                    f"Review pans and levels of main elements. Current L/R balance "
                    f"({balance:.2f}) should be closer to 0.5 for centered image."
                )
            }
        else:
            # v7.3.51: Adjusted language - descriptive, not alarmist
            return {
                "interpretation": (
                    "Your mix's stereo image presents moderate correlation between channels. "
                    "This may be due to wide stereo effects or heavily panned elements. "
                    "Verify mono behavior to ensure compatibility."
                ),
                "recommendation": (
                    "Review stereo widening plugins and verify phase on stereo-recorded instruments. "
                    "Consider adjusting width on some elements if needed."
                )
            }
    
    else:  # error (fallback)
        return {
            "interpretation": (
                "Your mix's stereo image presents significant problems. "
                "Severe channel imbalance or very low stereo correlation will result in "
                "off-center mix with evident phase issues or important cancellations "
                "when listening in mono."
            ),
            "recommendation": (
                "Review entire stereo image: center element pans, stereo instrument phase, "
                "and widening effects. Always check in mono to detect phase cancellations."
            )
        }


# ============================================================================
# CREST FACTOR TEXT GENERATORS (INFORMATIONAL)
# ============================================================================

def _generate_crest_factor_text_es(crest: float) -> Dict[str, str]:
    """Generate Spanish informational text for Crest Factor."""
    return {
        "interpretation": (
            f"El Crest Factor de tu mezcla es {crest:.1f} dB. "
            "Este valor indica la diferencia entre los picos y el nivel RMS promedio."
        ),
        "recommendation": (
            "Valores entre 10 y 20 dB son habituales en música con buen rango dinámico. "
            "Este dato es informativo. Usa PLR como métrica principal de dinámica."
        )
    }


def _generate_crest_factor_text_en(crest: float) -> Dict[str, str]:
    """Generate English informational text for Crest Factor."""
    return {
        "interpretation": (
            f"Your mix's Crest Factor is {crest:.1f} dB. "
            "This value indicates the difference between peaks and the average RMS level."
        ),
        "recommendation": (
            "Values between 10 and 20 dB are typical in music with good dynamic range. "
            "This is informational. Use PLR as the primary dynamics metric."
        )
    }


# ============================================================================
# HELPER FUNCTION FOR INTEGRATION
# ============================================================================

def format_for_api_response(
    interpretations: Dict[str, Dict[str, str]],
    metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Format interpretations + metrics for API response.
    
    Returns structure ready for frontend consumption.
    """
    ms_ratio = metrics.get('ms_ratio', 0.5)
    
    return {
        "headroom": {
            "interpretation": interpretations["headroom"]["interpretation"],
            "recommendation": interpretations["headroom"]["recommendation"],
            "metrics": {
                "headroom_dbfs": metrics.get('headroom', 0),
                "true_peak_dbtp": metrics.get('true_peak', 0),
                "status": _get_headroom_status(metrics.get('headroom', 0))
            }
        },
        "dynamic_range": {
            "interpretation": interpretations["dynamic_range"]["interpretation"],
            "recommendation": interpretations["dynamic_range"]["recommendation"],
            "metrics": {
                "plr": metrics.get('dynamic_range', 0),
                "status": _get_dr_status(metrics.get('dynamic_range', 0))
            }
        },
        "overall_level": {
            "interpretation": interpretations["overall_level"]["interpretation"],
            "recommendation": interpretations["overall_level"]["recommendation"],
            "metrics": {
                "lufs": metrics.get('lufs', 0),
                "status": _get_level_status(metrics.get('lufs', 0))
            }
        },
        "stereo_balance": {
            "interpretation": interpretations["stereo_balance"]["interpretation"],
            "recommendation": interpretations["stereo_balance"]["recommendation"],
            "metrics": {
                "balance_l_r": metrics.get('lr_balance_db', 0),
                "ms_ratio": ms_ratio,
                "correlation": metrics.get('stereo_correlation', 0),
                "status": _get_stereo_status(
                    metrics.get('stereo_balance', 0),
                    metrics.get('stereo_correlation', 0),
                    ms_ratio
                )
            }
        },
        "crest_factor": {
            "interpretation": interpretations["crest_factor"]["interpretation"],
            "recommendation": interpretations["crest_factor"]["recommendation"],
            "metrics": {
                "crest_factor_db": metrics.get('crest_factor', 0),
                "status": "info"
            }
        }
    }


def format_for_api_response_v2(
    interpretations: Dict[str, Dict[str, str]],
    metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    NEW VERSION: Format with Technical Details FIRST, then Complete Analysis.
    
    Each section in technical_details shows:
    1. Numeric data (metrics)
    2. Interpretation (what it means)
    3. Recommendation (what to do)
    
    Returns structure ready for frontend consumption.
    """
    ms_ratio = metrics.get('ms_ratio', 0.5)
    
    return {
        "technical_details": {
            "headroom": {
                "metrics": {
                    "headroom_dbfs": metrics.get('headroom', 0),
                    "true_peak_dbtp": metrics.get('true_peak', 0),
                    "status": _get_headroom_status(metrics.get('headroom', 0))
                },
                "interpretation": interpretations["headroom"]["interpretation"],
                "recommendation": interpretations["headroom"]["recommendation"]
            },
            "dynamic_range": {
                "metrics": {
                    "plr": metrics.get('dynamic_range', 0),
                    "status": _get_dr_status(metrics.get('dynamic_range', 0))
                },
                "interpretation": interpretations["dynamic_range"]["interpretation"],
                "recommendation": interpretations["dynamic_range"]["recommendation"]
            },
            "overall_level": {
                "metrics": {
                    "lufs": metrics.get('lufs', 0),
                    "status": _get_level_status(metrics.get('lufs', 0))
                },
                "interpretation": interpretations["overall_level"]["interpretation"],
                "recommendation": interpretations["overall_level"]["recommendation"]
            },
            "stereo_balance": {
                "metrics": {
                    "balance_l_r": metrics.get('lr_balance_db', 0),
                    "ms_ratio": ms_ratio,
                    "correlation": metrics.get('stereo_correlation', 0),
                    "status": _get_stereo_status(
                        metrics.get('stereo_balance', 0),
                        metrics.get('stereo_correlation', 0),
                        ms_ratio
                    )
                },
                "interpretation": interpretations["stereo_balance"]["interpretation"],
                "recommendation": interpretations["stereo_balance"]["recommendation"]
            }
        },
        "complete_analysis": {
            "headroom": interpretations["headroom"],
            "dynamic_range": interpretations["dynamic_range"],
            "overall_level": interpretations["overall_level"],
            "stereo_balance": interpretations["stereo_balance"]
        }
    }


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    # Test with sample metrics
    test_metrics = {
        'headroom': -6.2,
        'true_peak': -3.1,
        'dynamic_range': 9.2,
        'lufs': -18.5,
        'stereo_balance': 0.52,
        'stereo_correlation': 0.85,
        'ms_ratio': 0.45
    }
    
    print("=" * 60)
    print("TESTING CORRECTED interpretative_texts.py v1.1.0")
    print("Aligned with analyzer.py v7.3.30")
    print("=" * 60)
    
    # Generate Spanish texts (normal mode)
    print("\n=== SPANISH INTERPRETATIONS (NORMAL MODE) ===\n")
    interpretations_es = generate_interpretative_texts(test_metrics, lang='es', strict=False)
    for section, texts in interpretations_es.items():
        print(f"\n{section.upper()}:")
        print(f"Interpretation: {texts['interpretation'][:100]}...")
        print(f"Recommendation: {texts['recommendation'][:100]}...")
    
    # Generate Spanish texts (strict mode)
    print("\n=== SPANISH INTERPRETATIONS (STRICT MODE) ===\n")
    interpretations_es_strict = generate_interpretative_texts(test_metrics, lang='es', strict=True)
    for section, texts in interpretations_es_strict.items():
        print(f"\n{section.upper()}:")
        print(f"Interpretation: {texts['interpretation'][:100]}...")
    
    # Test edge cases
    print("\n=== EDGE CASE TESTS ===\n")
    
    # Test almost mono (correlation > 0.97, M/S < 0.05)
    mono_metrics = {
        'headroom': -6.0,
        'true_peak': -3.0,
        'dynamic_range': 12.0,
        'lufs': -18.0,
        'stereo_balance': 0.50,
        'stereo_correlation': 0.98,
        'ms_ratio': 0.02
    }
    mono_result = generate_interpretative_texts(mono_metrics, lang='es')
    print(f"Almost Mono Test: {mono_result['stereo_balance']['interpretation'][:100]}...")
    
    # Test too wide (M/S > 1.8)
    wide_metrics = {
        'headroom': -6.0,
        'true_peak': -3.0,
        'dynamic_range': 12.0,
        'lufs': -18.0,
        'stereo_balance': 0.50,
        'stereo_correlation': 0.65,
        'ms_ratio': 2.0
    }
    wide_result = generate_interpretative_texts(wide_metrics, lang='es')
    print(f"Too Wide Test: {wide_result['stereo_balance']['interpretation'][:100]}...")
    
    # Test catastrophic phase
    phase_metrics = {
        'headroom': -6.0,
        'true_peak': -3.0,
        'dynamic_range': 12.0,
        'lufs': -18.0,
        'stereo_balance': 0.50,
        'stereo_correlation': -0.7,
        'ms_ratio': 0.5
    }
    phase_result = generate_interpretative_texts(phase_metrics, lang='es')
    print(f"Catastrophic Phase Test: {phase_result['stereo_balance']['interpretation'][:100]}...")
    
    print("\n✅ All tests completed!")

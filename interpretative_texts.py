#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Interpretative Texts Generator for MasteringReady
=================================================

CORRECTED VERSION - Aligned with analyzer.py v7.3.30 thresholds

Key fixes:
1. Stereo correlation thresholds aligned with ScoringThresholds
2. Headroom thresholds corrected for normal/strict modes
3. Dynamic Range (PLR) strict mode thresholds fixed
4. Added M/S ratio consideration to stereo evaluation
5. LUFS text adjusted to reflect "informative" nature

Author: MasteringReady Team
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
    
    # Determine status for each metric (considering strict mode)
    headroom_status = _get_headroom_status(headroom, true_peak, strict)
    dr_status = _get_dr_status(dr_value, strict)
    level_status = _get_level_status(lufs, strict)
    stereo_status = _get_stereo_status(stereo_balance, stereo_correlation, ms_ratio, strict)
    
    if lang == 'es':
        return {
            "headroom": _generate_headroom_text_es(headroom, true_peak, headroom_status),
            "dynamic_range": _generate_dr_text_es(dr_value, dr_status),
            "overall_level": _generate_level_text_es(lufs, level_status),
            "stereo_balance": _generate_stereo_text_es(stereo_balance, stereo_correlation, ms_ratio, stereo_status)
        }
    else:
        return {
            "headroom": _generate_headroom_text_en(headroom, true_peak, headroom_status),
            "dynamic_range": _generate_dr_text_en(dr_value, dr_status),
            "overall_level": _generate_level_text_en(lufs, level_status),
            "stereo_balance": _generate_stereo_text_en(stereo_balance, stereo_correlation, ms_ratio, stereo_status)
        }


# ============================================================================
# STATUS DETERMINATION FUNCTIONS - ALIGNED WITH analyzer.py v7.3.30
# ============================================================================

def _get_headroom_status(headroom: float, true_peak: float, strict: bool = False) -> str:
    """
    Determine headroom status - CORRECTED to match analyzer.py
    
    analyzer.py thresholds:
    - NORMAL: perfect = -6 to -3, pass = -9 to -3, warning = -2 to -1, critical >= -1
    - STRICT: perfect = -6 to -5, warning = -4 to -1, critical >= -1
    
    Note: In digital audio (dBFS), headroom is NEGATIVE.
    -6 dBFS means 6 dB of space below the 0 dBFS ceiling.
    More negative = more headroom (better).
    """
    if strict:
        # Strict mode: more conservative requirements
        # Perfect: headroom -6 to -5 AND true peak <= -3
        if -6.0 <= headroom <= -5.0 and true_peak <= -3.0:
            return "excellent"
        # Pass: acceptable but not ideal
        elif headroom <= -4.0 and true_peak <= -2.0:
            return "good"
        # Warning: hot mix, -4 to -1
        elif -4.0 <= headroom < -1.0:
            return "warning"
        # Critical: >= -1 dBFS
        else:
            return "error"
    else:
        # Normal mode - CORRECTED thresholds
        # Perfect: -6 to -3 dBFS (analyzer's perfect range)
        if -6.0 <= headroom <= -3.0 and true_peak <= -3.0:
            return "excellent"
        # Good/Pass: -9 to -3 OR slightly above -3
        elif headroom <= -3.0 and true_peak <= -1.0:
            return "good"
        # Warning: -2 to -1 (hot but not clipping)
        elif -2.0 < headroom < -1.0:
            return "warning"
        # Error: >= -1 dBFS (critical/clipping risk)
        else:
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

def _generate_headroom_text_es(headroom: float, true_peak: float, status: str) -> Dict[str, str]:
    """Generate Spanish interpretation for headroom & true peak"""
    
    if status == "excellent":
        return {
            "interpretation": (
                "Tu mezcla presenta un headroom óptimo para mastering. "
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
                "Tu mezcla presenta un headroom adecuado para mastering. "
                "Hay suficiente espacio entre los picos y 0 dBFS para aplicar compresión, "
                "ecualización y limitación sin comprometer la claridad ni introducir distorsión."
            ),
            "recommendation": (
                "No es necesario realizar ajustes de ganancia antes del mastering. "
                "El headroom actual permite trabajar cómodamente."
            )
        }
    
    elif status == "warning":
        return {
            "interpretation": (
                "Tu mezcla necesita más headroom antes del mastering. "
                "Los picos están muy cerca de 0 dBFS, lo que limita el espacio disponible "
                "para aplicar compresión y limitación de manera transparente durante el mastering."
            ),
            "recommendation": (
                f"Se recomienda reducir el nivel del bus master entre 3-4 dB antes de exportar. "
                f"Esto dejará un headroom de aproximadamente {abs(headroom) + 3.5:.1f} dBFS, "
                f"ideal para la sesión de mastering."
            )
        }
    
    else:  # error
        return {
            "interpretation": (
                "El headroom de tu mezcla es insuficiente para el proceso de mastering. "
                "Los picos están demasiado cerca o tocando 0 dBFS, lo que no deja espacio "
                "para aplicar procesamiento sin introducir distorsión digital o limitar "
                "las posibilidades creativas del mastering."
            ),
            "recommendation": (
                f"Es necesario reducir el nivel del bus master entre 5-6 dB antes de exportar. "
                f"Esto creará el espacio necesario (aproximadamente {abs(headroom) + 5.5:.1f} dBFS) "
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
                "el proceso de mastering. Mantén los bus compressors con settings conservadores."
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
                "Revisa la compresión en el bus master y en los buses de grupo. "
                "Considera reducir el ratio o aumentar el threshold en los compresores "
                "más agresivos para recuperar algo de dinámica natural."
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
                "Es necesario reducir significativamente la compresión en toda la mezcla. "
                "Revisa todos los compresores, especialmente los del bus master y subgrupos. "
                "El objetivo es recuperar contraste dinámico entre las secciones de la canción."
            )
        }


def _generate_level_text_es(lufs: float, status: str) -> Dict[str, str]:
    """
    Generate Spanish interpretation for overall level.
    
    NOTE: These texts are INFORMATIVE. LUFS for pre-mastering mixes
    is not prescriptive - a wide range (-15 to -35) is acceptable.
    """
    
    if status == "excellent":
        return {
            "interpretation": (
                "El nivel general de tu mezcla es óptimo para mastering. "
                "Está en un rango que permite al ingeniero trabajar con libertad para "
                "alcanzar el loudness objetivo de la plataforma de destino sin comprometer "
                "la dinámica ni introducir distorsión."
            ),
            "recommendation": (
                "El nivel actual es perfecto. No ajustes el gain staging del bus master."
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
                "El nivel es adecuado. Si vas a hacer ajustes, que sean menores (±1-2 dB)."
            )
        }
    
    elif status == "warning":
        if lufs > -14:
            return {
                "interpretation": (
                    "El nivel general de tu mezcla está alto para mastering. "
                    "Un loudness muy elevado antes del mastering puede indicar sobrecompresión "
                    "o puede limitar las opciones del ingeniero para alcanzar el balance final deseado."
                ),
                "recommendation": (
                    f"Considera reducir el nivel del bus master en 3-5 dB. Actualmente está "
                    f"en {lufs:.1f} LUFS; para mezclas pre-mastering, un rango de -18 a -24 LUFS "
                    f"es cómodo para trabajar."
                )
            }
        else:
            return {
                "interpretation": (
                    "El nivel general de tu mezcla está bajo, pero esto es informativo. "
                    "Para mezclas pre-mastering, un rango amplio de -15 a -35 LUFS es aceptable. "
                    "El loudness final se ajusta en mastering."
                ),
                "recommendation": (
                    f"El nivel actual ({lufs:.1f} LUFS) es válido. Si deseas, puedes subir "
                    f"2-4 dB para un nivel más cómodo de monitoreo, pero no es obligatorio."
                )
            }
    
    else:  # error
        if lufs > -10:
            return {
                "interpretation": (
                    "El nivel general de tu mezcla es excesivamente alto. "
                    "Este loudness indica sobrecompresión severa o limitación agresiva, "
                    "lo que reduce significativamente el margen disponible para el mastering "
                    "y limita las opciones de procesamiento."
                ),
                "recommendation": (
                    f"Es necesario reducir significativamente el nivel (6-10 dB mínimo) y "
                    f"revisar toda la cadena de procesamiento del bus master. El objetivo "
                    f"es dejar espacio para el mastering."
                )
            }
        else:
            return {
                "interpretation": (
                    "El nivel general de tu mezcla es muy bajo. "
                    "Aunque el loudness final se ajusta en mastering, un nivel muy bajo "
                    "puede indicar problemas de gain staging en la mezcla."
                ),
                "recommendation": (
                    f"Revisa el gain staging de tu sesión. Actualmente en {lufs:.1f} LUFS. "
                    f"Considera subir el nivel general si todo suena demasiado bajo."
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
                "Revisa plugins de widening estéreo, reverbs con mucha información Side, "
                "y la fase de instrumentos grabados en estéreo. Prueba siempre en mono."
            )
        }
    
    elif status == "excellent":
        # Check if it's "almost mono" (high correlation + very low M/S)
        if correlation > 0.97 and ms_ratio < 0.05:
            return {
                "interpretation": (
                    "Tu mezcla presenta alta coherencia entre canales (excelente compatibilidad mono). "
                    f"Correlación muy alta ({correlation:.2f}) con M/S ratio bajo ({ms_ratio:.2f}). "
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
                    "Los efectos de estéreo widening pueden estar exagerados."
                ),
                "recommendation": (
                    "Considera reducir el estéreo widening en algunos elementos. "
                    "Verifica que el centro (voz, bajo, kick) no esté disperso. "
                    "Prueba en mono para verificar."
                )
            }
        elif correlation > 0.97:  # Almost mono
            return {
                "interpretation": (
                    f"La imagen estéreo de tu mezcla está muy centrada (corr: {correlation:.2f}). "
                    "Aunque es mono-compatible, hay poca información estéreo. "
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
            return {
                "interpretation": (
                    "La imagen estéreo de tu mezcla presenta algunos problemas de correlación. "
                    "Esto puede indicar problemas de fase entre canales o uso excesivo de efectos "
                    "estéreo que causan pérdidas al escuchar en mono."
                ),
                "recommendation": (
                    "Revisa los plugins de widening estéreo y verifica la fase de los micrófonos "
                    "en instrumentos grabados en estéreo. Considera reducir el width en algunos elementos."
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
                "fase de instrumentos estéreo, y efectos de widening. Verifica siempre en mono "
                "para detectar cancelaciones de fase."
            )
        }


# ============================================================================
# ENGLISH TEXT GENERATORS - UPDATED
# ============================================================================

def _generate_headroom_text_en(headroom: float, true_peak: float, status: str) -> Dict[str, str]:
    """Generate English interpretation for headroom & true peak"""
    
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
                f"Consider reducing master bus level by 3-4 dB before export. "
                f"This will provide approximately {abs(headroom) + 3.5:.1f} dBFS headroom, "
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
                f"Reduce master bus level by 5-6 dB before export. "
                f"This will create necessary space (approximately {abs(headroom) + 5.5:.1f} dBFS) "
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
                "Review compression on master bus and group buses. Consider reducing ratio "
                "or increasing threshold on aggressive compressors to recover natural dynamics."
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
                "Significantly reduce compression throughout mix. Review all compressors, "
                "especially on master bus and subgroups. Goal is to recover dynamic contrast "
                "between song sections."
            )
        }


def _generate_level_text_en(lufs: float, status: str) -> Dict[str, str]:
    """
    Generate English interpretation for overall level.
    
    NOTE: These texts are INFORMATIVE. LUFS for pre-mastering mixes
    is not prescriptive - a wide range (-15 to -35) is acceptable.
    """
    
    if status == "excellent":
        return {
            "interpretation": (
                "Your mix's overall level is optimal for mastering. "
                "It provides excellent headroom for the mastering engineer to work freely, "
                "achieving target loudness without compromising dynamics or introducing distortion."
            ),
            "recommendation": (
                "Current level is perfect. Maintain this headroom for mastering."
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
                "Level is adequate. Any adjustments should be minimal (±1-2 dB)."
            )
        }
    
    elif status == "warning":
        if lufs > -14:
            return {
                "interpretation": (
                    "Your mix's overall level is quite hot for mastering. "
                    "Insufficient headroom may limit the mastering engineer's options "
                    "and could indicate over-processing on the master bus."
                ),
                "recommendation": (
                    f"Consider reducing master bus level by 3-5 dB. Currently at "
                    f"{lufs:.1f} LUFS; for pre-mastering mixes, -18 to -24 LUFS is comfortable."
                )
            }
        else:
            return {
                "interpretation": (
                    "Your mix's overall level is quite low, but this is informative. "
                    "For pre-mastering mixes, a wide range of -15 to -35 LUFS is acceptable. "
                    "Final loudness is adjusted during mastering."
                ),
                "recommendation": (
                    f"Current level ({lufs:.1f} LUFS) is valid. You may raise 2-4 dB "
                    f"for more comfortable monitoring, but it's not required."
                )
            }
    
    else:  # error
        if lufs > -10:
            return {
                "interpretation": (
                    "Your mix's overall level is excessively high. "
                    "This indicates severe over-compression or limiting on the mix bus, "
                    "significantly reducing available margin for mastering and "
                    "limiting processing options."
                ),
                "recommendation": (
                    f"Significantly reduce level (6-10 dB) and remove or reduce limiting/compression "
                    f"on master bus. Leave room for mastering to work."
                )
            }
        else:
            return {
                "interpretation": (
                    "Your mix's overall level is very low. "
                    "While final loudness is adjusted in mastering, a very low level "
                    "may indicate gain staging issues in the mix."
                ),
                "recommendation": (
                    f"Review your session's gain staging. Currently at {lufs:.1f} LUFS. "
                    f"Consider raising the overall level if everything sounds too quiet."
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
                    "Consider reducing stereo widening on some elements. "
                    "Verify center elements (vocal, bass, kick) aren't dispersed. "
                    "Test in mono to verify."
                )
            }
        elif correlation > 0.97:  # Almost mono
            return {
                "interpretation": (
                    f"Your mix's stereo image is very centered (corr: {correlation:.2f}). "
                    "While mono-compatible, there's little stereo information. "
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
            return {
                "interpretation": (
                    "Your mix's stereo image presents some correlation issues. "
                    "This may indicate phase problems between channels or excessive stereo effects "
                    "causing losses when listening in mono."
                ),
                "recommendation": (
                    "Review stereo widening plugins and verify phase of microphones on "
                    "stereo-recorded instruments. Consider reducing width on some elements."
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
                "status": _get_headroom_status(
                    metrics.get('headroom', 0),
                    metrics.get('true_peak', 0)
                )
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
                "balance_l_r": metrics.get('stereo_balance', 0),
                "ms_ratio": ms_ratio,
                "correlation": metrics.get('stereo_correlation', 0),
                "status": _get_stereo_status(
                    metrics.get('stereo_balance', 0),
                    metrics.get('stereo_correlation', 0),
                    ms_ratio
                )
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
                    "status": _get_headroom_status(
                        metrics.get('headroom', 0),
                        metrics.get('true_peak', 0)
                    )
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
                    "balance_l_r": metrics.get('stereo_balance', 0),
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

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Interpretative Texts Generator for MasteringReady
=================================================

Generates human-readable interpretations of technical metrics for:
1. Headroom & True Peak
2. Dynamic Range
3. Overall Level (LUFS)
4. Stereo Balance

Author: MasteringReady Team
Version: 1.0.0
"""

from typing import Dict, Any


def generate_interpretative_texts(
    metrics: Dict[str, Any],
    lang: str = 'es'
) -> Dict[str, Dict[str, str]]:
    """
    Generate interpretative texts for all 4 main sections.
    
    Args:
        metrics: Dictionary with all technical metrics
        lang: Language ('es' or 'en')
    
    Returns:
        Dictionary with interpretations for each section:
        {
            "headroom": {
                "interpretation": "...",
                "recommendation": "..."
            },
            "dynamic_range": {...},
            "overall_level": {...},
            "stereo_balance": {...}
        }
    """
    
    # Extract metrics
    headroom = metrics.get('headroom', 0)
    true_peak = metrics.get('true_peak', 0)
    dr_value = metrics.get('dynamic_range', 0)
    lufs = metrics.get('lufs', 0)
    stereo_balance = metrics.get('stereo_balance', 0)
    stereo_correlation = metrics.get('stereo_correlation', 0)
    
    # Determine status for each metric
    headroom_status = _get_headroom_status(headroom, true_peak)
    dr_status = _get_dr_status(dr_value)
    level_status = _get_level_status(lufs)
    stereo_status = _get_stereo_status(stereo_balance, stereo_correlation)
    
    if lang == 'es':
        return {
            "headroom": _generate_headroom_text_es(headroom, true_peak, headroom_status),
            "dynamic_range": _generate_dr_text_es(dr_value, dr_status),
            "overall_level": _generate_level_text_es(lufs, level_status),
            "stereo_balance": _generate_stereo_text_es(stereo_balance, stereo_correlation, stereo_status)
        }
    else:
        return {
            "headroom": _generate_headroom_text_en(headroom, true_peak, headroom_status),
            "dynamic_range": _generate_dr_text_en(dr_value, dr_status),
            "overall_level": _generate_level_text_en(lufs, level_status),
            "stereo_balance": _generate_stereo_text_en(stereo_balance, stereo_correlation, stereo_status)
        }


# ============================================================================
# STATUS DETERMINATION FUNCTIONS
# ============================================================================

def _get_headroom_status(headroom: float, true_peak: float) -> str:
    """Determine headroom status: excellent/good/warning/error
    
    Note: In digital audio (dBFS), headroom is NEGATIVE.
    -6 dBFS means 6 dB of space below the 0 dBFS ceiling.
    More negative = more headroom (better).
    """
    if headroom <= -6 and true_peak <= -1:
        return "excellent"
    elif headroom <= -4 and true_peak <= -0.5:
        return "good"
    elif headroom <= -2:
        return "warning"
    else:
        return "error"


def _get_dr_status(dr_value: float) -> str:
    """Determine dynamic range status"""
    if dr_value >= 8:
        return "excellent"
    elif dr_value >= 6:
        return "good"
    elif dr_value >= 4:
        return "warning"
    else:
        return "error"


def _get_level_status(lufs: float) -> str:
    """Determine overall level status"""
    if -16 <= lufs <= -8:
        return "excellent"
    elif -18 <= lufs <= -6:
        return "good"
    elif -20 <= lufs <= -4:
        return "warning"
    else:
        return "error"


def _get_stereo_status(balance: float, correlation: float) -> str:
    """Determine stereo balance status"""
    if 0.4 <= balance <= 0.6 and correlation > 0.7:
        return "excellent"
    elif 0.3 <= balance <= 0.7 and correlation > 0.5:
        return "good"
    elif correlation > 0.3:
        return "warning"
    else:
        return "error"


# ============================================================================
# SPANISH TEXT GENERATORS
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
    """Generate Spanish interpretation for dynamic range"""
    
    if status == "excellent":
        return {
            "interpretation": (
                "Tu mezcla mantiene un excelente rango dinámico. "
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
                "Tu mezcla presenta un rango dinámico saludable. "
                "Hay contraste suficiente entre las partes suaves y fuertes, lo que da "
                "espacio al ingeniero de mastering para trabajar con la dinámica y crear "
                "una versión final con buen impacto sin sonar sobrecomprimida."
            ),
            "recommendation": (
                "El rango dinámico actual está bien. Si estás usando compresión en el bus, "
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
    """Generate Spanish interpretation for overall level"""
    
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
                f"en {lufs:.1f} LUFS, lo ideal sería alrededor de -23 a -18 LUFS."
            )
        }
    else:
        return {
            "interpretation": (
                "El nivel general de tu mezcla está bajo para mastering. "
                "Un loudness muy bajo puede hacer que el procesamiento de mastering "
                "tenga que trabajar más agresivamente de lo deseado, potencialmente "
                "afectando la transparencia del resultado."
            ),
            "recommendation": (
                f"Considera aumentar el nivel del bus master en 2-4 dB. Actualmente está "
                f"en {lufs:.1f} LUFS, lo ideal sería alrededor de -23 a -18 LUFS."
            )
        }

else:  # error
    if lufs > -10:
        return {
            "interpretation": (
                "El nivel general de tu mezcla es excesivamente alto. "
                "Este loudness indica sobrecompresión severa o limitación agresiva, "
                "lo que deja muy poco margen para el ingeniero de mastering y "
                "probablemente ya ha comprometido la calidad sónica de la mezcla."
            ),
            "recommendation": (
                f"Es necesario reducir significativamente el nivel (6-10 dB mínimo) y "
                f"revisar toda la cadena de procesamiento del bus master. El objetivo "
                f"es un rango de -23 a -18 LUFS."
            )
        }
    else:
        return {
            "interpretation": (
                "El nivel general de tu mezcla es excesivamente bajo. "
                "Este loudness tan reducido forzará al mastering a trabajar de manera "
                "muy agresiva para alcanzar niveles competitivos, lo que probablemente "
                "comprometerá la transparencia y naturalidad del resultado final."
            ),
            "recommendation": (
                f"Es necesario aumentar el nivel del bus master significativamente "
                f"(5-8 dB). Actualmente en {lufs:.1f} LUFS, el objetivo es -23 a -18 LUFS."
            )
        }


def _generate_stereo_text_es(balance: float, correlation: float, status: str) -> Dict[str, str]:
    """Generate Spanish interpretation for stereo balance"""
    
    if status == "excellent":
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
        if balance < 0.3 or balance > 0.7:
            return {
                "interpretation": (
                    "La imagen estéreo de tu mezcla presenta un desbalance notable entre canales L/R. "
                    "Esto puede indicar que hay elementos importantes posicionados muy a un lado "
                    "o que el nivel general entre canales no está equilibrado, lo que puede "
                    "afectar la percepción de centralidad y balance tonal."
                ),
                "recommendation": (
                    f"Revisa los panoramas y niveles de los elementos principales. El balance L/R "
                    f"actual ({balance:.2f}) debería estar más cerca de 0.5 para una imagen centrada."
                )
            }
        else:
            return {
                "interpretation": (
                    "La imagen estéreo de tu mezcla presenta problemas de correlación estéreo. "
                    "Esto puede indicar problemas de fase entre canales, uso excesivo de efectos "
                    "estéreo, o información contraria entre L/R que puede causar pérdidas al "
                    "escuchar en mono."
                ),
                "recommendation": (
                    "Revisa los plugins de widening estéreo y verifica la fase de los micrófonos "
                    "en instrumentos grabados en estéreo. Considera reducir el width en algunos elementos."
                )
            }
    
    else:  # error
        return {
            "interpretation": (
                "La imagen estéreo de tu mezcla presenta problemas significativos. "
                "Hay un desbalance severo entre canales o correlación estéreo muy baja, "
                "lo que resultará en una mezcla que suena descentrada, con problemas de "
                "fase evidentes, o con cancelaciones importantes cuando se escucha en mono."
            ),
            "recommendation": (
                "Es necesario revisar toda la imagen estéreo: panoramas de elementos centrales, "
                "fase de instrumentos estéreo, y efectos de widening. Verifica siempre en mono "
                "para detectar cancelaciones de fase."
            )
        }


# ============================================================================
# ENGLISH TEXT GENERATORS (Similar structure, different language)
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
    """Generate English interpretation for dynamic range"""
    
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
                "Your mix presents healthy dynamic range. "
                "Sufficient contrast between soft and loud parts gives the mastering engineer "
                "space to work with dynamics and create a final version with good impact "
                "without sounding overcompressed."
            ),
            "recommendation": (
                "Current dynamic range is good. If using bus compression, verify it's not "
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
    """Generate English interpretation for overall level"""
    
    if status == "excellent":
        return {
            "interpretation": (
                "Your mix's overall level is optimal for mastering. "
                "It's in the ideal range (-23 to -18 LUFS) that provides excellent "
                "headroom for the mastering engineer to work freely, achieving "
                "target loudness without compromising dynamics or introducing distortion."
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
                "Level is adequate. Any adjustments should be minimal (±1 dB)."
            )
        }
    
    elif status == "warning":
        if lufs > -14:
            return {
                "interpretation": (
                    "Your mix's overall level is too hot for mastering. "
                    "Insufficient headroom may limit the mastering engineer's options "
                    "and could indicate over-processing on the master bus."
                ),
                "recommendation": (
                    f"Consider reducing master bus level by 3-5 dB. Currently at "
                    f"{lufs:.1f} LUFS, ideal range is -23 to -18 LUFS."
                )
            }
        else:
            return {
                "interpretation": (
                    "Your mix's overall level is quite low for mastering. "
                    "While headroom is important, excessive headroom may force "
                    "the mastering chain to work harder than optimal."
                ),
                "recommendation": (
                    f"Consider increasing master bus level by 2-4 dB. Currently at "
                    f"{lufs:.1f} LUFS, ideal range is -23 to -18 LUFS."
                )
            }
    
    else:  # error
        if lufs > -10:
            return {
                "interpretation": (
                    "Your mix's overall level is excessively high. "
                    "This indicates severe over-compression or limiting on the mix bus, "
                    "leaving almost no headroom for mastering and likely already "
                    "compromising the mix's dynamic range and clarity."
                ),
                "recommendation": (
                    f"Significantly reduce level (6-10 dB) and remove or reduce limiting/compression "
                    f"on master bus. Target range is -23 to -18 LUFS for proper mastering headroom."
                )
            }
        else:
            return {
                "interpretation": (
                    "Your mix's overall level is excessively low. "
                    "While headroom is valuable, this level will require very aggressive "
                    "gain staging in mastering, potentially introducing noise or requiring "
                    "excessive processing."
                ),
                "recommendation": (
                    f"Significantly increase master bus level (5-8 dB). Currently at "
                    f"{lufs:.1f} LUFS, target range is -23 to -18 LUFS."
                )
            }

def _generate_stereo_text_en(balance: float, correlation: float, status: str) -> Dict[str, str]:
    """Generate English interpretation for stereo balance"""
    
    if status == "excellent":
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
        if balance < 0.3 or balance > 0.7:
            return {
                "interpretation": (
                    "Your mix's stereo image presents notable L/R channel imbalance. "
                    "This may indicate important elements positioned too far to one side "
                    "or unbalanced overall level between channels, affecting perception "
                    "of centrality and tonal balance."
                ),
                "recommendation": (
                    f"Review pans and levels of main elements. Current L/R balance "
                    f"({balance:.2f}) should be closer to 0.5 for centered image."
                )
            }
        else:
            return {
                "interpretation": (
                    "Your mix's stereo image presents stereo correlation issues. "
                    "This may indicate phase problems between channels, excessive stereo effects, "
                    "or opposing information between L/R causing losses when listening in mono."
                ),
                "recommendation": (
                    "Review stereo widening plugins and verify phase of microphones on "
                    "stereo-recorded instruments. Consider reducing width on some elements."
                )
            }
    
    else:  # error
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
                "dr_lu": metrics.get('dynamic_range', 0),
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
                "balance_lr": metrics.get('stereo_balance', 0),
                "correlation": metrics.get('stereo_correlation', 0),
                "status": _get_stereo_status(
                    metrics.get('stereo_balance', 0),
                    metrics.get('stereo_correlation', 0)
                )
            }
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
        'lufs': -13.5,
        'stereo_balance': 0.52,
        'stereo_correlation': 0.85
    }
    
    # Generate Spanish texts
    interpretations_es = generate_interpretative_texts(test_metrics, lang='es')
    
    print("=== SPANISH INTERPRETATIONS ===\n")
    for section, texts in interpretations_es.items():
        print(f"\n{section.upper()}:")
        print(f"Interpretation: {texts['interpretation']}")
        print(f"Recommendation: {texts['recommendation']}")
    
    # Generate formatted API response
    formatted = format_for_api_response(interpretations_es, test_metrics)
    
    print("\n\n=== FORMATTED API RESPONSE ===\n")
    import json
    print(json.dumps(formatted, indent=2, ensure_ascii=False))

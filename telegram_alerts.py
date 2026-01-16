#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram Alerts for MasteringReady
==================================

Sistema de notificaciones en tiempo real para monitorear:
- Cada análisis realizado (score, veredicto)
- Errores críticos
- Detección de archivos masterizados
- Resumen diario

Setup:
1. Bot creado con @BotFather
2. Configurar variables de entorno en Render:
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID

Author: MasteringReady Team
Version: 1.0.1 (Secure)
"""

import requests
from datetime import datetime
from typing import Optional, Dict
import os

# ============================================================================
# CONFIGURACIÓN - VARIABLES DE ENTORNO (SEGURO)
# ============================================================================

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# ============================================================================
# FUNCIÓN BASE
# ============================================================================

def send_telegram(message: str, silent: bool = False) -> bool:
    """
    Envía un mensaje a Telegram.
    
    Args:
        message: Texto del mensaje (soporta HTML)
        silent: Si True, no hace sonido en el teléfono
    
    Returns:
        True si se envió correctamente, False si hubo error
    """
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_notification": silent
    }
    
    try:
        response = requests.post(url, data=payload, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"[Telegram Alert Error] {e}")
        return False


# ============================================================================
# ALERTAS ESPECÍFICAS
# ============================================================================

def alert_new_analysis(
    filename: str, 
    score: int, 
    verdict: str,
    lang: str = "es",
    strict: bool = False,
    duration: str = "",
    silent: bool = False
):
    """
    Notifica cada análisis completado.
    
    Args:
        filename: Nombre del archivo analizado
        score: Puntuación 0-100
        verdict: Veredicto del análisis
        lang: Idioma usado (es/en)
        strict: Si se usó modo strict
        duration: Duración del archivo
        silent: Sin sonido
    """
    # Emoji según score
    if score >= 80:
        emoji = "✅"
    elif score >= 60:
        emoji = "🟡"
    else:
        emoji = "🔴"
    
    # Modo
    mode = "🔒 Strict" if strict else "📊 Normal"
    
    # Truncar nombre si es muy largo
    display_name = filename[:35] + "..." if len(filename) > 35 else filename
    
    message = (
        f"{emoji} <b>Nuevo análisis</b>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"📁 {display_name}\n"
        f"🎯 Score: <b>{score}/100</b>\n"
        f"📋 {verdict}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"{mode} | 🌐 {lang.upper()}"
    )
    
    if duration:
        message += f" | ⏱ {duration}"
    
    send_telegram(message, silent=silent)


def alert_mastered_file(filename: str, confidence: str = "medium"):
    """
    Notifica cuando se detecta un archivo ya masterizado.
    
    Args:
        filename: Nombre del archivo
        confidence: Nivel de confianza (high/medium/low)
    """
    conf_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(confidence, "🟡")
    display_name = filename[:35] + "..." if len(filename) > 35 else filename
    
    message = (
        f"🎛️ <b>Máster detectado</b>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"📁 {display_name}\n"
        f"{conf_emoji} Confianza: {confidence}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"ℹ️ Usuario subió archivo ya masterizado"
    )
    
    send_telegram(message, silent=True)


def alert_error(
    error_type: str, 
    filename: str, 
    details: str,
    critical: bool = True
):
    """
    Notifica errores en el análisis.
    
    Args:
        error_type: Tipo de error (ej: "ValueError", "TimeoutError")
        filename: Archivo que causó el error
        details: Detalles del error
        critical: Si es crítico (con sonido) o no
    """
    display_name = filename[:35] + "..." if len(filename) > 35 else filename
    details_truncated = details[:150] + "..." if len(details) > 150 else details
    
    message = (
        f"🚨 <b>ERROR en análisis</b>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"📁 {display_name}\n"
        f"❌ <code>{error_type}</code>\n"
        f"━━━━━━━━━━━━━━━\n"
        f"📋 {details_truncated}"
    )
    
    send_telegram(message, silent=not critical)


def alert_daily_summary(
    total_analyses: int,
    avg_score: float,
    min_score: int,
    max_score: int,
    error_count: int,
    distribution: Dict[str, int],
    mastered_detected: int = 0,
    languages: Optional[Dict[str, int]] = None,
    strict_count: int = 0
):
    """
    Envía resumen diario de actividad.
    Ideal para llamar con cron a las 8pm.
    
    Args:
        total_analyses: Total de análisis del día
        avg_score: Score promedio
        min_score: Score mínimo
        max_score: Score máximo
        error_count: Cantidad de errores
        distribution: Dict con {"ready": N, "almost": N, "needs_work": N}
        mastered_detected: Archivos masterizados detectados
        languages: Dict con {"es": N, "en": N}
        strict_count: Análisis en modo strict
    """
    today = datetime.now().strftime("%d/%m/%Y")
    
    # Calcular porcentajes
    ready = distribution.get("ready", 0)
    almost = distribution.get("almost", 0)
    needs_work = distribution.get("needs_work", 0)
    
    ready_pct = (ready / total_analyses * 100) if total_analyses > 0 else 0
    almost_pct = (almost / total_analyses * 100) if total_analyses > 0 else 0
    needs_pct = (needs_work / total_analyses * 100) if total_analyses > 0 else 0
    
    message = (
        f"📊 <b>Resumen del {today}</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n\n"
        f"🎵 Análisis totales: <b>{total_analyses}</b>\n"
        f"📈 Score promedio: <b>{avg_score:.1f}</b>\n"
        f"⬆️ Máximo: {max_score} | ⬇️ Mínimo: {min_score}\n\n"
        f"<b>Distribución:</b>\n"
        f"✅ Mastering Ready: {ready} ({ready_pct:.0f}%)\n"
        f"🟡 Casi lista: {almost} ({almost_pct:.0f}%)\n"
        f"🔴 Necesita trabajo: {needs_work} ({needs_pct:.0f}%)\n\n"
    )
    
    if mastered_detected > 0:
        message += f"🎛️ Másters detectados: {mastered_detected}\n"
    
    if error_count > 0:
        message += f"⚠️ Errores: <b>{error_count}</b>\n"
    else:
        message += f"✅ Sin errores\n"
    
    message += f"\n━━━━━━━━━━━━━━━━━━\n"
    
    if languages:
        es_count = languages.get("es", 0)
        en_count = languages.get("en", 0)
        message += f"🌐 ES: {es_count} | EN: {en_count}"
        if strict_count > 0:
            message += f" | 🔒 Strict: {strict_count}"
    
    send_telegram(message)


def alert_milestone(milestone_type: str, value: int):
    """
    Notifica hitos importantes.
    
    Args:
        milestone_type: Tipo de hito ("daily_analyses", "total_analyses", etc.)
        value: Valor alcanzado
    """
    milestones = {
        "daily_analyses": f"🎉 <b>¡{value} análisis hoy!</b>\nNuevo récord diario",
        "total_analyses": f"🏆 <b>¡{value} análisis totales!</b>\nGracias por usar MasteringReady",
        "perfect_scores": f"⭐ <b>¡{value} scores perfectos!</b>\nMezclas listas para mastering",
    }
    
    message = milestones.get(milestone_type, f"🎯 Hito alcanzado: {milestone_type} = {value}")
    send_telegram(message)


def alert_system_status(status: str, details: str = ""):
    """
    Notifica estado del sistema (inicio, reinicio, mantenimiento).
    
    Args:
        status: "online", "offline", "maintenance", "restart"
        details: Detalles adicionales
    """
    status_messages = {
        "online": "🟢 <b>Sistema ONLINE</b>\nMasteringReady Analyzer activo",
        "offline": "🔴 <b>Sistema OFFLINE</b>\nServicio detenido",
        "maintenance": "🟡 <b>Mantenimiento</b>\nServicio temporalmente pausado",
        "restart": "🔄 <b>Reinicio completado</b>\nServicio restaurado",
    }
    
    message = status_messages.get(status, f"ℹ️ Estado: {status}")
    
    if details:
        message += f"\n📋 {details}"
    
    send_telegram(message)


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("🧪 Probando conexión con Telegram...\n")
    
    # Test básico
    success = send_telegram(
        "🧪 <b>Test de MasteringReady Alerts</b>\n"
        "━━━━━━━━━━━━━━━\n"
        "✅ Conexión exitosa\n"
        "📊 Sistema de alertas activo\n"
        "━━━━━━━━━━━━━━━\n"
        f"🕐 {datetime.now().strftime('%H:%M:%S')}"
    )
    
    if success:
        print("✅ Mensaje de prueba enviado correctamente!")
        print("📱 Revisa tu Telegram")
    else:
        print("❌ Error enviando mensaje")
        print("   Verifica token y chat_id")

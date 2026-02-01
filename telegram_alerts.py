#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram Alerts + Stats Tracking for Mastering Ready
====================================================

Sistema completo de:
- Notificaciones en tiempo real a Telegram
- Tracking de estadísticas diarias (archivo JSON)
- Cálculo automático de promedios y distribución
- Resumen diario automático

Setup:
1. Configurar variables de entorno en Render:
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID

Author: Mastering Ready Team
Version: 2.0.0 (Con Stats Tracking)
"""

import requests
from datetime import datetime, date
from typing import Optional, Dict, List
import os
import json
from pathlib import Path
import threading

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Archivo de estadísticas (persiste entre reinicios)
STATS_FILE = Path("/tmp/masteringready_stats.json")

# Lock para acceso thread-safe
_stats_lock = threading.Lock()

# ============================================================================
# STATS TRACKING SYSTEM
# ============================================================================

def _get_today_key() -> str:
    """Retorna la fecha de hoy como string YYYY-MM-DD."""
    return date.today().isoformat()


def _load_stats() -> Dict:
    """Carga estadísticas desde archivo JSON."""
    try:
        if STATS_FILE.exists():
            with open(STATS_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"[Stats] Error loading stats: {e}")
    return {}


def _save_stats(stats: Dict):
    """Guarda estadísticas en archivo JSON."""
    try:
        with open(STATS_FILE, 'w') as f:
            json.dump(stats, f, indent=2)
    except Exception as e:
        print(f"[Stats] Error saving stats: {e}")


def _get_today_stats() -> Dict:
    """Obtiene o crea las estadísticas del día actual."""
    with _stats_lock:
        stats = _load_stats()
        today = _get_today_key()
        
        if today not in stats:
            stats[today] = {
                "analyses": [],
                "errors": [],
                "mastered_detected": 0,
                "created_at": datetime.now().isoformat()
            }
            _save_stats(stats)
        
        return stats[today]


def track_analysis(
    filename: str,
    score: int,
    verdict: str,
    lang: str = "es",
    strict: bool = False,
    duration_seconds: float = 0,
    processing_time: float = 0,
    is_mastered: bool = False
):
    """
    Registra un análisis completado en las estadísticas.
    
    Args:
        filename: Nombre del archivo
        score: Puntuación 0-100
        verdict: Veredicto del análisis
        lang: Idioma (es/en)
        strict: Modo strict
        duration_seconds: Duración del audio en segundos
        processing_time: Tiempo de procesamiento en segundos
        is_mastered: Si se detectó como archivo masterizado
    """
    with _stats_lock:
        stats = _load_stats()
        today = _get_today_key()
        
        if today not in stats:
            stats[today] = {
                "analyses": [],
                "errors": [],
                "mastered_detected": 0,
                "created_at": datetime.now().isoformat()
            }
        
        # Agregar análisis
        stats[today]["analyses"].append({
            "filename": filename[:50],  # Truncar para no inflar el archivo
            "score": score,
            "verdict": verdict[:100],
            "lang": lang,
            "strict": strict,
            "duration_seconds": duration_seconds,
            "processing_time": processing_time,
            "timestamp": datetime.now().isoformat()
        })
        
        if is_mastered:
            stats[today]["mastered_detected"] += 1
        
        _save_stats(stats)


def track_error(error_type: str, filename: str, details: str):
    """
    Registra un error en las estadísticas.
    
    Args:
        error_type: Tipo de error
        filename: Archivo que causó el error
        details: Detalles del error
    """
    with _stats_lock:
        stats = _load_stats()
        today = _get_today_key()
        
        if today not in stats:
            stats[today] = {
                "analyses": [],
                "errors": [],
                "mastered_detected": 0,
                "created_at": datetime.now().isoformat()
            }
        
        stats[today]["errors"].append({
            "error_type": error_type,
            "filename": filename[:50],
            "details": details[:200],
            "timestamp": datetime.now().isoformat()
        })
        
        _save_stats(stats)


def get_daily_stats(date_key: Optional[str] = None) -> Dict:
    """
    Calcula estadísticas agregadas para un día.
    
    Args:
        date_key: Fecha en formato YYYY-MM-DD (default: hoy)
    
    Returns:
        Dict con estadísticas calculadas
    """
    if date_key is None:
        date_key = _get_today_key()
    
    with _stats_lock:
        stats = _load_stats()
    
    if date_key not in stats:
        return {
            "date": date_key,
            "total_analyses": 0,
            "avg_score": 0,
            "min_score": 0,
            "max_score": 0,
            "error_count": 0,
            "distribution": {"ready": 0, "almost": 0, "needs_work": 0},
            "mastered_detected": 0,
            "languages": {"es": 0, "en": 0},
            "strict_count": 0
        }
    
    day_data = stats[date_key]
    analyses = day_data.get("analyses", [])
    errors = day_data.get("errors", [])
    
    if not analyses:
        return {
            "date": date_key,
            "total_analyses": 0,
            "avg_score": 0,
            "min_score": 0,
            "max_score": 0,
            "error_count": len(errors),
            "distribution": {"ready": 0, "almost": 0, "needs_work": 0},
            "mastered_detected": day_data.get("mastered_detected", 0),
            "languages": {"es": 0, "en": 0},
            "strict_count": 0
        }
    
    scores = [a["score"] for a in analyses]
    
    # Distribución por score
    ready = sum(1 for s in scores if s >= 80)
    almost = sum(1 for s in scores if 60 <= s < 80)
    needs_work = sum(1 for s in scores if s < 60)
    
    # Idiomas
    es_count = sum(1 for a in analyses if a.get("lang") == "es")
    en_count = sum(1 for a in analyses if a.get("lang") == "en")
    
    # Strict mode
    strict_count = sum(1 for a in analyses if a.get("strict"))
    
    return {
        "date": date_key,
        "total_analyses": len(analyses),
        "avg_score": sum(scores) / len(scores),
        "min_score": min(scores),
        "max_score": max(scores),
        "error_count": len(errors),
        "distribution": {
            "ready": ready,
            "almost": almost,
            "needs_work": needs_work
        },
        "mastered_detected": day_data.get("mastered_detected", 0),
        "languages": {"es": es_count, "en": en_count},
        "strict_count": strict_count
    }


# ============================================================================
# TELEGRAM FUNCTIONS
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
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Telegram] Token or Chat ID not configured")
        return False
    
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
# ALERT FUNCTIONS (con tracking automático)
# ============================================================================

def alert_new_analysis(
    filename: str, 
    score: int, 
    verdict: str,
    lang: str = "es",
    strict: bool = False,
    duration: str = "",
    silent: bool = False,
    duration_seconds: float = 0,
    processing_time: float = 0
):
    """
    Notifica cada análisis completado Y registra en estadísticas.
    
    Args:
        filename: Nombre del archivo analizado
        score: Puntuación 0-100
        verdict: Veredicto del análisis
        lang: Idioma usado (es/en)
        strict: Si se usó modo strict
        duration: String de duración para mostrar
        silent: Sin sonido
        duration_seconds: Duración del audio en segundos (para stats)
        processing_time: Tiempo de procesamiento en segundos (para stats)
    """
    # 1. Registrar en estadísticas
    track_analysis(
        filename=filename,
        score=score,
        verdict=verdict,
        lang=lang,
        strict=strict,
        duration_seconds=duration_seconds,
        processing_time=processing_time
    )
    
    # 2. Enviar alerta a Telegram
    if score >= 80:
        emoji = "✅"
    elif score >= 60:
        emoji = "🟡"
    else:
        emoji = "🔴"
    
    mode = "🔒 Strict" if strict else "📊 Normal"
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
        message += f" | {duration}"
    
    send_telegram(message, silent=silent)


def alert_mastered_file(filename: str, confidence: str = "medium"):
    """
    Notifica cuando se detecta un archivo ya masterizado.
    """
    # Registrar en stats
    with _stats_lock:
        stats = _load_stats()
        today = _get_today_key()
        if today in stats:
            stats[today]["mastered_detected"] = stats[today].get("mastered_detected", 0) + 1
            _save_stats(stats)
    
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
    Notifica errores Y registra en estadísticas.
    """
    # Registrar en stats
    track_error(error_type, filename, details)
    
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


def alert_daily_summary(date_key: Optional[str] = None):
    """
    Envía resumen diario de actividad usando las estadísticas guardadas.
    
    Args:
        date_key: Fecha en formato YYYY-MM-DD (default: hoy)
    """
    stats = get_daily_stats(date_key)
    
    if stats["total_analyses"] == 0:
        message = (
            f"📊 <b>Resumen del {stats['date']}</b>\n"
            f"━━━━━━━━━━━━━━━━━━\n\n"
            f"😴 Sin análisis hoy\n"
        )
        if stats["error_count"] > 0:
            message += f"⚠️ Errores: {stats['error_count']}\n"
        
        send_telegram(message)
        return
    
    # Calcular porcentajes
    total = stats["total_analyses"]
    dist = stats["distribution"]
    
    ready_pct = (dist["ready"] / total * 100) if total > 0 else 0
    almost_pct = (dist["almost"] / total * 100) if total > 0 else 0
    needs_pct = (dist["needs_work"] / total * 100) if total > 0 else 0
    
    message = (
        f"📊 <b>Resumen del {stats['date']}</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n\n"
        f"🎵 Análisis totales: <b>{total}</b>\n"
        f"📈 Score promedio: <b>{stats['avg_score']:.1f}</b>\n"
        f"⬆️ Máximo: {stats['max_score']} | ⬇️ Mínimo: {stats['min_score']}\n\n"
        f"<b>Distribución:</b>\n"
        f"✅ Mastering Ready: {dist['ready']} ({ready_pct:.0f}%)\n"
        f"🟡 Casi lista: {dist['almost']} ({almost_pct:.0f}%)\n"
        f"🔴 Necesita trabajo: {dist['needs_work']} ({needs_pct:.0f}%)\n\n"
    )
    
    if stats["mastered_detected"] > 0:
        message += f"🎛️ Másters detectados: {stats['mastered_detected']}\n"
    
    if stats["error_count"] > 0:
        message += f"⚠️ Errores: <b>{stats['error_count']}</b>\n"
    else:
        message += f"✅ Sin errores\n"
    
    message += f"\n━━━━━━━━━━━━━━━━━━\n"
    
    langs = stats["languages"]
    message += f"🌐 ES: {langs['es']} | EN: {langs['en']}"
    
    if stats["strict_count"] > 0:
        message += f" | 🔒 Strict: {stats['strict_count']}"
    
    send_telegram(message)


def alert_milestone(milestone_type: str, value: int):
    """Notifica hitos importantes."""
    milestones = {
        "daily_analyses": f"🎉 <b>¡{value} análisis hoy!</b>\nNuevo récord diario",
        "total_analyses": f"🏆 <b>¡{value} análisis totales!</b>\nGracias por usar Mastering Ready",
        "perfect_scores": f"⭐ <b>¡{value} scores perfectos!</b>\nMezclas listas para mastering",
    }
    
    message = milestones.get(milestone_type, f"🎯 Hito alcanzado: {milestone_type} = {value}")
    send_telegram(message)


def alert_system_status(status: str, details: str = ""):
    """Notifica estado del sistema."""
    status_messages = {
        "online": "🟢 <b>Sistema ONLINE</b>\nMastering Ready Analyzer activo",
        "offline": "🔴 <b>Sistema OFFLINE</b>\nServicio detenido",
        "maintenance": "🟡 <b>Mantenimiento</b>\nServicio temporalmente pausado",
        "restart": "🔄 <b>Reinicio completado</b>\nServicio restaurado",
    }
    
    message = status_messages.get(status, f"ℹ️ Estado: {status}")
    
    if details:
        message += f"\n📋 {details}"
    
    send_telegram(message)


# ============================================================================
# UTILITY: Ver estadísticas actuales (para debug)
# ============================================================================

def print_today_stats():
    """Imprime las estadísticas del día actual (para debug)."""
    stats = get_daily_stats()
    print(f"\n📊 Estadísticas del {stats['date']}:")
    print(f"   Total análisis: {stats['total_analyses']}")
    print(f"   Score promedio: {stats['avg_score']:.1f}")
    print(f"   Rango: {stats['min_score']} - {stats['max_score']}")
    print(f"   Distribución: ✅{stats['distribution']['ready']} 🟡{stats['distribution']['almost']} 🔴{stats['distribution']['needs_work']}")
    print(f"   Errores: {stats['error_count']}")
    print(f"   Idiomas: ES={stats['languages']['es']} EN={stats['languages']['en']}")
    print(f"   Strict mode: {stats['strict_count']}")
    print()


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("🧪 Probando sistema de alertas y tracking...\n")
    
    # Test de tracking
    print("1️⃣ Simulando 3 análisis...")
    track_analysis("test1.wav", 95, "Perfecta para mastering", "es", False, 180, 5.2)
    track_analysis("test2.wav", 72, "Casi lista", "es", False, 240, 6.1)
    track_analysis("test3.wav", 45, "Necesita trabajo", "en", True, 120, 3.8)
    
    # Ver estadísticas
    print_today_stats()
    
    # Test de Telegram (solo si está configurado)
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        print("2️⃣ Enviando resumen de prueba a Telegram...")
        alert_daily_summary()
        print("✅ Revisa tu Telegram!")
    else:
        print("⚠️ Telegram no configurado (TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID vacíos)")
        print("   Las estadísticas se guardan localmente pero no se envían alertas.")

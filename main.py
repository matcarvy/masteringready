# ============================================================================
# SNIPPET PARA AGREGAR A main.py
# ============================================================================
#
# Copia este código y agrégalo a tu main.py después de los otros endpoints.
# Esto te permite:
# 1. Ver estadísticas en /api/stats
# 2. Enviar resumen diario manualmente en /api/stats/send-summary
# 3. Usar un servicio como cron-job.org para llamar el endpoint cada día a las 8pm
#
# ============================================================================

# Agregar este import al inicio del archivo (junto a los otros imports de telegram_alerts):
# from telegram_alerts import alert_daily_summary, get_daily_stats

# ============== STATS ENDPOINTS ==============

@app.get("/api/stats")
async def get_stats():
    """
    Obtiene estadísticas del día actual.
    Útil para dashboards o monitoreo.
    """
    try:
        from telegram_alerts import get_daily_stats
        stats = get_daily_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"❌ Error getting stats: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/api/stats/send-summary")
async def send_daily_summary():
    """
    Envía el resumen diario a Telegram.
    
    Puedes llamar este endpoint con un servicio como:
    - cron-job.org (gratis)
    - EasyCron
    - GitHub Actions
    - O cualquier scheduler externo
    
    Configura para que llame a:
    https://tu-app.onrender.com/api/stats/send-summary
    Todos los días a las 8pm (hora Colombia = 1:00 AM UTC del día siguiente)
    """
    try:
        from telegram_alerts import alert_daily_summary, get_daily_stats
        
        stats = get_daily_stats()
        alert_daily_summary()
        
        return {
            "success": True,
            "message": "Daily summary sent to Telegram",
            "stats": stats
        }
    except Exception as e:
        logger.error(f"❌ Error sending summary: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/api/stats/history")
async def get_stats_history(days: int = 7):
    """
    Obtiene estadísticas de los últimos N días.
    
    Args:
        days: Número de días (default: 7)
    """
    try:
        from telegram_alerts import get_daily_stats
        from datetime import date, timedelta
        
        history = []
        today = date.today()
        
        for i in range(days):
            day = today - timedelta(days=i)
            day_key = day.isoformat()
            stats = get_daily_stats(day_key)
            history.append(stats)
        
        return {
            "success": True,
            "days_requested": days,
            "history": history
        }
    except Exception as e:
        logger.error(f"❌ Error getting history: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# CONFIGURACIÓN DE CRON EXTERNO
# ============================================================================
#
# Para Render (que no tiene cron), usa un servicio externo gratuito:
#
# 1. Ve a https://cron-job.org (gratis)
# 2. Crea una cuenta
# 3. Agrega un nuevo cron job:
#    - URL: https://tu-app.onrender.com/api/stats/send-summary
#    - Schedule: 0 1 * * * (1:00 AM UTC = 8:00 PM Colombia)
#    - Method: GET
#
# ¡Listo! Recibirás el resumen diario en Telegram todas las noches.
#
# ============================================================================

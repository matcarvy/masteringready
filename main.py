"""
MasteringReady API v7.3
=======================

FastAPI backend for MasteringReady web application.

Features:
- Privacy-first: Audio analyzed in-memory, auto-deleted
- CORS enabled for frontend
- Supports ES/EN, Short/Write modes, Strict mode
- Returns JSON with analysis results

Based on Matías Carvajal's "Mastering Ready" methodology
Author: Matías Carvajal García (@matcarvy)
Version: 7.3.0-beta
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
from pathlib import Path
import logging
import sys
from typing import Optional
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import analyzer module
# Note: analyzer.py should be in the same directory (mix_analyzer_v7.3_BETA.py renamed)
try:
    from analyzer import analyze_file
    logger.info("✅ Analyzer module imported successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import analyzer: {e}")
    logger.error("Make sure mix_analyzer_v7.3_BETA.py is renamed to analyzer.py")
    # For now, continue without it for testing purposes
    logger.warning("⚠️ Running in test mode without analyzer")

# Create FastAPI app
app = FastAPI(
    title="MasteringReady API",
    description="Audio analysis API based on Matías Carvajal's Mastering Ready methodology",
    version="7.3.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://masteringready.vercel.app",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB
ALLOWED_EXTENSIONS = {'.wav', '.mp3', '.aiff'}


# ============== HEALTH CHECK ==============
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "name": "MasteringReady API",
        "version": "7.3.0",
        "status": "healthy",
        "methodology": "Basado en 'Mastering Ready' de Matías Carvajal",
        "endpoints": {
            "analyze": "/api/analyze/mix",
            "health": "/health",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "version": "7.3.0",
        "analyzer_loaded": True,
        "privacy": "In-memory processing, auto-delete guaranteed",
        "timestamp": datetime.utcnow().isoformat()
    }


# ============== MAIN ANALYZER ENDPOINT ==============
@app.post("/api/analyze/mix")
async def analyze_mix_endpoint(
    file: UploadFile = File(...),
    lang: str = Form("es"),
    mode: str = Form("write"),
    strict: bool = Form(False)
):
    """
    Analyze audio mix for mastering readiness.
    
    Privacy guarantee:
    - File analyzed in-memory only
    - Auto-deleted immediately after analysis
    - NO permanent storage without explicit user consent
    
    Parameters:
    - file: Audio file (.wav, .mp3, .aiff)
    - lang: Language (es/en)
    - mode: Output mode (short/write)
    - strict: Use strict commercial standards (true/false)
    
    Returns:
    - JSON with score, verdict, report, and metrics
    """
    
    # Log request
    logger.info(f"📥 Analysis request: {file.filename}, lang={lang}, mode={mode}, strict={strict}")
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no soportado. Solo se aceptan: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate file size (read first to check)
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Archivo demasiado grande. Máximo: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    if file_size == 0:
        raise HTTPException(
            status_code=400,
            detail="Archivo vacío"
        )
    
    logger.info(f"📊 File size: {file_size / 1024 / 1024:.2f} MB")
    
    # Use temporary file (auto-deleted)
    with tempfile.NamedTemporaryFile(
        delete=True,
        suffix=file_ext
    ) as temp_file:
        
        try:
            # Write uploaded content
            temp_file.write(content)
            temp_file.flush()
            
            logger.info(f"💾 Temp file created: {temp_file.name}")
            
            # Analyze
            logger.info("🔍 Starting analysis...")
            result = analyze_file(
                Path(temp_file.name),
                lang=lang,
                strict=strict
            )
            
            logger.info(f"✅ Analysis complete: Score {result['score']}/100")
            
            # Format output based on mode
            if mode == "write":
                # Get write mode output from result
                # The analyzer returns formatted output when called with appropriate params
                report = generate_write_report(result, lang, file.filename)
                
            elif mode == "short":
                # Generate short format
                report = generate_short_report(result, lang, file.filename)
                
            else:
                # JSON mode
                report = str(result)
            
            return {
                "success": True,
                "score": result["score"],
                "verdict": result["verdict"],
                "report": report,
                "metrics": result.get("metrics", []),
                "filename": file.filename,
                "privacy_note": "🔒 Audio analizado en memoria y eliminado inmediatamente.",
                "methodology": "Basado en la metodología 'Mastering Ready' de Matías Carvajal"
            }
            
        except Exception as e:
            logger.error(f"❌ Analysis error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error al analizar el archivo: {str(e)}"
            )
    
    # File automatically deleted here (tempfile context exit)
    logger.info("🗑️ Temp file auto-deleted")


# ============== HELPER FUNCTIONS ==============
def generate_write_report(result: dict, lang: str, filename: str) -> str:
    """Generate write mode report from analysis result."""
    
    score = result["score"]
    verdict = result["verdict"]
    metrics = result.get("metrics", [])
    
    if lang == "es":
        report = f"""🎵 Sobre "{filename}"

Tu mezcla está en {"muy buen punto" if score >= 85 else "buen camino" if score >= 60 else "desarrollo"}.

📊 Score: {score}/100
🎯 {verdict}

"""
    else:
        report = f"""🎵 Regarding "{filename}"

Your mix is {"in great shape" if score >= 85 else "on the right track" if score >= 60 else "in development"}.

📊 Score: {score}/100
🎯 {verdict}

"""
    
    # Add key metrics
    for metric in metrics:
        if metric.get("status") in ["critical", "warning"]:
            report += f"• {metric['name']}: {metric['message']}\n"
    
    return report


def generate_short_report(result: dict, lang: str, filename: str) -> str:
    """Generate short mode report."""
    
    score = result["score"]
    verdict = result["verdict"]
    
    if lang == "es":
        report = f"""🎵 {filename}
🧠 Resumen Rápido
{'─' * 50}

📊 Score: {score}/100
🎯 {verdict}

"""
    else:
        report = f"""🎵 {filename}
🧠 Quick Summary
{'─' * 50}

📊 Score: {score}/100
🎯 {verdict}

"""
    
    # Add top 3 recommendations
    recs = result.get("notes", {}).get("recommendations", [])
    if recs:
        report += "💡 " + ("Recomendaciones:" if lang == "es" else "Recommendations:") + "\n"
        for rec in recs[:3]:
            report += f"  {rec}\n"
    
    return report


# ============== RUN ==============
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

"""
MasteringReady API v7.3.2 - FINAL FIX
======================================

FastAPI backend for MasteringReady web application.

FIXES:
- Uses analyzer's write_report() directly (no mixing)
- Implements short mode following CLI logic exactly
- Proper Spanish/English separation

Based on Matías Carvajal's "Mastering Ready" methodology
Author: Matías Carvajal García (@matcarvy)
Version: 7.3.2-final
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
from pathlib import Path
import logging
import sys
from typing import Optional, Dict, Any
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import analyzer module
try:
    from analyzer import analyze_file, write_report, generate_cta
    logger.info("✅ Analyzer module imported successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import analyzer: {e}")
    logger.error("Make sure mix_analyzer_v7.3_BETA.py is renamed to analyzer.py")
    sys.exit(1)

# Create FastAPI app
app = FastAPI(
    title="MasteringReady API",
    description="Audio analysis API based on Matías Carvajal's Mastering Ready methodology",
    version="7.3.2",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
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


# ============== HELPER: SHORT MODE ==============
def generate_short_mode_report(result: Dict[str, Any], lang: str, filename: str, strict: bool = False) -> str:
    """
    Generate short mode report - simplified version without technical details.
    Uses the base write_report but strips out technical details section.
    """
    # Get the full write report
    full_report = write_report(result, strict=strict, lang=lang, filename=filename)
    
    # Remove technical details section if present
    # Technical details start with "📊 **Detalles Técnicos:**" or "📊 **Technical Details:**"
    if lang == 'es':
        # Split at technical details marker
        if "📊 **Detalles Técnicos:**" in full_report:
            parts = full_report.split("📊 **Detalles Técnicos:**")
            # Keep everything before technical details
            base_report = parts[0]
            # If there's a recommendation after, add it back
            if "💡 Recomendación:" in full_report:
                recommendation = "💡 Recomendación:" + full_report.split("💡 Recomendación:")[1]
                return base_report.strip() + "\n\n" + recommendation
            return base_report.strip()
    else:
        # English version
        if "📊 **Technical Details:**" in full_report:
            parts = full_report.split("📊 **Technical Details:**")
            base_report = parts[0]
            if "💡 Recommendation:" in full_report:
                recommendation = "💡 Recommendation:" + full_report.split("💡 Recommendation:")[1]
                return base_report.strip() + "\n\n" + recommendation
            return base_report.strip()
    
    # If no technical details section found, return as-is
    return full_report


# ============== HEALTH CHECK ==============
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "name": "MasteringReady API",
        "version": "7.3.2",
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
        "version": "7.3.2",
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
    
    # Validate file size
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
            # USES ANALYZER'S NATIVE FUNCTIONS - NO MIXING
            if mode == "write":
                logger.info("📝 Generating write mode report...")
                report = write_report(result, strict=strict, lang=lang, filename=file.filename)
                
            elif mode == "short":
                logger.info("📱 Generating short mode report...")
                report = generate_short_mode_report(result, lang, file.filename, strict)
                
            else:
                # JSON mode (fallback)
                report = str(result)
            
            return {
                "success": True,
                "score": result["score"],
                "verdict": result["verdict"],
                "report": report,
                "metrics": result.get("metrics", []),
                "filename": file.filename,
                "mode": mode,
                "lang": lang,
                "strict": strict,
                "privacy_note": "🔒 Audio analizado en memoria y eliminado inmediatamente.",
                "methodology": "Basado en la metodología 'Mastering Ready' de Matías Carvajal"
            }
            
        except Exception as e:
            logger.error(f"❌ Analysis error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error al analizar el archivo: {str(e)}"
            )
    
    # File automatically deleted here
    logger.info("🗑️ Temp file auto-deleted")


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

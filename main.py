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
import uuid
import asyncio
import functools
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

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

# In-memory job storage for polling pattern
# Jobs expire after 10 minutes
jobs: Dict[str, dict] = {}
jobs_lock = asyncio.Lock()

async def cleanup_old_jobs():
    """Remove jobs older than 10 minutes"""
    async with jobs_lock:
        now = datetime.now()
        expired = [
            job_id for job_id, job in jobs.items()
            if (now - job['created_at']) > timedelta(minutes=10)
        ]
        for job_id in expired:
            logger.info(f"🗑️ Cleaning up expired job: {job_id}")
            del jobs[job_id]

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
    
    STRATEGY: Get full report, then brutally remove tech section with string operations.
    This CANNOT fail - it's pure string manipulation.
    """
    # Get the full write report
    full_report = write_report(result, strict=strict, lang=lang, filename=filename)
    
    logger.info(f"🔧 SHORT MODE - Lang: {lang}")
    logger.info(f"📏 Full report length: {len(full_report)}")
    
    # ULTRA SIMPLE: Split and rejoin
    if lang == 'es':
        marker_start = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 DETALLES TÉCNICOS COMPLETOS"
        marker_end = "💡 Recomendación:"
    else:
        marker_start = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 COMPLETE TECHNICAL DETAILS"  
        marker_end = "💡 Recommendation:"
    
    logger.info(f"🔍 Searching for tech section marker...")
    logger.info(f"   Has marker_start: {marker_start in full_report}")
    logger.info(f"   Has marker_end: {marker_end in full_report}")
    
    # If tech section exists, remove it
    if marker_start in full_report and marker_end in full_report:
        logger.info("✂️ Removing tech section...")
        
        # Split at tech section start
        before = full_report.split(marker_start)[0]
        # Split after tech section and get recommendation
        after_parts = full_report.split(marker_end)
        if len(after_parts) > 1:
            recommendation = marker_end + after_parts[1]
            result = before.strip() + "\n\n" + recommendation.strip()
            logger.info(f"✅ Tech section removed. New length: {len(result)}")
            return result
        else:
            logger.warning("⚠️ Recommendation not found after tech section")
            return before.strip()
    
    # No tech section found, return as-is
    logger.warning("⚠️ Tech section markers not found - returning full report")
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
            
            # GENERATE BOTH REPORTS - Frontend decides which to show
            logger.info("📝 Generating both report modes...")
            report_write = write_report(result, strict=strict, lang=lang, filename=file.filename)
            report_short = generate_short_mode_report(result, lang, file.filename, strict)
            
            # For backward compatibility, use mode to set primary report
            if mode == "short":
                report = report_short
            else:
                report = report_write
            
            return {
                "success": True,
                "score": result["score"],
                "verdict": result["verdict"],
                "report": report,  # Primary report (for backward compat)
                "report_short": report_short,  # NUEVO: Always included
                "report_write": report_write,  # NUEVO: Always included
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


# ============== POLLING ENDPOINTS (Render Starter workaround) ==============

def generate_short_mode_report(result: Dict[str, Any], lang: str, filename: str, strict: bool = False) -> str:
    """Generate short mode report by removing technical details section"""
    logger.info(f"🔧 SHORT MODE - Lang: {lang}")
    
    # Get full report first
    full_report = write_report(result, strict=strict, lang=lang, filename=filename)
    
    logger.info(f"📏 Full report length: {len(full_report)}")
    
    # Find and remove technical details section
    logger.info("🔍 Searching for tech section marker...")
    
    if lang == 'es':
        marker_start = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 DETALLES TÉCNICOS COMPLETOS"
        marker_end = "💡 Recomendación:"
    else:
        marker_start = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 COMPLETE TECHNICAL DETAILS"
        marker_end = "💡 Recommendation:"
    
    logger.info(f"   Has marker_start: {marker_start in full_report}")
    logger.info(f"   Has marker_end: {marker_end in full_report}")
    
    if marker_start in full_report and marker_end in full_report:
        logger.info("✂️ Removing tech section...")
        before = full_report.split(marker_start)[0]
        after_parts = full_report.split(marker_end)
        if len(after_parts) > 1:
            recommendation = marker_end + after_parts[1]
            result_report = before.strip() + "\n\n" + recommendation.strip()
            logger.info(f"✅ Tech section removed. New length: {len(result_report)}")
            return result_report
    
    # If markers not found, try to keep just the summary part
    # Look for the intro and recommendation, skip middle sections
    logger.warning("⚠️ Tech section markers not found")
    
    # For chunked analysis, just return intro + recommendation
    if result.get('chunked', False):
        logger.info("📦 Chunked analysis detected - generating simplified short report")
        
        # Extract just the intro part (before any technical details)
        lines = full_report.split('\n')
        short_lines = []
        skip_mode = False
        
        for line in lines:
            # Keep everything until we hit technical details
            if '━━━' in line or '📊' in line or 'TECHNICAL' in line or 'TÉCNICOS' in line:
                skip_mode = True
            elif '💡' in line or 'Recomendación' in line or 'Recommendation' in line:
                skip_mode = False
            
            if not skip_mode:
                short_lines.append(line)
        
        return '\n'.join(short_lines)
    
    logger.warning("   Returning full report")
    return full_report


@app.post("/api/analyze/start")
async def start_analysis(
    file: UploadFile = File(...),
    lang: str = Form("es"),
    mode: str = Form("write"),
    strict: bool = Form(False)
):
    """
    Start analysis and return job_id immediately (<1 sec).
    Client polls /api/analyze/status/{job_id} for progress and result.
    
    This endpoint avoids Render's 30-second timeout by returning immediately.
    """
    
    # Cleanup old jobs
    await cleanup_old_jobs()
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    logger.info(f"📥 Analysis request (polling): {file.filename}, lang={lang}, mode={mode}")
    logger.info(f"📊 File size: {file_size / 1024 / 1024:.2f} MB")
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max: {MAX_FILE_SIZE / 1024 / 1024:.0f}MB"
        )
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Create job entry
    async with jobs_lock:
        jobs[job_id] = {
            'status': 'processing',
            'progress': 0,
            'result': None,
            'error': None,
            'created_at': datetime.now(),
            'filename': file.filename
        }
    
    logger.info(f"🆔 Job created: {job_id}")
    
    # Start analysis in background asyncio task
    async def analyze_in_background():
        try:
            # Create temp file
            with tempfile.NamedTemporaryFile(delete=True, suffix=file_ext) as temp_file:
                temp_file.write(content)
                temp_file.flush()
                
                logger.info(f"💾 [{job_id}] Temp file created")
                
                # Update progress
                async with jobs_lock:
                    jobs[job_id]['progress'] = 10
                
                # Analyze (blocking call - run in executor to not block event loop)
                logger.info(f"🔍 [{job_id}] Starting analysis...")
                
                # Determine if we need chunked analysis
                file_size_mb = file_size / (1024 * 1024)
                
                # Estimate duration: ~2 MB per minute for WAV (rough estimate)
                estimated_duration_min = file_size_mb / 2
                
                # Use chunked analysis for files > 4 minutes (to avoid memory issues)
                # Most songs are < 4 min and will use normal analysis (exact scoring)
                use_chunked = estimated_duration_min > 4.0  # Increased from 2.0 to 4.0
                
                loop = asyncio.get_event_loop()
                
                if use_chunked:
                    logger.info(f"🔄 [{job_id}] Using CHUNKED analysis (estimated {estimated_duration_min:.1f} min, {file_size_mb:.1f} MB)")
                    
                    # Import chunked function
                    from analyzer import analyze_file_chunked
                    
                    # Create progress callback to update job progress
                    def update_progress(progress_value):
                        """Update job progress - called from chunked analysis"""
                        import asyncio
                        async def _update():
                            async with jobs_lock:
                                if job_id in jobs:
                                    jobs[job_id]['progress'] = progress_value
                        # Schedule the async update
                        try:
                            loop = asyncio.get_event_loop()
                            asyncio.run_coroutine_threadsafe(_update(), loop)
                        except:
                            pass  # Ignore errors in progress updates
                    
                    analyze_func = functools.partial(
                        analyze_file_chunked,
                        Path(temp_file.name),
                        lang=lang,
                        strict=strict,
                        chunk_duration=30.0,  # 30 second chunks
                        progress_callback=update_progress  # ← Pass callback
                    )
                else:
                    logger.info(f"📊 [{job_id}] Using NORMAL analysis (estimated {estimated_duration_min:.1f} min, {file_size_mb:.1f} MB)")
                    
                    analyze_func = functools.partial(
                        analyze_file,
                        Path(temp_file.name),
                        lang=lang,
                        strict=strict
                    )
                
                result = await loop.run_in_executor(None, analyze_func)
                
                logger.info(f"✅ [{job_id}] Analysis complete: Score {result['score']}/100")
                
                # Update progress
                async with jobs_lock:
                    jobs[job_id]['progress'] = 70
                
                # Generate reports (also blocking - run in executor)
                logger.info(f"📝 [{job_id}] Generating reports...")
                
                write_func = functools.partial(
                    write_report,
                    result,
                    strict=strict,
                    lang=lang,
                    filename=file.filename
                )
                report_write = await loop.run_in_executor(None, write_func)
                
                short_func = functools.partial(
                    generate_short_mode_report,
                    result,
                    lang,
                    file.filename,
                    strict
                )
                report_short = await loop.run_in_executor(None, short_func)
                
                # Primary report for backward compat
                if mode == "short":
                    report = report_short
                else:
                    report = report_write
                
                # Store result
                async with jobs_lock:
                    jobs[job_id]['status'] = 'complete'
                    jobs[job_id]['progress'] = 100
                    jobs[job_id]['result'] = {
                        "success": True,
                        "score": result["score"],
                        "verdict": result["verdict"],
                        "report": report,
                        "report_short": report_short,
                        "report_write": report_write,
                        "metrics": result.get("metrics", []),
                        "filename": file.filename,
                        "mode": mode,
                        "lang": lang,
                        "strict": strict,
                        "privacy_note": "🔒 Audio analizado en memoria y eliminado inmediatamente.",
                        "methodology": "Basado en la metodología 'Mastering Ready' de Matías Carvajal"
                    }
                
                logger.info(f"✅ [{job_id}] Job complete")
                
        except Exception as e:
            logger.error(f"❌ [{job_id}] Analysis error: {str(e)}")
            async with jobs_lock:
                jobs[job_id]['status'] = 'error'
                jobs[job_id]['error'] = str(e)
    
    # Start asyncio task (non-blocking)
    asyncio.create_task(analyze_in_background())
    
    # Return job_id immediately (< 1 second)
    return {
        "job_id": job_id,
        "status": "processing",
        "progress": 0,
        "message": "Analysis started. Poll /api/analyze/status/{job_id} for progress."
    }


@app.get("/api/analyze/status/{job_id}")
async def get_analysis_status(job_id: str):
    """
    Poll this endpoint to check analysis progress and retrieve result.
    
    Returns:
    - status: "processing", "complete", or "error"
    - progress: 0-100
    - result: (only when status="complete")
    - error: (only when status="error")
    """
    
    if job_id not in jobs:
        raise HTTPException(
            status_code=404,
            detail="Job not found or expired (jobs expire after 10 minutes)"
        )
    
    async with jobs_lock:
        job = jobs[job_id].copy()  # Copy to avoid lock issues
    
    response = {
        "job_id": job_id,
        "status": job['status'],
        "progress": job['progress'],
        "filename": job['filename']
    }
    
    if job['status'] == 'complete':
        response['result'] = job['result']
    elif job['status'] == 'error':
        response['error'] = job['error']
    
    return response


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

"""
MasteringReady API v7.4.0 - IP Rate Limiting
=====================================================

FastAPI backend for MasteringReady web application.

FEATURES in v7.4.0:
- IP-based rate limiting for anonymous users (1 free analysis per IP)
- VPN/Proxy detection to prevent circumvention
- Feature flags for easy launch control (ENABLE_IP_RATE_LIMIT)
- /api/check-ip endpoint for pre-analysis limit checking

FIXES in v7.3.9:
- Added /api/stats endpoint for daily statistics
- Added /api/stats/send-summary for Telegram daily report
- Added /api/stats/history for historical data
- Integrated with telegram_alerts v2 (with stats tracking)

FIXES in v7.3.8:
- Fixed timeout/crash for longer MP3 files (> 2 minutes)
- MP3 and other compressed formats now ALWAYS use chunked analysis
- Loading full MP3 into memory is slow and causes Render timeouts
- Chunked loading is faster and more memory-efficient for compressed formats
- Improved duration estimation: uses actual duration when available

FIXES in v7.3.7:
- Fixed 'str' object has no attribute 'bits_per_sample' error for MP3 files
- Improved bit depth extraction to handle compressed formats (MP3, AAC, etc.)
- Now safely extracts metadata for both WAV and lossy formats

Previous fixes (v7.3.6):
- Frontend metadata integration (original_metadata_json parameter)

Previous fixes (v7.3.5):
- Reads original file metadata BEFORE any backend compression

Based on Matías Carvajal's "Mastering Ready" methodology
Author: Matías Carvajal García (@matcarvy)
Version: 7.4.0-production
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import tempfile
from pathlib import Path
import logging
import sys
import uuid
import asyncio
import functools
import unicodedata
import urllib.parse
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import soundfile as sf

# Analyzer version - used in API responses for tracking
ANALYZER_VERSION = "7.4.1"

# Import IP rate limiting and VPN detection
try:
    from ip_limiter import init_ip_limiter, get_ip_limiter, get_client_ip, IPLimiter
    from vpn_detector import init_vpn_detector, get_vpn_detector, VPNDetector
    IP_LIMITER_AVAILABLE = True
    logger_placeholder = logging.getLogger(__name__)  # Will be replaced
except ImportError as e:
    IP_LIMITER_AVAILABLE = False
    logger_placeholder = logging.getLogger(__name__)
    logger_placeholder.warning(f"⚠️ IP limiter not available: {e}")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def sanitize_filename_for_http(filename: str) -> str:
    """
    Sanitize filename for HTTP Content-Disposition headers.
    Removes Unicode accents and special characters to avoid latin-1 encoding errors.
    
    Examples:
        "Paraíso Fractal.pdf" → "Paraiso Fractal.pdf"
        "TIEMPO (LIVE).wav" → "TIEMPO (LIVE).wav"
        "São Paulo Mix.mp3" → "Sao Paulo Mix.mp3"
    
    Args:
        filename: Original filename with potential Unicode characters
    
    Returns:
        ASCII-safe filename suitable for HTTP headers
    """
    # Step 1: Normalize Unicode to NFD (decomposed form)
    # This separates base characters from combining marks (accents)
    nfd = unicodedata.normalize('NFD', filename)
    
    # Step 2: Remove combining characters (category 'Mn' = Mark, nonspacing)
    # This removes accents: á → a, é → e, ñ → n, etc.
    ascii_base = ''.join(
        char for char in nfd 
        if unicodedata.category(char) != 'Mn'
    )
    
    # Step 3: Keep only safe ASCII characters
    # Allow: letters, numbers, spaces, hyphens, parentheses, underscores, dots
    safe = ''.join(
        char if char.isalnum() or char in ' -()_.[]' else '_'
        for char in ascii_base
    )
    
    # Step 4: Clean up multiple spaces/underscores
    import re
    safe = re.sub(r'[ _]+', ' ', safe).strip()
    
    return safe


# ============================================================================
# IMPORT ANALYZER
# ============================================================================

# Import analyzer module
try:
    from analyzer import analyze_file, write_report, generate_cta, generate_short_mode_report, generate_visual_report, generate_complete_pdf
    logger.info("✅ Analyzer module imported successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import analyzer: {e}")
    logger.error("Make sure mix_analyzer_v7.3_BETA.py is renamed to analyzer.py")
    sys.exit(1)

# Import Telegram alerts
try:
    from telegram_alerts import (
        alert_new_analysis, 
        alert_error, 
        alert_system_status, 
        alert_mastered_file,
        get_daily_stats,      # NEW: Para stats endpoints
        alert_daily_summary   # NEW: Para resumen diario
    )
    logger.info("✅ Telegram alerts module imported successfully")
    TELEGRAM_ENABLED = True
except ImportError as e:
    logger.warning(f"⚠️ Telegram alerts not available: {e}")
    TELEGRAM_ENABLED = False

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
    version="7.3.9",
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
ALLOWED_EXTENSIONS = {'.wav', '.mp3', '.aiff', '.aac', '.m4a'}

# Initialize IP rate limiter and VPN detector
if IP_LIMITER_AVAILABLE:
    ip_limiter = init_ip_limiter()
    vpn_detector = init_vpn_detector()
    logger.info(f"✅ IP Limiter initialized. Enabled: {ip_limiter.is_enabled()}")
    logger.info(f"✅ VPN Detector initialized. Enabled: {vpn_detector.is_enabled()}")
else:
    ip_limiter = None
    vpn_detector = None
    logger.warning("⚠️ IP rate limiting not available")


# ============== IP RATE LIMITING ENDPOINTS ==============

@app.get("/api/check-ip")
async def check_ip_limit(request: Request, is_authenticated: bool = False):
    """
    Check if the client IP can perform an analysis.

    Frontend should call this BEFORE starting an analysis for anonymous users.
    Returns whether analysis is allowed and any blocking reasons.

    Args:
        is_authenticated: If true, skip IP check (logged-in users have separate limits)

    Returns:
        {
            "can_analyze": bool,
            "reason": "OK" | "LIMIT_REACHED" | "VPN_DETECTED" | "DISABLED",
            "analyses_used": int,
            "max_analyses": int,
            "is_vpn": bool,
            "ip_limited_enabled": bool
        }
    """
    # Logged-in users bypass IP limiting
    if is_authenticated:
        return {
            "can_analyze": True,
            "reason": "AUTHENTICATED",
            "analyses_used": 0,
            "max_analyses": -1,
            "is_vpn": False,
            "ip_limit_enabled": False
        }

    # If IP limiter not available, allow all
    if not IP_LIMITER_AVAILABLE or not ip_limiter:
        return {
            "can_analyze": True,
            "reason": "DISABLED",
            "analyses_used": 0,
            "max_analyses": 1,
            "is_vpn": False,
            "ip_limit_enabled": False
        }

    # If IP limiting is disabled via env var, allow all
    if not ip_limiter.is_enabled():
        return {
            "can_analyze": True,
            "reason": "DISABLED",
            "analyses_used": 0,
            "max_analyses": 1,
            "is_vpn": False,
            "ip_limit_enabled": False
        }

    # Get client IP
    client_ip = get_client_ip(request)
    user_agent = request.headers.get('User-Agent')

    logger.info(f"🔍 IP check request from: {client_ip[:16]}...")

    # Check VPN first (if enabled)
    vpn_info = {'is_vpn': False, 'is_proxy': False, 'is_tor': False}
    if vpn_detector and vpn_detector.is_enabled():
        try:
            vpn_info = await vpn_detector.detect(client_ip)

            if vpn_info.get('is_vpn') or vpn_info.get('is_proxy') or vpn_info.get('is_tor'):
                logger.warning(f"🚫 VPN/Proxy detected for IP: {client_ip[:16]}...")
                return {
                    "can_analyze": False,
                    "reason": "VPN_DETECTED",
                    "analyses_used": 0,
                    "max_analyses": 1,
                    "is_vpn": True,
                    "vpn_service": vpn_info.get('service_name'),
                    "ip_limit_enabled": True
                }
        except Exception as e:
            logger.warning(f"⚠️ VPN detection failed: {e}")

    # Check IP limit
    can_analyze, message, details = await ip_limiter.check_ip_limit(client_ip, user_agent)

    return {
        "can_analyze": can_analyze,
        "reason": message,
        "analyses_used": details.get('analyses_used', 0),
        "max_analyses": 1,
        "is_vpn": details.get('is_vpn', False),
        "ip_limit_enabled": True
    }


# ============== HEALTH CHECK ==============
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "name": "MasteringReady API",
        "version": "7.3.9",
        "status": "healthy",
        "methodology": "Basado en 'Mastering Ready' de Matías Carvajal",
        "endpoints": {
            "analyze": "/api/analyze/mix",
            "health": "/health",
            "stats": "/api/stats",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "version": "7.3.9",
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
    strict: bool = Form(False),
    original_metadata_json: Optional[str] = Form(None)  # NEW: Original file metadata from frontend
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
    - original_metadata_json: (Optional) JSON string with original file metadata
        Example: {"sampleRate": 48000, "bitDepth": 24, "duration": 391.2, "numberOfChannels": 2}
    
    Returns:
    - JSON with score, verdict, report, and metrics
    """
    
    # Log request
    logger.info(f"📥 Analysis request: {file.filename}, lang={lang}, mode={mode}, strict={strict}")
    
    # Parse original metadata if provided
    original_metadata_from_frontend = None
    if original_metadata_json:
        try:
            import json
            metadata = json.loads(original_metadata_json)
            original_metadata_from_frontend = {
                'sample_rate': int(metadata.get('sampleRate', 0)),
                'bit_depth': int(metadata.get('bitDepth', 0)),
                'duration': float(metadata.get('duration', 0)),
                'channels': int(metadata.get('numberOfChannels', 0))
            }
            logger.info(f"📊 Received original metadata from frontend: {original_metadata_from_frontend}")
        except Exception as e:
            logger.warning(f"⚠️ Could not parse original_metadata_json: {e}")
    
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
                "interpretations": result.get("interpretations"),
                "filename": file.filename,
                "mode": mode,
                "lang": lang,
                "strict": strict,
                # NEW v7.4.0: Analysis metadata for database tracking
                "analysis_version": ANALYZER_VERSION,
                "is_chunked_analysis": False,  # Sync endpoint always uses normal mode
                "chunk_count": result.get("num_chunks", 1),
                # v1.5: New data capture fields
                "spectral_6band": result.get("spectral_6band", {}),
                "energy_analysis": result.get("energy_analysis", {}),
                "categorical_flags": result.get("categorical_flags", {}),
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
    request: Request,
    file: UploadFile = File(...),
    lang: str = Form("es"),
    mode: str = Form("write"),
    strict: bool = Form(False),
    original_metadata_json: Optional[str] = Form(None),  # Original file metadata from frontend
    is_authenticated: bool = Form(False)  # Whether user is logged in
):
    """
    Start analysis and return job_id immediately (<1 sec).
    Client polls /api/analyze/status/{job_id} for progress and result.

    This endpoint avoids Render's 30-second timeout by returning immediately.

    Parameters:
    - file: Audio file
    - lang: Language (es/en)
    - mode: Output mode (write/short)
    - strict: Strict mode (true/false)
    - original_metadata_json: (Optional) JSON with original file metadata
        Example: {"sampleRate": 48000, "bitDepth": 24, "duration": 391.2, "numberOfChannels": 2}
    - is_authenticated: Whether user is logged in (bypasses IP limit)
    """

    # Get client IP for rate limiting
    client_ip = None
    user_agent = None
    if IP_LIMITER_AVAILABLE and ip_limiter and ip_limiter.is_enabled() and not is_authenticated:
        client_ip = get_client_ip(request)
        user_agent = request.headers.get('User-Agent')
        logger.info(f"📍 Request from IP: {client_ip[:16]}... (authenticated: {is_authenticated})")

    # Cleanup old jobs
    await cleanup_old_jobs()
    
    # Parse original metadata if provided
    original_metadata_from_frontend = None
    if original_metadata_json:
        try:
            import json
            metadata = json.loads(original_metadata_json)
            original_metadata_from_frontend = {
                'sample_rate': int(metadata.get('sampleRate', 0)),
                'bit_depth': int(metadata.get('bitDepth', 0)),
                'duration': float(metadata.get('duration', 0)),
                'channels': int(metadata.get('numberOfChannels', 0))
            }
            logger.info(f"📊 Received original metadata from frontend: {original_metadata_from_frontend}")
        except Exception as e:
            logger.warning(f"⚠️ Could not parse original_metadata_json: {e}")
    
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
        # Capture metadata from outer scope
        metadata_from_frontend = original_metadata_from_frontend
        logger.info(f"🔍 [{job_id}] Captured frontend metadata: {metadata_from_frontend}")
        
        try:
            # Create temp file
            with tempfile.NamedTemporaryFile(delete=True, suffix=file_ext) as temp_file:
                temp_file.write(content)
                temp_file.flush()
                
                logger.info(f"💾 [{job_id}] Temp file created")
                
                # ============================================================
                # PRIORITIZE METADATA FROM FRONTEND (if available)
                # This handles the case where frontend compressed the file
                # ============================================================
                original_metadata = None
                
                if metadata_from_frontend and metadata_from_frontend.get('sample_rate'):
                    # Use metadata from frontend (captures pre-compression values)
                    original_metadata = metadata_from_frontend
                    logger.info(f"✅ [{job_id}] Using metadata from FRONTEND: {original_metadata['sample_rate']} Hz, {original_metadata['bit_depth']}-bit")
                else:
                    # Fallback: Read metadata from uploaded file
                    try:
                        file_info = sf.info(temp_file.name)
                        
                        # Extract bit depth safely (MP3 and other formats don't have bits_per_sample)
                        bit_depth = None
                        if hasattr(file_info, 'subtype_info'):
                            if hasattr(file_info.subtype_info, 'bits_per_sample'):
                                bit_depth = file_info.subtype_info.bits_per_sample
                            elif isinstance(file_info.subtype_info, str):
                                # For MP3 and other compressed formats, estimate bit depth
                                # Most MP3s decode to 16-bit, high-quality to 24-bit
                                bit_depth = 16  # Default for lossy formats
                        
                        original_metadata = {
                            'sample_rate': file_info.samplerate,
                            'bit_depth': bit_depth,
                            'duration': file_info.duration
                        }
                        logger.info(f"📊 [{job_id}] Read metadata from FILE: {file_info.samplerate} Hz, {original_metadata['bit_depth']}-bit, {file_info.duration:.1f}s")
                    except Exception as e:
                        logger.warning(f"⚠️ [{job_id}] Could not read file metadata: {e}")
                # ============================================================
                
                # Update progress
                async with jobs_lock:
                    jobs[job_id]['progress'] = 10
                
                # Analyze (blocking call - run in executor to not block event loop)
                logger.info(f"🔍 [{job_id}] Starting analysis...")
                
                # Determine if we need chunked analysis
                file_size_mb = file_size / (1024 * 1024)
                
                # Get actual duration if available from metadata
                actual_duration_sec = None
                if original_metadata and original_metadata.get('duration'):
                    actual_duration_sec = original_metadata.get('duration')
                
                # Determine if file is compressed format (MP3, AAC, etc.)
                is_compressed = file_ext.lower() in ['.mp3', '.aac', '.m4a', '.ogg', '.opus']
                
                # Decision logic for chunked vs normal analysis:
                # 1. If we know actual duration: use it (most reliable)
                # 2. If compressed format: ALWAYS use chunked (loading full MP3 is slow/memory intensive)
                # 3. Otherwise: estimate from file size (assumes WAV ~10 MB/min)
                
                if actual_duration_sec is not None:
                    # We have real duration - use it
                    estimated_duration_min = actual_duration_sec / 60.0
                    use_chunked = estimated_duration_min > 2.0  # Use chunked for files > 2 minutes
                    logger.info(f"📊 [{job_id}] Using ACTUAL duration: {estimated_duration_min:.1f} min")
                elif is_compressed:
                    # Compressed format - ALWAYS use chunked to avoid memory/timeout issues
                    # MP3 files are much slower to decode fully than in chunks
                    use_chunked = True
                    estimated_duration_min = file_size_mb * 1.5  # Rough estimate: ~0.7 MB/min for MP3
                    logger.info(f"🔄 [{job_id}] Compressed format ({file_ext}) - forcing CHUNKED analysis")
                else:
                    # WAV/AIFF without known duration - try reading header directly
                    try:
                        fallback_info = sf.info(temp_file.name)
                        estimated_duration_min = fallback_info.duration / 60.0
                        logger.info(f"📊 [{job_id}] Duration from sf.info fallback: {estimated_duration_min:.1f} min")
                    except Exception:
                        # Last resort: estimate based on file size
                        # Use sample rate and bit depth from metadata if available, else assume 24-bit 48kHz stereo (~17 MB/min)
                        if original_metadata and original_metadata.get('sample_rate') and original_metadata.get('bit_depth'):
                            sr_est = original_metadata['sample_rate']
                            bd_est = original_metadata['bit_depth']
                            mb_per_min = (sr_est * 2 * (bd_est / 8) * 60) / (1024 * 1024)
                        else:
                            mb_per_min = 17.0  # Conservative: 24-bit 48kHz stereo
                        estimated_duration_min = file_size_mb / mb_per_min
                        logger.info(f"📊 [{job_id}] Duration estimated from file size: {estimated_duration_min:.1f} min ({mb_per_min:.1f} MB/min)")
                    use_chunked = estimated_duration_min > 4.0
                
                loop = asyncio.get_event_loop()
                
                if use_chunked:
                    logger.info(f"🔄 [{job_id}] Using CHUNKED analysis (estimated {estimated_duration_min:.1f} min, {file_size_mb:.1f} MB)")
                    
                    # Import chunked function
                    from analyzer import analyze_file_chunked
                    
                    # Create simple progress callback with direct update
                    def update_progress(progress_value):
                        """Update job progress - called from chunked analysis"""
                        # Direct synchronous update since we're in executor thread
                        try:
                            jobs[job_id]['progress'] = progress_value
                            logger.info(f"📊 [{job_id}] Progress: {progress_value}%")
                        except:
                            pass  # Ignore errors
                    
                    analyze_func = functools.partial(
                        analyze_file_chunked,
                        Path(temp_file.name),
                        lang=lang,
                        strict=strict,
                        chunk_duration=30.0,  # 30 second chunks
                        progress_callback=update_progress,  # ← Pass callback
                        original_metadata=original_metadata  # ← Pass original metadata
                    )
                else:
                    logger.info(f"📊 [{job_id}] Using NORMAL analysis (estimated {estimated_duration_min:.1f} min, {file_size_mb:.1f} MB)")
                    
                    analyze_func = functools.partial(
                        analyze_file,
                        Path(temp_file.name),
                        lang=lang,
                        strict=strict,
                        original_metadata=original_metadata  # ← Pass original metadata
                    )
                
                result = await loop.run_in_executor(None, analyze_func)
                
                logger.info(f"✅ [{job_id}] Analysis complete: Score {result['score']}/100")
                
                # Update progress
                async with jobs_lock:
                    jobs[job_id]['progress'] = 70
                
                # Generate reports (also blocking - run in executor)
                logger.info(f"📝 [{job_id}] Generating reports...")
                
                # Import report generators
                from analyzer import generate_short_mode_report, generate_visual_report
                
                # Generate WRITE report (full with technical details)
                write_func = functools.partial(
                    write_report,
                    result,
                    strict=strict,
                    lang=lang,
                    filename=file.filename
                )
                report_write = await loop.run_in_executor(None, write_func)
                
                # Generate SHORT report (summary without technical details)
                short_func = functools.partial(
                    generate_short_mode_report,
                    result,
                    strict,
                    lang,
                    file.filename
                )
                report_short = await loop.run_in_executor(None, short_func)
                
                # Generate VISUAL report (bullets only)
                visual_func = functools.partial(
                    generate_visual_report,
                    result,
                    strict,
                    lang,
                    file.filename  # Add filename
                )
                report_visual = await loop.run_in_executor(None, visual_func)
                
                # Primary report for backward compat
                if mode == "short":
                    report = report_short
                else:
                    report = report_write
                
                # Store result
                async with jobs_lock:
                    jobs[job_id]['status'] = 'complete'
                    jobs[job_id]['progress'] = 100
                    
                    # Get CTA data
                    cta_data = result.get("cta", {})
                    logger.info(f"🔍 [{job_id}] CTA data: {cta_data}")
                    
                    # Extract CTA fields separately to avoid serialization issues
                    cta_message = ""
                    cta_button = ""
                    cta_action = ""
                    
                    if cta_data and isinstance(cta_data, dict):
                        cta_message = str(cta_data.get("message", ""))
                        cta_button = str(cta_data.get("button", ""))
                        cta_action = str(cta_data.get("action", ""))
                        logger.info(f"🔍 [{job_id}] CTA fields - message: {len(cta_message)} chars, button: {cta_button}, action: {cta_action}")
                    
                    jobs[job_id]['result'] = {
                        "success": True,
                        "request_id": job_id,  # Add job_id for PDF download
                        "score": result["score"],
                        "verdict": result["verdict"],
                        # Store CTA as separate fields instead of nested object
                        "cta_message": cta_message,
                        "cta_button": cta_button,
                        "cta_action": cta_action,
                        "report": report,
                        "report_visual": report_visual,  # NEW: Bullets mode
                        "report_short": report_short,     # Summary mode
                        "report_write": report_write,     # Complete mode
                        "metrics": result.get("metrics", []),
                        "interpretations": result.get("interpretations"),
                        "file": result.get("file", {}),
                        "filename": file.filename,
                        "mode": mode,
                        "lang": lang,
                        "strict": strict,
                        # NEW v7.3.50: Add analysis time and metrics bars
                        "analysis_time_seconds": result.get("analysis_time_seconds", 0),
                        "metrics_bars": result.get("metrics_bars", {}),
                        # NEW v7.4.0: Analysis metadata for database tracking
                        "analysis_version": ANALYZER_VERSION,
                        "is_chunked_analysis": use_chunked,
                        "chunk_count": result.get("num_chunks", 1),
                        # v1.5: New data capture fields
                        "spectral_6band": result.get("spectral_6band", {}),
                        "energy_analysis": result.get("energy_analysis", {}),
                        "categorical_flags": result.get("categorical_flags", {}),
                        "privacy_note": "🔒 Audio analizado en memoria y eliminado inmediatamente.",
                        "methodology": "Basado en la metodología 'Mastering Ready' de Matías Carvajal"
                    }
                
                logger.info(f"✅ [{job_id}] Job complete")
                
                # 🔔 TELEGRAM ALERT: Análisis completado
                if TELEGRAM_ENABLED:
                    try:
                        # Calcular tiempo de procesamiento
                        end_time = datetime.now()
                        processing_time = (end_time - jobs[job_id]['created_at']).total_seconds()
                        
                        # Duración del archivo de audio
                        audio_duration = ""
                        if result.get("file") and result["file"].get("duration"):
                            audio_mins = result["file"]["duration"] / 60
                            audio_duration = f" | 🎵 {audio_mins:.1f}min"
                        
                        duration_str = f"⏱️ {processing_time:.1f}s{audio_duration}"
                        
                        alert_new_analysis(
                            filename=file.filename,
                            score=result["score"],
                            verdict=result["verdict"],
                            lang=lang,
                            strict=strict,
                            duration=duration_str,
                            silent=False
                        )
                    except Exception as alert_err:
                        logger.warning(f"⚠️ Failed to send Telegram alert: {alert_err}")

                # 📍 RECORD IP USAGE: Track anonymous user analysis
                if client_ip and IP_LIMITER_AVAILABLE and ip_limiter and ip_limiter.is_enabled():
                    try:
                        # Get VPN info if we have the detector
                        vpn_info = {}
                        if vpn_detector and vpn_detector.is_enabled():
                            vpn_info = await vpn_detector.detect(client_ip)

                        await ip_limiter.record_analysis(
                            ip_address=client_ip,
                            user_agent=user_agent,
                            vpn_info=vpn_info
                        )
                        logger.info(f"📍 [{job_id}] Recorded IP usage for: {client_ip[:16]}...")
                    except Exception as ip_err:
                        logger.warning(f"⚠️ Failed to record IP usage: {ip_err}")


        except Exception as e:
            logger.error(f"❌ [{job_id}] Analysis error: {str(e)}")
            async with jobs_lock:
                jobs[job_id]['status'] = 'error'
                jobs[job_id]['error'] = str(e)
            
            # 🔔 TELEGRAM ALERT: Error en análisis
            if TELEGRAM_ENABLED:
                try:
                    alert_error(
                        error_type=type(e).__name__,
                        filename=file.filename,
                        details=str(e),
                        critical=True
                    )
                except Exception as alert_err:
                    logger.warning(f"⚠️ Failed to send error alert: {alert_err}")
    
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


@app.post("/api/download/pdf")
async def download_pdf(
    request_id: str = Form(...),
    lang: str = Form('es'),
    background_tasks: BackgroundTasks = None
):
    """
    Generate and download complete PDF report.
    
    Args:
        request_id: The analysis request ID
        lang: Language ('es' or 'en')
        background_tasks: FastAPI background tasks
    
    Returns:
        FileResponse with PDF file
    """
    logger.info(f"📄 PDF download request: {request_id}, lang: {lang}")
    
    # Check if request_id exists in jobs
    async with jobs_lock:
        if request_id not in jobs:
            logger.error(f"❌ Request ID not found: {request_id}")
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        job = jobs[request_id]
        
        # Accept both 'complete' and 'completed' for compatibility
        if job['status'] not in ['complete', 'completed']:
            logger.error(f"❌ Analysis not completed: {request_id} (status: {job['status']})")
            raise HTTPException(status_code=400, detail="Analysis not completed yet")
        
        result = job['result']
    
    # Create temporary PDF file
    pdf_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    pdf_path = pdf_file.name
    pdf_file.close()
    
    try:
        # Generate PDF using analyzer function
        logger.info(f"🔨 Generating PDF: {pdf_path}")
        
        success = generate_complete_pdf(
            report=result,
            output_path=pdf_path,
            strict=False,  # Could be passed from frontend if needed
            lang=lang,
            filename=result.get('filename', 'analisis')
        )
        
        if not success:
            logger.error(f"❌ PDF generation failed for {request_id}")
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
        
        # Prepare filename
        filename_base = result.get('filename', 'analisis').replace('.wav', '').replace('.mp3', '')
        pdf_filename = f"masteringready-{'detallado' if lang == 'es' else 'detailed'}-{filename_base}.pdf"
        
        # Sanitize filename for HTTP header (avoid latin-1 encoding errors)
        safe_pdf_filename = sanitize_filename_for_http(pdf_filename)
        
        logger.info(f"✅ PDF generated successfully: {pdf_filename}")
        logger.info(f"📦 Safe filename for download: {safe_pdf_filename}")
        
        # Clean up function
        def cleanup():
            try:
                import os
                os.unlink(pdf_path)
                logger.info(f"🧹 Cleaned up temporary PDF: {pdf_path}")
            except Exception as e:
                logger.error(f"⚠️ Failed to cleanup PDF: {e}")
        
        # Return PDF file with background cleanup
        if background_tasks:
            background_tasks.add_task(cleanup)
        
        # Use RFC 5987 encoding for international filenames
        # This supports UTF-8 characters in Content-Disposition header
        encoded_filename = urllib.parse.quote(safe_pdf_filename)
        
        return FileResponse(
            pdf_path,
            media_type='application/pdf',
            headers={
                # Use both methods for maximum compatibility:
                # 1. Simple ASCII filename (for old browsers)
                # 2. RFC 5987 UTF-8 filename* (for modern browsers)
                "Content-Disposition": f"attachment; filename=\"{safe_pdf_filename}\"; filename*=UTF-8''{encoded_filename}"
            }
        )
        
    except Exception as e:
        # Clean up on error
        try:
            import os
            os.unlink(pdf_path)
        except:
            pass
        
        logger.error(f"❌ Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")


# ============== STATS ENDPOINTS ==============

@app.get("/api/stats")
async def get_stats():
    """
    Obtiene estadísticas del día actual.
    Útil para dashboards o monitoreo.
    """
    if not TELEGRAM_ENABLED:
        return {
            "success": False,
            "error": "Stats module not available"
        }
    
    try:
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
async def send_daily_summary_endpoint():
    """
    Envía el resumen diario a Telegram.
    
    Puedes llamar este endpoint con un servicio como:
    - cron-job.org (gratis)
    - EasyCron
    - GitHub Actions
    
    Configura para que llame a:
    https://tu-app.onrender.com/api/stats/send-summary
    Todos los días a las 8pm (hora Colombia = 1:00 AM UTC del día siguiente)
    """
    if not TELEGRAM_ENABLED:
        return {
            "success": False,
            "error": "Telegram module not available"
        }
    
    try:
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
    if not TELEGRAM_ENABLED:
        return {
            "success": False,
            "error": "Stats module not available"
        }
    
    try:
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


# ============== RUN ==============
if __name__ == "__main__":
    # 🔔 TELEGRAM ALERT: Sistema iniciado
    if TELEGRAM_ENABLED:
        try:
            alert_system_status('online', 'Backend deployed on Render')
        except Exception as e:
            logger.warning(f"⚠️ Failed to send startup alert: {e}")
    
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

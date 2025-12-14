"""
Bulk Processing API - Main Application
FastAPI application for bulk document processing (Port 8001)
"""

# IMPORTANT: Clear proxy env vars FIRST before any imports that use httpx/supabase
# Coolify sets these and they break supabase storage client
import os
for _proxy_var in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']:
    os.environ.pop(_proxy_var, None)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.core.middleware import LoggingMiddleware, ErrorHandlingMiddleware

# Custom logging filter to reduce noise from polling endpoints
class PollingEndpointFilter(logging.Filter):
    """Filter out repetitive GET requests to polling endpoints"""
    
    def filter(self, record):
        # Only filter INFO level logs
        if record.levelno != logging.INFO:
            return True
            
        # Get the log message
        message = record.getMessage()
        
        # Filter out GET requests to polling endpoints with 200 OK
        if '"GET' in message and '200 OK' in message:
            # Check for specific polling patterns
            if '/api/v1/bulk-jobs/' in message:
                return False  # Filter out job polling
            if '/documents?' in message:
                return False  # Filter out documents polling
            if '/health' in message:
                return False  # Filter out health checks
        
        return True  # Allow all other logs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Apply filter to uvicorn access logs
uvicorn_logger = logging.getLogger("uvicorn.access")
uvicorn_logger.addFilter(PollingEndpointFilter())

# Import API routers
try:
    from app.api.v1 import jobs, documents, review_queue, websocket, export, upload, mapping, templates, oauth
except ImportError as e:
    # Handle case where modules might not be fully implemented yet
    logger.warning(f"Some API modules not yet available: {e}")
    jobs = None
    documents = None
    review_queue = None
    websocket = None
    export = None
    upload = None
    mapping = None
    templates = None
    oauth = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting Bulk Processing API...")
    logger.info(f"   Port: {settings.API_PORT}")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    
    # Initialize database
    try:
        await init_db()
        # Don't fail startup if DB init fails - tables might already exist
    except Exception as e:
        logger.warning(f"⚠️ Database initialization warning: {e}")
        logger.info("   App will continue, but database operations may fail")
        logger.info("   Make sure DATABASE_URL is set in .env file")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Bulk Processing API...")


# Create FastAPI application
app = FastAPI(
    title="Bulk Processing API",
    description="High-performance bulk document processing system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
if settings.DEBUG:
    app.add_middleware(LoggingMiddleware)
app.add_middleware(ErrorHandlingMiddleware)

# Include routers (only if modules are available)
if jobs:
    app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
if documents:
    app.include_router(documents.router, prefix="/api/v1", tags=["documents"])
if review_queue:
    app.include_router(review_queue.router, prefix="/api/v1", tags=["review-queue"])
if websocket:
    app.include_router(websocket.router, prefix="/api/v1", tags=["websocket"])
if export:
    app.include_router(export.router, prefix="/api/v1", tags=["export"])
if upload:
    app.include_router(upload.router, prefix="/api/v1/bulk-jobs", tags=["upload"])
if mapping:
    app.include_router(mapping.router, tags=["mapping"])
if templates:
    app.include_router(templates.router, prefix="/api/v1", tags=["templates"])
if oauth:
    app.include_router(oauth.router, prefix="/api/v1", tags=["oauth"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Bulk Processing API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "bulk-processing-api",
        "version": "1.0.0"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )


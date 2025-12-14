"""
Database connection and session management
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import NullPool
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Validate DATABASE_URL (required - no fallback)
if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Convert postgresql:// to postgresql+asyncpg:// for async support
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
elif database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://")

# Create async engine for pgbouncer Transaction Pooler (port 6543)
# NullPool = no client-side pooling, let pgbouncer handle it (supports thousands of connections)
engine = create_async_engine(
    database_url,
    echo=settings.DEBUG,
    future=True,
    poolclass=NullPool,  # No client-side pooling - pgbouncer handles it
    connect_args={
        "statement_cache_size": 0,  # CRITICAL: Disable prepared statements for pgbouncer
        "command_timeout": 60,
        "server_settings": {
            "application_name": "bulk-api",
            "jit": "off",  # Disable JIT for faster short queries
        }
    }
)

# Create sync engine for Celery workers - Transaction Pooler
sync_database_url = database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
sync_engine = create_engine(
    sync_database_url,
    echo=settings.DEBUG,
    poolclass=NullPool,  # No client-side pooling
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Create sync session factory for Celery
SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)

# Base class for models
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_sync_db() -> Session:
    """Get synchronous database session for Celery workers"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def init_db():
    """Initialize database (create tables if needed)"""
    try:
        # Check if DATABASE_URL is set
        if not settings.DATABASE_URL:
            logger.warning("⚠️ DATABASE_URL not set. Skipping database initialization.")
            logger.warning("   Tables should already exist in Supabase (from schema.sql)")
            return
        
        # Import all models to register them
        from app.models import database  # noqa
        
        # Create tables (if they don't exist)
        # Note: In production, tables should be created via migrations
        # This is just for development convenience
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Database tables created/verified")
        except Exception as e:
            # If connection fails, that's OK - tables might already exist in Supabase
            logger.warning(f"⚠️ Could not verify/create tables: {e}")
            logger.info("   This is OK if tables already exist in Supabase")
    except Exception as e:
        logger.error(f"❌ Database initialization error: {e}")
        # Don't raise - allow app to start even if DB connection fails
        # This allows API to start and show proper error messages


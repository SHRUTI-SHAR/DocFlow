"""
Test database connection and basic queries
"""

import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal, init_db
from app.models.database import BulkJob
from sqlalchemy import select
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_environment():
    """Check if required environment variables are set"""
    if not settings.DATABASE_URL:
        logger.error("❌ DATABASE_URL not set in environment")
        logger.error("   Please create a .env file with DATABASE_URL")
        logger.error("   Example: DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname")
        return False
    logger.info("✅ Environment variables configured")
    return True


async def test_database_connection():
    """Test database connection"""
    try:
        logger.info("🔌 Testing database connection...")
        
        # Test connection
        async with engine.begin() as conn:
            result = await conn.execute(select(1))
            value = result.scalar()
            assert value == 1
            logger.info("✅ Database connection successful")
        
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False


async def test_table_creation():
    """Test that tables exist"""
    try:
        logger.info("📋 Testing table creation...")
        
        # Try to query bulk_jobs table
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(BulkJob).limit(1))
            jobs = result.scalars().all()
            logger.info(f"✅ Tables exist. Found {len(jobs)} jobs in database")
        
        return True
    except Exception as e:
        logger.error(f"❌ Table query failed: {e}")
        return False


async def test_crud_operations():
    """Test basic CRUD operations"""
    try:
        logger.info("✏️ Testing CRUD operations...")
        
        async with AsyncSessionLocal() as session:
            # Create
            test_job = BulkJob(
                name="Test Job",
                source_type="folder",
                source_config={"path": "/test"},
                processing_config={"mode": "once", "discovery_batch_size": 10},
                processing_options={"priority": 3},
                status="pending"
            )
            session.add(test_job)
            await session.commit()
            await session.refresh(test_job)
            job_id = test_job.id
            logger.info(f"✅ Created test job: {job_id}")
            
            # Read
            result = await session.execute(
                select(BulkJob).where(BulkJob.id == job_id)
            )
            job = result.scalar_one()
            assert job.name == "Test Job"
            logger.info(f"✅ Read test job: {job.name}")
            
            # Update
            job.name = "Updated Test Job"
            await session.commit()
            await session.refresh(job)
            assert job.name == "Updated Test Job"
            logger.info(f"✅ Updated test job: {job.name}")
            
            # Delete
            await session.delete(job)
            await session.commit()
            logger.info(f"✅ Deleted test job: {job_id}")
        
        return True
    except Exception as e:
        logger.error(f"❌ CRUD operations failed: {e}")
        return False


async def main():
    """Run all database tests"""
    logger.info("🧪 Starting database tests...\n")
    
    # Check environment first
    if not check_environment():
        logger.error("\n❌ Environment check failed. Cannot run tests.")
        logger.error("   Please configure DATABASE_URL in .env file")
        return 1
    
    results = []
    
    # Test 1: Connection
    results.append(await test_database_connection())
    
    # Test 2: Table creation
    results.append(await test_table_creation())
    
    # Test 3: CRUD operations
    results.append(await test_crud_operations())
    
    # Summary
    logger.info("\n" + "="*50)
    if all(results):
        logger.info("✅ All database tests passed!")
        return 0
    else:
        logger.error("❌ Some database tests failed!")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)


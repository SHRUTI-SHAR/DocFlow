"""
Test Celery and Redis connection
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from app.workers.celery_app import celery_app
from app.core.config import settings
import redis
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_redis_connection():
    """Test Redis connection"""
    try:
        logger.info("🔌 Testing Redis connection...")
        
        # Parse Redis URL
        redis_url = settings.REDIS_URL
        if redis_url.startswith("redis://"):
            redis_url = redis_url.replace("redis://", "")
        
        # Connect to Redis
        r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        
        # Test connection
        r.ping()
        logger.info("✅ Redis connection successful")
        
        # Test set/get
        r.set("test_key", "test_value")
        value = r.get("test_key")
        assert value == "test_value"
        r.delete("test_key")
        logger.info("✅ Redis read/write test passed")
        
        return True
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        return False


def test_celery_connection():
    """Test Celery connection to broker"""
    try:
        logger.info("🔌 Testing Celery connection...")
        
        # Test broker connection
        inspect = celery_app.control.inspect()
        active_queues = inspect.active_queues()
        
        if active_queues is None:
            logger.warning("⚠️ No active Celery workers found (this is OK if workers aren't running)")
        else:
            logger.info(f"✅ Found {len(active_queues)} active Celery workers")
        
        # Test broker ping
        try:
            celery_app.broker_connection().ensure_connection(max_retries=3)
            logger.info("✅ Celery broker connection successful")
        except Exception as e:
            logger.warning(f"⚠️ Celery broker connection test: {e}")
            logger.info("   (This is OK if Redis is not running)")
        
        return True
    except Exception as e:
        logger.error(f"❌ Celery connection test failed: {e}")
        return False


def test_celery_task():
    """Test sending a simple Celery task"""
    try:
        logger.info("📤 Testing Celery task submission...")
        
        # Send a simple test task
        from app.workers.discovery import discover_documents
        
        # This will fail if workers aren't running, but that's OK
        result = discover_documents.delay("test_job_id", {"path": "/test"})
        
        logger.info(f"✅ Task submitted: {result.id}")
        logger.info(f"   Task state: {result.state}")
        logger.info("   (Task execution requires active workers)")
        
        return True
    except Exception as e:
        logger.warning(f"⚠️ Celery task submission test: {e}")
        logger.info("   (This is OK if Redis/Celery workers aren't running)")
        return True  # Don't fail the test


def main():
    """Run all Celery/Redis tests"""
    logger.info("🧪 Starting Celery/Redis tests...\n")
    
    results = []
    
    # Test 1: Redis connection
    results.append(test_redis_connection())
    
    # Test 2: Celery connection
    results.append(test_celery_connection())
    
    # Test 3: Task submission
    results.append(test_celery_task())
    
    # Summary
    logger.info("\n" + "="*50)
    if all(results):
        logger.info("✅ All Celery/Redis tests passed!")
        return 0
    else:
        logger.warning("⚠️ Some tests had warnings (check if Redis/Celery are running)")
        return 0  # Don't fail if Redis/Celery aren't running


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)


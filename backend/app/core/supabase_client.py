import os
import logging
from supabase import create_client, Client
from typing import Optional

logger = logging.getLogger(__name__)

# Check if supabase is available
try:
    import supabase
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    logger.warning("Supabase package not available")

def get_supabase_client() -> Optional[Client]:
    """Get initialized Supabase client"""
    if not SUPABASE_AVAILABLE:
        logger.warning("Supabase not available")
        return None

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        logger.warning("Supabase credentials not found in environment variables")
        return None

    try:
        # Try to create client with minimal parameters to avoid proxy issues
        supabase = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase client initialized successfully")
        return supabase
    except TypeError as e:
        if 'proxy' in str(e):
            logger.warning("Supabase client proxy parameter issue, trying alternative initialization")
            # Try without any additional parameters
            supabase = create_client(supabase_url, supabase_key)
            return supabase
        else:
            logger.error(f"Failed to initialize Supabase client: {e}")
            return None
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None
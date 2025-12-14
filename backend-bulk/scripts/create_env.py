"""
Helper script to create .env file from .env.example
"""

import shutil
import sys
from pathlib import Path

# Fix Windows console encoding for emoji characters
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def create_env_file():
    """Create .env file from .env.example if it doesn't exist"""
    base_dir = Path(__file__).parent.parent
    env_example = base_dir / ".env.example"
    env_file = base_dir / ".env"
    
    if env_file.exists():
        print("[OK] .env file already exists")
        print(f"   Location: {env_file}")
        return True
    
    if not env_example.exists():
        print("[ERROR] .env.example file not found")
        print(f"   Expected at: {env_example}")
        return False
    
    # Copy .env.example to .env
    try:
        shutil.copy(env_example, env_file)
        print("[OK] Created .env file from .env.example")
        print(f"   Location: {env_file}")
        print()
        print("[IMPORTANT] Please edit .env file and configure:")
        print("   1. DATABASE_URL (REQUIRED)")
        print("      - Get from Supabase: Project Settings -> Database")
        print("      - Format: postgresql+asyncpg://postgres:password@host:5432/dbname")
        print("   2. REDIS_URL (optional, defaults to redis://localhost:6379/0)")
        print("   3. LITELLM_API_KEY (if using LLM features)")
        print()
        print("   See ENV_SETUP.md for detailed instructions")
        return True
    except Exception as e:
        print(f"[ERROR] Error creating .env file: {e}")
        return False

if __name__ == "__main__":
    create_env_file()


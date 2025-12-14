"""
Development Setup Script
Helps set up the development environment
"""

import os
import sys
from pathlib import Path

def check_env_file():
    """Check if .env file exists"""
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        print("✅ .env file exists")
        return True
    else:
        print("❌ .env file not found")
        print("   Run: python scripts/create_env.py")
        print("   Or manually: cp .env.example .env")
        return False


def check_requirements():
    """Check if requirements are installed"""
    try:
        import fastapi
        import celery
        import redis
        import sqlalchemy
        print("✅ Core dependencies installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e.name}")
        print("   Run: pip install -r requirements.txt")
        return False


def check_database_url():
    """Check if DATABASE_URL is configured"""
    from app.core.config import settings
    if settings.DATABASE_URL:
        print("✅ DATABASE_URL configured")
        return True
    else:
        print("❌ DATABASE_URL not configured")
        print("   Please set DATABASE_URL in .env file")
        return False


def main():
    """Run setup checks"""
    print("="*60)
    print("🔧 DEVELOPMENT SETUP CHECK")
    print("="*60)
    print()
    
    checks = []
    checks.append(("Environment File", check_env_file()))
    checks.append(("Dependencies", check_requirements()))
    checks.append(("Database URL", check_database_url()))
    
    print()
    print("="*60)
    print("📋 SUMMARY")
    print("="*60)
    
    all_passed = all(result for _, result in checks)
    
    for name, result in checks:
        status = "✅" if result else "❌"
        print(f"{status} {name}")
    
    print()
    if all_passed:
        print("✅ Setup complete! You can now run the application.")
        print()
        print("To start the API:")
        print("  uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload")
        print()
        print("To start Celery workers:")
        print("  celery -A app.workers.celery_app worker --loglevel=info")
    else:
        print("❌ Setup incomplete. Please fix the issues above.")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())


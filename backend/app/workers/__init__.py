"""
Workers module for Celery task execution
"""

from .celery_app import celery_app

__all__ = ['celery_app']

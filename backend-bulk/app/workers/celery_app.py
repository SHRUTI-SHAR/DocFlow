"""
Celery Application Configuration
"""

from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    'bulk_processing',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['app.workers.discovery', 'app.workers.processing', 'app.workers.retry']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task routing - Disabled for now, use default queue
    # task_routes={
    #     'app.workers.discovery.*': {'queue': 'discovery'},
    #     'app.workers.processing.*': {'queue': 'processing'},
    #     'app.workers.retry.*': {'queue': 'retry'},
    # },
    
    # Worker configuration
    task_acks_late=True,
    worker_prefetch_multiplier=2,  # Prefetch 2 tasks per worker
    worker_max_tasks_per_child=settings.CELERY_WORKER_MAX_TASKS_PER_CHILD,
    worker_concurrency=50,  # 50 concurrent worker processes for parallel PDF processing
    task_time_limit=1800,  # 30 minutes max per document
    task_soft_time_limit=1500,  # 25 minutes soft limit
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={
        'master_name': 'mymaster',
        'visibility_timeout': 3600,
    },
)

# Optional: Configure periodic tasks (for continuous processing mode)
celery_app.conf.beat_schedule = {
    # Database connection keep-alive (prevents 30-min session pooler timeout)
    'db-heartbeat': {
        'task': 'app.workers.celery_app.db_heartbeat',
        'schedule': 900.0,  # Run every 15 minutes
    },
    # 'discover-new-documents': {
    #     'task': 'app.workers.discovery.periodic_discovery',
    #     'schedule': 60.0,  # Run every 60 seconds
    # },
}


@celery_app.task(name='app.workers.celery_app.db_heartbeat')
def db_heartbeat():
    """Simple heartbeat to keep database connection alive"""
    from app.core.database import SessionLocal
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return "OK"
    except Exception as e:
        return f"Error: {e}"


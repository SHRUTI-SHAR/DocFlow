@echo off
REM Start Celery Worker for Windows
REM Uses 'solo' pool instead of 'prefork' (Windows compatibility)

echo Starting Celery Worker (Windows compatible)...
echo Using 'solo' pool for Windows compatibility
echo.

REM Activate conda environment
call conda activate env

REM Start worker with solo pool (Windows compatible)
celery -A app.workers.celery_app worker --loglevel=info --pool=solo -Q discovery,processing,retry,celery


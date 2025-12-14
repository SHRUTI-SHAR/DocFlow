"""
Notification Service - Publishes real-time events via Redis pub/sub
Used by workers to send WebSocket updates to frontend
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import redis.asyncio as redis

from ..core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Publishes processing events to Redis pub/sub
    WebSocket endpoint subscribes to these channels and forwards to clients
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._initialized = False
        logger.info("📢 NotificationService initialized")
    
    async def initialize(self):
        """Initialize Redis connection"""
        if self._initialized:
            return
        
        try:
            self.redis_client = await redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            self._initialized = True
            logger.info("✅ NotificationService connected to Redis")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            raise
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            self._initialized = False
    
    async def publish_event(self, job_id: str, event_type: str, data: Dict[str, Any]):
        """Publish event to Redis channel for a job"""
        if not self._initialized:
            await self.initialize()
        
        event_data = {
            "type": event_type,
            "job_id": job_id,
            "timestamp": datetime.utcnow().isoformat(),
            **data
        }
        
        try:
            channel = f"job:{job_id}:updates"
            await self.redis_client.publish(channel, json.dumps(event_data))
            logger.debug(f"📤 Published {event_type} to {channel}")
        except Exception as e:
            logger.error(f"❌ Failed to publish event: {e}")
    
    async def notify_document_started(self, job_id: str, document_id: str, document_name: str, total_pages: int):
        """Notify that document processing has started"""
        await self.publish_event(job_id, "document_started", {
            "document_id": document_id,
            "document_name": document_name,
            "total_pages": total_pages,
            "message": f"Processing {document_name}..."
        })
    
    async def notify_field_extracted(self, job_id: str, document_id: str, field_name: str, field_value: Any, confidence: float, page: int):
        """Notify that a field was extracted"""
        await self.publish_event(job_id, "field_extracted", {
            "document_id": document_id,
            "field_name": field_name,
            "field_value": str(field_value),
            "confidence": confidence,
            "page": page
        })
    
    async def notify_document_completed(self, job_id: str, document_id: str, document_name: str, fields_extracted: int, processing_time_ms: int):
        """Notify that document processing completed"""
        await self.publish_event(job_id, "document_completed", {
            "document_id": document_id,
            "document_name": document_name,
            "fields_extracted": fields_extracted,
            "processing_time_ms": processing_time_ms,
            "message": f"✅ {document_name} completed ({fields_extracted} fields in {processing_time_ms}ms)"
        })
    
    async def notify_document_failed(self, job_id: str, document_id: str, document_name: str, error: str):
        """Notify that document processing failed"""
        await self.publish_event(job_id, "document_failed", {
            "document_id": document_id,
            "document_name": document_name,
            "error": error,
            "message": f"❌ {document_name} failed: {error}"
        })


# Singleton instance
_notification_service: Optional[NotificationService] = None

async def get_notification_service() -> NotificationService:
    """Get or create notification service singleton"""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
        await _notification_service.initialize()
    return _notification_service


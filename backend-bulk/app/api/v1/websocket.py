"""
WebSocket endpoint for real-time bulk processing updates
Provides live field-by-field extraction progress
"""

import json
import logging
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as redis

from ...core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Redis client for pub/sub
redis_client: redis.Redis = None


async def get_redis_client() -> redis.Redis:
    """Get or create Redis client"""
    global redis_client
    if redis_client is None:
        redis_client = await redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        logger.info("✅ Redis client connected for WebSocket")
    return redis_client


class ConnectionManager:
    """
    Manages WebSocket connections for bulk jobs
    Allows multiple clients to subscribe to same job
    """
    
    def __init__(self):
        # job_id -> list of WebSocket connections
        self.active_connections: Dict[str, list[WebSocket]] = {}
        logger.info("📡 ConnectionManager initialized")
    
    async def connect(self, websocket: WebSocket, job_id: str):
        """Accept WebSocket connection and add to job subscribers"""
        await websocket.accept()
        
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        
        self.active_connections[job_id].append(websocket)
        logger.info(f"✅ Client connected to job {job_id} (total: {len(self.active_connections[job_id])})")
    
    def disconnect(self, websocket: WebSocket, job_id: str):
        """Remove WebSocket connection"""
        if job_id in self.active_connections:
            self.active_connections[job_id].remove(websocket)
            
            # Clean up empty lists
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
            
            logger.info(f"Client disconnected from job {job_id}")
    
    def get_connection_count(self, job_id: str) -> int:
        """Get number of active connections for a job"""
        return len(self.active_connections.get(job_id, []))


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws/bulk-jobs/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time job updates
    
    Usage:
    const ws = new WebSocket('ws://localhost:8001/api/v1/ws/bulk-jobs/job-uuid');
    ws.onmessage = (event) => console.log(JSON.parse(event.data));
    
    Event types: document_started, field_extracted, document_completed, job_statistics
    """
    await manager.connect(websocket, job_id)
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "job_id": job_id,
            "message": f"Connected to job {job_id}"
        })
        
        # Subscribe to Redis pub/sub for this job
        redis_conn = await get_redis_client()
        pubsub = redis_conn.pubsub()
        await pubsub.subscribe(f"job:{job_id}:updates")
        
        logger.info(f"📡 Subscribed to Redis channel: job:{job_id}:updates")
        
        # Listen for Redis messages and forward to WebSocket
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from Redis: {message['data']}")
                except Exception as e:
                    logger.error(f"Error sending WebSocket message: {e}")
                    break
        
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from job {job_id}")
    except Exception as e:
        logger.error(f"WebSocket error for job {job_id}: {e}")
    finally:
        manager.disconnect(websocket, job_id)
        try:
            await pubsub.unsubscribe(f"job:{job_id}:updates")
            await pubsub.close()
        except:
            pass


@router.get("/ws/bulk-jobs/{job_id}/connections")
async def get_connection_count(job_id: str):
    """Get number of active WebSocket connections for a job"""
    count = manager.get_connection_count(job_id)
    return {"job_id": job_id, "active_connections": count}


@router.post("/ws/bulk-jobs/{job_id}/test")
async def test_websocket_broadcast(job_id: str, message: Dict[str, Any]):
    """Test endpoint to broadcast a message to WebSocket clients"""
    redis_conn = await get_redis_client()
    await redis_conn.publish(f"job:{job_id}:updates", json.dumps(message))
    return {
        "status": "sent",
        "job_id": job_id,
        "active_connections": manager.get_connection_count(job_id)
    }


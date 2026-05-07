import asyncio
import json
import os
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
import redis.asyncio as redis

from core.security import get_current_user

router = APIRouter()

async def event_generator(user_id: str, request: Request):
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_client = redis.from_url(redis_url, decode_responses=True)
    pubsub = redis_client.pubsub()
    channel = f"sse:alerts:{user_id}"
    await pubsub.subscribe(channel)
    
    # Subscribe to global seasonal channels
    await pubsub.psubscribe("sse:seasonal:*")
    
    keepalive_interval = int(os.getenv("SSE_KEEPALIVE_INTERVAL_SECONDS", 30))
    
    try:
        while True:
            if await request.is_disconnected():
                break
                
            # Wait for message with timeout for keepalive
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=keepalive_interval)
            
            if message is None:
                yield ": keepalive\n\n"
            else:
                data = message['data']
                try:
                    payload = json.loads(data)
                    event_type = payload.get("event", "message")
                    event_data = payload.get("data", {})
                    yield f"event: {event_type}\ndata: {json.dumps(event_data)}\n\n"
                except json.JSONDecodeError:
                    yield f"data: {data}\n\n"
                    
    finally:
        await pubsub.unsubscribe()
        await pubsub.punsubscribe()
        await pubsub.close()
        await redis_client.aclose()

@router.get("/alerts")
async def sse_alerts(request: Request, current_user: str = Depends(get_current_user)):
    return StreamingResponse(
        event_generator(current_user, request), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", # Disable buffering for Nginx if used
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true"
        }
    )

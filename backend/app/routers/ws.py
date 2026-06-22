from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

router = APIRouter(tags=["websockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        message_str = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
            except Exception:
                # Connection might be dead, disconnect will handle it or clean up
                pass

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send a welcome message
        await websocket.send_text(json.dumps({
            "type": "info",
            "text": "Connected to RecipeHUB Live Activity Feed!"
        }))
        
        while True:
            # Keep connection alive, listen for messages from client (optional)
            data = await websocket.receive_text()
            # Echo back or ignore
            try:
                msg = json.loads(data)
                # If client broadcasts something, we can broadcast it to everyone
                if msg.get("type") == "chat":
                    await manager.broadcast({
                        "type": "chat",
                        "user": msg.get("user", "Anonymous"),
                        "text": msg.get("text", "")
                    })
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

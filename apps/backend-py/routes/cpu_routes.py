"""
Central Processing Unit (CPU) Routes
Handles unified data synchronization and real-time communication for all OS applications
"""
import json
import asyncio
from typing import Dict, Set, Any
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

router = APIRouter(prefix="/cpu")

# CPU Connection Manager
class CPUConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.app_subscriptions: Dict[str, Set[str]] = {}  # app_id -> set of connection_ids
        self.connection_apps: Dict[str, Set[str]] = {}  # connection_id -> set of app_ids

    async def connect(self, websocket: WebSocket, connection_id: str):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        self.connection_apps[connection_id] = set()
        print(f"[CPU] Connection {connection_id} established. Total: {len(self.active_connections)}")

    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            # Unsubscribe from all apps
            for app_id in self.connection_apps.get(connection_id, set()):
                if app_id in self.app_subscriptions:
                    self.app_subscriptions[app_id].discard(connection_id)
            
            del self.active_connections[connection_id]
            del self.connection_apps[connection_id]
            print(f"[CPU] Connection {connection_id} closed. Total: {len(self.active_connections)}")

    def subscribe(self, connection_id: str, app_id: str):
        if app_id not in self.app_subscriptions:
            self.app_subscriptions[app_id] = set()
        self.app_subscriptions[app_id].add(connection_id)
        
        if connection_id not in self.connection_apps:
            self.connection_apps[connection_id] = set()
        self.connection_apps[connection_id].add(app_id)
        
        print(f"[CPU] Connection {connection_id} subscribed to {app_id}")

    def unsubscribe(self, connection_id: str, app_id: str):
        if app_id in self.app_subscriptions:
            self.app_subscriptions[app_id].discard(connection_id)
        
        if connection_id in self.connection_apps:
            self.connection_apps[connection_id].discard(app_id)
        
        print(f"[CPU] Connection {connection_id} unsubscribed from {app_id}")

    async def broadcast_to_app(self, app_id: str, message: dict):
        """Send message to all connections subscribed to a specific app"""
        if app_id in self.app_subscriptions:
            for connection_id in self.app_subscriptions[app_id]:
                if connection_id in self.active_connections:
                    try:
                        await self.active_connections[connection_id].send_text(json.dumps(message))
                    except Exception as e:
                        print(f"[CPU] Failed to send to {connection_id}: {e}")
                        self.disconnect(connection_id)

    async def broadcast_to_all(self, message: dict):
        """Send message to all active connections"""
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                print(f"[CPU] Failed to send to {connection_id}: {e}")
                self.disconnect(connection_id)

    def get_connection_stats(self) -> dict:
        return {
            "total_connections": len(self.active_connections),
            "app_subscriptions": {app: len(conns) for app, conns in self.app_subscriptions.items()},
            "active_apps": list(self.app_subscriptions.keys())
        }

manager = CPUConnectionManager()

# Request/Response Models
class CPUDataSync(BaseModel):
    inbox: list = []
    messages: list = []
    conversations: list = []
    tasks: list = []
    agents: list = []
    files: list = []
    calendar: list = []
    settings: dict = {}
    protocols: list = []

class CPUNotification(BaseModel):
    type: str
    title: str
    message: str
    priority: str = "normal"
    app_id: str = None
    data: dict = {}

@router.get("/stats")
async def get_cpu_stats():
    """Get CPU connection statistics"""
    return {
        "success": True,
        "stats": manager.get_connection_stats(),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.websocket("/ws/cpu")
async def cpu_websocket_endpoint(websocket: WebSocket):
    """Main CPU WebSocket endpoint for real-time communication"""
    connection_id = f"conn_{datetime.utcnow().timestamp()}_{id(websocket)}"
    
    await manager.connect(websocket, connection_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            await handle_cpu_message(connection_id, message)
            
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    except Exception as e:
        print(f"[CPU] Error in connection {connection_id}: {e}")
        manager.disconnect(connection_id)

async def handle_cpu_message(connection_id: str, message: dict):
    """Handle incoming messages from clients"""
    msg_type = message.get("type")
    payload = message.get("payload", {})
    app_id = message.get("appId")
    
    if msg_type == "heartbeat":
        # Respond to heartbeat with system status
        if connection_id in manager.active_connections:
            await manager.active_connections[connection_id].send_text(json.dumps({
                "type": "heartbeat_ack",
                "timestamp": datetime.utcnow().isoformat(),
                "stats": manager.get_connection_stats()
            }))
    
    elif msg_type == "subscribe":
        if app_id:
            manager.subscribe(connection_id, app_id)
            # Send initial data for the app
            await send_app_data(connection_id, app_id)
    
    elif msg_type == "unsubscribe":
        if app_id:
            manager.unsubscribe(connection_id, app_id)
    
    elif msg_type == "sync_request":
        # Request full data sync
        await send_full_sync(connection_id)
    
    elif msg_type == "app_data":
        # Receive data from an app to be processed/relayed
        if app_id:
            await process_app_data(connection_id, app_id, payload)
            # Broadcast to other subscribers of this app
            await manager.broadcast_to_app(app_id, {
                "type": "app_update",
                "appId": app_id,
                "payload": payload,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    elif msg_type == "notification":
        # Handle notification from client
        await handle_notification(payload)
        # Broadcast to all connections
        await manager.broadcast_to_all({
            "type": "notification",
            "payload": payload,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    else:
        print(f"[CPU] Unknown message type: {msg_type}")

async def send_app_data(connection_id: str, app_id: str):
    """Send initial data for a specific app"""
    from core.database import db_all
    
    try:
        if connection_id not in manager.active_connections:
            return
            
        data = {}
        
        if app_id == "inbox":
            items = await db_all("SELECT * FROM founder_inbox WHERE status IN ('PENDING', 'SNOOZED') ORDER BY priority ASC, created_at DESC")
            data = {"items": items}
        
        elif app_id == "messages":
            messages = await db_all("SELECT * FROM messages ORDER BY created_at DESC LIMIT 100")
            conversations = await db_all("SELECT * FROM conversations ORDER BY created_at DESC")
            data = {"messages": messages, "conversations": conversations}
        
        elif app_id == "tasks":
            tasks = await db_all("SELECT * FROM tasks ORDER BY created_at DESC")
            data = {"tasks": tasks}
        
        elif app_id == "agents":
            agents = await db_all("SELECT * FROM digital_employees ORDER BY created_at DESC")
            data = {"agents": agents}
        
        elif app_id == "protocols":
            protocols = await db_all("SELECT * FROM company_protocols ORDER BY created_at DESC")
            data = {"protocols": protocols}
        
        await manager.active_connections[connection_id].send_text(json.dumps({
            "type": "app_update",
            "appId": app_id,
            "payload": data,
            "timestamp": datetime.utcnow().isoformat()
        }))
        
    except Exception as e:
        print(f"[CPU] Error sending data for {app_id}: {e}")

async def send_full_sync(connection_id: str):
    """Send full data sync to a connection"""
    try:
        if connection_id not in manager.active_connections:
            return
            
        from core.database import db_all
        
        inbox = await db_all("SELECT * FROM founder_inbox WHERE status IN ('PENDING', 'SNOOZED') ORDER BY priority ASC")
        messages = await db_all("SELECT * FROM messages ORDER BY created_at DESC LIMIT 100")
        conversations = await db_all("SELECT * FROM conversations ORDER BY created_at DESC")
        tasks = await db_all("SELECT * FROM tasks ORDER BY created_at DESC")
        agents = await db_all("SELECT * FROM digital_employees ORDER BY created_at DESC")
        protocols = await db_all("SELECT * FROM company_protocols ORDER BY created_at DESC")
        
        sync_data = {
            "inbox": inbox,
            "messages": messages,
            "conversations": conversations,
            "tasks": tasks,
            "agents": agents,
            "protocols": protocols,
            "lastSync": datetime.utcnow().isoformat()
        }
        
        await manager.active_connections[connection_id].send_text(json.dumps({
            "type": "sync",
            "payload": sync_data,
            "timestamp": datetime.utcnow().isoformat()
        }))
        
    except Exception as e:
        print(f"[CPU] Error sending full sync: {e}")

async def process_app_data(connection_id: str, app_id: str, payload: dict):
    """Process data received from an app"""
    try:
        # Store data in appropriate database tables
        if app_id == "inbox":
            from core.database import db_run
            if "id" in payload and "status" in payload:
                await db_run(
                    "UPDATE founder_inbox SET status = ? WHERE id = ?",
                    [payload["status"], payload["id"]]
                )
        
        elif app_id == "messages":
            from core.database import db_run
            if "content" in payload and "conversationId" in payload:
                import uuid
                msg_id = payload.get("id") or str(uuid.uuid4())
                await db_run(
                    "INSERT INTO messages (id, content, conversation_id, sender, created_at) VALUES (?, ?, ?, ?, ?)",
                    [msg_id, payload["content"], payload["conversationId"], payload.get("sender", "Founder"), datetime.utcnow().isoformat()]
                )
        
        elif app_id == "tasks":
            from core.database import db_run
            if "title" in payload:
                import uuid
                task_id = payload.get("id") or str(uuid.uuid4())
                await db_run(
                    "INSERT INTO tasks (id, title, description, status, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    [task_id, payload["title"], payload.get("description", ""), payload.get("status", "pending"), payload.get("priority", "normal"), datetime.utcnow().isoformat()]
                )
        
    except Exception as e:
        print(f"[CPU] Error processing app data for {app_id}: {e}")

async def handle_notification(payload: dict):
    """Handle notifications and store them if needed"""
    try:
        from core.database import db_run
        import uuid
        
        notification_id = str(uuid.uuid4())
        await db_run(
            "INSERT INTO notifications (id, type, title, message, priority, app_id, data, created_at, read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                notification_id,
                payload.get("type", "system"),
                payload.get("title", ""),
                payload.get("message", ""),
                payload.get("priority", "normal"),
                payload.get("app_id", "system"),
                json.dumps(payload.get("data", {})),
                datetime.utcnow().isoformat(),
                False
            ]
        )
        
    except Exception as e:
        print(f"[CPU] Error handling notification: {e}")

@router.post("/broadcast")
async def broadcast_to_all(message: dict):
    """API endpoint to broadcast message to all connected clients"""
    await manager.broadcast_to_all({
        "type": message.get("type", "system_update"),
        "payload": message.get("payload", {}),
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"success": True, "message": "Broadcast sent"}

@router.post("/broadcast/{app_id}")
async def broadcast_to_app(app_id: str, message: dict):
    """API endpoint to broadcast message to specific app subscribers"""
    await manager.broadcast_to_app(app_id, {
        "type": message.get("type", "app_update"),
        "appId": app_id,
        "payload": message.get("payload", {}),
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"success": True, "message": f"Broadcast sent to {app_id} subscribers"}
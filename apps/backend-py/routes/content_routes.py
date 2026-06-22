"""
Content routes — Python/FastAPI translation of contentRoutes.js
Provides CRUD for notes, conversations, calendar, notifications,
media, files, and ui-actions.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from core.database import db_all, db_get, db_run

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/content")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.utcnow().isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4()}"


def _parse_json(value: Any, fallback: Any = None) -> Any:
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return fallback


def _to_json(value: Any) -> str:
    return json.dumps(value if value is not None else None)


def _ui_action_response(action: str, **payload: Any) -> Dict[str, Any]:
    return {"success": True, "action": action, **payload}


# ---------------------------------------------------------------------------
# Row mappers
# ---------------------------------------------------------------------------

def _map_note_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "type": row.get("type"),
        "title": row.get("title"),
        "content": row.get("content"),
        "transcription": row.get("transcription"),
        "category": row.get("category"),
        "tags": _parse_json(row.get("tags_json"), []),
        "extracted": _parse_json(row.get("extracted_json"), {}),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _map_thread_row(
    row: Dict[str, Any],
    recent_message: Optional[Dict[str, Any]] = None,
    messages: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "channel": row.get("channel"),
        "title": row.get("title"),
        "participant_name": row.get("participant_name"),
        "unread": bool(row.get("unread")),
        "last_message_at": row.get("last_message_at"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "preview": (recent_message or {}).get("body", ""),
        "recent_message": recent_message,
        "messages": messages or [],
    }


def _map_calendar_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "calendarId": row.get("calendar_id"),
        "title": row.get("title"),
        "startsAt": row.get("starts_at"),
        "endsAt": row.get("ends_at"),
        "location": row.get("location"),
        "description": row.get("description"),
        "status": row.get("status"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _map_track_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "playlist": row.get("playlist"),
        "title": row.get("title"),
        "artist": row.get("artist"),
        "duration": row.get("duration"),
        "src": row.get("src"),
        "art": row.get("art"),
        "embedUrl": row.get("embed_url"),
        "type": row.get("source_type"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _map_notification_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "source": row.get("source"),
        "title": row.get("title"),
        "body": row.get("body"),
        "severity": row.get("severity"),
        "readAt": row.get("read_at"),
        "timestamp": row.get("created_at"),
        "trace": row["id"],
    }


def _map_file_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row.get("name"),
        "type": row.get("type"),
        "folder": row.get("folder"),
        "mission": row.get("mission"),
        "tags": row.get("tags"),
        "date": row.get("date"),
        "size": row.get("size"),
        "source": row.get("source"),
    }


# ---------------------------------------------------------------------------
# File routing map  (prefix → table / id-column / title-column)
# ---------------------------------------------------------------------------

_FILE_ROUTING_MAP: Dict[str, Dict[str, str]] = {
    "note": {"table": "notes_entries", "id_col": "id", "title_col": "title"},
    "output": {"table": "outputs", "id_col": "id", "title_col": "id"},
    "mission": {"table": "missions", "id_col": "id", "title_col": "name"},
    "decision": {"table": "decisions", "id_col": "id", "title_col": "title"},
    "event": {"table": "calendar_events", "id_col": "id", "title_col": "title"},
    "track": {"table": "media_tracks", "id_col": "id", "title_col": "title"},
}

# ===========================================================================
#  NOTES
# ===========================================================================

@router.get("/notes")
async def get_notes(category: Optional[str] = Query(None)):
    try:
        if category:
            rows = await db_all(
                "SELECT * FROM notes_entries WHERE category = ? ORDER BY created_at DESC",
                [category],
            )
        else:
            rows = await db_all(
                "SELECT * FROM notes_entries ORDER BY created_at DESC"
            )
        return {"notes": [_map_note_row(r) for r in rows]}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.post("/notes")
async def create_note(request: Request):
    try:
        note = await request.json() or {}
        ts = _now()
        record = {
            "id": note.get("id") or _id("note"),
            "type": note.get("type") or "text",
            "title": note.get("title") or note.get("content") or "Untitled note",
            "content": note.get("content") or "",
            "transcription": note.get("transcription"),
            "category": note.get("category") or "inbox",
            "tags_json": _to_json(note.get("tags", [])),
            "extracted_json": _to_json(note.get("extracted", {})),
            "created_at": ts,
            "updated_at": ts,
        }

        await db_run(
            """INSERT OR REPLACE INTO notes_entries
               (id, type, title, content, transcription, category,
                tags_json, extracted_json, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                record["id"], record["type"], record["title"],
                record["content"], record["transcription"], record["category"],
                record["tags_json"], record["extracted_json"],
                record["created_at"], record["updated_at"],
            ],
        )

        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [_id("action"), "founder_brain", "create_note", _to_json(record), _now()],
        )

        return {"note": _map_note_row(record)}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.patch("/notes/{note_id}")
async def update_note(note_id: str, request: Request):
    try:
        body = await request.json() or {}
        category = body.get("category")
        title = body.get("title")
        content = body.get("content")

        updates = []
        params = []
        if category is not None:
            updates.append("category = ?")
            params.append(category)
        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if content is not None:
            updates.append("content = ?")
            params.append(content)

        if updates:
            params.append(_now())
            params.append(note_id)
            await db_run(
                f"UPDATE notes_entries SET {', '.join(updates)}, updated_at = ? WHERE id = ?",
                params,
            )
        return {"success": True}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    try:
        await db_run("DELETE FROM notes_entries WHERE id = ?", [note_id])
        return {"success": True}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ===========================================================================
#  CONVERSATIONS
# ===========================================================================

@router.get("/conversations")
async def get_conversations(channel: Optional[str] = Query(None)):
    try:
        if channel:
            threads = await db_all(
                "SELECT * FROM conversation_threads WHERE channel = ? "
                "ORDER BY last_message_at DESC, created_at DESC",
                [channel],
            )
        else:
            threads = await db_all(
                "SELECT * FROM conversation_threads "
                "ORDER BY last_message_at DESC, created_at DESC"
            )

        output: List[Dict[str, Any]] = []
        for thread in threads:
            messages = await db_all(
                "SELECT * FROM conversation_messages WHERE thread_id = ? ORDER BY created_at ASC",
                [thread["id"]],
            )
            mapped_msgs = [
                {
                    "id": m["id"],
                    "sender": m.get("sender"),
                    "body": m.get("body"),
                    "direction": m.get("direction"),
                    "created_at": m.get("created_at"),
                }
                for m in messages
            ]
            recent = messages[-1] if messages else None
            output.append(_map_thread_row(thread, recent, mapped_msgs))

        return {"threads": output}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.post("/conversations")
async def create_conversation(request: Request):
    try:
        payload = await request.json() or {}
        ts = _now()
        thread = {
            "id": payload.get("id") or _id("thread"),
            "channel": payload.get("channel") or "inbox",
            "title": payload.get("title") or "Untitled Thread",
            "participant_name": payload.get("participant_name") or payload.get("title") or "Participant",
            "unread": 1 if payload.get("unread") else 0,
            "last_message_at": ts,
            "created_at": ts,
            "updated_at": ts,
        }

        await db_run(
            """INSERT OR REPLACE INTO conversation_threads
               (id, channel, title, participant_name, unread,
                last_message_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                thread["id"], thread["channel"], thread["title"],
                thread["participant_name"], thread["unread"],
                thread["last_message_at"], thread["created_at"], thread["updated_at"],
            ],
        )

        message = payload.get("message")
        if message:
            await db_run(
                """INSERT INTO conversation_messages
                   (id, thread_id, sender, body, direction, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                [
                    _id("message"),
                    thread["id"],
                    message.get("sender") or thread["participant_name"],
                    message.get("body") or "",
                    message.get("direction") or "inbound",
                    _now(),
                ],
            )

        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [_id("action"), "communication_workspace", "create_thread", _to_json(payload), _now()],
        )

        return {"thread": thread}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.post("/conversations/{thread_id}/messages")
async def add_message_to_thread(thread_id: str, request: Request):
    try:
        payload = await request.json() or {}
        thread = await db_get(
            "SELECT * FROM conversation_threads WHERE id = ?", [thread_id]
        )
        if not thread:
            return JSONResponse(status_code=404, content={"error": "Thread not found"})

        ts = _now()
        message = {
            "id": _id("message"),
            "thread_id": thread_id,
            "sender": payload.get("sender") or thread.get("participant_name") or "Founder",
            "body": payload.get("body") or "",
            "direction": payload.get("direction") or "outbound",
            "created_at": ts,
        }

        await db_run(
            """INSERT INTO conversation_messages
               (id, thread_id, sender, body, direction, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            [
                message["id"], message["thread_id"], message["sender"],
                message["body"], message["direction"], message["created_at"],
            ],
        )

        await db_run(
            "UPDATE conversation_threads SET unread = 1, last_message_at = ?, updated_at = ? WHERE id = ?",
            [message["created_at"], _now(), thread_id],
        )

        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [
                _id("action"),
                "communication_workspace",
                "send_message",
                _to_json({"threadId": thread_id, **payload}),
                _now(),
            ],
        )

        return {"message": message}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ===========================================================================
#  CALENDAR
# ===========================================================================

@router.get("/calendar")
async def get_calendar_events():
    try:
        rows = await db_all(
            "SELECT * FROM calendar_events ORDER BY starts_at ASC, created_at DESC"
        )
        return {"events": [_map_calendar_row(r) for r in rows]}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.post("/calendar")
async def create_calendar_event(request: Request):
    try:
        payload = await request.json() or {}
        ts = _now()
        event = {
            "id": payload.get("id") or _id("event"),
            "calendar_id": payload.get("calendarId") or payload.get("calendar_id") or "founder",
            "title": payload.get("title") or "Untitled Event",
            "starts_at": payload.get("startsAt") or payload.get("starts_at") or ts,
            "ends_at": (
                payload.get("endsAt")
                or payload.get("ends_at")
                or payload.get("startsAt")
                or payload.get("starts_at")
                or ts
            ),
            "location": payload.get("location"),
            "description": payload.get("description"),
            "status": payload.get("status") or "planned",
            "created_at": ts,
            "updated_at": ts,
        }

        await db_run(
            """INSERT OR REPLACE INTO calendar_events
               (id, calendar_id, title, starts_at, ends_at,
                location, description, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                event["id"], event["calendar_id"], event["title"],
                event["starts_at"], event["ends_at"], event["location"],
                event["description"], event["status"],
                event["created_at"], event["updated_at"],
            ],
        )

        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [_id("action"), "operations_calendar", "create_event", _to_json(payload), _now()],
        )

        return {"event": _map_calendar_row(event)}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ===========================================================================
#  NOTIFICATIONS
# ===========================================================================

@router.get("/notifications")
async def get_notifications():
    try:
        rows = await db_all(
            "SELECT * FROM notifications ORDER BY created_at DESC"
        )
        return {"notifications": [_map_notification_row(r) for r in rows]}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    try:
        await db_run(
            "UPDATE notifications SET read_at = ? WHERE id = ?",
            [_now(), notification_id],
        )
        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [
                _id("action"),
                "notification_center",
                "mark_read",
                _to_json({"notificationId": notification_id}),
                _now(),
            ],
        )
        return _ui_action_response("mark_read", id=notification_id)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.post("/notifications/{notification_id}/dismiss")
async def dismiss_notification(notification_id: str):
    try:
        await db_run(
            "DELETE FROM notifications WHERE id = ?", [notification_id]
        )
        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [
                _id("action"),
                "notification_center",
                "dismiss",
                _to_json({"notificationId": notification_id}),
                _now(),
            ],
        )
        return _ui_action_response("dismiss", id=notification_id)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ===========================================================================
#  MEDIA
# ===========================================================================

@router.get("/media")
async def get_media(playlist: Optional[str] = Query(None)):
    try:
        if playlist:
            rows = await db_all(
                "SELECT * FROM media_tracks WHERE playlist = ? ORDER BY created_at DESC",
                [playlist],
            )
        else:
            rows = await db_all(
                "SELECT * FROM media_tracks ORDER BY created_at DESC"
            )
        return {"tracks": [_map_track_row(r) for r in rows]}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.post("/media/tracks")
async def create_track(request: Request):
    try:
        payload = await request.json() or {}
        ts = _now()
        track = {
            "id": payload.get("id") or _id("track"),
            "playlist": payload.get("playlist") or "recent-streams",
            "title": payload.get("title") or "Untitled Track",
            "artist": payload.get("artist") or "Unknown Artist",
            "duration": payload.get("duration") or "--:--",
            "src": payload.get("src"),
            "art": payload.get("art"),
            "embed_url": payload.get("embedUrl") or payload.get("embed_url"),
            "source_type": payload.get("type") or payload.get("source_type") or "stream",
            "created_at": ts,
            "updated_at": ts,
        }

        await db_run(
            """INSERT OR REPLACE INTO media_tracks
               (id, playlist, title, artist, duration, src, art,
                embed_url, source_type, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                track["id"], track["playlist"], track["title"],
                track["artist"], track["duration"], track["src"],
                track["art"], track["embed_url"], track["source_type"],
                track["created_at"], track["updated_at"],
            ],
        )

        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [_id("action"), "music", "add_track", _to_json(payload), _now()],
        )

        return {"track": _map_track_row(track)}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ===========================================================================
#  FILES  (virtual / aggregated)
# ===========================================================================

@router.get("/files")
async def get_files():
    try:
        notes, outputs, missions, decisions, events, tracks = await _gather_file_sources()

        files: List[Dict[str, Any]] = []

        for row in notes:
            files.append({
                "id": f"note-{row['id']}",
                "name": row.get("title"),
                "type": "doc",
                "folder": row.get("category") or "documents",
                "mission": None,
                "tags": _parse_json(row.get("tags_json"), []),
                "date": row.get("created_at"),
                "size": "\u2014",
                "source": "notes_entries",
            })

        for row in outputs:
            files.append({
                "id": f"output-{row['output_id']}",
                "name": row.get("title"),
                "type": "code",
                "folder": "outputs",
                "mission": None,
                "tags": [],
                "date": row.get("created_at"),
                "size": "\u2014",
                "source": "outputs",
            })

        for row in missions:
            files.append({
                "id": f"mission-{row['mission_id']}",
                "name": row.get("title"),
                "type": "mission_folder",
                "folder": "missions",
                "mission": row.get("title"),
                "tags": [t for t in [row.get("status")] if t],
                "date": row.get("created_at"),
                "size": "\u2014",
                "source": "missions",
            })

        for row in decisions:
            files.append({
                "id": f"decision-{row['decision_id']}",
                "name": row.get("title"),
                "type": "pdf",
                "folder": "archive",
                "mission": None,
                "tags": [t for t in [row.get("decision_type"), row.get("priority")] if t],
                "date": row.get("created_at"),
                "size": "\u2014",
                "source": "decisions",
            })

        for row in events:
            files.append({
                "id": f"event-{row['id']}",
                "name": row.get("title"),
                "type": "calendar",
                "folder": row.get("calendar_id") or "system",
                "mission": None,
                "tags": [],
                "date": row.get("created_at") or row.get("starts_at"),
                "size": "\u2014",
                "source": "calendar_events",
            })

        for row in tracks:
            files.append({
                "id": f"track-{row['id']}",
                "name": row.get("title"),
                "type": "audio",
                "folder": "assets",
                "mission": None,
                "tags": [t for t in [row.get("artist")] if t],
                "date": row.get("created_at"),
                "size": "\u2014",
                "source": "media_tracks",
            })

        return {"files": [_map_file_row(f) for f in files]}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


async def _gather_file_sources():
    """Fetch all six source tables concurrently-ish (sequential for aiosqlite single-connection)."""
    import asyncio

    results = await asyncio.gather(
        db_all("SELECT id, title, category, tags_json, created_at FROM notes_entries ORDER BY created_at DESC"),
        db_all("SELECT id AS output_id, output_type AS title, created_at, content AS content_json FROM outputs ORDER BY created_at DESC"),
        db_all("SELECT id AS mission_id, name AS title, objective, status, created_at FROM missions ORDER BY created_at DESC"),
        db_all("SELECT id AS decision_id, title, status AS decision_type, status AS priority, created_at FROM decisions ORDER BY created_at DESC"),
        db_all("SELECT id, calendar_id, title, starts_at, created_at FROM calendar_events ORDER BY starts_at DESC"),
        db_all("SELECT id, playlist, title, artist, created_at FROM media_tracks ORDER BY created_at DESC"),
    )
    return results


@router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    try:
        prefix, *rest = file_id.split("-", 1)
        db_id = rest[0] if rest else ""
        route = _FILE_ROUTING_MAP.get(prefix)

        if not route:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unknown file prefix: {prefix}"},
            )

        await db_run(
            f"DELETE FROM {route['table']} WHERE {route['id_col']} = ?",
            [db_id],
        )
        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [
                _id("action"),
                "file_manager",
                "delete_file",
                _to_json({"fileId": file_id, "table": route["table"]}),
                _now(),
            ],
        )

        return _ui_action_response("delete_file", id=file_id)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.patch("/files/{file_id}")
async def rename_file(file_id: str, request: Request):
    try:
        body = await request.json() or {}
        name = body.get("name")
        if not name:
            return JSONResponse(
                status_code=400, content={"error": "Name is required"}
            )

        prefix, *rest = file_id.split("-", 1)
        db_id = rest[0] if rest else ""
        route = _FILE_ROUTING_MAP.get(prefix)

        if not route:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unknown file prefix: {prefix}"},
            )

        await db_run(
            f"UPDATE {route['table']} SET {route['title_col']} = ? WHERE {route['id_col']} = ?",
            [name, db_id],
        )
        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [
                _id("action"),
                "file_manager",
                "rename_file",
                _to_json({"fileId": file_id, "table": route["table"], "newName": name}),
                _now(),
            ],
        )

        return _ui_action_response("rename_file", id=file_id, newName=name)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ===========================================================================
#  UI-ACTIONS
# ===========================================================================

@router.post("/ui-actions")
async def log_ui_action(request: Request):
    try:
        payload = await request.json() or {}
        record = {
            "id": _id("action"),
            "app_id": payload.get("appId") or payload.get("app_id") or "unknown",
            "action": payload.get("action") or "click",
            "payload_json": _to_json(payload.get("payload") or payload),
            "created_at": _now(),
        }

        await db_run(
            """INSERT INTO ui_actions (id, app_id, action, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            [
                record["id"], record["app_id"], record["action"],
                record["payload_json"], record["created_at"],
            ],
        )

        return {"action": record}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.get("/ui-actions")
async def get_ui_actions(appId: Optional[str] = Query(None)):
    try:
        if appId:
            rows = await db_all(
                "SELECT * FROM ui_actions WHERE app_id = ? ORDER BY created_at DESC LIMIT 200",
                [appId],
            )
        else:
            rows = await db_all(
                "SELECT * FROM ui_actions ORDER BY created_at DESC LIMIT 200"
            )

        return {
            "actions": [
                {
                    "id": row["id"],
                    "appId": row.get("app_id"),
                    "action": row.get("action"),
                    "payload": _parse_json(row.get("payload_json"), {}),
                    "createdAt": row.get("created_at"),
                }
                for row in rows
            ]
        }
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})

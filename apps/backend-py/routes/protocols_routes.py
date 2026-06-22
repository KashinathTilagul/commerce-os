import os
import json
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.exceptions import PathTraversalError, ValidationError

router = APIRouter()

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "company_protocols")
HISTORY_DIR = os.path.join(BASE_DIR, ".history")

os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(HISTORY_DIR, exist_ok=True)


def validate_safe_protocol_id(protocol_id: str) -> str:
    """
    Validate protocol_id to prevent directory traversal attacks.
    Raises PathTraversalError if the ID contains dangerous patterns.
    """
    if not protocol_id or not isinstance(protocol_id, str):
        raise ValidationError("protocol_id must be a non-empty string")

    # Check for path traversal attempts
    dangerous_patterns = ["..", "/", "\\", ":", "\0"]
    for pattern in dangerous_patterns:
        if pattern in protocol_id:
            raise PathTraversalError(protocol_id)

    # Whitelist safe characters (alphanumeric, underscore, hyphen)
    if not re.match(r"^[a-zA-Z0-9_-]+$", protocol_id):
        raise ValidationError("protocol_id contains invalid characters")

    return protocol_id


class ProtocolUpdate(BaseModel):
    content: str
    author: str
    reason: str

def parse_frontmatter(content: str):
    # Matches simple YAML-like frontmatter between --- and ---
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", content, re.DOTALL)
    if not match:
        return None, content
    
    meta_text = match.group(1)
    body = match.group(2)
    
    meta = {}
    for line in meta_text.split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
            
    return meta, body

def build_frontmatter(meta: dict):
    lines = ["---"]
    for k, v in meta.items():
        lines.append(f"{k}: {v}")
    lines.append("---")
    return "\n".join(lines)

@router.get("/protocols")
async def list_protocols():
    protocols = []
    for filename in os.listdir(BASE_DIR):
        if not filename.endswith(".md"):
            continue
            
        file_path = os.path.join(BASE_DIR, filename)
        protocol_id = filename[:-3]
        
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        meta, _ = parse_frontmatter(content)
        if not meta:
            meta = {"Version": "1.0", "Author": "Unknown", "Last Updated": "Unknown", "Approval Status": "Unknown"}
            
        # Try to extract title
        title = protocol_id.replace("_", " ").title()
        title_match = re.search(r"^#\s+(.*)$", content, re.MULTILINE)
        if title_match:
            title = title_match.group(1)
            
        protocols.append({
            "id": protocol_id,
            "title": title,
            "meta": meta
        })
        
    return {"protocols": protocols}

@router.get("/protocols/{protocol_id}")
async def get_protocol(protocol_id: str):
    protocol_id = validate_safe_protocol_id(protocol_id)
    file_path = os.path.join(BASE_DIR, f"{protocol_id}.md")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Protocol not found")
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Get history
    history_path = os.path.join(HISTORY_DIR, f"{protocol_id}.json")
    history = []
    if os.path.exists(history_path):
        with open(history_path, "r", encoding="utf-8") as f:
            history = json.load(f)
            
    return {
        "content": content,
        "history": history
    }

@router.post("/protocols/{protocol_id}")
async def update_protocol(protocol_id: str, payload: ProtocolUpdate):
    protocol_id = validate_safe_protocol_id(protocol_id)
    file_path = os.path.join(BASE_DIR, f"{protocol_id}.md")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Protocol not found")
        
    # Read current state
    with open(file_path, "r", encoding="utf-8") as f:
        old_content = f.read()
        
    old_meta, old_body = parse_frontmatter(old_content)
    
    # Save to history
    history_path = os.path.join(HISTORY_DIR, f"{protocol_id}.json")
    history = []
    if os.path.exists(history_path):
        with open(history_path, "r", encoding="utf-8") as f:
            history = json.load(f)
            
    history.append({
        "timestamp": datetime.now().isoformat(),
        "version": old_meta.get("Version", "1.0") if old_meta else "1.0",
        "author": old_meta.get("Author", "Unknown") if old_meta else "Unknown",
        "content": old_content,
        "reason": payload.reason
    })
    
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
        
    # Parse new content to update frontmatter
    new_meta, new_body = parse_frontmatter(payload.content)
    if not new_meta:
        # Fallback if user wiped frontmatter
        new_meta = old_meta if old_meta else {}
        new_body = payload.content
        
    # Bump version
    try:
        current_v = float(new_meta.get("Version", "1.0"))
        new_meta["Version"] = str(round(current_v + 0.1, 1))
    except (ValueError, TypeError):
        new_meta["Version"] = "1.1"
        
    new_meta["Author"] = payload.author
    new_meta["Last Updated"] = datetime.now().strftime("%Y-%m-%d")
    new_meta["Change Log"] = payload.reason
    
    final_content = build_frontmatter(new_meta) + "\n\n" + new_body.strip()
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(final_content)
        
    return {"status": "success", "new_version": new_meta["Version"]}

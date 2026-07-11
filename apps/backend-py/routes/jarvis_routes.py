"""
Jarvis TTS (Edge TTS) and STT (Faster-Whisper) endpoints.
Loaded once at startup — model stays in memory for low latency.
"""
import os
import tempfile
import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jarvis", tags=["jarvis"])

# ── Faster-Whisper model (loaded once at startup) ────────────────────────────
_whisper = None

def load_whisper():
    global _whisper
    try:
        from faster_whisper import WhisperModel
        # tiny: 75MB, ~200ms on CPU — good balance for real-time feel
        _whisper = WhisperModel("tiny", device="cpu", compute_type="int8")
        logger.info("[STT] Faster-Whisper tiny model loaded")
    except Exception as e:
        logger.warning(f"[STT] Faster-Whisper not available: {e}")


# ── TTS — Edge TTS with SSML for human-like voice ────────────────────────────
import re
import html

# Voices that support express-as styles in Edge TTS
_EXPRESSIVE_VOICES = {
    "en-IN-NeerjaNeural", "en-IN-PrabhatNeural",
    "en-US-AndrewNeural", "en-US-EmmaNeural", "en-US-BrianNeural", "en-US-AvaNeural",
    "en-GB-RyanNeural", "en-GB-SoniaNeural",
    "en-AU-WilliamNeural", "en-AU-NatashaNeural",
}

def _build_ssml(text: str, voice: str) -> str:
    """Convert plain text to SSML with breathing pauses and natural prosody."""
    lang = voice[:5]  # e.g. en-IN
    safe = html.escape(text)

    # Ellipses → natural thinking pause
    safe = re.sub(r'\.\.\.', '<break time="600ms"/>', safe)
    safe = re.sub(r'(?<!\.)\.\.(?!\.)', '<break time="300ms"/>', safe)
    # Em-dash → pause
    safe = safe.replace('—', '<break time="200ms"/>')
    safe = safe.replace('–', '<break time="150ms"/>')
    # Slight pause after commas for rhythm
    safe = re.sub(r',(\s)', r',<break time="80ms"/>\1', safe)

    # Breath before long responses
    breath = '<break time="180ms"/>' if len(text) > 120 else ''

    # Slightly slower rate for clarity — more natural than the default robotic speed
    rate = "-8%"
    pitch = "-3%"

    if voice in _EXPRESSIVE_VOICES:
        return (
            f"<speak version='1.0' "
            f"xmlns='http://www.w3.org/2001/10/synthesis' "
            f"xmlns:mstts='http://www.w3.org/2001/mstts' "
            f"xml:lang='{lang}'>"
            f"<voice name='{voice}'>"
            f"<mstts:express-as style='chat' styledegree='1.2'>"
            f"<prosody rate='{rate}' pitch='{pitch}'>"
            f"{breath}{safe}"
            f"</prosody>"
            f"</mstts:express-as>"
            f"</voice>"
            f"</speak>"
        )
    # Fallback for voices without style support (Hindi etc.)
    return (
        f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{lang}'>"
        f"<voice name='{voice}'>"
        f"<prosody rate='{rate}' pitch='{pitch}'>"
        f"{breath}{safe}"
        f"</prosody>"
        f"</voice>"
        f"</speak>"
    )


class TTSRequest(BaseModel):
    text: str
    voice: str = "en-IN-NeerjaNeural"

@router.post("/tts")
async def tts(req: TTSRequest):
    try:
        import edge_tts
    except ImportError:
        raise HTTPException(500, "edge-tts not installed")

    text = req.text.strip()[:2000]
    if not text:
        raise HTTPException(400, "text required")

    ssml = _build_ssml(text, req.voice)
    communicate = edge_tts.Communicate(ssml, req.voice)

    async def generate():
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(
        generate(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache"},
    )


# ── STT — Faster-Whisper transcription ──────────────────────────────────────

@router.post("/stt")
async def stt(audio: UploadFile = File(...)):
    if _whisper is None:
        raise HTTPException(503, "STT model not loaded")

    data = await audio.read()
    if not data:
        raise HTTPException(400, "audio required")

    # Detect format from content type
    ct = audio.content_type or "audio/webm"
    ext = ".ogg" if "ogg" in ct else ".mp4" if "mp4" in ct else ".webm"

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
        f.write(data)
        tmp = f.name

    try:
        loop = asyncio.get_event_loop()
        segments, info = await loop.run_in_executor(
            None,
            lambda: _whisper.transcribe(tmp, beam_size=3, language=None),
        )
        transcript = " ".join(s.text.strip() for s in segments).strip()
        return {"transcript": transcript, "language": info.language}
    except Exception as e:
        logger.error(f"[STT] Transcription failed: {e}")
        raise HTTPException(500, str(e))
    finally:
        try:
            os.unlink(tmp)
        except Exception:
            pass


# ── Available voices list ────────────────────────────────────────────────────

VOICES = [
    # Indian English
    {"id": "en-IN-NeerjaNeural",   "label": "Neerja — Indian English Female",  "lang": "en-IN"},
    {"id": "en-IN-PrabhatNeural",  "label": "Prabhat — Indian English Male",   "lang": "en-IN"},
    # Hindi
    {"id": "hi-IN-SwaraNeural",    "label": "Swara — Hindi Female",            "lang": "hi-IN"},
    {"id": "hi-IN-MadhurNeural",   "label": "Madhur — Hindi Male",             "lang": "hi-IN"},
    # US English
    {"id": "en-US-AndrewNeural",   "label": "Andrew — US English Male",        "lang": "en-US"},
    {"id": "en-US-EmmaNeural",     "label": "Emma — US English Female",        "lang": "en-US"},
    {"id": "en-US-BrianNeural",    "label": "Brian — US English Male (deep)",  "lang": "en-US"},
    {"id": "en-US-AvaNeural",      "label": "Ava — US English Female (warm)",  "lang": "en-US"},
    # British English
    {"id": "en-GB-RyanNeural",     "label": "Ryan — British English Male",     "lang": "en-GB"},
    {"id": "en-GB-SoniaNeural",    "label": "Sonia — British English Female",  "lang": "en-GB"},
    # Australian
    {"id": "en-AU-WilliamNeural",  "label": "William — Australian Male",       "lang": "en-AU"},
    {"id": "en-AU-NatashaNeural",  "label": "Natasha — Australian Female",     "lang": "en-AU"},
]

@router.get("/voices")
async def list_voices():
    return VOICES

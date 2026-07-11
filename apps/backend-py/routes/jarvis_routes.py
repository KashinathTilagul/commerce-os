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

# Per-voice express-as styles — each voice supports different ones
# Using wrong style causes Edge TTS to error or ignore it silently
_VOICE_STYLES: dict[str, str] = {
    "en-IN-NeerjaNeural":  "friendly",
    "en-IN-PrabhatNeural": "friendly",
    "en-US-AndrewNeural":  "chat",
    "en-US-EmmaNeural":    "chat",
    "en-US-BrianNeural":   "chat",
    "en-US-AvaNeural":     "chat",
    "en-GB-RyanNeural":    "chat",
    "en-GB-SoniaNeural":   "chat",
    "en-AU-WilliamNeural": "chat",
    "en-AU-NatashaNeural": "chat",
    # Hindi voices have very limited style support — skip express-as
}

def _build_ssml(text: str, voice: str, speed: float = 1.0, stability: float = 0.75, volume: float = 1.0) -> str:
    """Convert plain text to SSML with breathing pauses and natural prosody."""
    lang = voice[:5]
    safe = html.escape(text)

    # Natural pauses — these make the biggest difference
    safe = re.sub(r'\.\.\.', '<break time="650ms"/>', safe)
    safe = re.sub(r'(?<!\.)\.\.(?!\.)', '<break time="320ms"/>', safe)
    safe = safe.replace('—', '<break time="220ms"/>')
    safe = safe.replace('–', '<break time="160ms"/>')
    safe = re.sub(r',(\s)', r',<break time="90ms"/>\1', safe)

    # Breath before longer responses
    breath = '<break time="200ms"/>' if len(text) > 100 else ''

    # Convert speed (0.5–2.0) → SSML rate percent: 1.0 = -10% (slightly slower baseline)
    rate_pct = round((speed - 1.0) * 100 - 10)
    rate = f"{rate_pct:+d}%"
    # stability (0–1) → pitch: 0.75 = -5% (natural baseline), lower = more expressive
    pitch_pct = round((stability - 0.75) * 20 - 5)
    pitch = f"{pitch_pct:+d}%"
    # volume (0–1.5) → SSML volume dB: 1.0 = +0dB
    vol_db = round((volume - 1.0) * 6)
    vol = f"{vol_db:+d}dB" if vol_db != 0 else "default"

    vol_attr = f" volume='{vol}'" if vol != "default" else ""
    style = _VOICE_STYLES.get(voice)
    if style:
        return (
            f"<speak version='1.0' "
            f"xmlns='http://www.w3.org/2001/10/synthesis' "
            f"xmlns:mstts='http://www.w3.org/2001/mstts' "
            f"xml:lang='{lang}'>"
            f"<voice name='{voice}'>"
            f"<mstts:express-as style='{style}' styledegree='1.3'>"
            f"<prosody rate='{rate}' pitch='{pitch}'{vol_attr}>"
            f"{breath}{safe}"
            f"</prosody>"
            f"</mstts:express-as>"
            f"</voice>"
            f"</speak>"
        )
    return (
        f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{lang}'>"
        f"<voice name='{voice}'>"
        f"<prosody rate='{rate}' pitch='{pitch}'{vol_attr}>"
        f"{breath}{safe}"
        f"</prosody>"
        f"</voice>"
        f"</speak>"
    )


class TTSRequest(BaseModel):
    text: str
    voice: str = "en-IN-NeerjaNeural"
    speed: float = 1.0
    stability: float = 0.75
    volume: float = 1.0

@router.post("/tts")
async def tts(req: TTSRequest):
    try:
        import edge_tts
    except ImportError:
        raise HTTPException(500, "edge-tts not installed")

    text = req.text.strip()[:2000]
    if not text:
        raise HTTPException(400, "text required")

    ssml = _build_ssml(text, req.voice, req.speed, req.stability, req.volume)
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

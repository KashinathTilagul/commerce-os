"""
Jarvis TTS (Kokoro + Edge TTS fallback) and STT (Faster-Whisper) endpoints.
Loaded once at startup - models stay in memory for low latency.
"""
import io
import os
import tempfile
import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jarvis", tags=["jarvis"])

# Faster-Whisper model (loaded once at startup)
_whisper = None

def load_whisper():
    global _whisper
    try:
        from faster_whisper import WhisperModel
        _whisper = WhisperModel("tiny", device="cpu", compute_type="int8")
        logger.info("[STT] Faster-Whisper tiny model loaded")
    except Exception as e:
        logger.warning(f"[STT] Faster-Whisper not available: {e}")


# Kokoro TTS (local neural voices)
_kokoro_pipelines: dict[str, object] = {}

def _is_kokoro_voice(voice: str) -> bool:
    """Kokoro voices have short prefix like af_, am_, bf_, bm_."""
    return len(voice) > 3 and voice[2] == "_" and voice[:2].isalpha()

def _get_kokoro_pipeline(voice: str):
    lang = "b" if voice.startswith("b") else "a"
    if lang not in _kokoro_pipelines:
        from kokoro import KPipeline
        _kokoro_pipelines[lang] = KPipeline(lang_code=lang)
        logger.info(f"[TTS] Kokoro pipeline loaded lang={lang}")
    return _kokoro_pipelines[lang]

async def _kokoro_tts(text: str, voice: str, speed: float) -> bytes:
    import numpy as np
    import soundfile as sf
    pipeline = _get_kokoro_pipeline(voice)
    def _generate():
        chunks = []
        for _, _, audio in pipeline(text, voice=voice, speed=speed):
            chunks.append(audio)
        return np.concatenate(chunks) if chunks else np.zeros(1, dtype=np.float32)
    loop = asyncio.get_event_loop()
    audio = await loop.run_in_executor(None, _generate)
    buf = io.BytesIO()
    sf.write(buf, audio, 24000, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return buf.read()


# Edge TTS - SSML for human-like neural voices
import re
import html

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
}

def _build_ssml(text: str, voice: str, speed: float = 1.0, stability: float = 0.75, volume: float = 1.0) -> str:
    lang = voice[:5]
    safe = html.escape(text)
    safe = re.sub(r"\\.\\.\\.", "<break time=\"650ms\"/>", safe)
    safe = re.sub(r"(?<!\\.)\\.\\.(?!\\.)", "<break time=\"320ms\"/>", safe)
    safe = safe.replace("—", "<break time=\"220ms\"/>").replace("–", "<break time=\"160ms\"/>")
    safe = re.sub(r",(\\s)", r",<break time=\"90ms\"/>\\1", safe)
    breath = "<break time=\"200ms\"/>" if len(text) > 100 else ""
    rate_pct = round((speed - 1.0) * 100 - 10)
    pitch_pct = round((stability - 0.75) * 20 - 5)
    vol_db = round((volume - 1.0) * 6)
    rate = f"{rate_pct:+d}%"
    pitch = f"{pitch_pct:+d}%"
    vol = f"{vol_db:+d}dB" if vol_db != 0 else "default"
    vol_attr = f" volume=\"{vol}\"" if vol != "default" else ""
    style = _VOICE_STYLES.get(voice)
    if style:
        return (
            f"<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" "
            f"xmlns:mstts=\"http://www.w3.org/2001/mstts\" xml:lang=\"{lang}\">"
            f"<voice name=\"{voice}\"><mstts:express-as style=\"{style}\" styledegree=\"1.3\">"
            f"<prosody rate=\"{rate}\" pitch=\"{pitch}\"{vol_attr}>{breath}{safe}"
            f"</prosody></mstts:express-as></voice></speak>"
        )
    return (
        f"<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xml:lang=\"{lang}\">"
        f"<voice name=\"{voice}\"><prosody rate=\"{rate}\" pitch=\"{pitch}\"{vol_attr}>"
        f"{breath}{safe}</prosody></voice></speak>"
    )


class TTSRequest(BaseModel):
    text: str
    voice: str = "af_heart"
    speed: float = 1.0
    stability: float = 0.75
    volume: float = 1.0

@router.post("/tts")
async def tts(req: TTSRequest):
    text = req.text.strip()[:2000]
    if not text:
        raise HTTPException(400, "text required")

    if _is_kokoro_voice(req.voice):
        try:
            wav = await _kokoro_tts(text, req.voice, req.speed)
            return Response(wav, media_type="audio/wav", headers={"Cache-Control": "no-cache"})
        except Exception as e:
            logger.warning(f"[TTS] Kokoro failed ({e}), falling back to Edge TTS")

    try:
        import edge_tts
    except ImportError:
        raise HTTPException(500, "No TTS engine available")

    edge_voice = req.voice if not _is_kokoro_voice(req.voice) else "en-IN-NeerjaNeural"
    ssml = _build_ssml(text, edge_voice, req.speed, req.stability, req.volume)
    communicate = edge_tts.Communicate(ssml, edge_voice)

    async def _stream_edge():
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(
        _stream_edge(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache"},
    )


# STT - Faster-Whisper transcription
@router.post("/stt")
async def stt(audio: UploadFile = File(...)):
    if _whisper is None:
        raise HTTPException(503, "STT model not loaded")
    data = await audio.read()
    if not data:
        raise HTTPException(400, "audio required")
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


# Available voices
VOICES = [
    # Kokoro (local neural - highest quality)
    {"id": "af_heart",    "label": "Heart — American Female (warm)",        "lang": "en-US", "engine": "kokoro"},
    {"id": "af_bella",    "label": "Bella — American Female (expressive)",  "lang": "en-US", "engine": "kokoro"},
    {"id": "af_nicole",   "label": "Nicole — American Female (smooth)",     "lang": "en-US", "engine": "kokoro"},
    {"id": "af_sarah",    "label": "Sarah — American Female (clear)",       "lang": "en-US", "engine": "kokoro"},
    {"id": "af_sky",      "label": "Sky — American Female (natural)",       "lang": "en-US", "engine": "kokoro"},
    {"id": "am_adam",     "label": "Adam — American Male (deep)",           "lang": "en-US", "engine": "kokoro"},
    {"id": "am_michael",  "label": "Michael — American Male (professional)", "lang": "en-US", "engine": "kokoro"},
    {"id": "am_echo",     "label": "Echo — American Male (clean)",          "lang": "en-US", "engine": "kokoro"},
    {"id": "bf_emma",     "label": "Emma — British Female",                 "lang": "en-GB", "engine": "kokoro"},
    {"id": "bf_isabella", "label": "Isabella — British Female (rich)",      "lang": "en-GB", "engine": "kokoro"},
    {"id": "bm_george",   "label": "George — British Male",                 "lang": "en-GB", "engine": "kokoro"},
    {"id": "bm_lewis",    "label": "Lewis — British Male (authoritative)",  "lang": "en-GB", "engine": "kokoro"},
    # Edge TTS (cloud neural - Indian & Hindi voices)
    {"id": "en-IN-NeerjaNeural",   "label": "Neerja — Indian English Female",  "lang": "en-IN", "engine": "edge"},
    {"id": "en-IN-PrabhatNeural",  "label": "Prabhat — Indian English Male",   "lang": "en-IN", "engine": "edge"},
    {"id": "hi-IN-SwaraNeural",    "label": "Swara — Hindi Female",            "lang": "hi-IN", "engine": "edge"},
    {"id": "hi-IN-MadhurNeural",   "label": "Madhur — Hindi Male",             "lang": "hi-IN", "engine": "edge"},
    {"id": "en-US-AndrewNeural",   "label": "Andrew — US English Male",        "lang": "en-US", "engine": "edge"},
    {"id": "en-US-EmmaNeural",     "label": "Emma — US English Female",        "lang": "en-US", "engine": "edge"},
    {"id": "en-GB-RyanNeural",     "label": "Ryan — British English Male",     "lang": "en-GB", "engine": "edge"},
    {"id": "en-AU-WilliamNeural",  "label": "William — Australian Male",       "lang": "en-AU", "engine": "edge"},
]

@router.get("/voices")
async def list_voices():
    return VOICES

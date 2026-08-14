"""
Jarvis TTS (Pocket TTS + Edge TTS fallback) and STT (Faster-Whisper) endpoints.
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

# Faster-Whisper STT model
_whisper = None

def load_whisper():
    global _whisper
    try:
        from faster_whisper import WhisperModel
        _whisper = WhisperModel("tiny", device="cpu", compute_type="int8")
        logger.info("[STT] Faster-Whisper loaded")
    except Exception as e:
        logger.warning(f"[STT] Faster-Whisper not available: {e}")


# Pocket TTS — kyutai local neural voices
# Preset voice names as shipped by pocket-tts
POCKET_TTS_VOICES = {"alba", "anna", "charles", "eve", "giovanni", "lola",
                     "juergen", "rafael", "estelle"}

_pocket_model = None
_pocket_states: dict[str, object] = {}

def _get_pocket_model():
    global _pocket_model
    if _pocket_model is None:
        from pocket_tts import TTSModel
        _pocket_model = TTSModel.load_model()
        logger.info("[TTS] Pocket TTS model loaded")
    return _pocket_model

def _get_voice_state(voice: str):
    if voice not in _pocket_states:
        model = _get_pocket_model()
        _pocket_states[voice] = model.get_state_for_audio_prompt(voice)
    return _pocket_states[voice]

async def _pocket_tts(text: str, voice: str) -> bytes:
    """Generate WAV bytes via Pocket TTS (CPU-bound, run in executor)."""
    import scipy.io.wavfile as wav

    def _generate():
        model = _get_pocket_model()
        state = _get_voice_state(voice)
        audio = model.generate_audio(state, text)
        buf = io.BytesIO()
        wav.write(buf, model.sample_rate, audio.numpy())
        buf.seek(0)
        return buf.read()

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _generate)


# Edge TTS — SSML neural voices (fallback + Indian/Hindi voices)
# en-GB-RyanNeural is the Jarvis preset: "assistant" style with styledegree 1.6
import re
import html

_VOICE_STYLES: dict[str, str] = {
    "en-IN-NeerjaNeural":  "friendly",
    "en-IN-PrabhatNeural": "friendly",
    "en-US-AndrewNeural":  "chat",
    "en-US-EmmaNeural":    "chat",
    "en-US-BrianNeural":   "chat",
    "en-US-AvaNeural":     "chat",
    "en-GB-RyanNeural":    "assistant",
    "en-GB-SoniaNeural":   "chat",
    "en-AU-WilliamNeural": "chat",
    "en-AU-NatashaNeural": "chat",
}

def _build_ssml(text: str, voice: str, speed: float = 1.0, stability: float = 0.75, volume: float = 1.0) -> str:
    lang = voice[:5]
    safe = html.escape(text)
    safe = re.sub(r"\\.\\.\\.", "<break time=\"800ms\"/>", safe)
    safe = re.sub(r"(?<!\\.)\\.\\.(?!\\.)", "<break time=\"400ms\"/>", safe)
    safe = safe.replace("—", "<break time=\"280ms\"/>").replace("–", "<break time=\"200ms\"/>")
    safe = re.sub(r",(\\s)", r",<break time=\"120ms\"/>\\1", safe)
    safe = re.sub(r";(\\s)", r";<break time=\"180ms\"/>\\1", safe)
    breath = "<break time=\"350ms\"/>" if len(text) > 80 else ""
    rate_pct = round((speed - 1.0) * 100 - 10)
    pitch_pct = round((stability - 0.75) * 20 - 5)
    vol_db = round((volume - 1.0) * 6)
    rate = f"{rate_pct:+d}%"
    pitch = f"{pitch_pct:+d}%"
    vol = f"{vol_db:+d}dB" if vol_db != 0 else "default"
    vol_attr = f" volume=\"{vol}\"" if vol != "default" else ""
    style = _VOICE_STYLES.get(voice)
    styledegree = "1.6" if voice == "en-GB-RyanNeural" else "1.3"
    if style:
        return (
            f"<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" "
            f"xmlns:mstts=\"http://www.w3.org/2001/mstts\" xml:lang=\"{lang}\">"
            f"<voice name=\"{voice}\"><mstts:express-as style=\"{style}\" styledegree=\"{styledegree}\">"
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
    voice: str = "en-GB-RyanNeural"
    speed: float = 1.0
    stability: float = 0.75
    volume: float = 1.0

@router.post("/tts")
async def tts(req: TTSRequest):
    text = req.text.strip()[:2000]
    if not text:
        raise HTTPException(400, "text required")

    # Pocket TTS path — kyutai local neural voices
    if req.voice in POCKET_TTS_VOICES:
        try:
            wav_bytes = await _pocket_tts(text, req.voice)
            return Response(wav_bytes, media_type="audio/wav",
                            headers={"Cache-Control": "no-cache"})
        except Exception as e:
            logger.warning(f"[TTS] Pocket TTS failed ({e}), falling back to Edge TTS")

    # Edge TTS fallback
    try:
        import edge_tts
    except ImportError:
        raise HTTPException(500, "No TTS engine available")

    edge_voice = req.voice if req.voice not in POCKET_TTS_VOICES else "en-IN-NeerjaNeural"
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



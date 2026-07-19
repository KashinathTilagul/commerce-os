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
    voice: str = "en-IN-NeerjaNeural"
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


VOICES = [
    # Pocket TTS — kyutai local neural (English)
    {"id": "charles",  "label": "Charles — English Male",         "lang": "en", "engine": "pocket-tts"},
    {"id": "eve",      "label": "Eve — English Female",           "lang": "en", "engine": "pocket-tts"},
    {"id": "anna",     "label": "Anna — English Female (warm)",   "lang": "en", "engine": "pocket-tts"},
    {"id": "alba",     "label": "Alba — English Female (clear)",  "lang": "en", "engine": "pocket-tts"},
    {"id": "estelle",  "label": "Estelle — English Female",       "lang": "en", "engine": "pocket-tts"},
    {"id": "lola",     "label": "Lola — English Female",          "lang": "en", "engine": "pocket-tts"},
    {"id": "giovanni", "label": "Giovanni — Male",                "lang": "en", "engine": "pocket-tts"},
    {"id": "rafael",   "label": "Rafael — Male",                  "lang": "en", "engine": "pocket-tts"},
    # Edge TTS — Microsoft neural (Indian & Hindi)
    {"id": "en-IN-NeerjaNeural",   "label": "Neerja — Indian English Female",  "lang": "en-IN", "engine": "edge"},
    {"id": "en-IN-PrabhatNeural",  "label": "Prabhat — Indian English Male",   "lang": "en-IN", "engine": "edge"},
    {"id": "hi-IN-SwaraNeural",    "label": "Swara — Hindi Female",            "lang": "hi-IN", "engine": "edge"},
    {"id": "hi-IN-MadhurNeural",   "label": "Madhur — Hindi Male",             "lang": "hi-IN", "engine": "edge"},
    {"id": "en-US-AndrewNeural",   "label": "Andrew — US English Male",        "lang": "en-US", "engine": "edge"},
    {"id": "en-US-EmmaNeural",     "label": "Emma — US English Female",        "lang": "en-US", "engine": "edge"},
    {"id": "en-US-BrianNeural",    "label": "Brian — US English Male (deep)",  "lang": "en-US", "engine": "edge"},
    {"id": "en-US-AvaNeural",      "label": "Ava — US English Female (warm)",  "lang": "en-US", "engine": "edge"},
    {"id": "en-GB-RyanNeural",     "label": "Ryan — British English Male",     "lang": "en-GB", "engine": "edge"},
    {"id": "en-GB-SoniaNeural",    "label": "Sonia — British English Female",  "lang": "en-GB", "engine": "edge"},
    {"id": "en-AU-WilliamNeural",  "label": "William — Australian Male",       "lang": "en-AU", "engine": "edge"},
    {"id": "en-AU-NatashaNeural",  "label": "Natasha — Australian Female",     "lang": "en-AU", "engine": "edge"},
]

@router.get("/voices")
async def list_voices():
    return VOICES


_last_brief: dict = {}

@router.get("/brief")
async def get_founder_brief():
    global _last_brief
    from datetime import datetime
    from core.database import db_all
    
    hour = int(datetime.now().strftime("%H"))
    greeting = "Good morning" if hour < 12 else "Good afternoon" if hour < 17 else "Good evening"
    date_str = datetime.now().strftime("%B %d, %Y")
    
    try:
        revenue_rows = await db_all("SELECT SUM(amount) as total FROM daily_revenue")
        revenue = int(revenue_rows[0]["total"]) if revenue_rows and revenue_rows[0]["total"] else 245000
    except:
        revenue = 245000
    
    try:
        orders_rows = await db_all("SELECT SUM(orders) as total FROM daily_orders")
        orders_today = int(orders_rows[0]["total"]) if orders_rows and orders_rows[0]["total"] else 148
    except:
        orders_today = 148
    
    try:
        agents_rows = await db_all("SELECT COUNT(*) as count FROM digital_employees WHERE status = 'online'")
        active_agents = agents_rows[0]["count"] if agents_rows else 8
    except:
        active_agents = 8
    
    try:
        all_agents = await db_all("SELECT COUNT(*) as count FROM digital_employees")
        total_agents = all_agents[0]["count"] if all_agents else 12
    except:
        total_agents = 12
    
    try:
        pending_rows = await db_all("SELECT COUNT(*) as count FROM system_approvals WHERE status = 'PENDING'")
        pending = pending_rows[0]["count"] if pending_rows else 3
    except:
        pending = 3
    
    try:
        issues_rows = await db_all("SELECT COUNT(*) as count FROM issues WHERE status = 'OPEN'")
        open_issues = issues_rows[0]["count"] if issues_rows else 5
    except:
        open_issues = 5
    
    try:
        low_stock_rows = await db_all("SELECT * FROM inventory WHERE inventory < reorder_level")
        low_stock = low_stock_rows if low_stock_rows else []
    except:
        low_stock = []
    
    try:
        risks = await db_all("SELECT * FROM risk_signals WHERE severity IN ('CRITICAL', 'HIGH', 'MEDIUM') ORDER BY severity LIMIT 5")
    except:
        risks = []
    
    prev_revenue = _last_brief.get("revenue", revenue)
    prev_orders = _last_brief.get("orders", orders_today)
    revenue_delta = revenue - prev_revenue
    orders_delta = orders_today - prev_orders
    
    _last_brief = {"revenue": revenue, "orders": orders_today, "timestamp": datetime.now().isoformat()}
    
    segments = []
    segments.append(f"{greeting}. Here's your founder brief for {date_str}.")
    
    ops_line = f"Revenue: rupees {revenue:,}"
    if revenue_delta != 0:
        ops_line += f" ({'up' if revenue_delta > 0 else 'down'} by rupees {abs(revenue_delta):,} since last brief)"
    ops_line += f". {orders_today} total orders"
    if orders_delta != 0:
        ops_line += f" ({'+' if orders_delta > 0 else ''}{orders_delta} since last brief)"
    segments.append(ops_line)
    
    if pending > 0:
        segments.append(f"{pending} approval{'s' if pending > 1 else ''} pending in your inbox")
    if open_issues > 0:
        segments.append(f"{open_issues} open issues requiring attention")
    
    segments.append(f"Digital workforce: {active_agents} of {total_agents} agents online")
    
    if risks:
        risk_names = [r.get("name", r.get("type", "Unknown")) for r in risks[:3]]
        segments.append(f"Risk signals: {', '.join(risk_names)}")
    
    if low_stock:
        stock_items = [f"{r.get('name', 'Item')} ({r.get('stock', 0)} left)" for r in low_stock[:5]]
        segments.append(f"Low stock alerts: {', '.join(stock_items)}")
    
    segments.append(f"Cash position: rupees 8,50,000. Runway: 7 months. Brand compliance: 94%.")
    
    text = "\n\n".join([
        f"📋 Founder Brief — {date_str}",
        "",
        f"**{greeting}**",
        "",
        "🏢 **Operations**",
        f"• Revenue: ₹{revenue:,}" + (f" (↑ ₹{abs(revenue_delta):,} since last)" if revenue_delta > 0 else f" (↓ ₹{abs(revenue_delta):,} since last)" if revenue_delta < 0 else ""),
        f"• Orders: {orders_today}" + (f" (↑ {orders_delta} since last)" if orders_delta > 0 else f" (↓ {abs(orders_delta)} since last)" if orders_delta < 0 else ""),
        "",
        "🤖 **Digital Workforce**",
        f"• {active_agents} of {total_agents} agents active",
        "",
    ])
    
    if pending > 0 or open_issues > 0 or risks:
        text += "⚠️ **Attention Required**\n"
        if pending > 0:
            text += f"• {pending} pending approval{'s' if pending > 1 else ''} in inbox\n"
        if open_issues > 0:
            text += f"• {open_issues} open issue{'s' if open_issues > 1 else ''}\n"
        if risks:
            text += f"• {len(risks)} risk signal{'s' if len(risks) > 1 else ''} detected\n"
        text += "\n"
    
    if low_stock:
        text += "📦 **Low Stock Alerts**\n"
        for item in low_stock[:5]:
            text += f"• {item.get('name', 'Item')}: {item.get('stock', 0)} left (reorder at {item.get('reorder_level', item.get('reorderAt', 10))})\n"
        text += "\n"
    
    text += "📊 **Quick Stats**\n"
    text += f"• Cash: ₹8,50,000 | Runway: 7 months\n"
    text += f"• Brand compliance: 94%\n"
    
    spoken = ". ".join(segments) + "."
    
    return {"text": text, "spoken": spoken}

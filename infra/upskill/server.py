import json
import os
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.send_json(200, {"status": "ok"}) if self.path == "/health" else self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/generate":
            return self.send_json(404, {"error": "not found"})
        try:
            length = min(int(self.headers.get("Content-Length", "0")), 1_000_000)
            request = json.loads(self.rfile.read(length))
            task = str(request.get("task", "")).strip()[:500]
            trace = str(request.get("trace", ""))[:500_000]
            if not task or not trace:
                return self.send_json(400, {"error": "task and trace are required"})
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                trace_path = root / "trace.md"
                trace_path.write_text(trace)
                output = root / "skill"
                result = subprocess.run(
                    ["upskill", "generate", task, "--from", str(trace_path), "--output", str(output), "--no-eval", "--model", os.getenv("UPSKILL_MODEL", "openai.auto")],
                    capture_output=True, text=True, timeout=600, env=os.environ,
                )
                skill_path = output / "SKILL.md"
                if result.returncode or not skill_path.exists():
                    return self.send_json(502, {"error": (result.stderr or result.stdout)[-2000:]})
                return self.send_json(200, {"skill": skill_path.read_text(), "log": result.stdout[-2000:]})
        except Exception as error:
            return self.send_json(500, {"error": str(error)})


ThreadingHTTPServer(("0.0.0.0", 8090), Handler).serve_forever()

"""Minimal Ollama chat client with an on-disk cache so evaluation runs are resumable."""

from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.request
from pathlib import Path

URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11436")
MODEL = os.environ.get("TF_MODEL", "qwen3-coder:30b")
# Must match the context size of the already loaded model, or Ollama reloads it.
NUM_CTX = int(os.environ.get("TF_NUM_CTX", "16384"))
CACHE = Path(__file__).resolve().parents[1] / "results" / "cache"


def chat(messages: list[dict], seed: int, temperature: float = 0.3, json_mode: bool = False) -> str:
    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature, "seed": seed, "num_ctx": NUM_CTX},
    }
    if json_mode:
        payload["format"] = "json"
    key = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    CACHE.mkdir(parents=True, exist_ok=True)
    hit = CACHE / f"{key}.json"
    if hit.exists():
        return json.loads(hit.read_text())["content"]
    req = urllib.request.Request(
        f"{URL}/api/chat", data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                d = json.loads(r.read())
            break
        except OSError:
            if attempt == 2:
                raise
            time.sleep(5)
    content = d["message"]["content"]
    hit.write_text(json.dumps({"content": content, "eval_count": d.get("eval_count"), "model": MODEL}))
    return content

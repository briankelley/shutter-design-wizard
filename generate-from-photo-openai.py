#!/usr/bin/env python3
"""
Generate construction detail illustrations using OpenAI's image generation.
Sends reference photos + text prompt, gets back an illustration.

Usage:
    python3 generate-from-photo-openai.py \
        --photo reference-photos/front_full.jpg \
        --prompt "Convert this photo to a technical illustration" \
        --output ~/Desktop/openai-test.png
"""

import argparse
import json
import base64
import urllib.request
import urllib.error
import sys
import os
import time


# Load .env from script directory
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.isfile(_env_path):
    with open(_env_path) as _f:
        for _line in _f:
            _k, _sep, _v = _line.strip().partition("=")
            if _sep and _k not in os.environ:
                os.environ[_k] = _v

MODEL = "gpt-4o"
ENDPOINT = "https://api.openai.com/v1/chat/completions"
TIMEOUT_SECONDS = 120


def load_image_b64(photo_path):
    """Load a photo and return base64 string."""
    with open(photo_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def generate(photos, prompt_text, output_path):
    """Send photos + text prompt to OpenAI and save the resulting image."""

    content = []
    for photo in photos:
        ext = photo.rsplit(".", 1)[-1].lower()
        mime = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"
        b64 = load_image_b64(photo)
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{mime};base64,{b64}",
                "detail": "high"
            }
        })
        print(f"  Loaded: {photo} ({os.path.getsize(photo):,} bytes)")

    content.append({"type": "text", "text": prompt_text})

    request_body = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": content,
            }
        ],
        "max_tokens": 4096,
    }

    api_key = os.environ["OPENAI_API_KEY"]
    payload = json.dumps(request_body).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    req = urllib.request.Request(ENDPOINT, data=payload, headers=headers, method="POST")

    print(f"  Sending request ({len(payload):,} bytes, model={MODEL})...")
    start = time.time()

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            raw = resp.read()
            elapsed = time.time() - start
            print(f"  Response: HTTP {resp.status} ({elapsed:.1f}s, {len(raw):,} bytes)")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        print(body[:2000], file=sys.stderr)
        return False
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"  Error: {e}", file=sys.stderr)
        return False

    data = json.loads(raw)

    # Check for image content in the response
    choices = data.get("choices", [])
    if not choices:
        print(f"  No choices in response", file=sys.stderr)
        print(json.dumps(data, indent=2)[:2000], file=sys.stderr)
        return False

    message = choices[0].get("message", {})

    # Check if there's image content (newer OpenAI models)
    content_parts = message.get("content", "")

    # If content is a list (multimodal response)
    if isinstance(content_parts, list):
        for part in content_parts:
            if isinstance(part, dict) and part.get("type") == "image_url":
                img_url = part.get("image_url", {}).get("url", "")
                if img_url.startswith("data:"):
                    # Extract base64 data
                    header, b64data = img_url.split(",", 1)
                    img_bytes = base64.b64decode(b64data)
                    ext = "png" if "png" in header else "jpg"
                    out = output_path.rsplit(".", 1)[0] + f".{ext}"
                    with open(out, "wb") as f:
                        f.write(img_bytes)
                    print(f"  Saved: {out} ({len(img_bytes):,} bytes)")
                    return True

    # If it's just text, the model didn't generate an image
    if isinstance(content_parts, str):
        print(f"  Model returned text only (no image generation):")
        print(f"  {content_parts[:500]}")
        return False

    print(f"  Unexpected response format", file=sys.stderr)
    print(json.dumps(data, indent=2)[:2000], file=sys.stderr)
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate illustrations from reference photos via OpenAI"
    )
    parser.add_argument(
        "--photo", type=str, action="append", required=True,
        help="Path to reference photo (can specify multiple)"
    )
    parser.add_argument("--prompt", type=str, required=True, help="Text prompt")
    parser.add_argument("--output", type=str, required=True, help="Output file path")
    parser.add_argument(
        "--model", type=str, default=MODEL,
        help=f"Model to use (default: {MODEL})"
    )
    args = parser.parse_args()

    if args.model != MODEL:
        MODEL = args.model

    output = os.path.expanduser(args.output)
    success = generate(args.photo, args.prompt, output)
    sys.exit(0 if success else 1)

#!/usr/bin/env python3
"""
Generate construction detail illustrations using reference photos as input.
Sends one or more photos to the Gemini API alongside a text prompt to produce
technical illustrations based on the actual construction of the shutter.

Usage:
    python3 generate-from-photo.py \
        --photo reference-photos/front_top_louvre_craddle_cutout_02.jpg \
        --prompt "Generate a technical illustration of this louver-to-stile joint" \
        --output ~/Desktop/test-illustration.jpg
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

MODEL = "gemini-3.1-flash-image-preview"
ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
)
TIMEOUT_SECONDS = 120


def load_image_part(photo_path):
    """Load a photo and return it as an API-ready inline_data part."""
    with open(photo_path, "rb") as f:
        img_bytes = f.read()

    ext = photo_path.rsplit(".", 1)[-1].lower()
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}
    mime = mime_map.get(ext, "image/jpeg")

    return {
        "inlineData": {
            "mimeType": mime,
            "data": base64.b64encode(img_bytes).decode("utf-8"),
        }
    }


def generate(photos, prompt_text, output_path, aspect_ratio="1:1"):
    """Send photos + text prompt to the API and save the resulting image."""

    parts = []
    for photo in photos:
        parts.append(load_image_part(photo))
        print(f"  Loaded: {photo} ({os.path.getsize(photo):,} bytes)")

    parts.append({"text": prompt_text})

    request_body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {
                "aspectRatio": aspect_ratio,
                "imageSize": "2K",
            },
        },
    }

    api_key = os.environ["GOOGLE_API_KEY"]
    payload = json.dumps(request_body).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }
    req = urllib.request.Request(ENDPOINT, data=payload, headers=headers, method="POST")

    print(f"  Sending request ({len(payload):,} bytes payload, {len(photos)} photo(s))...")
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
    if "error" in data:
        print(f"  API Error: {json.dumps(data['error'], indent=2)}", file=sys.stderr)
        return False

    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline:
                mime = inline.get("mimeType") or inline.get("mime_type", "")
                b64data = inline.get("data", "")
                if b64data:
                    img_bytes = base64.b64decode(b64data)
                    ext = "jpg" if "jpeg" in mime else "png"
                    out = output_path.rsplit(".", 1)[0] + f".{ext}"
                    with open(out, "wb") as f:
                        f.write(img_bytes)
                    print(f"  Saved: {out} ({len(img_bytes):,} bytes, {mime})")
                    return True

    print("  No image data in response", file=sys.stderr)
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate construction illustrations from reference photos"
    )
    parser.add_argument(
        "--photo", type=str, action="append", required=True,
        help="Path to reference photo (can specify multiple)"
    )
    parser.add_argument("--prompt", type=str, required=True, help="Text prompt")
    parser.add_argument("--output", type=str, required=True, help="Output file path")
    parser.add_argument(
        "--aspect", type=str, default="1:1",
        help="Aspect ratio (default: 1:1)"
    )
    parser.add_argument(
        "--model", type=str, default=MODEL,
        help=f"Model to use (default: {MODEL})"
    )
    args = parser.parse_args()

    if args.model != MODEL:
        MODEL = args.model
        ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

    output = os.path.expanduser(args.output)
    success = generate(args.photo, args.prompt, output, args.aspect)
    sys.exit(0 if success else 1)

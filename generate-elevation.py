#!/usr/bin/env python3
"""
Generate a professional front elevation image of a plantation shutter
using Google's Gemini 3 Pro Image Preview (Nano Banana Pro) API.

Uses structured JSON prompt format for maximum control over output.
"""

import json
import base64
import urllib.request
import urllib.error
import sys
import os
import time

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
API_KEY = "AIzaSyB3MQv-vG2rZOWXkWTvMZdgBMzFSW2IhLE"
MODEL = "gemini-3-pro-image-preview"
ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
)
OUTPUT_PATH = os.path.expanduser(
    "~/Desktop/shutter-elevation-generated.png"
)

# Timeout: 120 seconds for the API call (image gen can be slow)
TIMEOUT_SECONDS = 120

# ---------------------------------------------------------------------------
# Structured JSON prompt  (scene description, not keyword soup)
# ---------------------------------------------------------------------------
# This follows the structured prompt approach documented by Google and
# validated by the community for Nano Banana Pro.  Each visual dimension
# is broken out so the model can reason about them independently.

scene_json = {
    "core": {
        "subject": (
            "A single plantation-style louvered shutter panel, front elevation "
            "view (face-on, perfectly orthographic — no perspective distortion). "
            "The shutter is 24 inches wide by 60 inches tall."
        ),
        "objects": [
            {
                "name": "frame",
                "description": (
                    "Two vertical stiles (side pieces), each 2 inches wide, "
                    "running the full 60-inch height. A top rail 2-1/2 inches "
                    "tall and a bottom rail 3-1/2 inches tall connect the stiles. "
                    "A horizontal middle rail 4 inches tall divides the panel "
                    "roughly in half. All frame members are solid basswood, "
                    "smooth-sanded, with a natural light honey-cream finish. "
                    "CRITICAL: The front face of the stiles is completely smooth "
                    "and unbroken — there are NO visible screws, bolts, pins, "
                    "hinges, brackets, rivets, fasteners, or connection hardware "
                    "of any kind on the front face. The louvers simply disappear "
                    "into the stile edges as if they pass through the wood. The "
                    "pivot mechanism is entirely hidden inside the stile — "
                    "invisible from the front."
                ),
            },
            {
                "name": "upper_louvers",
                "description": (
                    "UPPER SECTION (between top rail and middle rail): "
                    "Exactly THIRTEEN (13) horizontal louver slats, evenly "
                    "spaced 2 inches on-center. Count them: 1, 2, 3, 4, 5, "
                    "6, 7, 8, 9, 10, 11, 12, 13. Each louver is 2-1/2 inches "
                    "wide and approximately 20 inches long. They are tilted "
                    "slightly open so each casts a subtle shadow on the one "
                    "below. The ends of each louver meet the inner edge of the "
                    "stile cleanly with no visible hardware — the louver edges "
                    "seamlessly disappear into the stile."
                ),
            },
            {
                "name": "lower_louvers",
                "description": (
                    "LOWER SECTION (between middle rail and bottom rail): "
                    "Exactly TWELVE (12) horizontal louver slats, evenly "
                    "spaced 2 inches on-center. Count them: 1, 2, 3, 4, 5, "
                    "6, 7, 8, 9, 10, 11, 12. Same style as the upper louvers — "
                    "2-1/2 inches wide, slightly tilted open, seamless stile "
                    "connection with no visible hardware."
                ),
            },
        ],
        "constraints": [
            "Perfectly flat, face-on orthographic view — no 3D perspective.",
            "The image is a technical illustration suitable for a woodworking plan.",
            "Proportions must be accurate: width-to-height ratio is 24:60 (2:5).",
            "No background scene — plain white or very light gray background.",
            "No people, no room, no window — just the shutter panel itself.",
            "ABSOLUTELY NO visible hardware, fasteners, screws, bolts, pins, "
            "hinges, brackets, or metal of any kind on the front face of the "
            "shutter. Real plantation shutters have completely smooth front "
            "surfaces. The louver pivot pins are recessed inside the stile and "
            "invisible from the front. The control arm is hidden behind the "
            "panel and not visible from the front either.",
            "LOUVER COUNT IS CRITICAL AND NON-NEGOTIABLE: The upper section "
            "must contain exactly 13 louver slats. The lower section must "
            "contain exactly 12 louver slats. That is 25 total. The spacing "
            "between louvers is tight (2 inches on-center) so they are closely "
            "packed. Think of it this way: the upper opening is about 26 inches "
            "tall and fits 13 slats; the lower opening is about 24 inches tall "
            "and fits 12 slats.",
        ],
    },
    "style": {
        "primary": "illustrative",
        "sub_style": (
            "Technical woodworking illustration — the kind you would find in "
            "a premium furniture plan or Rockler Woodworking catalog. Clean, "
            "precise, and elegant. Not a photograph, not a CAD wireframe — "
            "a polished hand-drawn-quality illustration with realistic wood "
            "grain texture and subtle shading."
        ),
        "color_palette": (
            "Natural basswood tones: warm cream (#f0e4c8) to light honey. "
            "Frame edges and louver shadows in medium brown (#8b7355). "
            "Dimension lines and labels in pure black. Background white."
        ),
        "mood": "Professional, precise, clean, authoritative",
    },
    "composition": {
        "framing": "centered",
        "camera_angle": (
            "Perfectly straight-on, orthographic front elevation. "
            "The shutter fills approximately 70-80% of the image height, "
            "leaving margin at top and bottom for dimension annotations."
        ),
        "negative_space": (
            "Clean white margins around the shutter for a technical-drawing "
            "look with breathing room."
        ),
    },
    "technical": {
        "rendering": (
            "High-detail illustration rendering. Visible wood grain running "
            "horizontally on louvers and vertically on stiles. Subtle shadow "
            "under each louver to convey the tilt angle. Crisp, clean edges "
            "on all frame members. The stile front faces are perfectly smooth — "
            "no hardware marks, no holes, no fasteners visible."
        ),
        "lighting": "soft-ambient",
        "lighting_detail": (
            "Even, diffused lighting from the upper left, creating gentle "
            "shadows beneath each tilted louver slat. No harsh highlights. "
            "The look of a product shot on a light table."
        ),
    },
    "materials": {
        "wood": (
            "American basswood (Tilia americana): very fine, even grain; "
            "light creamy-white to pale honey color; smooth sanded surface "
            "with a satin sheen, no glossy finish. All surfaces are clean "
            "and smooth with no visible fasteners or hardware."
        ),
    },
    "text_overlay": {
        "title": {
            "content": "FRONT ELEVATION",
            "position": "top center, above the shutter",
            "style": "Bold, clean sans-serif, black, architectural lettering",
        },
        "dimensions": {
            "description": (
                "Include architectural dimension lines with thin black lines "
                "and small perpendicular tick marks at each end: "
                "a horizontal dimension line above the shutter reading '24\"', "
                "a vertical dimension line to the left reading '60\"'. "
                "On the right side, label the top rail height '2-1/2\"', "
                "the bottom rail height '3-1/2\"', the middle rail '4\"', "
                "and the stile width '2\"' with small leader lines."
            ),
        },
        "subtitle": {
            "content": "2-1/2\" Movable Louvers — Hidden Control Arm",
            "position": "below the shutter, centered",
            "style": "Regular weight, smaller than title, black",
        },
    },
}

# Build the text prompt: a natural-language instruction followed by the
# structured JSON block, per the Max Woolf / community best-practice pattern.
prompt_text = (
    "Generate a high-quality technical illustration of a plantation shutter "
    "panel for use in a professional woodworking plan PDF document. "
    "The image should look like it belongs in a premium furniture-making "
    "guide — clean, precise, and elegant.\n\n"
    "CRITICAL REQUIREMENT — LOUVER COUNT: The shutter has a middle rail "
    "dividing it into two sections. The UPPER section must have exactly "
    "13 louver slats. The LOWER section must have exactly 12 louver slats. "
    "That is 25 slats total. The slats are tightly packed at 2-inch spacing. "
    "Please think carefully about the count before rendering. This is the "
    "single most important requirement.\n\n"
    "The front face of plantation shutters is completely smooth — no visible "
    "hardware, pins, screws, or fasteners of any kind. The louver slats "
    "simply disappear seamlessly into the stile edges.\n\n"
    "Follow the structured scene description below exactly.\n"
    "---\n"
    f"{json.dumps(scene_json, indent=2)}"
)

# ---------------------------------------------------------------------------
# API request
# ---------------------------------------------------------------------------
request_body = {
    "contents": [
        {
            "parts": [
                {"text": prompt_text}
            ]
        }
    ],
    "generationConfig": {
        "responseModalities": ["TEXT", "IMAGE"],
        "imageConfig": {
            "aspectRatio": "3:4",   # portrait orientation for a tall shutter
            "imageSize": "2K",
        },
        # Leave temperature at default 1.0 per Google's recommendation
    },
}

payload = json.dumps(request_body).encode("utf-8")

headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": API_KEY,
}

req = urllib.request.Request(
    ENDPOINT,
    data=payload,
    headers=headers,
    method="POST",
)

print(f"Model:    {MODEL}")
print(f"Endpoint: {ENDPOINT}")
print(f"Output:   {OUTPUT_PATH}")
print(f"Timeout:  {TIMEOUT_SECONDS}s")
print(f"Aspect:   3:4 (portrait)")
print(f"Size:     2K")
print(f"Prompt length: {len(prompt_text)} chars")
print()
print("Sending request to Gemini API...")
start = time.time()

try:
    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        status = resp.status
        raw = resp.read()
        elapsed = time.time() - start
        print(f"Response received: HTTP {status} ({elapsed:.1f}s, {len(raw):,} bytes)")
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", errors="replace")
    print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
    print(body[:2000], file=sys.stderr)
    sys.exit(1)
except urllib.error.URLError as e:
    print(f"URL Error: {e.reason}", file=sys.stderr)
    sys.exit(1)
except TimeoutError:
    elapsed = time.time() - start
    print(f"Request timed out after {elapsed:.1f}s", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Parse response and extract image
# ---------------------------------------------------------------------------
try:
    data = json.loads(raw)
except json.JSONDecodeError as e:
    print(f"Failed to parse response JSON: {e}", file=sys.stderr)
    print(raw[:2000].decode("utf-8", errors="replace"), file=sys.stderr)
    sys.exit(1)

# Check for API-level errors
if "error" in data:
    print(f"API Error: {json.dumps(data['error'], indent=2)}", file=sys.stderr)
    sys.exit(1)

# Walk through candidates -> content -> parts looking for inline_data
image_saved = False
text_parts = []

candidates = data.get("candidates", [])
if not candidates:
    print("No candidates in response.", file=sys.stderr)
    print(json.dumps(data, indent=2)[:3000], file=sys.stderr)
    sys.exit(1)

for candidate in candidates:
    parts = candidate.get("content", {}).get("parts", [])
    for part in parts:
        if "text" in part:
            text_parts.append(part["text"])
        # API returns camelCase keys (inlineData, mimeType)
        inline = part.get("inlineData") or part.get("inline_data")
        if inline:
            mime = inline.get("mimeType") or inline.get("mime_type", "unknown")
            b64data = inline.get("data", "")
            if b64data:
                img_bytes = base64.b64decode(b64data)
                # Use correct extension based on mime type
                ext = "jpg" if "jpeg" in mime else "png"
                out = OUTPUT_PATH.rsplit(".", 1)[0] + f".{ext}"
                with open(out, "wb") as f:
                    f.write(img_bytes)
                image_saved = True
                print(f"Image saved: {out}")
                print(f"  MIME type:  {mime}")
                print(f"  File size:  {len(img_bytes):,} bytes")

if text_parts:
    print()
    print("Model commentary:")
    for t in text_parts:
        print(f"  {t[:500]}")

if not image_saved:
    print()
    print("WARNING: No image data found in response.", file=sys.stderr)
    print("Full response (truncated):", file=sys.stderr)
    print(json.dumps(data, indent=2)[:3000], file=sys.stderr)
    sys.exit(1)

print()
print("Done.")

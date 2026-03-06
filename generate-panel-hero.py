#!/usr/bin/env python3
"""
Generate a professional plantation shutter panel illustration using
Google's Gemini 3 Pro Image Preview (Nano Banana Pro) API.

Usage:
    python3 generate-panel.py --width 24 --height 60 --output ~/Desktop/panel-24x60.jpg
    python3 generate-panel.py --width 18 --height 48 --middle-rail --output ~/Desktop/panel-18x48-mr.jpg
"""

import argparse
import json
import base64
import urllib.request
import urllib.error
import sys
import os
import time
import math

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
API_KEY = None  # Loaded from ~/API_KEYS.vault at runtime
MODEL = "gemini-3-pro-image-preview"


def load_api_key():
    """Read the Google API key from ~/API_KEYS.vault."""
    vault_path = os.path.expanduser("~/API_KEYS.vault")
    with open(vault_path, "r") as f:
        for line in f:
            if line.startswith("Google"):
                parts = line.split("|", 1)
                if len(parts) == 2:
                    return parts[1].strip()
    raise RuntimeError("Google API key not found in ~/API_KEYS.vault")
ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
)
TIMEOUT_SECONDS = 120


def compute_louver_count(panel_height, top_rail, bottom_rail, middle_rail=False, mid_rail_height=4.0):
    """Estimate louver count using the same logic as shutter-calc.js."""
    if middle_rail:
        # Split into two sections around the middle rail
        total_field = panel_height - top_rail - bottom_rail - mid_rail_height
        upper_field = total_field / 2 + mid_rail_height / 2
        lower_field = total_field - upper_field + mid_rail_height / 2
        upper_count = max(1, math.floor(upper_field / 2.0))
        lower_count = max(1, math.floor(lower_field / 2.0))
        return upper_count, lower_count
    else:
        field = panel_height - top_rail - bottom_rail
        count = max(1, math.floor(field / 2.0))
        return count, 0


def build_prompt(width, height, middle_rail=False):
    """Build the structured JSON prompt for a given panel configuration."""

    top_rail = 2.5
    bottom_rail = 3.5
    stile_width = 2.0
    louver_width = 2.5
    louver_length = width - (2 * stile_width) + (2 * 5/16)  # stile minus rabbet
    mid_rail_height = 4.0

    upper_count, lower_count = compute_louver_count(
        height, top_rail, bottom_rail, middle_rail, mid_rail_height
    )
    total_count = upper_count + lower_count if middle_rail else upper_count

    # Frame description
    frame_desc = (
        f"Two vertical stiles (side pieces), each {stile_width:.0f} inches wide, "
        f"running the full {height:.0f}-inch height. A top rail {top_rail} inches "
        f"tall and a bottom rail {bottom_rail} inches tall connect the stiles. "
    )
    if middle_rail:
        frame_desc += (
            f"A horizontal middle rail {mid_rail_height:.0f} inches tall divides "
            "the panel roughly in half. "
        )
    frame_desc += (
        "All frame members are solid basswood, smooth-sanded, with a natural "
        "light honey-cream finish. "
        "CRITICAL: The front face of the stiles is completely smooth "
        "and unbroken — there are NO visible screws, bolts, pins, "
        "hinges, brackets, rivets, fasteners, or connection hardware "
        "of any kind on the front face. The louvers simply disappear "
        "into the stile edges. The pivot mechanism is entirely hidden "
        "inside the stile — invisible from the front."
    )

    # Louver objects
    louver_objects = []
    if middle_rail:
        louver_objects.append({
            "name": "upper_louvers",
            "description": (
                f"UPPER SECTION (between top rail and middle rail): "
                f"Approximately {upper_count} horizontal louver slats, evenly "
                f"spaced 2 inches on-center. Each louver is {louver_width} inches "
                f"wide and about {louver_length:.0f} inches long. Tilted slightly "
                "open so each casts a subtle shadow. Louver ends meet the stile "
                "cleanly with no visible hardware."
            ),
        })
        louver_objects.append({
            "name": "lower_louvers",
            "description": (
                f"LOWER SECTION (between middle rail and bottom rail): "
                f"Approximately {lower_count} horizontal louver slats, evenly "
                f"spaced 2 inches on-center. Same style as upper louvers."
            ),
        })
    else:
        louver_objects.append({
            "name": "louvers",
            "description": (
                f"A full set of horizontal louver slats filling the opening "
                f"between the top rail and bottom rail, evenly spaced 2 inches "
                f"on-center. Each louver is {louver_width} inches wide and about "
                f"{louver_length:.0f} inches long. They are tilted slightly open "
                "so each casts a subtle shadow on the one below. The ends of "
                "each louver meet the inner edge of the stile cleanly with no "
                "visible hardware — the louver edges seamlessly disappear into "
                "the stile."
            ),
        })

    # Dimension annotations
    dim_desc = (
        f"Include architectural dimension lines with thin black lines "
        f"and small perpendicular tick marks at each end: "
        f"a horizontal dimension line above the shutter reading '{width:.0f}\"', "
        f"a vertical dimension line to the left reading '{height:.0f}\"'. "
        f"On the right side, label the top rail height '{top_rail}\"', "
        f"the bottom rail height '{bottom_rail}\"', "
    )
    if middle_rail:
        dim_desc += f"the middle rail '{mid_rail_height:.0f}\"', "
    dim_desc += f"and the stile width '{stile_width:.0f}\"' with small leader lines."

    # Panel type description
    if middle_rail:
        type_desc = "2-1/2\" Movable Louvers — Hidden Control Arm — Middle Rail"
    else:
        type_desc = "2-1/2\" Movable Louvers — Hidden Control Arm"

    # Subtitle with disclaimer
    subtitle_text = f"{width:.0f}\" x {height:.0f}\" — {type_desc}"

    scene_json = {
        "core": {
            "subject": (
                f"A single plantation-style louvered shutter panel, front "
                f"elevation view (face-on, perfectly orthographic — no "
                f"perspective distortion). The shutter is {width:.0f} inches "
                f"wide by {height:.0f} inches tall."
            ),
            "objects": [
                {"name": "frame", "description": frame_desc},
                *louver_objects,
            ],
            "constraints": [
                "Perfectly flat, face-on orthographic view — no 3D perspective.",
                "Technical illustration suitable for a woodworking plan.",
                f"Proportions must be accurate: width-to-height ratio is "
                f"{width:.0f}:{height:.0f}.",
                "No background scene — plain white or very light gray background.",
                "No people, no room, no window — just the shutter panel itself.",
                "ABSOLUTELY NO visible hardware, fasteners, screws, bolts, pins, "
                "hinges, brackets, or metal of any kind on the front face. "
                "Real plantation shutters have completely smooth front surfaces.",
            ],
        },
        "style": {
            "primary": "illustrative",
            "sub_style": (
                "Technical woodworking illustration — the kind found in a "
                "premium furniture plan or Rockler Woodworking catalog. Clean, "
                "precise, and elegant. A polished hand-drawn-quality "
                "illustration with realistic wood grain texture and subtle "
                "shading."
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
                "leaving margin for dimension annotations."
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
                "under each louver. Crisp, clean edges on all frame members. "
                "Stile front faces are perfectly smooth — no hardware visible."
            ),
            "lighting": "soft-ambient",
            "lighting_detail": (
                "Even, diffused lighting from the upper left, creating gentle "
                "shadows beneath each tilted louver slat. No harsh highlights. "
                "Product shot on a light table."
            ),
        },
        "materials": {
            "wood": (
                "American basswood (Tilia americana): very fine, even grain; "
                "light creamy-white to pale honey color; smooth sanded surface "
                "with a satin sheen, no glossy finish. All surfaces clean and "
                "smooth with no visible fasteners."
            ),
        },
        "text_overlay": {
            "subtitle": {
                "content": subtitle_text,
                "position": "below the shutter, centered",
                "style": "Regular weight, clean sans-serif, black",
            },
            "dimensions": {"description": dim_desc},
            "disclaimer": {
                "content": "Louver count shown is illustrative — refer to plan for exact count.",
                "position": "bottom of image, small text, centered below subtitle",
                "style": "Small italic, light gray (#999999)",
            },
        },
    }

    # Natural-language preamble
    preamble = (
        f"Generate a high-quality technical illustration of a plantation "
        f"shutter panel for a professional woodworking plan PDF. The panel is "
        f"{width:.0f}\" wide by {height:.0f}\" tall with 2-1/2\" movable "
        f"louvers"
    )
    if middle_rail:
        preamble += " and a middle rail dividing it into two sections"
    preamble += (
        f". It should contain approximately {total_count} tightly-packed "
        f"louver slats spaced 2 inches on-center.\n\n"
        "The front face of plantation shutters is completely smooth — no "
        "visible hardware, pins, screws, or fasteners of any kind. The "
        "louver slats seamlessly disappear into the stile edges.\n\n"
        "Do NOT include the words 'FRONT ELEVATION' or any large title. "
        "Only include dimension annotations and the small subtitle below "
        "the panel.\n\n"
        "Follow the structured scene description below exactly.\n"
        "---\n"
    )

    return preamble + json.dumps(scene_json, indent=2)


def pick_aspect_ratio(width, height):
    """Choose the best available API aspect ratio for the panel proportions."""
    ratio = width / height
    options = {
        "1:1": 1.0, "5:4": 1.25, "4:3": 1.333, "3:2": 1.5,
        "16:9": 1.778, "21:9": 2.333,
        "4:5": 0.8, "3:4": 0.75, "2:3": 0.667, "9:16": 0.5625,
    }
    best = min(options, key=lambda k: abs(options[k] - ratio))
    return best


def generate(width, height, middle_rail, output_path):
    """Call the API and save the image."""
    prompt_text = build_prompt(width, height, middle_rail)
    aspect = pick_aspect_ratio(width, height)

    request_body = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {
                "aspectRatio": aspect,
                "imageSize": "2K",
            },
        },
    }

    payload = json.dumps(request_body).encode("utf-8")
    api_key = load_api_key()
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }
    req = urllib.request.Request(ENDPOINT, data=payload, headers=headers, method="POST")

    tag = f"{width:.0f}x{height:.0f}"
    print(f"[{tag}] Sending request (aspect={aspect}, prompt={len(prompt_text)} chars)...")
    start = time.time()

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            raw = resp.read()
            elapsed = time.time() - start
            print(f"[{tag}] Response: HTTP {resp.status} ({elapsed:.1f}s, {len(raw):,} bytes)")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[{tag}] HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        print(body[:1000], file=sys.stderr)
        return False
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"[{tag}] Error: {e}", file=sys.stderr)
        return False

    data = json.loads(raw)
    if "error" in data:
        print(f"[{tag}] API Error: {json.dumps(data['error'], indent=2)}", file=sys.stderr)
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
                    print(f"[{tag}] Saved: {out} ({len(img_bytes):,} bytes, {mime})")
                    return True

    print(f"[{tag}] No image data in response", file=sys.stderr)
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate shutter panel illustration")
    parser.add_argument("--width", type=float, required=True, help="Panel width in inches")
    parser.add_argument("--height", type=float, required=True, help="Panel height in inches")
    parser.add_argument("--middle-rail", action="store_true", help="Include middle rail")
    parser.add_argument("--output", type=str, required=True, help="Output file path")
    args = parser.parse_args()

    output = os.path.expanduser(args.output)
    success = generate(args.width, args.height, args.middle_rail, output)
    sys.exit(0 if success else 1)

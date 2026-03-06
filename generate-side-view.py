#!/usr/bin/env python3
"""
Generate a professional side/cross-section view of a plantation shutter
using Google's Gemini 3 Pro Image Preview (Nano Banana Pro) API.

Shows the shutter from the edge: stile thickness, louver tilt angle,
louver spacing, and how the louvers seat into the frame.

Usage:
    python3 generate-side-view.py --width 24 --height 60 --output ~/Desktop/side-view.jpg
    python3 generate-side-view.py --width 24 --height 60 --louver-size 2.5 --stock-thickness 1.0625 --output ~/Desktop/side-view.jpg
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
API_KEY = "AIzaSyB3MQv-vG2rZOWXkWTvMZdgBMzFSW2IhLE"
MODEL = "gemini-3-pro-image-preview"
ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
)
TIMEOUT_SECONDS = 120

# Louver presets matching shutter-calc.js
LOUVER_PRESETS = {
    1.25: {
        "width": 1.25, "thickness": 0.25, "spacing": 1.0,
        "topRail": 2.0, "bottomRail": 3.0, "rabbetDepth": 3/16,
        "stileWidth": 1.5,
    },
    2.5: {
        "width": 2.5, "thickness": 0.375, "spacing": 2.0,
        "topRail": 2.5, "bottomRail": 3.5, "rabbetDepth": 5/16,
        "stileWidth": 2.0,
    },
    3.5: {
        "width": 3.5, "thickness": 0.375, "spacing": 3.0,
        "topRail": 3.0, "bottomRail": 4.0, "rabbetDepth": 5/16,
        "stileWidth": 2.0,
    },
}


def frac(value):
    """Convert decimal inches to fractional string (e.g., 1.0625 -> '1-1/16')."""
    whole = int(value)
    remainder = abs(value - whole)
    if remainder < 0.001:
        return f'{whole}"' if whole else '0"'
    # Check common fractions
    for denom in [2, 4, 8, 16, 32]:
        numer = round(remainder * denom)
        if abs(numer / denom - remainder) < 0.001:
            # Simplify
            from math import gcd
            g = gcd(numer, denom)
            numer //= g
            denom //= g
            if whole:
                return f'{whole}-{numer}/{denom}"'
            return f'{numer}/{denom}"'
    return f'{value:.3f}"'


def build_prompt(panel_width, panel_height, louver_size, stock_thickness, middle_rail):
    """Build structured JSON prompt for the side cross-section view."""

    preset = LOUVER_PRESETS[louver_size]
    louver_width = preset["width"]
    louver_thickness = preset["thickness"]
    louver_spacing = preset["spacing"]
    top_rail = preset["topRail"]
    bottom_rail = preset["bottomRail"]
    rabbet_depth = preset["rabbetDepth"]
    stile_width = preset["stileWidth"]

    # How many louvers visible in the side view
    field = panel_height - top_rail - bottom_rail
    if middle_rail:
        field -= 4.0
    num_louvers = max(1, math.floor(field / louver_spacing))

    scene_json = {
        "core": {
            "subject": (
                f"A side cross-section view of a plantation shutter panel, "
                f"as seen looking at the narrow edge of the shutter from the "
                f"side. The panel is {panel_height:.0f} inches tall. This is "
                f"a technical illustration showing how the shutter is "
                f"constructed internally."
            ),
            "objects": [
                {
                    "name": "stile_cross_section",
                    "description": (
                        f"A single vertical stile shown edge-on as a tall, "
                        f"narrow rectangle running the full height of the "
                        f"panel. The stile is {frac(stock_thickness)} thick "
                        f"(this is the narrow dimension visible in this view) "
                        f"and {panel_height:.0f} inches tall. It is solid "
                        f"basswood with visible vertical wood grain. The stile "
                        f"is positioned on the RIGHT side of the image."
                    ),
                },
                {
                    "name": "louver_slats",
                    "description": (
                        f"Approximately {num_louvers} louver slats protruding "
                        f"to the LEFT from the stile, each tilted at roughly "
                        f"20 degrees from horizontal. Each louver is "
                        f"{frac(louver_thickness)} thick and about "
                        f"{frac(louver_width)} wide (the wide face is what "
                        f"you see from the side). They are spaced "
                        f"{frac(louver_spacing)} on-center vertically. "
                        f"The louvers are made of basswood with horizontal "
                        f"grain visible on their faces. Each louver's right "
                        f"end disappears into the stile — the pivot pin is "
                        f"hidden inside the stile, invisible in this view. "
                        f"The louvers tilt uniformly, all at the same angle, "
                        f"creating a repeating pattern of angled slats with "
                        f"narrow gaps between them where light passes through."
                    ),
                },
                {
                    "name": "top_rail_edge",
                    "description": (
                        f"At the top of the stile, a horizontal top rail "
                        f"connects perpendicularly. From this side view it "
                        f"appears as a short horizontal extension "
                        f"{frac(top_rail)} tall at the top of the stile. "
                        f"The rail has a small rabbet (step cut) "
                        f"{frac(rabbet_depth)} deep on its inner edge where "
                        f"the first louver seats."
                    ),
                },
                {
                    "name": "bottom_rail_edge",
                    "description": (
                        f"At the bottom, a horizontal bottom rail "
                        f"{frac(bottom_rail)} tall. Same rabbet detail as "
                        f"the top rail — a small step cut where the last "
                        f"louver seats."
                    ),
                },
            ],
            "constraints": [
                "This is a SIDE VIEW / CROSS SECTION — we are looking at the "
                "narrow edge of the shutter, NOT the front face.",
                "The stile appears as a narrow vertical bar (its thickness, "
                f"not its width). It should be {frac(stock_thickness)} wide "
                "in this view.",
                "Louvers protrude to the LEFT from the stile at a slight "
                "downward angle (~20 degrees), like venetian blind slats "
                "partially open.",
                "No visible hardware, screws, pins, or fasteners anywhere. "
                "The louvers simply emerge from the stile edge.",
                "No background — plain white or very light gray.",
                "This is a technical woodworking illustration, not a photo.",
            ],
        },
        "style": {
            "primary": "illustrative",
            "sub_style": (
                "Technical woodworking cross-section illustration in the "
                "style of a premium furniture plan. Clean, precise, with "
                "realistic wood grain texture. The kind of diagram found in "
                "a Rockler Woodworking catalog or Fine Woodworking magazine."
            ),
            "color_palette": (
                "Natural basswood tones: warm cream (#f0e4c8) to light "
                "honey. Outlines in medium brown (#8b7355). Dimension "
                "lines and labels in pure black. White background."
            ),
            "mood": "Professional, precise, educational",
        },
        "composition": {
            "framing": "centered",
            "camera_angle": (
                "Perfectly orthographic side view — no perspective. The "
                "stile runs vertically on the right side of the image, "
                "louvers extend to the left. The viewer is looking "
                "straight at the edge of the shutter."
            ),
            "negative_space": (
                "White margins for dimension annotations. The louvers "
                "and stile fill about 60-70% of the image width."
            ),
        },
        "technical": {
            "rendering": (
                "Clean cross-section rendering. Wood grain visible: "
                "vertical on the stile, running along the length of "
                "each louver. Each louver has a subtle shadow underneath "
                "to show the tilt. The rabbet step-cuts on the top and "
                "bottom rails should be clearly visible as small "
                "rectangular notches."
            ),
            "lighting": "soft-ambient",
            "lighting_detail": (
                "Soft even lighting. Gentle shadows beneath each tilted "
                "louver to show depth and the gap between slats."
            ),
        },
        "materials": {
            "wood": (
                "American basswood: fine even grain, light creamy-white "
                "to pale honey, smooth sanded, satin sheen."
            ),
        },
        "text_overlay": {
            "dimensions": {
                "description": (
                    f"Include dimension annotations: "
                    f"a horizontal dimension line at the top showing the "
                    f"stock thickness as {frac(stock_thickness)}. "
                    f"A small vertical dimension between the first two "
                    f"louvers on the right showing spacing as "
                    f"{frac(louver_spacing)}. "
                    f"A 'FRONT' label with an arrow pointing to the left "
                    f"(toward the louver faces) to indicate which direction "
                    f"is the front of the shutter."
                ),
            },
            "subtitle": {
                "content": (
                    f"SIDE VIEW (CROSS SECTION)"
                ),
                "position": "below the drawing, centered",
                "style": "Bold, clean sans-serif, black",
            },
        },
    }

    preamble = (
        f"Generate a technical cross-section illustration of a plantation "
        f"shutter panel as seen from the SIDE (looking at the narrow edge). "
        f"This is the kind of diagram that shows HOW a shutter is built — "
        f"the stile thickness, how louvers are angled, and the spacing "
        f"between slats.\n\n"
        f"The stile is {frac(stock_thickness)} thick and runs vertically on "
        f"the right. Louver slats protrude to the left at a ~20 degree tilt "
        f"angle, spaced {frac(louver_spacing)} apart. Think of venetian "
        f"blinds seen from the side — that repeating pattern of angled slats "
        f"with light gaps between them.\n\n"
        f"No visible hardware or fasteners — the louvers emerge cleanly "
        f"from the stile.\n\n"
        f"Follow the structured scene description below exactly.\n"
        f"---\n"
    )

    return preamble + json.dumps(scene_json, indent=2)


def generate(panel_width, panel_height, louver_size, stock_thickness,
             middle_rail, output_path):
    """Call the API and save the image."""

    prompt_text = build_prompt(
        panel_width, panel_height, louver_size, stock_thickness, middle_rail
    )

    # Side view is tall and narrow — use 9:16 portrait
    request_body = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {
                "aspectRatio": "9:16",
                "imageSize": "2K",
            },
        },
    }

    payload = json.dumps(request_body).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
    }
    req = urllib.request.Request(
        ENDPOINT, data=payload, headers=headers, method="POST"
    )

    print(f"[side-view] Sending request (prompt={len(prompt_text)} chars)...")
    start = time.time()

    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            raw = resp.read()
            elapsed = time.time() - start
            print(f"[side-view] Response: HTTP {resp.status} "
                  f"({elapsed:.1f}s, {len(raw):,} bytes)")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[side-view] HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        print(body[:1000], file=sys.stderr)
        return False
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"[side-view] Error: {e}", file=sys.stderr)
        return False

    data = json.loads(raw)
    if "error" in data:
        print(f"[side-view] API Error: "
              f"{json.dumps(data['error'], indent=2)}", file=sys.stderr)
        return False

    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline:
                mime = (inline.get("mimeType")
                        or inline.get("mime_type", ""))
                b64data = inline.get("data", "")
                if b64data:
                    img_bytes = base64.b64decode(b64data)
                    ext = "jpg" if "jpeg" in mime else "png"
                    out = output_path.rsplit(".", 1)[0] + f".{ext}"
                    with open(out, "wb") as f:
                        f.write(img_bytes)
                    print(f"[side-view] Saved: {out} "
                          f"({len(img_bytes):,} bytes, {mime})")
                    return True

    print("[side-view] No image data in response", file=sys.stderr)
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate shutter side cross-section illustration"
    )
    parser.add_argument("--width", type=float, required=True,
                        help="Panel width in inches")
    parser.add_argument("--height", type=float, required=True,
                        help="Panel height in inches")
    parser.add_argument("--louver-size", type=float, default=2.5,
                        choices=[1.25, 2.5, 3.5],
                        help="Louver size preset (default: 2.5)")
    parser.add_argument("--stock-thickness", type=float, default=1.0625,
                        help="Frame stock thickness in inches (default: 1-1/16)")
    parser.add_argument("--middle-rail", action="store_true",
                        help="Include middle rail")
    parser.add_argument("--output", type=str, required=True,
                        help="Output file path")
    args = parser.parse_args()

    output = os.path.expanduser(args.output)
    success = generate(
        args.width, args.height, args.louver_size,
        args.stock_thickness, args.middle_rail, output
    )
    sys.exit(0 if success else 1)

# Image Generation Architecture

## Overview

Shutter Wizard uses Google's **Gemini 3 Pro Image Preview** (`gemini-3-pro-image-preview`), also known as **Nano Banana Pro**, to generate professional technical illustrations for the PDF output. Each illustration type has its own parameterized Python script that can be called independently by an orchestrator process.

## Model Selection

**Winner: `gemini-3-pro-image-preview`** ($0.134/image at 2K resolution)

We evaluated two models on 2026-02-12:

| Criteria | gemini-3-pro-image-preview | gemini-2.5-flash-image |
|----------|---------------------------|------------------------|
| Cost | $0.134/image (1K-2K) | $0.039/image (1K only) |
| Speed | ~30s | ~9s |
| Max resolution | 4K | 1K (1024px) |
| Wood grain/texture | Realistic, visible grain | Flat, clip-art quality |
| Dimension labels | Accurate placement | Misplaced, duplicated |
| Structural accuracy | Correct shutter anatomy | Broken structure, unusable |
| Shadow/depth | Subtle louver shadows, depth | Flat, no dimensionality |

**The Flash model is a non-starter.** It's not just a fidelity issue — the structural output is wrong. Dimensions land in incorrect positions, louver proportions are off, and the overall image doesn't read as a technical illustration. For a woodworking plan PDF, structural correctness is mandatory.

### Cost at Scale

At ~5 generated images per PDF, the cost per plan is approximately **$0.67**. The 4K tier ($0.24/image) is unnecessary — 2K provides more than enough detail for PDF embedding.

Pricing tiers:
- **1K-2K**: 1,120 tokens → $0.134/image (sweet spot — 1K and 2K cost the same)
- **4K**: 2,000 tokens → $0.24/image (no benefit for PDF use)
- **Batch API**: 50% discount on all tiers (for high-volume/server-side use)

## API Details

- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
- **Auth**: `x-goog-api-key` header
- **API key**: Stored in `~/API_KEYS.vault` under the Google entry
- **Response format**: JSON with `candidates[].content.parts[].inlineData.data` containing base64-encoded image
- **Response MIME**: Typically `image/jpeg`
- **Caution**: The API returns **camelCase** keys (`inlineData`, `mimeType`), not snake_case

### Request Structure

```json
{
  "contents": [{"parts": [{"text": "prompt text here"}]}],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "3:4",
      "imageSize": "2K"
    }
  }
}
```

Supported aspect ratios: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`

Temperature should be left at the default (1.0) per Google's recommendation.

## Prompt Strategy: Structured JSON

We use a **structured JSON prompt** approach, validated by the community for Nano Banana Pro. Research shows structured prompts improve output quality by 60-80% for complex/detailed tasks.

### Format

Each prompt consists of:
1. **Natural language preamble** — a plain-English description of what to generate, including critical constraints up front
2. **`---` separator**
3. **Structured JSON scene description** with these sections:

```
core.subject          — What the image depicts
core.objects[]        — Individual elements with detailed descriptions
core.constraints[]    — Hard rules the model must follow
style.primary         — Overall style category
style.sub_style       — Detailed style description
style.color_palette   — Specific colors
style.mood            — Tone
composition.framing   — How the subject is positioned
composition.camera_angle — Viewpoint
technical.rendering   — Rendering specifics
technical.lighting    — Lighting setup
materials.wood        — Material descriptions
text_overlay          — Any text/dimensions to render into the image
```

### Key Prompt Learnings

1. **No visible hardware**: Real plantation shutters have completely smooth front surfaces. The louver pivot pins are small plastic/nylon pieces recessed inside drilled holes in the stile — invisible from the front. The hidden control arm runs behind the louvers on the back side. Early prompts that mentioned "brass pivot pins" or "visible hardware" produced incorrect images with ugly brackets at the louver-stile junction. The fix was to **remove all hardware descriptions** and explicitly state smooth, seamless connections in multiple places.

2. **Louver count accuracy**: Image generation models struggle with exact counts of repeated elements. Despite aggressive prompting (explicit counts, "1, 2, 3..." enumeration, mathematical reasoning about spacing), the model consistently underproduces louvers (~21 instead of 25). The practical solution is a **disclaimer line**: *"Louver count shown is illustrative — refer to plan for exact count."*

3. **Describe scenes, not keywords**: Google's docs emphasize natural language scene descriptions over keyword lists. The model's strength is language comprehension.

4. **Separate objects for separate sections**: When a panel has a middle rail, describe `upper_louvers` and `lower_louvers` as distinct objects rather than one combined description.

## Script Architecture

Each image type has its own self-contained Python script using only stdlib (`urllib`, `json`, `base64`). No external dependencies required.

### Naming Convention

Scripts are named `generate-{image-type}.py` where `{image-type}` describes what the script produces:

| Script | PDF Page | Description | Status |
|--------|----------|-------------|--------|
| `generate-panel-hero.py` | Page 2 | Front elevation hero image of the full panel | Done |
| `generate-side-view.py` | Page 3 (left) | Side cross-section showing louver tilt angle, stile depth, spacing | Done |
| `generate-rail-detail.py` | Page 3 (right) | Zoomed detail circles of top/bottom rail-to-stile connections | Planned |
| `generate-louver-detail.py` | Page 4 | Louver top view, end profile, stile/rail joint, jig alignment | Planned |
| `generate-control-arm.py` | Page 4 (bottom) | Hidden control arm with clip positions | Planned |

Pages 1 (cover) and 5 (cut list/hardware tables) are text-only — no generated images needed.

### Common Interface

All scripts accept CLI arguments and follow the same pattern:

```bash
python3 generate-panel-hero.py \
  --width 24 \
  --height 60 \
  --middle-rail \
  --output ~/Desktop/panel-hero.jpg

python3 generate-side-view.py \
  --width 24 \
  --height 60 \
  --louver-size 2.5 \
  --stock-thickness 1.0625 \
  --output ~/Desktop/side-view.jpg
```

Common parameters:
- `--width` — Panel width in inches
- `--height` — Panel height in inches
- `--output` — Output file path
- `--middle-rail` — Include middle rail (flag)

Type-specific parameters:
- `--louver-size` — Louver preset: 1.25, 2.5, or 3.5 (side-view, detail scripts)
- `--stock-thickness` — Frame stock thickness in inches (side-view)

### Exit Codes

- `0` — Success, image saved
- `1` — Failure (HTTP error, timeout, no image in response)

### Timeout

All scripts use a 120-second timeout on the API call. The previous session hung indefinitely on an image generation request — this prevents that. Typical response time is 25-35 seconds.

## Deployment Considerations

Currently these are standalone CLI scripts for local use. For server-side deployment:

- The orchestrator (main PDF generation process) would call each script as a subprocess
- Images could be cached by a hash of the input parameters to avoid regenerating identical panels
- The **Batch API** offers 50% cost reduction for non-real-time generation
- Consider pre-generating common panel configurations and caching the results
- All scripts use Python stdlib only — no pip dependencies to manage

## Reference: Plantation Shutter Construction

For prompt accuracy, these construction details matter:

- **Front face**: Completely smooth. No visible hardware of any kind.
- **Louver pivot**: Small nylon/plastic pins inserted into holes drilled in the stile. The pin has a ~1/32" shoulder for rotation clearance. Invisible from the front.
- **Hidden control arm**: A thin metal strip running vertically on the BACK of the panel, behind the louvers. Small clips on the strip connect to the short end of each louver slat. When the arm slides up/down, all louvers tilt in unison.
- **Rabbet**: A step-cut in the top and bottom rails where the outermost louver ends seat.
- **Stile channel**: The stile has a series of drilled holes (pin holes) where louvers pivot. From the front, the louver edges simply disappear into the stile.

## Files

```
generate-panel-hero.py      — Front elevation hero image
generate-side-view.py       — Side cross-section view
generate-elevation.py       — Original prototype (superseded by generate-panel-hero.py, can be removed)
```

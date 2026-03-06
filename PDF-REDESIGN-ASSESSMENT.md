# PDF Redesign Assessment

## Context

The shutter-wizard calculation engine (`shutter-calc.js`) has been corrected and validated against 6 Rockler PDF reference configurations. All numbers are accurate. The problem is purely visual: our PDF output looks like a basic data dump while the Rockler reference PDFs look like professional architectural drawing sets.

## Files to Modify

- `pdf-export.js` — Page layout, section structure, document flow
- `drawing.js` — Canvas-rendered diagrams embedded as images in the PDF

Both files use jsPDF (included as `jspdf.umd.min.js`) and HTML5 Canvas respectively. The `plan` object from `shutter-calc.js` provides all data; its structure is correct and should not change.

## Reference Material

6 Rockler PDFs are in `/media/kelleyb/DATA2/code/personal/shutter-wizard/RocklerWizard/`:
- `125-fixed-60x18.pdf` (1.25" fixed, 6 pages)
- `125-movable-60x24.pdf` (1.25" movable, 6 pages)
- `250-fixed-40x12.pdf` (2.5" fixed, 6 pages)
- `250-moveable-hidden-42.625x19.4375.pdf`
- `250-moveable-hidden-72x24.pdf` (2.5" movable hidden arm, 6 pages)
- `350-moveable-front-79.5x16.375.pdf` (3.5" movable front arm, 6 pages)

## Rockler PDF Structure (6 pages per plan)

### Page 1: Cover Page
- Branded header bar (steel blue gradient) with title "Shutter Design Wizard / Custom Shutter Plan"
- Large stylized title: e.g. `1¼" Fixed Shutter Plan` or `2½" Movable Shutter Plan / Hidden Control Arm`
- Photo of an actual finished shutter (top-right area)
- Project Name and Shutter Description fields in a bordered box
- Introductory paragraph
- "Important Notes" section in **two-column layout** with bulleted items
- Notes are type-specific (fixed vs movable have different bullet points)
- Branded footer: `Rockler.com | [page#] | Distributed by Rockler Companies, Inc.`

### Page 2: Front Elevation Drawing (full page)
- Large front view of shutter panel filling most of the page
- Cream/tan wood-grain colored fills (not flat brown)
- Architectural dimension lines with arrows/ticks showing:
  - Panel width (top)
  - Rail length (below panel width)
  - Top rail height with "FULL WIDTH" label (right side, top)
  - Bottom rail height with "FULL WIDTH" label (right side, bottom)
  - Stile width (bottom)
  - Panel height (left side)
  - Louver count with "LOUVERS" label (left side, mid-panel)
  - First/last pin clearance dimensions (left side)
- For movable types: shows the rabbet step-down on rails (1" visible face vs full width)
- "FRONT VIEW" label centered below panel
- Project identifier box (bottom-right corner)
- Footer with louver type, project name

### Page 3: Side View / Cross Section (full page)
- Left side: Full stile side view showing louvers protruding at angle, with "FRONT" label and arrow
- Stock thickness dimension at top
- Louver spacing dimension
- Control arm span dimension (for movable)
- Right side: TWO zoomed detail circles:
  - **Top rail detail**: Shows rail-to-stile connection from front, with "FRONT" arrow, full rail width dimension, front-face rail width, rabbet depth labeled, "TOP RAIL" label, pin hole visible
  - **Bottom rail detail**: Same treatment, "BOTTOM RAIL" label, showing asymmetric rail height
- "SIDE VIEW (CROSS SECTION)" label at bottom-left
- These zoom circles are the most distinctive visual feature

### Page 4: Louver & Assembly Details (full page)
- **Louver top view**: Full louver shown flat with length dimension, pin holes visible at each end
- **Louver profile cross-section**: End view showing thickness, flat face dimension, pin hole positions (oval shape)
- **Chamfer / Bead detail**: Zoomed callout of louver edge profile where it meets the stile
- **Top view detail**: Shows stile/rail butt joint from above with stock thickness
- **Stile jig alignment detail**: Zoomed circle showing stile with jig positioned, first-pin-hole clearance dimension, top rail position
- For movable types: **Control arm** shown alongside stile with dimensions and clip positions
- For front arm types: **Mouse hole dimensions** labeled (e.g. "1-1/8"L x 5/8"W x 1/2"D")
- **Hidden control arm**: Shown as separate element with length dimension and clip positions

### Page 5: Cut List & Hardware List
- **Cut List table**: Clean bordered table with columns: Part, Qty, Thickness, Width, Length
  - Includes: Stile, Top Rail, Bottom Rail, Louver, Control Arm (movable only)
- **Hardware List table**: SKU, Description, Qty Required, Pkg Qty, Qty, Unit Price, Ext Price
  - (We won't replicate SKU/pricing — replace with our existing hardware list format)
- **Additional Options section**: Router bits, jigs, doweling jig
  - (Out of scope for us — skip this)

### Page 6: Hinge List
- Simple table of hinge options with SKU, Description, Pkg, Unit Price
- (Out of scope — static catalog data, not calculated)

## Current Output vs Target

| Aspect | Current | Rockler Target |
|--------|---------|----------------|
| Pages | ~7 (variable) | 5 usable (skip hinge page) |
| Cover page | None — jumps to config summary | Branded cover with title, photo placeholder, notes |
| Elevation | Basic canvas rectangles, flat brown fills | Cream/tan fills, proper dimension arrows, clearance dims |
| Cross-section | Small inline diagram, flat rectangles | Full-page side view with zoomed detail circles for rail connections |
| Louver detail | None | Dedicated page with louver top view, profile, chamfer detail, jig alignment |
| Cut list | Green-header table | Clean black-bordered table |
| Notes | Bulleted list on separate area | Integrated into cover page, two-column layout |
| Footer | Simple centered text | Three-part footer: site, page number, attribution |
| Pin hole schedule | Dedicated table page | Not in Rockler PDF (they use the stile jig alignment detail instead) |

## Implementation Strategy

### Approach: Rewrite both files from scratch

The gap is too large for incremental edits. The drawing.js needs entirely new rendering functions and pdf-export.js needs a completely different page flow.

### drawing.js — New functions needed:

1. `drawFrontElevation(canvas, plan)` — Reworked elevation with cream fills, proper architectural dimension arrows (not just lines with ticks), clearance dimensions, "FULL WIDTH" labels, louver count placement matching Rockler
2. `drawSideView(canvas, plan)` — NEW: Full stile side view with angled louvers protruding, stock thickness, spacing dimensions
3. `drawRailDetailCircle(canvas, plan, which)` — NEW: Zoomed circle showing rail-to-stile connection detail (top or bottom), rabbet, pin hole, dimensions
4. `drawLouverTopView(canvas, plan)` — NEW: Flat louver with length dimension, pin holes at ends
5. `drawLouverProfile(canvas, plan)` — NEW: End cross-section of louver showing thickness, flat face, pin holes
6. `drawBeadDetail(canvas, plan)` — NEW: Chamfer/bead callout where louver meets stile
7. `drawTopViewDetail(canvas, plan)` — NEW: Top-down view of stile/rail butt joint
8. `drawStileJigDetail(canvas, plan)` — NEW: Stile with jig, first pin hole, top rail position
9. `drawControlArmDetail(canvas, plan)` — NEW: For movable types, control arm with clips and dimensions

### pdf-export.js — New page flow:

1. **Page 1 (Cover)**: Title block, project info fields, important notes in two columns
2. **Page 2 (Front Elevation)**: Full-page elevation drawing
3. **Page 3 (Side View & Rail Details)**: Side view left, two zoomed detail circles right
4. **Page 4 (Louver & Assembly Details)**: Louver views, bead detail, top view, jig alignment, control arm
5. **Page 5 (Cut List & Hardware)**: Tables

### Canvas sizing

The current canvases are 500x700 (elevation) and 500x300 (cross-section). For full-page PDF embedding at good resolution, consider rendering at 1000x1400 and 1000x1400 respectively (2x for sharpness), then scaling down in the PDF.

### Color palette (from Rockler PDFs)

- Wood fill: `#f0e4c8` or `#e8dcc0` (warm cream/tan, NOT brown)
- Wood stroke: `#8b7355` (medium brown outline)
- Dimension lines: `#000000` (black, thin)
- Dimension text: `#000000` (black, clean sans-serif)
- Background: `#ffffff`
- Detail circle border: `#000000` (black, medium weight)
- Pin holes: small unfilled circles with black stroke
- Header bar: `#4a6a7a` (steel blue-gray)

### Complexity assessment

This is a substantial rewrite — drawing.js roughly triples in size, pdf-export.js roughly doubles. The zoomed detail circles with the rail cross-sections are the hardest part to get right visually. The louver profile cross-section (showing the oval/elliptical shape with pin holes) is also non-trivial canvas drawing.

A pragmatic approach would be to tackle this in phases:
1. First pass: Page structure and layout (cover page, page flow, footers)
2. Second pass: Elevation drawing improvements (colors, dimension arrows, clearance labels)
3. Third pass: Side view and rail detail circles (the signature visual element)
4. Fourth pass: Louver detail page (profile, top view, bead detail, jig alignment)

## Data Available from plan Object

The `plan` object returned by `ShutterCalc.calculate()` contains everything needed:

```
plan.config: { louverSize, louverType, panelWidth, panelHeight, numPanels, joinery, tenonLength, middleRail, woodSpecies, stockThickness }
plan.geometry: { stileWidth, stileLength, topRailHeight, bottomRailHeight, rabbetDepth, louverWidth, louverLength, louverThickness, louverSpacing, topClearance, bottomClearance, numLouvers, topSectionLouvers, bottomSectionLouvers, pinPositions, middleRail, railLength, controlArmLength, controlArmOverhang, mouseHole }
plan.cuttingList: [{ part, qty, width, length, thickness, notes }]
plan.hardwareList: [{ item, qty, notes }]
plan.notes: [string]
```

The `ShutterCalc.frac()` function is available globally for formatting decimal inches as fractional strings.

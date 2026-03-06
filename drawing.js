/**
 * Shutter Drawing Module
 *
 * Renders professional architectural-quality diagrams onto HTML canvas elements.
 * Designed to match the Rockler Shutter Design Wizard PDF aesthetic.
 *
 * Exports: drawElevation, drawCrossSection (for wizard.js preview)
 *          drawFrontElevation, drawSideView, drawRailDetails, drawLouverDetails (for PDF)
 */

const ShutterDrawing = (() => {

  // ── Color palette (Rockler PDF-inspired) ──────────────────────────────
  const COLORS = {
    woodFill: '#f0e4c8',       // warm cream/tan wood fill
    woodStroke: '#8b7355',     // medium brown outline
    louverFill: '#f5edd8',     // slightly lighter cream for louvers
    louverStroke: '#8b7355',   // same brown for louver outlines
    dimension: '#000000',      // black for dimension text
    dimLine: '#000000',        // black for dimension lines
    pin: '#000000',            // black for pin holes (unfilled circles)
    background: '#ffffff',     // white background
    detailCircle: '#000000',   // black for zoom circle borders
    arrow: '#000000',          // black for arrows
  };

  // ── Dimension line helpers ──────────────────────────────────────────

  /**
   * Draw a horizontal dimension line with arrows/ticks and label.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x1 - Start x
   * @param {number} x2 - End x
   * @param {number} y - Y position
   * @param {string} label - Dimension text
   * @param {string} side - 'above' or 'below' (label placement)
   */
  function drawDimArrowH(ctx, x1, x2, y, label, side = 'above') {
    ctx.save();
    ctx.strokeStyle = COLORS.dimLine;
    ctx.fillStyle = COLORS.dimension;
    ctx.lineWidth = 1;

    const arrowSize = 6;
    const tickLen = 8;

    // Main line
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();

    // Left arrow/tick
    ctx.beginPath();
    ctx.moveTo(x1, y - tickLen / 2);
    ctx.lineTo(x1, y + tickLen / 2);
    ctx.stroke();
    // Arrow head pointing left
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x1 + arrowSize, y - arrowSize / 2);
    ctx.lineTo(x1 + arrowSize, y + arrowSize / 2);
    ctx.closePath();
    ctx.fill();

    // Right arrow/tick
    ctx.beginPath();
    ctx.moveTo(x2, y - tickLen / 2);
    ctx.lineTo(x2, y + tickLen / 2);
    ctx.stroke();
    // Arrow head pointing right
    ctx.beginPath();
    ctx.moveTo(x2, y);
    ctx.lineTo(x2 - arrowSize, y - arrowSize / 2);
    ctx.lineTo(x2 - arrowSize, y + arrowSize / 2);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = side === 'above' ? 'bottom' : 'top';
    const labelY = side === 'above' ? y - 6 : y + 6;
    ctx.fillText(label, (x1 + x2) / 2, labelY);

    ctx.restore();
  }

  /**
   * Draw a vertical dimension line with arrows/ticks and label.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} y1 - Start y (top)
   * @param {number} y2 - End y (bottom)
   * @param {number} x - X position
   * @param {string} label - Dimension text
   * @param {string} side - 'left' or 'right' (label placement)
   */
  function drawDimArrowV(ctx, y1, y2, x, label, side = 'left') {
    ctx.save();
    ctx.strokeStyle = COLORS.dimLine;
    ctx.fillStyle = COLORS.dimension;
    ctx.lineWidth = 1;

    const arrowSize = 6;
    const tickLen = 8;

    // Main line
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();

    // Top arrow/tick
    ctx.beginPath();
    ctx.moveTo(x - tickLen / 2, y1);
    ctx.lineTo(x + tickLen / 2, y1);
    ctx.stroke();
    // Arrow head pointing up
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x - arrowSize / 2, y1 + arrowSize);
    ctx.lineTo(x + arrowSize / 2, y1 + arrowSize);
    ctx.closePath();
    ctx.fill();

    // Bottom arrow/tick
    ctx.beginPath();
    ctx.moveTo(x - tickLen / 2, y2);
    ctx.lineTo(x + tickLen / 2, y2);
    ctx.stroke();
    // Arrow head pointing down
    ctx.beginPath();
    ctx.moveTo(x, y2);
    ctx.lineTo(x - arrowSize / 2, y2 - arrowSize);
    ctx.lineTo(x + arrowSize / 2, y2 - arrowSize);
    ctx.closePath();
    ctx.fill();

    // Label (rotated)
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = side === 'left' ? 'bottom' : 'top';
    ctx.translate(x, (y1 + y2) / 2);
    ctx.rotate(-Math.PI / 2);
    const labelOffset = side === 'left' ? -8 : 8;
    ctx.fillText(label, 0, labelOffset);

    ctx.restore();
  }

  /**
   * Draw a zoom/detail circle border.
   */
  function drawZoomCircle(ctx, cx, cy, radius) {
    ctx.save();
    ctx.strokeStyle = COLORS.detailCircle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw extension lines from element to dimension line.
   */
  function drawExtensionLines(ctx, x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = COLORS.dimLine;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw an arrow pointing in a direction with label.
   */
  function drawLabelArrow(ctx, x, y, direction, label) {
    ctx.save();
    ctx.fillStyle = COLORS.arrow;
    ctx.strokeStyle = COLORS.arrow;
    ctx.lineWidth = 1.5;

    const arrowLen = 30;
    const arrowHead = 8;

    let dx = 0, dy = 0;
    if (direction === 'left') dx = -1;
    else if (direction === 'right') dx = 1;
    else if (direction === 'up') dy = -1;
    else if (direction === 'down') dy = 1;

    const endX = x + dx * arrowLen;
    const endY = y + dy * arrowLen;

    // Arrow line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    if (dx !== 0) {
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - dx * arrowHead, endY - arrowHead / 2);
      ctx.lineTo(endX - dx * arrowHead, endY + arrowHead / 2);
    } else {
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - arrowHead / 2, endY - dy * arrowHead);
      ctx.lineTo(endX + arrowHead / 2, endY - dy * arrowHead);
    }
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelX = x - dx * 20;
    const labelY = y - dy * 20;
    ctx.fillText(label, labelX, labelY);

    ctx.restore();
  }

  // ── Front Elevation (for PDF - enhanced) ──────────────────────────────

  /**
   * Draw the front elevation of a single shutter panel (PDF quality).
   * Canvas size: 1000x1400
   */
  function drawFrontElevation(canvas, plan) {
    const ctx = canvas.getContext('2d');
    const geo = plan.geometry;
    const cfg = plan.config;

    const isMovable = cfg.louverType !== 'fixed';

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Margins for dimension lines
    const margin = { top: 120, bottom: 120, left: 150, right: 180 };
    const availW = canvas.width - margin.left - margin.right;
    const availH = canvas.height - margin.top - margin.bottom;

    // Scale to fit
    const scaleX = availW / cfg.panelWidth;
    const scaleY = availH / cfg.panelHeight;
    const scale = Math.min(scaleX, scaleY);

    const drawW = cfg.panelWidth * scale;
    const drawH = cfg.panelHeight * scale;
    const ox = margin.left + (availW - drawW) / 2;  // origin x
    const oy = margin.top + (availH - drawH) / 2;   // origin y

    // Helper: draw a filled rect in panel coords
    function panelRect(x, y, w, h, fillColor, strokeColor) {
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.fillRect(ox + x * scale, oy + y * scale, w * scale, h * scale);
      ctx.strokeRect(ox + x * scale, oy + y * scale, w * scale, h * scale);
    }

    // Draw stiles (left and right)
    panelRect(0, 0, geo.stileWidth, cfg.panelHeight, COLORS.woodFill, COLORS.woodStroke);
    panelRect(cfg.panelWidth - geo.stileWidth, 0, geo.stileWidth, cfg.panelHeight, COLORS.woodFill, COLORS.woodStroke);

    // Draw top rail
    panelRect(geo.stileWidth, 0, cfg.panelWidth - 2 * geo.stileWidth, geo.topRailHeight, COLORS.woodFill, COLORS.woodStroke);

    // Draw bottom rail
    panelRect(geo.stileWidth, cfg.panelHeight - geo.bottomRailHeight, cfg.panelWidth - 2 * geo.stileWidth, geo.bottomRailHeight, COLORS.woodFill, COLORS.woodStroke);

    // Draw middle rail if present
    if (geo.middleRail) {
      const topSectionEnd = geo.topClearance + (geo.topSectionLouvers - 1) * geo.louverSpacing;
      const mrY = topSectionEnd + geo.louverSpacing / 2;
      panelRect(geo.stileWidth, mrY, cfg.panelWidth - 2 * geo.stileWidth, geo.middleRail.width, COLORS.woodFill, COLORS.woodStroke);
    }

    // Draw louvers as clean horizontal lines (like Rockler PDFs)
    ctx.strokeStyle = COLORS.woodStroke;
    ctx.lineWidth = 1.5;
    const louverX = geo.stileWidth;
    const louverEndX = cfg.panelWidth - geo.stileWidth;

    for (let i = 0; i < geo.pinPositions.length; i++) {
      const pinY = geo.pinPositions[i];
      ctx.beginPath();
      ctx.moveTo(ox + louverX * scale, oy + pinY * scale);
      ctx.lineTo(ox + louverEndX * scale, oy + pinY * scale);
      ctx.stroke();

      // Pin holes as small unfilled circles
      ctx.strokeStyle = COLORS.pin;
      ctx.lineWidth = 1;
      const pinR = 3;
      // Left pin
      ctx.beginPath();
      ctx.arc(ox + louverX * scale, oy + pinY * scale, pinR, 0, Math.PI * 2);
      ctx.stroke();
      // Right pin
      ctx.beginPath();
      ctx.arc(ox + louverEndX * scale, oy + pinY * scale, pinR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = COLORS.woodStroke;
      ctx.lineWidth = 1.5;
    }

    // ── Dimension lines ──

    // Panel width (top)
    const dimTopY = oy - 50;
    drawExtensionLines(ctx, ox, oy, ox, dimTopY + 5);
    drawExtensionLines(ctx, ox + drawW, oy, ox + drawW, dimTopY + 5);
    drawDimArrowH(ctx, ox, ox + drawW, dimTopY, ShutterCalc.frac(cfg.panelWidth), 'above');

    // Rail length (below panel width)
    const railDimY = oy - 25;
    const railStartX = ox + geo.stileWidth * scale;
    const railEndX = ox + (cfg.panelWidth - geo.stileWidth) * scale;
    drawDimArrowH(ctx, railStartX, railEndX, railDimY, ShutterCalc.frac(geo.railLength), 'below');

    // Panel height (left side)
    const dimLeftX = ox - 50;
    drawExtensionLines(ctx, ox, oy, dimLeftX + 5, oy);
    drawExtensionLines(ctx, ox, oy + drawH, dimLeftX + 5, oy + drawH);
    drawDimArrowV(ctx, oy, oy + drawH, dimLeftX, ShutterCalc.frac(cfg.panelHeight), 'left');

    // Top rail height (right side, top)
    const dimRightX = ox + drawW + 40;
    const topRailEndY = oy + geo.topRailHeight * scale;
    drawExtensionLines(ctx, ox + drawW, oy, dimRightX - 5, oy);
    drawExtensionLines(ctx, ox + drawW, topRailEndY, dimRightX - 5, topRailEndY);
    drawDimArrowV(ctx, oy, topRailEndY, dimRightX, ShutterCalc.frac(geo.topRailHeight), 'right');

    // "FULL WIDTH" label for top rail
    ctx.save();
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'left';
    ctx.fillText('FULL WIDTH', dimRightX + 15, (oy + topRailEndY) / 2 + 4);
    ctx.restore();

    // For movable: show front-face rail height
    if (isMovable && geo.rabbetDepth) {
      const frontFaceHeight = geo.topRailHeight - geo.rabbetDepth;
      ctx.save();
      ctx.font = '10px Arial, sans-serif';
      ctx.fillStyle = COLORS.dimension;
      ctx.textAlign = 'left';
      ctx.fillText(`(${ShutterCalc.frac(frontFaceHeight)} front face)`, dimRightX + 15, (oy + topRailEndY) / 2 + 18);
      ctx.restore();
    }

    // Bottom rail height (right side, bottom)
    const bottomRailStartY = oy + (cfg.panelHeight - geo.bottomRailHeight) * scale;
    const bottomRailEndY = oy + drawH;
    drawExtensionLines(ctx, ox + drawW, bottomRailStartY, dimRightX - 5, bottomRailStartY);
    drawExtensionLines(ctx, ox + drawW, bottomRailEndY, dimRightX - 5, bottomRailEndY);
    drawDimArrowV(ctx, bottomRailStartY, bottomRailEndY, dimRightX, ShutterCalc.frac(geo.bottomRailHeight), 'right');

    // "FULL WIDTH" label for bottom rail
    ctx.save();
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'left';
    ctx.fillText('FULL WIDTH', dimRightX + 15, (bottomRailStartY + bottomRailEndY) / 2 + 4);
    ctx.restore();

    // For movable: show front-face rail height
    if (isMovable && geo.rabbetDepth) {
      const frontFaceHeight = geo.bottomRailHeight - geo.rabbetDepth;
      ctx.save();
      ctx.font = '10px Arial, sans-serif';
      ctx.fillStyle = COLORS.dimension;
      ctx.textAlign = 'left';
      ctx.fillText(`(${ShutterCalc.frac(frontFaceHeight)} front face)`, dimRightX + 15, (bottomRailStartY + bottomRailEndY) / 2 + 18);
      ctx.restore();
    }

    // Stile width (bottom)
    const stileWidthY = oy + drawH + 30;
    const stileEndX = ox + geo.stileWidth * scale;
    drawExtensionLines(ctx, ox, oy + drawH, ox, stileWidthY - 5);
    drawExtensionLines(ctx, stileEndX, oy + drawH, stileEndX, stileWidthY - 5);
    drawDimArrowH(ctx, ox, stileEndX, stileWidthY, ShutterCalc.frac(geo.stileWidth), 'below');

    // Louver count (left side, mid-panel)
    const louverCountX = ox - 100;
    const firstPinY = oy + geo.pinPositions[0] * scale;
    const lastPinY = oy + geo.pinPositions[geo.pinPositions.length - 1] * scale;
    ctx.save();
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.translate(louverCountX, (firstPinY + lastPinY) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${geo.numLouvers} LOUVERS`, 0, 0);
    ctx.restore();

    // Top clearance dimension (left, from top of stile to first louver)
    const topClearDimX = ox - 25;
    drawDimArrowV(ctx, oy, firstPinY, topClearDimX, ShutterCalc.frac(geo.topClearance), 'left');

    // Bottom clearance dimension (left, from last louver to bottom of stile)
    drawDimArrowV(ctx, lastPinY, oy + drawH, topClearDimX, ShutterCalc.frac(geo.bottomClearance), 'left');

    // Louver spacing (right side, between first two louvers if >1 louver)
    if (geo.pinPositions.length >= 2) {
      const spacing1Y = oy + geo.pinPositions[0] * scale;
      const spacing2Y = oy + geo.pinPositions[1] * scale;
      const spacingDimX = ox + drawW + 100;
      drawDimArrowV(ctx, spacing1Y, spacing2Y, spacingDimX, ShutterCalc.frac(geo.louverSpacing), 'right');
      ctx.save();
      ctx.font = '10px Arial, sans-serif';
      ctx.fillStyle = COLORS.dimension;
      ctx.textAlign = 'left';
      ctx.fillText('SPACING', spacingDimX + 15, (spacing1Y + spacing2Y) / 2 + 4);
      ctx.restore();
    }

    // "FRONT VIEW" label centered below
    ctx.save();
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText('FRONT VIEW', canvas.width / 2, oy + drawH + 80);
    ctx.restore();
  }

  // ── Side View (for PDF page 3) ──────────────────────────────────────

  /**
   * Draw the side/cross-section view of a shutter panel (PDF quality).
   * Shows the stile from the side with louvers protruding at angles.
   * Canvas size: 400x1400
   */
  function drawSideView(canvas, plan) {
    const ctx = canvas.getContext('2d');
    const geo = plan.geometry;
    const cfg = plan.config;

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Margins
    const margin = { top: 100, bottom: 100, left: 80, right: 100 };
    const availH = canvas.height - margin.top - margin.bottom;

    // Scale to fit height
    const scale = availH / cfg.panelHeight;

    const drawH = cfg.panelHeight * scale;
    const ox = canvas.width / 2;  // center horizontally
    const oy = margin.top;

    // Stile dimensions
    const stileThickness = cfg.stockThickness * scale;
    const stileWidth = stileThickness;  // Side view shows thickness

    // Draw stile as tall narrow rectangle
    ctx.fillStyle = COLORS.woodFill;
    ctx.strokeStyle = COLORS.woodStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(ox - stileWidth / 2, oy, stileWidth, drawH);
    ctx.strokeRect(ox - stileWidth / 2, oy, stileWidth, drawH);

    // Draw louvers protruding at slight angles
    const louverLen = geo.louverWidth * scale * 1.5;  // Visual length for side view
    const louverThick = geo.louverThickness * scale * 2;  // Visual thickness

    ctx.fillStyle = COLORS.louverFill;
    ctx.strokeStyle = COLORS.louverStroke;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < geo.pinPositions.length; i++) {
      const pinY = oy + geo.pinPositions[i] * scale;

      // Draw louver at ~20 degree angle (tilted toward front)
      ctx.save();
      ctx.translate(ox - stileWidth / 2, pinY);
      ctx.rotate(-Math.PI / 9);  // ~20 degrees

      ctx.beginPath();
      ctx.moveTo(0, -louverThick / 2);
      ctx.lineTo(-louverLen, -louverThick / 2);
      ctx.lineTo(-louverLen, louverThick / 2);
      ctx.lineTo(0, louverThick / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // Stock thickness dimension at top
    const thickDimY = oy - 30;
    drawDimArrowH(ctx, ox - stileWidth / 2, ox + stileWidth / 2, thickDimY, ShutterCalc.frac(cfg.stockThickness), 'above');

    // Louver spacing dimension (right side)
    if (geo.pinPositions.length >= 2) {
      const y1 = oy + geo.pinPositions[0] * scale;
      const y2 = oy + geo.pinPositions[1] * scale;
      const spacingX = ox + stileWidth / 2 + 40;
      drawDimArrowV(ctx, y1, y2, spacingX, ShutterCalc.frac(geo.louverSpacing), 'right');
    }

    // "FRONT" label with arrow pointing to front face
    const frontX = ox - stileWidth / 2 - 50;
    const frontY = oy + drawH / 3;
    drawLabelArrow(ctx, frontX, frontY, 'right', 'FRONT');

    // "SIDE VIEW (CROSS SECTION)" label at bottom
    ctx.save();
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText('SIDE VIEW', canvas.width / 2, oy + drawH + 50);
    ctx.fillText('(CROSS SECTION)', canvas.width / 2, oy + drawH + 68);
    ctx.restore();
  }

  // ── Rail Detail Circles (for PDF page 3) ────────────────────────────

  /**
   * Draw a zoomed detail circle showing rail-to-stile connection.
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} plan - Plan object
   * @param {string} which - 'top' or 'bottom'
   * Canvas size: 500x500
   */
  function drawRailDetails(canvas, plan, which) {
    const ctx = canvas.getContext('2d');
    const geo = plan.geometry;
    const cfg = plan.config;

    const isMovable = cfg.louverType !== 'fixed';

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 30;

    // Draw zoom circle
    drawZoomCircle(ctx, cx, cy, radius);

    // Clip to circle for inner drawing
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    // Scale for detail view
    const detailScale = 40;  // pixels per inch

    // Rail dimensions
    const railHeight = which === 'top' ? geo.topRailHeight : geo.bottomRailHeight;
    const railFrontFace = railHeight - (isMovable ? geo.rabbetDepth : 0);

    // Draw stile (vertical bar on right side)
    const stileW = cfg.stockThickness * detailScale;
    const stileH = radius * 1.5;
    const stileX = cx + 30;
    const stileY = cy - stileH / 2;

    ctx.fillStyle = COLORS.woodFill;
    ctx.strokeStyle = COLORS.woodStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(stileX, stileY, stileW, stileH);
    ctx.strokeRect(stileX, stileY, stileW, stileH);

    // Draw rail (horizontal bar from left, butting against stile)
    const railW = radius;
    const railH = railHeight * detailScale;
    const railX = cx - radius + 40;
    const railY = cy - railH / 2;

    ctx.fillStyle = COLORS.woodFill;
    ctx.strokeStyle = COLORS.woodStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(railX, railY, railW, railH);
    ctx.strokeRect(railX, railY, railW, railH);

    // Draw rabbet step (if movable)
    if (isMovable && geo.rabbetDepth > 0) {
      const rabbetH = geo.rabbetDepth * detailScale;
      const rabbetY = which === 'top' ? railY + railH - rabbetH : railY;

      ctx.fillStyle = COLORS.background;
      ctx.fillRect(railX + railW - 20, rabbetY, 20, rabbetH);
      ctx.strokeStyle = COLORS.woodStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(railX + railW - 20, rabbetY, 20, rabbetH);
    }

    // Pin hole
    const pinY = cy;
    const pinX = stileX + stileW / 2;
    ctx.strokeStyle = COLORS.pin;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pinX, pinY, 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();  // Remove clip

    // Dimension labels outside circle

    // Full rail width dimension
    const fullWidthDimY = cy + radius + 25;
    ctx.save();
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText(`Full Width: ${ShutterCalc.frac(railHeight)}`, cx, fullWidthDimY);
    ctx.restore();

    // Front face dimension (if movable)
    if (isMovable && geo.rabbetDepth > 0) {
      ctx.save();
      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = COLORS.dimension;
      ctx.textAlign = 'center';
      ctx.fillText(`Front Face: ${ShutterCalc.frac(railFrontFace)}`, cx, fullWidthDimY + 16);
      ctx.fillText(`Rabbet: ${ShutterCalc.frac(geo.rabbetDepth)}`, cx, fullWidthDimY + 32);
      ctx.restore();
    }

    // Rail label
    ctx.save();
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText(which === 'top' ? 'TOP RAIL' : 'BOTTOM RAIL', cx, cy - radius - 15);
    ctx.restore();

    // "FRONT" label with arrow
    drawLabelArrow(ctx, cx - radius + 20, cy - radius + 50, 'down', 'FRONT');
  }

  // ── Louver Details (for PDF page 4) ─────────────────────────────────

  /**
   * Draw composite louver detail page with multiple views.
   * Canvas size: 1000x1400
   */
  function drawLouverDetails(canvas, plan) {
    const ctx = canvas.getContext('2d');
    const geo = plan.geometry;
    const cfg = plan.config;

    const isMovable = cfg.louverType !== 'fixed';

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ── Section 1: Louver top view (full length) ──
    // Upper area of canvas
    const topViewY = 100;
    const topViewCenterX = canvas.width / 2;

    // Scale for louver length to fit
    const louverScale = Math.min(700 / geo.louverLength, 30);
    const louverDrawLen = geo.louverLength * louverScale;
    const louverDrawW = geo.louverWidth * louverScale;

    // Draw louver as elongated rectangle (top view)
    ctx.fillStyle = COLORS.louverFill;
    ctx.strokeStyle = COLORS.louverStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(topViewCenterX - louverDrawLen / 2, topViewY, louverDrawLen, louverDrawW);
    ctx.strokeRect(topViewCenterX - louverDrawLen / 2, topViewY, louverDrawLen, louverDrawW);

    // Pin holes at ends
    ctx.strokeStyle = COLORS.pin;
    ctx.lineWidth = 1.5;
    const pinOffset = 15;
    // Left pin
    ctx.beginPath();
    ctx.arc(topViewCenterX - louverDrawLen / 2 + pinOffset, topViewY + louverDrawW / 2, 4, 0, Math.PI * 2);
    ctx.stroke();
    // Right pin
    ctx.beginPath();
    ctx.arc(topViewCenterX + louverDrawLen / 2 - pinOffset, topViewY + louverDrawW / 2, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Length dimension
    const lenDimY = topViewY - 25;
    drawDimArrowH(ctx, topViewCenterX - louverDrawLen / 2, topViewCenterX + louverDrawLen / 2, lenDimY, ShutterCalc.frac(geo.louverLength), 'above');

    // "LOUVER - TOP VIEW" label
    ctx.save();
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText('LOUVER - TOP VIEW', topViewCenterX, topViewY + louverDrawW + 30);
    ctx.restore();

    // ── Section 2: Louver profile (end view cross-section) ──
    // Right side of canvas
    const profileX = canvas.width - 180;
    const profileY = 350;
    const profileScale = 60;  // pixels per inch

    const profileW = geo.louverWidth * profileScale;
    const profileH = geo.louverThickness * profileScale;

    // Draw louver profile (elliptical/rounded ends)
    ctx.fillStyle = COLORS.louverFill;
    ctx.strokeStyle = COLORS.louverStroke;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(profileX, profileY, profileW / 2, profileH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pin hole in center
    ctx.strokeStyle = COLORS.pin;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(profileX, profileY, 3, 0, Math.PI * 2);
    ctx.stroke();

    // Width dimension
    drawDimArrowH(ctx, profileX - profileW / 2, profileX + profileW / 2, profileY + profileH / 2 + 25, ShutterCalc.frac(geo.louverWidth), 'below');

    // Thickness dimension
    drawDimArrowV(ctx, profileY - profileH / 2, profileY + profileH / 2, profileX + profileW / 2 + 25, ShutterCalc.frac(geo.louverThickness), 'right');

    // "END VIEW" label
    ctx.save();
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText('END VIEW', profileX, profileY + profileH / 2 + 60);
    ctx.restore();

    // ── Section 3: Top view detail - stile/rail joint ──
    // Lower-left area
    const jointX = 180;
    const jointY = 550;
    const jointScale = 35;

    // Draw stile (horizontal in top view)
    const jStileW = geo.stileWidth * jointScale;
    const jStileH = cfg.stockThickness * jointScale;

    ctx.fillStyle = COLORS.woodFill;
    ctx.strokeStyle = COLORS.woodStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(jointX - jStileW / 2, jointY - jStileH / 2, jStileW, jStileH * 2);
    ctx.strokeRect(jointX - jStileW / 2, jointY - jStileH / 2, jStileW, jStileH * 2);

    // Draw rail butting against stile
    const jRailW = 100;
    ctx.fillRect(jointX + jStileW / 2, jointY - jStileH / 2, jRailW, jStileH);
    ctx.strokeRect(jointX + jStileW / 2, jointY - jStileH / 2, jRailW, jStileH);

    // Stock thickness dimension
    drawDimArrowV(ctx, jointY - jStileH / 2, jointY + jStileH / 2, jointX - jStileW / 2 - 30, ShutterCalc.frac(cfg.stockThickness), 'left');

    // "TOP VIEW - JOINT" label
    ctx.save();
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText('TOP VIEW - STILE/RAIL JOINT', jointX + 50, jointY + jStileH + 40);
    ctx.restore();

    // ── Section 4: Stile jig alignment detail ──
    // Lower-right area with zoom circle
    const jigCx = canvas.width - 250;
    const jigCy = 700;
    const jigRadius = 120;

    drawZoomCircle(ctx, jigCx, jigCy, jigRadius);

    // Draw stile inside circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(jigCx, jigCy, jigRadius - 2, 0, Math.PI * 2);
    ctx.clip();

    const jigScale = 25;
    const jigStileW = geo.stileWidth * jigScale;
    const jigStileH = jigRadius * 1.5;

    ctx.fillStyle = COLORS.woodFill;
    ctx.strokeStyle = COLORS.woodStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(jigCx - jigStileW / 2, jigCy - jigStileH / 2, jigStileW, jigStileH);
    ctx.strokeRect(jigCx - jigStileW / 2, jigCy - jigStileH / 2, jigStileW, jigStileH);

    // First pin hole
    const firstPinY = jigCy - jigStileH / 2 + geo.topClearance * jigScale * 0.5;
    ctx.strokeStyle = COLORS.pin;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(jigCx, firstPinY, 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // First pin clearance dimension
    ctx.save();
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText(`First pin: ${ShutterCalc.frac(geo.topClearance)} from top`, jigCx, jigCy + jigRadius + 25);
    ctx.restore();

    // "STILE JIG ALIGNMENT" label
    ctx.save();
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText('STILE JIG ALIGNMENT', jigCx, jigCy - jigRadius - 15);
    ctx.restore();

    // ── Section 5: Control arm (for movable types) ──
    if (isMovable && geo.controlArmLength) {
      const armY = 950;
      const armCenterX = canvas.width / 2;
      const armScale = Math.min(600 / geo.controlArmLength, 25);

      const armDrawLen = geo.controlArmLength * armScale;
      const armDrawW = 12;

      // Draw control arm
      ctx.fillStyle = '#c0a080';
      ctx.strokeStyle = COLORS.woodStroke;
      ctx.lineWidth = 2;
      ctx.fillRect(armCenterX - armDrawLen / 2, armY, armDrawLen, armDrawW);
      ctx.strokeRect(armCenterX - armDrawLen / 2, armY, armDrawLen, armDrawW);

      // Clip positions (small rectangles along arm)
      const clipSpacing = geo.louverSpacing * armScale;
      const numClips = Math.floor(armDrawLen / clipSpacing);
      ctx.fillStyle = '#888888';
      for (let i = 0; i <= numClips; i++) {
        const clipX = armCenterX - armDrawLen / 2 + i * clipSpacing + 5;
        if (clipX < armCenterX + armDrawLen / 2 - 10) {
          ctx.fillRect(clipX, armY + armDrawW - 4, 8, 4);
        }
      }

      // Length dimension
      drawDimArrowH(ctx, armCenterX - armDrawLen / 2, armCenterX + armDrawLen / 2, armY - 25, ShutterCalc.frac(geo.controlArmLength), 'above');

      // Label
      ctx.save();
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillStyle = COLORS.dimension;
      ctx.textAlign = 'center';
      const armTypeLabel = cfg.louverType === 'movable-hidden' ? 'HIDDEN CONTROL ARM' : 'FRONT CONTROL ARM';
      ctx.fillText(armTypeLabel, armCenterX, armY + armDrawW + 30);
      ctx.restore();

      // Overhang note
      if (geo.controlArmOverhang) {
        ctx.save();
        ctx.font = '11px Arial, sans-serif';
        ctx.fillStyle = COLORS.dimension;
        ctx.textAlign = 'center';
        ctx.fillText(`(includes ${ShutterCalc.frac(geo.controlArmOverhang)} overhang)`, armCenterX, armY + armDrawW + 48);
        ctx.restore();
      }
    }

    // ── Section 6: Mouse hole dimensions (for front arm types) ──
    if (cfg.louverType === 'movable-front' && geo.mouseHole) {
      const mhX = 180;
      const mhY = 850;
      const mhScale = 50;

      // Draw stile section with mouse hole
      const mhStileW = 80;
      const mhStileH = 100;

      ctx.fillStyle = COLORS.woodFill;
      ctx.strokeStyle = COLORS.woodStroke;
      ctx.lineWidth = 2;
      ctx.fillRect(mhX - mhStileW / 2, mhY, mhStileW, mhStileH);
      ctx.strokeRect(mhX - mhStileW / 2, mhY, mhStileW, mhStileH);

      // Mouse hole cutout
      const holeW = geo.mouseHole.length * mhScale;
      const holeH = geo.mouseHole.width * mhScale;
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(mhX - holeW / 2, mhY + 20, holeW, holeH);
      ctx.strokeRect(mhX - holeW / 2, mhY + 20, holeW, holeH);

      // Mouse hole dimensions label
      ctx.save();
      ctx.font = '11px Arial, sans-serif';
      ctx.fillStyle = COLORS.dimension;
      ctx.textAlign = 'center';
      ctx.fillText('MOUSE HOLE', mhX, mhY + mhStileH + 25);
      ctx.fillText(`${ShutterCalc.frac(geo.mouseHole.length)}L x ${ShutterCalc.frac(geo.mouseHole.width)}W x ${ShutterCalc.frac(geo.mouseHole.depth)}D`, mhX, mhY + mhStileH + 42);
      ctx.restore();
    }

    // ── Page title ──
    ctx.save();
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.textAlign = 'center';
    ctx.fillText('LOUVER & ASSEMBLY DETAILS', canvas.width / 2, 50);
    ctx.restore();
  }

  // ── Original drawElevation (for wizard.js preview - smaller canvas) ──

  /**
   * Draw the front elevation of a single shutter panel (preview size).
   * This is the original function signature for wizard.js compatibility.
   */
  function drawElevation(canvas, plan) {
    const ctx = canvas.getContext('2d');
    const geo = plan.geometry;
    const cfg = plan.config;

    // Compute scale to fit canvas with margins
    const margin = { top: 50, bottom: 60, left: 80, right: 80 };
    const availW = canvas.width - margin.left - margin.right;
    const availH = canvas.height - margin.top - margin.bottom;

    const scaleX = availW / cfg.panelWidth;
    const scaleY = availH / cfg.panelHeight;
    const scale = Math.min(scaleX, scaleY);

    const drawW = cfg.panelWidth * scale;
    const drawH = cfg.panelHeight * scale;
    const ox = margin.left + (availW - drawW) / 2;  // origin x
    const oy = margin.top + (availH - drawH) / 2;   // origin y

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = COLORS.dimension;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Front Elevation (not to scale)', canvas.width / 2, 20);

    // Helper: draw a filled rect in panel coords
    function panelRect(x, y, w, h, fillColor, strokeColor) {
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.fillRect(ox + x * scale, oy + y * scale, w * scale, h * scale);
      ctx.strokeRect(ox + x * scale, oy + y * scale, w * scale, h * scale);
    }

    // Draw stiles
    panelRect(0, 0, geo.stileWidth, cfg.panelHeight, COLORS.woodFill, COLORS.woodStroke);
    panelRect(cfg.panelWidth - geo.stileWidth, 0, geo.stileWidth, cfg.panelHeight, COLORS.woodFill, COLORS.woodStroke);

    // Draw top rail
    panelRect(geo.stileWidth, 0, cfg.panelWidth - 2 * geo.stileWidth, geo.topRailHeight, COLORS.woodFill, COLORS.woodStroke);

    // Draw bottom rail
    panelRect(geo.stileWidth, cfg.panelHeight - geo.bottomRailHeight, cfg.panelWidth - 2 * geo.stileWidth, geo.bottomRailHeight, COLORS.woodFill, COLORS.woodStroke);

    // Draw middle rail if present
    if (geo.middleRail) {
      const topSectionEnd = geo.topClearance + (geo.topSectionLouvers - 1) * geo.louverSpacing;
      const mrY = topSectionEnd + geo.louverSpacing / 2;
      panelRect(geo.stileWidth, mrY, cfg.panelWidth - 2 * geo.stileWidth, geo.middleRail.width, COLORS.woodFill, COLORS.woodStroke);

      // Label
      ctx.fillStyle = COLORS.dimension;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Middle Rail', ox + drawW / 2, oy + (mrY + geo.middleRail.width / 2) * scale + 3);
    }

    // Draw louvers as clean horizontal lines
    const louverX = geo.stileWidth;
    const louverEndX = cfg.panelWidth - geo.stileWidth;

    ctx.strokeStyle = COLORS.louverStroke;
    ctx.lineWidth = 1;

    for (let i = 0; i < geo.pinPositions.length; i++) {
      const pinY = geo.pinPositions[i];

      ctx.beginPath();
      ctx.moveTo(ox + louverX * scale, oy + pinY * scale);
      ctx.lineTo(ox + louverEndX * scale, oy + pinY * scale);
      ctx.stroke();

      // Pin dots as unfilled circles
      ctx.strokeStyle = COLORS.pin;
      ctx.lineWidth = 1;
      const pinR = Math.max(2, scale * 0.12);
      // Left pin
      ctx.beginPath();
      ctx.arc(ox + louverX * scale, oy + pinY * scale, pinR, 0, Math.PI * 2);
      ctx.stroke();
      // Right pin
      ctx.beginPath();
      ctx.arc(ox + louverEndX * scale, oy + pinY * scale, pinR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = COLORS.louverStroke;
      ctx.lineWidth = 1;
    }

    // ── Dimension lines ──
    ctx.fillStyle = COLORS.dimension;
    ctx.strokeStyle = COLORS.dimLine;
    ctx.lineWidth = 0.75;
    ctx.font = '11px sans-serif';

    // Panel width (top)
    drawDimH(ctx, ox, ox + drawW, oy - 15, ShutterCalc.frac(cfg.panelWidth));

    // Panel height (left)
    drawDimV(ctx, oy, oy + drawH, ox - 15, ShutterCalc.frac(cfg.panelHeight));

    // Stile width (bottom)
    drawDimH(ctx, ox, ox + geo.stileWidth * scale, oy + drawH + 20, ShutterCalc.frac(geo.stileWidth));

    // Top rail height (right)
    drawDimV(ctx, oy, oy + geo.topRailHeight * scale, ox + drawW + 20, ShutterCalc.frac(geo.topRailHeight));

    // Bottom rail height (right)
    drawDimV(ctx, oy + drawH - geo.bottomRailHeight * scale, oy + drawH, ox + drawW + 20, ShutterCalc.frac(geo.bottomRailHeight));

    // Louver spacing callout (if room)
    if (geo.pinPositions.length >= 2) {
      const y1 = oy + geo.pinPositions[0] * scale;
      const y2 = oy + geo.pinPositions[1] * scale;
      drawDimV(ctx, y1, y2, ox + drawW + 50, ShutterCalc.frac(geo.louverSpacing));
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('(spacing)', ox + drawW + 55, (y1 + y2) / 2 + 12);
    }

    // Louver count label
    ctx.fillStyle = COLORS.dimension;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${geo.numLouvers} louvers`, ox + drawW / 2, oy + drawH + 45);
  }

  // ── Original drawCrossSection (for wizard.js preview) ──

  /**
   * Draw a cross-section detail showing louver profile and pin connection.
   * This is the original function signature for wizard.js compatibility.
   */
  function drawCrossSection(canvas, plan) {
    const ctx = canvas.getContext('2d');
    const geo = plan.geometry;
    const cfg = plan.config;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = COLORS.dimension;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cross-Section Detail (not to scale)', canvas.width / 2, 20);

    const cx = canvas.width / 2;
    const cy = 160;
    const cs = 18; // cross-section scale factor (pixels per inch)

    // Draw stile cross-section (left side)
    const stileX = cx - (geo.louverLength / 2 + geo.stileWidth) * cs;
    const stileH = 8 * cs;  // show a portion of stile

    ctx.fillStyle = COLORS.woodFill;
    ctx.strokeStyle = COLORS.woodStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(stileX, cy - stileH / 2, geo.stileWidth * cs, stileH);
    ctx.strokeRect(stileX, cy - stileH / 2, geo.stileWidth * cs, stileH);

    // Label stile
    ctx.fillStyle = COLORS.dimension;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Stile', stileX + (geo.stileWidth * cs) / 2, cy - stileH / 2 - 5);
    ctx.fillText(ShutterCalc.frac(geo.stileWidth) + ' wide', stileX + (geo.stileWidth * cs) / 2, cy + stileH / 2 + 14);

    // Draw right stile
    const rstileX = cx + (geo.louverLength / 2) * cs;
    ctx.fillStyle = COLORS.woodFill;
    ctx.strokeStyle = COLORS.woodStroke;
    ctx.fillRect(rstileX, cy - stileH / 2, geo.stileWidth * cs, stileH);
    ctx.strokeRect(rstileX, cy - stileH / 2, geo.stileWidth * cs, stileH);
    ctx.fillStyle = COLORS.dimension;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Stile', rstileX + (geo.stileWidth * cs) / 2, cy - stileH / 2 - 5);

    // Draw a few louvers in the opening
    const louverStartX = stileX + geo.stileWidth * cs;
    const louverEndX = rstileX;
    const louverDrawW = louverEndX - louverStartX;
    const louverThick = (geo.louverThickness || 0.375) * cs;

    const spacingPx = geo.louverSpacing * cs;
    const numToDraw = Math.min(5, geo.numLouvers);
    const startY = cy - ((numToDraw - 1) * spacingPx) / 2;

    for (let i = 0; i < numToDraw; i++) {
      const ly = startY + i * spacingPx;

      // Louver body
      ctx.fillStyle = COLORS.louverFill;
      ctx.strokeStyle = COLORS.louverStroke;
      ctx.lineWidth = 1.5;

      // Draw as a slightly angled slat (15 degree visual tilt for movable)
      const isMovable = cfg.louverType !== 'fixed';
      if (isMovable) {
        const tilt = louverThick * 0.8;
        ctx.beginPath();
        ctx.moveTo(louverStartX, ly - louverThick / 2 + tilt / 2);
        ctx.lineTo(louverEndX, ly - louverThick / 2 - tilt / 2);
        ctx.lineTo(louverEndX, ly + louverThick / 2 - tilt / 2);
        ctx.lineTo(louverStartX, ly + louverThick / 2 + tilt / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(louverStartX, ly - louverThick / 2, louverDrawW, louverThick);
        ctx.strokeRect(louverStartX, ly - louverThick / 2, louverDrawW, louverThick);
      }

      // Pin dots as unfilled circles
      ctx.strokeStyle = COLORS.pin;
      ctx.lineWidth = 1;
      const pinR = 3;
      ctx.beginPath();
      ctx.arc(louverStartX - 2, ly, pinR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(louverEndX + 2, ly, pinR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw control arm for movable types
    if (cfg.louverType !== 'fixed' && geo.controlArmLength) {
      const armX = cfg.louverType === 'movable-hidden'
        ? louverStartX - 8  // behind stile for hidden arm
        : louverEndX + 12;  // in front of stile for front arm
      const armW = 4;
      const armTop = startY - spacingPx / 2;
      const armBot = startY + (numToDraw - 1) * spacingPx + spacingPx / 2;

      ctx.fillStyle = '#c0a080';
      ctx.strokeStyle = COLORS.woodStroke;
      ctx.lineWidth = 1;
      ctx.fillRect(armX, armTop, armW, armBot - armTop);
      ctx.strokeRect(armX, armTop, armW, armBot - armTop);

      ctx.fillStyle = COLORS.dimension;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      const armLabel = cfg.louverType === 'movable-hidden' ? 'Hidden Arm' : 'Front Arm';
      ctx.fillText(armLabel, armX + armW + 3, (armTop + armBot) / 2 + 3);
    }

    // Dimension labels
    ctx.fillStyle = COLORS.dimension;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';

    // Louver width label
    ctx.fillText(`Louver: ${ShutterCalc.frac(geo.louverWidth)} wide`, cx, cy + (numToDraw * spacingPx) / 2 + 30);
    ctx.fillText(`Spacing: ${ShutterCalc.frac(geo.louverSpacing)} on center`, cx, cy + (numToDraw * spacingPx) / 2 + 48);
    ctx.fillText(`Louver length: ${ShutterCalc.frac(geo.louverLength)}`, cx, cy + (numToDraw * spacingPx) / 2 + 66);

    // Pin type label
    const pinLabel = cfg.louverType === 'fixed' ? 'Fixed (glued)' :
      cfg.louverType === 'movable-front' ? 'Movable, Front Control Arm' : 'Movable, Hidden Control Arm';
    ctx.font = '10px sans-serif';
    ctx.fillStyle = COLORS.dimension;
    ctx.fillText(`Type: ${pinLabel}`, cx, cy + (numToDraw * spacingPx) / 2 + 86);

    // Control arm length label
    if (cfg.louverType !== 'fixed' && geo.controlArmLength) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.dimension;
      ctx.fillText(`Control arm: ${ShutterCalc.frac(geo.controlArmLength)}`, cx, cy + (numToDraw * spacingPx) / 2 + 102);
    }
  }

  // ── Simple dimension line helpers (for preview canvases) ──

  function drawDimH(ctx, x1, x2, y, label) {
    ctx.save();
    ctx.strokeStyle = COLORS.dimLine;
    ctx.fillStyle = COLORS.dimension;
    ctx.lineWidth = 0.75;

    // Line
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();

    // Ticks
    ctx.beginPath();
    ctx.moveTo(x1, y - 4);
    ctx.lineTo(x1, y + 4);
    ctx.moveTo(x2, y - 4);
    ctx.lineTo(x2, y + 4);
    ctx.stroke();

    // Label
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, (x1 + x2) / 2, y - 5);
    ctx.restore();
  }

  function drawDimV(ctx, y1, y2, x, label) {
    ctx.save();
    ctx.strokeStyle = COLORS.dimLine;
    ctx.fillStyle = COLORS.dimension;
    ctx.lineWidth = 0.75;

    // Line
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();

    // Ticks
    ctx.beginPath();
    ctx.moveTo(x - 4, y1);
    ctx.lineTo(x + 4, y1);
    ctx.moveTo(x - 4, y2);
    ctx.lineTo(x + 4, y2);
    ctx.stroke();

    // Label (rotated)
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.translate(x - 8, (y1 + y2) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  // ── Public API ──
  return {
    // Original functions for wizard.js compatibility
    drawElevation,
    drawCrossSection,
    // New PDF-quality functions
    drawFrontElevation,
    drawSideView,
    drawRailDetails,
    drawLouverDetails,
  };

})();

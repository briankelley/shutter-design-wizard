/**
 * Shutter Drawing Module
 *
 * Renders elevation and cross-section diagrams onto HTML canvas elements.
 */

const ShutterDrawing = (() => {

  const COLORS = {
    frame: '#5c3d2e',
    frameFill: '#d4b896',
    louver: '#8b6f47',
    louverFill: '#e8d5b7',
    middleRail: '#5c3d2e',
    dimension: '#333',
    dimLine: '#666',
    pin: '#c44020',
    background: '#ffffff',
    gridLine: '#f0f0f0',
  };

  /**
   * Draw the front elevation of a single shutter panel.
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
    panelRect(0, 0, geo.stileWidth, cfg.panelHeight, COLORS.frameFill, COLORS.frame);
    panelRect(cfg.panelWidth - geo.stileWidth, 0, geo.stileWidth, cfg.panelHeight, COLORS.frameFill, COLORS.frame);

    // Draw top rail
    panelRect(geo.stileWidth, 0, cfg.panelWidth - 2 * geo.stileWidth, geo.topRailHeight, COLORS.frameFill, COLORS.frame);

    // Draw bottom rail
    panelRect(geo.stileWidth, cfg.panelHeight - geo.bottomRailHeight, cfg.panelWidth - 2 * geo.stileWidth, geo.bottomRailHeight, COLORS.frameFill, COLORS.frame);

    // Draw middle rail if present
    if (geo.middleRail) {
      const topSectionEnd = geo.topClearance + (geo.topSectionLouvers - 1) * geo.louverSpacing;
      const mrY = topSectionEnd + geo.louverSpacing / 2;
      panelRect(geo.stileWidth, mrY, cfg.panelWidth - 2 * geo.stileWidth, geo.middleRail.width, COLORS.frameFill, COLORS.middleRail);

      // Label
      ctx.fillStyle = COLORS.dimension;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Middle Rail', ox + drawW / 2, oy + (mrY + geo.middleRail.width / 2) * scale + 3);
    }

    // Draw louvers
    const louverX = geo.stileWidth;
    const louverW = geo.louverLength;
    const louverVisualH = geo.louverWidth * 0.4;  // visual thickness for drawing

    for (let i = 0; i < geo.pinPositions.length; i++) {
      const pinY = geo.pinPositions[i];
      const ly = pinY - louverVisualH / 2;

      ctx.fillStyle = COLORS.louverFill;
      ctx.strokeStyle = COLORS.louver;
      ctx.lineWidth = 1;
      ctx.fillRect(ox + louverX * scale, oy + ly * scale, louverW * scale, louverVisualH * scale);
      ctx.strokeRect(ox + louverX * scale, oy + ly * scale, louverW * scale, louverVisualH * scale);

      // Pin dots
      ctx.fillStyle = COLORS.pin;
      const pinR = Math.max(2, scale * 0.15);
      // Left pin
      ctx.beginPath();
      ctx.arc(ox + louverX * scale - pinR, oy + pinY * scale, pinR, 0, Math.PI * 2);
      ctx.fill();
      // Right pin
      ctx.beginPath();
      ctx.arc(ox + (louverX + louverW) * scale + pinR, oy + pinY * scale, pinR, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.fillText('(louver spacing)', ox + drawW + 55, (y1 + y2) / 2 + 12);
    }

    // Louver count label
    ctx.fillStyle = COLORS.dimension;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${geo.numLouvers} louvers`, ox + drawW / 2, oy + drawH + 45);
  }

  /**
   * Draw a cross-section detail showing louver profile and pin connection.
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

    ctx.fillStyle = COLORS.frameFill;
    ctx.strokeStyle = COLORS.frame;
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
    ctx.fillStyle = COLORS.frameFill;
    ctx.strokeStyle = COLORS.frame;
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
      ctx.strokeStyle = COLORS.louver;
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

      // Pin dots
      ctx.fillStyle = COLORS.pin;
      const pinR = 3;
      ctx.beginPath();
      ctx.arc(louverStartX - 2, ly, pinR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(louverEndX + 2, ly, pinR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw control arm for movable types
    if (cfg.louverType !== 'fixed' && geo.controlArmLength) {
      const armX = cfg.louverType === 'movable-hidden'
        ? louverStartX - 8  // behind stile for hidden arm
        : louverEndX + 12;  // in front of stile for front arm
      const armW = 4;
      const armTop = startY - spacingPx / 2;
      const armBot = startY + (numToDraw - 1) * spacingPx + spacingPx / 2;

      ctx.fillStyle = '#a0522d';
      ctx.strokeStyle = '#5c3d2e';
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
    ctx.fillStyle = COLORS.pin;
    ctx.fillText(`Pin type: ${pinLabel}`, cx, cy + (numToDraw * spacingPx) / 2 + 86);

    // Control arm length label
    if (cfg.louverType !== 'fixed' && geo.controlArmLength) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.dimension;
      ctx.fillText(`Control arm: ${ShutterCalc.frac(geo.controlArmLength)}`, cx, cy + (numToDraw * spacingPx) / 2 + 102);
    }
  }

  // ── Dimension line helpers ──

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

  return { drawElevation, drawCrossSection };

})();

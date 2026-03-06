/**
 * PDF Export Module
 *
 * Generates a professional PDF matching the Rockler Shutter Design Wizard aesthetic.
 * Uses jsPDF for PDF generation and HTML5 Canvas for diagram rendering.
 *
 * PDF Structure (5 pages):
 *   Page 1: Cover Page with project info and important notes
 *   Page 2: Front Elevation Drawing (full page)
 *   Page 3: Side View & Rail Details
 *   Page 4: Louver & Assembly Details
 *   Page 5: Cut List, Hardware & Pin Hole Schedule
 */

const ShutterPDF = (() => {

  // ── Constants ──
  const COLORS = {
    headerBar: '#4a6a7a',      // Steel-blue header bar
    headerText: '#ffffff',
    titleText: '#333333',
    bodyText: '#444444',
    borderGray: '#cccccc',
    tableHeader: '#e8e8e8',
    tableAltRow: '#f5f5f5',
    tableBorder: '#000000',
    footerText: '#888888',
  };

  const PAGE = {
    width: 612,   // Letter width in points
    height: 792,  // Letter height in points
    margin: 50,
  };

  // ── Main Generate Function ──
  function generate(plan) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

    const cfg = plan.config;
    const geo = plan.geometry;

    // Generate all pages
    generateCoverPage(doc, plan);
    doc.addPage();
    generateFrontElevationPage(doc, plan);
    doc.addPage();
    generateSideViewPage(doc, plan);
    doc.addPage();
    generateLouverDetailsPage(doc, plan);
    doc.addPage();
    generateCutListPage(doc, plan);

    // Add footers to all pages
    addFootersToAllPages(doc);

    // Save the PDF
    const filename = generateFilename(cfg);
    doc.save(filename);
  }

  // ── Page 1: Cover Page ──
  function generateCoverPage(doc, plan) {
    const cfg = plan.config;
    const geo = plan.geometry;
    const pw = PAGE.width;
    const margin = PAGE.margin;
    const contentW = pw - 2 * margin;
    let y = 0;

    // Header bar
    doc.setFillColor(74, 106, 122);
    doc.rect(0, 0, pw, 60, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Shutter Design Wizard', margin, 38);

    doc.setFontSize(14);
    doc.text('Custom Shutter Plan', pw - margin, 38, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    y = 90;

    // Large title
    const sizeStr = formatLouverSizeTitle(cfg.louverSize);
    const typeStr = cfg.louverType === 'fixed' ? 'Fixed' : 'Movable';

    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sizeStr} ${typeStr}`, margin, y);
    y += 34;

    doc.setFontSize(28);
    doc.text('Shutter Plan', margin, y);
    y += 8;

    // Subtitle for movable types
    if (cfg.louverType !== 'fixed') {
      y += 18;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      const armType = cfg.louverType === 'movable-hidden' ? 'Hidden Control Arm' : 'Front Control Arm';
      doc.text(armType, margin, y);
    }

    y += 30;

    // Project info box
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(1);
    doc.rect(margin, y, contentW, 60, 'S');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Project Name:', margin + 10, y + 22);

    doc.setFont('helvetica', 'normal');
    const projectName = generateProjectName(cfg);
    doc.text(projectName, margin + 100, y + 22);

    doc.setFont('helvetica', 'bold');
    doc.text('Shutter Description:', margin + 10, y + 42);

    doc.setFont('helvetica', 'normal');
    doc.text('Custom Shutter', margin + 130, y + 42);

    y += 75;

    // Intro paragraph
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const introText = 'Please review the following information before building your shutters. This plan includes all dimensions, cut lists, and assembly notes needed to complete your project. Measurements are in inches unless otherwise noted.';
    const introLines = doc.splitTextToSize(introText, contentW);
    doc.text(introLines, margin, y);
    y += introLines.length * 12 + 15;

    // Important Notes section
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Important Notes:', margin, y);
    y += 18;

    // Get type-specific notes
    const notes = getTypeSpecificNotes(cfg, geo);

    // Split notes into two columns
    const midPoint = Math.ceil(notes.length / 2);
    const leftNotes = notes.slice(0, midPoint);
    const rightNotes = notes.slice(midPoint);

    const colWidth = (contentW - 20) / 2;
    const leftX = margin;
    const rightX = margin + colWidth + 20;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    // Left column
    let leftY = y;
    for (const note of leftNotes) {
      const bulletLines = doc.splitTextToSize('\u2022 ' + note, colWidth - 10);
      doc.text(bulletLines, leftX, leftY);
      leftY += bulletLines.length * 10 + 4;
    }

    // Right column
    let rightY = y;
    for (const note of rightNotes) {
      const bulletLines = doc.splitTextToSize('\u2022 ' + note, colWidth - 10);
      doc.text(bulletLines, rightX, rightY);
      rightY += bulletLines.length * 10 + 4;
    }

    // Configuration summary below notes
    y = Math.max(leftY, rightY) + 20;

    if (y < 580) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Configuration Summary:', margin, y);
      y += 16;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const typeLabels = {
        'fixed': 'Fixed',
        'movable-front': 'Movable (Front Control Arm)',
        'movable-hidden': 'Movable (Hidden Control Arm)',
      };

      const summaryItems = [
        ['Panel Dimensions:', `${ShutterCalc.frac(cfg.panelWidth)} W x ${ShutterCalc.frac(cfg.panelHeight)} H`],
        ['Number of Panels:', String(cfg.numPanels)],
        ['Louver Count:', `${geo.numLouvers} per panel`],
        ['Louver Spacing:', `${ShutterCalc.frac(geo.louverSpacing)} on center`],
        ['Frame Joinery:', cfg.joinery === 'dowel' ? 'Dowel / Loose Tenon' : 'Mortise & Tenon'],
        ['Wood Species:', cfg.woodSpecies.charAt(0).toUpperCase() + cfg.woodSpecies.slice(1)],
      ];

      if (cfg.louverType !== 'fixed' && geo.controlArmLength) {
        summaryItems.push(['Control Arm Length:', ShutterCalc.frac(geo.controlArmLength)]);
      }

      for (const [label, value] of summaryItems) {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin + 10, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 120, y);
        y += 14;
      }
    }

    // Page border
    drawPageBorder(doc);
  }

  // ── Page 2: Front Elevation Drawing ──
  function generateFrontElevationPage(doc, plan) {
    const pw = PAGE.width;
    const ph = PAGE.height;
    const margin = PAGE.margin;
    let y = margin;

    // Section label
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('FRONT VIEW', pw / 2, y, { align: 'center' });
    y += 25;

    // Render elevation to offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1400;

    // Try new function first, fall back to existing
    if (typeof ShutterDrawing.drawFrontElevation === 'function') {
      ShutterDrawing.drawFrontElevation(canvas, plan);
    } else {
      ShutterDrawing.drawElevation(canvas, plan);
    }

    const imgData = canvas.toDataURL('image/png');

    // Calculate image dimensions to fit page
    const availH = ph - y - 80; // Leave room for footer
    const availW = pw - 2 * margin;
    const imgAspect = canvas.width / canvas.height;
    const availAspect = availW / availH;

    let imgW, imgH;
    if (imgAspect > availAspect) {
      imgW = availW;
      imgH = availW / imgAspect;
    } else {
      imgH = availH;
      imgW = availH * imgAspect;
    }

    const imgX = margin + (availW - imgW) / 2;
    doc.addImage(imgData, 'PNG', imgX, y, imgW, imgH);

    // Project identifier box in bottom-right
    drawProjectIdentifierBox(doc, plan);

    // Page border
    drawPageBorder(doc);
  }

  // ── Page 3: Side View & Rail Details ──
  function generateSideViewPage(doc, plan) {
    const pw = PAGE.width;
    const ph = PAGE.height;
    const margin = PAGE.margin;
    let y = margin;

    // Section label
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('SIDE VIEW & RAIL DETAILS', pw / 2, y, { align: 'center' });
    y += 25;

    const contentW = pw - 2 * margin;
    const halfW = contentW / 2 - 10;

    // Left side: Side view or cross-section
    const sideCanvas = document.createElement('canvas');
    sideCanvas.width = 500;
    sideCanvas.height = 700;

    if (typeof ShutterDrawing.drawSideView === 'function') {
      ShutterDrawing.drawSideView(sideCanvas, plan);
    } else {
      ShutterDrawing.drawCrossSection(sideCanvas, plan);
    }

    const sideImg = sideCanvas.toDataURL('image/png');
    const sideImgH = 350;
    const sideImgW = sideImgH * (sideCanvas.width / sideCanvas.height);
    doc.addImage(sideImg, 'PNG', margin, y, Math.min(sideImgW, halfW), sideImgH);

    // Right side: Rail details
    const rightX = margin + halfW + 20;
    const detailH = 160;

    // Top rail detail
    const topRailCanvas = document.createElement('canvas');
    topRailCanvas.width = 400;
    topRailCanvas.height = 300;

    if (typeof ShutterDrawing.drawRailDetails === 'function') {
      ShutterDrawing.drawRailDetails(topRailCanvas, plan, 'top');
      const topRailImg = topRailCanvas.toDataURL('image/png');
      doc.addImage(topRailImg, 'PNG', rightX, y, halfW, detailH);
    } else {
      // Fallback: draw a label
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Top Rail Detail', rightX + halfW / 2, y + 20, { align: 'center' });
      doc.text(`Height: ${ShutterCalc.frac(plan.geometry.topRailHeight)}`, rightX + halfW / 2, y + 40, { align: 'center' });
      doc.text(`Rabbet: ${ShutterCalc.frac(plan.geometry.rabbetDepth)}`, rightX + halfW / 2, y + 55, { align: 'center' });
    }

    // Bottom rail detail
    const bottomRailCanvas = document.createElement('canvas');
    bottomRailCanvas.width = 400;
    bottomRailCanvas.height = 300;

    if (typeof ShutterDrawing.drawRailDetails === 'function') {
      ShutterDrawing.drawRailDetails(bottomRailCanvas, plan, 'bottom');
      const bottomRailImg = bottomRailCanvas.toDataURL('image/png');
      doc.addImage(bottomRailImg, 'PNG', rightX, y + detailH + 20, halfW, detailH);
    } else {
      // Fallback: draw a label
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Bottom Rail Detail', rightX + halfW / 2, y + detailH + 40, { align: 'center' });
      doc.text(`Height: ${ShutterCalc.frac(plan.geometry.bottomRailHeight)}`, rightX + halfW / 2, y + detailH + 60, { align: 'center' });
      doc.text(`Rabbet: ${ShutterCalc.frac(plan.geometry.rabbetDepth)}`, rightX + halfW / 2, y + detailH + 75, { align: 'center' });
    }

    // Add dimension summary below drawings
    y += Math.max(sideImgH, detailH * 2 + 20) + 30;

    if (y < ph - 150) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Dimensions:', margin, y);
      y += 16;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const dims = [
        `Stock Thickness: ${ShutterCalc.frac(plan.config.stockThickness)}`,
        `Stile Width: ${ShutterCalc.frac(plan.geometry.stileWidth)}`,
        `Top Rail Height: ${ShutterCalc.frac(plan.geometry.topRailHeight)}`,
        `Bottom Rail Height: ${ShutterCalc.frac(plan.geometry.bottomRailHeight)}`,
        `Rabbet Depth: ${ShutterCalc.frac(plan.geometry.rabbetDepth)}`,
        `Louver Spacing: ${ShutterCalc.frac(plan.geometry.louverSpacing)} on center`,
      ];

      const col1 = dims.slice(0, 3);
      const col2 = dims.slice(3);

      for (let i = 0; i < col1.length; i++) {
        doc.text(col1[i], margin + 10, y + i * 14);
      }
      for (let i = 0; i < col2.length; i++) {
        doc.text(col2[i], margin + contentW / 2, y + i * 14);
      }
    }

    // Project identifier box
    drawProjectIdentifierBox(doc, plan);

    // Page border
    drawPageBorder(doc);
  }

  // ── Page 4: Louver & Assembly Details ──
  function generateLouverDetailsPage(doc, plan) {
    const pw = PAGE.width;
    const ph = PAGE.height;
    const margin = PAGE.margin;
    let y = margin;

    // Section label
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('LOUVER & ASSEMBLY DETAILS', pw / 2, y, { align: 'center' });
    y += 25;

    const contentW = pw - 2 * margin;

    // Try to use the dedicated louver details function
    const louverCanvas = document.createElement('canvas');
    louverCanvas.width = 1000;
    louverCanvas.height = 1200;

    if (typeof ShutterDrawing.drawLouverDetails === 'function') {
      ShutterDrawing.drawLouverDetails(louverCanvas, plan);
      const louverImg = louverCanvas.toDataURL('image/png');

      const availH = ph - y - 80;
      const imgAspect = louverCanvas.width / louverCanvas.height;
      let imgW = contentW;
      let imgH = imgW / imgAspect;

      if (imgH > availH) {
        imgH = availH;
        imgW = imgH * imgAspect;
      }

      const imgX = margin + (contentW - imgW) / 2;
      doc.addImage(louverImg, 'PNG', imgX, y, imgW, imgH);
    } else {
      // Fallback: Use cross-section and add text details
      const csCanvas = document.createElement('canvas');
      csCanvas.width = 600;
      csCanvas.height = 400;
      ShutterDrawing.drawCrossSection(csCanvas, plan);
      const csImg = csCanvas.toDataURL('image/png');

      const imgW = contentW * 0.8;
      const imgH = imgW * (csCanvas.height / csCanvas.width);
      const imgX = margin + (contentW - imgW) / 2;
      doc.addImage(csImg, 'PNG', imgX, y, imgW, imgH);

      y += imgH + 30;

      // Add louver specifications as text
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Louver Specifications:', margin, y);
      y += 18;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const geo = plan.geometry;
      const cfg = plan.config;

      const specs = [
        `Louver Width: ${ShutterCalc.frac(geo.louverWidth)}`,
        `Louver Length: ${ShutterCalc.frac(geo.louverLength)}`,
        `Louver Thickness: ${ShutterCalc.frac(geo.louverThickness)}`,
        `Total Louvers per Panel: ${geo.numLouvers}`,
        `Pin Type: ${cfg.louverType === 'fixed' ? 'Fixed (glued)' : 'Movable (1/32" shoulder)'}`,
      ];

      if (cfg.louverType !== 'fixed' && geo.controlArmLength) {
        specs.push(`Control Arm Length: ${ShutterCalc.frac(geo.controlArmLength)}`);
      }

      if (geo.mouseHole) {
        specs.push(`Mouse Hole: ${ShutterCalc.frac(geo.mouseHole.length)}L x ${ShutterCalc.frac(geo.mouseHole.width)}W x ${ShutterCalc.frac(geo.mouseHole.depth)}D`);
      }

      for (const spec of specs) {
        doc.text('\u2022 ' + spec, margin + 10, y);
        y += 14;
      }

      // Assembly notes
      y += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Assembly Notes:', margin, y);
      y += 18;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const assemblyNotes = [
        'Route louver profile on all slats before assembly.',
        cfg.louverType === 'fixed'
          ? 'Glue pins into stile holes. Do not glue louvers - they expand/contract.'
          : 'Do not glue movable pins. Louvers must rotate freely.',
        'Rabbet rails on the louver-facing edge before assembly.',
        'Test fit all components before final glue-up.',
      ];

      for (const note of assemblyNotes) {
        const lines = doc.splitTextToSize('\u2022 ' + note, contentW - 20);
        doc.text(lines, margin + 10, y);
        y += lines.length * 11 + 3;
      }
    }

    // Project identifier box
    drawProjectIdentifierBox(doc, plan);

    // Page border
    drawPageBorder(doc);
  }

  // ── Page 5: Cut List & Hardware ──
  function generateCutListPage(doc, plan) {
    const pw = PAGE.width;
    const ph = PAGE.height;
    const margin = PAGE.margin;
    const contentW = pw - 2 * margin;
    let y = margin;

    // Section label
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CUT LIST & HARDWARE', pw / 2, y, { align: 'center' });
    y += 25;

    // Cut List table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cut List', margin, y);
    y += 15;

    const cutListHeaders = ['Part', 'Qty', 'Thickness', 'Width', 'Length'];
    const cutListWidths = [0.28, 0.08, 0.16, 0.16, 0.16];
    // Note: removed Notes column to keep it cleaner - notes are in the notes section

    const cutListRows = plan.cuttingList.map(item => [
      item.part,
      String(item.qty),
      item.thickness,
      item.width,
      item.length,
    ]);

    y = drawCleanTable(doc, margin, y, contentW * 0.85, cutListHeaders, cutListWidths, cutListRows);
    y += 25;

    // Hardware & Supplies table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Hardware & Supplies', margin, y);
    y += 15;

    const hardwareHeaders = ['Item', 'Qty', 'Notes'];
    const hardwareWidths = [0.35, 0.10, 0.55];

    const hardwareRows = plan.hardwareList.map(item => [
      item.item,
      String(item.qty),
      item.notes,
    ]);

    y = drawCleanTable(doc, margin, y, contentW, hardwareHeaders, hardwareWidths, hardwareRows);
    y += 25;

    // Pin Hole Schedule (compact two-column layout)
    if (y < ph - 180 && plan.geometry.pinPositions.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Pin Hole Schedule (from top of stile)', margin, y);
      y += 15;

      const pinPositions = plan.geometry.pinPositions;
      const numPins = pinPositions.length;
      const halfCount = Math.ceil(numPins / 2);

      const colWidth = (contentW - 40) / 2;
      const pinRowH = 12;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      // Left column
      for (let i = 0; i < halfCount && i < numPins; i++) {
        const pinY = y + i * pinRowH;
        doc.text(`Louver ${i + 1}:`, margin + 5, pinY);
        doc.text(ShutterCalc.frac(pinPositions[i]), margin + 60, pinY);
      }

      // Right column
      for (let i = halfCount; i < numPins; i++) {
        const pinY = y + (i - halfCount) * pinRowH;
        doc.text(`Louver ${i + 1}:`, margin + colWidth + 25, pinY);
        doc.text(ShutterCalc.frac(pinPositions[i]), margin + colWidth + 80, pinY);
      }
    }

    // Project identifier box
    drawProjectIdentifierBox(doc, plan);

    // Page border
    drawPageBorder(doc);
  }

  // ── Helper Functions ──

  /**
   * Draw a clean black-bordered table
   */
  function drawCleanTable(doc, x, startY, tableW, headers, colRatios, rows) {
    const rowH = 16;
    const headerH = 18;
    let y = startY;
    const ph = PAGE.height;
    const margin = PAGE.margin;

    // Calculate column positions and widths
    const colX = [];
    const colW = [];
    let cx = x;
    for (let i = 0; i < headers.length; i++) {
      colX.push(cx);
      colW.push(tableW * colRatios[i]);
      cx += tableW * colRatios[i];
    }

    // Header row
    doc.setFillColor(232, 232, 232);
    doc.rect(x, y, tableW, headerH, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(x, y, tableW, headerH, 'S');

    // Header text
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], colX[i] + 4, y + 12);
    }
    y += headerH;

    // Data rows
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    for (let r = 0; r < rows.length; r++) {
      // Check for page break
      if (y + rowH > ph - margin - 40) {
        doc.addPage();
        y = margin;

        // Redraw header on new page
        doc.setFillColor(232, 232, 232);
        doc.rect(x, y, tableW, headerH, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(x, y, tableW, headerH, 'S');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], colX[i] + 4, y + 12);
        }
        y += headerH;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
      }

      // Alternating row background
      if (r % 2 === 1) {
        doc.setFillColor(245, 245, 245);
        doc.rect(x, y, tableW, rowH, 'F');
      }

      // Row border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(x, y, tableW, rowH, 'S');

      // Cell text
      for (let i = 0; i < rows[r].length; i++) {
        const cellText = doc.splitTextToSize(rows[r][i] || '', colW[i] - 6);
        doc.text(cellText[0] || '', colX[i] + 4, y + 11);
      }

      y += rowH;
    }

    // Bottom border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(x, y, x + tableW, y);

    return y;
  }

  /**
   * Draw page border
   */
  function drawPageBorder(doc) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(20, 20, PAGE.width - 40, PAGE.height - 40, 'S');
  }

  /**
   * Draw project identifier box in bottom-right corner
   */
  function drawProjectIdentifierBox(doc, plan) {
    const cfg = plan.config;
    const boxW = 150;
    const boxH = 40;
    const boxX = PAGE.width - PAGE.margin - boxW;
    const boxY = PAGE.height - 75;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, boxW, boxH, 'S');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(generateProjectName(cfg), boxX + 5, boxY + 15);
    doc.text(`${ShutterCalc.frac(cfg.panelWidth)} x ${ShutterCalc.frac(cfg.panelHeight)}`, boxX + 5, boxY + 28);
  }

  /**
   * Add footers to all pages
   */
  function addFootersToAllPages(doc) {
    const totalPages = doc.internal.getNumberOfPages();
    const pw = PAGE.width;
    const ph = PAGE.height;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(PAGE.margin, ph - 35, pw - PAGE.margin, ph - 35);

      // Left: Site name
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('ShutterWizard', PAGE.margin, ph - 22);

      // Center: Page number in bordered box
      const pageText = String(i);
      const pageBoxW = 24;
      const pageBoxH = 14;
      const pageBoxX = (pw - pageBoxW) / 2;
      const pageBoxY = ph - 30;

      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(pageBoxX, pageBoxY, pageBoxW, pageBoxH, 'S');

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(pageText, pw / 2, ph - 20, { align: 'center' });

      // Right: Attribution
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(140, 140, 140);
      doc.text('Generated by Shutter Design Wizard', pw - PAGE.margin, ph - 22, { align: 'right' });
    }
  }

  /**
   * Format louver size for title (using proper fraction characters)
   */
  function formatLouverSizeTitle(size) {
    switch (size) {
      case 1.25: return '1\u00BC"';  // 1¼"
      case 2.5: return '2\u00BD"';   // 2½"
      case 3.5: return '3\u00BD"';   // 3½"
      default: return size + '"';
    }
  }

  /**
   * Generate project name from config
   */
  function generateProjectName(cfg) {
    const sizeStr = cfg.louverSize === 1.25 ? '125' : cfg.louverSize === 2.5 ? '250' : '350';
    const typeStr = cfg.louverType === 'fixed' ? 'fixed' : cfg.louverType === 'movable-front' ? 'front' : 'hidden';
    return `${sizeStr}-${typeStr}-${Math.round(cfg.panelWidth)}-${Math.round(cfg.panelHeight)}`;
  }

  /**
   * Generate filename for PDF
   */
  function generateFilename(cfg) {
    const projectName = generateProjectName(cfg);
    return `shutter-plan-${projectName}.pdf`;
  }

  /**
   * Get type-specific notes for cover page
   */
  function getTypeSpecificNotes(cfg, geo) {
    const notes = [];
    const isMovable = cfg.louverType !== 'fixed';

    // Common notes for all types
    notes.push(`Frame stock is 5/4 (${ShutterCalc.frac(cfg.stockThickness)} finished). Minimum 1".`);
    notes.push('Stile and rail widths are preset. Top and bottom rails adjust according to panel height.');
    notes.push('Plan defaults to dowels for frame joinery. If using mortise and tenon, add tenon length to rails.');
    notes.push('For shutters over 48", a middle rail is recommended for structural integrity.');

    if (cfg.louverType === 'fixed') {
      // Fixed-specific notes
      if (cfg.louverSize === 1.25) {
        notes.push('Fixed louvers attach to routed mortises in stiles. Do not glue louvers.');
      } else {
        notes.push('Fixed louvers use 2 pins per end, assembled tight. Glue pins into stile holes.');
      }
    } else {
      // Movable-specific notes
      notes.push('Movable louvers use one pin per end. Do not glue pins.');
      notes.push('Movable pins have 1/32" shoulder for rotation clearance.');
      notes.push('Tension pins: add 2+ per panel for louver resistance.');
    }

    notes.push('When drilling basswood, drill slowly to avoid binding. Clear chips frequently.');
    notes.push('Plan does not include overlap width for adjoining shutters. Add 3/8" to one stile per pair if needed.');

    // Control arm note for movable
    if (isMovable && geo.controlArmLength) {
      const armType = cfg.louverType === 'movable-hidden' ? 'hidden' : 'front-mounted';
      notes.push(`Control arm is ${armType}, cut to ${ShutterCalc.frac(geo.controlArmLength)}.`);
    }

    // Mouse hole note for front arm
    if (cfg.louverType === 'movable-front' && geo.mouseHole) {
      notes.push(`Route mouse hole in stile: ${ShutterCalc.frac(geo.mouseHole.length)}L x ${ShutterCalc.frac(geo.mouseHole.width)}W x ${ShutterCalc.frac(geo.mouseHole.depth)}D.`);
    }

    return notes;
  }

  // Public API
  return { generate };

})();

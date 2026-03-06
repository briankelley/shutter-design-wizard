/**
 * Shutter Design Calculator
 *
 * Calculates all dimensions for plantation-style louvered shutters
 * based on publicly available Rockler shutter system specifications.
 *
 * Louver size presets derived from:
 *   - 3-1/2": Well-documented (Rockler plans, Woodcraft, forums)
 *   - 2-1/2": Derived from Rockler measuring guide + proportional scaling
 *   - 1-1/4": Derived from Rockler template jig specs + proportional scaling
 */

const ShutterCalc = (() => {

  // ── Preset constants per louver size ──────────────────────────────
  // Each preset defines the fixed geometry of that louver system.
  //
  // Fields:
  //   louverWidth      – finished louver slat width
  //   louverFlat       – flat portion of louver profile (visible face)
  //   louverSpacing    – center-to-center spacing of pin holes on stile
  //   louverThickness  – thickness of louver slat
  //   topRailHeight    – minimum height of the top rail
  //   bottomRailHeight – minimum height of the bottom rail (typically ~1" larger than top)
  //   rabbetDepth      – depth of rabbet on top/bottom rails
  //   stileWidth       – standard stile width
  //   pinsPerLouverEnd – pins per louver end (movable: 1; fixed 2.5/3.5: 2)
  //   middleRailWidth  – width of optional middle rail
  //   middleRailReplacesLouvers – how many louvers a middle rail replaces
  //
  // Note: topClearance and bottomClearance are computed dynamically based on
  // the adjusted rail heights after fitting louvers to the panel.

  const PRESETS = {
    3.5: {
      louverWidth: 3.5,
      louverFlat: 1.0,
      louverSpacing: 3.0,
      louverThickness: 0.375,
      topRailHeight: 3.0,
      bottomRailHeight: 4.0,
      rabbetDepth: 5 / 16,
      stileWidth: 2.0,
      pinsPerLouverEnd: 1,
      middleRailWidth: 4.0,
      middleRailReplacesLouvers: 2,
    },
    2.5: {
      louverWidth: 2.5,
      louverFlat: 1.0,
      louverSpacing: 2.0,
      louverThickness: 0.375,
      topRailHeight: 2.5,
      bottomRailHeight: 3.5,
      rabbetDepth: 5 / 16,
      stileWidth: 2.0,
      pinsPerLouverEnd: 1,
      middleRailWidth: 4.0,
      middleRailReplacesLouvers: 2,
    },
    1.25: {
      louverWidth: 1.25,
      louverFlat: 0.5,
      louverSpacing: 1.0,
      louverThickness: 0.25,
      topRailHeight: 2.0,
      bottomRailHeight: 3.0,
      rabbetDepth: 3 / 16,
      stileWidth: 1.5,
      pinsPerLouverEnd: 1,  // movable uses 1 pin; fixed uses mortises
      middleRailWidth: 3.0,
      middleRailReplacesLouvers: 2,
    },
  };

  /**
   * Main calculation function.
   *
   * @param {Object} opts
   * @param {number} opts.louverSize      - 1.25 | 2.5 | 3.5
   * @param {string} opts.louverType      - "fixed" | "movable-front" | "movable-hidden"
   * @param {number} opts.panelWidth      - finished panel width in inches
   * @param {number} opts.panelHeight     - finished panel height in inches
   * @param {number} opts.numPanels       - number of panels for this window
   * @param {string} opts.joinery         - "dowel" | "mortise-tenon"
   * @param {number} opts.tenonLength     - tenon length per side (if mortise-tenon)
   * @param {boolean} opts.middleRail     - whether to add a middle rail
   * @param {string} opts.woodSpecies     - for labeling only
   * @param {number} opts.stockThickness  - finished frame stock thickness
   * @returns {Object} Complete plan data
   */
  function calculate(opts) {
    const preset = PRESETS[opts.louverSize];
    if (!preset) throw new Error(`Unknown louver size: ${opts.louverSize}`);

    const isMovable = opts.louverType !== 'fixed';
    const pinsPerEnd = isMovable ? 1 : preset.pinsPerLouverEnd;
    const tenonAdd = opts.joinery === 'mortise-tenon' ? (opts.tenonLength || 0.5) * 2 : 0;

    // ── Stile dimensions ──
    const stileLength = opts.panelHeight;
    const stileWidth = preset.stileWidth;

    // ── Compute number of louvers ──
    // Formula verified against Rockler PDFs with 100% accuracy.
    // The - louverSpacing term accounts for the two half-spacing gaps
    // between rail edges and nearest pin holes.
    const minTopRail = preset.topRailHeight;
    const minBottomRail = preset.bottomRailHeight;
    let numLouvers = Math.floor((opts.panelHeight - minTopRail - minBottomRail - preset.louverSpacing) / preset.louverSpacing) + 1;
    if (numLouvers < 1) numLouvers = 1;

    // ── Compute rail heights ──
    // Total space consumed by louver zone (pin-to-pin span plus half-spacing on each end)
    const louverZoneHeight = numLouvers * preset.louverSpacing;
    const totalRailSpace = opts.panelHeight - louverZoneHeight;

    // The minimum rail heights define the ratio for splitting
    const minTotalRail = minTopRail + minBottomRail;

    // Distribute totalRailSpace proportionally to the min rail heights
    let adjTopRailHeight = totalRailSpace * (minTopRail / minTotalRail);
    let adjBottomRailHeight = totalRailSpace * (minBottomRail / minTotalRail);

    // Snap to nearest 1/16" for clean dimensions
    adjTopRailHeight = Math.round(adjTopRailHeight * 16) / 16;
    adjBottomRailHeight = opts.panelHeight - louverZoneHeight - adjTopRailHeight; // ensure exact sum

    // ── Compute clearances (derived from rail heights) ──
    // Distance from stile end to first/last pin hole
    const topClearance = adjTopRailHeight + preset.louverSpacing / 2;
    const bottomClearance = adjBottomRailHeight + preset.louverSpacing / 2;

    // ── Middle rail handling ──
    let middleRailData = null;
    let topSectionLouvers = numLouvers;
    let bottomSectionLouvers = 0;

    if (opts.middleRail) {
      // Remove louvers to make room for middle rail
      const removedLouvers = preset.middleRailReplacesLouvers;
      const effectiveLouvers = numLouvers - removedLouvers;
      if (effectiveLouvers < 2) {
        // Panel too short for a middle rail, ignore
        opts.middleRail = false;
      } else {
        topSectionLouvers = Math.ceil(effectiveLouvers / 2);
        bottomSectionLouvers = effectiveLouvers - topSectionLouvers;

        middleRailData = {
          width: preset.middleRailWidth,
          rabbetDepth: preset.rabbetDepth,
          cuttingWidth: preset.middleRailWidth,
          cuttingLength: opts.panelWidth - 2 * stileWidth + tenonAdd,
        };
      }
    }

    // ── Rail cutting dimensions ──
    // Rail length = panel width minus both stiles (they butt against)
    // plus tenon additions if applicable
    const railLength = opts.panelWidth - 2 * stileWidth + tenonAdd;
    // Rail width (height) as computed
    const topRailCutWidth = adjTopRailHeight;
    const bottomRailCutWidth = adjBottomRailHeight;

    // ── Louver length (type-aware) ──
    let louverLength;
    if (!isMovable && opts.louverSize === 1.25) {
      // 1.25" fixed: louvers extend into stile mortises (5/16" each side)
      louverLength = railLength + 5 / 8;
    } else if (!isMovable) {
      // 2.5"/3.5" fixed: pin-based, sits between stiles
      louverLength = railLength;
    } else {
      // All movable: 1/32" pin shoulder on each end
      louverLength = railLength - 1 / 16;
    }

    // ── Pin hole positions ──
    // Measured from the top of the stile
    const pinPositions = [];
    for (let i = 0; i < numLouvers; i++) {
      if (opts.middleRail && middleRailData) {
        // With middle rail: place top section, skip middle rail zone, place bottom
        if (i < topSectionLouvers) {
          pinPositions.push(topClearance + i * preset.louverSpacing);
        } else {
          // After middle rail gap
          const middleRailCenter = topClearance + (topSectionLouvers - 1) * preset.louverSpacing + preset.middleRailWidth / 2 + preset.louverSpacing;
          const bottomIndex = i - topSectionLouvers;
          pinPositions.push(middleRailCenter + preset.middleRailWidth / 2 + preset.louverSpacing / 2 + bottomIndex * preset.louverSpacing);
        }
      } else {
        pinPositions.push(topClearance + i * preset.louverSpacing);
      }
    }

    // If we're using a middle rail, recalculate louver counts
    const totalLouvers = opts.middleRail && middleRailData
      ? topSectionLouvers + bottomSectionLouvers
      : numLouvers;

    // ── Control arm length (movable types only) ──
    let controlArmLength = null;
    let controlArmOverhang = null;
    let mouseHole = null;

    if (isMovable) {
      const louverZoneSpan = (totalLouvers - 1) * preset.louverSpacing;

      if (opts.louverType === 'movable-hidden') {
        controlArmOverhang = 5 / 16;
      } else if (opts.louverSize === 1.25) {
        controlArmOverhang = 1.25;
      } else {
        controlArmOverhang = 2.0;
      }

      controlArmLength = louverZoneSpan + controlArmOverhang;

      // Mouse hole dimensions (for front arm types)
      if (opts.louverType === 'movable-front') {
        if (opts.louverSize === 1.25) {
          mouseHole = { length: 3 / 4, width: 3 / 8, depth: 1 / 2 };
        } else {
          mouseHole = { length: 1 + 1 / 8, width: 5 / 8, depth: 1 / 2 };
        }
      }
    }

    // ── Hardware count ──
    const totalPins = totalLouvers * 2 * pinsPerEnd;  // 2 ends per louver
    const tensionPinsPerPanel = 2;  // minimum recommended
    const controlArms = isMovable ? (opts.middleRail ? 2 : 1) : 0;
    const metalClips = isMovable ? totalLouvers : 0;

    // ── Build cutting list ──
    const cuttingList = [];

    cuttingList.push({
      part: 'Stile',
      qty: 2 * opts.numPanels,
      width: frac(stileWidth),
      length: frac(stileLength),
      thickness: frac(opts.stockThickness),
      notes: '',
    });

    cuttingList.push({
      part: 'Top Rail',
      qty: 1 * opts.numPanels,
      width: frac(topRailCutWidth),
      length: frac(railLength),
      thickness: frac(opts.stockThickness),
      notes: `${frac(preset.rabbetDepth)} rabbet on bottom edge` + (tenonAdd ? `, includes ${frac(opts.tenonLength)} tenons` : ''),
    });

    cuttingList.push({
      part: 'Bottom Rail',
      qty: 1 * opts.numPanels,
      width: frac(bottomRailCutWidth),
      length: frac(railLength),
      thickness: frac(opts.stockThickness),
      notes: `${frac(preset.rabbetDepth)} rabbet on top edge` + (tenonAdd ? `, includes ${frac(opts.tenonLength)} tenons` : ''),
    });

    if (opts.middleRail && middleRailData) {
      cuttingList.push({
        part: 'Middle Rail',
        qty: 1 * opts.numPanels,
        width: frac(middleRailData.width),
        length: frac(middleRailData.cuttingLength),
        thickness: frac(opts.stockThickness),
        notes: `${frac(preset.rabbetDepth)} rabbet on both edges` + (tenonAdd ? `, includes ${frac(opts.tenonLength)} tenons` : ''),
      });
    }

    cuttingList.push({
      part: 'Louver Slat',
      qty: totalLouvers * opts.numPanels,
      width: frac(preset.louverWidth),
      length: frac(louverLength),
      thickness: frac(preset.louverThickness),
      notes: isMovable ? 'Route louver profile' : 'Route louver profile, glue in place',
    });

    // Control arm (movable types only)
    if (isMovable && controlArmLength) {
      cuttingList.push({
        part: 'Control Arm',
        qty: controlArms * opts.numPanels,
        width: opts.louverType === 'movable-hidden' ? '1/4"' : '3/8"',
        length: frac(controlArmLength),
        thickness: '-',
        notes: opts.louverType === 'movable-hidden' ? 'Hidden behind stile' : 'Front-mounted' + (mouseHole ? `, route mouse hole: ${frac(mouseHole.length)} L x ${frac(mouseHole.width)} W x ${frac(mouseHole.depth)} D` : ''),
      });
    }

    // ── Build hardware list ──
    const hardwareList = [];

    hardwareList.push({
      item: isMovable ? 'Shutter Pins (movable)' : 'Shutter Pins (fixed)',
      qty: totalPins * opts.numPanels,
      notes: isMovable ? '1/32" shoulder for rotation clearance. Do not glue.' : 'Glue into stile holes.',
    });

    if (isMovable) {
      hardwareList.push({
        item: 'Tension Pins',
        qty: tensionPinsPerPanel * opts.numPanels,
        notes: 'Provides louver resistance. Install 2+ per panel.',
      });

      hardwareList.push({
        item: 'Metal Clips',
        qty: metalClips * opts.numPanels,
        notes: 'Connect louvers to control arm.',
      });

      hardwareList.push({
        item: opts.louverType === 'movable-front' ? 'Front Control Arm' : 'Hidden Control Arm (rear)',
        qty: controlArms * opts.numPanels,
        notes: opts.middleRail ? 'One per section (top and bottom).' : 'One per panel. Cut to fit louver count.',
      });
    }

    if (opts.joinery === 'dowel') {
      hardwareList.push({
        item: 'Dowel Pins (1/4" x 1-1/2")',
        qty: (opts.middleRail ? 12 : 8) * opts.numPanels,
        notes: '2 per rail-to-stile joint.',
      });
    }

    hardwareList.push({
      item: 'Shutter Hinges',
      qty: 2 * opts.numPanels,
      notes: 'Mount 3" from top and bottom of panel.',
    });

    // ── Construction notes ──
    const notes = [];
    notes.push(`All frame stock (stiles and rails) should be ${frac(opts.stockThickness)} thick (5/4 stock planed). Minimum 1".`);
    notes.push(`Louver slats are ${frac(preset.louverThickness)} thick with a routed profile (${frac(preset.louverWidth)} wide, ${frac(preset.louverFlat)} flat face).`);
    notes.push(`Stile pin holes are spaced ${frac(preset.louverSpacing)} on center.`);
    notes.push(`First pin hole is ${frac(topClearance)} from top of stile.`);

    if (isMovable) {
      notes.push('Movable pins have a 1/32" shoulder for rotation clearance. Do not glue pins in louver or stile.');
      if (controlArmLength) {
        notes.push(`Control arm length: ${frac(controlArmLength)} (includes ${frac(controlArmOverhang)} overhang).`);
      }
      if (mouseHole) {
        notes.push(`Route mouse hole in stile: ${frac(mouseHole.length)} L x ${frac(mouseHole.width)} W x ${frac(mouseHole.depth)} D.`);
      }
    } else {
      // Fixed louver notes depend on size
      if (opts.louverSize === 1.25) {
        notes.push('Fixed louvers are set into routed mortises in the stiles. Angle louvers as desired before glue sets.');
      } else {
        notes.push('Fixed louvers use 2 pins per end, assembled tight. Glue pins into stile holes.');
      }
    }

    if (opts.joinery === 'dowel') {
      notes.push('Frame joinery uses dowels or loose tenons. Drill 1/4" holes in rail ends and stile faces.');
    } else {
      notes.push(`Frame joinery uses mortise & tenon. Each tenon is ${frac(opts.tenonLength)} long.`);
    }

    if (opts.middleRail) {
      notes.push(`Middle rail is ${frac(preset.middleRailWidth)} wide with ${frac(preset.rabbetDepth)} rabbets on both edges.`);
    }

    notes.push('Rabbet rails on the louver-facing edge to receive louver ends.');
    notes.push('Drill slowly through basswood to avoid binding. Clear chips frequently.');

    if (opts.panelHeight > 48 && !opts.middleRail) {
      notes.push('WARNING: Panel exceeds 48". A middle rail is strongly recommended for structural integrity.');
    }

    notes.push('Plans do not include extra stile width for overlap between adjoining shutter panels. Add 3/8" to one stile per pair if overlap is desired.');

    return {
      // Input echo
      config: {
        louverSize: opts.louverSize,
        louverType: opts.louverType,
        panelWidth: opts.panelWidth,
        panelHeight: opts.panelHeight,
        numPanels: opts.numPanels,
        joinery: opts.joinery,
        tenonLength: opts.tenonLength,
        middleRail: opts.middleRail && !!middleRailData,
        woodSpecies: opts.woodSpecies,
        stockThickness: opts.stockThickness,
      },
      // Computed geometry
      geometry: {
        stileWidth,
        stileLength,
        topRailHeight: adjTopRailHeight,
        bottomRailHeight: adjBottomRailHeight,
        rabbetDepth: preset.rabbetDepth,
        louverWidth: preset.louverWidth,
        louverLength,
        louverThickness: preset.louverThickness,
        louverSpacing: preset.louverSpacing,
        topClearance,
        bottomClearance,
        numLouvers: totalLouvers,
        topSectionLouvers: opts.middleRail && middleRailData ? topSectionLouvers : totalLouvers,
        bottomSectionLouvers: opts.middleRail && middleRailData ? bottomSectionLouvers : 0,
        pinPositions,
        middleRail: opts.middleRail && middleRailData ? middleRailData : null,
        railLength,
        controlArmLength,
        controlArmOverhang,
        mouseHole,
      },
      cuttingList,
      hardwareList,
      notes,
    };
  }

  // ── Fraction formatting ──────────────────────────────────────────
  // Convert a decimal inch value to a friendly fractional string.

  function frac(value) {
    if (typeof value !== 'number' || isNaN(value)) return String(value);

    const negative = value < 0;
    value = Math.abs(value);

    const whole = Math.floor(value);
    let remainder = value - whole;

    // Snap to nearest 1/16
    const sixteenths = Math.round(remainder * 16);
    if (sixteenths === 0) {
      return (negative ? '-' : '') + whole + '"';
    }
    if (sixteenths === 16) {
      return (negative ? '-' : '') + (whole + 1) + '"';
    }

    // Reduce fraction
    let num = sixteenths;
    let den = 16;
    while (num % 2 === 0 && den > 1) {
      num /= 2;
      den /= 2;
    }

    const fracStr = `${num}/${den}`;
    if (whole === 0) {
      return (negative ? '-' : '') + fracStr + '"';
    }
    return (negative ? '-' : '') + `${whole}-${fracStr}"`;
  }

  // Public API
  return { calculate, frac, PRESETS };

})();

/**
 * Wizard Controller
 *
 * Manages step navigation, validation, card selection, and result rendering.
 */

(() => {
  // ── State ──
  let currentStep = 1;
  let selectedLouverSize = null;
  let selectedLouverType = null;
  let currentPlan = null;

  // ── DOM refs ──
  const steps = [1, 2, 3, 4].map(n => document.getElementById(`step-${n}`));
  const progressSteps = document.querySelectorAll('.progress-step');

  // ── Card selection wiring ──
  function wireCardSelect(containerId, callback) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        callback(card.dataset.value);
      });
    });
  }

  wireCardSelect('louver-size-select', val => { selectedLouverSize = parseFloat(val); });
  wireCardSelect('louver-type-select', val => { selectedLouverType = val; });

  // ── Joinery toggle ──
  const joinerySelect = document.getElementById('joinery');
  const tenonNote = document.getElementById('tenon-note');
  const tenonGroup = document.getElementById('tenon-length-group');
  joinerySelect.addEventListener('change', () => {
    const isMT = joinerySelect.value === 'mortise-tenon';
    tenonNote.classList.toggle('hidden', !isMT);
    tenonGroup.style.display = isMT ? '' : 'none';
  });

  // ── Navigation ──
  function goToStep(n) {
    steps.forEach(s => s.classList.add('hidden'));
    document.getElementById(`step-${n}`).classList.remove('hidden');

    progressSteps.forEach(ps => {
      const sn = parseInt(ps.dataset.step);
      ps.classList.remove('active', 'completed');
      if (sn === n) ps.classList.add('active');
      else if (sn < n) ps.classList.add('completed');
    });

    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Step 1 -> 2
  document.getElementById('btn-next-1').addEventListener('click', () => {
    clearErrors();
    if (!selectedLouverSize) {
      flashError('louver-size-select', 'Please select a louver size.');
      return;
    }
    if (!selectedLouverType) {
      flashError('louver-type-select', 'Please select a louver type.');
      return;
    }
    goToStep(2);
  });

  // Step 2 -> 3
  document.getElementById('btn-next-2').addEventListener('click', () => {
    clearErrors();
    const w = parseFloat(document.getElementById('panel-width').value);
    const h = parseFloat(document.getElementById('panel-height').value);

    if (!w || w < 6 || w > 24) {
      flashError('panel-width', 'Panel width must be between 6" and 24".');
      document.getElementById('panel-width').classList.add('input-error');
      return;
    }
    if (!h || h < 8 || h > 96) {
      flashError('panel-height', 'Panel height must be between 8" and 96".');
      document.getElementById('panel-height').classList.add('input-error');
      return;
    }

    // Auto-check middle rail suggestion
    const middleRailCb = document.getElementById('middle-rail');
    const middleRailNote = document.getElementById('middle-rail-auto-note');
    if (h > 48) {
      middleRailCb.checked = true;
      middleRailNote.classList.remove('hidden');
    } else {
      middleRailNote.classList.add('hidden');
    }

    goToStep(3);
  });

  // Step 3 -> 4 (generate)
  document.getElementById('btn-next-3').addEventListener('click', () => {
    clearErrors();

    const opts = {
      louverSize: selectedLouverSize,
      louverType: selectedLouverType,
      panelWidth: parseFloat(document.getElementById('panel-width').value),
      panelHeight: parseFloat(document.getElementById('panel-height').value),
      numPanels: parseInt(document.getElementById('num-panels').value),
      joinery: document.getElementById('joinery').value,
      tenonLength: parseFloat(document.getElementById('tenon-length').value) || 0.5,
      middleRail: document.getElementById('middle-rail').checked,
      woodSpecies: document.getElementById('wood-species').value,
      stockThickness: parseFloat(document.getElementById('stock-thickness').value) || 1.0625,
    };

    try {
      currentPlan = ShutterCalc.calculate(opts);
      renderResults(currentPlan);
      goToStep(4);
    } catch (e) {
      alert('Calculation error: ' + e.message);
      console.error(e);
    }
  });

  // Back buttons
  document.getElementById('btn-back-2').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-back-3').addEventListener('click', () => goToStep(2));

  // Results actions
  document.getElementById('btn-download-pdf').addEventListener('click', () => {
    if (currentPlan) ShutterPDF.generate(currentPlan);
  });

  document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btn-start-over').addEventListener('click', () => {
    currentPlan = null;
    selectedLouverSize = null;
    selectedLouverType = null;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    document.getElementById('panel-width').value = '';
    document.getElementById('panel-height').value = '';
    document.getElementById('num-panels').value = '2';
    document.getElementById('joinery').value = 'dowel';
    document.getElementById('tenon-length').value = '0.5';
    document.getElementById('middle-rail').checked = false;
    document.getElementById('middle-rail-auto-note').classList.add('hidden');
    document.getElementById('wood-species').value = 'basswood';
    document.getElementById('stock-thickness').value = '1.0625';
    tenonNote.classList.add('hidden');
    tenonGroup.style.display = 'none';
    goToStep(1);
  });

  // ── Render Results ──
  function renderResults(plan) {
    const cfg = plan.config;
    const geo = plan.geometry;

    const typeLabels = {
      'fixed': 'Fixed',
      'movable-front': 'Movable (Front Arm)',
      'movable-hidden': 'Movable (Hidden Arm)',
    };

    // Summary
    document.getElementById('result-summary').innerHTML = `
      <h3>Summary</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Louver Size</div>
          <div class="value">${ShutterCalc.frac(cfg.louverSize)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Louver Type</div>
          <div class="value">${typeLabels[cfg.louverType]}</div>
        </div>
        <div class="summary-item">
          <div class="label">Panel Size</div>
          <div class="value">${ShutterCalc.frac(cfg.panelWidth)} &times; ${ShutterCalc.frac(cfg.panelHeight)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Panels</div>
          <div class="value">${cfg.numPanels}</div>
        </div>
        <div class="summary-item">
          <div class="label">Louvers / Panel</div>
          <div class="value">${geo.numLouvers}</div>
        </div>
        <div class="summary-item">
          <div class="label">Louver Spacing</div>
          <div class="value">${ShutterCalc.frac(geo.louverSpacing)} o.c.</div>
        </div>
        <div class="summary-item">
          <div class="label">Joinery</div>
          <div class="value">${cfg.joinery === 'dowel' ? 'Dowel' : 'M&T'}</div>
        </div>
        <div class="summary-item">
          <div class="label">Wood</div>
          <div class="value">${cfg.woodSpecies.charAt(0).toUpperCase() + cfg.woodSpecies.slice(1)}</div>
        </div>
      </div>
    `;

    // Elevation drawing
    const elevCanvas = document.getElementById('elevation-canvas');
    ShutterDrawing.drawElevation(elevCanvas, plan);

    // Cross-section drawing
    const csCanvas = document.getElementById('cross-section-canvas');
    ShutterDrawing.drawCrossSection(csCanvas, plan);

    // Cutting list
    const cuttingBody = document.querySelector('#cutting-table tbody');
    cuttingBody.innerHTML = '';
    for (const item of plan.cuttingList) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${esc(item.part)}</strong></td>
        <td>${item.qty}</td>
        <td>${esc(item.width)}</td>
        <td>${esc(item.length)}</td>
        <td>${esc(item.thickness)}</td>
        <td>${esc(item.notes)}</td>
      `;
      cuttingBody.appendChild(tr);
    }

    // Hardware list
    const hwBody = document.querySelector('#hardware-table tbody');
    hwBody.innerHTML = '';
    for (const item of plan.hardwareList) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${esc(item.item)}</strong></td>
        <td>${item.qty}</td>
        <td>${esc(item.notes)}</td>
      `;
      hwBody.appendChild(tr);
    }

    // Construction notes
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = '';
    for (const note of plan.notes) {
      const li = document.createElement('li');
      li.textContent = note;
      notesList.appendChild(li);
    }
  }

  // ── Validation helpers ──
  function flashError(nearId, msg) {
    const el = document.getElementById(nearId);
    const err = document.createElement('div');
    err.className = 'error-msg';
    err.textContent = msg;
    el.parentElement.appendChild(err);
  }

  function clearErrors() {
    document.querySelectorAll('.error-msg').forEach(e => e.remove());
    document.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));
  }

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

})();

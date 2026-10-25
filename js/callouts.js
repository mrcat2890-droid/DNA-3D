/**
 * Dynamic 3D-to-2D Callout Tracker & HUD Overlay
 * Projects 3D anchor points from the rotating DNA model to screen space coordinates
 * and draws angled leader lines and holographic badges in real time.
 */

class CalloutManager {
  constructor(camera, dnaModel, containerId, svgId) {
    this.camera = camera;
    this.dnaModel = dnaModel;
    this.container = document.getElementById(containerId);
    this.svg = document.getElementById(svgId);
    this.visible = true;

    // Define annotations with their 3D anchor key, badge text, and screen offset
    this.pins = [
      {
        id: 'pin-lysine',
        anchorKey: 'LYSINE_127',
        text: 'LYSINE 127 RESIDUE',
        offsetX: -140,
        offsetY: -35,
        detail: {
          name: 'LYSINE 127 RESIDUE',
          type: 'Basic Positively Charged Amino Acid',
          bonds: 'Electrostatic & H-Bond interactions with phosphate backbone',
          axis: 'Major Groove Binding Pocket',
          energy: '-4.6 kcal/mol'
        }
      },
      {
        id: 'pin-bdna',
        anchorKey: 'BDNA_HELIX',
        text: 'B-DNA HELIX MODEL',
        offsetX: -130,
        offsetY: 0,
        detail: {
          name: 'B-DNA RIGHT-HANDED DOUBLE HELIX',
          type: 'Canonical Watson-Crick B-Form Conformation',
          bonds: '10.5 base pairs / turn (pitch: 34 Å)',
          axis: 'Helical diameter: 20 Å',
          energy: 'Base-stacking ΔG: -1.4 kcal/mol/bp'
        }
      },
      {
        id: 'pin-at-upper',
        anchorKey: 'AT_BOND_UPPER',
        text: 'A-T HYDROGEN BOND',
        offsetX: -150,
        offsetY: 50,
        detail: {
          name: 'ADENINE - THYMINE BASE PAIR',
          type: 'Purine-Pyrimidine Complementary Pair',
          bonds: '2 Hydrogen Bonds (N1-H3 and N6-O4)',
          axis: 'Distance: 2.82 Å',
          energy: '-13.2 kcal/mol'
        }
      },
      {
        id: 'pin-at-lower',
        anchorKey: 'AT_BOND_LOWER',
        text: 'A-T HYDROGEN BOND',
        offsetX: 140,
        offsetY: -45,
        detail: {
          name: 'A-T HYDROGEN BOND (DUAL BRIDGE)',
          type: 'Non-Covalent Electrostatic Dipole Coupling',
          bonds: '2 Hydrogen Bonds (Inter-base distance 2.9 Å)',
          axis: 'Minor Groove Exposure',
          energy: '-13.1 kcal/mol'
        }
      },
      {
        id: 'pin-base',
        anchorKey: 'NITROGEN_BASE',
        text: 'NITROGENOUS BASE',
        offsetX: 155,
        offsetY: 15,
        detail: {
          name: 'HETEROCYCLIC NITROGENOUS BASE',
          type: 'Aromatic Ring System (Purine / Pyrimidine)',
          bonds: 'Glycosidic bond to deoxyribose C1',
          axis: 'Perpendicular to helical axis (Tilt: -6°)',
          energy: 'Stabilized by Pi-Pi electron cloud overlap'
        }
      },
      {
        id: 'pin-backbone-dir',
        anchorKey: 'BACKBONE_DIR',
        text: "5' TO 3' BACKBONE DIRECTION",
        offsetX: 165,
        offsetY: 70,
        detail: {
          name: "PHOSPHODIESTER BACKBONE (5' → 3')",
          type: 'Asymmetric Directional Strand',
          bonds: "Alternating phosphate and deoxyribose units",
          axis: "Antiparallel relative to complementary strand",
          energy: 'Covalent ester bonds'
        }
      },
      {
        id: 'pin-mol-binding',
        anchorKey: 'MOL_BINDING',
        text: 'MOLECULAR BINDING FRECULATION',
        offsetX: 160,
        offsetY: 45,
        detail: {
          name: 'MOLECULAR BINDING SITE',
          type: 'Intercalation & Minor Groove Solvation',
          bonds: 'Hydration shell & counter-ion atmosphere (Na+/Mg2+)',
          axis: 'Coordinates: +3.2, -18.4, +4.1',
          energy: 'Enthalpic stabilization ΔH: -8.4 kcal/mol'
        }
      }
    ];

    this.domElements = {};
    this.createDomElements();
  }

  createDomElements() {
    this.pins.forEach(pin => {
      const badge = document.createElement('div');
      badge.className = 'hud-pin-label';
      badge.id = pin.id;
      badge.innerHTML = `
        <span class="hud-pin-marker"></span>
        <span>${pin.text}</span>
      `;

      // On badge click, open inspector modal
      badge.addEventListener('click', () => {
        if (window.App && window.App.showInspector) {
          window.App.showInspector(pin.detail);
        }
      });

      this.container.appendChild(badge);
      this.domElements[pin.id] = badge;
    });
  }

  setVisible(state) {
    this.visible = state;
    this.container.style.display = state ? 'block' : 'none';
    this.svg.style.display = state ? 'block' : 'none';
  }

  update() {
    if (!this.visible || !this.dnaModel) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    let svgContent = '';

    const matrixWorld = this.dnaModel.group.matrixWorld;

    this.pins.forEach(pin => {
      const localAnchor = this.dnaModel.annotationAnchors[pin.anchorKey];
      if (!localAnchor) return;

      // Transform local 3D position to screen coordinates
      const worldPos = localAnchor.clone().applyMatrix4(matrixWorld);
      const proj = worldPos.clone().project(this.camera);

      // Check if point is behind camera
      if (proj.z > 1) {
        if (this.domElements[pin.id]) this.domElements[pin.id].style.display = 'none';
        return;
      }

      if (this.domElements[pin.id]) this.domElements[pin.id].style.display = 'flex';

      // Screen coordinates (px)
      const sx = (proj.x * 0.5 + 0.5) * width;
      const sy = (-proj.y * 0.5 + 0.5) * height;

      // Position badge
      const badgeX = sx + pin.offsetX;
      const badgeY = sy + pin.offsetY;

      const badgeElem = this.domElements[pin.id];
      if (badgeElem) {
        badgeElem.style.left = `${badgeX}px`;
        badgeElem.style.top = `${badgeY}px`;
      }

      // Draw angled leader line
      // From 3D anchor (sx, sy) to elbow, then to badge
      const elbowX = pin.offsetX < 0 ? badgeX + 45 : badgeX - 45;
      const elbowY = badgeY;

      // Leader line path
      svgContent += `
        <!-- Anchor Dot -->
        <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="3" fill="#00e5ff" />
        <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="6" fill="none" stroke="#00e5ff" stroke-width="0.8" opacity="0.6" />
        
        <!-- Angled Leader Line -->
        <polyline points="${sx.toFixed(1)},${sy.toFixed(1)} ${elbowX.toFixed(1)},${elbowY.toFixed(1)} ${badgeX.toFixed(1)},${badgeY.toFixed(1)}" 
                  fill="none" 
                  stroke="rgba(0, 229, 255, 0.65)" 
                  stroke-width="1.2" 
                  stroke-dasharray="3, 1" />
      `;

      // Special addition for 5' to 3' backbone: curved orientation arrow
      if (pin.anchorKey === 'BACKBONE_DIR') {
        const arrowStart = sx - 25;
        const arrowEnd = sx + 15;
        svgContent += `
          <path d="M ${arrowStart} ${sy + 20} Q ${sx} ${sy + 40} ${arrowEnd} ${sy + 28}" 
                fill="none" 
                stroke="#00e5ff" 
                stroke-width="1.5" 
                marker-end="url(#arrowhead)" />
        `;
      }
    });

    // Add marker definition if needed
    svgContent = `
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill="#00e5ff" />
        </marker>
      </defs>
    ` + svgContent;

    this.svg.innerHTML = svgContent;
  }
}

window.CalloutManager = CalloutManager;

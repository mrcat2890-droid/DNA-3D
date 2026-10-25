/**
 * Scientific Charts Renderer for Molecular Biology HUD
 * Generates high-fidelity SVG scientific charts matching the reference image.
 */

const Charts = {
  init() {
    this.renderFreeEnergy();
    this.renderThermalStability1();
    this.renderPolypepOptimization1();
    this.renderThermalStability2();
    this.renderPolypepOptimization2();
  },

  // 1. Molecular Binding Free Energy Scatter Plot + Regression Line
  renderFreeEnergy() {
    const container = document.getElementById('chart-free-energy');
    if (!container) return;

    const width = 290;
    const height = 125;
    const pad = { top: 10, right: 15, bottom: 25, left: 32 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    // Generate scatter points along diagonal
    let pointsSvg = '';
    // Seeded random points
    for (let i = 0; i < 110; i++) {
      const u = (Math.random() + Math.random() + Math.random()) / 3;
      const x = u * innerW;
      const noise = (Math.random() - 0.5) * 22;
      // y goes from bottom-left to top-right
      const y = innerH - (u * innerH) + noise;
      const clampedY = Math.max(2, Math.min(innerH - 2, y));
      const opacity = 0.55 + Math.random() * 0.45;
      const r = 1.2 + Math.random() * 0.8;
      pointsSvg += `<circle cx="${(pad.left + x).toFixed(1)}" cy="${(pad.top + clampedY).toFixed(1)}" r="${r.toFixed(1)}" fill="#00e5ff" opacity="${opacity.toFixed(2)}" />`;
    }

    const svg = `
      <svg viewBox="0 0 ${width} ${height}">
        <!-- Axes -->
        <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="chart-axis-line" />
        <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="chart-axis-line" />
        
        <!-- Y-Ticks & Labels (-20 to 10) -->
        <text x="${pad.left - 4}" y="${pad.top + 5}" class="chart-label" text-anchor="end">10</text>
        <line x1="${pad.left - 2}" y1="${pad.top + 4}" x2="${pad.left}" y2="${pad.top + 4}" class="chart-axis-line" />
        
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.33}" class="chart-label" text-anchor="end">0</text>
        <line x1="${pad.left - 2}" y1="${pad.top + innerH * 0.33}" x2="${pad.left}" y2="${pad.top + innerH * 0.33}" class="chart-axis-line" />
        
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.66}" class="chart-label" text-anchor="end">-10</text>
        <line x1="${pad.left - 2}" y1="${pad.top + innerH * 0.66}" x2="${pad.left}" y2="${pad.top + innerH * 0.66}" class="chart-axis-line" />

        <text x="${pad.left - 4}" y="${height - pad.bottom}" class="chart-label" text-anchor="end">-20</text>

        <!-- X-Ticks & Labels (-20 to 10) -->
        <text x="${pad.left}" y="${height - 12}" class="chart-label" text-anchor="middle">-20</text>
        <text x="${pad.left + innerW * 0.33}" y="${height - 12}" class="chart-label" text-anchor="middle">-15</text>
        <text x="${pad.left + innerW * 0.66}" y="${height - 12}" class="chart-label" text-anchor="middle">-10</text>
        <text x="${width - pad.right}" y="${height - 12}" class="chart-label" text-anchor="middle">-5</text>

        <!-- Y Axis Title -->
        <text transform="rotate(-90)" x="${-(pad.top + innerH / 2)}" y="10" class="chart-title-axis" text-anchor="middle">Molecular binding energy (eV)</text>
        <!-- X Axis Title -->
        <text x="${pad.left + innerW / 2}" y="${height - 2}" class="chart-title-axis" text-anchor="middle">Molecular binding free energy (M)</text>

        <!-- Scatter Points -->
        ${pointsSvg}

        <!-- Regression Line -->
        <line x1="${pad.left + 10}" y1="${height - pad.bottom - 10}" x2="${width - pad.right - 10}" y2="${pad.top + 8}" stroke="#f59e0b" stroke-width="1.3" opacity="0.9" />
      </svg>
      <div class="trend-badge">+ 0.00889 - 0.0665</div>
    `;

    container.innerHTML = svg;
  },

  // 2. DNA Thermal Stability Multi-Sigmoid Curve
  renderThermalStability1() {
    const container = document.getElementById('chart-thermal-1');
    const legendContainer = document.getElementById('legend-thermal-1');
    if (!container) return;

    const curves = [
      { name: 'DN 0.10', color: '#2dd4bf', tm: 47, k: 0.35 },
      { name: 'DN 0.12', color: '#00e5ff', tm: 48, k: 0.40 },
      { name: 'DN 0.12', color: '#38bdf8', tm: 49, k: 0.38 },
      { name: 'DN 0.15', color: '#818cf8', tm: 49.5, k: 0.42 },
      { name: 'DN 0.17', color: '#e879f9', tm: 51, k: 0.37 },
      { name: 'DN 0.18', color: '#ff2a8d', tm: 52, k: 0.36 }
    ];

    if (legendContainer) {
      legendContainer.innerHTML = curves.map(c => `
        <span class="legend-item" style="font-size:7.5px;">
          <span class="legend-swatch" style="background:${c.color};"></span>${c.name}
        </span>
      `).join('');
    }

    const width = 290;
    const height = 125;
    const pad = { top: 12, right: 15, bottom: 25, left: 32 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    // Sigmoid path builder
    const paths = curves.map(curve => {
      let d = '';
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const temp = 20 + (i / steps) * 50; // 20 to 70 C
        const val = 100 / (1 + Math.exp(-curve.k * (temp - curve.tm)));
        const px = pad.left + (i / steps) * innerW;
        const py = pad.top + innerH - (val / 100) * innerH;
        d += (i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
      return `<path d="${d}" fill="none" stroke="${curve.color}" stroke-width="1.3" opacity="0.9" />`;
    }).join('');

    // Tm threshold line at temp 48C
    const tmRatio = (48 - 20) / 50;
    const tmX = pad.left + tmRatio * innerW;

    const svg = `
      <svg viewBox="0 0 ${width} ${height}">
        <!-- Axes -->
        <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="chart-axis-line" />
        <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="chart-axis-line" />
        
        <!-- Y-Ticks & Labels -->
        <text x="${pad.left - 4}" y="${pad.top + 4}" class="chart-label" text-anchor="end">100</text>
        <line x1="${pad.left - 2}" y1="${pad.top + 4}" x2="${pad.left}" y2="${pad.top + 4}" class="chart-axis-line" />
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.5}" class="chart-label" text-anchor="end">50</text>
        <line x1="${pad.left - 2}" y1="${pad.top + innerH * 0.5}" x2="${pad.left}" y2="${pad.top + innerH * 0.5}" class="chart-axis-line" />
        <text x="${pad.left - 4}" y="${height - pad.bottom}" class="chart-label" text-anchor="end">0</text>

        <!-- X-Ticks & Labels (20 to 70 C) -->
        <text x="${pad.left}" y="${height - 12}" class="chart-label" text-anchor="middle">20</text>
        <text x="${pad.left + innerW * 0.2}" y="${height - 12}" class="chart-label" text-anchor="middle">30</text>
        <text x="${pad.left + innerW * 0.4}" y="${height - 12}" class="chart-label" text-anchor="middle">40</text>
        <text x="${pad.left + innerW * 0.6}" y="${height - 12}" class="chart-label" text-anchor="middle">50</text>
        <text x="${pad.left + innerW * 0.8}" y="${height - 12}" class="chart-label" text-anchor="middle">60</text>
        <text x="${width - pad.right}" y="${height - 12}" class="chart-label" text-anchor="middle">70</text>

        <!-- Axis Titles -->
        <text transform="rotate(-90)" x="${-(pad.top + innerH / 2)}" y="10" class="chart-title-axis" text-anchor="middle">Temperature (%)</text>
        <text x="${pad.left + innerW / 2}" y="${height - 2}" class="chart-title-axis" text-anchor="middle">Temperature (°C)</text>

        <!-- Tm vertical dashed line -->
        <line x1="${tmX}" y1="${pad.top}" x2="${tmX}" y2="${height - pad.bottom}" stroke="#f59e0b" stroke-dasharray="2,2" stroke-width="1" />

        <!-- Curves -->
        ${paths}
      </svg>
    `;

    container.innerHTML = svg;
  },

  // 3. Polypep-Sequence Optimization (Left grouped bar chart)
  renderPolypepOptimization1() {
    const container = document.getElementById('chart-polypep-1');
    if (!container) return;

    const data = [
      { seq: 'A11', v1: 26, v2: 12 },
      { seq: 'AE2', v1: 62, v2: 0 },
      { seq: 'AE3', v1: 36, v2: 24 },
      { seq: 'BE4', v1: 42, v2: 26 },
      { seq: 'D15', v1: 42, v2: 28 },
      { seq: 'D16', v1: 56, v2: 25 },
      { seq: 'D18', v1: 50, v2: 38 }
    ];

    const width = 290;
    const height = 125;
    const pad = { top: 12, right: 15, bottom: 25, left: 32 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const groupW = innerW / data.length;
    const barW = groupW * 0.32;

    const barsSvg = data.map((d, i) => {
      const gx = pad.left + i * groupW;
      const h1 = (d.v1 / 70) * innerH;
      const h2 = (d.v2 / 70) * innerH;
      const y1 = height - pad.bottom - h1;
      const y2 = height - pad.bottom - h2;

      return `
        <rect x="${gx + groupW * 0.15}" y="${y1}" width="${barW}" height="${h1}" fill="#00e5ff" rx="1" opacity="0.9" />
        <rect x="${gx + groupW * 0.15 + barW + 2}" y="${y2}" width="${barW}" height="${h2}" fill="#ff2a8d" rx="1" opacity="0.9" />
        <text x="${gx + groupW * 0.5}" y="${height - 12}" class="chart-label" text-anchor="middle">${d.seq}</text>
      `;
    }).join('');

    const svg = `
      <svg viewBox="0 0 ${width} ${height}">
        <!-- Axes -->
        <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="chart-axis-line" />
        <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="chart-axis-line" />
        
        <!-- Y-Ticks -->
        <text x="${pad.left - 4}" y="${pad.top + 4}" class="chart-label" text-anchor="end">70</text>
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.3}" class="chart-label" text-anchor="end">50</text>
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.7}" class="chart-label" text-anchor="end">20</text>
        <text x="${pad.left - 4}" y="${height - pad.bottom}" class="chart-label" text-anchor="end">0</text>

        <!-- Titles -->
        <text transform="rotate(-90)" x="${-(pad.top + innerH / 2)}" y="10" class="chart-title-axis" text-anchor="middle">Reflective score</text>
        <text x="${pad.left + innerW / 2}" y="${height - 2}" class="chart-title-axis" text-anchor="middle">Polypeptide Sequence</text>

        <!-- Bars -->
        ${barsSvg}
      </svg>
    `;

    container.innerHTML = svg;
  },

  // 4. DNA Thermal Stability (Right single curve with Tm)
  renderThermalStability2() {
    const container = document.getElementById('chart-thermal-2');
    if (!container) return;

    const width = 290;
    const height = 125;
    const pad = { top: 12, right: 15, bottom: 25, left: 32 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    // Single steep magenta curve
    let d = '';
    const steps = 45;
    for (let i = 0; i <= steps; i++) {
      const temp = 20 + (i / steps) * 40; // 20 to 60 C
      const val = 100 / (1 + Math.exp(-0.45 * (temp - 46)));
      const px = pad.left + (i / steps) * innerW;
      const py = pad.top + innerH - (val / 120) * innerH;
      d += (i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`);
    }

    const tmRatio = (46 - 20) / 40;
    const tmX = pad.left + tmRatio * innerW;

    const svg = `
      <svg viewBox="0 0 ${width} ${height}">
        <!-- Axes -->
        <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="chart-axis-line" />
        <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="chart-axis-line" />
        
        <!-- Y-Ticks & Labels -->
        <text x="${pad.left - 4}" y="${pad.top + 4}" class="chart-label" text-anchor="end">120</text>
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.2}" class="chart-label" text-anchor="end">100</text>
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.5}" class="chart-label" text-anchor="end">60</text>
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.8}" class="chart-label" text-anchor="end">20</text>
        <text x="${pad.left - 4}" y="${height - pad.bottom}" class="chart-label" text-anchor="end">0</text>

        <!-- X-Ticks & Labels (20 to 60 C) -->
        <text x="${pad.left}" y="${height - 12}" class="chart-label" text-anchor="middle">20</text>
        <text x="${pad.left + innerW * 0.25}" y="${height - 12}" class="chart-label" text-anchor="middle">30</text>
        <text x="${pad.left + innerW * 0.5}" y="${height - 12}" class="chart-label" text-anchor="middle">40</text>
        <text x="${pad.left + innerW * 0.75}" y="${height - 12}" class="chart-label" text-anchor="middle">50</text>
        <text x="${width - pad.right}" y="${height - 12}" class="chart-label" text-anchor="middle">60</text>

        <!-- Axis Titles -->
        <text transform="rotate(-90)" x="${-(pad.top + innerH / 2)}" y="10" class="chart-title-axis" text-anchor="middle">Thermal stability (%)</text>
        <text x="${pad.left + innerW / 2}" y="${height - 2}" class="chart-title-axis" text-anchor="middle">Temperatures (°C)</text>

        <!-- Tm vertical dashed line and label -->
        <line x1="${tmX}" y1="${pad.top}" x2="${tmX}" y2="${height - pad.bottom}" stroke="#f59e0b" stroke-dasharray="2,2" stroke-width="1.2" />
        <text x="${tmX + 3}" y="${height - pad.bottom - 4}" fill="#f59e0b" font-family="var(--font-mono)" font-size="8.5px">Tm</text>

        <!-- Curve -->
        <path d="${d}" fill="none" stroke="#ff2a8d" stroke-width="1.8" />
      </svg>
    `;

    container.innerHTML = svg;
  },

  // 5. Polypeptide Sequence Optimization (Right 3-color bar chart)
  renderPolypepOptimization2() {
    const container = document.getElementById('chart-polypep-2');
    if (!container) return;

    const data = [
      { seq: 'A11', c: 45, m: 28, y: 35 },
      { seq: 'B22', c: 50, m: 30, y: 36 },
      { seq: 'B33', c: 35, m: 25, y: 28 },
      { seq: 'B14', c: 58, m: 36, y: 40 },
      { seq: 'B35', c: 44, m: 26, y: 32 },
      { seq: 'B06', c: 54, m: 34, y: 34 }
    ];

    const width = 290;
    const height = 125;
    const pad = { top: 12, right: 15, bottom: 25, left: 32 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const groupW = innerW / data.length;
    const barW = groupW * 0.24;

    const barsSvg = data.map((d, i) => {
      const gx = pad.left + i * groupW;
      const hc = (d.c / 60) * innerH;
      const hm = (d.m / 60) * innerH;
      const hy = (d.y / 60) * innerH;

      return `
        <rect x="${gx + 2}" y="${height - pad.bottom - hc}" width="${barW}" height="${hc}" fill="#00e5ff" rx="1" />
        <rect x="${gx + 2 + barW + 1}" y="${height - pad.bottom - hm}" width="${barW}" height="${hm}" fill="#ff2a8d" rx="1" />
        <rect x="${gx + 2 + (barW + 1) * 2}" y="${height - pad.bottom - hy}" width="${barW}" height="${hy}" fill="#f59e0b" rx="1" />
        <text x="${gx + groupW * 0.5}" y="${height - 12}" class="chart-label" text-anchor="middle">${d.seq}</text>
      `;
    }).join('');

    const svg = `
      <svg viewBox="0 0 ${width} ${height}">
        <!-- Axes -->
        <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" class="chart-axis-line" />
        <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" class="chart-axis-line" />
        
        <!-- Y-Ticks -->
        <text x="${pad.left - 4}" y="${pad.top + 4}" class="chart-label" text-anchor="end">60</text>
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.33}" class="chart-label" text-anchor="end">40</text>
        <text x="${pad.left - 4}" y="${pad.top + innerH * 0.66}" class="chart-label" text-anchor="end">20</text>
        <text x="${pad.left - 4}" y="${height - pad.bottom}" class="chart-label" text-anchor="end">0</text>

        <!-- Titles -->
        <text transform="rotate(-90)" x="${-(pad.top + innerH / 2)}" y="10" class="chart-title-axis" text-anchor="middle">Differential score</text>
        <text x="${pad.left + innerW / 2}" y="${height - 2}" class="chart-title-axis" text-anchor="middle">Polypeptide Sequence</text>

        <!-- Bars -->
        ${barsSvg}
      </svg>
    `;

    container.innerHTML = svg;
  }
};

window.Charts = Charts;

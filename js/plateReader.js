/**
 * 96-Well Microplate Reader Visualization & Kinetics Simulator
 */

const PlateReader = {
  container: null,
  slider: null,
  timeDisplay: null,
  rows: 8,
  cols: 12,

  init() {
    this.container = document.getElementById('plate-reader-container');
    this.slider = document.getElementById('plate-time-slider');
    this.timeDisplay = document.getElementById('plate-scan-time');

    if (!this.container) return;

    this.renderPlate(0.45);
    this.setupListeners();
  },

  setupListeners() {
    if (this.slider) {
      this.slider.addEventListener('input', (e) => {
        const progress = e.target.value / 100;
        this.renderPlate(progress);
        this.updateTimeLabel(progress);
      });
    }
  },

  updateTimeLabel(progress) {
    if (!this.timeDisplay) return;
    const totalSeconds = Math.floor(progress * 3600);
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    this.timeDisplay.textContent = `T: ${hrs}:${mins}:${secs}`;
  },

  renderPlate(progress) {
    let html = '<div class="plate-reader-grid">';
    
    // Column Headers 1 to 12
    html += '<div class="plate-header-cols"><span></span>';
    for (let c = 1; c <= this.cols; c++) {
      html += `<span>${c}</span>`;
    }
    html += '</div>';

    // 8 Rows
    for (let r = 1; r <= this.rows; r++) {
      html += `<div class="plate-row"><span class="plate-row-label">${r}</span>`;
      for (let c = 1; c <= this.cols; c++) {
        // Calculate fluorescence value based on position and time
        const normCol = (c - 1) / (this.cols - 1); // 0 to 1
        const normRow = (r - 1) / (this.rows - 1);
        
        // Kinetics wave formula
        const kineticValue = Math.sin(normCol * Math.PI * 1.5 + progress * 2) * 0.4 + 0.6;
        const color = this.getColorForWell(normCol, kineticValue);

        html += `
          <div class="well-circle" 
               style="background: ${color}; box-shadow: 0 0 4px ${color}88;" 
               title="Well R${r}:C${c} | Intensity: ${(kineticValue * 2.5).toFixed(2)} RFU">
          </div>
        `;
      }
      html += '</div>';
    }

    html += '</div>';
    this.container.innerHTML = html;
  },

  getColorForWell(normCol, intensity) {
    // Columns 1-4: Teal/Cyan
    // Columns 5-8: Slate/Indigo
    // Columns 9-12: Magenta/Pink/Gold
    if (normCol < 0.45) {
      // Teal to bright cyan
      const lum = 40 + intensity * 25;
      return `hsl(180, 85%, ${lum}%)`;
    } else if (normCol < 0.75) {
      // Indigo to soft purple
      const lum = 42 + intensity * 22;
      return `hsl(255, 75%, ${lum}%)`;
    } else {
      // Magenta to pink/rose
      const lum = 48 + intensity * 25;
      return `hsl(330, 85%, ${lum}%)`;
    }
  }
};

window.PlateReader = PlateReader;

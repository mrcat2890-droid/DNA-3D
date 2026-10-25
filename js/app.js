/**
 * Main Application Coordinator
 * Sets up Three.js scene, cinematic lighting, postprocessing bloom,
 * raycasting interaction, and HUD integration.
 */

const App = {
  scene: null,
  camera: null,
  renderer: null,
  composer: null,
  controls: null,
  dnaModel: null,
  callouts: null,
  raycaster: null,
  mouse: null,
  hoveredBasePair: null,
  autoRotate: true,
  bloomEnabled: true,
  defaultCameraPos: new THREE.Vector3(0, 4, 62),

  init() {
    this.initThree();
    this.initLighting();
    this.initPostProcessing();
    this.initDNA();
    this.initCallouts();
    this.initRaycasting();
    this.initUIListeners();

    // Initialize 2D charts and plate reader
    if (window.Charts) window.Charts.init();
    if (window.PlateReader) window.PlateReader.init();

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.addEventListener('resize', this.onWindowResize.bind(this));
  },

  initThree() {
    const canvas = document.getElementById('webgl-canvas');
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070b13, 0.008);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 1000);
    this.camera.position.copy(this.defaultCameraPos);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Controls
    this.controls = new THREE.OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 25;
    this.controls.maxDistance = 140;
    this.controls.target.set(0, 0, 0);
  },

  initLighting() {
    // 1. Ambient Fill (Deep indigo for shadow tint)
    const ambientLight = new THREE.AmbientLight(0x1e1b4b, 1.2);
    this.scene.add(ambientLight);

    // 2. Main Key Light (Crisp ice cyan from upper front)
    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
    keyLight.position.set(35, 45, 40);
    this.scene.add(keyLight);

    // 3. Rim / Back Light (Vivid neon magenta creating iridescent silhouettes)
    const rimLight = new THREE.DirectionalLight(0xf43f5e, 3.2);
    rimLight.position.set(-45, -25, -45);
    this.scene.add(rimLight);

    // 4. Secondary Fill Light (Teal cyan from opposite angle)
    const fillLight = new THREE.DirectionalLight(0x06b6d4, 1.8);
    fillLight.position.set(-25, 30, 30);
    this.scene.add(fillLight);

    // 5. Point Light near center for subtle core glow
    const centerGlow = new THREE.PointLight(0x00e5ff, 1.4, 60);
    centerGlow.position.set(0, 0, 10);
    this.scene.add(centerGlow);
  },

  initPostProcessing() {
    const renderScene = new THREE.RenderPass(this.scene, this.camera);

    const bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.48, // strength
      0.35, // radius
      0.82  // threshold
    );

    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    this.bloomPass = bloomPass;
  },

  initDNA() {
    this.dnaModel = new DNAModel(this.scene);
  },

  initCallouts() {
    this.callouts = new CalloutManager(
      this.camera,
      this.dnaModel,
      'hud-labels-container',
      'hud-svg-layer'
    );
  },

  initRaycasting() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const canvas = document.getElementById('webgl-canvas');

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.checkIntersection();
    });

    canvas.addEventListener('click', () => {
      if (this.hoveredBasePair && this.hoveredBasePair.userData) {
        this.showInspector(this.hoveredBasePair.userData);
      }
    });
  },

  checkIntersection() {
    if (!this.dnaModel || !this.dnaModel.basePairs) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Test intersections against base pair groups
    const intersects = this.raycaster.intersectObjects(this.dnaModel.group.children, true);

    if (intersects.length > 0) {
      let hitGroup = null;
      let obj = intersects[0].object;
      while (obj && obj !== this.dnaModel.group) {
        if (obj.userData && obj.userData.name) {
          hitGroup = obj;
          break;
        }
        obj = obj.parent;
      }

      if (hitGroup && hitGroup !== this.hoveredBasePair) {
        if (this.hoveredBasePair) {
          this.dnaModel.highlightBasePair(this.hoveredBasePair, false);
        }
        this.hoveredBasePair = hitGroup;
        this.dnaModel.highlightBasePair(this.hoveredBasePair, true);
        document.body.style.cursor = 'pointer';
        return;
      }
    }

    if (!intersects.length && this.hoveredBasePair) {
      this.dnaModel.highlightBasePair(this.hoveredBasePair, false);
      this.hoveredBasePair = null;
      document.body.style.cursor = 'default';
    }
  },

  showInspector(data) {
    const modal = document.getElementById('molecule-inspector');
    if (!modal) return;

    document.getElementById('inspector-base-title').textContent = data.name || 'MOLECULAR TARGET';
    document.getElementById('inspector-pair-type').textContent = data.type || data.pairType || 'N/A';
    document.getElementById('inspector-bonds').textContent = data.bonds || 'Hydrogen Bonding';
    document.getElementById('inspector-axis').textContent = data.axis || 'Helical Groove';
    document.getElementById('inspector-energy').textContent = data.energy || '-14.2 kcal/mol';

    modal.classList.add('show');
  },

  hideInspector() {
    const modal = document.getElementById('molecule-inspector');
    if (modal) modal.classList.remove('show');
  },

  initUIListeners() {
    // Auto Rotate Button
    const btnRotate = document.getElementById('btn-toggle-rotate');
    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        this.autoRotate = !this.autoRotate;
        btnRotate.classList.toggle('active', this.autoRotate);
        btnRotate.innerHTML = `<span>🔄</span> Auto Rotate: ${this.autoRotate ? 'ON' : 'OFF'}`;
      });
    }

    // HUD Pins Button
    const btnHud = document.getElementById('btn-toggle-hud');
    if (btnHud) {
      btnHud.addEventListener('click', () => {
        const active = btnHud.classList.toggle('active');
        this.callouts.setVisible(active);
        btnHud.innerHTML = `<span>🎯</span> HUD Pins: ${active ? 'ON' : 'OFF'}`;
      });
    }

    // Bloom Toggle Button
    const btnGlow = document.getElementById('btn-toggle-glow');
    if (btnGlow) {
      btnGlow.addEventListener('click', () => {
        this.bloomEnabled = !this.bloomEnabled;
        btnGlow.classList.toggle('active', this.bloomEnabled);
      });
    }

    // Reset View Button
    const btnReset = document.getElementById('btn-reset-view');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.camera.position.copy(this.defaultCameraPos);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        if (this.dnaModel) {
          this.dnaModel.group.rotation.set(0.22, -0.45, 0.35);
        }
      });
    }

    // Modal Close Button
    const btnClose = document.getElementById('inspector-close-btn');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.hideInspector());
    }
  },

  onWindowResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
  },

  animate() {
    requestAnimationFrame(this.animate);

    // Slow cinematic auto-rotation
    if (this.autoRotate && this.dnaModel) {
      this.dnaModel.group.rotation.y += 0.0035;
    }

    this.controls.update();

    // Update 3D-to-2D projected annotations
    if (this.callouts) {
      this.callouts.update();
    }

    // Render with or without post-processing
    if (this.bloomEnabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
};

window.App = App;

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

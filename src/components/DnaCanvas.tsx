import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
    ConformationType,
    RenderModeType,
    MolecularConditionType,
    AssemblyModeType,
    FilterComponentType,
    CameraControlMode,
    CameraStepCommand,
    WebXrSupportStatus
} from '../types/dna';
import { CONFORMATIONS, calculateSequenceStats } from '../data/dnaData';

interface DnaCanvasProps {
    conformation: ConformationType;
    renderMode: RenderModeType;
    condition: MolecularConditionType;
    assemblyMode: AssemblyModeType;
    sequence: string;
    filterComponent: FilterComponentType;
    autoRotate: boolean;
    thermalDynamics: boolean;
    showIons: boolean;
    metricScaleVisible: boolean;
    labelsVisible: boolean;
    bloomEnabled?: boolean;
    bloomStrength?: number;
    bloomThreshold?: number;
    cameraControlMode: CameraControlMode;
    cameraStepCommand: CameraStepCommand | null;
    isVrModeActive: boolean;
    isStereoLensMode: boolean;
    onVrModeChange: (active: boolean) => void;
    onWebXrSupportDetected: (status: WebXrSupportStatus) => void;
    onUpdateVrPerformance?: (metrics: { latencyMs: number; fps: number }) => void;
    selectedComponentKey?: string | null;
    focusComponentTrigger?: number;
    onSelectComponent: (type: string) => void;
    onUpdateAnnotationPositions: (positions: Record<string, { x: number; y: number; visible: boolean }>) => void;
    resetCameraTrigger: number;
}

interface CustomCameraController {
    sphericalCurrent: THREE.Spherical;
    sphericalTarget: THREE.Spherical;
    panCurrent: THREE.Vector3;
    panTarget: THREE.Vector3;
    minDistance: number;
    maxDistance: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    panLimit: number;
    dampingFactor: number;
    applyRotateDelta: (deltaAzimuthRad: number, deltaPolarRad: number) => void;
    applyScreenPanDelta: (deltaPixelsX: number, deltaPixelsY: number, viewportHeight: number) => void;
    applyZoomScale: (scaleFactor: number) => void;
    resetToDefault: (aspect: number, instant?: boolean) => void;
    update: () => void;
}

const getDefaultCameraPose = (aspect: number): { fov: number; position: THREE.Vector3 } => {
    if (aspect < 0.6) {
        return { fov: 56, position: new THREE.Vector3(-10, 8, 66) };
    } else if (aspect < 0.85) {
        return { fov: 50, position: new THREE.Vector3(-13, 10, 58) };
    } else if (aspect < 1.15) {
        return { fov: 45, position: new THREE.Vector3(-15, 11, 52) };
    } else if (aspect < 1.7) {
        return { fov: 42, position: new THREE.Vector3(-18, 12, 48) };
    } else {
        return { fov: 40, position: new THREE.Vector3(-18, 12, 46) };
    }
};

export const DnaCanvas: React.FC<DnaCanvasProps> = ({
    conformation,
    renderMode,
    condition,
    assemblyMode,
    sequence,
    filterComponent: activeFilter,
    autoRotate,
    thermalDynamics,
    showIons,
    metricScaleVisible,
    labelsVisible,
    bloomEnabled = true,
    bloomStrength = 0.36,
    bloomThreshold = 0.82,
    cameraControlMode,
    cameraStepCommand,
    isVrModeActive,
    isStereoLensMode,
    onVrModeChange,
    onWebXrSupportDetected,
    onUpdateVrPerformance,
    selectedComponentKey = null,
    focusComponentTrigger = 0,
    onSelectComponent,
    onUpdateAnnotationPositions,
    resetCameraTrigger
}) => {
    const mountRef = useRef<HTMLDivElement>(null);

    // Refs for mutable Three.js objects that persist across renders
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const stereoCameraRef = useRef<THREE.StereoCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const composerRef = useRef<EffectComposer | null>(null);
    const bloomPassRef = useRef<UnrealBloomPass | null>(null);
    const bloomPulseBoostRef = useRef<number>(0);
    const customCamRef = useRef<CustomCameraController | null>(null);
    const dnaGroupRef = useRef<THREE.Group | null>(null);
    const ionGroupRef = useRef<THREE.Group | null>(null);
    const vrEnvGroupRef = useRef<THREE.Group | null>(null);
    const xrSessionRef = useRef<any>(null);
    const webXrNativeSupportedRef = useRef<boolean>(false);

    // Store collections
    const allInteractiveMeshesRef = useRef<THREE.Mesh[]>([]);
    const strand1MeshesRef = useRef<THREE.Object3D[]>([]);
    const strand2MeshesRef = useRef<THREE.Object3D[]>([]);
    const baseMeshesRef = useRef<Record<string, THREE.Object3D[]>>({
        A: [], T: [], G: [], C: [], backbone: [], hbond: [], methylation: [], thymine_dimer: [], intercalator: [], ion_mg: [], water_hydration: []
    });
    const backboneFocusNodesRef = useRef<THREE.Object3D[]>([]);
    const focusedTargetRef = useRef<{ object: THREE.Object3D; localCenter: THREE.Vector3; type: string } | null>(null);
    const focusCycleIndexRef = useRef<{ type: string; index: number }>({ type: '', index: 0 });
    const last3dClickedRef = useRef<{ type: string; object: THREE.Object3D; time: number } | null>(null);
    const bioObjectsRef = useRef<THREE.Object3D[]>([]);
    const cpkObjectsRef = useRef<THREE.Object3D[]>([]);
    const ballStickObjectsRef = useRef<THREE.Object3D[]>([]);
    const electroObjectsRef = useRef<THREE.Object3D[]>([]);
    const pairDynamicContainersRef = useRef<THREE.Group[]>([]);
    const pairBaseYRef = useRef<number[]>([]);
    const ribbon1Ref = useRef<THREE.Mesh | null>(null);
    const ribbon2Ref = useRef<THREE.Mesh | null>(null);
    const ribbon1RailRef = useRef<THREE.Mesh | null>(null);
    const ribbon2RailRef = useRef<THREE.Mesh | null>(null);

    const activeTweensRef = useRef<Array<{ update: (now: number) => boolean }>>([]);
    const annotationTargetsRef = useRef<Record<string, THREE.Vector3>>({
        majorGroove: new THREE.Vector3(),
        minorGroove: new THREE.Vector3(),
        backbone: new THREE.Vector3(),
        atPair: new THREE.Vector3(),
        cgPair: new THREE.Vector3(),
        metricDiameter1: new THREE.Vector3(),
        metricDiameter2: new THREE.Vector3(),
        metricRise1: new THREE.Vector3(),
        metricRise2: new THREE.Vector3(),
        metricPitch1: new THREE.Vector3(),
        metricPitch2: new THREE.Vector3(),
        strand1Top: new THREE.Vector3(),
        strand1Bottom: new THREE.Vector3(),
        strand2Top: new THREE.Vector3(),
        strand2Bottom: new THREE.Vector3()
    });

    const materialsRef = useRef<any>(null);
    const conditionMaterialsRef = useRef<any>(null);
    const electroMaterialsRef = useRef<any>(null);
    const badgeMaterialsRef = useRef<any>(null);
    const sharedGeosRef = useRef<any>(null);

    // Track latest props in refs for animation loop & pointer handlers
    const stateRef = useRef({
        conformation,
        renderMode,
        condition,
        assemblyMode,
        sequence,
        activeFilter,
        autoRotate,
        thermalDynamics,
        showIons,
        metricScaleVisible,
        labelsVisible,
        bloomEnabled,
        bloomStrength,
        bloomThreshold,
        cameraControlMode,
        isVrModeActive,
        isStereoLensMode
    });

    useEffect(() => {
        stateRef.current = {
            conformation,
            renderMode,
            condition,
            assemblyMode,
            sequence,
            activeFilter,
            autoRotate,
            thermalDynamics,
            showIons,
            metricScaleVisible,
            labelsVisible,
            bloomEnabled,
            bloomStrength,
            bloomThreshold,
            cameraControlMode,
            isVrModeActive,
            isStereoLensMode
        };
        if (bloomPassRef.current) {
            bloomPassRef.current.enabled = bloomEnabled;
            bloomPassRef.current.strength = bloomStrength + bloomPulseBoostRef.current;
            bloomPassRef.current.threshold = bloomThreshold;
        }
    }, [conformation, renderMode, condition, assemblyMode, sequence, activeFilter, autoRotate, thermalDynamics, showIons, metricScaleVisible, labelsVisible, bloomEnabled, bloomStrength, bloomThreshold, cameraControlMode, isVrModeActive, isStereoLensMode]);

    // Setup Three.js Scene
    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        const isSoftwareGl = (() => {
            const gl = document.createElement('canvas').getContext('webgl2');
            if (!gl) return true;
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
            const gpu = String(gl.getParameter(param));
            gl.getExtension('WEBGL_lose_context')?.loseContext();
            return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
        })();

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x06152d, 0.0055);
        sceneRef.current = scene;

        // Procedural Deep Cryo-Space Bioluminescent Background Texture for HDR Post-Processing
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 512;
        bgCanvas.height = 512;
        const bgCtx = bgCanvas.getContext('2d')!;
        const bgGrad = bgCtx.createRadialGradient(330, 200, 20, 256, 256, 380);
        bgGrad.addColorStop(0, '#0b2b52');
        bgGrad.addColorStop(0.45, '#061935');
        bgGrad.addColorStop(1, '#020914');
        bgCtx.fillStyle = bgGrad;
        bgCtx.fillRect(0, 0, 512, 512);
        const bgTexture = new THREE.CanvasTexture(bgCanvas);
        bgTexture.colorSpace = THREE.SRGBColorSpace;
        scene.background = bgTexture;

        const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraRef.current = camera;

        const stereoCamera = new THREE.StereoCamera();
        stereoCamera.eyeSep = 0.064;
        stereoCameraRef.current = stereoCamera;

        const renderer = new THREE.WebGLRenderer({
            antialias: !isSoftwareGl,
            alpha: false,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.96;
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Enable WebXR Immersive VR Support
        renderer.xr.enabled = true;
        try {
            renderer.xr.setReferenceSpaceType('local-floor');
        } catch {
            renderer.xr.setReferenceSpaceType('local');
        }

        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // =====================================================================
        // POST-PROCESSING PIPELINE: EffectComposer + RenderPass + UnrealBloomPass + OutputPass
        // =====================================================================
        const composerRenderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                type: THREE.HalfFloatType,
                format: THREE.RGBAFormat,
                samples: isSoftwareGl ? 0 : 4
            }
        );
        const composer = new EffectComposer(renderer, composerRenderTarget);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            stateRef.current.bloomStrength,  // strength: refined jewel-like neon halo without glare
            0.36,                            // radius: tight, crisp optical glow spread
            stateRef.current.bloomThreshold  // threshold: selective HDR emission threshold
        );
        bloomPass.enabled = stateRef.current.bloomEnabled;
        composer.addPass(bloomPass);

        const outputPass = new OutputPass();
        composer.addPass(outputPass);

        composerRef.current = composer;
        bloomPassRef.current = bloomPass;

        // Probe WebXR headset capability
        const xrNav = (navigator as any).xr;
        if (xrNav && typeof xrNav.isSessionSupported === 'function') {
            xrNav.isSessionSupported('immersive-vr')
                .then((supported: boolean) => {
                    webXrNativeSupportedRef.current = !!supported;
                    onWebXrSupportDetected(supported ? 'supported' : 'fallback_360');
                })
                .catch(() => {
                    webXrNativeSupportedRef.current = false;
                    onWebXrSupportDetected('fallback_360');
                });
        } else {
            webXrNativeSupportedRef.current = false;
            onWebXrSupportDetected('fallback_360');
        }

        // Studio PMREM Environment Map for realistic molecular reflections
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTexture;
        pmremGenerator.dispose();

        // Custom Independent Spherical Orbit & Screen-Space Pan Camera Controller
        const initialAspect = window.innerWidth / window.innerHeight;
        const initialPose = getDefaultCameraPose(initialAspect);
        const sphericalCurrent = new THREE.Spherical().setFromVector3(initialPose.position);
        const sphericalTarget = sphericalCurrent.clone();
        const panCurrent = new THREE.Vector3(0, 0, 0);
        const panTarget = new THREE.Vector3(0, 0, 0);
        const tempOffset = new THREE.Vector3();
        const rightAxis = new THREE.Vector3();
        const upAxisCam = new THREE.Vector3();

        const customCam: CustomCameraController = {
            sphericalCurrent,
            sphericalTarget,
            panCurrent,
            panTarget,
            minDistance: 10,
            maxDistance: 150,
            minPolarAngle: 0.08,
            maxPolarAngle: Math.PI - 0.08,
            panLimit: 45,
            dampingFactor: isSoftwareGl ? 0.35 : 0.12,

            applyRotateDelta: (deltaAzimuthRad: number, deltaPolarRad: number) => {
                customCam.sphericalTarget.theta -= deltaAzimuthRad;
                customCam.sphericalTarget.phi = THREE.MathUtils.clamp(
                    customCam.sphericalTarget.phi - deltaPolarRad,
                    customCam.minPolarAngle,
                    customCam.maxPolarAngle
                );
            },

            applyScreenPanDelta: (deltaPixelsX: number, deltaPixelsY: number, viewportHeight: number) => {
                // Disengage automatic component focus tracking when user manually pans
                focusedTargetRef.current = null;
                const safeHeight = Math.max(viewportHeight, 1);
                const vFovRad = THREE.MathUtils.degToRad(camera.fov);
                // Exact 1:1 world units per pixel at the focal target plane
                const unitsPerPixel = (2 * customCam.sphericalCurrent.radius * Math.tan(vFovRad * 0.5)) / safeHeight;

                camera.updateMatrixWorld();
                rightAxis.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
                upAxisCam.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

                customCam.panTarget.addScaledVector(rightAxis, -deltaPixelsX * unitsPerPixel);
                customCam.panTarget.addScaledVector(upAxisCam, deltaPixelsY * unitsPerPixel);

                customCam.panTarget.x = THREE.MathUtils.clamp(customCam.panTarget.x, -customCam.panLimit, customCam.panLimit);
                customCam.panTarget.y = THREE.MathUtils.clamp(customCam.panTarget.y, -customCam.panLimit, customCam.panLimit);
                customCam.panTarget.z = THREE.MathUtils.clamp(customCam.panTarget.z, -customCam.panLimit, customCam.panLimit);
            },

            applyZoomScale: (scaleFactor: number) => {
                customCam.sphericalTarget.radius = THREE.MathUtils.clamp(
                    customCam.sphericalTarget.radius * scaleFactor,
                    customCam.minDistance,
                    customCam.maxDistance
                );
            },

            resetToDefault: (aspect: number, instant = false) => {
                focusedTargetRef.current = null;
                const pose = getDefaultCameraPose(aspect);
                camera.aspect = aspect;
                camera.fov = pose.fov;
                camera.updateProjectionMatrix();

                const targetSpherical = new THREE.Spherical().setFromVector3(pose.position);
                // Normalize current theta so it takes the shortest angular path to targetSpherical.theta
                const twoPi = Math.PI * 2;
                const diffTheta = ((targetSpherical.theta - customCam.sphericalCurrent.theta + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
                customCam.sphericalCurrent.theta = targetSpherical.theta - diffTheta;

                customCam.sphericalTarget.copy(targetSpherical);
                customCam.panTarget.set(0, 0, 0);

                if (instant) {
                    customCam.sphericalCurrent.copy(targetSpherical);
                    customCam.panCurrent.set(0, 0, 0);
                }
                customCam.update();
            },

            update: () => {
                const alpha = customCam.dampingFactor;
                customCam.sphericalCurrent.radius += (customCam.sphericalTarget.radius - customCam.sphericalCurrent.radius) * alpha;
                customCam.sphericalCurrent.phi += (customCam.sphericalTarget.phi - customCam.sphericalCurrent.phi) * alpha;
                customCam.sphericalCurrent.theta += (customCam.sphericalTarget.theta - customCam.sphericalCurrent.theta) * alpha;
                customCam.panCurrent.lerp(customCam.panTarget, alpha);

                tempOffset.setFromSpherical(customCam.sphericalCurrent);
                camera.position.copy(customCam.panCurrent).add(tempOffset);
                camera.lookAt(customCam.panCurrent);
            }
        };

        customCamRef.current = customCam;
        customCam.resetToDefault(initialAspect, true);

        const adjustCameraOnResize = () => {
            const aspect = window.innerWidth / window.innerHeight;
            const pose = getDefaultCameraPose(aspect);
            camera.aspect = aspect;
            camera.fov = pose.fov;
            camera.updateProjectionMatrix();
            customCam.update();
        };


        // Studio 4-Point Specular & PBR Lighting Rig (Calibrated for High-Contrast Anti-Glare Clarity)
        const ambientLight = new THREE.AmbientLight(0x0d2244, 0.48);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x051024, 0.62);
        scene.add(hemiLight);

        const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.62);
        keyLight.position.set(-28, 44, 40);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.78);
        fillLight.position.set(36, -16, 32);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xbae6fd, 1.35);
        rimLight.position.set(14, 34, -44);
        scene.add(rimLight);

        const rimLight2 = new THREE.DirectionalLight(0x818cf8, 0.88);
        rimLight2.position.set(-28, -32, -28);
        scene.add(rimLight2);

        const specularPointLight = new THREE.PointLight(0xe0f2fe, 1.15, 110, 1.6);
        specularPointLight.position.set(16, 18, 28);
        scene.add(specularPointLight);

        // Bokeh Background
        const bokehGroup = new THREE.Group();
        scene.add(bokehGroup);
        for (let i = 0; i < 28; i++) {
            const radius = 4 + Math.random() * 18;
            const bokehGeo = new THREE.SphereGeometry(radius, 18, 18);
            const brightness = 0.04 + Math.random() * 0.09;
            const bokehMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0.58 + Math.random() * 0.08, 0.6, 0.15 + Math.random() * 0.12),
                transparent: true,
                opacity: brightness,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(bokehGeo, bokehMat);
            mesh.position.set(
                (Math.random() - 0.5) * 130,
                (Math.random() - 0.5) * 110,
                -30 - Math.random() * 60
            );
            bokehGroup.add(mesh);
        }

        // Floating cytoplasm motes
        const pCount = 260;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount * 3; i += 3) {
            pPos[i] = (Math.random() - 0.5) * 120;
            pPos[i + 1] = (Math.random() - 0.5) * 100;
            pPos[i + 2] = (Math.random() - 0.5) * 90;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({
            color: 0x5090d0,
            size: 0.5,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const particles = new THREE.Points(pGeo, pMat);
        scene.add(particles);

        // Micro-Chemical Holographic Ring Label Texture Generator
        const maxAniso = renderer.capabilities.getMaxAnisotropy();
        const generateMicroLabelTexture = (letter: string, ringColorHex: string) => {
            const cvs = document.createElement('canvas');
            cvs.width = 256;
            cvs.height = 256;
            const c = cvs.getContext('2d')!;

            // Dark translucent scientific core
            c.fillStyle = 'rgba(6, 15, 32, 0.86)';
            c.beginPath();
            c.arc(128, 128, 116, 0, Math.PI * 2);
            c.fill();

            // Precision colored ring border
            c.lineWidth = 10;
            c.strokeStyle = ringColorHex;
            c.beginPath();
            c.arc(128, 128, 108, 0, Math.PI * 2);
            c.stroke();

            // Subtle inner technical ring
            c.lineWidth = 3;
            c.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            c.beginPath();
            c.arc(128, 128, 92, 0, Math.PI * 2);
            c.stroke();

            // Crisp chemical symbol
            c.fillStyle = '#ffffff';
            c.font = '700 132px "JetBrains Mono", "Plus Jakarta Sans", sans-serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(letter, 128, 134);

            const tex = new THREE.CanvasTexture(cvs);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = maxAniso;
            return tex;
        };

        const letterTextures = {
            A: generateMicroLabelTexture('A', '#3b82f6'),
            T: generateMicroLabelTexture('T', '#fbbf24'),
            G: generateMicroLabelTexture('G', '#10b981'),
            C: generateMicroLabelTexture('C', '#f43f5e')
        };

        // Procedural PBR Metallic, Roughness, and Tangent-Space Normal Map Generator
        // Eliminates flat-shaded bio-illustration appearance by adding physical micro-surface variations
        const generatePbrTextureMaps = () => {
            const size = 256;
            const heightField = new Float32Array(size * size);
            const backboneHeightField = new Float32Array(size * size);

            const hash2D = (x: number, y: number) => {
                const xi = ((x % size) + size) % size;
                const yi = ((y % size) + size) % size;
                const n = Math.sin(xi * 127.1 + yi * 311.7) * 43758.5453123;
                return n - Math.floor(n);
            };

            const smoothNoise = (u: number, v: number, freq: number) => {
                const x = u * freq;
                const y = v * freq;
                const x0 = Math.floor(x);
                const y0 = Math.floor(y);
                const fx = x - x0;
                const fy = y - y0;
                const sx = fx * fx * (3 - 2 * fx);
                const sy = fy * fy * (3 - 2 * fy);

                const n00 = hash2D(x0, y0);
                const n10 = hash2D(x0 + 1, y0);
                const n01 = hash2D(x0, y0 + 1);
                const n11 = hash2D(x0 + 1, y0 + 1);

                const nx0 = n00 + sx * (n10 - n00);
                const nx1 = n01 + sx * (n11 - n01);
                return nx0 + sy * (nx1 - nx0);
            };

            const roughnessData = new Uint8Array(size * size * 4);
            const metalnessData = new Uint8Array(size * size * 4);
            const normalData = new Uint8Array(size * size * 4);

            const bbRoughnessData = new Uint8Array(size * size * 4);
            const bbMetalnessData = new Uint8Array(size * size * 4);
            const bbNormalData = new Uint8Array(size * size * 4);

            for (let y = 0; y < size; y++) {
                const v = y / size;
                for (let x = 0; x < size; x++) {
                    const u = x / size;
                    const idx = y * size + x;

                    // Multi-octave crystalline FBM for atomic & covalent surfaces
                    const fbm =
                        smoothNoise(u, v, 8) * 0.50 +
                        smoothNoise(u, v, 16) * 0.30 +
                        smoothNoise(u, v, 32) * 0.15 +
                        smoothNoise(u, v, 64) * 0.05;

                    // Subtle hexagonal electron-density interference pattern
                    const hexWave =
                        (Math.sin(u * Math.PI * 12) * Math.cos(v * Math.PI * 12) + 1) * 0.5;
                    const hVal = fbm * 0.72 + hexWave * 0.28;
                    heightField[idx] = hVal;

                    // Roughness map (Linear grayscale: 120..235 -> modulates material.roughness)
                    const rByte = Math.round(THREE.MathUtils.clamp(125 + (1.0 - hVal) * 105, 110, 240));
                    // Metalness map (Linear grayscale: 145..250 -> modulates material.metalness)
                    const mByte = Math.round(THREE.MathUtils.clamp(145 + hVal * 105, 130, 255));

                    const pIdx = idx * 4;
                    roughnessData[pIdx] = rByte;
                    roughnessData[pIdx + 1] = rByte;
                    roughnessData[pIdx + 2] = rByte;
                    roughnessData[pIdx + 3] = 255;

                    metalnessData[pIdx] = mByte;
                    metalnessData[pIdx + 1] = mByte;
                    metalnessData[pIdx + 2] = mByte;
                    metalnessData[pIdx + 3] = 255;

                    // Anisotropic striated biopolymer pattern for sugar-phosphate backbone ribbons
                    const axialStriation = (Math.sin(v * Math.PI * 24 + fbm * 2.2) + 1) * 0.5;
                    const bbH = axialStriation * 0.65 + fbm * 0.35;
                    backboneHeightField[idx] = bbH;

                    const bbRByte = Math.round(THREE.MathUtils.clamp(115 + (1.0 - bbH) * 115, 100, 240));
                    const bbMByte = Math.round(THREE.MathUtils.clamp(150 + bbH * 100, 140, 255));

                    bbRoughnessData[pIdx] = bbRByte;
                    bbRoughnessData[pIdx + 1] = bbRByte;
                    bbRoughnessData[pIdx + 2] = bbRByte;
                    bbRoughnessData[pIdx + 3] = 255;

                    bbMetalnessData[pIdx] = bbMByte;
                    bbMetalnessData[pIdx + 1] = bbMByte;
                    bbMetalnessData[pIdx + 2] = bbMByte;
                    bbMetalnessData[pIdx + 3] = 255;
                }
            }

            // Compute tangent-space normal maps via central differences
            const computeNormals = (hField: Float32Array, outData: Uint8Array, strength: number) => {
                for (let y = 0; y < size; y++) {
                    const yPrev = (y - 1 + size) % size;
                    const yNext = (y + 1) % size;
                    for (let x = 0; x < size; x++) {
                        const xPrev = (x - 1 + size) % size;
                        const xNext = (x + 1) % size;

                        const dX = (hField[y * size + xNext] - hField[y * size + xPrev]) * strength;
                        const dY = (hField[yNext * size + x] - hField[yPrev * size + x]) * strength;

                        const invLen = 1.0 / Math.sqrt(dX * dX + dY * dY + 1.0);
                        const nx = -dX * invLen;
                        const ny = -dY * invLen;
                        const nz = invLen;

                        const pIdx = (y * size + x) * 4;
                        outData[pIdx] = Math.round((nx * 0.5 + 0.5) * 255);
                        outData[pIdx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
                        outData[pIdx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
                        outData[pIdx + 3] = 255;
                    }
                }
            };

            computeNormals(heightField, normalData, 3.2);
            computeNormals(backboneHeightField, bbNormalData, 4.0);

            const createDataTex = (data: Uint8Array, repeatX: number, repeatY: number) => {
                const tex = new THREE.DataTexture(data as unknown as BufferSource, size, size, THREE.RGBAFormat);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(repeatX, repeatY);
                tex.generateMipmaps = true;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.anisotropy = maxAniso;
                tex.needsUpdate = true;
                return tex;
            };

            return {
                roughnessMap: createDataTex(roughnessData, 2, 2),
                metalnessMap: createDataTex(metalnessData, 2, 2),
                normalMap: createDataTex(normalData, 2, 2),
                backboneRoughnessMap: createDataTex(bbRoughnessData, 16, 3),
                backboneMetalnessMap: createDataTex(bbMetalnessData, 16, 3),
                backboneNormalMap: createDataTex(bbNormalData, 16, 3)
            };
        };

        const pbrMaps = generatePbrTextureMaps();
        const normalScaleStandard = new THREE.Vector2(0.24, 0.24);
        const normalScaleBackbone = new THREE.Vector2(0.32, 0.32);
        const normalScaleSubtle = new THREE.Vector2(0.16, 0.16);

        // Physically-Based Materials (MeshPhysicalMaterial & MeshStandardMaterial) with Metallic, Roughness, Normal Maps & Anti-Glare Jewel Bloom Accents
        const materials = {
            backbone: new THREE.MeshPhysicalMaterial({
                color: 0x6366f1,
                roughness: 0.27,
                metalness: 0.44,
                roughnessMap: pbrMaps.backboneRoughnessMap,
                metalnessMap: pbrMaps.backboneMetalnessMap,
                normalMap: pbrMaps.backboneNormalMap,
                normalScale: normalScaleBackbone,
                clearcoat: 0.90,
                clearcoatRoughness: 0.12,
                clearcoatNormalMap: pbrMaps.normalMap,
                clearcoatNormalScale: normalScaleSubtle,
                ior: 1.56,
                reflectivity: 0.88,
                iridescence: 0.34,
                iridescenceIOR: 1.38,
                sheen: 0.38,
                sheenColor: new THREE.Color(0x38bdf8),
                emissive: 0x312e81,
                emissiveIntensity: 0.22,
                envMapIntensity: 1.32
            }),
            backboneRail: new THREE.MeshPhysicalMaterial({
                color: 0x38bdf8,
                roughness: 0.18,
                metalness: 0.68,
                roughnessMap: pbrMaps.backboneRoughnessMap,
                metalnessMap: pbrMaps.backboneMetalnessMap,
                normalMap: pbrMaps.backboneNormalMap,
                normalScale: normalScaleBackbone,
                clearcoat: 0.94,
                clearcoatRoughness: 0.08,
                ior: 1.62,
                reflectivity: 0.95,
                emissive: 0x0ea5e9,
                emissiveIntensity: 0.56,
                envMapIntensity: 1.45
            }),
            // Covalent heterocyclic ring frame & bond materials with PBR metallic/roughness maps and controlled neon accent
            A: new THREE.MeshPhysicalMaterial({
                color: 0x2563eb,
                roughness: 0.25,
                metalness: 0.42,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.88,
                clearcoatRoughness: 0.12,
                ior: 1.54,
                reflectivity: 0.86,
                emissive: 0x1d4ed8,
                emissiveIntensity: 0.22,
                envMapIntensity: 1.28
            }),
            T: new THREE.MeshPhysicalMaterial({
                color: 0xf59e0b,
                roughness: 0.25,
                metalness: 0.42,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.88,
                clearcoatRoughness: 0.12,
                ior: 1.54,
                reflectivity: 0.86,
                emissive: 0xb45309,
                emissiveIntensity: 0.20,
                envMapIntensity: 1.28
            }),
            G: new THREE.MeshPhysicalMaterial({
                color: 0x10b981,
                roughness: 0.25,
                metalness: 0.42,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.88,
                clearcoatRoughness: 0.12,
                ior: 1.54,
                reflectivity: 0.86,
                emissive: 0x047857,
                emissiveIntensity: 0.22,
                envMapIntensity: 1.28
            }),
            C: new THREE.MeshPhysicalMaterial({
                color: 0xf43f5e,
                roughness: 0.25,
                metalness: 0.42,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.88,
                clearcoatRoughness: 0.12,
                ior: 1.54,
                reflectivity: 0.86,
                emissive: 0xbe123c,
                emissiveIntensity: 0.22,
                envMapIntensity: 1.28
            }),
            // Crystalline Aromatic Pi-Cloud Ring Fill with PBR roughness/metalness/normal maps & jewel-like translucency
            ringFill: {
                A: new THREE.MeshPhysicalMaterial({
                    color: 0x3b82f6,
                    roughness: 0.18,
                    metalness: 0.28,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleSubtle,
                    clearcoat: 0.92,
                    clearcoatRoughness: 0.09,
                    ior: 1.58,
                    iridescence: 0.38,
                    iridescenceIOR: 1.4,
                    transparent: true,
                    opacity: 0.58,
                    emissive: 0x1d4ed8,
                    emissiveIntensity: 0.32,
                    envMapIntensity: 1.35,
                    side: THREE.DoubleSide,
                    depthWrite: false
                }),
                T: new THREE.MeshPhysicalMaterial({
                    color: 0xfbbf24,
                    roughness: 0.18,
                    metalness: 0.28,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleSubtle,
                    clearcoat: 0.92,
                    clearcoatRoughness: 0.09,
                    ior: 1.58,
                    iridescence: 0.38,
                    iridescenceIOR: 1.4,
                    transparent: true,
                    opacity: 0.58,
                    emissive: 0xd97706,
                    emissiveIntensity: 0.30,
                    envMapIntensity: 1.35,
                    side: THREE.DoubleSide,
                    depthWrite: false
                }),
                G: new THREE.MeshPhysicalMaterial({
                    color: 0x10b981,
                    roughness: 0.18,
                    metalness: 0.28,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleSubtle,
                    clearcoat: 0.92,
                    clearcoatRoughness: 0.09,
                    ior: 1.58,
                    iridescence: 0.38,
                    iridescenceIOR: 1.4,
                    transparent: true,
                    opacity: 0.58,
                    emissive: 0x059669,
                    emissiveIntensity: 0.32,
                    envMapIntensity: 1.35,
                    side: THREE.DoubleSide,
                    depthWrite: false
                }),
                C: new THREE.MeshPhysicalMaterial({
                    color: 0xf43f5e,
                    roughness: 0.18,
                    metalness: 0.28,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleSubtle,
                    clearcoat: 0.92,
                    clearcoatRoughness: 0.09,
                    ior: 1.58,
                    iridescence: 0.38,
                    iridescenceIOR: 1.4,
                    transparent: true,
                    opacity: 0.58,
                    emissive: 0xe11d48,
                    emissiveIntensity: 0.32,
                    envMapIntensity: 1.35,
                    side: THREE.DoubleSide,
                    depthWrite: false
                }),
                sugar: new THREE.MeshPhysicalMaterial({
                    color: 0x818cf8,
                    roughness: 0.22,
                    metalness: 0.26,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleSubtle,
                    clearcoat: 0.90,
                    clearcoatRoughness: 0.1,
                    ior: 1.52,
                    iridescence: 0.28,
                    transparent: true,
                    opacity: 0.48,
                    emissive: 0x3730a3,
                    emissiveIntensity: 0.20,
                    envMapIntensity: 1.30,
                    side: THREE.DoubleSide,
                    depthWrite: false
                })
            },
            hbondDot: new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                roughness: 0.14,
                metalness: 0.54,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                clearcoat: 0.95,
                emissive: 0x38bdf8,
                emissiveIntensity: 0.92,
                envMapIntensity: 1.45
            }),
            hbondGlowTube: new THREE.MeshPhysicalMaterial({
                color: 0x38bdf8,
                roughness: 0.16,
                metalness: 0.25,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                clearcoat: 0.90,
                transparent: true,
                opacity: 0.20,
                emissive: 0x0284c7,
                emissiveIntensity: 0.58,
                envMapIntensity: 1.3,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }),
            sugarNode: new THREE.MeshPhysicalMaterial({
                color: 0x818cf8,
                roughness: 0.25,
                metalness: 0.38,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.86,
                clearcoatRoughness: 0.12,
                emissive: 0x312e81,
                emissiveIntensity: 0.18,
                envMapIntensity: 1.32
            }),
            phosphateNode: new THREE.MeshPhysicalMaterial({
                color: 0xf59e0b,
                roughness: 0.20,
                metalness: 0.58,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.92,
                clearcoatRoughness: 0.10,
                emissive: 0xb45309,
                emissiveIntensity: 0.38,
                envMapIntensity: 1.42
            }),
            cpk: {
                C: new THREE.MeshPhysicalMaterial({
                    color: 0x3b4252,
                    roughness: 0.30,
                    metalness: 0.36,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleStandard,
                    clearcoat: 0.78,
                    clearcoatRoughness: 0.16,
                    envMapIntensity: 1.3
                }),
                N: new THREE.MeshPhysicalMaterial({
                    color: 0x2563eb,
                    roughness: 0.25,
                    metalness: 0.40,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleStandard,
                    clearcoat: 0.84,
                    clearcoatRoughness: 0.14,
                    emissive: 0x1e40af,
                    emissiveIntensity: 0.18,
                    envMapIntensity: 1.35
                }),
                O: new THREE.MeshPhysicalMaterial({
                    color: 0xef4444,
                    roughness: 0.22,
                    metalness: 0.42,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleStandard,
                    clearcoat: 0.88,
                    clearcoatRoughness: 0.12,
                    emissive: 0x991b1b,
                    emissiveIntensity: 0.20,
                    envMapIntensity: 1.38
                }),
                P: new THREE.MeshPhysicalMaterial({
                    color: 0xf59e0b,
                    roughness: 0.22,
                    metalness: 0.56,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleStandard,
                    clearcoat: 0.90,
                    clearcoatRoughness: 0.10,
                    emissive: 0xb45309,
                    emissiveIntensity: 0.32,
                    envMapIntensity: 1.42
                }),
                H: new THREE.MeshPhysicalMaterial({
                    color: 0xe2e8f0,
                    roughness: 0.24,
                    metalness: 0.24,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleSubtle,
                    clearcoat: 0.82,
                    clearcoatRoughness: 0.12,
                    emissive: 0x38bdf8,
                    emissiveIntensity: 0.10,
                    envMapIntensity: 1.25
                }),
                bond: new THREE.MeshStandardMaterial({
                    color: 0x94a3b8,
                    roughness: 0.25,
                    metalness: 0.68,
                    roughnessMap: pbrMaps.roughnessMap,
                    metalnessMap: pbrMaps.metalnessMap,
                    normalMap: pbrMaps.normalMap,
                    normalScale: normalScaleStandard,
                    envMapIntensity: 1.38
                })
            }
        };
        materialsRef.current = materials;

        const conditionMaterials = {
            methylCarbon: new THREE.MeshPhysicalMaterial({
                color: 0xc084fc,
                roughness: 0.22,
                metalness: 0.46,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.88,
                emissive: 0x7e22ce,
                emissiveIntensity: 0.58,
                envMapIntensity: 1.4
            }),
            dimerBridge: new THREE.MeshPhysicalMaterial({
                color: 0xfb923c,
                roughness: 0.20,
                metalness: 0.56,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.90,
                emissive: 0xc2410c,
                emissiveIntensity: 0.66,
                envMapIntensity: 1.45
            }),
            intercalatorPlate: new THREE.MeshPhysicalMaterial({
                color: 0xf43f5e,
                roughness: 0.18,
                metalness: 0.62,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.94,
                iridescence: 0.45,
                emissive: 0xbe123c,
                emissiveIntensity: 0.68,
                envMapIntensity: 1.5
            }),
            ionMg: new THREE.MeshStandardMaterial({
                color: 0x2dd4bf,
                roughness: 0.15,
                metalness: 0.85,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleSubtle,
                emissive: 0x0f766e,
                emissiveIntensity: 0.62,
                envMapIntensity: 1.55
            }),
            waterO: new THREE.MeshPhysicalMaterial({
                color: 0x67e8f9,
                transparent: true,
                opacity: 0.82,
                roughness: 0.14,
                metalness: 0.20,
                roughnessMap: pbrMaps.roughnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleSubtle,
                clearcoat: 0.96,
                ior: 1.333,
                reflectivity: 0.90,
                emissive: 0x0891b2,
                emissiveIntensity: 0.28,
                envMapIntensity: 1.4
            })
        };
        conditionMaterialsRef.current = conditionMaterials;

        const electroMaterials = {
            backbone: new THREE.MeshPhysicalMaterial({
                color: 0xef4444,
                roughness: 0.26,
                metalness: 0.40,
                roughnessMap: pbrMaps.backboneRoughnessMap,
                metalnessMap: pbrMaps.backboneMetalnessMap,
                normalMap: pbrMaps.backboneNormalMap,
                normalScale: normalScaleBackbone,
                clearcoat: 0.84,
                emissive: 0x991b1b,
                emissiveIntensity: 0.28,
                envMapIntensity: 1.35
            }),
            baseNeutral: new THREE.MeshPhysicalMaterial({
                color: 0xcbd5e1,
                roughness: 0.30,
                metalness: 0.35,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.74,
                emissive: 0x1e293b,
                emissiveIntensity: 0.12,
                envMapIntensity: 1.25
            }),
            basePositive: new THREE.MeshPhysicalMaterial({
                color: 0x38bdf8,
                roughness: 0.26,
                metalness: 0.38,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleStandard,
                clearcoat: 0.80,
                emissive: 0x0369a1,
                emissiveIntensity: 0.24,
                envMapIntensity: 1.35
            })
        };
        electroMaterialsRef.current = electroMaterials;

        const badgeMaterials = {
            A: new THREE.MeshPhysicalMaterial({
                map: letterTextures.A,
                emissiveMap: letterTextures.A,
                emissive: new THREE.Color(0x3b82f6),
                emissiveIntensity: 0.22,
                roughness: 0.22,
                metalness: 0.42,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleSubtle,
                clearcoat: 0.90,
                envMapIntensity: 1.25,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            }),
            T: new THREE.MeshPhysicalMaterial({
                map: letterTextures.T,
                emissiveMap: letterTextures.T,
                emissive: new THREE.Color(0xfbbf24),
                emissiveIntensity: 0.22,
                roughness: 0.22,
                metalness: 0.42,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleSubtle,
                clearcoat: 0.90,
                envMapIntensity: 1.25,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            }),
            G: new THREE.MeshPhysicalMaterial({
                map: letterTextures.G,
                emissiveMap: letterTextures.G,
                emissive: new THREE.Color(0x10b981),
                emissiveIntensity: 0.22,
                roughness: 0.22,
                metalness: 0.42,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleSubtle,
                clearcoat: 0.90,
                envMapIntensity: 1.25,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            }),
            C: new THREE.MeshPhysicalMaterial({
                map: letterTextures.C,
                emissiveMap: letterTextures.C,
                emissive: new THREE.Color(0xf43f5e),
                emissiveIntensity: 0.22,
                roughness: 0.22,
                metalness: 0.42,
                roughnessMap: pbrMaps.roughnessMap,
                metalnessMap: pbrMaps.metalnessMap,
                normalMap: pbrMaps.normalMap,
                normalScale: normalScaleSubtle,
                clearcoat: 0.90,
                envMapIntensity: 1.25,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            })
        };
        badgeMaterialsRef.current = badgeMaterials;

        // Helper to build a polygon shape from 2D [x, z] vertex array
        const createPolygonExtrude = (pts: Array<[number, number]>, depth = 0.06) => {
            const s = new THREE.Shape();
            pts.forEach(([px, pz], idx) => {
                if (idx === 0) s.moveTo(px, pz);
                else s.lineTo(px, pz);
            });
            s.closePath();
            const g = new THREE.ExtrudeGeometry(s, {
                depth,
                bevelEnabled: true,
                bevelThickness: 0.012,
                bevelSize: 0.01,
                bevelSegments: 2
            });
            // Rotate so shape (x, y) lies in local (x, z) plane centered at y = 0
            g.rotateX(Math.PI / 2);
            g.translate(0, depth * 0.5, 0);
            return g;
        };

        // Exact chemical vertices for Purine (fused 5-ring Imidazole + 6-ring Pyrimidine)
        const purineImidazolePts: Array<[number, number]> = [
            [0.0, 0.0],     // N9
            [-0.58, 0.36],  // C8
            [-0.36, 0.98],  // N7
            [0.34, 0.98],   // C5
            [0.54, 0.36]    // C4
        ];
        const purinePyrimidinePts: Array<[number, number]> = [
            [0.34, 0.98],   // C5
            [-0.06, 1.62],  // C6
            [0.42, 2.12],   // N1
            [1.14, 1.96],   // C2
            [1.22, 1.28],   // N3
            [0.54, 0.36]    // C4
        ];
        // Exact chemical vertices for Pyrimidine (6-membered hexagonal ring)
        const pyrimidineHexPts: Array<[number, number]> = [
            [0.0, 0.0],     // N1
            [-0.60, 0.36],  // C6
            [-0.60, 1.08],  // C5
            [0.0, 1.46],    // C4
            [0.60, 1.08],   // N3
            [0.60, 0.36]    // C2
        ];
        // Furanose 5-membered sugar ring vertices in local (x, z)
        const furanosePts: Array<[number, number]> = [
            [-0.12, 1.05],  // C1'
            [0.42, 0.92],   // C2'
            [0.56, 0.52],   // C3'
            [0.24, 0.36],   // C4'
            [-0.22, 0.62]   // O4'
        ];

        const purineImidazoleFillGeo = createPolygonExtrude(purineImidazolePts, 0.055);
        const purinePyrimidineFillGeo = createPolygonExtrude(purinePyrimidinePts, 0.055);
        const pyrimidineRingFillGeo = createPolygonExtrude(pyrimidineHexPts, 0.055);
        const furanoseFillGeo = createPolygonExtrude(furanosePts, 0.045);

        // Electrostatic surface slabs
        const createPurineSlab = () => {
            const pts: Array<[number, number]> = [
                [0.0, 0.0], [-0.58, 0.36], [-0.36, 0.98], [-0.06, 1.62],
                [0.42, 2.12], [1.14, 1.96], [1.22, 1.28], [0.54, 0.36]
            ];
            return createPolygonExtrude(pts, 0.24);
        };
        const createPyrimidineSlab = () => createPolygonExtrude(pyrimidineHexPts, 0.24);

        const purineGeo = createPurineSlab();
        const pyrimidineGeo = createPyrimidineSlab();

        const cpkAtomGeos = {
            C: new THREE.SphereGeometry(0.46, 14, 14),
            N: new THREE.SphereGeometry(0.44, 14, 14),
            O: new THREE.SphereGeometry(0.42, 14, 14),
            P: new THREE.SphereGeometry(0.52, 16, 16),
            H: new THREE.SphereGeometry(0.30, 10, 10)
        };

        const bioAtomNodeGeo = new THREE.SphereGeometry(0.145, 12, 12);
        const bioSubstituentAtomGeo = new THREE.SphereGeometry(0.165, 12, 12);
        const bioHydrogenAtomGeo = new THREE.SphereGeometry(0.105, 10, 10);
        const bioPhosphateCenterGeo = new THREE.SphereGeometry(0.28, 14, 14);
        const bioPhosphateOxygenGeo = new THREE.SphereGeometry(0.18, 12, 12);
        const bioBondCylGeo = new THREE.CylinderGeometry(0.068, 0.068, 1.0, 10);
        const bioDoubleBondCylGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.0, 8);
        const bioGlycosidicRodGeo = new THREE.CylinderGeometry(0.078, 0.078, 1.0, 10);
        const bioMicroBadgeGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.065, 24);

        const ballStickSmallSphere = new THREE.SphereGeometry(0.16, 10, 10);
        const ballStickBondCyl = new THREE.CylinderGeometry(0.045, 0.045, 1.0, 8);

        const createIntercalatorShape = () => {
            const s = new THREE.Shape();
            s.moveTo(-2.2, -0.6);
            s.lineTo(-2.0, 0.6);
            s.lineTo(-0.8, 0.9);
            s.lineTo(0.8, 0.9);
            s.lineTo(2.0, 0.6);
            s.lineTo(2.2, -0.6);
            s.lineTo(0.8, -0.9);
            s.lineTo(-0.8, -0.9);
            s.closePath();
            return s;
        };
        const intercalatorGeo = new THREE.ExtrudeGeometry(createIntercalatorShape(), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2 });
        intercalatorGeo.center();

        sharedGeosRef.current = {
            purineGeo,
            pyrimidineGeo,
            purineImidazoleFillGeo,
            purinePyrimidineFillGeo,
            pyrimidineRingFillGeo,
            furanoseFillGeo,
            bioAtomNodeGeo,
            bioSubstituentAtomGeo,
            bioHydrogenAtomGeo,
            bioPhosphateCenterGeo,
            bioPhosphateOxygenGeo,
            bioBondCylGeo,
            bioDoubleBondCylGeo,
            bioGlycosidicRodGeo,
            bioMicroBadgeGeo,
            cpkAtomGeos,
            ballStickSmallSphere,
            ballStickBondCyl,
            intercalatorGeo,
            methylGroupShape: new THREE.SphereGeometry(0.26, 12, 12),
            methylHydrogenShape: new THREE.SphereGeometry(0.13, 8, 8),
            dimerCylinderGeo: new THREE.CylinderGeometry(0.08, 0.08, 1.35, 10),
            mgIonGeo: new THREE.SphereGeometry(0.32, 12, 12),
            waterOGeo: new THREE.SphereGeometry(0.20, 10, 10),
            hbondDashGeo: new THREE.CapsuleGeometry(0.045, 0.09, 6, 8),
            hbondGlowCylGeo: new THREE.CylinderGeometry(0.085, 0.085, 1.0, 10)
        };

        const dnaGroup = new THREE.Group();
        dnaGroup.rotation.z = 0.30;
        dnaGroup.rotation.x = 0.15;
        scene.add(dnaGroup);
        dnaGroupRef.current = dnaGroup;

        const ionGroup = new THREE.Group();
        dnaGroup.add(ionGroup);
        ionGroupRef.current = ionGroup;

        // =====================================================================
        // 360° IMMERSIVE VIRTUAL REALITY BIO-CHAMBER ENVIRONMENT & XR CONTROLLERS
        // =====================================================================
        const vrEnvGroup = new THREE.Group();
        vrEnvGroup.visible = false;
        scene.add(vrEnvGroup);
        vrEnvGroupRef.current = vrEnvGroup;

        // 1. 360° Geodesic Cryo-EM Observatory Sky-Dome
        const vrDomeGeo = new THREE.IcosahedronGeometry(92, 3);
        const vrDomeShellMat = new THREE.MeshPhysicalMaterial({
            color: 0x040d21,
            roughness: 0.4,
            metalness: 0.6,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.72,
            depthWrite: false
        });
        const vrDomeShell = new THREE.Mesh(vrDomeGeo, vrDomeShellMat);
        vrEnvGroup.add(vrDomeShell);

        const vrDomeWireGeo = new THREE.WireframeGeometry(vrDomeGeo);
        const vrDomeWireMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending
        });
        const vrDomeWire = new THREE.LineSegments(vrDomeWireGeo, vrDomeWireMat);
        vrEnvGroup.add(vrDomeWire);

        // 2. Holographic Polar Coordinate Floor & Zenith Calibration Grids
        const vrFloorGrid = new THREE.PolarGridHelper(68, 24, 12, 64, 0x0284c7, 0x1e3a8a);
        vrFloorGrid.position.y = -24;
        (vrFloorGrid.material as THREE.Material).transparent = true;
        (vrFloorGrid.material as THREE.Material).opacity = 0.38;
        vrEnvGroup.add(vrFloorGrid);

        const vrCeilingGrid = new THREE.PolarGridHelper(68, 16, 8, 64, 0x38bdf8, 0x1e1b4b);
        vrCeilingGrid.position.y = 26;
        (vrCeilingGrid.material as THREE.Material).transparent = true;
        (vrCeilingGrid.material as THREE.Material).opacity = 0.22;
        vrEnvGroup.add(vrCeilingGrid);

        // 3. 360° Equatorial Azimuth Horizon Rings
        const horizonRingGeo = new THREE.RingGeometry(54, 54.35, 96);
        horizonRingGeo.rotateX(Math.PI / 2);
        const horizonRingMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const equatorialRing = new THREE.Mesh(horizonRingGeo, horizonRingMat);
        vrEnvGroup.add(equatorialRing);

        // 4. WebXR 6DoF Controllers with 3D Laser Pointer Raycasting
        const vrRaycaster = new THREE.Raycaster();
        const tempControllerMatrix = new THREE.Matrix4();
        const laserGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -8)
        ]);
        const laserMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending
        });

        const handleXrSelect = (controller: THREE.Object3D) => {
            if (!dnaGroupRef.current) return;
            tempControllerMatrix.identity().extractRotation(controller.matrixWorld);
            vrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            vrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempControllerMatrix);

            const activeMeshes: THREE.Mesh[] = [];
            dnaGroupRef.current.traverse(child => {
                if ((child as THREE.Mesh).isMesh && child.userData && child.userData.type) {
                    let isParentVisible = true;
                    let p: THREE.Object3D | null = child;
                    while (p && p !== dnaGroupRef.current) {
                        if (p.visible === false) {
                            isParentVisible = false;
                            break;
                        }
                        p = p.parent;
                    }
                    if (isParentVisible) activeMeshes.push(child as THREE.Mesh);
                }
            });

            const hits = vrRaycaster.intersectObjects(activeMeshes, false);
            if (hits.length > 0) {
                const hitObj = hits[0].object;
                const type = hitObj.userData.type;
                if (type) {
                    const tg = hitObj.userData.parentGroup || hitObj;
                    last3dClickedRef.current = { type, object: tg, time: performance.now() };
                    onSelectComponent(type);
                    bloomPulseBoostRef.current = 0.20;
                    const origScale = tg.scale.clone();
                    animateVector(tg.scale, origScale.clone().multiplyScalar(1.25), 200, easeOutBack);
                    setTimeout(() => animateVector(tg.scale, origScale, 300, easeInOutCubic), 220);
                }
            }
        };

        const controller0 = renderer.xr.getController(0);
        const controller1 = renderer.xr.getController(1);
        controller0.add(new THREE.Line(laserGeo, laserMat));
        controller1.add(new THREE.Line(laserGeo, laserMat));
        controller0.addEventListener('selectstart', () => handleXrSelect(controller0));
        controller1.addEventListener('selectstart', () => handleXrSelect(controller1));
        scene.add(controller0);
        scene.add(controller1);

        // WebXR Session Start & End Handlers (adapts DNA scale & position for room-scale VR headsets)
        const onXrSessionStart = () => {
            if (dnaGroupRef.current) {
                dnaGroupRef.current.position.set(0, 1.45, -2.5);
                dnaGroupRef.current.scale.setScalar(0.085);
            }
            if (vrEnvGroupRef.current) {
                vrEnvGroupRef.current.visible = true;
            }
            if (scene.fog instanceof THREE.FogExp2) {
                scene.fog.density = 0.0022;
            }
            onVrModeChange(true);
        };

        const onXrSessionEnd = () => {
            xrSessionRef.current = null;
            if (dnaGroupRef.current) {
                dnaGroupRef.current.position.set(0, 0, 0);
                dnaGroupRef.current.scale.set(1, 1, 1);
            }
            if (vrEnvGroupRef.current) {
                vrEnvGroupRef.current.visible = false;
            }
            if (scene.fog instanceof THREE.FogExp2) {
                scene.fog.density = 0.0055;
            }
            onVrModeChange(false);
        };

        renderer.xr.addEventListener('sessionstart', onXrSessionStart);
        renderer.xr.addEventListener('sessionend', onXrSessionEnd);

        // Custom Pointer, Touch, Wheel & Keyboard Interaction for Independent Pan & Rotate
        const domEl = renderer.domElement;
        domEl.style.touchAction = 'none';

        const activePointers = new Map<number, { x: number; y: number }>();
        let activeDragMode: 'rotate' | 'pan' | null = null;
        let prevPinchDist = 0;
        let prevMidX = 0;
        let prevMidY = 0;

        const updateCursor = () => {
            if (activeDragMode === 'pan') {
                domEl.style.cursor = 'move';
            } else if (activeDragMode === 'rotate') {
                domEl.style.cursor = 'grabbing';
            } else {
                domEl.style.cursor = stateRef.current.cameraControlMode === 'pan' ? 'all-scroll' : 'grab';
            }
        };
        updateCursor();

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        const handlePointerDown = (e: PointerEvent) => {
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            try {
                domEl.setPointerCapture(e.pointerId);
            } catch {
                // Ignore capture errors on synthetic events
            }

            if (activePointers.size === 1) {
                // Determine independent mode: Right/Middle click or Shift = Pan; Ctrl/Alt = Rotate; otherwise active cameraControlMode
                if (e.button === 2 || e.button === 1 || e.shiftKey) {
                    activeDragMode = 'pan';
                } else if (e.ctrlKey || e.altKey || e.metaKey) {
                    activeDragMode = 'rotate';
                } else {
                    activeDragMode = stateRef.current.cameraControlMode;
                }
            } else if (activePointers.size === 2) {
                activeDragMode = 'pan';
                const pts = Array.from(activePointers.values());
                prevPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                prevMidX = (pts[0].x + pts[1].x) * 0.5;
                prevMidY = (pts[0].y + pts[1].y) * 0.5;
            }
            updateCursor();
        };

        const handlePointerMove = (e: PointerEvent) => {
            const prev = activePointers.get(e.pointerId);
            if (!prev) return;

            if (activePointers.size === 1) {
                const dx = e.clientX - prev.x;
                const dy = e.clientY - prev.y;
                activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

                // Allow dynamic Shift modifier mid-drag
                const effectiveMode: 'rotate' | 'pan' = e.shiftKey
                    ? 'pan'
                    : (e.ctrlKey || e.altKey || e.metaKey)
                        ? 'rotate'
                        : (activeDragMode || stateRef.current.cameraControlMode);

                if (effectiveMode === 'pan') {
                    customCam.applyScreenPanDelta(dx, dy, domEl.clientHeight || window.innerHeight);
                } else {
                    const rotateSpeed = (2 * Math.PI) / Math.max(domEl.clientHeight || window.innerHeight, 300) * 0.85;
                    customCam.applyRotateDelta(dx * rotateSpeed, dy * rotateSpeed);
                }
            } else if (activePointers.size === 2) {
                activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                const pts = Array.from(activePointers.values());
                const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                const newMidX = (pts[0].x + pts[1].x) * 0.5;
                const newMidY = (pts[0].y + pts[1].y) * 0.5;

                // Two-finger independent pan
                const dMidX = newMidX - prevMidX;
                const dMidY = newMidY - prevMidY;
                customCam.applyScreenPanDelta(dMidX, dMidY, domEl.clientHeight || window.innerHeight);

                // Two-finger independent pinch zoom
                if (prevPinchDist > 8 && newDist > 8) {
                    const zoomScale = prevPinchDist / newDist;
                    customCam.applyZoomScale(THREE.MathUtils.clamp(zoomScale, 0.85, 1.18));
                }

                prevPinchDist = newDist;
                prevMidX = newMidX;
                prevMidY = newMidY;
            }
        };

        const handlePointerUpOrCancel = (e: PointerEvent) => {
            activePointers.delete(e.pointerId);
            try {
                if (domEl.hasPointerCapture(e.pointerId)) {
                    domEl.releasePointerCapture(e.pointerId);
                }
            } catch {
                // Ignore
            }
            if (activePointers.size === 0) {
                activeDragMode = null;
            } else if (activePointers.size === 1) {
                activeDragMode = stateRef.current.cameraControlMode;
            }
            updateCursor();
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = THREE.MathUtils.clamp(e.deltaY, -120, 120);
            const zoomFactor = Math.pow(1.0012, delta);
            customCam.applyZoomScale(zoomFactor);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

            const isPanKey = e.shiftKey || stateRef.current.cameraControlMode === 'pan';
            const vh = domEl.clientHeight || window.innerHeight;
            const panStepPx = 28;
            const rotStepRad = THREE.MathUtils.degToRad(8);

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    if (isPanKey) customCam.applyScreenPanDelta(0, panStepPx, vh);
                    else customCam.applyRotateDelta(0, rotStepRad);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (isPanKey) customCam.applyScreenPanDelta(0, -panStepPx, vh);
                    else customCam.applyRotateDelta(0, -rotStepRad);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (isPanKey) customCam.applyScreenPanDelta(panStepPx, 0, vh);
                    else customCam.applyRotateDelta(rotStepRad, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (isPanKey) customCam.applyScreenPanDelta(-panStepPx, 0, vh);
                    else customCam.applyRotateDelta(-rotStepRad, 0);
                    break;
                case '+':
                case '=':
                    customCam.applyZoomScale(0.88);
                    break;
                case '-':
                case '_':
                    customCam.applyZoomScale(1.14);
                    break;
                default:
                    break;
            }
        };

        domEl.addEventListener('contextmenu', handleContextMenu);
        domEl.addEventListener('pointerdown', handlePointerDown);
        domEl.addEventListener('pointermove', handlePointerMove);
        domEl.addEventListener('pointerup', handlePointerUpOrCancel);
        domEl.addEventListener('pointercancel', handlePointerUpOrCancel);
        domEl.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('keydown', handleKeyDown);

        // WebXR-Compatible Render Loop via setAnimationLoop
        let thermalPhase = 0;
        let prevFrameTimestamp = performance.now();
        let smoothedFrameIntervalMs = 11.1;
        let smoothedGpuPipelineMs = 3.2;
        let lastTelemetryEmitTime = 0;

        const render = (now: number) => {
            const frameStartPerf = performance.now();
            const rawDeltaMs = now - prevFrameTimestamp;
            prevFrameTimestamp = now;

            if (rawDeltaMs > 1 && rawDeltaMs < 200) {
                smoothedFrameIntervalMs = smoothedFrameIntervalMs * 0.88 + rawDeltaMs * 0.12;
            }

            // Update tweens
            for (let i = activeTweensRef.current.length - 1; i >= 0; i--) {
                if (activeTweensRef.current[i].update(now)) {
                    activeTweensRef.current.splice(i, 1);
                }
            }

            // 37°C Thermal Brownian Dynamics & Quantum H-Bond Emissive Shimmer
            if (stateRef.current.thermalDynamics && stateRef.current.assemblyMode === 'assembled') {
                thermalPhase += 0.04;
                const amp = 0.045;
                const containers = pairDynamicContainersRef.current;
                const baseYs = pairBaseYRef.current;
                for (let i = 0; i < containers.length; i++) {
                    const c = containers[i];
                    if (c) {
                        const waveY = Math.sin(thermalPhase + i * 0.55) * amp;
                        const waveRot = Math.cos(thermalPhase * 0.8 + i * 0.4) * (amp * 0.4);
                        c.position.y = baseYs[i] + waveY;
                        c.rotation.y = waveRot;
                    }
                }
                const hbondPulse = Math.sin(thermalPhase * 1.2) * 0.08;
                materials.hbondDot.emissiveIntensity = 0.92 + hbondPulse;
                materials.hbondGlowTube.emissiveIntensity = 0.58 + hbondPulse * 0.5;
            }

            // Decay interactive selection bloom pulse smoothly
            if (bloomPulseBoostRef.current > 0.001) {
                bloomPulseBoostRef.current *= 0.90;
                if (bloomPulseBoostRef.current < 0.002) bloomPulseBoostRef.current = 0;
            }
            bloomPass.enabled = stateRef.current.bloomEnabled;
            bloomPass.strength = stateRef.current.bloomStrength + bloomPulseBoostRef.current;
            bloomPass.threshold = stateRef.current.bloomThreshold;

            // Auto Rotation
            if (stateRef.current.autoRotate && dnaGroupRef.current) {
                dnaGroupRef.current.rotation.y += 0.0035;
                if (focusedTargetRef.current && customCamRef.current && activePointers.size === 0) {
                    customCamRef.current.sphericalTarget.theta += 0.0035;
                }
            }

            // Background particles & VR dome subtle rotation
            particles.rotation.y += 0.0005;
            particles.rotation.x += 0.0002;
            bokehGroup.rotation.y += 0.0002;
            if (vrEnvGroupRef.current && vrEnvGroupRef.current.visible) {
                vrDomeWire.rotation.y += 0.0003;
            }

            // Emit throttled XR latency & frame rate telemetry when VR mode is active
            const emitVrPerformanceIfNeeded = () => {
                if ((stateRef.current.isVrModeActive || renderer.xr.isPresenting) && onUpdateVrPerformance) {
                    const frameExecMs = Math.max(0.8, performance.now() - frameStartPerf);
                    smoothedGpuPipelineMs = smoothedGpuPipelineMs * 0.85 + frameExecMs * 0.15;
                    if (now - lastTelemetryEmitTime > 480) {
                        lastTelemetryEmitTime = now;
                        // Motion-to-photon latency combines vsync interval half-period + render pipeline execution
                        const latencyMs = Number(
                            THREE.MathUtils.clamp(smoothedFrameIntervalMs * 0.55 + smoothedGpuPipelineMs + 2.4, 6.2, 48.0).toFixed(1)
                        );
                        const fps = Math.round(THREE.MathUtils.clamp(1000 / Math.max(smoothedFrameIntervalMs, 6.5), 24, 120));
                        onUpdateVrPerformance({ latencyMs, fps });
                    }
                }
            };

            // Poll WebXR Headset Controller Thumbsticks when presenting in VR
            if (renderer.xr.isPresenting && dnaGroupRef.current) {
                const session = renderer.xr.getSession();
                if (session && session.inputSources) {
                    for (const source of session.inputSources) {
                        if (source.gamepad && source.gamepad.axes.length >= 4) {
                            const thumbX = source.gamepad.axes[2] || 0;
                            const thumbY = source.gamepad.axes[3] || 0;
                            if (Math.abs(thumbX) > 0.12) {
                                dnaGroupRef.current.rotation.y -= thumbX * 0.035;
                            }
                            if (Math.abs(thumbY) > 0.12) {
                                dnaGroupRef.current.position.y = THREE.MathUtils.clamp(
                                    dnaGroupRef.current.position.y - thumbY * 0.025,
                                    0.4,
                                    2.8
                                );
                            }
                        }
                    }
                }
                renderer.render(scene, camera);
                emitVrPerformanceIfNeeded();
                return;
            }

            // Live Auto-Focus Camera Tracking: keep panTarget centered on the inspected molecular component
            if (focusedTargetRef.current && customCamRef.current && dnaGroupRef.current) {
                const ft = focusedTargetRef.current;
                if (ft.object.parent) {
                    dnaGroupRef.current.updateMatrixWorld(true);
                    const liveWorldPos = ft.localCenter.clone();
                    ft.object.localToWorld(liveWorldPos);
                    const lim = customCamRef.current.panLimit;
                    customCamRef.current.panTarget.set(
                        THREE.MathUtils.clamp(liveWorldPos.x, -lim, lim),
                        THREE.MathUtils.clamp(liveWorldPos.y, -lim, lim),
                        THREE.MathUtils.clamp(liveWorldPos.z, -lim, lim)
                    );
                }
            }

            if (customCamRef.current) {
                customCamRef.current.update();
            }

            // Stereoscopic Side-by-Side (SBS) VR Lens Mode vs Standard/360 Panoramic Render with UnrealBloomPass
            if (stateRef.current.isVrModeActive && stateRef.current.isStereoLensMode && stereoCameraRef.current) {
                const w = window.innerWidth;
                const h = window.innerHeight;
                const halfW = Math.floor(w * 0.5);

                camera.aspect = halfW / Math.max(h, 1);
                camera.updateProjectionMatrix();
                stereoCameraRef.current.update(camera);

                renderer.setScissorTest(true);

                // Left Eye Viewport
                renderer.setScissor(0, 0, halfW, h);
                renderer.setViewport(0, 0, halfW, h);
                renderer.render(scene, stereoCameraRef.current.cameraL);

                // Right Eye Viewport
                renderer.setScissor(halfW, 0, w - halfW, h);
                renderer.setViewport(halfW, 0, w - halfW, h);
                renderer.render(scene, stereoCameraRef.current.cameraR);

                renderer.setScissorTest(false);
                renderer.setViewport(0, 0, w, h);
                camera.aspect = w / Math.max(h, 1);
                camera.updateProjectionMatrix();
            } else {
                renderer.setScissorTest(false);
                renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
                if (stateRef.current.bloomEnabled) {
                    composer.render();
                } else {
                    renderer.render(scene, camera);
                }
            }
            emitVrPerformanceIfNeeded();

            // Project 3D positions to screen for overlay callouts
            if (dnaGroupRef.current && cameraRef.current) {
                const screenPositions: Record<string, { x: number; y: number; visible: boolean }> = {};
                const m = window.innerWidth <= 768 ? 0.6 : 1.0;
                const offsets: Record<string, [number, number]> = {
                    majorGroove: [-110 * m, -40 * m],
                    minorGroove: [-100 * m, 35 * m],
                    backbone: [35 * m, -10 * m],
                    atPair: [30 * m, -35 * m],
                    cgPair: [35 * m, 25 * m],
                    metricDiameter2: [25 * m, -45 * m],
                    metricRise2: [-120 * m, 15 * m],
                    metricPitch2: [-135 * m, -60 * m],
                    strand1Top: [-55 * m, -32 * m],
                    strand1Bottom: [-55 * m, 22 * m],
                    strand2Top: [35 * m, -32 * m],
                    strand2Bottom: [35 * m, 22 * m]
                };

                const hideCalloutsInStereo = stateRef.current.isVrModeActive && stateRef.current.isStereoLensMode;

                for (const key of Object.keys(annotationTargetsRef.current)) {
                    const v = annotationTargetsRef.current[key];
                    const worldPos = v.clone().applyMatrix4(dnaGroupRef.current.matrixWorld);
                    worldPos.project(cameraRef.current);
                    const [ox, oy] = offsets[key] || [0, 0];
                    let x = (worldPos.x * 0.5 + 0.5) * window.innerWidth + ox;
                    let y = (-(worldPos.y * 0.5) + 0.5) * window.innerHeight + oy;

                    const isMobile = window.innerWidth <= 768;
                    const elWidth = isMobile ? 100 : 130;
                    const elHeight = isMobile ? 30 : 38;
                    const minX = 6;
                    const maxX = Math.max(minX, window.innerWidth - elWidth - 6);
                    const minY = isMobile ? 65 : 10;
                    const maxY = Math.max(minY, window.innerHeight - elHeight - (isMobile ? 68 : 15));
                    x = Math.max(minX, Math.min(maxX, x));
                    y = Math.max(minY, Math.min(maxY, y));

                    screenPositions[key] = {
                        x,
                        y,
                        visible: !hideCalloutsInStereo && worldPos.z <= 1.0 && stateRef.current.labelsVisible && stateRef.current.assemblyMode === 'assembled'
                    };
                }
                onUpdateAnnotationPositions(screenPositions);
            }
        };

        renderer.setAnimationLoop(render);

        const handleResize = () => {
            if (!rendererRef.current || !cameraRef.current || rendererRef.current.xr.isPresenting) return;
            const w = window.innerWidth;
            const h = window.innerHeight;
            rendererRef.current.setSize(w, h);
            composer.setSize(w, h);
            bloomPass.resolution.set(w, h);
            adjustCameraOnResize();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            renderer.setAnimationLoop(null);
            renderer.xr.removeEventListener('sessionstart', onXrSessionStart);
            renderer.xr.removeEventListener('sessionend', onXrSessionEnd);
            if (xrSessionRef.current) {
                xrSessionRef.current.end().catch(() => {});
                xrSessionRef.current = null;
            }
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
            domEl.removeEventListener('contextmenu', handleContextMenu);
            domEl.removeEventListener('pointerdown', handlePointerDown);
            domEl.removeEventListener('pointermove', handlePointerMove);
            domEl.removeEventListener('pointerup', handlePointerUpOrCancel);
            domEl.removeEventListener('pointercancel', handlePointerUpOrCancel);
            domEl.removeEventListener('wheel', handleWheel);
            Object.values(pbrMaps).forEach(tex => tex.dispose());
            Object.values(letterTextures).forEach(tex => tex.dispose());
            bgTexture.dispose();
            envTexture.dispose();
            vrDomeGeo.dispose();
            vrDomeWireGeo.dispose();
            horizonRingGeo.dispose();
            laserGeo.dispose();
            bloomPass.dispose();
            outputPass.dispose();
            composer.dispose();
            composerRenderTarget.dispose();
            if (renderer.domElement && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // Synchronize Virtual Reality Mode (WebXR Immersive Session + 360° VR Environment)
    useEffect(() => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const vrEnv = vrEnvGroupRef.current;
        if (!renderer || !scene || !vrEnv) return;

        if (isVrModeActive) {
            vrEnv.visible = true;
            if (scene.fog instanceof THREE.FogExp2) {
                scene.fog.density = 0.0022;
            }

            // Attempt native WebXR immersive-vr session if supported and not already presenting
            const xrNav = (navigator as any).xr;
            if (webXrNativeSupportedRef.current && xrNav && !renderer.xr.isPresenting && !xrSessionRef.current) {
                xrNav.requestSession('immersive-vr', {
                    optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
                })
                    .then(async (session: any) => {
                        xrSessionRef.current = session;
                        await renderer.xr.setSession(session);
                    })
                    .catch(() => {
                        // Fallback gracefully to 360° Immersive / Stereoscopic VR Mode in-browser
                        xrSessionRef.current = null;
                    });
            }
        } else {
            vrEnv.visible = false;
            if (scene.fog instanceof THREE.FogExp2) {
                scene.fog.density = 0.0055;
            }
            if (xrSessionRef.current) {
                const activeSession = xrSessionRef.current;
                xrSessionRef.current = null;
                activeSession.end().catch(() => {});
            }
        }
    }, [isVrModeActive]);

    // Update canvas cursor when cameraControlMode changes
    useEffect(() => {
        if (rendererRef.current?.domElement) {
            rendererRef.current.domElement.style.cursor = cameraControlMode === 'pan' ? 'all-scroll' : 'grab';
        }
    }, [cameraControlMode]);

    // Handle discrete precision camera step commands (independent Pan, Rotate, Zoom)
    useEffect(() => {
        if (!cameraStepCommand || !customCamRef.current) return;
        const cam = customCamRef.current;
        const vh = rendererRef.current?.domElement.clientHeight || window.innerHeight;
        const panPixels = 52;
        const rotRad = THREE.MathUtils.degToRad(15);

        switch (cameraStepCommand.action) {
            case 'pan_up':
                cam.applyScreenPanDelta(0, panPixels, vh);
                break;
            case 'pan_down':
                cam.applyScreenPanDelta(0, -panPixels, vh);
                break;
            case 'pan_left':
                cam.applyScreenPanDelta(panPixels, 0, vh);
                break;
            case 'pan_right':
                cam.applyScreenPanDelta(-panPixels, 0, vh);
                break;
            case 'center_pan':
                focusedTargetRef.current = null;
                cam.panTarget.set(0, 0, 0);
                break;
            case 'rotate_left':
                cam.applyRotateDelta(rotRad, 0);
                break;
            case 'rotate_right':
                cam.applyRotateDelta(-rotRad, 0);
                break;
            case 'rotate_up':
                cam.applyRotateDelta(0, rotRad);
                break;
            case 'rotate_down':
                cam.applyRotateDelta(0, -rotRad);
                break;
            case 'zoom_in':
                cam.applyZoomScale(0.84);
                break;
            case 'zoom_out':
                cam.applyZoomScale(1.18);
                break;
        }
    }, [cameraStepCommand]);

    // Handle reset camera trigger (resets spherical orbit, pan target, and DNA helix orientation)
    useEffect(() => {
        if (resetCameraTrigger > 0 && customCamRef.current) {
            const aspect = window.innerWidth / window.innerHeight;
            customCamRef.current.resetToDefault(aspect, false);

            if (dnaGroupRef.current) {
                const grp = dnaGroupRef.current;
                const startRot = new THREE.Vector3(grp.rotation.x, grp.rotation.y % (Math.PI * 2), grp.rotation.z);
                const destRot = new THREE.Vector3(0.15, 0, 0.30);
                const startTime = performance.now();
                const durationMs = 650;
                activeTweensRef.current.push({
                    update: (now: number) => {
                        const progress = Math.min((now - startTime) / durationMs, 1.0);
                        const eased = progress < 0.5
                            ? 4 * progress * progress * progress
                            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                        grp.rotation.x = THREE.MathUtils.lerp(startRot.x, destRot.x, eased);
                        grp.rotation.y = THREE.MathUtils.lerp(startRot.y, destRot.y, eased);
                        grp.rotation.z = THREE.MathUtils.lerp(startRot.z, destRot.z, eased);
                        return progress >= 1.0;
                    }
                });
            }
        }
    }, [resetCameraTrigger]);

    // Build or Rebuild DNA Structure when conformation, condition, or sequence changes
    useEffect(() => {
        const dnaGroup = dnaGroupRef.current;
        const ionGroup = ionGroupRef.current;
        const materials = materialsRef.current;
        const conditionMaterials = conditionMaterialsRef.current;
        const electroMaterials = electroMaterialsRef.current;
        const badgeMaterials = badgeMaterialsRef.current;
        const geos = sharedGeosRef.current;
        if (!dnaGroup || !ionGroup || !materials || !conditionMaterials || !electroMaterials || !badgeMaterials || !geos) return;

        // Clear existing children from dnaGroup & ionGroup
        [ribbon1Ref, ribbon2Ref, ribbon1RailRef, ribbon2RailRef].forEach(r => {
            if (r.current && r.current.geometry) {
                r.current.geometry.dispose();
                r.current = null;
            }
        });
        dnaGroup.clear();
        ionGroup.clear();
        dnaGroup.add(ionGroup);

        allInteractiveMeshesRef.current = [];
        strand1MeshesRef.current = [];
        strand2MeshesRef.current = [];
        baseMeshesRef.current = { A: [], T: [], G: [], C: [], backbone: [], hbond: [], methylation: [], thymine_dimer: [], intercalator: [], ion_mg: [], water_hydration: [] };
        backboneFocusNodesRef.current = [];
        bioObjectsRef.current = [];
        cpkObjectsRef.current = [];
        ballStickObjectsRef.current = [];
        electroObjectsRef.current = [];
        pairDynamicContainersRef.current = [];
        pairBaseYRef.current = [];

        const splinePointsStrand1: THREE.Vector3[] = [];
        const splinePointsStrand2: THREE.Vector3[] = [];
        const splinePointsRail1: THREE.Vector3[] = [];
        const splinePointsRail2: THREE.Vector3[] = [];

        const { clean } = calculateSequenceStats(sequence);
        const conf = CONFORMATIONS[conformation] || CONFORMATIONS.B;
        const complementMap: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
        const rawPairs: Array<{ b1: string; b2: string }> = [];
        for (const char of clean) {
            rawPairs.push({ b1: char, b2: complementMap[char] || 'A' });
        }

        const targetPairsCount = Math.max(22, Math.min(30, rawPairs.length * Math.ceil(24 / rawPairs.length)));
        const activePairs: Array<{ b1: string; b2: string }> = [];
        for (let i = 0; i < targetPairsCount; i++) {
            activePairs.push(rawPairs[i % rawPairs.length]);
        }

        const NUM_PAIRS = activePairs.length;
        const midIdx = Math.floor(NUM_PAIRS / 2);

        let accumulatedY = - (NUM_PAIRS / 2) * conf.heightStep;
        let accumulatedAngle = 0;

        const upAxis = new THREE.Vector3(0, 1, 0);

        // Helper to add a 3D covalent bond cylinder between two points
        const addBondCylinder = (
            parent: THREE.Object3D,
            pA: THREE.Vector3,
            pB: THREE.Vector3,
            mat: THREE.Material,
            cylGeo: THREE.BufferGeometry = geos.bioBondCylGeo
        ) => {
            const diff = new THREE.Vector3().subVectors(pB, pA);
            const dist = diff.length();
            if (dist < 0.001) return;
            const mesh = new THREE.Mesh(cylGeo, mat);
            mesh.position.copy(pA).addScaledVector(diff, 0.5);
            mesh.scale.set(1, dist, 1);
            mesh.quaternion.setFromUnitVectors(upAxis, diff.normalize());
            parent.add(mesh);
        };

        // Helper to build a realistic 3D Bio-Illustrative Nucleotide (Furanose Sugar + Tetrahedral PO4 + Heterocyclic Base Rings)
        const buildRealisticBioNucleotide = (
            targetGroup: THREE.Group,
            baseType: string,
            isPurine: boolean,
            strandSign: number
        ) => {
            const baseMat = materials[baseType];
            const fillMat = materials.ringFill[baseType];

            // 1. Tetrahedral Phosphate Group (PO4-) at the backbone perimeter
            const phosGroup = new THREE.Group();
            const pPos = new THREE.Vector3(0.0, 0.36 * strandSign, -0.32);
            const o1pPos = new THREE.Vector3(-0.38, 0.58 * strandSign, -0.58);
            const o2pPos = new THREE.Vector3(0.38, 0.58 * strandSign, -0.58);
            const o5pPos = new THREE.Vector3(0.14, 0.10 * strandSign, -0.05);

            const pMesh = new THREE.Mesh(geos.bioPhosphateCenterGeo, materials.phosphateNode);
            pMesh.position.copy(pPos);
            phosGroup.add(pMesh);

            const o1pMesh = new THREE.Mesh(geos.bioPhosphateOxygenGeo, materials.cpk.O);
            o1pMesh.position.copy(o1pPos);
            phosGroup.add(o1pMesh);

            const o2pMesh = new THREE.Mesh(geos.bioPhosphateOxygenGeo, materials.cpk.O);
            o2pMesh.position.copy(o2pPos);
            phosGroup.add(o2pMesh);

            addBondCylinder(phosGroup, pPos, o1pPos, materials.cpk.O, geos.bioDoubleBondCylGeo);
            addBondCylinder(phosGroup, pPos, o2pPos, materials.cpk.O, geos.bioDoubleBondCylGeo);
            addBondCylinder(phosGroup, pPos, o5pPos, materials.phosphateNode, geos.bioDoubleBondCylGeo);
            targetGroup.add(phosGroup);

            // 2. 2'-Deoxyribose Furanose Ring (C1'-C2'-C3'-C4'-O4' + C5' exocyclic arm) with C2'-endo pucker
            const sugarGroup = new THREE.Group();
            const c5p = new THREE.Vector3(0.22, 0.04 * strandSign, 0.14);
            const fVertices = [
                { pos: new THREE.Vector3(-0.12, 0.0, 1.05), el: 'C' },           // C1' (anomeric)
                { pos: new THREE.Vector3(0.42, 0.14 * strandSign, 0.92), el: 'C' }, // C2' (C2'-endo pucker)
                { pos: new THREE.Vector3(0.56, -0.08 * strandSign, 0.52), el: 'C' },// C3'
                { pos: new THREE.Vector3(0.24, -0.04 * strandSign, 0.36), el: 'C' },// C4'
                { pos: new THREE.Vector3(-0.22, 0.0, 0.62), el: 'O' }            // O4' (ring oxygen)
            ];

            // Furanose ring covalent bonds & vertex spheres
            for (let k = 0; k < fVertices.length; k++) {
                const curr = fVertices[k];
                const next = fVertices[(k + 1) % fVertices.length];
                const vMat = curr.el === 'O' ? materials.cpk.O : materials.sugarNode;
                const vMesh = new THREE.Mesh(geos.bioAtomNodeGeo, vMat);
                vMesh.position.copy(curr.pos);
                sugarGroup.add(vMesh);
                addBondCylinder(sugarGroup, curr.pos, next.pos, materials.sugarNode, geos.bioDoubleBondCylGeo);
            }

            // C5' exocyclic methylene bridge
            const c5pMesh = new THREE.Mesh(geos.bioAtomNodeGeo, materials.sugarNode);
            c5pMesh.position.copy(c5p);
            sugarGroup.add(c5pMesh);
            addBondCylinder(sugarGroup, o5pPos, c5p, materials.sugarNode, geos.bioDoubleBondCylGeo);
            addBondCylinder(sugarGroup, c5p, fVertices[3].pos, materials.sugarNode, geos.bioDoubleBondCylGeo);

            // Semi-translucent furanose pentose plane
            const fFill = new THREE.Mesh(geos.furanoseFillGeo, materials.ringFill.sugar);
            sugarGroup.add(fFill);
            targetGroup.add(sugarGroup);
            backboneFocusNodesRef.current.push(phosGroup, sugarGroup);

            // 3. Beta-N-Glycosidic Bond (C1' -> N9 of Purine or N1 of Pyrimidine)
            const glycosidicAnchor = new THREE.Vector3(0.0, 0.0, 1.48);
            addBondCylinder(targetGroup, fVertices[0].pos, glycosidicAnchor, baseMat, geos.bioGlycosidicRodGeo);

            // 4. Heterocyclic Nucleobase Plane (Tilted & Propeller-Twisted)
            const basePlaneGroup = new THREE.Group();
            basePlaneGroup.position.copy(glycosidicAnchor);
            basePlaneGroup.rotation.x = conf.tilt * strandSign;
            basePlaneGroup.rotation.z = conf.propeller * strandSign;
            // Flip X on strand 2 so Major Groove (+X/-X) & Watson-Crick edges align antiparallel
            if (strandSign < 0) {
                basePlaneGroup.scale.x = -1;
            }
            targetGroup.add(basePlaneGroup);

            if (isPurine) {
                // Fused Bicyclic Purine System: 5-membered Imidazole + 6-membered Pyrimidine
                const imiAtoms = [
                    { pos: new THREE.Vector3(0.0, 0, 0.0), el: 'N' },    // N9
                    { pos: new THREE.Vector3(-0.58, 0, 0.36), el: 'C' }, // C8
                    { pos: new THREE.Vector3(-0.36, 0, 0.98), el: 'N' }, // N7
                    { pos: new THREE.Vector3(0.34, 0, 0.98), el: 'C' },  // C5
                    { pos: new THREE.Vector3(0.54, 0, 0.36), el: 'C' }   // C4
                ];
                const pyrAtoms = [
                    { pos: new THREE.Vector3(0.34, 0, 0.98), el: 'C' },  // C5
                    { pos: new THREE.Vector3(-0.06, 0, 1.62), el: 'C' }, // C6
                    { pos: new THREE.Vector3(0.42, 0, 2.12), el: 'N' },  // N1
                    { pos: new THREE.Vector3(1.14, 0, 1.96), el: 'C' },  // C2
                    { pos: new THREE.Vector3(1.22, 0, 1.28), el: 'N' },  // N3
                    { pos: new THREE.Vector3(0.54, 0, 0.36), el: 'C' }   // C4
                ];

                // Imidazole ring bonds & nodes
                for (let k = 0; k < imiAtoms.length; k++) {
                    const a = imiAtoms[k];
                    const b = imiAtoms[(k + 1) % imiAtoms.length];
                    const nodeMat = a.el === 'N' ? materials.cpk.N : baseMat;
                    const sphere = new THREE.Mesh(geos.bioAtomNodeGeo, nodeMat);
                    sphere.position.copy(a.pos);
                    basePlaneGroup.add(sphere);
                    addBondCylinder(basePlaneGroup, a.pos, b.pos, baseMat);
                }

                // Pyrimidine ring bonds & nodes
                for (let k = 0; k < pyrAtoms.length; k++) {
                    const a = pyrAtoms[k];
                    const b = pyrAtoms[(k + 1) % pyrAtoms.length];
                    if (k > 0 && k < 5) {
                        const nodeMat = a.el === 'N' ? materials.cpk.N : baseMat;
                        const sphere = new THREE.Mesh(geos.bioAtomNodeGeo, nodeMat);
                        sphere.position.copy(a.pos);
                        basePlaneGroup.add(sphere);
                    }
                    // Skip C4-C5 shared bond duplicate
                    if (!(k === 5)) {
                        addBondCylinder(basePlaneGroup, a.pos, b.pos, baseMat);
                    }
                }

                // Semi-translucent glowing aromatic ring fills
                const imiFill = new THREE.Mesh(geos.purineImidazoleFillGeo, fillMat);
                const pyrFill = new THREE.Mesh(geos.purinePyrimidineFillGeo, fillMat);
                basePlaneGroup.add(imiFill, pyrFill);

                // Exocyclic substituents (Adenine vs Guanine)
                const c6Pos = pyrAtoms[1].pos;
                const n1Pos = pyrAtoms[2].pos;
                const c2Pos = pyrAtoms[3].pos;

                if (baseType === 'A') {
                    // Adenine: C6-NH2 amino group in Major Groove
                    const n6Pos = new THREE.Vector3(-0.46, 0, 2.08);
                    const h61Pos = new THREE.Vector3(-0.22, 0, 2.38);
                    const h62Pos = new THREE.Vector3(-0.84, 0, 2.04);
                    addBondCylinder(basePlaneGroup, c6Pos, n6Pos, baseMat);
                    const n6Mesh = new THREE.Mesh(geos.bioSubstituentAtomGeo, materials.cpk.N);
                    n6Mesh.position.copy(n6Pos);
                    basePlaneGroup.add(n6Mesh);

                    addBondCylinder(basePlaneGroup, n6Pos, h61Pos, materials.cpk.H, geos.bioDoubleBondCylGeo);
                    addBondCylinder(basePlaneGroup, n6Pos, h62Pos, materials.cpk.H, geos.bioDoubleBondCylGeo);
                    const h1 = new THREE.Mesh(geos.bioHydrogenAtomGeo, materials.cpk.H);
                    h1.position.copy(h61Pos);
                    const h2 = new THREE.Mesh(geos.bioHydrogenAtomGeo, materials.cpk.H);
                    h2.position.copy(h62Pos);
                    basePlaneGroup.add(h1, h2);
                } else {
                    // Guanine: C6=O carbonyl in Major Groove + N1-H + C2-NH2 in Minor Groove
                    const o6Pos = new THREE.Vector3(-0.46, 0, 2.08);
                    addBondCylinder(basePlaneGroup, c6Pos, o6Pos, materials.cpk.O);
                    const o6Mesh = new THREE.Mesh(geos.bioSubstituentAtomGeo, materials.cpk.O);
                    o6Mesh.position.copy(o6Pos);
                    basePlaneGroup.add(o6Mesh);

                    // N1-H imino proton
                    const h1Pos = new THREE.Vector3(0.32, 0, 2.46);
                    addBondCylinder(basePlaneGroup, n1Pos, h1Pos, materials.cpk.H, geos.bioDoubleBondCylGeo);
                    const h1Mesh = new THREE.Mesh(geos.bioHydrogenAtomGeo, materials.cpk.H);
                    h1Mesh.position.copy(h1Pos);
                    basePlaneGroup.add(h1Mesh);

                    // C2-NH2 amino group
                    const n2Pos = new THREE.Vector3(1.52, 0, 2.38);
                    const h21Pos = new THREE.Vector3(1.30, 0, 2.66);
                    addBondCylinder(basePlaneGroup, c2Pos, n2Pos, baseMat);
                    const n2Mesh = new THREE.Mesh(geos.bioSubstituentAtomGeo, materials.cpk.N);
                    n2Mesh.position.copy(n2Pos);
                    basePlaneGroup.add(n2Mesh);
                    addBondCylinder(basePlaneGroup, n2Pos, h21Pos, materials.cpk.H, geos.bioDoubleBondCylGeo);
                    const h21Mesh = new THREE.Mesh(geos.bioHydrogenAtomGeo, materials.cpk.H);
                    h21Mesh.position.copy(h21Pos);
                    basePlaneGroup.add(h21Mesh);
                }

                // Sleek recessed micro-chemical badge inside the 6-membered ring
                const badge = new THREE.Mesh(geos.bioMicroBadgeGeo, badgeMaterials[baseType]);
                badge.position.set(0.56, 0.0, 1.38);
                if (strandSign < 0) badge.scale.x = -1;
                basePlaneGroup.add(badge);
            } else {
                // 6-Membered Hexagonal Pyrimidine Ring (Thymine & Cytosine)
                const hexAtoms = [
                    { pos: new THREE.Vector3(0.0, 0, 0.0), el: 'N' },    // N1
                    { pos: new THREE.Vector3(-0.60, 0, 0.36), el: 'C' }, // C6
                    { pos: new THREE.Vector3(-0.60, 0, 1.08), el: 'C' }, // C5
                    { pos: new THREE.Vector3(0.0, 0, 1.46), el: 'C' },   // C4
                    { pos: new THREE.Vector3(0.60, 0, 1.08), el: 'N' },  // N3
                    { pos: new THREE.Vector3(0.60, 0, 0.36), el: 'C' }   // C2
                ];

                for (let k = 0; k < hexAtoms.length; k++) {
                    const a = hexAtoms[k];
                    const b = hexAtoms[(k + 1) % hexAtoms.length];
                    const nodeMat = a.el === 'N' ? materials.cpk.N : baseMat;
                    const sphere = new THREE.Mesh(geos.bioAtomNodeGeo, nodeMat);
                    sphere.position.copy(a.pos);
                    basePlaneGroup.add(sphere);
                    addBondCylinder(basePlaneGroup, a.pos, b.pos, baseMat);
                }

                // Semi-translucent glowing hexagonal ring fill
                const hexFill = new THREE.Mesh(geos.pyrimidineRingFillGeo, fillMat);
                basePlaneGroup.add(hexFill);

                const c5Pos = hexAtoms[2].pos;
                const c4Pos = hexAtoms[3].pos;
                const n3Pos = hexAtoms[4].pos;
                const c2Pos = hexAtoms[5].pos;

                // Exocyclic C2=O keto oxygen (common to both T and C in Minor Groove)
                const o2Pos = new THREE.Vector3(1.08, 0, 0.14);
                addBondCylinder(basePlaneGroup, c2Pos, o2Pos, materials.cpk.O, geos.bioDoubleBondCylGeo);
                const o2Mesh = new THREE.Mesh(geos.bioSubstituentAtomGeo, materials.cpk.O);
                o2Mesh.position.copy(o2Pos);
                basePlaneGroup.add(o2Mesh);

                if (baseType === 'T') {
                    // Thymine: C4=O keto oxygen + N3-H imino proton + C5-CH3 methyl group
                    const o4Pos = new THREE.Vector3(-0.08, 0, 1.98);
                    addBondCylinder(basePlaneGroup, c4Pos, o4Pos, materials.cpk.O);
                    const o4Mesh = new THREE.Mesh(geos.bioSubstituentAtomGeo, materials.cpk.O);
                    o4Mesh.position.copy(o4Pos);
                    basePlaneGroup.add(o4Mesh);

                    const h3Pos = new THREE.Vector3(0.92, 0, 1.36);
                    addBondCylinder(basePlaneGroup, n3Pos, h3Pos, materials.cpk.H, geos.bioDoubleBondCylGeo);
                    const h3Mesh = new THREE.Mesh(geos.bioHydrogenAtomGeo, materials.cpk.H);
                    h3Mesh.position.copy(h3Pos);
                    basePlaneGroup.add(h3Mesh);

                    // C5 Methyl (-CH3) protruding into Major Groove
                    const c5mPos = new THREE.Vector3(-1.14, 0, 1.38);
                    addBondCylinder(basePlaneGroup, c5Pos, c5mPos, baseMat);
                    const c5mMesh = new THREE.Mesh(geos.bioSubstituentAtomGeo, baseMat);
                    c5mMesh.position.copy(c5mPos);
                    basePlaneGroup.add(c5mMesh);
                } else {
                    // Cytosine: C4-NH2 amino group in Major Groove
                    const n4Pos = new THREE.Vector3(-0.08, 0, 1.98);
                    const h41Pos = new THREE.Vector3(0.16, 0, 2.28);
                    addBondCylinder(basePlaneGroup, c4Pos, n4Pos, baseMat);
                    const n4Mesh = new THREE.Mesh(geos.bioSubstituentAtomGeo, materials.cpk.N);
                    n4Mesh.position.copy(n4Pos);
                    basePlaneGroup.add(n4Mesh);

                    addBondCylinder(basePlaneGroup, n4Pos, h41Pos, materials.cpk.H, geos.bioDoubleBondCylGeo);
                    const h41Mesh = new THREE.Mesh(geos.bioHydrogenAtomGeo, materials.cpk.H);
                    h41Mesh.position.copy(h41Pos);
                    basePlaneGroup.add(h41Mesh);
                }

                // Sleek recessed micro-chemical badge inside the 6-membered ring
                const badge = new THREE.Mesh(geos.bioMicroBadgeGeo, badgeMaterials[baseType]);
                badge.position.set(0.0, 0.0, 0.73);
                if (strandSign < 0) badge.scale.x = -1;
                basePlaneGroup.add(badge);
            }
        };

        for (let i = 0; i < NUM_PAIRS; i++) {
            let currentPair = activePairs[i];

            if (condition === 'thymine_dimer' && (i === midIdx || i === midIdx - 1)) {
                currentPair = { b1: 'T', b2: 'A' };
            }

            const b1Type = currentPair.b1;
            const b2Type = currentPair.b2;
            const isCG = (b1Type === 'C' || b1Type === 'G');
            const isPurine1 = (b1Type === 'A' || b1Type === 'G');
            const isPurine2 = (b2Type === 'A' || b2Type === 'G');

            let stepY = conf.heightStep;
            let stepAngle = conf.angleStep;
            let localRadius = conf.radius;

            if (conf.zigzag) {
                localRadius += (i % 2 === 0) ? 0.35 : -0.35;
                stepY *= (i % 2 === 0) ? 1.08 : 0.92;
            }

            if (condition === 'intercalation' && i === midIdx) {
                stepY *= 2.35;
                stepAngle -= 0.45;
            }

            accumulatedY += stepY;
            accumulatedAngle += stepAngle;

            pairBaseYRef.current.push(accumulatedY);

            const theta1 = accumulatedAngle;
            const theta2 = theta1 + conf.majorMinorOffset;

            let x1 = Math.cos(theta1) * localRadius;
            let z1 = Math.sin(theta1) * localRadius;
            let x2 = Math.cos(theta2) * localRadius;
            let z2 = Math.sin(theta2) * localRadius;

            let kinkYOffset = 0;
            if (condition === 'thymine_dimer' && i >= midIdx) {
                const bendFactor = (i - midIdx + 1) * 0.18;
                x1 += bendFactor * 2.2;
                x2 += bendFactor * 2.2;
                kinkYOffset = bendFactor * 0.4;
            }

            const pos1 = new THREE.Vector3(x1, accumulatedY + kinkYOffset, z1);
            const pos2 = new THREE.Vector3(x2, accumulatedY + kinkYOffset, z2);

            splinePointsStrand1.push(pos1);
            splinePointsStrand2.push(pos2);

            // Outer rail spline points for sculpted double-track ribbon look
            const r1Out = new THREE.Vector3(Math.cos(theta1) * (localRadius + 0.28), accumulatedY + kinkYOffset + 0.14, Math.sin(theta1) * (localRadius + 0.28));
            const r2Out = new THREE.Vector3(Math.cos(theta2) * (localRadius + 0.28), accumulatedY + kinkYOffset - 0.14, Math.sin(theta2) * (localRadius + 0.28));
            if (condition === 'thymine_dimer' && i >= midIdx) {
                const bendFactor = (i - midIdx + 1) * 0.18;
                r1Out.x += bendFactor * 2.2;
                r2Out.x += bendFactor * 2.2;
            }
            splinePointsRail1.push(r1Out);
            splinePointsRail2.push(r2Out);

            const center = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);

            const pairContainer = new THREE.Group();
            pairContainer.position.set(0, accumulatedY + kinkYOffset, 0);
            dnaGroup.add(pairContainer);
            pairDynamicContainersRef.current.push(pairContainer);

            const p1Local = new THREE.Vector3(x1, 0, z1);
            const p2Local = new THREE.Vector3(x2, 0, z2);
            const centerLocal = new THREE.Vector3().addVectors(p1Local, p2Local).multiplyScalar(0.5);
            const dir1 = new THREE.Vector3().subVectors(centerLocal, p1Local).normalize();
            const dir2 = new THREE.Vector3().subVectors(centerLocal, p2Local).normalize();

            const s1Container = new THREE.Group();
            const s2Container = new THREE.Group();
            const bondContainer = new THREE.Group();

            pairContainer.add(s1Container);
            pairContainer.add(s2Container);
            pairContainer.add(bondContainer);

            // =================================================================
            // A. UPGRADED REALISTIC 3D BIO-ILLUSTRATIVE MODE
            // =================================================================
            const bioBase1 = new THREE.Group();
            const bioBase2 = new THREE.Group();
            const bioBond = new THREE.Group();

            s1Container.add(bioBase1);
            s2Container.add(bioBase2);
            bondContainer.add(bioBond);

            bioObjectsRef.current.push(bioBase1, bioBase2, bioBond);

            buildRealisticBioNucleotide(bioBase1, b1Type, isPurine1, 1);
            bioBase1.position.copy(p1Local);
            bioBase1.lookAt(centerLocal);

            bioBase1.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    child.userData = {
                        type: b1Type, strand: 1, parentGroup: s1Container,
                        initialPos: s1Container.position.clone(), pairIndex: i
                    };
                    allInteractiveMeshesRef.current.push(child as THREE.Mesh);
                }
            });
            baseMeshesRef.current[b1Type].push(s1Container);

            buildRealisticBioNucleotide(bioBase2, b2Type, isPurine2, -1);
            bioBase2.position.copy(p2Local);
            bioBase2.lookAt(centerLocal);

            bioBase2.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    child.userData = {
                        type: b2Type, strand: 2, parentGroup: s2Container,
                        initialPos: s2Container.position.clone(), pairIndex: i
                    };
                    allInteractiveMeshesRef.current.push(child as THREE.Mesh);
                }
            });
            baseMeshesRef.current[b2Type].push(s2Container);

            // Precision Watson-Crick Hydrogen Bond Bridges (2 for A=T, 3 for G≡C)
            const bondLinesCount = isCG ? 3 : 2;
            const bondLineSpacing = isCG ? [-0.42, 0.0, 0.42] : [-0.28, 0.28];
            const tip1 = new THREE.Vector3().addVectors(p1Local, dir1.clone().multiplyScalar(isPurine1 ? 3.55 : 2.95));
            const tip2 = new THREE.Vector3().addVectors(p2Local, dir2.clone().multiplyScalar(isPurine2 ? 3.55 : 2.95));
            const gapVector = new THREE.Vector3().subVectors(tip2, tip1);
            const gapLen = gapVector.length();
            const gapDir = gapVector.clone().normalize();
            const perpendicular = new THREE.Vector3(0, 1, 0).cross(gapDir).normalize();
            const dashesPerBond = 4;

            for (let line = 0; line < bondLinesCount; line++) {
                const lineOffset = perpendicular.clone().multiplyScalar(bondLineSpacing[line]);
                const startPt = tip1.clone().add(lineOffset);
                const endPt = tip2.clone().add(lineOffset);

                // Subtle electrostatic H-bond glow cylinder connecting donor and acceptor
                const glowTube = new THREE.Mesh(geos.hbondGlowCylGeo, materials.hbondGlowTube);
                glowTube.position.copy(startPt).add(endPt).multiplyScalar(0.5);
                glowTube.scale.set(1, gapLen, 1);
                glowTube.quaternion.setFromUnitVectors(upAxis, gapDir);
                bioBond.add(glowTube);

                // Segmented hydrogen bond capsules
                for (let d = 0; d < dashesPerBond; d++) {
                    const fraction = (d + 0.5) / dashesPerBond;
                    const dashPos = new THREE.Vector3().addVectors(startPt, gapVector.clone().multiplyScalar(fraction));
                    const dashMesh = new THREE.Mesh(geos.hbondDashGeo, materials.hbondDot);
                    dashMesh.position.copy(dashPos);
                    dashMesh.quaternion.setFromUnitVectors(upAxis, gapDir);
                    bioBond.add(dashMesh);
                }
            }

            bioBond.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    child.userData = {
                        type: 'hbond', parentGroup: bondContainer,
                        initialPos: bondContainer.position.clone(), pairIndex: i
                    };
                    allInteractiveMeshesRef.current.push(child as THREE.Mesh);
                }
            });
            baseMeshesRef.current.hbond.push(bondContainer);

            // =================================================================
            // B. GENETIC CONDITIONS (Methylation 5-mC, Thymine Dimer, Intercalator)
            // =================================================================
            if (condition === 'methylation') {
                const addMethylGroup = (parentBioBase: THREE.Group, isPurine: boolean, strandSign: number) => {
                    if (isPurine) return;
                    const mGroup = new THREE.Group();
                    const mC = new THREE.Mesh(geos.methylGroupShape, conditionMaterials.methylCarbon);
                    mGroup.add(mC);
                    const hOffsets = [
                        new THREE.Vector3(0.22, 0.22, 0.18),
                        new THREE.Vector3(-0.22, 0.22, 0.18),
                        new THREE.Vector3(0, -0.26, 0.22)
                    ];
                    hOffsets.forEach(pos => {
                        const mH = new THREE.Mesh(geos.methylHydrogenShape, materials.cpk.H);
                        mH.position.copy(pos);
                        mGroup.add(mH);
                    });
                    // Positioned on C5 of Cytosine protruding into the Major Groove
                    mGroup.position.set(-1.14 * strandSign, 0.15, 2.56);
                    mGroup.traverse(child => {
                        if ((child as THREE.Mesh).isMesh) {
                            child.userData = { type: 'methylation', parentGroup: parentBioBase };
                            allInteractiveMeshesRef.current.push(child as THREE.Mesh);
                        }
                    });
                    parentBioBase.add(mGroup);
                    baseMeshesRef.current.methylation.push(mGroup);
                };

                if (b1Type === 'C') addMethylGroup(bioBase1, isPurine1, 1);
                if (b2Type === 'C') addMethylGroup(bioBase2, isPurine2, -1);
                if (i === midIdx && b1Type !== 'C' && b2Type !== 'C') {
                    addMethylGroup(bioBase1, false, 1);
                }
            }

            if (condition === 'thymine_dimer' && i === midIdx) {
                const dimerGroup = new THREE.Group();
                const bridgeMesh1 = new THREE.Mesh(geos.dimerCylinderGeo, conditionMaterials.dimerBridge);
                bridgeMesh1.position.set(-0.6, -conf.heightStep * 0.5, 2.15);
                dimerGroup.add(bridgeMesh1);

                const bridgeMesh2 = new THREE.Mesh(geos.dimerCylinderGeo, conditionMaterials.dimerBridge);
                bridgeMesh2.position.set(-0.6, -conf.heightStep * 0.5, 2.55);
                dimerGroup.add(bridgeMesh2);

                dimerGroup.traverse(child => {
                    if ((child as THREE.Mesh).isMesh) {
                        child.userData = { type: 'thymine_dimer', parentGroup: bioBase1 };
                        allInteractiveMeshesRef.current.push(child as THREE.Mesh);
                    }
                });
                bioBase1.add(dimerGroup);
                baseMeshesRef.current.thymine_dimer.push(dimerGroup);
            }

            if (condition === 'intercalation' && i === midIdx) {
                const drugMesh = new THREE.Mesh(geos.intercalatorGeo, conditionMaterials.intercalatorPlate);
                drugMesh.position.set(0, -stepY * 0.5, 0);
                drugMesh.rotation.x = Math.PI / 2;
                drugMesh.rotation.z = theta1;
                drugMesh.userData = { type: 'intercalator', parentGroup: pairContainer };
                pairContainer.add(drugMesh);
                allInteractiveMeshesRef.current.push(drugMesh);
                baseMeshesRef.current.intercalator.push(drugMesh);
            }

            // =================================================================
            // C. ATOMIC CPK & BALL-AND-STICK MODES
            // =================================================================
            const createAtomCluster = (strand: number, isPurine: boolean, originPos: THREE.Vector3, lookCenter: THREE.Vector3, targetSContainer: THREE.Group) => {
                const cpkSub = new THREE.Group();
                const bsSub = new THREE.Group();

                const atoms = [
                    { el: 'P', pos: new THREE.Vector3(0, 0.36, -0.32) },
                    { el: 'O', pos: new THREE.Vector3(0.38, 0.58, -0.58) },
                    { el: 'O', pos: new THREE.Vector3(-0.38, 0.58, -0.58) },
                    { el: 'O', pos: new THREE.Vector3(0.14, 0.10, -0.05) },
                    { el: 'C', pos: new THREE.Vector3(0.22, 0.04, 0.14) },
                    { el: 'C', pos: new THREE.Vector3(0.24, -0.04, 0.36) },
                    { el: 'O', pos: new THREE.Vector3(-0.22, 0.0, 0.62) },
                    { el: 'C', pos: new THREE.Vector3(0.56, -0.08, 0.52) },
                    { el: 'C', pos: new THREE.Vector3(0.42, 0.14, 0.92) },
                    { el: 'C', pos: new THREE.Vector3(-0.12, 0.0, 1.05) }
                ];

                if (isPurine) {
                    const pOffsets = [
                        { el: 'N', x: 0.0, z: 1.48 },
                        { el: 'C', x: -0.58, z: 1.84 },
                        { el: 'N', x: -0.36, z: 2.46 },
                        { el: 'C', x: 0.34, z: 2.46 },
                        { el: 'C', x: 0.54, z: 1.84 },
                        { el: 'C', x: -0.06, z: 3.10 },
                        { el: 'N', x: 0.42, z: 3.60 },
                        { el: 'C', x: 1.14, z: 3.44 },
                        { el: 'N', x: 1.22, z: 2.76 }
                    ];
                    pOffsets.forEach(p => atoms.push({ el: p.el, pos: new THREE.Vector3(p.x, 0, p.z) }));
                } else {
                    const pyrOffsets = [
                        { el: 'N', x: 0.0, z: 1.48 },
                        { el: 'C', x: -0.60, z: 1.84 },
                        { el: 'C', x: -0.60, z: 2.56 },
                        { el: 'C', x: 0.0, z: 2.94 },
                        { el: 'N', x: 0.60, z: 2.56 },
                        { el: 'C', x: 0.60, z: 1.84 }
                    ];
                    pyrOffsets.forEach(p => atoms.push({ el: p.el, pos: new THREE.Vector3(p.x, 0, p.z) }));
                }

                atoms.forEach(a => {
                    const cpkMesh = new THREE.Mesh(geos.cpkAtomGeos[a.el], materials.cpk[a.el]);
                    cpkMesh.position.copy(a.pos);
                    cpkMesh.userData = { type: a.el === 'P' ? 'P_atom' : a.el === 'N' ? 'N_atom' : a.el === 'O' ? 'O_atom' : 'C_atom', strand, parentGroup: targetSContainer };
                    cpkSub.add(cpkMesh);
                    allInteractiveMeshesRef.current.push(cpkMesh);

                    const bsMesh = new THREE.Mesh(geos.ballStickSmallSphere, materials.cpk[a.el]);
                    bsMesh.position.copy(a.pos);
                    bsMesh.userData = { type: a.el === 'P' ? 'P_atom' : a.el === 'N' ? 'N_atom' : a.el === 'O' ? 'O_atom' : 'C_atom', strand, parentGroup: targetSContainer };
                    bsSub.add(bsMesh);
                    allInteractiveMeshesRef.current.push(bsMesh);
                });

                for (let b = 0; b < atoms.length; b++) {
                    for (let c = b + 1; c < atoms.length; c++) {
                        const pA = atoms[b].pos;
                        const pB = atoms[c].pos;
                        const dist = pA.distanceTo(pB);
                        if (dist > 0.2 && dist < 0.85) {
                            const bondMesh = new THREE.Mesh(geos.ballStickBondCyl, materials.cpk.bond);
                            bondMesh.position.copy(new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5));
                            bondMesh.scale.set(1, dist, 1);
                            bondMesh.quaternion.setFromUnitVectors(upAxis, new THREE.Vector3().subVectors(pB, pA).normalize());
                            bsSub.add(bondMesh);
                        }
                    }
                }

                cpkSub.position.copy(originPos);
                cpkSub.lookAt(lookCenter);
                bsSub.position.copy(originPos);
                bsSub.lookAt(lookCenter);

                targetSContainer.add(cpkSub);
                targetSContainer.add(bsSub);

                cpkSub.visible = false;
                bsSub.visible = false;

                cpkObjectsRef.current.push(cpkSub);
                ballStickObjectsRef.current.push(bsSub);
            };

            createAtomCluster(1, isPurine1, p1Local, centerLocal, s1Container);
            createAtomCluster(2, isPurine2, p2Local, centerLocal, s2Container);

            // CPK & Ball & Stick Hydrogen Bonds
            const cpkHBridge = new THREE.Group();
            const bsHBridge = new THREE.Group();
            bondContainer.add(cpkHBridge);
            bondContainer.add(bsHBridge);

            cpkHBridge.visible = false;
            bsHBridge.visible = false;
            cpkObjectsRef.current.push(cpkHBridge);
            ballStickObjectsRef.current.push(bsHBridge);

            for (let line = 0; line < bondLinesCount; line++) {
                const lineOffset = perpendicular.clone().multiplyScalar(bondLineSpacing[line]);
                for (let d = 0; d < dashesPerBond; d++) {
                    const fraction = (d + 0.5) / dashesPerBond;
                    const dotPos = new THREE.Vector3().addVectors(tip1, gapVector.clone().multiplyScalar(fraction)).add(lineOffset);
                    const cpkH = new THREE.Mesh(geos.cpkAtomGeos.H, materials.cpk.H);
                    cpkH.position.copy(dotPos);
                    cpkH.userData = { type: 'hbond', parentGroup: bondContainer };
                    cpkHBridge.add(cpkH);
                    allInteractiveMeshesRef.current.push(cpkH);

                    const bsH = new THREE.Mesh(geos.ballStickSmallSphere, materials.cpk.H);
                    bsH.position.copy(dotPos);
                    bsH.userData = { type: 'hbond', parentGroup: bondContainer };
                    bsHBridge.add(bsH);
                    allInteractiveMeshesRef.current.push(bsH);
                }
            }

            // =================================================================
            // D. COULOMBIC ELECTROSTATIC SURFACE
            // =================================================================
            const electroBase1 = new THREE.Group();
            const electroBase2 = new THREE.Group();
            s1Container.add(electroBase1);
            s2Container.add(electroBase2);
            electroObjectsRef.current.push(electroBase1, electroBase2);

            const plateGeo1 = isPurine1 ? geos.purineGeo : geos.pyrimidineGeo;
            const ePlate1 = new THREE.Mesh(plateGeo1, electroMaterials.baseNeutral);
            ePlate1.position.set(0, 0, 1.48);
            ePlate1.rotation.x = conf.tilt;
            electroBase1.add(ePlate1);

            const ePhos1 = new THREE.Mesh(geos.cpkAtomGeos.P, electroMaterials.backbone);
            ePhos1.position.set(0, 0.36, -0.32);
            electroBase1.add(ePhos1);

            electroBase1.position.copy(p1Local);
            electroBase1.lookAt(centerLocal);

            const plateGeo2 = isPurine2 ? geos.purineGeo : geos.pyrimidineGeo;
            const ePlate2 = new THREE.Mesh(plateGeo2, electroMaterials.baseNeutral);
            ePlate2.position.set(0, 0, 1.48);
            ePlate2.rotation.x = -conf.tilt;
            electroBase2.add(ePlate2);

            const ePhos2 = new THREE.Mesh(geos.cpkAtomGeos.P, electroMaterials.backbone);
            ePhos2.position.set(0, -0.36, -0.32);
            electroBase2.add(ePhos2);

            electroBase2.position.copy(p2Local);
            electroBase2.lookAt(centerLocal);

            electroBase1.visible = false;
            electroBase2.visible = false;

            strand1MeshesRef.current.push(s1Container);
            strand2MeshesRef.current.push(s2Container);

            // Annotation Targets
            if (i === Math.floor(NUM_PAIRS / 2)) {
                annotationTargetsRef.current.cgPair.copy(center);
                annotationTargetsRef.current.backbone.copy(pos2);
                annotationTargetsRef.current.metricDiameter1.copy(pos1);
                annotationTargetsRef.current.metricDiameter2.copy(pos2);
            }
            if (i === Math.floor(NUM_PAIRS / 2) + 1) {
                annotationTargetsRef.current.atPair.copy(center);
                annotationTargetsRef.current.metricRise1.copy(pos1);
            }
            if (i === Math.floor(NUM_PAIRS / 2) + 2) {
                annotationTargetsRef.current.metricRise2.copy(pos1);
            }
            if (i === Math.max(0, Math.floor(NUM_PAIRS / 3))) {
                annotationTargetsRef.current.majorGroove.copy(center);
                annotationTargetsRef.current.metricPitch1.copy(pos1);
            }
            if (i === Math.min(NUM_PAIRS - 1, Math.floor(NUM_PAIRS * 0.7))) {
                annotationTargetsRef.current.minorGroove.copy(center);
                annotationTargetsRef.current.metricPitch2.copy(pos1);
            }
            if (i === 0) {
                annotationTargetsRef.current.strand1Top.copy(pos1);
                annotationTargetsRef.current.strand2Top.copy(pos2);
            }
            if (i === NUM_PAIRS - 1) {
                annotationTargetsRef.current.strand1Bottom.copy(pos1);
                annotationTargetsRef.current.strand2Bottom.copy(pos2);
            }
        }

        // Sculpted Double-Track Helical Backbone Ribbons (Sleek radius 0.26 + 0.11 edge rail so sugars & PO4 are visible)
        const curve1 = new THREE.CatmullRomCurve3(splinePointsStrand1);
        const tube1Geo = new THREE.TubeGeometry(curve1, 240, 0.26, 18, false);
        const ribbon1 = new THREE.Mesh(tube1Geo, materials.backbone);
        ribbon1.userData = { type: 'backbone', strand: 1, initialPos: new THREE.Vector3(0, 0, 0) };
        dnaGroup.add(ribbon1);
        allInteractiveMeshesRef.current.push(ribbon1);
        strand1MeshesRef.current.push(ribbon1);
        baseMeshesRef.current.backbone.push(ribbon1);
        ribbon1Ref.current = ribbon1;

        const railCurve1 = new THREE.CatmullRomCurve3(splinePointsRail1);
        const rail1Geo = new THREE.TubeGeometry(railCurve1, 240, 0.095, 12, false);
        const ribbon1Rail = new THREE.Mesh(rail1Geo, materials.backboneRail);
        ribbon1Rail.userData = { type: 'backbone', strand: 1, initialPos: new THREE.Vector3(0, 0, 0) };
        dnaGroup.add(ribbon1Rail);
        allInteractiveMeshesRef.current.push(ribbon1Rail);
        strand1MeshesRef.current.push(ribbon1Rail);
        baseMeshesRef.current.backbone.push(ribbon1Rail);
        ribbon1RailRef.current = ribbon1Rail;

        const curve2 = new THREE.CatmullRomCurve3(splinePointsStrand2);
        const tube2Geo = new THREE.TubeGeometry(curve2, 240, 0.26, 18, false);
        const ribbon2 = new THREE.Mesh(tube2Geo, materials.backbone);
        ribbon2.userData = { type: 'backbone', strand: 2, initialPos: new THREE.Vector3(0, 0, 0) };
        dnaGroup.add(ribbon2);
        allInteractiveMeshesRef.current.push(ribbon2);
        strand2MeshesRef.current.push(ribbon2);
        baseMeshesRef.current.backbone.push(ribbon2);
        ribbon2Ref.current = ribbon2;

        const railCurve2 = new THREE.CatmullRomCurve3(splinePointsRail2);
        const rail2Geo = new THREE.TubeGeometry(railCurve2, 240, 0.095, 12, false);
        const ribbon2Rail = new THREE.Mesh(rail2Geo, materials.backboneRail);
        ribbon2Rail.userData = { type: 'backbone', strand: 2, initialPos: new THREE.Vector3(0, 0, 0) };
        dnaGroup.add(ribbon2Rail);
        allInteractiveMeshesRef.current.push(ribbon2Rail);
        strand2MeshesRef.current.push(ribbon2Rail);
        baseMeshesRef.current.backbone.push(ribbon2Rail);
        ribbon2RailRef.current = ribbon2Rail;

        // Counterions (Mg²⁺) & Hydration Spine (H₂O)
        for (let i = 0; i < NUM_PAIRS; i += 2) {
            const p1 = splinePointsStrand1[i];
            const p2 = splinePointsStrand2[i];

            const mg1 = new THREE.Mesh(geos.mgIonGeo, conditionMaterials.ionMg);
            mg1.position.copy(p1).multiplyScalar(1.22);
            mg1.userData = { type: 'ion_mg', parentGroup: ionGroup };
            ionGroup.add(mg1);
            allInteractiveMeshesRef.current.push(mg1);
            baseMeshesRef.current.ion_mg.push(mg1);

            const mg2 = new THREE.Mesh(geos.mgIonGeo, conditionMaterials.ionMg);
            mg2.position.copy(p2).multiplyScalar(1.22);
            mg2.userData = { type: 'ion_mg', parentGroup: ionGroup };
            ionGroup.add(mg2);
            allInteractiveMeshesRef.current.push(mg2);
            baseMeshesRef.current.ion_mg.push(mg2);

            const waterMol = new THREE.Group();
            const wO = new THREE.Mesh(geos.waterOGeo, conditionMaterials.waterO);
            const wH1 = new THREE.Mesh(geos.methylHydrogenShape, materials.cpk.H);
            const wH2 = new THREE.Mesh(geos.methylHydrogenShape, materials.cpk.H);
            wH1.position.set(0.14, 0.12, 0);
            wH2.position.set(-0.14, 0.12, 0);
            waterMol.add(wO, wH1, wH2);

            const minorMid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.38);
            waterMol.position.copy(minorMid);
            waterMol.userData = { type: 'water_hydration', parentGroup: ionGroup };
            ionGroup.add(waterMol);
            wO.userData = { type: 'water_hydration', parentGroup: ionGroup };
            allInteractiveMeshesRef.current.push(wO);
            baseMeshesRef.current.water_hydration.push(waterMol);
        }

        ionGroup.visible = showIons;

        // Apply visual render mode
        applyRenderMode(renderMode);
        applyFilter(activeFilter);
    }, [conformation, condition, sequence]);

    // Auto-Focus Camera on Selected Molecular Component (from InspectorPanel or 3D Click)
    useEffect(() => {
        const cam = customCamRef.current;
        const dnaGroup = dnaGroupRef.current;
        if (!cam || !dnaGroup) return;

        if (!selectedComponentKey) {
            if (focusedTargetRef.current) {
                focusedTargetRef.current = null;
                cam.panTarget.set(0, 0, 0);
                const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
                const defaultPose = getDefaultCameraPose(aspect);
                cam.sphericalTarget.radius = defaultPose.position.length();
            }
            return;
        }

        dnaGroup.updateMatrixWorld(true);

        let targetObj: THREE.Object3D | null = null;
        let wasDirect3dClick = false;

        // 1. If the user just clicked a specific 3D mesh directly, focus on that exact clicked instance
        if (
            last3dClickedRef.current &&
            last3dClickedRef.current.type === selectedComponentKey &&
            performance.now() - last3dClickedRef.current.time < 350 &&
            last3dClickedRef.current.object.parent
        ) {
            targetObj = last3dClickedRef.current.object;
            wasDirect3dClick = true;
            last3dClickedRef.current = null;
        } else {
            // 2. Selected via InspectorPanel: gather candidate 3D objects for this component key
            let candidates: THREE.Object3D[] = [];
            if (selectedComponentKey === 'backbone' && backboneFocusNodesRef.current.length > 0) {
                candidates = backboneFocusNodesRef.current;
            } else if (baseMeshesRef.current[selectedComponentKey] && baseMeshesRef.current[selectedComponentKey].length > 0) {
                candidates = baseMeshesRef.current[selectedComponentKey];
            } else {
                candidates = allInteractiveMeshesRef.current.filter(
                    m => m && m.userData && m.userData.type === selectedComponentKey
                );
            }

            if (candidates.length > 0) {
                // Rank candidates by proximity to the vertical center (y = 0) of the DNA helix
                const scored = candidates
                    .filter(obj => !!obj && !!obj.parent)
                    .map(obj => {
                        const b = new THREE.Box3().setFromObject(obj);
                        const center = new THREE.Vector3();
                        if (!b.isEmpty()) {
                            b.getCenter(center);
                        } else {
                            obj.getWorldPosition(center);
                        }
                        return { obj, center, distFromMidY: Math.abs(center.y) };
                    })
                    .sort((a, b) => a.distFromMidY - b.distFromMidY);

                if (scored.length > 0) {
                    const poolSize = Math.min(scored.length, 4);
                    if (focusCycleIndexRef.current.type === selectedComponentKey) {
                        focusCycleIndexRef.current.index = (focusCycleIndexRef.current.index + 1) % poolSize;
                    } else {
                        focusCycleIndexRef.current = { type: selectedComponentKey, index: 0 };
                    }
                    targetObj = scored[focusCycleIndexRef.current.index].obj;
                }
            }
        }

        if (!targetObj) return;

        // Compute world-space bounding box centroid of the target molecular component
        const box = new THREE.Box3().setFromObject(targetObj);
        const worldCenter = new THREE.Vector3();
        if (!box.isEmpty()) {
            box.getCenter(worldCenter);
        } else {
            targetObj.getWorldPosition(worldCenter);
        }

        const localCenter = targetObj.worldToLocal(worldCenter.clone());
        focusedTargetRef.current = {
            object: targetObj,
            localCenter,
            type: selectedComponentKey
        };

        // Smoothly pan camera focal point to center on the component
        const lim = cam.panLimit;
        cam.panTarget.set(
            THREE.MathUtils.clamp(worldCenter.x, -lim, lim),
            THREE.MathUtils.clamp(worldCenter.y, -lim, lim),
            THREE.MathUtils.clamp(worldCenter.z, -lim, lim)
        );

        // Compute outward radial vector from the DNA central axis at the component's height
        const localInDna = dnaGroup.worldToLocal(worldCenter.clone());
        const axisWorld = dnaGroup.localToWorld(new THREE.Vector3(0, localInDna.y, 0));
        const radialVec = new THREE.Vector3().subVectors(worldCenter, axisWorld);
        const radialDistXZ = Math.hypot(radialVec.x, radialVec.z);

        let targetTheta = cam.sphericalCurrent.theta;
        if (radialDistXZ > 0.35) {
            // Orient camera to face the component from the exterior with a 14° 3/4 stereo perspective
            targetTheta = Math.atan2(radialVec.x, radialVec.z) + 0.24;
        }

        // Normalize current theta to take the shortest angular path to targetTheta
        const twoPi = Math.PI * 2;
        const diffTheta = ((targetTheta - cam.sphericalCurrent.theta + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
        cam.sphericalCurrent.theta = targetTheta - diffTheta;
        cam.sphericalTarget.theta = targetTheta;

        // Set comfortable viewing elevation angle
        cam.sphericalTarget.phi = THREE.MathUtils.clamp(
            Math.PI * 0.44,
            cam.minPolarAngle,
            cam.maxPolarAngle
        );

        // Set optimal macro inspection distance tailored to the component scale
        const macroRadiusByType: Record<string, number> = {
            A: 20.5,
            T: 20.5,
            G: 20.5,
            C: 20.5,
            backbone: 22.0,
            hbond: 18.0,
            methylation: 17.5,
            thymine_dimer: 18.5,
            intercalator: 19.5,
            ion_mg: 18.5,
            water_hydration: 18.0
        };
        const desiredRadius = macroRadiusByType[selectedComponentKey] || 20.5;
        cam.sphericalTarget.radius = THREE.MathUtils.clamp(
            desiredRadius,
            cam.minDistance,
            cam.maxDistance
        );

        // Trigger visual discovery pulse when selected via InspectorPanel
        if (!wasDirect3dClick) {
            bloomPulseBoostRef.current = 0.22;
            const pulseTarget = (targetObj.userData && targetObj.userData.parentGroup) ? targetObj.userData.parentGroup : targetObj;
            const origScale = pulseTarget.scale.clone();
            animateVector(pulseTarget.scale, origScale.clone().multiplyScalar(1.24), 220, easeOutBack);
            setTimeout(() => animateVector(pulseTarget.scale, origScale, 320, easeInOutCubic), 240);
        }
    }, [selectedComponentKey, focusComponentTrigger, conformation, condition, sequence]);

    // Handle Render Mode switches
    const applyRenderMode = (mode: RenderModeType) => {
        const isBio = (mode === 'bio');
        const isCpk = (mode === 'cpk');
        const isBs = (mode === 'ballstick');
        const isElectro = (mode === 'electrostatic');

        bioObjectsRef.current.forEach(obj => { obj.visible = isBio; });
        cpkObjectsRef.current.forEach(obj => { obj.visible = isCpk; });
        ballStickObjectsRef.current.forEach(obj => { obj.visible = isBs; });
        electroObjectsRef.current.forEach(obj => { obj.visible = isElectro; });

        if (ribbon1Ref.current && ribbon2Ref.current) {
            ribbon1Ref.current.visible = (isBio || isElectro);
            ribbon2Ref.current.visible = (isBio || isElectro);
            if (isElectro && electroMaterialsRef.current) {
                ribbon1Ref.current.material = electroMaterialsRef.current.backbone;
                ribbon2Ref.current.material = electroMaterialsRef.current.backbone;
            } else if (materialsRef.current) {
                ribbon1Ref.current.material = materialsRef.current.backbone;
                ribbon2Ref.current.material = materialsRef.current.backbone;
            }
        }
        if (ribbon1RailRef.current && ribbon2RailRef.current) {
            ribbon1RailRef.current.visible = isBio;
            ribbon2RailRef.current.visible = isBio;
        }
    };

    useEffect(() => {
        applyRenderMode(renderMode);
    }, [renderMode]);

    // Handle Component Isolation filter
    const applyFilter = (filter: FilterComponentType) => {
        allInteractiveMeshesRef.current.forEach(mesh => {
            if (!mesh || !mesh.userData) return;
            const type = mesh.userData.type;
            const show = (filter === 'all' || type === filter || (filter === 'backbone' && (type === 'backbone' || type === 'P_atom')));
            if (mesh.material && (mesh.material as THREE.Material).transparent !== undefined) {
                const mat = mesh.material as THREE.MeshPhysicalMaterial;
                // Preserve inherent translucency of aromatic ring fills when visible
                const isRingFill = (mat === materialsRef.current?.ringFill?.A || mat === materialsRef.current?.ringFill?.T || mat === materialsRef.current?.ringFill?.G || mat === materialsRef.current?.ringFill?.C || mat === materialsRef.current?.ringFill?.sugar);
                const isGlowTube = (mat === materialsRef.current?.hbondGlowTube);
                if (isRingFill) {
                    mat.opacity = show ? 0.60 : 0.06;
                } else if (isGlowTube) {
                    mat.opacity = show ? 0.22 : 0.03;
                } else {
                    mat.transparent = !show;
                    mat.opacity = show ? 1.0 : 0.12;
                }
            }
        });
    };

    useEffect(() => {
        applyFilter(activeFilter);
    }, [activeFilter]);

    // Handle showIons toggle
    useEffect(() => {
        if (ionGroupRef.current) {
            ionGroupRef.current.visible = showIons;
        }
    }, [showIons]);

    // Helper LERP animation
    const animateVector = (target: THREE.Vector3, dest: THREE.Vector3, durationMs = 1200, easing: (t: number) => number = easeInOutCubic) => {
        const start = target.clone();
        const startTime = performance.now();
        const tween = {
            update: (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / durationMs, 1.0);
                target.lerpVectors(start, dest, easing(progress));
                return progress >= 1.0;
            }
        };
        activeTweensRef.current.push(tween);
    };

    function easeInOutCubic(t: number) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function easeOutBack(t: number) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    // Handle Assembly Mode (assembled, unzipped, exploded)
    useEffect(() => {
        if (assemblyMode === 'unzipped') {
            const LATERAL_OFFSET = 12.0;
            strand1MeshesRef.current.forEach(mesh => {
                const dest = (mesh.userData && mesh.userData.initialPos) ? mesh.userData.initialPos.clone() : mesh.position.clone();
                dest.x -= LATERAL_OFFSET;
                animateVector(mesh.position, dest, 1400);
            });
            strand2MeshesRef.current.forEach(mesh => {
                const dest = (mesh.userData && mesh.userData.initialPos) ? mesh.userData.initialPos.clone() : mesh.position.clone();
                dest.x += LATERAL_OFFSET;
                animateVector(mesh.position, dest, 1400);
            });
            baseMeshesRef.current.hbond.forEach(mesh => {
                animateVector(mesh.scale, new THREE.Vector3(0.001, 0.001, 0.001), 600);
            });
        } else if (assemblyMode === 'exploded') {
            allInteractiveMeshesRef.current.forEach(item => {
                const target = item.userData.parentGroup || item;
                const initial = item.userData.initialPos || target.position;
                const type = item.userData.type;
                const strand = item.userData.strand;
                const dest = initial.clone();
                if (type === 'backbone' || type === 'P_atom') { dest.x *= 2.4; dest.z *= 2.4; }
                else if (type === 'A') { dest.x -= 10; dest.z += (strand === 1 ? 4 : -4); }
                else if (type === 'T') { dest.x += 10; dest.z += (strand === 1 ? 4 : -4); }
                else if (type === 'G') { dest.x -= 13; dest.y *= 1.2; }
                else if (type === 'C') { dest.x += 13; dest.y *= 1.2; }
                else if (type === 'hbond') { dest.y *= 1.15; }
                else { dest.x += (strand === 1 ? -8 : 8); }
                animateVector(target.position, dest, 1400, easeOutBack);
            });
            baseMeshesRef.current.hbond.forEach(mesh => {
                animateVector(mesh.scale, new THREE.Vector3(1, 1, 1), 600);
            });
        } else {
            // assembled
            allInteractiveMeshesRef.current.forEach(item => {
                const target = item.userData.parentGroup || item;
                const initial = item.userData.initialPos || new THREE.Vector3(0, 0, 0);
                animateVector(target.position, initial, 1300, easeInOutCubic);
            });
            strand1MeshesRef.current.forEach(m => {
                if (m.userData && m.userData.initialPos) animateVector(m.position, m.userData.initialPos, 1300, easeInOutCubic);
                else animateVector(m.position, new THREE.Vector3(0, 0, 0), 1300, easeInOutCubic);
            });
            strand2MeshesRef.current.forEach(m => {
                if (m.userData && m.userData.initialPos) animateVector(m.position, m.userData.initialPos, 1300, easeInOutCubic);
                else animateVector(m.position, new THREE.Vector3(0, 0, 0), 1300, easeInOutCubic);
            });
            baseMeshesRef.current.hbond.forEach(mesh => {
                animateVector(mesh.scale, new THREE.Vector3(1, 1, 1), 800);
            });
        }
    }, [assemblyMode]);

    // Raycasting for Interaction (Click & Touch)
    useEffect(() => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let pointerDownX = 0;
        let pointerDownY = 0;
        let pointerDownTime = 0;
        let lastHandledTime = 0;

        const isUiElement = (target: any) => {
            if (!target || !target.closest) return false;
            return !!target.closest('#controls-panel, #app-header, #inspector-panel, #mobile-dock, #modal-backdrop, #interaction-hint, #tutorial-modal, #vr-hud-overlay');
        };

        const performRaycast = (clientX: number, clientY: number) => {
            const now = performance.now();
            if (now - lastHandledTime < 250) return false;
            lastHandledTime = now;

            if (!rendererRef.current || !cameraRef.current || !dnaGroupRef.current) return false;
            const rect = rendererRef.current.domElement.getBoundingClientRect();
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, cameraRef.current);

            // Filter active visible meshes
            const activeMeshes: THREE.Mesh[] = [];
            dnaGroupRef.current.traverse(child => {
                if ((child as THREE.Mesh).isMesh && child.userData && child.userData.type) {
                    let isParentVisible = true;
                    let p: THREE.Object3D | null = child;
                    while (p && p !== dnaGroupRef.current) {
                        if (p.visible === false) {
                            isParentVisible = false;
                            break;
                        }
                        p = p.parent;
                    }
                    if (isParentVisible) activeMeshes.push(child as THREE.Mesh);
                }
            });

            const intersects = raycaster.intersectObjects(activeMeshes, false);
            if (intersects.length > 0) {
                const clicked = intersects[0].object;
                const type = clicked.userData.type;
                if (type) {
                    const tg = clicked.userData.parentGroup || clicked;
                    last3dClickedRef.current = { type, object: tg, time: performance.now() };
                    onSelectComponent(type);
                    bloomPulseBoostRef.current = 0.20;
                    const origScale = tg.scale.clone();
                    animateVector(tg.scale, origScale.clone().multiplyScalar(1.25), 200, easeOutBack);
                    setTimeout(() => animateVector(tg.scale, origScale, 300, easeInOutCubic), 220);
                    return true;
                }
            }
            return false;
        };

        const onPointerDown = (e: PointerEvent) => {
            if (isUiElement(e.target)) return;
            pointerDownX = e.clientX;
            pointerDownY = e.clientY;
            pointerDownTime = performance.now();
        };

        const onPointerUp = (e: PointerEvent) => {
            if (isUiElement(e.target)) return;
            const moveDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
            const timeElapsed = performance.now() - pointerDownTime;
            if (moveDist < 18 && timeElapsed < 450) {
                performRaycast(e.clientX, e.clientY);
            }
        };

        window.addEventListener('pointerdown', onPointerDown, { passive: true });
        window.addEventListener('pointerup', onPointerUp, { passive: true });

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [onSelectComponent]);

    return <div id="canvas-container" ref={mountRef} />;
};

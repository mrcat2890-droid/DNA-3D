import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
    ConformationType,
    RenderModeType,
    MolecularConditionType,
    AssemblyModeType,
    FilterComponentType,
    CameraControlMode,
    CameraStepCommand,
    WebXrSupportStatus,
    VrPointerTelemetry,
    VrLocomotionMode,
    VrGameTelemetry,
    XrRuntimeProfile,
    XrHandGestureState
} from '../types/dna';
import { CONFORMATIONS, DNA_DATA, calculateSequenceStats } from '../data/dnaData';
import { vrSound, triggerUniversalXrHaptics } from '../utils/vrAudio';

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
    dofEnabled?: boolean;
    dofAperture?: number;
    envReflectionIntensity?: number;
    snapshotTrigger?: number;
    onSnapshotCaptured?: (dataUrl: string) => void;
    cameraControlMode: CameraControlMode;
    cameraStepCommand: CameraStepCommand | null;
    isVrModeActive: boolean;
    isStereoLensMode: boolean;
    vrLocomotionMode?: VrLocomotionMode;
    isVrGameActive?: boolean;
    isVrAudioMuted?: boolean;
    onVrModeChange: (active: boolean) => void;
    onToggleVrGame?: () => void;
    onWebXrSupportDetected: (status: WebXrSupportStatus) => void;
    onUpdateVrPerformance?: (metrics: { latencyMs: number; fps: number }) => void;
    onUpdateVrPointer?: (pointer: VrPointerTelemetry) => void;
    onUpdateVrGameTelemetry?: (telemetry: VrGameTelemetry) => void;
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
    dofEnabled = true,
    dofAperture = 0.00018,
    envReflectionIntensity = 1.35,
    snapshotTrigger = 0,
    onSnapshotCaptured,
    cameraControlMode,
    cameraStepCommand,
    isVrModeActive,
    isStereoLensMode,
    vrLocomotionMode = 'snap',
    isVrGameActive = false,
    isVrAudioMuted = false,
    onVrModeChange,
    onToggleVrGame,
    onWebXrSupportDetected,
    onUpdateVrPerformance,
    onUpdateVrPointer,
    onUpdateVrGameTelemetry,
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
    const bokehPassRef = useRef<BokehPass | null>(null);
    const bloomPulseBoostRef = useRef<number>(0);
    const customCamRef = useRef<CustomCameraController | null>(null);
    const dnaGroupRef = useRef<THREE.Group | null>(null);
    const ionGroupRef = useRef<THREE.Group | null>(null);
    const vrEnvGroupRef = useRef<THREE.Group | null>(null);
    const vrRigGroupRef = useRef<THREE.Group | null>(null);
    const vrGameBeaconRef = useRef<THREE.Group | null>(null);
    const vrFloatingCardUpdaterRef = useRef<((compKey: string | null, hoveredKey: string | null, dwellPct: number) => void) | null>(null);
    const vrComponentSelectTriggerRef = useRef<((hitObj: THREE.Object3D) => void) | null>(null);
    const xrSessionRef = useRef<any>(null);
    const webXrNativeSupportedRef = useRef<boolean>(false);
    const webXrSupportedModeRef = useRef<'immersive-vr' | 'immersive-ar'>('immersive-vr');

    // Interactive VR Game State (Misi Perbaikan Heliks CRISPR)
    const vrGameStateRef = useRef<VrGameTelemetry>({
        active: false,
        score: 0,
        combo: 1,
        repairedCount: 0,
        timeRemainingSec: 60,
        targetPairIndex: 10,
        targetBaseType: 'A',
        complementBaseType: 'T',
        lesionLabel: 'Mismatch Watson-Crick',
        lastEventLabel: null
    });

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
        dofEnabled,
        dofAperture,
        envReflectionIntensity,
        selectedComponentKey,
        cameraControlMode,
        isVrModeActive,
        isStereoLensMode,
        vrLocomotionMode,
        isVrGameActive,
        isVrAudioMuted
    });

    useEffect(() => {
        vrSound.setMuted(isVrAudioMuted);
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
            dofEnabled,
            dofAperture,
            envReflectionIntensity,
            selectedComponentKey,
            cameraControlMode,
            isVrModeActive,
            isStereoLensMode,
            vrLocomotionMode,
            isVrGameActive,
            isVrAudioMuted
        };
        if (bloomPassRef.current) {
            bloomPassRef.current.enabled = bloomEnabled;
            bloomPassRef.current.strength = bloomStrength + bloomPulseBoostRef.current;
            bloomPassRef.current.threshold = bloomThreshold;
        }
        if (bokehPassRef.current) {
            bokehPassRef.current.enabled = dofEnabled;
        }
        // Synchronize RoomEnvironment PBR reflection intensity across scene & materials
        if (sceneRef.current) {
            (sceneRef.current as any).environmentIntensity = envReflectionIntensity;
        }
        const updateMatEnvIntensity = (groupObj: any) => {
            if (!groupObj) return;
            Object.values(groupObj).forEach((val: any) => {
                if (val && val.isMaterial && typeof val.envMapIntensity === 'number') {
                    val.envMapIntensity = envReflectionIntensity;
                } else if (val && typeof val === 'object') {
                    updateMatEnvIntensity(val);
                }
            });
        };
        updateMatEnvIntensity(materialsRef.current);
        updateMatEnvIntensity(conditionMaterialsRef.current);
        updateMatEnvIntensity(electroMaterialsRef.current);
        updateMatEnvIntensity(badgeMaterialsRef.current);
        if (vrFloatingCardUpdaterRef.current) {
            vrFloatingCardUpdaterRef.current(selectedComponentKey, null, 0);
        }
    }, [conformation, renderMode, condition, assemblyMode, sequence, activeFilter, autoRotate, thermalDynamics, showIons, metricScaleVisible, labelsVisible, bloomEnabled, bloomStrength, bloomThreshold, dofEnabled, dofAperture, envReflectionIntensity, selectedComponentKey, cameraControlMode, isVrModeActive, isStereoLensMode, vrLocomotionMode, isVrGameActive, isVrAudioMuted]);

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

        const DESKTOP_NEAR_PLANE = 0.1;
        const DESKTOP_FAR_PLANE = 1000.0;
        const XR_NEAR_PLANE = 0.025; // 2.5 cm near clip plane prevents molecular clipping during close-up VR inspection
        const XR_FAR_PLANE = 160.0;  // Tightened far plane increases 24-bit hardware depth buffer precision by >4x in VR

        const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, DESKTOP_NEAR_PLANE, DESKTOP_FAR_PLANE);
        cameraRef.current = camera;

        const stereoCamera = new THREE.StereoCamera();
        stereoCamera.eyeSep = 0.064;
        stereoCameraRef.current = stereoCamera;

        const renderer = new THREE.WebGLRenderer({
            antialias: !isSoftwareGl,
            alpha: false,
            depth: true,
            stencil: false,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.96;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.sortObjects = true; // Enforce deterministic front-to-back opaque & back-to-front transparent depth sorting

        // Enable Universal WebXR Immersive VR / AR Support with Reference-Space Fallback Chain
        renderer.xr.enabled = true;
        const refSpaces: Array<'local-floor' | 'bounded-floor' | 'local' | 'viewer'> = [
            'local-floor',
            'bounded-floor',
            'local',
            'viewer'
        ];
        for (const space of refSpaces) {
            try {
                renderer.xr.setReferenceSpaceType(space);
                break;
            } catch {
                // Continue to next reference space fallback
            }
        }

        // Synchronize WebXR session depthNear/depthFar & stereo ArrayCamera projection planes across VR hardware
        const synchronizeXrDepthAndCameraPlanes = (isXrActive: boolean, session?: any) => {
            const targetNear = isXrActive ? XR_NEAR_PLANE : DESKTOP_NEAR_PLANE;
            const targetFar = isXrActive ? XR_FAR_PLANE : DESKTOP_FAR_PLANE;

            if (camera.near !== targetNear || camera.far !== targetFar) {
                camera.near = targetNear;
                camera.far = targetFar;
                camera.updateProjectionMatrix();
            }

            if (isXrActive && session && typeof session.updateRenderState === 'function') {
                try {
                    session.updateRenderState({
                        depthNear: XR_NEAR_PLANE,
                        depthFar: XR_FAR_PLANE
                    });
                } catch {
                    // Ignore on XR runtimes that lock renderState during active frame
                }
            }

            if (isXrActive && renderer.xr.isPresenting) {
                try {
                    const xrCam = renderer.xr.getCamera() as any;
                    if (xrCam) {
                        xrCam.near = XR_NEAR_PLANE;
                        xrCam.far = XR_FAR_PLANE;
                        if (Array.isArray(xrCam.cameras)) {
                            for (let c = 0; c < xrCam.cameras.length; c++) {
                                const subCam = xrCam.cameras[c];
                                if (subCam && (subCam.near !== XR_NEAR_PLANE || subCam.far !== XR_FAR_PLANE)) {
                                    subCam.near = XR_NEAR_PLANE;
                                    subCam.far = XR_FAR_PLANE;
                                }
                            }
                        }
                    }
                } catch {
                    // Ignore camera array inspection errors
                }
            }
        };

        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // =====================================================================
        // POST-PROCESSING PIPELINE: EffectComposer + RenderPass + UnrealBloomPass + BokehPass (Macro DOF) + OutputPass
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

        const bokehPass = new BokehPass(scene, camera, {
            focus: 48.0,
            aperture: stateRef.current.dofAperture,
            maxblur: 0.0022
        });
        bokehPass.enabled = !isSoftwareGl && stateRef.current.dofEnabled;
        composer.addPass(bokehPass);

        const outputPass = new OutputPass();
        composer.addPass(outputPass);

        composerRef.current = composer;
        bloomPassRef.current = bloomPass;
        bokehPassRef.current = bokehPass;

        // Probe Universal WebXR headset capability (immersive-vr -> immersive-ar -> 360/Gamepad fallback)
        const xrNav = (navigator as any).xr;
        if (xrNav && typeof xrNav.isSessionSupported === 'function') {
            xrNav.isSessionSupported('immersive-vr')
                .then(async (vrSupported: boolean) => {
                    if (vrSupported) {
                        webXrNativeSupportedRef.current = true;
                        webXrSupportedModeRef.current = 'immersive-vr';
                        onWebXrSupportDetected('supported');
                        return;
                    }
                    // Fallback check for passthrough MR/AR headsets (e.g. Vision Pro / Quest Passthrough)
                    try {
                        const arSupported = await xrNav.isSessionSupported('immersive-ar');
                        webXrNativeSupportedRef.current = !!arSupported;
                        webXrSupportedModeRef.current = arSupported ? 'immersive-ar' : 'immersive-vr';
                        onWebXrSupportDetected(arSupported ? 'supported' : 'fallback_360');
                    } catch {
                        webXrNativeSupportedRef.current = false;
                        onWebXrSupportDetected('fallback_360');
                    }
                })
                .catch(() => {
                    webXrNativeSupportedRef.current = false;
                    onWebXrSupportDetected('fallback_360');
                });
        } else {
            webXrNativeSupportedRef.current = false;
            onWebXrSupportDetected('fallback_360');
        }

        // Studio PMREM RoomEnvironment Map for realistic microscopic molecular reflections
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.035).texture;
        scene.environment = envTexture;
        (scene as any).environmentIntensity = stateRef.current.envReflectionIntensity;
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

        // Bokeh Background (anchored at earliest renderOrder so it never interferes with molecular depth sorting)
        const bokehGroup = new THREE.Group();
        bokehGroup.renderOrder = -10;
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
            mesh.renderOrder = -10;
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
        particles.renderOrder = -9;
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
                depthWrite: false,
                depthTest: true,
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
                depthWrite: true,
                depthTest: true,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
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
                depthWrite: true,
                depthTest: true,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
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
                depthWrite: true,
                depthTest: true,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
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
                depthWrite: true,
                depthTest: true,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
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

        // 1. 360° Geodesic Cryo-EM Observatory Sky-Dome (renderOrder -8..-5 with depthWrite: false)
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
        vrDomeShell.renderOrder = -8;
        vrEnvGroup.add(vrDomeShell);

        const vrDomeWireGeo = new THREE.WireframeGeometry(vrDomeGeo);
        const vrDomeWireMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const vrDomeWire = new THREE.LineSegments(vrDomeWireGeo, vrDomeWireMat);
        vrDomeWire.renderOrder = -7;
        vrEnvGroup.add(vrDomeWire);

        // 2. Holographic Polar Coordinate Floor & Zenith Calibration Grids
        const vrFloorGrid = new THREE.PolarGridHelper(68, 24, 12, 64, 0x0284c7, 0x1e3a8a);
        vrFloorGrid.position.y = -24;
        vrFloorGrid.renderOrder = -6;
        (vrFloorGrid.material as THREE.Material).transparent = true;
        (vrFloorGrid.material as THREE.Material).opacity = 0.38;
        (vrFloorGrid.material as THREE.Material).depthWrite = false;
        vrEnvGroup.add(vrFloorGrid);

        const vrCeilingGrid = new THREE.PolarGridHelper(68, 16, 8, 64, 0x38bdf8, 0x1e1b4b);
        vrCeilingGrid.position.y = 26;
        vrCeilingGrid.renderOrder = -6;
        (vrCeilingGrid.material as THREE.Material).transparent = true;
        (vrCeilingGrid.material as THREE.Material).opacity = 0.22;
        (vrCeilingGrid.material as THREE.Material).depthWrite = false;
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
        equatorialRing.renderOrder = -5;
        vrEnvGroup.add(equatorialRing);

        // 4. Universal XR Player Dolly Rig (vrRigGroup), 6DoF Controllers, 3D Cryo-Wands, Laser Raycaster & 3D CRISPR Target Beacon
        const vrRigGroup = new THREE.Group();
        scene.add(vrRigGroup);
        vrRigGroupRef.current = vrRigGroup;

        const vrRaycaster = new THREE.Raycaster();
        vrRaycaster.near = 0.02;
        vrRaycaster.far = 65.0;
        const tempControllerMatrix = new THREE.Matrix4();
        const laserGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const laserMat0 = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending
        });
        const laserMat1 = new THREE.LineBasicMaterial({
            color: 0x34d399,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending
        });

        // Build Procedural Multi-Part 3D Scientific VR Controller Wand (Handle + Telemetry Ring + Emitter Tip)
        const buildVrControllerWand = (accentHex: number) => {
            const wandGroup = new THREE.Group();
            const bodyGeo = new THREE.CylinderGeometry(0.016, 0.022, 0.15, 16);
            bodyGeo.rotateX(Math.PI / 2);
            const bodyMat = new THREE.MeshPhysicalMaterial({
                color: 0x0f172a,
                roughness: 0.25,
                metalness: 0.78,
                clearcoat: 0.9
            });
            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            bodyMesh.position.set(0, 0, 0.06);
            wandGroup.add(bodyMesh);

            const ringGeo = new THREE.TorusGeometry(0.026, 0.004, 12, 24);
            const ringMat = new THREE.MeshBasicMaterial({
                color: accentHex,
                transparent: true,
                opacity: 0.9
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.position.set(0, 0, -0.01);
            wandGroup.add(ringMesh);

            const tipGeo = new THREE.ConeGeometry(0.012, 0.032, 12);
            tipGeo.rotateX(-Math.PI / 2);
            const tipMesh = new THREE.Mesh(tipGeo, ringMat);
            tipMesh.position.set(0, 0, -0.025);
            wandGroup.add(tipMesh);

            return wandGroup;
        };

        // Glowing 3D Hit Reticle Sphere on the DNA surface during VR Raycast / Gaze
        const vrHitMarkerGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const vrHitMarkerMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending,
            depthTest: false
        });
        const vrHitMarker = new THREE.Mesh(vrHitMarkerGeo, vrHitMarkerMat);
        vrHitMarker.visible = false;
        vrHitMarker.renderOrder = 25;
        vrEnvGroup.add(vrHitMarker);

        const vrHitRingGeo = new THREE.RingGeometry(0.32, 0.44, 32);
        const vrHitRingMat = new THREE.MeshBasicMaterial({
            color: 0x34d399,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthTest: false
        });
        const vrHitRing = new THREE.Mesh(vrHitRingGeo, vrHitRingMat);
        vrHitMarker.add(vrHitRing);

        // 3D Holographic CRISPR Game Target Beacon (attaches to the target base pair on the DNA helix)
        const vrGameBeaconGroup = new THREE.Group();
        vrGameBeaconGroup.visible = false;
        scene.add(vrGameBeaconGroup);
        vrGameBeaconRef.current = vrGameBeaconGroup;

        const beaconOuterRingGeo = new THREE.RingGeometry(1.15, 1.38, 36);
        const beaconOuterRingMat = new THREE.MeshBasicMaterial({
            color: 0xf43f5e,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthTest: false
        });
        const beaconOuterRing = new THREE.Mesh(beaconOuterRingGeo, beaconOuterRingMat);
        beaconOuterRing.renderOrder = 24;
        vrGameBeaconGroup.add(beaconOuterRing);

        const beaconCrystalGeo = new THREE.OctahedronGeometry(0.52, 0);
        const beaconCrystalMat = new THREE.MeshBasicMaterial({
            color: 0xfbbf24,
            wireframe: true,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending,
            depthTest: false
        });
        const beaconCrystal = new THREE.Mesh(beaconCrystalGeo, beaconCrystalMat);
        beaconCrystal.renderOrder = 24;
        vrGameBeaconGroup.add(beaconCrystal);

        // 5. 3D Floating Holographic Inspector & VR CRISPR Game Board in Virtual Space
        const vrCardCanvas = document.createElement('canvas');
        vrCardCanvas.width = 1024;
        vrCardCanvas.height = 640;
        const vrCardCtx = vrCardCanvas.getContext('2d')!;
        const vrCardTexture = new THREE.CanvasTexture(vrCardCanvas);
        vrCardTexture.colorSpace = THREE.SRGBColorSpace;
        vrCardTexture.anisotropy = maxAniso;

        const drawFloatingVrInspectorCard = (
            compKey: string | null,
            hoveredKey: string | null,
            dwellPct: number
        ) => {
            const game = vrGameStateRef.current;
            const activeKey = compKey || hoveredKey || (game.active ? game.targetBaseType : 'A');
            const info = DNA_DATA[activeKey] || DNA_DATA.A;
            const w = 1024;
            const h = 640;

            vrCardCtx.clearRect(0, 0, w, h);

            // Deep Cryo-Glass Background
            const bgGrad = vrCardCtx.createLinearGradient(0, 0, w, h);
            bgGrad.addColorStop(0, 'rgba(7, 16, 34, 0.95)');
            bgGrad.addColorStop(1, 'rgba(4, 10, 22, 0.97)');
            vrCardCtx.fillStyle = bgGrad;
            vrCardCtx.beginPath();
            vrCardCtx.roundRect(8, 8, w - 16, h - 16, 26);
            vrCardCtx.fill();

            // Outer glowing border
            vrCardCtx.lineWidth = 4;
            vrCardCtx.strokeStyle = game.active ? '#f59e0b' : (info.colorHex || '#38bdf8');
            vrCardCtx.stroke();

            // Header bar
            vrCardCtx.fillStyle = game.active ? 'rgba(42, 22, 12, 0.92)' : 'rgba(14, 30, 60, 0.88)';
            vrCardCtx.beginPath();
            vrCardCtx.roundRect(24, 24, w - 48, 88, 16);
            vrCardCtx.fill();

            // Color pill indicator
            vrCardCtx.fillStyle = game.active ? '#f59e0b' : (info.colorHex || '#38bdf8');
            vrCardCtx.beginPath();
            vrCardCtx.roundRect(42, 42, 14, 52, 6);
            vrCardCtx.fill();

            // Kicker & Component / Game Title
            vrCardCtx.fillStyle = game.active ? '#fbbf24' : '#38bdf8';
            vrCardCtx.font = '700 20px "JetBrains Mono", monospace';
            vrCardCtx.textAlign = 'left';
            if (game.active) {
                vrCardCtx.fillText(
                    `MISI GAME VR CRISPR · SKOR ${game.score} · COMBO x${game.combo} · SISA ${Math.ceil(game.timeRemainingSec)}d`,
                    72,
                    56
                );
                vrCardCtx.fillStyle = '#f8fafc';
                vrCardCtx.font = '700 31px "Plus Jakarta Sans", sans-serif';
                vrCardCtx.fillText(
                    `Target #${game.targetPairIndex + 1}: Perbaiki Basa ${game.targetBaseType} ⇄ ${game.complementBaseType} (${game.lesionLabel})`,
                    72,
                    94
                );
            } else {
                vrCardCtx.fillText(
                    hoveredKey && hoveredKey !== compKey
                        ? `MEMINDAI TARGET XR · DWELL ${Math.round(dwellPct * 100)}%`
                        : 'INSPEKTOR HOLOGRAFIK 3D WEBXR · KOMPATIBEL SEMUA VR',
                    72,
                    56
                );
                vrCardCtx.fillStyle = '#f8fafc';
                vrCardCtx.font = '700 34px "Plus Jakarta Sans", sans-serif';
                vrCardCtx.fillText(info.name, 72, 94);
            }

            // Dwell progress bar in top-right if scanning
            if (dwellPct > 0.02 && dwellPct < 1.0) {
                vrCardCtx.fillStyle = 'rgba(56, 189, 248, 0.2)';
                vrCardCtx.beginPath();
                vrCardCtx.roundRect(w - 220, 48, 176, 18, 9);
                vrCardCtx.fill();

                vrCardCtx.fillStyle = '#34d399';
                vrCardCtx.beginPath();
                vrCardCtx.roundRect(w - 220, 48, Math.max(12, 176 * dwellPct), 18, 9);
                vrCardCtx.fill();
            }

            // Subtitle class or Game Event Banner
            vrCardCtx.fillStyle = game.active && game.lastEventLabel ? '#34d399' : '#94a3b8';
            vrCardCtx.font = '600 22px "Plus Jakarta Sans", sans-serif';
            vrCardCtx.fillText(
                game.active && game.lastEventLabel ? game.lastEventLabel : info.class,
                36,
                148
            );

            // 4 Metric Boxes (2x2 Grid)
            const metrics = game.active
                ? [
                      { lbl: 'TARGET NUKLEOTIDA', val: `Pasangan #${game.targetPairIndex + 1} (${game.targetBaseType})` },
                      { lbl: 'PASANGAN WATSON-CRICK', val: `${game.targetBaseType} ⇄ ${game.complementBaseType} (${game.targetBaseType === 'G' || game.targetBaseType === 'C' ? '3 Ikatan H' : '2 Ikatan H'})` },
                      { lbl: 'TOTAL LESI DIPERBAIKI', val: `${game.repairedCount} Lokasi Heliks` },
                      { lbl: 'SKOR & STREAK AKURASI', val: `${game.score} Poin (x${game.combo})` }
                  ]
                : [
                      { lbl: 'RUMUS KIMIA', val: info.formula },
                      { lbl: 'MASSA MOLAR', val: info.weight },
                      { lbl: 'PASANGAN KOMPLEMENTER', val: info.partner },
                      { lbl: 'KONFIGURASI IKATAN', val: info.bonds }
                  ];
            metrics.forEach((m, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const bx = 32 + col * 484;
                const by = 172 + row * 102;
                const bw = 468;
                const bh = 88;

                vrCardCtx.fillStyle = 'rgba(13, 25, 48, 0.85)';
                vrCardCtx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
                vrCardCtx.lineWidth = 2;
                vrCardCtx.beginPath();
                vrCardCtx.roundRect(bx, by, bw, bh, 12);
                vrCardCtx.fill();
                vrCardCtx.stroke();

                vrCardCtx.fillStyle = '#64748b';
                vrCardCtx.font = '700 17px "JetBrains Mono", monospace';
                vrCardCtx.fillText(m.lbl, bx + 18, by + 30);

                vrCardCtx.fillStyle = '#e0f2fe';
                vrCardCtx.font = '700 23px "JetBrains Mono", "Plus Jakarta Sans", sans-serif';
                const clippedVal = m.val.length > 34 ? m.val.slice(0, 33) + '…' : m.val;
                vrCardCtx.fillText(clippedVal, bx + 18, by + 66);
            });

            // Function & Structural Significance Box
            vrCardCtx.fillStyle = 'rgba(10, 22, 44, 0.9)';
            vrCardCtx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
            vrCardCtx.lineWidth = 2;
            vrCardCtx.beginPath();
            vrCardCtx.roundRect(32, 386, w - 64, 174, 14);
            vrCardCtx.fill();
            vrCardCtx.stroke();

            vrCardCtx.fillStyle = '#38bdf8';
            vrCardCtx.font = '700 18px "JetBrains Mono", monospace';
            vrCardCtx.fillText(
                game.active
                    ? 'INSTRUKSI GAME VR UNIVERSAL (QUEST · PICO · VIVE · GAMEPAD · 360°)'
                    : 'FUNGSI BIOLOGIS & SIGNIFIKANSI STRUKTURAL',
                52,
                418
            );

            // Word-wrap description + function
            vrCardCtx.fillStyle = '#cbd5e1';
            vrCardCtx.font = '500 21px "Plus Jakarta Sans", sans-serif';
            const textToWrap = game.active
                ? `Bidik cincin target bercahaya pada pasangan basa #${game.targetPairIndex + 1} (${game.targetBaseType}⇄${game.complementBaseType}) dengan Sinar Laser VR, Tatapan Gaze (0.85d), Tombol A Gamepad, atau Spasi/Klik untuk memperbaiki mutasi DNA secara real-time.`
                : `${info.desc} ${info.func}`;
            const words = textToWrap.split(' ');
            let line = '';
            let ty = 452;
            const maxLineWidth = w - 108;
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                if (vrCardCtx.measureText(testLine).width > maxLineWidth && i > 0) {
                    vrCardCtx.fillText(line.trim(), 52, ty);
                    line = words[i] + ' ';
                    ty += 30;
                    if (ty > 542) {
                        line = line.trim() + '…';
                        break;
                    }
                } else {
                    line = testLine;
                }
            }
            if (ty <= 542 && line.trim()) {
                vrCardCtx.fillText(line.trim(), 52, ty);
            }

            // Footer instruction
            vrCardCtx.fillStyle = '#94a3b8';
            vrCardCtx.font = '600 16px "JetBrains Mono", monospace';
            vrCardCtx.fillText(
                'KONTROL VR & HAND: Cubit (Pinch)/Trigger = Pilih · Cubit+Geser/Grip = Putar Heliks · Stick/WASD = Gerak',
                32,
                602
            );

            vrCardTexture.needsUpdate = true;
        };

        vrFloatingCardUpdaterRef.current = drawFloatingVrInspectorCard;
        drawFloatingVrInspectorCard(stateRef.current.selectedComponentKey || 'A', null, 0);

        // Composite 3D Holographic Card Mesh Group (Backing Plate + Neon Bevel Rim + High-DPI Screen)
        const vrInspectorCardGroup = new THREE.Group();
        const cardBackingGeo = new THREE.BoxGeometry(11.6, 7.3, 0.16);
        const cardBackingMat = new THREE.MeshPhysicalMaterial({
            color: 0x071328,
            roughness: 0.22,
            metalness: 0.75,
            clearcoat: 0.9,
            emissive: 0x0c4a6e,
            emissiveIntensity: 0.25,
            depthWrite: true,
            depthTest: true
        });
        const cardBackingMesh = new THREE.Mesh(cardBackingGeo, cardBackingMat);
        cardBackingMesh.position.z = -0.10;
        cardBackingMesh.renderOrder = 28;
        cardBackingMesh.userData = { isVrCardBoard: true };
        vrInspectorCardGroup.add(cardBackingMesh);

        const cardScreenGeo = new THREE.PlaneGeometry(11.2, 7.0);
        const cardScreenMat = new THREE.MeshBasicMaterial({
            map: vrCardTexture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: true,
            depthTest: true,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
        const cardScreenMesh = new THREE.Mesh(cardScreenGeo, cardScreenMat);
        cardScreenMesh.renderOrder = 29;
        cardScreenMesh.userData = { isVrCardBoard: true };
        vrInspectorCardGroup.add(cardScreenMesh);

        vrInspectorCardGroup.position.set(-14.5, 2.0, 2.0);
        vrEnvGroup.add(vrInspectorCardGroup);

        // 3D Leader Line connecting the Floating VR Card to the inspected DNA nucleotide
        const vrLeaderLineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-8.8, 2.0, 2.0),
            new THREE.Vector3(0, 0, 0)
        ]);
        const vrLeaderLineMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const vrLeaderLine = new THREE.Line(vrLeaderLineGeo, vrLeaderLineMat);
        vrLeaderLine.renderOrder = 27;
        vrEnvGroup.add(vrLeaderLine);

        const getActiveInteractiveDnaMeshes = (): THREE.Mesh[] => {
            const activeMeshes: THREE.Mesh[] = [];
            if (!dnaGroupRef.current) return activeMeshes;
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
            return activeMeshes;
        };

        // Helper to spawn a new CRISPR target base pair on the 3D DNA helix
        const complementMapGame: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
        const lesionTypes = [
            'Mismatch Watson-Crick',
            'Adduksi Epigenetik 5-mC',
            'Dimer Timin Siklobutana (UV)',
            'Distorsi Cincin Aromatik'
        ];

        const pickNextVrGameTarget = (avoidPairIdx?: number) => {
            const totalPairs = Math.max(1, pairDynamicContainersRef.current.length || 24);
            let nextIdx = Math.floor(Math.random() * totalPairs);
            if (totalPairs > 2 && nextIdx === avoidPairIdx) {
                nextIdx = (nextIdx + 3) % totalPairs;
            }
            const cleanSeq = calculateSequenceStats(stateRef.current.sequence).clean || 'ATGC';
            const b1 = cleanSeq[nextIdx % cleanSeq.length] || 'A';
            const b2 = complementMapGame[b1] || 'T';
            const lesion = lesionTypes[(nextIdx + vrGameStateRef.current.repairedCount) % lesionTypes.length];

            vrGameStateRef.current.targetPairIndex = nextIdx;
            vrGameStateRef.current.targetBaseType = b1;
            vrGameStateRef.current.complementBaseType = b2;
            vrGameStateRef.current.lesionLabel = lesion;
        };

        const emitVrGameTelemetryNow = () => {
            if (onUpdateVrGameTelemetry) {
                onUpdateVrGameTelemetry({ ...vrGameStateRef.current });
            }
        };

        const triggerVrComponentSelect = (hitObj: THREE.Object3D) => {
            const type = hitObj.userData?.type;
            if (!type) return;
            const pairIdx = typeof hitObj.userData?.pairIndex === 'number' ? hitObj.userData.pairIndex : -1;
            const tg = hitObj.userData.parentGroup || hitObj;

            // Check if Interactive VR CRISPR Repair Game is active
            if (vrGameStateRef.current.active) {
                const g = vrGameStateRef.current;
                const isExactPairMatch = pairIdx === g.targetPairIndex;
                const isBaseMatch =
                    type === g.targetBaseType ||
                    type === g.complementBaseType ||
                    (type === 'hbond' && isExactPairMatch);

                if (isExactPairMatch || isBaseMatch) {
                    const pointsEarned = (isExactPairMatch ? 150 : 100) * g.combo;
                    g.score += pointsEarned;
                    g.repairedCount += 1;
                    g.combo = Math.min(10, g.combo + 1);
                    g.timeRemainingSec = Math.min(90, g.timeRemainingSec + 3.5);
                    g.lastEventLabel = `PERBAIKAN BERHASIL! +${pointsEarned} Poin (${g.targetBaseType}⇄${g.complementBaseType} Stabil)`;

                    vrSound.playRepairSuccess(g.combo);
                    triggerUniversalXrHaptics(xrSessionRef.current, 0.9, 85);
                    pickNextVrGameTarget(pairIdx);
                    emitVrGameTelemetryNow();
                } else {
                    g.combo = 1;
                    g.lastEventLabel = `Bukan Target! Bidik Pasangan #${g.targetPairIndex + 1} (${g.targetBaseType}⇄${g.complementBaseType})`;
                    vrSound.playMissWarning();
                    triggerUniversalXrHaptics(xrSessionRef.current, 0.35, 40);
                    emitVrGameTelemetryNow();
                }
            } else {
                vrSound.playSelectLock(type);
                triggerUniversalXrHaptics(xrSessionRef.current, 0.65, 45);
            }

            last3dClickedRef.current = { type, object: tg, time: performance.now() };
            onSelectComponent(type);
            drawFloatingVrInspectorCard(type, type, 1.0);
            bloomPulseBoostRef.current = 0.24;
            const origScale = tg.scale.clone();
            animateVector(tg.scale, origScale.clone().multiplyScalar(1.26), 200, easeOutBack);
            setTimeout(() => animateVector(tg.scale, origScale, 300, easeInOutCubic), 220);
        };
        vrComponentSelectTriggerRef.current = triggerVrComponentSelect;

        // ============================================================================
        // UNIFIED MULTI-HEADSET XR RAYCASTER & TRIGGER NORMALIZATION ENGINE
        // Supports Meta Quest 2/3/Pro, Pico 4/Neo3, Valve Index, HTC Vive, Windows MR,
        // Apple Vision Pro (Transient Eye+Pinch), Hand-Tracking, Gamepad & 360° Gaze
        // ============================================================================
        const scratchRayOrigin = new THREE.Vector3();
        const scratchRayDir = new THREE.Vector3();
        const scratchCtrlQuat = new THREE.Quaternion();
        const scratchPitchQuat = new THREE.Quaternion();
        const scratchRigQuat = new THREE.Quaternion();
        const scratchScale = new THREE.Vector3();
        const scratchRightAxis = new THREE.Vector3(1, 0, 0);
        const scratchMeshWorldPos = new THREE.Vector3();
        const scratchClosestRayPt = new THREE.Vector3();
        const scratchXrCamPos = new THREE.Vector3();
        const scratchGrabPos = new THREE.Vector3();

        interface NormalizedXrAxesState {
            primaryX: number;
            primaryY: number;
            thumbstickX: number;
            thumbstickY: number;
            touchpadX: number;
            touchpadY: number;
        }

        interface UnifiedControllerSlotState {
            index: number;
            controller: THREE.Object3D;
            laserLine: THREE.Line;
            laserMat: THREE.LineBasicMaterial;
            handedness: 'left' | 'right' | 'none';
            targetRayMode: 'tracked-pointer' | 'gaze' | 'screen' | 'transient-pointer';
            runtimeProfile: XrRuntimeProfile;
            pitchOffsetRad: number;
            triggerPressed: boolean;
            triggerValue: number;
            squeezePressed: boolean;
            squeezeValue: number;
            thumbstickClickPressed: boolean;
            secondaryButtonPressed: boolean;
            axesNorm: NormalizedXrAxesState;
            lastSelectTimeMs: number;
            lastActiveTimeMs: number;
            prevWorldDir: THREE.Vector3;
        }

        const SELECT_DEBOUNCE_MS = 165;
        const TRIGGER_PRESS_THRESHOLD = 0.54;
        const TRIGGER_RELEASE_THRESHOLD = 0.32;
        const SQUEEZE_PRESS_THRESHOLD = 0.58;
        const SQUEEZE_RELEASE_THRESHOLD = 0.35;
        const THUMBSTICK_RADIAL_DEADZONE = 0.15;
        const TOUCHPAD_RADIAL_DEADZONE = 0.18;

        const detectXrRuntimeProfile = (source?: XRInputSource | null): { profile: XrRuntimeProfile; pitchOffsetRad: number } => {
            if (!source) return { profile: 'generic_xr', pitchOffsetRad: 0 };
            if (source.targetRayMode === 'transient-pointer') {
                return { profile: 'vision_pro_hand', pitchOffsetRad: 0 };
            }
            if (source.targetRayMode === 'gaze') {
                return { profile: 'gaze', pitchOffsetRad: 0 };
            }
            const profiles = (source.profiles || []).map(p => p.toLowerCase());
            for (const p of profiles) {
                if (p.includes('meta-quest') || p.includes('oculus-touch')) {
                    return { profile: 'meta_quest', pitchOffsetRad: 0 };
                }
                if (p.includes('pico') || p.includes('bytedance')) {
                    return { profile: 'pico_xr', pitchOffsetRad: 0 };
                }
                if (p.includes('valve-index')) {
                    return { profile: 'valve_index', pitchOffsetRad: -0.025 };
                }
                if (p.includes('htc-vive')) {
                    return { profile: 'htc_vive', pitchOffsetRad: -0.045 };
                }
                if (p.includes('microsoft-mixed-reality') || p.includes('windows-mixed-reality') || p.includes('samsung-odyssey')) {
                    return { profile: 'wmr', pitchOffsetRad: -0.035 };
                }
                if (p.includes('apple-vision') || p.includes('hand')) {
                    return { profile: 'vision_pro_hand', pitchOffsetRad: 0 };
                }
            }
            return { profile: 'generic_xr', pitchOffsetRad: 0 };
        };

        // Apply calibrated radial deadzone with smooth non-linear response curve (zero heap allocation)
        const applyRadialDeadzonePair = (
            rawX: number,
            rawY: number,
            deadzone: number,
            outPair: { x: number; y: number; mag: number }
        ) => {
            const sx = Number.isFinite(rawX) ? rawX : 0;
            const sy = Number.isFinite(rawY) ? rawY : 0;
            const mag = Math.hypot(sx, sy);
            if (mag <= deadzone) {
                outPair.x = 0;
                outPair.y = 0;
                outPair.mag = 0;
                return;
            }
            const clampedMag = Math.min(1.0, mag);
            const rescaledMag = Math.pow((clampedMag - deadzone) / (1.0 - deadzone), 1.12);
            const invMag = 1.0 / mag;
            outPair.x = sx * invMag * rescaledMag;
            outPair.y = sy * invMag * rescaledMag;
            outPair.mag = rescaledMag;
        };

        const scratchPair01 = { x: 0, y: 0, mag: 0 };
        const scratchPair23 = { x: 0, y: 0, mag: 0 };

        /**
         * Standardized WebXR InputSource API Normalizer:
         * Reconciles `xr-standard` 4-axis gamepads (axes[0,1]=Touchpad, axes[2,3]=Thumbstick)
         * with 2-axis controllers (Vive Wand trackpad, legacy Pico/Oculus Go) and normalizes
         * Trigger (b0), Squeeze/Grip (b1), Touchpad Click (b2), Thumbstick Click (b3),
         * Primary Face Button A/X (b4), and Secondary Face Button B/Y/Menu (b5).
         */
        const normalizeXrInputSourceState = (
            slot: UnifiedControllerSlotState,
            source: XRInputSource
        ): {
            effectiveTriggerVal: number;
            effectiveSqueezeVal: number;
            thumbstickClickedEdge: boolean;
            secondaryButtonEdge: boolean;
        } => {
            const gp = source.gamepad;
            const norm = slot.axesNorm;
            norm.primaryX = 0;
            norm.primaryY = 0;
            norm.thumbstickX = 0;
            norm.thumbstickY = 0;
            norm.touchpadX = 0;
            norm.touchpadY = 0;

            if (!gp) {
                return {
                    effectiveTriggerVal: 0,
                    effectiveSqueezeVal: 0,
                    thumbstickClickedEdge: false,
                    secondaryButtonEdge: false
                };
            }

            // 1. Normalize Controller Axes across Meta Quest, Pico, HTC Vive, Valve Index, and WMR
            const axes = gp.axes || [];
            const isTouchpadPrimaryRuntime = slot.runtimeProfile === 'htc_vive';
            const dz01 = isTouchpadPrimaryRuntime || axes.length >= 4 ? TOUCHPAD_RADIAL_DEADZONE : THUMBSTICK_RADIAL_DEADZONE;

            if (axes.length >= 2) {
                applyRadialDeadzonePair(axes[0], axes[1], dz01, scratchPair01);
            } else {
                scratchPair01.x = 0;
                scratchPair01.y = 0;
                scratchPair01.mag = 0;
            }

            if (axes.length >= 4) {
                applyRadialDeadzonePair(axes[2], axes[3], THUMBSTICK_RADIAL_DEADZONE, scratchPair23);
                norm.touchpadX = scratchPair01.x;
                norm.touchpadY = scratchPair01.y;
                norm.thumbstickX = scratchPair23.x;
                norm.thumbstickY = scratchPair23.y;

                // Prefer thumbstick [2,3] unless touchpad [0,1] has stronger active deflection (e.g. Vive / WMR / Index trackpad swipe)
                if (scratchPair23.mag >= scratchPair01.mag || scratchPair23.mag > 0.04) {
                    norm.primaryX = scratchPair23.x;
                    norm.primaryY = scratchPair23.y;
                } else {
                    norm.primaryX = scratchPair01.x;
                    norm.primaryY = scratchPair01.y;
                }
            } else if (axes.length >= 2) {
                norm.thumbstickX = scratchPair01.x;
                norm.thumbstickY = scratchPair01.y;
                norm.touchpadX = scratchPair01.x;
                norm.touchpadY = scratchPair01.y;
                norm.primaryX = scratchPair01.x;
                norm.primaryY = scratchPair01.y;
            }

            // 2. Normalize Buttons & Analog Triggers across XR Runtimes
            const buttons = gp.buttons || [];
            const b0Val = buttons[0]?.value ?? (buttons[0]?.pressed ? 1 : 0); // Primary Trigger (select)
            const b1Val = buttons[1]?.value ?? (buttons[1]?.pressed ? 1 : 0); // Squeeze / Grip
            const b2Pressed = Boolean(buttons[2]?.pressed);                   // Touchpad Click (Vive / WMR / Index)
            const b3Pressed = Boolean(buttons[3]?.pressed);                   // Thumbstick Click L3/R3 (Quest / Pico / Index)
            const b4Pressed = Boolean(buttons[4]?.pressed);                   // Primary Face Button A / X (Quest / Pico / Index)
            const b5Pressed = Boolean(buttons[5]?.pressed);                   // Secondary Face Button B / Y / Menu

            // On HTC Vive Wands, touchpad click (b2) only acts as select when the user isn't deflecting the outer rim for locomotion
            const touchpadSelectActive = b2Pressed && scratchPair01.mag < 0.45;
            const effectiveTriggerVal = Math.max(b0Val, touchpadSelectActive ? 1 : 0, b4Pressed ? 1 : 0);
            const effectiveSqueezeVal = b1Val;

            const thumbstickClickedEdge = b3Pressed && !slot.thumbstickClickPressed;
            slot.thumbstickClickPressed = b3Pressed;

            const secondaryButtonEdge = b5Pressed && !slot.secondaryButtonPressed;
            slot.secondaryButtonPressed = b5Pressed;

            return {
                effectiveTriggerVal,
                effectiveSqueezeVal,
                thumbstickClickedEdge,
                secondaryButtonEdge
            };
        };

        // Extract normalized world-space ray origin & direction across heterogeneous XR runtimes
        const configureUnifiedRayFromController = (
            slot: UnifiedControllerSlotState,
            inputSource?: XRInputSource | null,
            xrFrame?: XRFrame
        ): boolean => {
            vrRigGroup.updateWorldMatrix(true, false);
            let poseExtracted = false;

            // 1. Prefer WebXR native targetRaySpace pose when XRFrame & ReferenceSpace are available
            if (xrFrame && inputSource && inputSource.targetRaySpace) {
                try {
                    const refSpace = renderer.xr.getReferenceSpace();
                    if (refSpace) {
                        const rayPose = xrFrame.getPose(inputSource.targetRaySpace, refSpace);
                        if (rayPose) {
                            const pos = rayPose.transform.position;
                            const ori = rayPose.transform.orientation;
                            scratchRayOrigin.set(pos.x, pos.y, pos.z).applyMatrix4(vrRigGroup.matrixWorld);
                            scratchCtrlQuat.set(ori.x, ori.y, ori.z, ori.w);
                            vrRigGroup.getWorldQuaternion(scratchRigQuat);
                            scratchCtrlQuat.premultiply(scratchRigQuat);
                            poseExtracted = true;
                        }
                    }
                } catch {
                    // Fallback to controller.matrixWorld below
                }
            }

            // 2. Fallback to Three.js WebXRManager controller matrixWorld decomposition
            if (!poseExtracted) {
                slot.controller.updateWorldMatrix(true, false);
                slot.controller.matrixWorld.decompose(scratchRayOrigin, scratchCtrlQuat, scratchScale);
                if (scratchRayOrigin.lengthSq() > 0.00001 || scratchCtrlQuat.lengthSq() > 0.0001) {
                    poseExtracted = true;
                }
            }

            if (!poseExtracted) return false;

            // Apply runtime-specific ergonomic pitch calibration offset if needed
            if (slot.pitchOffsetRad !== 0) {
                scratchPitchQuat.setFromAxisAngle(scratchRightAxis, slot.pitchOffsetRad);
                scratchCtrlQuat.multiply(scratchPitchQuat);
            }

            scratchRayDir.set(0, 0, -1).applyQuaternion(scratchCtrlQuat).normalize();
            vrRaycaster.set(scratchRayOrigin, scratchRayDir);

            // Detect angular motion to automatically promote the actively moving hand controller
            if (slot.prevWorldDir.distanceToSquared(scratchRayDir) > 0.00025) {
                slot.lastActiveTimeMs = performance.now();
                slot.prevWorldDir.copy(scratchRayDir);
            }

            return true;
        };

        // Raycast against interactive DNA meshes with sub-Angstrom magnetic aim-assist for VR hand stability
        const intersectDnaWithMagneticAssist = (
            activeMeshes: THREE.Mesh[],
            isXrPresenting: boolean
        ): THREE.Intersection | null => {
            const directHits = vrRaycaster.intersectObjects(activeMeshes, false);
            if (directHits.length > 0) {
                return directHits[0];
            }

            // Magnetic proximity cone snap when pointing closely at small atomic spheres in VR
            const snapRadius = isXrPresenting ? 0.075 : 0.36;
            const snapRadiusSq = snapRadius * snapRadius;
            let bestMesh: THREE.Mesh | null = null;
            let bestDistAlongRay = Infinity;
            let bestPerpDistSq = snapRadiusSq;
            const bestHitPoint = new THREE.Vector3();

            for (let i = 0; i < activeMeshes.length; i++) {
                const mesh = activeMeshes[i];
                mesh.getWorldPosition(scratchMeshWorldPos);
                const toMeshDist = vrRaycaster.ray.origin.distanceTo(scratchMeshWorldPos);
                if (toMeshDist < vrRaycaster.near || toMeshDist > vrRaycaster.far) continue;

                vrRaycaster.ray.closestPointToPoint(scratchMeshWorldPos, scratchClosestRayPt);
                // Ensure the closest point is in front of the ray origin
                if (scratchClosestRayPt.distanceToSquared(vrRaycaster.ray.origin) < 0.0004) continue;

                const perpDistSq = scratchClosestRayPt.distanceToSquared(scratchMeshWorldPos);
                if (perpDistSq < bestPerpDistSq || (perpDistSq <= bestPerpDistSq * 1.15 && toMeshDist < bestDistAlongRay)) {
                    bestPerpDistSq = perpDistSq;
                    bestDistAlongRay = toMeshDist;
                    bestMesh = mesh;
                    bestHitPoint.copy(scratchMeshWorldPos);
                }
            }

            if (bestMesh) {
                return {
                    distance: bestDistAlongRay,
                    point: bestHitPoint,
                    object: bestMesh
                };
            }
            return null;
        };

        // ============================================================================
        // WEBXR HAND INPUT API (W3C XRHand 25-Joint Articulated Skeleton & Gestures)
        // Supports Pinch-to-Select, Pinch-Hold Drag-to-Rotate/Elevate, Bimanual Scale,
        // Direct Fingertip Touch Proximity, and Whole-Hand Fist Grab
        // ============================================================================
        const XR_HAND_JOINT_NAMES: readonly string[] = [
            'wrist', // 0
            'thumb-metacarpal', // 1
            'thumb-phalanx-proximal', // 2
            'thumb-phalanx-distal', // 3
            'thumb-tip', // 4
            'index-finger-metacarpal', // 5
            'index-finger-phalanx-proximal', // 6
            'index-finger-phalanx-intermediate', // 7
            'index-finger-phalanx-distal', // 8
            'index-finger-tip', // 9
            'middle-finger-metacarpal', // 10
            'middle-finger-phalanx-proximal', // 11
            'middle-finger-phalanx-intermediate', // 12
            'middle-finger-phalanx-distal', // 13
            'middle-finger-tip', // 14
            'ring-finger-metacarpal', // 15
            'ring-finger-phalanx-proximal', // 16
            'ring-finger-phalanx-intermediate', // 17
            'ring-finger-phalanx-distal', // 18
            'ring-finger-tip', // 19
            'pinky-finger-metacarpal', // 20
            'pinky-finger-phalanx-proximal', // 21
            'pinky-finger-phalanx-intermediate', // 22
            'pinky-finger-phalanx-distal', // 23
            'pinky-finger-tip' // 24
        ];

        const XR_HAND_BONE_PAIRS: readonly [number, number][] = [
            // Thumb chain
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index chain
            [0, 5], [5, 6], [6, 7], [7, 8], [8, 9],
            // Middle chain
            [0, 10], [10, 11], [11, 12], [12, 13], [13, 14],
            // Ring chain
            [0, 15], [15, 16], [16, 17], [17, 18], [18, 19],
            // Pinky chain
            [0, 20], [20, 21], [21, 22], [22, 23], [23, 24]
        ];

        const sharedHandJointGeo = new THREE.IcosahedronGeometry(1.0, 1);
        const sharedPinchOrbGeo = new THREE.SphereGeometry(0.011, 14, 14);
        const sharedPinchRingGeo = new THREE.RingGeometry(0.014, 0.021, 24);

        interface HandSkeletonVisualRig {
            group: THREE.Group;
            jointMeshes: THREE.Mesh[];
            boneGeo: THREE.BufferGeometry;
            boneLines: THREE.LineSegments;
            boneMat: THREE.LineBasicMaterial;
            jointMat: THREE.MeshBasicMaterial;
            tipMat: THREE.MeshBasicMaterial;
            pinchOrbMesh: THREE.Mesh;
            pinchOrbMat: THREE.MeshBasicMaterial;
            pinchRingMesh: THREE.Mesh;
            pinchRingMat: THREE.MeshBasicMaterial;
        }

        const buildXrHandSkeletonRig = (accentHex: number): HandSkeletonVisualRig => {
            const group = new THREE.Group();
            group.visible = false;
            group.renderOrder = 31;

            const jointMat = new THREE.MeshBasicMaterial({
                color: accentHex,
                transparent: true,
                opacity: 0.78
            });
            const tipMat = new THREE.MeshBasicMaterial({
                color: 0xf8fafc,
                transparent: true,
                opacity: 0.95
            });

            const fingertipIndices = new Set([4, 9, 14, 19, 24]);
            const jointMeshes: THREE.Mesh[] = [];
            for (let j = 0; j < XR_HAND_JOINT_NAMES.length; j++) {
                const isTip = fingertipIndices.has(j);
                const m = new THREE.Mesh(sharedHandJointGeo, isTip ? tipMat : jointMat);
                const defaultRadius = j === 0 ? 0.014 : isTip ? 0.0085 : 0.0075;
                m.scale.setScalar(defaultRadius);
                m.renderOrder = 31;
                group.add(m);
                jointMeshes.push(m);
            }

            const boneVertices = new Float32Array(XR_HAND_BONE_PAIRS.length * 2 * 3);
            const boneGeo = new THREE.BufferGeometry();
            boneGeo.setAttribute('position', new THREE.BufferAttribute(boneVertices, 3));
            const boneMat = new THREE.LineBasicMaterial({
                color: accentHex,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const boneLines = new THREE.LineSegments(boneGeo, boneMat);
            boneLines.renderOrder = 31;
            boneLines.frustumCulled = false;
            group.add(boneLines);

            const pinchOrbMat = new THREE.MeshBasicMaterial({
                color: accentHex,
                transparent: true,
                opacity: 0.88,
                blending: THREE.AdditiveBlending,
                depthTest: false
            });
            const pinchOrbMesh = new THREE.Mesh(sharedPinchOrbGeo, pinchOrbMat);
            pinchOrbMesh.renderOrder = 33;
            group.add(pinchOrbMesh);

            const pinchRingMat = new THREE.MeshBasicMaterial({
                color: 0xfbbf24,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthTest: false
            });
            const pinchRingMesh = new THREE.Mesh(sharedPinchRingGeo, pinchRingMat);
            pinchRingMesh.renderOrder = 33;
            pinchOrbMesh.add(pinchRingMesh);

            return {
                group,
                jointMeshes,
                boneGeo,
                boneLines,
                boneMat,
                jointMat,
                tipMat,
                pinchOrbMesh,
                pinchOrbMat,
                pinchRingMesh,
                pinchRingMat
            };
        };

        interface XrHandSlotState {
            isHandTracking: boolean;
            isPinching: boolean;
            isDraggingHelix: boolean;
            isFistGrabbing: boolean;
            gesture: XrHandGestureState;
            pinchStrength: number;
            pinchDistanceMm: number;
            jointWorldPositions: THREE.Vector3[];
            jointValid: boolean[];
            pinchMidpointWorld: THREE.Vector3;
            pinchStartWorld: THREE.Vector3;
            fistStartWorld: THREE.Vector3;
            pinchStartTimeMs: number;
            dragStartHelixRotY: number;
            dragStartHelixRotX: number;
            dragStartHelixPosY: number;
            visualRig: HandSkeletonVisualRig;
            wandGroup: THREE.Group;
            xrHandSpace: THREE.Object3D;
        }

        const createInitialHandSlotState = (
            accentHex: number,
            wandGroup: THREE.Group,
            xrHandSpace: THREE.Object3D
        ): XrHandSlotState => {
            const visualRig = buildXrHandSkeletonRig(accentHex);
            scene.add(visualRig.group);
            const jointWorldPositions: THREE.Vector3[] = [];
            const jointValid: boolean[] = [];
            for (let j = 0; j < XR_HAND_JOINT_NAMES.length; j++) {
                jointWorldPositions.push(new THREE.Vector3());
                jointValid.push(false);
            }
            return {
                isHandTracking: false,
                isPinching: false,
                isDraggingHelix: false,
                isFistGrabbing: false,
                gesture: 'none',
                pinchStrength: 0,
                pinchDistanceMm: 65,
                jointWorldPositions,
                jointValid,
                pinchMidpointWorld: new THREE.Vector3(),
                pinchStartWorld: new THREE.Vector3(),
                fistStartWorld: new THREE.Vector3(),
                pinchStartTimeMs: 0,
                dragStartHelixRotY: 0,
                dragStartHelixRotX: 0.15,
                dragStartHelixPosY: 1.45,
                visualRig,
                wandGroup,
                xrHandSpace
            };
        };

        const controller0 = renderer.xr.getController(0);
        const controller1 = renderer.xr.getController(1);
        const xrHand0 = renderer.xr.getHand(0);
        const xrHand1 = renderer.xr.getHand(1);
        vrRigGroup.add(xrHand0);
        vrRigGroup.add(xrHand1);

        const laserLine0 = new THREE.Line(laserGeo, laserMat0);
        const laserLine1 = new THREE.Line(laserGeo, laserMat1);
        laserLine0.renderOrder = 32;
        laserLine1.renderOrder = 32;
        laserLine0.scale.set(1, 1, 14);
        laserLine1.scale.set(1, 1, 14);
        controller0.add(laserLine0);
        controller1.add(laserLine1);

        const wandGroup0 = buildVrControllerWand(0x38bdf8);
        const wandGroup1 = buildVrControllerWand(0x34d399);
        controller0.add(wandGroup0);
        controller1.add(wandGroup1);

        const handSlots: XrHandSlotState[] = [
            createInitialHandSlotState(0x38bdf8, wandGroup0, xrHand0),
            createInitialHandSlotState(0x34d399, wandGroup1, xrHand1)
        ];

        // Bimanual Two-Hand Pinch Scale & Steering State
        let bimanualPinchActive = false;
        let bimanualStartDist = 0.25;
        let bimanualStartScale = 0.085;
        let bimanualStartAngle = 0;
        let bimanualStartRotY = 0;

        // Pre-allocated scratch vectors for zero-allocation WebXR Hand Input processing
        const scratchJointLocalPos = new THREE.Vector3();
        const scratchHandDragDelta = new THREE.Vector3();
        const scratchHandAimDir = new THREE.Vector3();
        const scratchDirectHitPt = new THREE.Vector3();

        const PINCH_ENGAGE_METERS = 0.024; // 24 mm thumb-to-index tip distance to engage pinch
        const PINCH_RELEASE_METERS = 0.035; // 35 mm to release pinch (hysteresis)
        const PINCH_DRAG_DEADZONE_METERS = 0.018; // 18 mm movement threshold to transition from pinch-select to pinch-drag
        const FIST_ENGAGE_METERS = 0.092; // 92 mm average fingertip-to-wrist distance to engage fist grab
        const FIST_RELEASE_METERS = 0.115; // 115 mm to release fist grab

        // Find interactive DNA mesh directly touched or approached by index fingertip / pinch point in 3D space
        const findDirectHandProximityDnaHit = (
            handPointWorld: THREE.Vector3,
            activeMeshes: THREE.Mesh[],
            maxReachMeters = 0.115
        ): THREE.Intersection | null => {
            const maxReachSq = maxReachMeters * maxReachMeters;
            let bestMesh: THREE.Mesh | null = null;
            let bestDistSq = maxReachSq;

            for (let i = 0; i < activeMeshes.length; i++) {
                const mesh = activeMeshes[i];
                mesh.getWorldPosition(scratchMeshWorldPos);
                const dSq = handPointWorld.distanceToSquared(scratchMeshWorldPos);
                if (dSq < bestDistSq) {
                    bestDistSq = dSq;
                    bestMesh = mesh;
                    scratchDirectHitPt.copy(scratchMeshWorldPos);
                }
            }

            if (bestMesh) {
                return {
                    distance: Math.sqrt(bestDistSq),
                    point: scratchDirectHitPt.clone(),
                    object: bestMesh
                };
            }
            return null;
        };

        const controllerSlots: UnifiedControllerSlotState[] = [
            {
                index: 0,
                controller: controller0,
                laserLine: laserLine0,
                laserMat: laserMat0,
                handedness: 'right',
                targetRayMode: 'tracked-pointer',
                runtimeProfile: 'generic_xr',
                pitchOffsetRad: 0,
                triggerPressed: false,
                triggerValue: 0,
                squeezePressed: false,
                squeezeValue: 0,
                thumbstickClickPressed: false,
                secondaryButtonPressed: false,
                axesNorm: { primaryX: 0, primaryY: 0, thumbstickX: 0, thumbstickY: 0, touchpadX: 0, touchpadY: 0 },
                lastSelectTimeMs: 0,
                lastActiveTimeMs: 0,
                prevWorldDir: new THREE.Vector3(0, 0, -1)
            },
            {
                index: 1,
                controller: controller1,
                laserLine: laserLine1,
                laserMat: laserMat1,
                handedness: 'left',
                targetRayMode: 'tracked-pointer',
                runtimeProfile: 'generic_xr',
                pitchOffsetRad: 0,
                triggerPressed: false,
                triggerValue: 0,
                squeezePressed: false,
                squeezeValue: 0,
                thumbstickClickPressed: false,
                secondaryButtonPressed: false,
                axesNorm: { primaryX: 0, primaryY: 0, thumbstickX: 0, thumbstickY: 0, touchpadX: 0, touchpadY: 0 },
                lastSelectTimeMs: 0,
                lastActiveTimeMs: 0,
                prevWorldDir: new THREE.Vector3(0, 0, -1)
            }
        ];
        let activeDominantSlotIdx = 0;
        let lastGlobalXrSelectTimeMs = 0;

        const executeUnifiedRaySelection = (
            slot: UnifiedControllerSlotState | null,
            inputSource?: XRInputSource | null,
            xrFrame?: XRFrame,
            directHandHitOverride?: THREE.Intersection | null
        ) => {
            if (!dnaGroupRef.current) return;
            const nowMs = performance.now();
            if (nowMs - lastGlobalXrSelectTimeMs < SELECT_DEBOUNCE_MS) return;
            if (slot && nowMs - slot.lastSelectTimeMs < SELECT_DEBOUNCE_MS) return;

            lastGlobalXrSelectTimeMs = nowMs;
            if (slot) {
                slot.lastSelectTimeMs = nowMs;
                slot.lastActiveTimeMs = nowMs;
                activeDominantSlotIdx = slot.index;
                configureUnifiedRayFromController(slot, inputSource, xrFrame);
            } else if (inputSource) {
                // Transient-pointer (Apple Vision Pro eye+pinch) or Gaze session select
                const activeCam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
                vrRaycaster.setFromCamera(centerNdc, activeCam);
            }

            const hapticOpts = {
                handedness: slot?.handedness === 'left' || slot?.handedness === 'right' ? slot.handedness : ('any' as const),
                inputSource: inputSource || null,
                runtimeProfile: slot?.runtimeProfile || 'generic_xr'
            };

            // 1. If a direct fingertip proximity hit on a DNA nucleotide was provided, select it immediately
            if (directHandHitOverride && directHandHitOverride.object.userData?.type) {
                triggerVrComponentSelect(directHandHitOverride.object);
                triggerUniversalXrHaptics(xrSessionRef.current, 0.72, 45, hapticOpts);
                return;
            }

            // 2. Check if user clicked the 3D Floating Holographic Card to toggle VR Game Mode inside headset
            const cardHits = vrRaycaster.intersectObjects(vrInspectorCardGroup.children, false);
            if (cardHits.length > 0 && onToggleVrGame) {
                onToggleVrGame();
                triggerUniversalXrHaptics(xrSessionRef.current, 0.75, 60, hapticOpts);
                return;
            }

            // 3. Raycast against interactive DNA nucleotides with magnetic aim-assist
            const activeMeshes = getActiveInteractiveDnaMeshes();
            const hit = intersectDnaWithMagneticAssist(activeMeshes, renderer.xr.isPresenting);
            if (hit) {
                triggerVrComponentSelect(hit.object);
                triggerUniversalXrHaptics(xrSessionRef.current, 0.68, 45, hapticOpts);
            }
        };

        /**
         * WebXR Hand Input API Per-Frame Processor:
         * Extracts 25 articulated joint poses via `xrFrame.getJointPose(jointSpace, refSpace)`
         * (with fallback to `renderer.xr.getHand(i).joints`), updates the 3D bio-holographic
         * hand skeleton and pinch energy orb, and runs the Pinch-to-Select, Pinch-Drag-to-Rotate,
         * and Fist-Grab gesture state machine.
         */
        const updateXrHandSlotFromFrame = (
            slotIdx: number,
            slot: UnifiedControllerSlotState,
            src: XRInputSource | null,
            xrFrame: XRFrame | undefined,
            activeMeshes: THREE.Mesh[],
            nowMs: number
        ): {
            isHandActive: boolean;
            handHit: THREE.Intersection | null;
            isDirectProximityHit: boolean;
        } => {
            const hs = handSlots[slotIdx];
            const xrHand = src ? (src as any).hand : null;

            if (!src || !xrHand) {
                if (hs.isHandTracking) {
                    hs.isHandTracking = false;
                    hs.isPinching = false;
                    hs.isDraggingHelix = false;
                    hs.isFistGrabbing = false;
                    hs.gesture = 'none';
                    hs.visualRig.group.visible = false;
                    hs.wandGroup.visible = true;
                }
                return { isHandActive: false, handHit: null, isDirectProximityHit: false };
            }

            hs.isHandTracking = true;
            hs.wandGroup.visible = false;
            slot.runtimeProfile = 'vision_pro_hand';
            vrRigGroup.updateWorldMatrix(true, false);

            const refSpace = renderer.xr.getReferenceSpace();
            const getJointPoseFn = xrFrame && typeof (xrFrame as any).getJointPose === 'function'
                ? (xrFrame as any).getJointPose.bind(xrFrame)
                : null;
            const threeHandJoints = (hs.xrHandSpace as any)?.joints || null;

            let validJointCount = 0;

            for (let j = 0; j < XR_HAND_JOINT_NAMES.length; j++) {
                const jointName = XR_HAND_JOINT_NAMES[j];
                let jointExtracted = false;
                let jointRadius = j === 0 ? 0.014 : (j === 4 || j === 9 || j === 14 || j === 19 || j === 24) ? 0.0085 : 0.0075;

                // 1. Primary W3C WebXR Hand Input API: xrFrame.getJointPose(jointSpace, refSpace)
                if (getJointPoseFn && refSpace) {
                    try {
                        const jointSpace = typeof xrHand.get === 'function' ? xrHand.get(jointName) : xrHand[jointName];
                        if (jointSpace) {
                            const jPose = getJointPoseFn(jointSpace, refSpace);
                            if (jPose && jPose.transform) {
                                const p = jPose.transform.position;
                                scratchJointLocalPos.set(p.x, p.y, p.z).applyMatrix4(vrRigGroup.matrixWorld);
                                hs.jointWorldPositions[j].copy(scratchJointLocalPos);
                                if (typeof jPose.radius === 'number' && jPose.radius > 0.002) {
                                    jointRadius = jPose.radius * 1.12;
                                }
                                jointExtracted = true;
                            }
                        }
                    } catch {
                        // Fallback to Three.js hand joint object below
                    }
                }

                // 2. Fallback to Three.js WebXRManager XRHandSpace.joints[jointName]
                if (!jointExtracted && threeHandJoints && threeHandJoints[jointName]) {
                    const tj = threeHandJoints[jointName] as THREE.Object3D & { jointRadius?: number };
                    tj.updateWorldMatrix(true, false);
                    tj.getWorldPosition(scratchJointLocalPos);
                    if (scratchJointLocalPos.lengthSq() > 0.00001) {
                        hs.jointWorldPositions[j].copy(scratchJointLocalPos);
                        if (typeof tj.jointRadius === 'number' && tj.jointRadius > 0.002) {
                            jointRadius = tj.jointRadius * 1.12;
                        }
                        jointExtracted = true;
                    }
                }

                hs.jointValid[j] = jointExtracted;
                const jMesh = hs.visualRig.jointMeshes[j];
                if (jointExtracted) {
                    validJointCount++;
                    jMesh.visible = true;
                    jMesh.position.copy(hs.jointWorldPositions[j]);
                    jMesh.scale.setScalar(jointRadius);
                } else {
                    jMesh.visible = false;
                }
            }

            if (validJointCount < 4) {
                hs.visualRig.group.visible = false;
                return { isHandActive: true, handHit: null, isDirectProximityHit: false };
            }

            hs.visualRig.group.visible = true;

            // Update 24 articulated bone segments in-place (zero allocations)
            const bonePosAttr = hs.visualRig.boneGeo.attributes.position as THREE.BufferAttribute;
            for (let b = 0; b < XR_HAND_BONE_PAIRS.length; b++) {
                const [idxA, idxB] = XR_HAND_BONE_PAIRS[b];
                const posA = hs.jointWorldPositions[idxA];
                const posB = hs.jointWorldPositions[idxB];
                const bothValid = hs.jointValid[idxA] && hs.jointValid[idxB];
                const vOffset = b * 2;
                if (bothValid) {
                    bonePosAttr.setXYZ(vOffset, posA.x, posA.y, posA.z);
                    bonePosAttr.setXYZ(vOffset + 1, posB.x, posB.y, posB.z);
                } else {
                    bonePosAttr.setXYZ(vOffset, 0, 0, 0);
                    bonePosAttr.setXYZ(vOffset + 1, 0, 0, 0);
                }
            }
            bonePosAttr.needsUpdate = true;

            const thumbTip = hs.jointWorldPositions[4];
            const indexTip = hs.jointWorldPositions[9];
            const wristPos = hs.jointWorldPositions[0];
            const indexProximal = hs.jointWorldPositions[6];

            // Compute Euclidean thumb-to-index pinch distance & normalized strength (0..1)
            const pinchDistMeters = (hs.jointValid[4] && hs.jointValid[9])
                ? thumbTip.distanceTo(indexTip)
                : 0.065;
            hs.pinchDistanceMm = Math.round(pinchDistMeters * 1000);
            hs.pinchStrength = Number(
                THREE.MathUtils.clamp((0.068 - pinchDistMeters) / (0.068 - 0.018), 0, 1).toFixed(2)
            );
            slot.triggerValue = hs.pinchStrength;

            // Compute 3D Pinch Midpoint and update glowing bio-holographic Pinch Reticle Orb
            hs.pinchMidpointWorld.addVectors(thumbTip, indexTip).multiplyScalar(0.5);
            hs.visualRig.pinchOrbMesh.position.copy(hs.pinchMidpointWorld);
            const orbScale = 0.65 + hs.pinchStrength * 0.95;
            hs.visualRig.pinchOrbMesh.scale.setScalar(orbScale);
            hs.visualRig.pinchRingMesh.lookAt(renderer.xr.getCamera().position);

            // Determine Pinch active state with hysteresis
            const rawPinchActive = hs.isPinching
                ? pinchDistMeters < PINCH_RELEASE_METERS
                : pinchDistMeters <= PINCH_ENGAGE_METERS;

            // Check Direct Fingertip / Pinch-Midpoint Proximity to DNA Nucleotides
            const directProximityHit = findDirectHandProximityDnaHit(
                hs.pinchMidpointWorld,
                activeMeshes,
                0.115
            );

            // Configure precision hand ray (prefers WebXR targetRaySpace, falls back to wrist/index-proximal -> pinchMidpoint vector)
            let hasHandRay = configureUnifiedRayFromController(slot, src, xrFrame);
            if (!hasHandRay && hs.jointValid[6]) {
                scratchHandAimDir.subVectors(hs.pinchMidpointWorld, indexProximal).normalize();
                if (scratchHandAimDir.lengthSq() > 0.001) {
                    vrRaycaster.set(hs.pinchMidpointWorld, scratchHandAimDir);
                    hasHandRay = true;
                }
            }

            let rayHit: THREE.Intersection | null = null;
            if (directProximityHit) {
                rayHit = directProximityHit;
                slot.laserLine.visible = false;
            } else if (hasHandRay) {
                slot.laserLine.visible = true;
                rayHit = intersectDnaWithMagneticAssist(activeMeshes, true);
                const beamLen = rayHit ? Math.max(0.12, Math.min(rayHit.distance, 18)) : 12;
                slot.laserLine.scale.set(1, 1, beamLen);
                slot.laserMat.opacity = rayHit || hs.pinchStrength > 0.35 ? 0.96 : 0.55;
            }

            // ====================================================================
            // GESTURE STATE MACHINE: PINCH-TO-SELECT vs PINCH-DRAG-TO-ROTATE
            // ====================================================================
            if (!hs.isPinching && rawPinchActive) {
                // Pinch Onset
                hs.isPinching = true;
                hs.isDraggingHelix = false;
                hs.isFistGrabbing = false;
                hs.pinchStartTimeMs = nowMs;
                hs.pinchStartWorld.copy(hs.pinchMidpointWorld);
                if (dnaGroupRef.current) {
                    hs.dragStartHelixRotY = dnaGroupRef.current.rotation.y;
                    hs.dragStartHelixRotX = dnaGroupRef.current.rotation.x;
                    hs.dragStartHelixPosY = dnaGroupRef.current.position.y;
                }
                hs.gesture = 'pinch_select';
                slot.lastActiveTimeMs = nowMs;
                activeDominantSlotIdx = slotIdx;
                hs.visualRig.pinchOrbMat.color.setHex(0xfbbf24);
                vrSound.playHoverTick();
            } else if (hs.isPinching && rawPinchActive) {
                // Pinch Held: check movement delta from pinch onset
                scratchHandDragDelta.subVectors(hs.pinchMidpointWorld, hs.pinchStartWorld);
                const dragDistMeters = scratchHandDragDelta.length();

                if (dragDistMeters > PINCH_DRAG_DEADZONE_METERS || hs.isDraggingHelix) {
                    hs.isDraggingHelix = true;
                    hs.gesture = bimanualPinchActive ? 'bimanual_scale' : 'pinch_drag';
                    hs.visualRig.pinchOrbMat.color.setHex(0x34d399);

                    // Single-hand Pinch-Drag-to-Rotate & Elevate (when not in bimanual two-hand scale mode)
                    if (!bimanualPinchActive && dnaGroupRef.current) {
                        dnaGroupRef.current.rotation.y = hs.dragStartHelixRotY + scratchHandDragDelta.x * 4.85;
                        dnaGroupRef.current.rotation.x = THREE.MathUtils.clamp(
                            hs.dragStartHelixRotX + scratchHandDragDelta.z * 1.45,
                            -0.65,
                            0.65
                        );
                        dnaGroupRef.current.position.y = THREE.MathUtils.clamp(
                            hs.dragStartHelixPosY + scratchHandDragDelta.y * 1.55,
                            0.35,
                            3.1
                        );
                    }
                } else {
                    hs.gesture = 'pinch_select';
                    hs.visualRig.pinchOrbMat.color.setHex(0xfbbf24);
                }
            } else if (hs.isPinching && !rawPinchActive) {
                // Pinch Released: if the user did NOT drag to rotate, execute Pinch-to-Select!
                if (!hs.isDraggingHelix) {
                    executeUnifiedRaySelection(slot, src, xrFrame, directProximityHit);
                }
                hs.isPinching = false;
                hs.isDraggingHelix = false;
                hs.gesture = 'open';
                hs.visualRig.pinchOrbMat.color.setHex(slotIdx === 0 ? 0x38bdf8 : 0x34d399);
            } else {
                // Not pinching: evaluate Whole-Hand Fist Curl Grab ('fist_grab') or Point/Open posture
                hs.visualRig.pinchOrbMat.color.setHex(slotIdx === 0 ? 0x38bdf8 : 0x34d399);
                if (hs.jointValid[0] && hs.jointValid[9] && hs.jointValid[14] && hs.jointValid[19] && hs.jointValid[24]) {
                    const dIndex = hs.jointWorldPositions[9].distanceTo(wristPos);
                    const dMiddle = hs.jointWorldPositions[14].distanceTo(wristPos);
                    const dRing = hs.jointWorldPositions[19].distanceTo(wristPos);
                    const dPinky = hs.jointWorldPositions[24].distanceTo(wristPos);
                    const avgCurlDist = (dIndex + dMiddle + dRing + dPinky) * 0.25;

                    const fistActive = hs.isFistGrabbing
                        ? avgCurlDist < FIST_RELEASE_METERS
                        : avgCurlDist <= FIST_ENGAGE_METERS;

                    if (!hs.isFistGrabbing && fistActive && dnaGroupRef.current) {
                        hs.isFistGrabbing = true;
                        hs.fistStartWorld.copy(wristPos);
                        hs.dragStartHelixRotY = dnaGroupRef.current.rotation.y;
                        hs.dragStartHelixPosY = dnaGroupRef.current.position.y;
                        hs.gesture = 'fist_grab';
                        slot.lastActiveTimeMs = nowMs;
                        activeDominantSlotIdx = slotIdx;
                        vrSound.playHoverTick();
                    } else if (hs.isFistGrabbing && fistActive && dnaGroupRef.current) {
                        hs.gesture = 'fist_grab';
                        const dx = wristPos.x - hs.fistStartWorld.x;
                        const dy = wristPos.y - hs.fistStartWorld.y;
                        dnaGroupRef.current.rotation.y = hs.dragStartHelixRotY + dx * 4.5;
                        dnaGroupRef.current.position.y = THREE.MathUtils.clamp(
                            hs.dragStartHelixPosY + dy * 1.5,
                            0.35,
                            3.1
                        );
                    } else {
                        hs.isFistGrabbing = false;
                        // Check if index finger is extended while middle/ring/pinky are curled ('point')
                        const isPointing = dIndex > 0.125 && (dMiddle + dRing + dPinky) / 3 < 0.105;
                        hs.gesture = isPointing ? 'point' : 'open';
                    }
                } else {
                    hs.gesture = 'open';
                }
            }

            return {
                isHandActive: true,
                handHit: rayHit,
                isDirectProximityHit: Boolean(directProximityHit)
            };
        };

        controller0.addEventListener('selectstart', () => {
            controllerSlots[0].triggerPressed = true;
            controllerSlots[0].triggerValue = 1.0;
            // When articulated hand tracking is active on slot 0, pinch-to-select vs drag disambiguation handles selection on release
            if (!handSlots[0].isHandTracking) {
                executeUnifiedRaySelection(controllerSlots[0]);
            }
        });
        controller0.addEventListener('selectend', () => {
            controllerSlots[0].triggerPressed = false;
            controllerSlots[0].triggerValue = 0;
        });
        controller1.addEventListener('selectstart', () => {
            controllerSlots[1].triggerPressed = true;
            controllerSlots[1].triggerValue = 1.0;
            if (!handSlots[1].isHandTracking) {
                executeUnifiedRaySelection(controllerSlots[1]);
            }
        });
        controller1.addEventListener('selectend', () => {
            controllerSlots[1].triggerPressed = false;
            controllerSlots[1].triggerValue = 0;
        });

        // 6-DoF Squeeze / Grip Manipulation (Grab & Rotate DNA Helix directly in VR)
        let grabbedController: THREE.Object3D | null = null;
        const grabStartCtrlPos = new THREE.Vector3();
        let grabStartHelixRotY = 0;
        let grabStartHelixPosY = 1.45;

        const onSqueezeStart = (ctrl: THREE.Object3D, slotIdx: number, inputSource?: XRInputSource | null) => {
            if (!dnaGroupRef.current) return;
            const slot = controllerSlots[slotIdx];
            slot.squeezePressed = true;
            slot.lastActiveTimeMs = performance.now();
            activeDominantSlotIdx = slotIdx;
            grabbedController = ctrl;
            ctrl.getWorldPosition(grabStartCtrlPos);
            grabStartHelixRotY = dnaGroupRef.current.rotation.y;
            grabStartHelixPosY = dnaGroupRef.current.position.y;
            triggerUniversalXrHaptics(xrSessionRef.current, 0.52, 35, {
                handedness: slot.handedness === 'left' || slot.handedness === 'right' ? slot.handedness : 'any',
                inputSource: inputSource || null,
                runtimeProfile: slot.runtimeProfile
            });
        };
        const onSqueezeEnd = (ctrl: THREE.Object3D, slotIdx: number) => {
            controllerSlots[slotIdx].squeezePressed = false;
            if (grabbedController === ctrl) {
                grabbedController = null;
            }
        };

        controller0.addEventListener('squeezestart', () => onSqueezeStart(controller0, 0));
        controller0.addEventListener('squeezeend', () => onSqueezeEnd(controller0, 0));
        controller1.addEventListener('squeezestart', () => onSqueezeStart(controller1, 1));
        controller1.addEventListener('squeezeend', () => onSqueezeEnd(controller1, 1));

        vrRigGroup.add(controller0);
        vrRigGroup.add(controller1);

        // Session-level inputSource listener for transient-pointer (Vision Pro / Hand Pinch) & hot-swapped controllers
        const onSessionSelectStart = (event: XRInputSourceEvent) => {
            const src = event.inputSource;
            const session = renderer.xr.getSession();
            if (!session) return;
            const idx = Array.from(session.inputSources).indexOf(src);
            const matchedSlot = idx === 0 || idx === 1 ? controllerSlots[idx] : null;
            if (matchedSlot) {
                const { profile, pitchOffsetRad } = detectXrRuntimeProfile(src);
                matchedSlot.runtimeProfile = profile;
                matchedSlot.pitchOffsetRad = pitchOffsetRad;
                matchedSlot.handedness = src.handedness || matchedSlot.handedness;
                matchedSlot.targetRayMode = src.targetRayMode || 'tracked-pointer';
            }
            // If articulated 25-joint hand tracking is active on this slot, let the pinch/drag state machine disambiguate tap vs drag
            if (idx === 0 || idx === 1) {
                if (handSlots[idx].isHandTracking || Boolean((src as any).hand)) {
                    return;
                }
            }
            executeUnifiedRaySelection(matchedSlot, src, event.frame);
        };

        // WebXR Session Start & End Handlers (adapts DNA scale, position & hardware depth clip planes for VR headsets)
        const onXrSessionStart = () => {
            const session = renderer.xr.getSession();
            if (session) {
                xrSessionRef.current = session;
                session.addEventListener('selectstart', onSessionSelectStart);
            }
            synchronizeXrDepthAndCameraPlanes(true, session);
            vrRigGroup.position.set(0, 0, 0);
            vrRigGroup.rotation.set(0, 0, 0);
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
            if (xrSessionRef.current) {
                try {
                    xrSessionRef.current.removeEventListener('selectstart', onSessionSelectStart);
                } catch {
                    // Ignore if session already closed
                }
            }
            xrSessionRef.current = null;
            grabbedController = null;
            bimanualPinchActive = false;
            for (let i = 0; i < handSlots.length; i++) {
                handSlots[i].isHandTracking = false;
                handSlots[i].isPinching = false;
                handSlots[i].isDraggingHelix = false;
                handSlots[i].isFistGrabbing = false;
                handSlots[i].gesture = 'none';
                handSlots[i].visualRig.group.visible = false;
                handSlots[i].wandGroup.visible = true;
            }
            synchronizeXrDepthAndCameraPlanes(false);
            vrRigGroup.position.set(0, 0, 0);
            vrRigGroup.rotation.set(0, 0, 0);
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

        // Mobile Gyroscope 3-DoF Head-Tracking Listener for Stereo 360° Cardboard Headsets
        let lastGyroAlpha: number | null = null;
        let lastGyroBeta: number | null = null;
        const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
            if (!stateRef.current.isVrModeActive || renderer.xr.isPresenting || activePointers.size > 0) {
                lastGyroAlpha = null;
                lastGyroBeta = null;
                return;
            }
            if (typeof e.alpha === 'number' && typeof e.beta === 'number') {
                if (lastGyroAlpha !== null && lastGyroBeta !== null) {
                    let dAlpha = e.alpha - lastGyroAlpha;
                    if (dAlpha > 180) dAlpha -= 360;
                    if (dAlpha < -180) dAlpha += 360;
                    const dBeta = e.beta - lastGyroBeta;
                    if (Math.abs(dAlpha) < 25 && Math.abs(dBeta) < 25) {
                        customCam.applyRotateDelta(
                            THREE.MathUtils.degToRad(dAlpha * 0.55),
                            THREE.MathUtils.degToRad(dBeta * 0.45)
                        );
                    }
                }
                lastGyroAlpha = e.alpha;
                lastGyroBeta = e.beta;
            }
        };
        window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });

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

                const dMidX = newMidX - prevMidX;
                const dMidY = newMidY - prevMidY;
                customCam.applyScreenPanDelta(dMidX, dMidY, domEl.clientHeight || window.innerHeight);

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

        // Universal Keyboard Controls (Arrows + WASD + QE + Space/Enter for VR Game CRISPR Repair)
        const pressedKeys = new Set<string>();
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

            pressedKeys.add(e.code);
            const isPanKey = e.shiftKey || stateRef.current.cameraControlMode === 'pan';
            const vh = domEl.clientHeight || window.innerHeight;
            const panStepPx = 28;
            const rotStepRad = THREE.MathUtils.degToRad(8);

            // Spacebar or Enter repairs the current CRISPR target or selects hovered nucleotide
            if ((e.code === 'Space' || e.code === 'Enter') && (stateRef.current.isVrGameActive || stateRef.current.isVrModeActive)) {
                e.preventDefault();
                const g = vrGameStateRef.current;
                const targetPairContainer = pairDynamicContainersRef.current[g.targetPairIndex];
                if (g.active && targetPairContainer) {
                    let meshFound: THREE.Object3D | null = null;
                    targetPairContainer.traverse(ch => {
                        if (!meshFound && (ch as THREE.Mesh).isMesh && ch.userData?.type) {
                            meshFound = ch;
                        }
                    });
                    if (meshFound) {
                        triggerVrComponentSelect(meshFound);
                        return;
                    }
                }
            }

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

        const handleKeyUp = (e: KeyboardEvent) => {
            pressedKeys.delete(e.code);
        };

        domEl.addEventListener('contextmenu', handleContextMenu);
        domEl.addEventListener('pointerdown', handlePointerDown);
        domEl.addEventListener('pointermove', handlePointerMove);
        domEl.addEventListener('pointerup', handlePointerUpOrCancel);
        domEl.addEventListener('pointercancel', handlePointerUpOrCancel);
        domEl.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // WebXR-Compatible Render Loop via setAnimationLoop
        let thermalPhase = 0;
        let prevFrameTimestamp = performance.now();
        let smoothedFrameIntervalMs = 11.1;
        let smoothedGpuPipelineMs = 3.2;
        let lastTelemetryEmitTime = 0;
        let lastGameUiSyncTime = 0;
        let smoothedDofFocusDist = 46.0;
        let smoothedDofMaxBlur = 0.0022;
        let smoothedDofAperture = stateRef.current.dofAperture;

        // VR Gaze-Dwell, Snap-Turn & Gamepad Button Debounce State
        let dwellHoveredType: string | null = null;
        let dwellElapsedMs = 0;
        let dwellTriggered = false;
        let lastPointerEmitTime = 0;
        let lastCardRedrawTime = 0;
        let snapTurnCooldownMs = 0;
        let prevGamepadTriggerPressed = false;
        const centerNdc = new THREE.Vector2(0, 0);
        const tempWorldPos = new THREE.Vector3();

        const render = (now: number, xrFrame?: XRFrame) => {
            const frameStartPerf = performance.now();
            const rawDeltaMs = now - prevFrameTimestamp;
            prevFrameTimestamp = now;
            const dt = Math.min(Math.max(rawDeltaMs, 1) / 1000, 0.05);

            if (rawDeltaMs > 1 && rawDeltaMs < 200) {
                smoothedFrameIntervalMs = smoothedFrameIntervalMs * 0.88 + rawDeltaMs * 0.12;
            }
            if (snapTurnCooldownMs > 0) {
                snapTurnCooldownMs = Math.max(0, snapTurnCooldownMs - Math.min(rawDeltaMs, 50));
            }

            // Update tweens
            for (let i = activeTweensRef.current.length - 1; i >= 0; i--) {
                if (activeTweensRef.current[i].update(now)) {
                    activeTweensRef.current.splice(i, 1);
                }
            }

            // Update Interactive VR CRISPR Game Timer & 3D Target Beacon Position
            if (vrGameStateRef.current.active) {
                const g = vrGameStateRef.current;
                g.timeRemainingSec = Math.max(0, g.timeRemainingSec - dt);
                if (g.timeRemainingSec <= 0) {
                    // Auto-cycle new round while keeping high score excitement
                    g.timeRemainingSec = 60;
                    g.combo = 1;
                    g.lastEventLabel = `Babak Baru Dimulai! Skor Terakhir: ${g.score} Poin`;
                    vrSound.playGameStateChange(false);
                    pickNextVrGameTarget(g.targetPairIndex);
                }

                const targetPairObj = pairDynamicContainersRef.current[g.targetPairIndex];
                if (targetPairObj && dnaGroupRef.current) {
                    dnaGroupRef.current.updateMatrixWorld(true);
                    targetPairObj.getWorldPosition(tempWorldPos);
                    vrGameBeaconGroup.visible = true;
                    vrGameBeaconGroup.position.copy(tempWorldPos);
                    const scaleFactor = renderer.xr.isPresenting ? 0.11 : 1.0;
                    const pulse = 1.0 + Math.sin(now * 0.008) * 0.18;
                    vrGameBeaconGroup.scale.setScalar(scaleFactor * pulse);
                    beaconCrystal.rotation.y += dt * 2.4;
                    beaconCrystal.rotation.x += dt * 1.6;
                    beaconOuterRing.lookAt(renderer.xr.isPresenting ? renderer.xr.getCamera().position : camera.position);
                } else {
                    vrGameBeaconGroup.visible = false;
                }

                if (now - lastGameUiSyncTime > 240) {
                    lastGameUiSyncTime = now;
                    emitVrGameTelemetryNow();
                    drawFloatingVrInspectorCard(stateRef.current.selectedComponentKey, dwellHoveredType, 0);
                }
            } else {
                vrGameBeaconGroup.visible = false;
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

            // Auto Rotation (pauses automatically during controller squeeze grab or WebXR hand pinch-drag / fist-grab)
            const isHandManipulatingHelix =
                bimanualPinchActive ||
                handSlots[0].isDraggingHelix ||
                handSlots[1].isDraggingHelix ||
                handSlots[0].isFistGrabbing ||
                handSlots[1].isFistGrabbing;
            if (stateRef.current.autoRotate && dnaGroupRef.current && !grabbedController && !isHandManipulatingHelix) {
                dnaGroupRef.current.rotation.y += 0.0035;
                if (focusedTargetRef.current && customCamRef.current && activePointers.size === 0) {
                    customCamRef.current.sphericalTarget.theta += 0.0035;
                }
            }

            // Continuous WASD / QE Keyboard Locomotion (smooth frame-rate independent)
            if (pressedKeys.size > 0 && customCamRef.current) {
                const rotSpd = 1.65 * dt;
                const panSpd = 420 * dt;
                const vh = domEl.clientHeight || window.innerHeight;
                if (pressedKeys.has('KeyA')) customCamRef.current.applyRotateDelta(rotSpd, 0);
                if (pressedKeys.has('KeyD')) customCamRef.current.applyRotateDelta(-rotSpd, 0);
                if (pressedKeys.has('KeyW')) customCamRef.current.applyRotateDelta(0, rotSpd * 0.8);
                if (pressedKeys.has('KeyS')) customCamRef.current.applyRotateDelta(0, -rotSpd * 0.8);
                if (pressedKeys.has('KeyQ')) customCamRef.current.applyScreenPanDelta(0, panSpd, vh);
                if (pressedKeys.has('KeyE')) customCamRef.current.applyScreenPanDelta(0, -panSpd, vh);
            }

            // Universal HTML5 Gamepad Polling (Xbox, PlayStation, PC VR Gamepad, Bluetooth VR Remote)
            let activeGamepadCount = 0;
            if (!renderer.xr.isPresenting && typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
                try {
                    const pads = navigator.getGamepads();
                    for (const pad of pads) {
                        if (!pad || !pad.connected) continue;
                        activeGamepadCount++;
                        const lx = pad.axes[0] || 0;
                        const ly = pad.axes[1] || 0;
                        const rx = pad.axes[2] || 0;
                        const ry = pad.axes[3] || 0;

                        if (customCamRef.current) {
                            if (Math.abs(lx) > 0.14 || Math.abs(ly) > 0.14) {
                                customCamRef.current.applyRotateDelta(-lx * 2.1 * dt, -ly * 1.6 * dt);
                            }
                            if (Math.abs(rx) > 0.16) {
                                if (stateRef.current.vrLocomotionMode === 'snap') {
                                    if (snapTurnCooldownMs <= 0 && Math.abs(rx) > 0.6) {
                                        customCamRef.current.applyRotateDelta(-Math.sign(rx) * THREE.MathUtils.degToRad(30), 0);
                                        snapTurnCooldownMs = 280;
                                    }
                                } else {
                                    customCamRef.current.applyRotateDelta(-rx * 2.2 * dt, 0);
                                }
                            }
                            if (Math.abs(ry) > 0.16) {
                                customCamRef.current.applyScreenPanDelta(0, -ry * 520 * dt, domEl.clientHeight || window.innerHeight);
                            }
                        }

                        const triggerPressed = Boolean(
                            pad.buttons[0]?.pressed || pad.buttons[7]?.pressed || pad.buttons[5]?.pressed
                        );
                        if (triggerPressed && !prevGamepadTriggerPressed) {
                            prevGamepadTriggerPressed = true;
                            vrRaycaster.setFromCamera(centerNdc, camera);
                            const gHits = vrRaycaster.intersectObjects(getActiveInteractiveDnaMeshes(), false);
                            if (gHits.length > 0) {
                                triggerVrComponentSelect(gHits[0].object);
                            }
                        } else if (!triggerPressed) {
                            prevGamepadTriggerPressed = false;
                        }
                        break;
                    }
                } catch {
                    // Ignore Gamepad API restrictions
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
                        const latencyMs = Number(
                            THREE.MathUtils.clamp(smoothedFrameIntervalMs * 0.55 + smoothedGpuPipelineMs + 2.4, 6.2, 48.0).toFixed(1)
                        );
                        const fps = Math.round(THREE.MathUtils.clamp(1000 / Math.max(smoothedFrameIntervalMs, 6.5), 24, 120));
                        onUpdateVrPerformance({ latencyMs, fps });
                    }
                }
            };

            // Update Unified Multi-Headset XR Raycaster, WebXR Hand Input API, Gaze-Dwell Selection & 3D Floating Inspector Card
            if ((stateRef.current.isVrModeActive || stateRef.current.isVrGameActive || renderer.xr.isPresenting) && dnaGroupRef.current) {
                let hitResult: THREE.Intersection | null = null;
                let pointerMode: 'controller_ray' | 'gaze_dwell' | 'gamepad_ray' | 'hand_pinch' | 'hand_direct' =
                    activeGamepadCount > 0 ? 'gamepad_ray' : 'gaze_dwell';
                const activeMeshes = getActiveInteractiveDnaMeshes();
                let xrCtrlCount = 0;
                let activeHandReport: 'left' | 'right' | 'none' = 'none';
                let activeRuntimeReport: XrRuntimeProfile = activeGamepadCount > 0 ? 'gamepad' : 'gaze';
                let activeTriggerPressure = 0;
                let activeTargetRayMode: 'tracked-pointer' | 'gaze' | 'screen' | 'transient-pointer' = 'gaze';
                let activeIsHandTracking = false;
                let activeHandGesture: XrHandGestureState = 'none';
                let activePinchStrength = 0;
                let activePinchDistanceMm = 65;

                // 1. Unified Multi-Headset 6-DoF WebXR Controller & WebXR Hand Input API Polling
                if (renderer.xr.isPresenting) {
                    const session = renderer.xr.getSession();
                    const inputSources = session?.inputSources ? Array.from(session.inputSources) : [];
                    xrCtrlCount = inputSources.length || 2;

                    const slotHits: (THREE.Intersection | null)[] = [null, null];
                    const slotIsDirectHand: boolean[] = [false, false];

                    for (let i = 0; i < controllerSlots.length; i++) {
                        const slot = controllerSlots[i];
                        const src = inputSources[i] || null;

                        if (src) {
                            const { profile, pitchOffsetRad } = detectXrRuntimeProfile(src);
                            slot.runtimeProfile = profile;
                            slot.pitchOffsetRad = pitchOffsetRad;
                            slot.handedness = src.handedness || (i === 0 ? 'right' : 'left');
                            slot.targetRayMode = src.targetRayMode || 'tracked-pointer';
                        }

                        // A. Check if this XRInputSource exposes an articulated WebXR Hand (`inputSource.hand`)
                        const handUpdate = updateXrHandSlotFromFrame(i, slot, src, xrFrame, activeMeshes, now);
                        if (handUpdate.isHandActive) {
                            slotHits[i] = handUpdate.handHit;
                            slotIsDirectHand[i] = handUpdate.isDirectProximityHit;
                            continue;
                        }

                        // B. Standard 6-DoF Controller / Gamepad / Transient-Pointer InputSource Processing
                        slot.laserLine.visible = true;
                        if (src) {
                            const {
                                effectiveTriggerVal,
                                effectiveSqueezeVal,
                                thumbstickClickedEdge,
                                secondaryButtonEdge
                            } = normalizeXrInputSourceState(slot, src);

                            slot.triggerValue = effectiveTriggerVal;
                            slot.squeezeValue = effectiveSqueezeVal;

                            // Primary Trigger / Touchpad Click / A-X Face Button Selection with Hysteresis
                            if (!slot.triggerPressed && effectiveTriggerVal >= TRIGGER_PRESS_THRESHOLD) {
                                slot.triggerPressed = true;
                                slot.lastActiveTimeMs = now;
                                activeDominantSlotIdx = i;
                                executeUnifiedRaySelection(slot, src, xrFrame);
                            } else if (slot.triggerPressed && effectiveTriggerVal < TRIGGER_RELEASE_THRESHOLD) {
                                slot.triggerPressed = false;
                            }

                            // Squeeze / Grip Button (buttons[1]) for 6-DoF Helix Manipulation
                            if (!slot.squeezePressed && effectiveSqueezeVal >= SQUEEZE_PRESS_THRESHOLD) {
                                onSqueezeStart(slot.controller, i, src);
                            } else if (slot.squeezePressed && effectiveSqueezeVal < SQUEEZE_RELEASE_THRESHOLD) {
                                onSqueezeEnd(slot.controller, i);
                            }

                            // Thumbstick Click L3 / R3 (buttons[3]): Recenter VR Rig & Reset DNA Helix Pose
                            if (thumbstickClickedEdge && dnaGroupRef.current) {
                                vrRigGroup.position.set(0, 0, 0);
                                dnaGroupRef.current.position.set(0, 1.45, -2.5);
                                dnaGroupRef.current.rotation.y = 0;
                                dnaGroupRef.current.scale.setScalar(0.085);
                                triggerUniversalXrHaptics(session, 0.55, 45, {
                                    handedness: slot.handedness === 'left' || slot.handedness === 'right' ? slot.handedness : 'any',
                                    inputSource: src,
                                    runtimeProfile: slot.runtimeProfile
                                });
                            }

                            // Secondary Face Button B / Y / Menu (buttons[5]): Toggle VR CRISPR Repair Game directly
                            if (secondaryButtonEdge && onToggleVrGame) {
                                onToggleVrGame();
                                triggerUniversalXrHaptics(session, 0.65, 50, {
                                    handedness: slot.handedness === 'left' || slot.handedness === 'right' ? slot.handedness : 'any',
                                    inputSource: src,
                                    runtimeProfile: slot.runtimeProfile
                                });
                            }
                        }

                        const hasPose = configureUnifiedRayFromController(slot, src, xrFrame);
                        if (hasPose) {
                            const cHit = intersectDnaWithMagneticAssist(activeMeshes, true);
                            slotHits[i] = cHit;
                            const beamLen = cHit ? Math.max(0.15, Math.min(cHit.distance, 18)) : 14;
                            slot.laserLine.scale.set(1, 1, beamLen);
                            slot.laserMat.opacity = cHit || slot.triggerValue > 0.2 ? 0.98 : 0.65;
                        }
                    }

                    // Bimanual Two-Hand Pinch Manipulation (simultaneous left + right hand pinch scales & twists DNA helix)
                    if (
                        handSlots[0].isHandTracking &&
                        handSlots[1].isHandTracking &&
                        handSlots[0].isPinching &&
                        handSlots[1].isPinching &&
                        dnaGroupRef.current
                    ) {
                        const p0 = handSlots[0].pinchMidpointWorld;
                        const p1 = handSlots[1].pinchMidpointWorld;
                        const currSpan = Math.max(0.04, p0.distanceTo(p1));
                        const currAzimuth = Math.atan2(p1.z - p0.z, p1.x - p0.x);

                        if (!bimanualPinchActive) {
                            bimanualPinchActive = true;
                            bimanualStartDist = currSpan;
                            bimanualStartScale = dnaGroupRef.current.scale.x;
                            bimanualStartAngle = currAzimuth;
                            bimanualStartRotY = dnaGroupRef.current.rotation.y;
                            handSlots[0].isDraggingHelix = true;
                            handSlots[1].isDraggingHelix = true;
                            vrSound.playHoverTick();
                        } else {
                            const scaleRatio = currSpan / Math.max(0.04, bimanualStartDist);
                            const nextScale = THREE.MathUtils.clamp(bimanualStartScale * scaleRatio, 0.045, 0.22);
                            dnaGroupRef.current.scale.setScalar(nextScale);

                            let deltaAngle = currAzimuth - bimanualStartAngle;
                            if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                            if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
                            dnaGroupRef.current.rotation.y = bimanualStartRotY - deltaAngle * 1.35;
                        }
                        handSlots[0].gesture = 'bimanual_scale';
                        handSlots[1].gesture = 'bimanual_scale';
                    } else {
                        bimanualPinchActive = false;
                    }

                    // Arbitrate between dual hand controllers/hands: prefer active dominant hand if it hits, else the other hand
                    const primaryIdx = activeDominantSlotIdx;
                    const secondaryIdx = primaryIdx === 0 ? 1 : 0;
                    const chosenIdx = slotHits[primaryIdx]
                        ? primaryIdx
                        : slotHits[secondaryIdx]
                            ? secondaryIdx
                            : primaryIdx;

                    const chosenSlot = controllerSlots[chosenIdx];
                    const chosenHand = handSlots[chosenIdx];
                    activeHandReport = chosenSlot.handedness;
                    activeRuntimeReport = chosenSlot.runtimeProfile;
                    activeTriggerPressure = Number(chosenSlot.triggerValue.toFixed(2));
                    activeTargetRayMode = chosenSlot.targetRayMode;
                    activeIsHandTracking = chosenHand.isHandTracking;
                    activeHandGesture = chosenHand.gesture;
                    activePinchStrength = chosenHand.pinchStrength;
                    activePinchDistanceMm = chosenHand.pinchDistanceMm;

                    if (slotHits[chosenIdx]) {
                        hitResult = slotHits[chosenIdx];
                        pointerMode = chosenHand.isHandTracking
                            ? slotIsDirectHand[chosenIdx]
                                ? 'hand_direct'
                                : 'hand_pinch'
                            : 'controller_ray';
                    } else if (chosenHand.isHandTracking) {
                        pointerMode = 'hand_pinch';
                    }
                }

                // 2. Fallback to Center Gaze Raycasting (works in Headset Gaze/VisionPro, 360° Stereoscopic VR, and Gamepad modes)
                if (!hitResult && activePointers.size === 0) {
                    const activeCam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
                    vrRaycaster.setFromCamera(centerNdc, activeCam);
                    const gHit = intersectDnaWithMagneticAssist(activeMeshes, renderer.xr.isPresenting);
                    if (gHit) {
                        hitResult = gHit;
                        if (!activeIsHandTracking) {
                            pointerMode = activeGamepadCount > 0 ? 'gamepad_ray' : 'gaze_dwell';
                        }
                    }
                }

                const dwellTargetDurationMs = vrGameStateRef.current.active ? 820 : 1150;

                if (hitResult && hitResult.object.userData?.type) {
                    const hType = hitResult.object.userData.type as string;
                    vrHitMarker.visible = true;
                    vrHitMarker.position.copy(hitResult.point);
                    vrHitRing.lookAt(renderer.xr.isPresenting ? renderer.xr.getCamera().position : camera.position);

                    if (dwellHoveredType === hType) {
                        dwellElapsedMs += Math.min(rawDeltaMs, 50);
                    } else {
                        dwellHoveredType = hType;
                        dwellElapsedMs = 0;
                        dwellTriggered = false;
                        vrSound.playHoverTick();
                        triggerUniversalXrHaptics(xrSessionRef.current, 0.18, 15, {
                            handedness: activeHandReport === 'left' || activeHandReport === 'right' ? activeHandReport : 'any',
                            runtimeProfile: activeRuntimeReport
                        });
                    }

                    const dwellPct = THREE.MathUtils.clamp(dwellElapsedMs / dwellTargetDurationMs, 0, 1);
                    const ringScale = 0.65 + dwellPct * 0.65;
                    vrHitRing.scale.setScalar(ringScale);

                    if (dwellPct >= 1.0 && !dwellTriggered) {
                        dwellTriggered = true;
                        triggerVrComponentSelect(hitResult.object);
                    } else if (now - lastCardRedrawTime > 90) {
                        lastCardRedrawTime = now;
                        drawFloatingVrInspectorCard(stateRef.current.selectedComponentKey, hType, dwellPct);
                    }

                    if (onUpdateVrPointer && now - lastPointerEmitTime > 110) {
                        lastPointerEmitTime = now;
                        onUpdateVrPointer({
                            hoveredKey: hType,
                            dwellProgress: Number(dwellPct.toFixed(2)),
                            interactionMode: pointerMode,
                            activeDeviceProfile: renderer.xr.isPresenting
                                ? 'webxr_6dof'
                                : activeGamepadCount > 0
                                    ? 'gamepad_6dof'
                                    : lastGyroAlpha !== null
                                        ? 'gyro_3dof'
                                        : 'desktop_kb_mouse',
                            controllerCount: renderer.xr.isPresenting ? xrCtrlCount : activeGamepadCount,
                            activeHand: activeHandReport,
                            runtimeProfile: activeRuntimeReport,
                            triggerPressure: activeTriggerPressure,
                            targetRayMode: activeTargetRayMode,
                            isHandTracking: activeIsHandTracking,
                            handGesture: activeHandGesture,
                            pinchStrength: activePinchStrength,
                            pinchDistanceMm: activePinchDistanceMm
                        });
                    }
                } else {
                    vrHitMarker.visible = false;
                    if (dwellHoveredType !== null || (activeIsHandTracking && now - lastPointerEmitTime > 140)) {
                        if (dwellHoveredType !== null) {
                            dwellHoveredType = null;
                            dwellElapsedMs = 0;
                            dwellTriggered = false;
                            drawFloatingVrInspectorCard(stateRef.current.selectedComponentKey, null, 0);
                        }
                        lastPointerEmitTime = now;
                        if (onUpdateVrPointer) {
                            onUpdateVrPointer({
                                hoveredKey: null,
                                dwellProgress: 0,
                                interactionMode: pointerMode,
                                activeDeviceProfile: renderer.xr.isPresenting
                                    ? 'webxr_6dof'
                                    : activeGamepadCount > 0
                                        ? 'gamepad_6dof'
                                        : lastGyroAlpha !== null
                                            ? 'gyro_3dof'
                                            : 'desktop_kb_mouse',
                                controllerCount: renderer.xr.isPresenting ? xrCtrlCount : activeGamepadCount,
                                activeHand: activeHandReport,
                                runtimeProfile: activeRuntimeReport,
                                triggerPressure: activeTriggerPressure,
                                targetRayMode: activeTargetRayMode,
                                isHandTracking: activeIsHandTracking,
                                handGesture: activeHandGesture,
                                pinchStrength: activePinchStrength,
                                pinchDistanceMm: activePinchDistanceMm
                            });
                        }
                    }
                }

                // Position & Billboard the 3D Floating Inspector Card in Virtual Space
                if (renderer.xr.isPresenting) {
                    vrInspectorCardGroup.scale.setScalar(0.095);
                    vrInspectorCardGroup.position.set(
                        vrRigGroup.position.x - 1.05,
                        vrRigGroup.position.y + 1.48,
                        vrRigGroup.position.z - 2.15
                    );
                    renderer.xr.getCamera().getWorldPosition(scratchXrCamPos);
                    vrInspectorCardGroup.lookAt(scratchXrCamPos);
                } else if (customCamRef.current) {
                    vrInspectorCardGroup.scale.setScalar(1.0);
                    const camAzimuth = customCamRef.current.sphericalCurrent.theta;
                    const lateralAngle = camAzimuth - 0.52;
                    const cardDist = 20.5;
                    vrInspectorCardGroup.position.set(
                        Math.sin(lateralAngle) * cardDist,
                        customCamRef.current.panCurrent.y + 1.2,
                        Math.cos(lateralAngle) * cardDist
                    );
                    vrInspectorCardGroup.lookAt(camera.position);
                }

                // Update 3D Leader Line from Floating Card to Focused Component or Helix Center
                const linePositions = vrLeaderLineGeo.attributes.position as THREE.BufferAttribute;
                if (linePositions) {
                    linePositions.setXYZ(0, vrInspectorCardGroup.position.x, vrInspectorCardGroup.position.y, vrInspectorCardGroup.position.z);
                    if (vrHitMarker.visible) {
                        linePositions.setXYZ(1, vrHitMarker.position.x, vrHitMarker.position.y, vrHitMarker.position.z);
                    } else if (vrGameBeaconGroup.visible) {
                        linePositions.setXYZ(1, vrGameBeaconGroup.position.x, vrGameBeaconGroup.position.y, vrGameBeaconGroup.position.z);
                    } else if (customCamRef.current) {
                        linePositions.setXYZ(1, customCamRef.current.panCurrent.x, customCamRef.current.panCurrent.y, customCamRef.current.panCurrent.z);
                    }
                    linePositions.needsUpdate = true;
                }
            } else {
                vrHitMarker.visible = false;
            }

            // Standardized WebXR Headset Controller Input (Normalized Axes + 6-DoF Squeeze Grab + Depth-Sorted Stereo Render)
            if (renderer.xr.isPresenting && dnaGroupRef.current) {
                // 1. Direct 6-DoF Hand Grab Manipulation if Squeeze/Grip button is held
                if (grabbedController) {
                    grabbedController.getWorldPosition(scratchGrabPos);
                    const dx = scratchGrabPos.x - grabStartCtrlPos.x;
                    const dy = scratchGrabPos.y - grabStartCtrlPos.y;
                    dnaGroupRef.current.rotation.y = grabStartHelixRotY + dx * 4.2;
                    dnaGroupRef.current.position.y = THREE.MathUtils.clamp(
                        grabStartHelixPosY + dy * 1.4,
                        0.35,
                        3.1
                    );
                }

                // 2. Apply Deadzoned & Normalized Controller Axes (Left Hand = 3D Dolly Locomotion, Right/Single Hand = Helix Rotation & Elevation)
                const session = renderer.xr.getSession();
                const sessionCtrlCount = session?.inputSources ? session.inputSources.length : 2;
                for (let i = 0; i < controllerSlots.length; i++) {
                    const slot = controllerSlots[i];
                    const axX = slot.axesNorm.primaryX;
                    const axY = slot.axesNorm.primaryY;
                    if (axX === 0 && axY === 0) continue;

                    if (slot.handedness === 'left' && sessionCtrlCount > 1) {
                        // Left Stick / Touchpad: Smooth 3D Dolly Locomotion around the Bio-Chamber
                        vrRigGroup.position.x = THREE.MathUtils.clamp(vrRigGroup.position.x + axX * 1.85 * dt, -4.5, 4.5);
                        vrRigGroup.position.z = THREE.MathUtils.clamp(vrRigGroup.position.z + axY * 1.85 * dt, -3.5, 4.5);
                    } else {
                        // Right Stick / Touchpad (or Single Controller): Helix Rotation / Snap-Turn + Vertical Elevation
                        if (Math.abs(axX) > 0.01) {
                            if (stateRef.current.vrLocomotionMode === 'snap') {
                                if (snapTurnCooldownMs <= 0 && Math.abs(axX) > 0.58) {
                                    dnaGroupRef.current.rotation.y -= Math.sign(axX) * THREE.MathUtils.degToRad(30);
                                    snapTurnCooldownMs = 280;
                                    triggerUniversalXrHaptics(session, 0.36, 25, {
                                        handedness: slot.handedness === 'right' || slot.handedness === 'left' ? slot.handedness : 'any',
                                        runtimeProfile: slot.runtimeProfile
                                    });
                                }
                            } else {
                                dnaGroupRef.current.rotation.y -= axX * 2.25 * dt;
                            }
                        }
                        if (Math.abs(axY) > 0.01) {
                            dnaGroupRef.current.position.y = THREE.MathUtils.clamp(
                                dnaGroupRef.current.position.y - axY * 1.4 * dt,
                                0.35,
                                3.1
                            );
                        }
                    }
                }

                // 3. Enforce WebXR Stereo Depth-Buffer Integrity & Synchronized Near/Far Clip Planes
                synchronizeXrDepthAndCameraPlanes(true, session);
                const gl = renderer.getContext();
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(gl.LEQUAL);
                gl.depthMask(true);

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

            // Dynamic Macro Depth of Field (BokehPass) Calibration synchronized with Auto-Focus
            if (!isSoftwareGl && bokehPass) {
                const isDofOn = stateRef.current.dofEnabled;
                bokehPass.enabled = isDofOn;
                if (isDofOn && customCamRef.current) {
                    const exactFocusDist = camera.position.distanceTo(customCamRef.current.panCurrent);
                    smoothedDofFocusDist += (exactFocusDist - smoothedDofFocusDist) * 0.18;

                    const isMacroAutoFocused = focusedTargetRef.current !== null;
                    const desiredMaxBlur = isMacroAutoFocused ? 0.0075 : 0.0020;
                    const desiredAperture = isMacroAutoFocused
                        ? stateRef.current.dofAperture * 1.45
                        : stateRef.current.dofAperture * 0.52;

                    smoothedDofMaxBlur += (desiredMaxBlur - smoothedDofMaxBlur) * 0.12;
                    smoothedDofAperture += (desiredAperture - smoothedDofAperture) * 0.12;

                    const uniforms = bokehPass.uniforms as any;
                    if (uniforms['focus']) uniforms['focus'].value = smoothedDofFocusDist;
                    if (uniforms['aperture']) uniforms['aperture'].value = smoothedDofAperture;
                    if (uniforms['maxblur']) uniforms['maxblur'].value = smoothedDofMaxBlur;
                }
            }

            // Stereoscopic Side-by-Side (SBS) VR Lens Mode vs Standard/360 Panoramic Render with UnrealBloomPass & BokehPass
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
                if (!renderer.xr.isPresenting && (stateRef.current.bloomEnabled || stateRef.current.dofEnabled)) {
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
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('deviceorientation', handleDeviceOrientation);
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
            vrCardTexture.dispose();
            cardBackingGeo.dispose();
            cardScreenGeo.dispose();
            vrHitMarkerGeo.dispose();
            vrHitRingGeo.dispose();
            beaconOuterRingGeo.dispose();
            beaconCrystalGeo.dispose();
            vrLeaderLineGeo.dispose();
            vrDomeGeo.dispose();
            vrDomeWireGeo.dispose();
            horizonRingGeo.dispose();
            laserGeo.dispose();
            laserMat0.dispose();
            laserMat1.dispose();
            sharedHandJointGeo.dispose();
            sharedPinchOrbGeo.dispose();
            sharedPinchRingGeo.dispose();
            handSlots.forEach(hs => {
                hs.visualRig.boneGeo.dispose();
                hs.visualRig.boneMat.dispose();
                hs.visualRig.jointMat.dispose();
                hs.visualRig.tipMat.dispose();
                hs.visualRig.pinchOrbMat.dispose();
                hs.visualRig.pinchRingMat.dispose();
            });
            bloomPass.dispose();
            bokehPass.dispose();
            outputPass.dispose();
            composer.dispose();
            composerRenderTarget.dispose();
            if (renderer.domElement && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // Synchronize Interactive VR CRISPR Repair Game Mode
    useEffect(() => {
        const g = vrGameStateRef.current;
        if (isVrGameActive) {
            const cleanSeq = calculateSequenceStats(sequence).clean || 'ATGC';
            const totalPairs = Math.max(1, pairDynamicContainersRef.current.length || 24);
            const startIdx = Math.min(10, totalPairs - 1);
            const b1 = cleanSeq[startIdx % cleanSeq.length] || 'A';
            const compMap: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
            g.active = true;
            g.score = 0;
            g.combo = 1;
            g.repairedCount = 0;
            g.timeRemainingSec = 60;
            g.targetPairIndex = startIdx;
            g.targetBaseType = b1;
            g.complementBaseType = compMap[b1] || 'T';
            g.lesionLabel = 'Mismatch Watson-Crick';
            g.lastEventLabel = `Misi Aktif! Bidik Pasangan #${startIdx + 1} (${b1}⇄${g.complementBaseType}) pada Heliks`;
            vrSound.playGameStateChange(true);
        } else {
            if (g.active) {
                vrSound.playGameStateChange(false);
            }
            g.active = false;
            g.lastEventLabel = null;
            if (vrGameBeaconRef.current) {
                vrGameBeaconRef.current.visible = false;
            }
        }
        if (onUpdateVrGameTelemetry) {
            onUpdateVrGameTelemetry({ ...g });
        }
        if (vrFloatingCardUpdaterRef.current) {
            vrFloatingCardUpdaterRef.current(selectedComponentKey, null, 0);
        }
    }, [isVrGameActive]);

    // Synchronize Virtual Reality Mode (Universal WebXR Immersive Session Fallback Chain + 360° VR Environment)
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

            // Attempt native WebXR session with progressive fallback chain for universal headset compatibility
            const xrNav = (navigator as any).xr;
            if (webXrNativeSupportedRef.current && xrNav && !renderer.xr.isPresenting && !xrSessionRef.current) {
                const preferredMode = webXrSupportedModeRef.current || 'immersive-vr';
                xrNav
                    .requestSession(preferredMode, {
                        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
                    })
                    .catch(() =>
                        xrNav.requestSession(preferredMode, {
                            optionalFeatures: ['local-floor', 'hand-tracking']
                        })
                    )
                    .catch(() => xrNav.requestSession(preferredMode))
                    .then(async (session: any) => {
                        xrSessionRef.current = session;
                        await renderer.xr.setSession(session);
                    })
                    .catch(() => {
                        // Fallback gracefully to Universal 360° Immersive / Stereoscopic VR Mode in-browser
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

    // Capture High-Resolution UI-Free 3D Snapshot synchronously right after rendering
    useEffect(() => {
        if (!snapshotTrigger || snapshotTrigger <= 0) return;
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const composer = composerRef.current;
        if (!renderer || !scene || !camera) return;

        try {
            // Render immediately before toDataURL() so the WebGL drawing buffer is populated
            if ((stateRef.current.bloomEnabled || stateRef.current.dofEnabled) && composer) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
            const dataUrl = renderer.domElement.toDataURL('image/png');
            if (onSnapshotCaptured) {
                onSnapshotCaptured(dataUrl);
            }
        } catch {
            // Ignore capture errors
        }
    }, [snapshotTrigger]);

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

            // Semi-translucent furanose pentose plane (renderOrder 18: sorted after opaque bonds/atoms)
            const fFill = new THREE.Mesh(geos.furanoseFillGeo, materials.ringFill.sugar);
            fFill.renderOrder = 18;
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

                // Semi-translucent glowing aromatic ring fills (renderOrder 18: sorted after opaque covalent ring frame)
                const imiFill = new THREE.Mesh(geos.purineImidazoleFillGeo, fillMat);
                const pyrFill = new THREE.Mesh(geos.purinePyrimidineFillGeo, fillMat);
                imiFill.renderOrder = 18;
                pyrFill.renderOrder = 18;
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
                badge.renderOrder = 14;
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

                // Semi-translucent glowing hexagonal ring fill (renderOrder 18)
                const hexFill = new THREE.Mesh(geos.pyrimidineRingFillGeo, fillMat);
                hexFill.renderOrder = 18;
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
                badge.renderOrder = 14;
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

                // Subtle electrostatic H-bond glow cylinder connecting donor and acceptor (renderOrder 20)
                const glowTube = new THREE.Mesh(geos.hbondGlowCylGeo, materials.hbondGlowTube);
                glowTube.renderOrder = 20;
                glowTube.position.copy(startPt).add(endPt).multiplyScalar(0.5);
                glowTube.scale.set(1, gapLen, 1);
                glowTube.quaternion.setFromUnitVectors(upAxis, gapDir);
                bioBond.add(glowTube);

                // Segmented hydrogen bond capsules (renderOrder 12)
                for (let d = 0; d < dashesPerBond; d++) {
                    const fraction = (d + 0.5) / dashesPerBond;
                    const dashPos = new THREE.Vector3().addVectors(startPt, gapVector.clone().multiplyScalar(fraction));
                    const dashMesh = new THREE.Mesh(geos.hbondDashGeo, materials.hbondDot);
                    dashMesh.renderOrder = 12;
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
        ribbon1.renderOrder = 11;
        ribbon1.userData = { type: 'backbone', strand: 1, initialPos: new THREE.Vector3(0, 0, 0) };
        dnaGroup.add(ribbon1);
        allInteractiveMeshesRef.current.push(ribbon1);
        strand1MeshesRef.current.push(ribbon1);
        baseMeshesRef.current.backbone.push(ribbon1);
        ribbon1Ref.current = ribbon1;

        const railCurve1 = new THREE.CatmullRomCurve3(splinePointsRail1);
        const rail1Geo = new THREE.TubeGeometry(railCurve1, 240, 0.095, 12, false);
        const ribbon1Rail = new THREE.Mesh(rail1Geo, materials.backboneRail);
        ribbon1Rail.renderOrder = 11;
        ribbon1Rail.userData = { type: 'backbone', strand: 1, initialPos: new THREE.Vector3(0, 0, 0) };
        dnaGroup.add(ribbon1Rail);
        allInteractiveMeshesRef.current.push(ribbon1Rail);
        strand1MeshesRef.current.push(ribbon1Rail);
        baseMeshesRef.current.backbone.push(ribbon1Rail);
        ribbon1RailRef.current = ribbon1Rail;

        const curve2 = new THREE.CatmullRomCurve3(splinePointsStrand2);
        const tube2Geo = new THREE.TubeGeometry(curve2, 240, 0.26, 18, false);
        const ribbon2 = new THREE.Mesh(tube2Geo, materials.backbone);
        ribbon2.renderOrder = 11;
        ribbon2.userData = { type: 'backbone', strand: 2, initialPos: new THREE.Vector3(0, 0, 0) };
        dnaGroup.add(ribbon2);
        allInteractiveMeshesRef.current.push(ribbon2);
        strand2MeshesRef.current.push(ribbon2);
        baseMeshesRef.current.backbone.push(ribbon2);
        ribbon2Ref.current = ribbon2;

        const railCurve2 = new THREE.CatmullRomCurve3(splinePointsRail2);
        const rail2Geo = new THREE.TubeGeometry(railCurve2, 240, 0.095, 12, false);
        const ribbon2Rail = new THREE.Mesh(rail2Geo, materials.backboneRail);
        ribbon2Rail.renderOrder = 11;
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
            mg1.renderOrder = 10;
            mg1.position.copy(p1).multiplyScalar(1.22);
            mg1.userData = { type: 'ion_mg', parentGroup: ionGroup };
            ionGroup.add(mg1);
            allInteractiveMeshesRef.current.push(mg1);
            baseMeshesRef.current.ion_mg.push(mg1);

            const mg2 = new THREE.Mesh(geos.mgIonGeo, conditionMaterials.ionMg);
            mg2.renderOrder = 10;
            mg2.position.copy(p2).multiplyScalar(1.22);
            mg2.userData = { type: 'ion_mg', parentGroup: ionGroup };
            ionGroup.add(mg2);
            allInteractiveMeshesRef.current.push(mg2);
            baseMeshesRef.current.ion_mg.push(mg2);

            const waterMol = new THREE.Group();
            const wO = new THREE.Mesh(geos.waterOGeo, conditionMaterials.waterO);
            wO.renderOrder = 22;
            const wH1 = new THREE.Mesh(geos.methylHydrogenShape, materials.cpk.H);
            const wH2 = new THREE.Mesh(geos.methylHydrogenShape, materials.cpk.H);
            wH1.renderOrder = 10;
            wH2.renderOrder = 10;
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

    // Handle Component Isolation filter (synchronizes depthWrite with transparency so dimmed components never occlude active targets in VR)
    const applyFilter = (filter: FilterComponentType) => {
        allInteractiveMeshesRef.current.forEach(mesh => {
            if (!mesh || !mesh.userData) return;
            const type = mesh.userData.type;
            const show = (filter === 'all' || type === filter || (filter === 'backbone' && (type === 'backbone' || type === 'P_atom')));
            if (mesh.material && (mesh.material as THREE.Material).transparent !== undefined) {
                const mat = mesh.material as THREE.MeshPhysicalMaterial;
                // Preserve inherent translucency of aromatic ring fills & water oxygen when visible
                const isRingFill = (mat === materialsRef.current?.ringFill?.A || mat === materialsRef.current?.ringFill?.T || mat === materialsRef.current?.ringFill?.G || mat === materialsRef.current?.ringFill?.C || mat === materialsRef.current?.ringFill?.sugar);
                const isGlowTube = (mat === materialsRef.current?.hbondGlowTube);
                const isWaterO = (mat === conditionMaterialsRef.current?.waterO);
                if (isRingFill) {
                    mat.opacity = show ? 0.60 : 0.06;
                    mat.depthWrite = false;
                } else if (isGlowTube) {
                    mat.opacity = show ? 0.22 : 0.03;
                    mat.depthWrite = false;
                } else if (isWaterO) {
                    mat.opacity = show ? 0.82 : 0.10;
                    mat.depthWrite = false;
                } else {
                    const prevDepthWrite = mat.depthWrite;
                    mat.transparent = !show;
                    mat.opacity = show ? 1.0 : 0.12;
                    mat.depthWrite = show;
                    if (prevDepthWrite !== show) {
                        mat.needsUpdate = true;
                    }
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
                    if (vrComponentSelectTriggerRef.current) {
                        vrComponentSelectTriggerRef.current(clicked);
                    } else {
                        const tg = clicked.userData.parentGroup || clicked;
                        last3dClickedRef.current = { type, object: tg, time: performance.now() };
                        onSelectComponent(type);
                        bloomPulseBoostRef.current = 0.20;
                        const origScale = tg.scale.clone();
                        animateVector(tg.scale, origScale.clone().multiplyScalar(1.25), 200, easeOutBack);
                        setTimeout(() => animateVector(tg.scale, origScale, 300, easeInOutCubic), 220);
                    }
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

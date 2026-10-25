import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    ConformationType,
    RenderModeType,
    MolecularConditionType,
    AssemblyModeType,
    FilterComponentType,
    CameraControlMode,
    CameraStepAction,
    CameraStepCommand,
    WebXrSupportStatus,
    VrHeadsetTelemetry,
    ExportFormatType,
    VrPointerTelemetry,
    VrLocomotionMode,
    VrGameTelemetry
} from './types/dna';
import { DNA_DATA, calculateSequenceStats } from './data/dnaData';
import {
    triggerFileDownload,
    triggerDataUrlDownload,
    generateFastaFileContent,
    generatePdbFileContent,
    generateMetricsCsvContent,
    generateMetricsJsonContent
} from './utils/scienceExport';
import { DnaCanvas } from './components/DnaCanvas';
import { Header } from './components/Header';
import { ControlsPanel } from './components/ControlsPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { AnnotationsOverlay } from './components/AnnotationsOverlay';
import { MobileDock } from './components/MobileDock';
import { TutorialModal } from './components/TutorialModal';
import { InteractionHint } from './components/InteractionHint';

export const App: React.FC = () => {
    const [conformation, setConformation] = useState<ConformationType>('B');
    const [renderMode, setRenderMode] = useState<RenderModeType>('bio');
    const [condition, setCondition] = useState<MolecularConditionType>('normal');
    const [assemblyMode, setAssemblyMode] = useState<AssemblyModeType>('assembled');
    const [sequence, setSequence] = useState<string>('ATGCGTACCTACGATC');
    const [filterComponent, setFilterComponent] = useState<FilterComponentType>('all');
    const [autoRotate, setAutoRotate] = useState<boolean>(true);
    const [thermalDynamics, setThermalDynamics] = useState<boolean>(true);
    const [showIons, setShowIons] = useState<boolean>(false);
    const [metricScaleVisible, setMetricScaleVisible] = useState<boolean>(false);
    const [labelsVisible, setLabelsVisible] = useState<boolean>(true);
    const [bloomEnabled, setBloomEnabled] = useState<boolean>(true);
    const [bloomStrength, setBloomStrength] = useState<number>(0.36);
    const [bloomThreshold, setBloomThreshold] = useState<number>(0.82);
    const [dofEnabled, setDofEnabled] = useState<boolean>(true);
    const [dofAperture, setDofAperture] = useState<number>(0.00018);
    const [envReflectionIntensity, setEnvReflectionIntensity] = useState<number>(1.35);
    const [cameraControlMode, setCameraControlMode] = useState<CameraControlMode>('rotate');
    const [cameraStepCommand, setCameraStepCommand] = useState<CameraStepCommand | null>(null);

    const [isVrModeActive, setIsVrModeActive] = useState<boolean>(false);
    const [isStereoLensMode, setIsStereoLensMode] = useState<boolean>(false);
    const [vrLocomotionMode, setVrLocomotionMode] = useState<VrLocomotionMode>('snap');
    const [isVrGameActive, setIsVrGameActive] = useState<boolean>(false);
    const [isVrAudioMuted, setIsVrAudioMuted] = useState<boolean>(false);
    const [webXrStatus, setWebXrStatus] = useState<WebXrSupportStatus>('checking');
    const [vrTelemetry, setVrTelemetry] = useState<VrHeadsetTelemetry>({
        latencyMs: 11.2,
        fps: 72,
        batteryPercent: 94,
        isCharging: false
    });
    const [vrPointer, setVrPointer] = useState<VrPointerTelemetry>({
        hoveredKey: null,
        dwellProgress: 0,
        interactionMode: 'gaze_dwell',
        activeDeviceProfile: 'desktop_kb_mouse',
        controllerCount: 0
    });
    const [vrGameTelemetry, setVrGameTelemetry] = useState<VrGameTelemetry>({
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

    const [selectedComponentKey, setSelectedComponentKey] = useState<string | null>(null);
    const [focusComponentTrigger, setFocusComponentTrigger] = useState<number>(0);
    const [snapshotTrigger, setSnapshotTrigger] = useState<number>(0);
    const [exportToast, setExportToast] = useState<string | null>(null);
    const toastTimerRef = useRef<number | null>(null);

    const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);
    const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
    const [isDesktopControlsCollapsed, setIsDesktopControlsCollapsed] = useState<boolean>(false);
    const [isDesktopInspectorCollapsed, setIsDesktopInspectorCollapsed] = useState<boolean>(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
    const [resetCameraTrigger, setResetCameraTrigger] = useState<number>(0);

    const [annotationPositions, setAnnotationPositions] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});

    const showToastNotification = useCallback((msg: string) => {
        setExportToast(msg);
        if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = window.setTimeout(() => {
            setExportToast(null);
        }, 3600);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                window.clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    // Monitor XR Headset / Device Battery Level via Web Battery Status API
    useEffect(() => {
        let batteryMgr: any = null;
        let isMounted = true;

        const syncBattery = () => {
            if (!isMounted || !batteryMgr) return;
            const rawPct = Math.round((batteryMgr.level ?? 0.94) * 100);
            const clampedPct = Math.max(1, Math.min(100, rawPct));
            setVrTelemetry(prev => ({
                ...prev,
                batteryPercent: clampedPct,
                isCharging: Boolean(batteryMgr.charging)
            }));
        };

        const nav = navigator as any;
        if (nav && typeof nav.getBattery === 'function') {
            nav.getBattery()
                .then((mgr: any) => {
                    if (!isMounted) return;
                    batteryMgr = mgr;
                    syncBattery();
                    batteryMgr.addEventListener('levelchange', syncBattery);
                    batteryMgr.addEventListener('chargingchange', syncBattery);
                })
                .catch(() => {
                    // Fallback to default nominal headset battery telemetry
                });
        }

        return () => {
            isMounted = false;
            if (batteryMgr) {
                batteryMgr.removeEventListener('levelchange', syncBattery);
                batteryMgr.removeEventListener('chargingchange', syncBattery);
            }
        };
    }, []);

    const handleUpdateVrPerformance = useCallback((metrics: { latencyMs: number; fps: number }) => {
        setVrTelemetry(prev => {
            if (prev.latencyMs === metrics.latencyMs && prev.fps === metrics.fps) return prev;
            return {
                ...prev,
                latencyMs: metrics.latencyMs,
                fps: metrics.fps
            };
        });
    }, []);

    const handleUpdateVrPointer = useCallback((pointer: VrPointerTelemetry) => {
        setVrPointer(prev => {
            if (
                prev.hoveredKey === pointer.hoveredKey &&
                Math.abs(prev.dwellProgress - pointer.dwellProgress) < 0.02 &&
                prev.interactionMode === pointer.interactionMode &&
                prev.activeDeviceProfile === pointer.activeDeviceProfile &&
                prev.controllerCount === pointer.controllerCount &&
                prev.isHandTracking === pointer.isHandTracking &&
                prev.handGesture === pointer.handGesture &&
                Math.abs((prev.pinchStrength || 0) - (pointer.pinchStrength || 0)) < 0.04
            ) {
                return prev;
            }
            return pointer;
        });
    }, []);

    const handleUpdateVrGameTelemetry = useCallback((telemetry: VrGameTelemetry) => {
        setVrGameTelemetry(telemetry);
    }, []);

    const sequenceStats = useMemo(() => {
        return calculateSequenceStats(sequence).stats;
    }, [sequence]);

    const handleSnapshotCaptured = useCallback(
        (dataUrl: string) => {
            const filename = `genos-${conformation.toLowerCase()}-dna-${sequence.slice(0, 8).toLowerCase()}-3d.png`;
            triggerDataUrlDownload(filename, dataUrl);
            showToastNotification(`Snapshot 3D tanpa UI berhasil diunduh (${filename})`);
        },
        [conformation, sequence, showToastNotification]
    );

    const handleExportFile = useCallback(
        (format: ExportFormatType) => {
            const prefix = `genos-${conformation.toLowerCase()}-dna-${sequence.slice(0, 8).toLowerCase()}`;
            if (format === 'png') {
                setSnapshotTrigger(prev => prev + 1);
                return;
            }
            if (format === 'pdb') {
                const content = generatePdbFileContent(sequence, conformation, condition, sequenceStats);
                const filename = `${prefix}.pdb`;
                triggerFileDownload(filename, content, 'chemical/x-pdb;charset=utf-8');
                showToastNotification(`Struktur koordinat atomik 3D diunduh (${filename})`);
                return;
            }
            if (format === 'fasta') {
                const content = generateFastaFileContent(sequence, conformation, condition, sequenceStats);
                const filename = `${prefix}.fasta`;
                triggerFileDownload(filename, content, 'text/fasta;charset=utf-8');
                showToastNotification(`Sekuens bioinformatika FASTA diunduh (${filename})`);
                return;
            }
            if (format === 'csv') {
                const content = generateMetricsCsvContent(sequence, conformation, condition, sequenceStats);
                const filename = `${prefix}-metrics.csv`;
                triggerFileDownload(filename, content, 'text/csv;charset=utf-8');
                showToastNotification(`Tabel metrik termodinamika diunduh (${filename})`);
                return;
            }
            if (format === 'json') {
                const content = generateMetricsJsonContent(sequence, conformation, condition, sequenceStats);
                const filename = `${prefix}-data.json`;
                triggerFileDownload(filename, content, 'application/json;charset=utf-8');
                showToastNotification(`Data kristalografi JSON diunduh (${filename})`);
            }
        },
        [sequence, conformation, condition, sequenceStats, showToastNotification]
    );

    const handleSelectComponent = (type: string | null) => {
        setSelectedComponentKey(type);
        if (type) {
            setFocusComponentTrigger(prev => prev + 1);
            // Ensure condition-specific or solvation components exist in the 3D scene when selected via InspectorPanel
            if (type === 'methylation' && condition !== 'methylation') {
                setCondition('methylation');
            } else if (type === 'thymine_dimer' && condition !== 'thymine_dimer') {
                setCondition('thymine_dimer');
            } else if (type === 'intercalator' && condition !== 'intercalation') {
                setCondition('intercalation');
            } else if ((type === 'ion_mg' || type === 'water_hydration') && !showIons) {
                setShowIons(true);
            }
            if (filterComponent !== 'all' && filterComponent !== type) {
                setFilterComponent('all');
            }
            setIsDesktopInspectorCollapsed(false);
            if (window.innerWidth <= 768) {
                setIsControlsOpen(false);
                setIsInspectorOpen(true);
            }
        }
    };

    const handleCloseDrawers = () => {
        setIsControlsOpen(false);
        setIsInspectorOpen(false);
    };

    const handleCloseControlsPanel = () => {
        if (window.innerWidth <= 768) {
            setIsControlsOpen(false);
        } else {
            setIsDesktopControlsCollapsed(true);
        }
    };

    const handleCloseInspectorPanel = () => {
        if (window.innerWidth <= 768) {
            setIsInspectorOpen(false);
        } else {
            setIsDesktopInspectorCollapsed(true);
        }
    };

    const handleToggleControls = () => {
        if (window.innerWidth <= 768) {
            if (isControlsOpen) {
                setIsControlsOpen(false);
            } else {
                setIsInspectorOpen(false);
                setIsControlsOpen(true);
            }
        } else {
            setIsDesktopControlsCollapsed(prev => !prev);
        }
    };

    const handleToggleInspector = () => {
        if (window.innerWidth <= 768) {
            if (isInspectorOpen) {
                setIsInspectorOpen(false);
            } else {
                setIsControlsOpen(false);
                setIsInspectorOpen(true);
            }
        } else {
            setIsDesktopInspectorCollapsed(prev => !prev);
        }
    };

    const handleApplySequence = (newSeq: string) => {
        const { clean } = calculateSequenceStats(newSeq);
        setSequence(clean);
    };

    const handleResetCamera = () => {
        setResetCameraTrigger(prev => prev + 1);
    };

    const handleCameraStep = (action: CameraStepAction) => {
        setCameraStepCommand(prev => ({ id: (prev?.id || 0) + 1, action }));
    };

    const handleToggleVrMode = () => {
        setIsVrModeActive(prev => !prev);
    };

    const handleToggleStereoLensMode = () => {
        setIsStereoLensMode(prev => !prev);
    };

    const handleToggleVrGame = useCallback(() => {
        setIsVrGameActive(prev => {
            const next = !prev;
            if (next && !isVrModeActive) {
                setIsVrModeActive(true);
            }
            return next;
        });
    }, [isVrModeActive]);

    const handleToggleVrAudioMute = useCallback(() => {
        setIsVrAudioMuted(prev => !prev);
    }, []);

    const selectedComponentData = selectedComponentKey ? DNA_DATA[selectedComponentKey] || null : null;
    const hoveredVrComponentName = vrPointer.hoveredKey ? DNA_DATA[vrPointer.hoveredKey]?.name || vrPointer.hoveredKey : null;

    const runtimeBadgeMap: Record<string, string> = {
        meta_quest: 'META QUEST',
        pico_xr: 'PICO XR',
        valve_index: 'VALVE INDEX',
        htc_vive: 'HTC VIVE',
        wmr: 'WINDOWS MR',
        vision_pro_hand: 'VISION PRO / HAND',
        generic_xr: 'WEBXR 6-DOF'
    };
    const handSuffix =
        vrPointer.activeHand === 'right'
            ? ' · KANAN'
            : vrPointer.activeHand === 'left'
            ? ' · KIRI'
            : '';

    const handGestureLabelMap: Record<string, string> = {
        pinch_select: 'CUBIT PILIH',
        pinch_drag: 'GESER PUTAR',
        bimanual_scale: 'SKALA 2 TANGAN',
        fist_grab: 'KEPAL GENGGAM',
        point: 'TUNJUK',
        open: 'TERBUKA',
        none: 'SIAP'
    };

    const deviceProfileLabel =
        vrPointer.activeDeviceProfile === 'webxr_6dof'
            ? vrPointer.isHandTracking
                ? `WEBXR HAND API (25 SENDI${handSuffix})`
                : `${(vrPointer.runtimeProfile && runtimeBadgeMap[vrPointer.runtimeProfile]) || 'WEBXR 6-DOF'} (${vrPointer.controllerCount || 2} CTRL${handSuffix})`
            : vrPointer.activeDeviceProfile === 'gamepad_6dof'
            ? 'GAMEPAD XR'
            : vrPointer.activeDeviceProfile === 'gyro_3dof'
            ? 'GYRO 3-DOF'
            : 'UNIVERSAL 360°';

    const latencyState: 'optimal' | 'nominal' | 'high' =
        vrTelemetry.latencyMs <= 16.5 ? 'optimal' : vrTelemetry.latencyMs <= 26.0 ? 'nominal' : 'high';
    const latencyLabel =
        latencyState === 'optimal' ? 'OPTIMAL' : latencyState === 'nominal' ? 'STABIL' : 'TINGGI';

    const batteryState: 'optimal' | 'low' | 'critical' =
        vrTelemetry.batteryPercent > 25 ? 'optimal' : vrTelemetry.batteryPercent > 12 ? 'low' : 'critical';
    const batteryFillWidth = Math.max(2, Math.round((vrTelemetry.batteryPercent / 100) * 12));

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* Subtle Ambient Depth Layer */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 2, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '-12%', left: '-10%', width: '48vw', height: '48vw', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.05) 0%, transparent 70%)', filter: 'blur(64px)' }}></div>
                <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '52vw', height: '52vw', background: 'radial-gradient(circle, rgba(29, 99, 255, 0.06) 0%, transparent 70%)', filter: 'blur(72px)' }}></div>
            </div>

            {/* Three.js 3D Canvas with Post-Processing UnrealBloomPass, BokehPass DoF, PBR RoomEnvironment, and WebXR Controller/Gaze Raycasting */}
            <DnaCanvas
                conformation={conformation}
                renderMode={renderMode}
                condition={condition}
                assemblyMode={assemblyMode}
                sequence={sequence}
                filterComponent={filterComponent}
                autoRotate={autoRotate}
                thermalDynamics={thermalDynamics}
                showIons={showIons}
                metricScaleVisible={metricScaleVisible}
                labelsVisible={labelsVisible}
                bloomEnabled={bloomEnabled}
                bloomStrength={bloomStrength}
                bloomThreshold={bloomThreshold}
                dofEnabled={dofEnabled}
                dofAperture={dofAperture}
                envReflectionIntensity={envReflectionIntensity}
                cameraControlMode={cameraControlMode}
                cameraStepCommand={cameraStepCommand}
                isVrModeActive={isVrModeActive}
                isStereoLensMode={isStereoLensMode}
                vrLocomotionMode={vrLocomotionMode}
                isVrGameActive={isVrGameActive}
                isVrAudioMuted={isVrAudioMuted}
                onVrModeChange={setIsVrModeActive}
                onToggleVrGame={handleToggleVrGame}
                onWebXrSupportDetected={setWebXrStatus}
                onUpdateVrPerformance={handleUpdateVrPerformance}
                onUpdateVrPointer={handleUpdateVrPointer}
                onUpdateVrGameTelemetry={handleUpdateVrGameTelemetry}
                selectedComponentKey={selectedComponentKey}
                focusComponentTrigger={focusComponentTrigger}
                onSelectComponent={handleSelectComponent}
                onUpdateAnnotationPositions={setAnnotationPositions}
                resetCameraTrigger={resetCameraTrigger}
                snapshotTrigger={snapshotTrigger}
                onSnapshotCaptured={handleSnapshotCaptured}
            />

            {/* Export Toast Notification */}
            {exportToast && (
                <div id="export-toast-banner" className="export-toast-banner" role="status" aria-live="polite">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>{exportToast}</span>
                </div>
            )}

            {/* Stereoscopic Lens Divider, Center Gaze-Dwell Reticle & Floating Universal VR / Game HUD */}
            {(isVrModeActive || isVrGameActive) && (
                <div
                    id="vr-hud-overlay"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        pointerEvents: 'none',
                        zIndex: 18
                    }}
                >
                    {isStereoLensMode && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: '50%',
                                width: '1px',
                                transform: 'translateX(-50%)',
                                background: 'linear-gradient(to bottom, transparent, rgba(56, 189, 248, 0.65), transparent)'
                            }}
                        />
                    )}

                    {/* Center Gaze-Dwell Reticle for 360° & Headset Ray Selection */}
                    <div
                        className={`vr-gaze-reticle ${vrPointer.hoveredKey ? 'is-locked' : ''}`}
                        aria-hidden="true"
                    >
                        <svg width="44" height="44" viewBox="0 0 44 44">
                            <circle
                                cx="22"
                                cy="22"
                                r="14"
                                fill="none"
                                stroke={isVrGameActive ? 'rgba(251, 191, 36, 0.38)' : 'rgba(56, 189, 248, 0.28)'}
                                strokeWidth="1.5"
                            />
                            {vrPointer.dwellProgress > 0.02 && (
                                <circle
                                    cx="22"
                                    cy="22"
                                    r="14"
                                    fill="none"
                                    stroke={isVrGameActive ? '#fbbf24' : '#38bdf8'}
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeDasharray={88}
                                    strokeDashoffset={88 * (1 - vrPointer.dwellProgress)}
                                    transform="rotate(-90 22 22)"
                                />
                            )}
                            <circle
                                cx="22"
                                cy="22"
                                r={vrPointer.hoveredKey ? 3.2 : 2.2}
                                fill={vrPointer.hoveredKey ? (isVrGameActive ? '#fbbf24' : '#38bdf8') : 'rgba(248, 250, 252, 0.7)'}
                            />
                        </svg>
                        {hoveredVrComponentName && (
                            <div className="vr-gaze-label">
                                <span>{hoveredVrComponentName}</span>
                                <span className="vr-gaze-pct">{Math.round(vrPointer.dwellProgress * 100)}%</span>
                            </div>
                        )}
                    </div>

                    <div className="vr-hud-bar" role="status" aria-label="Status Performa, Kontroler & Misi Game WebXR">
                        <span className="vr-hud-status">{deviceProfileLabel}</span>
                        <span className="vr-hud-sep" aria-hidden="true">·</span>

                        {/* XR Headset Battery Level Indicator */}
                        <div
                            id="vr-hud-battery"
                            className={`vr-hud-telemetry vr-telemetry-${batteryState}`}
                            title={`Daya Baterai Perangkat XR: ${vrTelemetry.batteryPercent}%${vrTelemetry.isCharging ? ' (Mengisi Daya)' : ''}`}
                        >
                            <svg width="18" height="12" viewBox="0 0 22 14" fill="none" aria-hidden="true" className="vr-hud-icon">
                                <rect x="1" y="2" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                                <path d="M19 5V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <rect x="3" y="4" width={batteryFillWidth} height="6" rx="1" fill="currentColor" />
                            </svg>
                            <span className="vr-hud-metric-label">{vrTelemetry.isCharging ? 'CHG' : 'BAT'}</span>
                            <span className="vr-hud-metric-val">{vrTelemetry.batteryPercent}%</span>
                        </div>

                        <span className="vr-hud-sep" aria-hidden="true">·</span>

                        {/* XR Headset Motion-to-Photon Latency & Refresh Rate Indicator */}
                        <div
                            id="vr-hud-latency"
                            className={`vr-hud-telemetry vr-telemetry-${latencyState}`}
                            title={`Latensi Pipeline Render XR: ${vrTelemetry.latencyMs.toFixed(1)} ms (${vrTelemetry.fps} FPS) — Status: ${latencyLabel}`}
                        >
                            <svg width="14" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="vr-hud-icon">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                            <span className="vr-hud-metric-label">LATENSI</span>
                            <span className="vr-hud-metric-val">{vrTelemetry.latencyMs.toFixed(1)} ms</span>
                            <span className="vr-hud-metric-sub">
                                {vrTelemetry.fps} FPS · {latencyLabel}
                            </span>
                        </div>

                        <span className="vr-hud-sep" aria-hidden="true">·</span>

                        {/* XR Raycast / WebXR Hand Input API / Gamepad / Gaze Pointer Mode Indicator */}
                        <div
                            id="vr-hud-pointer"
                            className="vr-hud-telemetry"
                            title="Kompatibel dengan WebXR Hand Input API (Cubit/Pinch untuk pilih, Cubit+Geser untuk putar heliks), Laser Kontroler VR, Gamepad, atau Tatapan Gaze"
                        >
                            <span className="vr-hud-metric-label">
                                {vrPointer.interactionMode === 'hand_direct'
                                    ? 'HAND SENTUH'
                                    : vrPointer.interactionMode === 'hand_pinch'
                                    ? 'HAND PINCH'
                                    : vrPointer.interactionMode === 'controller_ray'
                                    ? 'XR LASER'
                                    : vrPointer.interactionMode === 'gamepad_ray'
                                    ? 'PAD RAY'
                                    : isVrGameActive
                                    ? 'GAZE 0.85s'
                                    : 'GAZE 1.15s'}
                            </span>
                            <span className="vr-hud-metric-val">
                                {hoveredVrComponentName ? hoveredVrComponentName : selectedComponentData ? selectedComponentData.name : 'SIAP BIDIK'}
                            </span>
                            {vrPointer.isHandTracking && (
                                <span className="vr-hud-metric-sub">
                                    {handGestureLabelMap[vrPointer.handGesture || 'open'] || 'TERBUKA'} · {vrPointer.pinchDistanceMm ?? 65}mm ({Math.round((vrPointer.pinchStrength || 0) * 100)}%)
                                </span>
                            )}
                        </div>

                        {isVrGameActive && (
                            <>
                                <span className="vr-hud-sep" aria-hidden="true">·</span>
                                <div
                                    id="vr-hud-game-score"
                                    className="vr-hud-telemetry vr-game-badge"
                                    title={vrGameTelemetry.lastEventLabel || 'Bidik cincin target bercahaya pada heliks DNA untuk memperbaiki mutasi'}
                                >
                                    <span className="vr-hud-metric-label">CRISPR</span>
                                    <span className="vr-hud-metric-val">
                                        #{vrGameTelemetry.targetPairIndex + 1} ({vrGameTelemetry.targetBaseType}⇄{vrGameTelemetry.complementBaseType})
                                    </span>
                                    <span className="vr-hud-metric-sub">
                                        {vrGameTelemetry.score} PTS · x{vrGameTelemetry.combo} · {Math.ceil(vrGameTelemetry.timeRemainingSec)}d
                                    </span>
                                </div>
                            </>
                        )}

                        <span className="vr-hud-sep" aria-hidden="true">·</span>

                        <button
                            type="button"
                            className={`vr-hud-btn ${isVrGameActive ? 'active' : ''}`}
                            onClick={handleToggleVrGame}
                            title="Mulai / Hentikan Misi Game VR Perbaikan Heliks CRISPR"
                        >
                            {isVrGameActive ? `Game CRISPR (${vrGameTelemetry.score})` : 'Misi Game VR'}
                        </button>
                        <button
                            type="button"
                            className="vr-hud-btn"
                            onClick={() => setVrLocomotionMode(prev => (prev === 'snap' ? 'smooth' : 'snap'))}
                            title="Ganti Mode Putaran VR antara Snap Turn 30° (Anti-Mual) dan Smooth Turn"
                        >
                            {vrLocomotionMode === 'snap' ? 'Snap 30°' : 'Smooth Turn'}
                        </button>
                        <button
                            type="button"
                            className={`vr-hud-btn ${!isVrAudioMuted ? 'active' : ''}`}
                            onClick={handleToggleVrAudioMute}
                            title="Aktifkan / Bisukan Efek Suara Prosedural Web Audio VR"
                        >
                            {!isVrAudioMuted ? 'Audio ON' : 'Bisu'}
                        </button>
                        <button
                            type="button"
                            className={`vr-hud-btn ${isStereoLensMode ? 'active' : ''}`}
                            onClick={handleToggleStereoLensMode}
                            title="Ganti antara Lensa Stereoskopik Headset (Side-by-Side) dan Panorama 360°"
                        >
                            {isStereoLensMode ? 'Lensa Stereo (SBS)' : 'Panorama 360°'}
                        </button>
                        <button
                            type="button"
                            className="vr-hud-btn vr-hud-exit"
                            onClick={() => {
                                setIsVrModeActive(false);
                                setIsVrGameActive(false);
                            }}
                            title="Keluar dari Mode Virtual Reality"
                        >
                            Keluar VR
                        </button>
                    </div>
                </div>
            )}

            {/* Header Instrument Bar */}
            <Header
                conformation={conformation}
                renderMode={renderMode}
                sequenceLength={sequenceStats.length}
                tmValue={sequenceStats.tm}
                isVrModeActive={isVrModeActive}
                isControlsVisible={!isDesktopControlsCollapsed}
                isInspectorVisible={!isDesktopInspectorCollapsed}
                onToggleVrMode={handleToggleVrMode}
                onOpenTutorial={() => setIsTutorialOpen(true)}
                onToggleControls={handleToggleControls}
                onToggleInspector={handleToggleInspector}
                onExportFile={handleExportFile}
            />

            {/* Mobile Backdrop */}
            <div
                id="modal-backdrop"
                className={`modal-backdrop ${isControlsOpen || isInspectorOpen ? '' : 'hidden'}`}
                onClick={handleCloseDrawers}
            ></div>

            {/* Controls Panel */}
            <ControlsPanel
                isOpen={isControlsOpen}
                isDesktopCollapsed={isDesktopControlsCollapsed}
                onClose={handleCloseControlsPanel}
                conformation={conformation}
                onSelectConformation={setConformation}
                renderMode={renderMode}
                onSelectRenderMode={setRenderMode}
                condition={condition}
                onSelectCondition={setCondition}
                sequence={sequence}
                sequenceStats={sequenceStats}
                onApplySequence={handleApplySequence}
                thermalDynamics={thermalDynamics}
                onToggleThermal={() => setThermalDynamics(prev => !prev)}
                showIons={showIons}
                onToggleIons={() => setShowIons(prev => !prev)}
                metricScaleVisible={metricScaleVisible}
                onToggleMetrics={() => setMetricScaleVisible(prev => !prev)}
                bloomEnabled={bloomEnabled}
                bloomStrength={bloomStrength}
                bloomThreshold={bloomThreshold}
                onToggleBloom={() => setBloomEnabled(prev => !prev)}
                onChangeBloomStrength={setBloomStrength}
                onChangeBloomThreshold={setBloomThreshold}
                dofEnabled={dofEnabled}
                dofAperture={dofAperture}
                envReflectionIntensity={envReflectionIntensity}
                onToggleDof={() => setDofEnabled(prev => !prev)}
                onChangeDofAperture={setDofAperture}
                onChangeEnvReflectionIntensity={setEnvReflectionIntensity}
                onExportFile={handleExportFile}
                assemblyMode={assemblyMode}
                onUnzip={() => setAssemblyMode('unzipped')}
                onExplode={() => setAssemblyMode('exploded')}
                onResetAssembly={() => setAssemblyMode('assembled')}
                labelsVisible={labelsVisible}
                onToggleLabels={() => setLabelsVisible(prev => !prev)}
                filterComponent={filterComponent}
                onSelectFilter={setFilterComponent}
                autoRotate={autoRotate}
                onToggleRotate={() => setAutoRotate(prev => !prev)}
                cameraControlMode={cameraControlMode}
                onSelectCameraMode={setCameraControlMode}
                onCameraStep={handleCameraStep}
                onResetCamera={handleResetCamera}
                isVrModeActive={isVrModeActive}
                isStereoLensMode={isStereoLensMode}
                webXrStatus={webXrStatus}
                vrLocomotionMode={vrLocomotionMode}
                isVrGameActive={isVrGameActive}
                isVrAudioMuted={isVrAudioMuted}
                vrGameTelemetry={vrGameTelemetry}
                onToggleVrMode={handleToggleVrMode}
                onToggleStereoLensMode={handleToggleStereoLensMode}
                onChangeVrLocomotionMode={setVrLocomotionMode}
                onToggleVrGame={handleToggleVrGame}
                onToggleVrAudioMute={handleToggleVrAudioMute}
            />

            {/* Inspector Panel */}
            <InspectorPanel
                isOpen={isInspectorOpen}
                isDesktopCollapsed={isDesktopInspectorCollapsed}
                conformation={conformation}
                onClose={handleCloseInspectorPanel}
                selectedComponent={selectedComponentData}
                selectedComponentKey={selectedComponentKey}
                onSelectComponentKey={handleSelectComponent}
            />

            {/* 3D Annotations Overlay */}
            <AnnotationsOverlay
                visible={labelsVisible && assemblyMode === 'assembled' && !(isVrModeActive && isStereoLensMode)}
                metricScaleVisible={metricScaleVisible}
                conformation={conformation}
                positions={annotationPositions}
            />

            {/* Mobile Dock */}
            <MobileDock
                assemblyMode={assemblyMode}
                onUnzip={() => setAssemblyMode('unzipped')}
                onExplode={() => setAssemblyMode('exploded')}
                onResetAssembly={() => setAssemblyMode('assembled')}
                onToggleMenu={handleToggleControls}
                onToggleInspect={handleToggleInspector}
            />

            {/* Interaction Hint (Desktop) */}
            <InteractionHint
                cameraControlMode={cameraControlMode}
                onSelectCameraMode={setCameraControlMode}
                onResetCamera={handleResetCamera}
            />

            {/* Tutorial Modal */}
            <TutorialModal
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
            />
        </div>
    );
};

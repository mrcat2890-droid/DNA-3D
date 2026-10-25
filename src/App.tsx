import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
    VrHeadsetTelemetry
} from './types/dna';
import { DNA_DATA, calculateSequenceStats } from './data/dnaData';
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
    const [cameraControlMode, setCameraControlMode] = useState<CameraControlMode>('rotate');
    const [cameraStepCommand, setCameraStepCommand] = useState<CameraStepCommand | null>(null);

    const [isVrModeActive, setIsVrModeActive] = useState<boolean>(false);
    const [isStereoLensMode, setIsStereoLensMode] = useState<boolean>(false);
    const [webXrStatus, setWebXrStatus] = useState<WebXrSupportStatus>('checking');
    const [vrTelemetry, setVrTelemetry] = useState<VrHeadsetTelemetry>({
        latencyMs: 11.2,
        fps: 72,
        batteryPercent: 94,
        isCharging: false
    });

    const [selectedComponentKey, setSelectedComponentKey] = useState<string | null>(null);
    const [focusComponentTrigger, setFocusComponentTrigger] = useState<number>(0);
    const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);
    const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
    const [isDesktopControlsCollapsed, setIsDesktopControlsCollapsed] = useState<boolean>(false);
    const [isDesktopInspectorCollapsed, setIsDesktopInspectorCollapsed] = useState<boolean>(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
    const [resetCameraTrigger, setResetCameraTrigger] = useState<number>(0);

    const [annotationPositions, setAnnotationPositions] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});

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

    const sequenceStats = useMemo(() => {
        return calculateSequenceStats(sequence).stats;
    }, [sequence]);

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

    const selectedComponentData = selectedComponentKey ? DNA_DATA[selectedComponentKey] || null : null;

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

            {/* Three.js 3D Canvas with Post-Processing UnrealBloomPass, WebXR & Stereoscopic 360° VR Support */}
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
                cameraControlMode={cameraControlMode}
                cameraStepCommand={cameraStepCommand}
                isVrModeActive={isVrModeActive}
                isStereoLensMode={isStereoLensMode}
                onVrModeChange={setIsVrModeActive}
                onWebXrSupportDetected={setWebXrStatus}
                onUpdateVrPerformance={handleUpdateVrPerformance}
                selectedComponentKey={selectedComponentKey}
                focusComponentTrigger={focusComponentTrigger}
                onSelectComponent={handleSelectComponent}
                onUpdateAnnotationPositions={setAnnotationPositions}
                resetCameraTrigger={resetCameraTrigger}
            />

            {/* Stereoscopic Lens Divider & Floating WebXR 360° HUD with Headset Battery & Latency Telemetry */}
            {isVrModeActive && (
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
                    <div className="vr-hud-bar" role="status" aria-label="Status Performa & Baterai Headset WebXR">
                        <span className="vr-hud-status">WEBXR 360° IMERSIF</span>
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
                            onClick={() => setIsVrModeActive(false)}
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
                onToggleVrMode={handleToggleVrMode}
                onToggleStereoLensMode={handleToggleStereoLensMode}
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

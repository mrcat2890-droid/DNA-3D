import React, { useState, useMemo } from 'react';
import {
    ConformationType,
    RenderModeType,
    MolecularConditionType,
    AssemblyModeType,
    FilterComponentType,
    CameraControlMode,
    CameraStepAction,
    CameraStepCommand,
    WebXrSupportStatus
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
    const [cameraControlMode, setCameraControlMode] = useState<CameraControlMode>('rotate');
    const [cameraStepCommand, setCameraStepCommand] = useState<CameraStepCommand | null>(null);

    const [isVrModeActive, setIsVrModeActive] = useState<boolean>(false);
    const [isStereoLensMode, setIsStereoLensMode] = useState<boolean>(false);
    const [webXrStatus, setWebXrStatus] = useState<WebXrSupportStatus>('checking');

    const [selectedComponentKey, setSelectedComponentKey] = useState<string | null>(null);
    const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);
    const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
    const [resetCameraTrigger, setResetCameraTrigger] = useState<number>(0);

    const [annotationPositions, setAnnotationPositions] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});

    const sequenceStats = useMemo(() => {
        return calculateSequenceStats(sequence).stats;
    }, [sequence]);

    const handleSelectComponent = (type: string) => {
        setSelectedComponentKey(type);
        if (window.innerWidth <= 768) {
            setIsControlsOpen(false);
            setIsInspectorOpen(true);
        }
    };

    const handleCloseDrawers = () => {
        setIsControlsOpen(false);
        setIsInspectorOpen(false);
    };

    const handleToggleControls = () => {
        if (isControlsOpen) {
            setIsControlsOpen(false);
        } else {
            setIsInspectorOpen(false);
            setIsControlsOpen(true);
        }
    };

    const handleToggleInspector = () => {
        if (isInspectorOpen) {
            setIsInspectorOpen(false);
        } else {
            setIsControlsOpen(false);
            setIsInspectorOpen(true);
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

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* Ambient Animated Molecular Background Layer */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
                <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '55vw', height: '55vw', background: 'radial-gradient(circle, rgba(29, 99, 255, 0.15) 0%, transparent 70%)', filter: 'blur(70px)' }}></div>

                <div className="ambient-nucleotide" style={{ left: '8%', color: '#1d63ff', fontSize: '2rem', opacity: 0.25, animationDuration: '22s', animationDelay: '0s' }}>A</div>
                <div className="ambient-nucleotide" style={{ left: '14%', color: '#ffb703', fontSize: '1.8rem', opacity: 0.25, animationDuration: '24s', animationDelay: '3s' }}>T</div>
                <div className="ambient-nucleotide" style={{ left: '82%', color: '#00d659', fontSize: '2.2rem', opacity: 0.25, animationDuration: '26s', animationDelay: '6s' }}>G</div>
                <div className="ambient-nucleotide" style={{ left: '88%', color: '#ff2a4b', fontSize: '1.9rem', opacity: 0.25, animationDuration: '23s', animationDelay: '9s' }}>C</div>

                <div className="ambient-hbond-spark" style={{ top: '25%', left: '20%', width: '4px', height: '4px', background: '#00f0ff', boxShadow: '0 0 10px #00f0ff', animationDuration: '4s' }}></div>
                <div className="ambient-hbond-spark" style={{ top: '60%', left: '15%', width: '3px', height: '3px', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8', animationDuration: '5s', animationDelay: '1.5s' }}></div>
                <div className="ambient-hbond-spark" style={{ top: '35%', right: '18%', width: '5px', height: '5px', background: '#00ff66', boxShadow: '0 0 12px #00ff66', animationDuration: '4.5s', animationDelay: '2.5s' }}></div>
                <div className="ambient-hbond-spark" style={{ top: '70%', right: '22%', width: '4px', height: '4px', background: '#ffb703', boxShadow: '0 0 10px #ffb703', animationDuration: '3.8s', animationDelay: '0.8s' }}></div>
            </div>

            {/* Three.js 3D Canvas with WebXR & Stereoscopic 360° VR Support */}
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
                cameraControlMode={cameraControlMode}
                cameraStepCommand={cameraStepCommand}
                isVrModeActive={isVrModeActive}
                isStereoLensMode={isStereoLensMode}
                onVrModeChange={setIsVrModeActive}
                onWebXrSupportDetected={setWebXrStatus}
                onSelectComponent={handleSelectComponent}
                onUpdateAnnotationPositions={setAnnotationPositions}
                resetCameraTrigger={resetCameraTrigger}
            />

            {/* Stereoscopic Lens Divider & Floating WebXR 360° HUD when VR Mode is Active */}
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
                                width: '2px',
                                transform: 'translateX(-50%)',
                                background: 'linear-gradient(to bottom, transparent, rgba(56, 189, 248, 0.7), transparent)',
                                boxShadow: '0 0 12px rgba(56, 189, 248, 0.6)'
                            }}
                        />
                    )}
                    <div
                        style={{
                            position: 'absolute',
                            top: '86px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(4, 13, 33, 0.88)',
                            border: '1px solid rgba(56, 189, 248, 0.48)',
                            borderRadius: '999px',
                            padding: '6px 16px',
                            backdropFilter: 'blur(14px)',
                            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.25)',
                            color: '#e2e8f0',
                            fontSize: '0.76rem'
                        }}
                    >
                        <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.8px' }}>
                            🥽 WEBXR 360° VR AKTIF
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>|</span>
                        <button
                            type="button"
                            onClick={handleToggleStereoLensMode}
                            style={{
                                background: isStereoLensMode ? 'rgba(56, 189, 248, 0.28)' : 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(56, 189, 248, 0.45)',
                                color: '#fff',
                                borderRadius: '999px',
                                padding: '3px 11px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                            title="Ganti antara Lensa Stereoskopik Headset (Side-by-Side) dan Panorama 360°"
                        >
                            {isStereoLensMode ? '👓 Lensa Stereo (SBS)' : '🌐 Kubah 360°'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsVrModeActive(false)}
                            style={{
                                background: 'rgba(239, 68, 68, 0.22)',
                                border: '1px solid rgba(239, 68, 68, 0.55)',
                                color: '#fca5a5',
                                borderRadius: '999px',
                                padding: '3px 11px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                            title="Keluar dari Mode Virtual Reality"
                        >
                            ✕ Keluar VR
                        </button>
                    </div>
                </div>
            )}

            {/* Header Overlay */}
            <Header
                isVrModeActive={isVrModeActive}
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
                onClose={handleCloseDrawers}
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
                onClose={handleCloseDrawers}
                selectedComponent={selectedComponentData}
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



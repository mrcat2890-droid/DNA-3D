import React from 'react';
import { CameraControlMode } from '../types/dna';

interface InteractionHintProps {
    cameraControlMode: CameraControlMode;
    onSelectCameraMode: (mode: CameraControlMode) => void;
    onResetCamera: () => void;
}

export const InteractionHint: React.FC<InteractionHintProps> = ({
    cameraControlMode,
    onSelectCameraMode,
    onResetCamera
}) => {
    return (
        <footer id="interaction-hint">
            <div className="hint-pill">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        type="button"
                        onClick={() => onSelectCameraMode('rotate')}
                        style={{
                            background: cameraControlMode === 'rotate' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.7)',
                            border: `1px solid ${cameraControlMode === 'rotate' ? '#38bdf8' : 'rgba(255,255,255,0.18)'}`,
                            color: cameraControlMode === 'rotate' ? '#38bdf8' : '#cbd5e1',
                            borderRadius: '14px',
                            padding: '3px 10px',
                            fontSize: '0.73rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                        title="Mode Rotasi Orbit Independen"
                    >
                        🔄 Rotasi
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelectCameraMode('pan')}
                        style={{
                            background: cameraControlMode === 'pan' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.7)',
                            border: `1px solid ${cameraControlMode === 'pan' ? '#38bdf8' : 'rgba(255,255,255,0.18)'}`,
                            color: cameraControlMode === 'pan' ? '#38bdf8' : '#cbd5e1',
                            borderRadius: '14px',
                            padding: '3px 10px',
                            fontSize: '0.73rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                        title="Mode Geser (Pan) Independen"
                    >
                        ✥ Geser (Pan)
                    </button>
                    <button
                        type="button"
                        onClick={onResetCamera}
                        style={{
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            color: '#e2e8f0',
                            borderRadius: '14px',
                            padding: '3px 10px',
                            fontSize: '0.73rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                        title="Reset Sudut Pandang & Posisi Kamera"
                    >
                        🎯 Reset
                    </button>
                </div>
                <span className="hint-divider">|</span>
                <span>
                    <b>Klik Kiri:</b> {cameraControlMode === 'rotate' ? 'Rotasi 360°' : 'Geser (Pan)'}
                </span>
                <span className="hint-divider">|</span>
                <span><b>Klik Kanan / Shift+Drag:</b> Pan</span>
                <span className="hint-divider">|</span>
                <span><b>Scroll:</b> Zoom</span>
                <span className="hint-divider">|</span>
                <span><b>Ketuk Objek:</b> Inspeksi</span>
            </div>
        </footer>
    );
};


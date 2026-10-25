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
                <div className="hint-mode-group">
                    <button
                        type="button"
                        className={`hint-mode-btn ${cameraControlMode === 'rotate' ? 'active' : ''}`}
                        onClick={() => onSelectCameraMode('rotate')}
                        title="Mode Rotasi Orbit Independen"
                    >
                        Rotasi Orbit
                    </button>
                    <button
                        type="button"
                        className={`hint-mode-btn ${cameraControlMode === 'pan' ? 'active' : ''}`}
                        onClick={() => onSelectCameraMode('pan')}
                        title="Mode Geser (Pan) Independen"
                    >
                        Geser (Pan)
                    </button>
                    <button
                        type="button"
                        className="hint-mode-btn"
                        onClick={onResetCamera}
                        title="Reset Sudut Pandang & Posisi Kamera"
                    >
                        Reset Kamera
                    </button>
                </div>
                <span className="hint-divider" aria-hidden="true">·</span>
                <span>
                    <b>Klik Kiri:</b> {cameraControlMode === 'rotate' ? 'Rotasi 360°' : 'Geser (Pan)'}
                </span>
                <span className="hint-divider" aria-hidden="true">·</span>
                <span><b>Klik Kanan / Shift+Drag:</b> Pan</span>
                <span className="hint-divider" aria-hidden="true">·</span>
                <span><b>Scroll:</b> Zoom</span>
                <span className="hint-divider" aria-hidden="true">·</span>
                <span><b>Klik Objek:</b> Inspeksi</span>
            </div>
        </footer>
    );
};

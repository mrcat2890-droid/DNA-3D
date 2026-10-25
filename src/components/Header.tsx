import React from 'react';

interface HeaderProps {
    isVrModeActive: boolean;
    onToggleVrMode: () => void;
    onOpenTutorial: () => void;
    onToggleControls: () => void;
    onToggleInspector: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    isVrModeActive,
    onToggleVrMode,
    onOpenTutorial,
    onToggleControls,
    onToggleInspector
}) => {
    return (
        <header id="app-header">
            <div className="header-content">
                <div className="header-left">
                    <div className="header-nav-row">
                        <span className="logo-badge">
                            <span className="pulse-dot"></span>
                            <span className="badge-text">GEN-OS 3D BIO-CORE</span>
                        </span>
                    </div>
                    <h1>STRUKTUR HELIKS GANDA DNA</h1>
                    <p className="subtitle">Eksplorasi Molekuler Interaktif 360° Watson-Crick</p>
                </div>
                <div className="header-actions">
                    <button
                        id="btn-toggle-vr"
                        className="header-btn"
                        style={
                            isVrModeActive
                                ? {
                                      background: 'rgba(56, 189, 248, 0.28)',
                                      borderColor: '#38bdf8',
                                      color: '#ffffff',
                                      boxShadow: '0 0 14px rgba(56, 189, 248, 0.45)'
                                  }
                                : undefined
                        }
                        title={
                            isVrModeActive
                                ? 'Keluar dari Mode Virtual Reality (WebXR 360°)'
                                : 'Aktifkan Mode Virtual Reality (WebXR / 360° Imersif)'
                        }
                        onClick={onToggleVrMode}
                    >
                        <span className="header-btn-icon">🥽</span>
                        <span className="header-btn-text">{isVrModeActive ? 'Keluar VR' : 'VR 360°'}</span>
                    </button>
                    <button
                        id="btn-open-tutorial"
                        className="header-btn header-btn-tutorial"
                        title="Buka Panduan Tutorial Interaktif"
                        onClick={onOpenTutorial}
                    >
                        <span className="header-btn-icon">💡</span>
                        <span className="header-btn-text">Tutorial</span>
                    </button>
                    <button
                        id="btn-toggle-controls-panel"
                        className="header-btn"
                        title="Buka Panel Kontrol"
                        onClick={onToggleControls}
                    >
                        <span className="header-btn-icon">⚙️</span>
                        <span className="header-btn-text">Menu</span>
                    </button>
                    <button
                        id="btn-toggle-inspector-panel"
                        className="header-btn"
                        title="Buka Detail Molekul"
                        onClick={onToggleInspector}
                    >
                        <span className="header-btn-icon">🔬</span>
                        <span className="header-btn-text">Detail</span>
                    </button>
                </div>
            </div>
        </header>
    );
};


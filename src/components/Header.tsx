import React from 'react';
import { ConformationType, RenderModeType, ExportFormatType } from '../types/dna';

interface HeaderProps {
    conformation: ConformationType;
    renderMode: RenderModeType;
    sequenceLength: number;
    tmValue: string;
    isVrModeActive: boolean;
    isControlsVisible?: boolean;
    isInspectorVisible?: boolean;
    onToggleVrMode: () => void;
    onOpenTutorial: () => void;
    onToggleControls: () => void;
    onToggleInspector: () => void;
    onExportFile?: (format: ExportFormatType) => void;
}

const RENDER_MODE_LABELS: Record<RenderModeType, string> = {
    bio: 'Bio-Illustrative',
    cpk: 'CPK Space-Filling',
    ballstick: 'Ball & Stick',
    electrostatic: 'Coulombic ESP'
};

export const Header: React.FC<HeaderProps> = ({
    conformation,
    renderMode,
    sequenceLength,
    tmValue,
    isVrModeActive,
    isControlsVisible = true,
    isInspectorVisible = true,
    onToggleVrMode,
    onOpenTutorial,
    onToggleControls,
    onToggleInspector,
    onExportFile
}) => {
    return (
        <header id="app-header">
            <div className="header-content">
                {/* Left Zone: Brand & Instrument Identity */}
                <div className="header-brand-zone">
                    <div className="brand-emblem" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4c5.5 0 10.5 16 16 16" />
                            <path d="M20 4c-5.5 0-10.5 16-16 16" />
                            <line x1="6.5" y1="7" x2="17.5" y2="7" />
                            <line x1="8.5" y1="12" x2="15.5" y2="12" />
                            <line x1="6.5" y1="17" x2="17.5" y2="17" />
                        </svg>
                    </div>
                    <div className="header-title-group">
                        <h1>Struktur Heliks Ganda DNA</h1>
                        <div className="header-meta-inline">
                            <span>Kristalografi Sinar-X Watson-Crick</span>
                            <span className="meta-sep" aria-hidden="true">·</span>
                            <span className="mono-metric">{conformation}-DNA</span>
                            <span className="meta-sep" aria-hidden="true">·</span>
                            <span>{RENDER_MODE_LABELS[renderMode]}</span>
                            <span className="meta-sep" aria-hidden="true">·</span>
                            <span className="mono-metric">{sequenceLength} pb ({tmValue})</span>
                        </div>
                    </div>
                </div>

                {/* Right Zone: Workspace Controls & Modal Triggers */}
                <div className="header-actions">
                    <button
                        id="btn-toggle-controls-panel"
                        className={`header-btn ${isControlsVisible ? 'is-active' : ''}`}
                        title="Tampilkan / Sembunyikan Panel Kontrol Parameter"
                        onClick={onToggleControls}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="4" y1="12" x2="20" y2="12" />
                            <line x1="4" y1="18" x2="20" y2="18" />
                            <circle cx="9" cy="6" r="2" fill="currentColor" />
                            <circle cx="15" cy="12" r="2" fill="currentColor" />
                            <circle cx="10" cy="18" r="2" fill="currentColor" />
                        </svg>
                        <span className="header-btn-text">Panel Kontrol</span>
                    </button>

                    <button
                        id="btn-toggle-inspector-panel"
                        className={`header-btn ${isInspectorVisible ? 'is-active' : ''}`}
                        title="Tampilkan / Sembunyikan Panel Inspektor Molekul"
                        onClick={onToggleInspector}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polygon points="12 2 20 7 20 17 12 22 4 17 4 7 12 2" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span className="header-btn-text">Inspektor</span>
                    </button>

                    {onExportFile && (
                        <>
                            <button
                                id="btn-header-snapshot"
                                className="header-btn header-btn-export"
                                title="Tangkap Snapshot 3D Resolusi Tinggi Tanpa Panel UI (.PNG)"
                                onClick={() => onExportFile('png')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                                <span className="header-btn-text">Snapshot 3D</span>
                            </button>

                            <button
                                id="btn-header-export-pdb"
                                className="header-btn header-btn-export"
                                title="Unduh Berkas Koordinat Atom 3D Standar Protein Data Bank (.PDB)"
                                onClick={() => onExportFile('pdb')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span className="header-btn-text">.PDB</span>
                            </button>
                        </>
                    )}

                    <button
                        id="btn-toggle-vr"
                        className={`header-btn ${isVrModeActive ? 'is-active' : ''}`}
                        title={
                            isVrModeActive
                                ? 'Keluar dari Mode Virtual Reality (WebXR 360°)'
                                : 'Aktifkan Mode Virtual Reality (WebXR / 360° Imersif)'
                        }
                        onClick={onToggleVrMode}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="2" y="7" width="20" height="10" rx="3" />
                            <path d="M10 17l2-3 2 3" />
                            <circle cx="7.5" cy="12" r="1.5" />
                            <circle cx="16.5" cy="12" r="1.5" />
                        </svg>
                        <span className="header-btn-text">{isVrModeActive ? 'Keluar VR' : 'VR 360°'}</span>
                    </button>

                    <button
                        id="btn-open-tutorial"
                        className="header-btn header-btn-tutorial"
                        title="Buka Dokumentasi & Panduan Ilmiah"
                        onClick={onOpenTutorial}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                        <span className="header-btn-text">Panduan Ilmiah</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

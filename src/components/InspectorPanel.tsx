import React from 'react';
import { ComponentDetails, ConformationType } from '../types/dna';
import { CONFORMATIONS } from '../data/dnaData';

interface InspectorPanelProps {
    isOpen: boolean;
    isDesktopCollapsed?: boolean;
    conformation?: ConformationType;
    onClose: () => void;
    selectedComponent: ComponentDetails | null;
    selectedComponentKey?: string | null;
    onSelectComponentKey?: (key: string | null) => void;
}

const QUICK_COMPONENTS: Array<{ key: string; code: string; label: string; color: string }> = [
    { key: 'A', code: 'A', label: 'Adenina', color: '#1d63ff' },
    { key: 'T', code: 'T', label: 'Timina', color: '#ffb703' },
    { key: 'G', code: 'G', label: 'Guanina', color: '#00d659' },
    { key: 'C', code: 'C', label: 'Sitosina', color: '#ff2a4b' },
    { key: 'backbone', code: 'P-S', label: 'Pita Gula-Fosfat', color: '#5c6ae4' },
    { key: 'hbond', code: 'H···', label: 'Ikatan Hidrogen', color: '#38bdf8' },
    { key: 'methylation', code: '5mC', label: 'Metilasi Sitosin', color: '#c084fc' },
    { key: 'thymine_dimer', code: 'CPD', label: 'Dimer Timin UV', color: '#fb923c' },
    { key: 'intercalator', code: 'INT', label: 'Agen Interkalasi', color: '#f43f5e' },
    { key: 'ion_mg', code: 'Mg²⁺', label: 'Ion Magnesium', color: '#2dd4bf' }
];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
    isOpen,
    isDesktopCollapsed = false,
    conformation = 'B',
    onClose,
    selectedComponent,
    selectedComponentKey,
    onSelectComponentKey
}) => {
    const conf = CONFORMATIONS[conformation] || CONFORMATIONS.B;

    return (
        <aside
            id="inspector-panel"
            className={`glass-panel responsive-drawer ${isOpen ? 'drawer-open' : ''} ${isDesktopCollapsed ? 'desktop-collapsed' : ''}`}
        >
            <div className="mobile-drawer-handle"></div>

            <div className="panel-top-header">
                <div className="panel-header-inspector">
                    <div className="panel-title-wrap">
                        <span className="panel-kicker" id="inspector-badge">SPEKTROMETRI &amp; STRUKTUR</span>
                        <h2 className="panel-main-title">Inspektor Molekul</h2>
                    </div>
                    <button id="btn-close-inspector" className="btn-icon-close" title="Sembunyikan Inspektor" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Quick Component Selector Strip */}
                {onSelectComponentKey && (
                    <div className="inspector-quick-strip" aria-label="Pilih Komponen Cepat">
                        {QUICK_COMPONENTS.slice(0, 6).map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className={`insp-quick-chip ${selectedComponentKey === item.key ? 'active' : ''}`}
                                onClick={() => onSelectComponentKey(item.key)}
                                title={`Fokus & Inspeksi ${item.label}`}
                            >
                                <span className="insp-chip-dot" style={{ backgroundColor: item.color }} />
                                <span>{item.code}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="panel-scroll-body">
                {!selectedComponent ? (
                    <div id="inspector-placeholder" className="inspector-empty">
                        <div className="inspector-vector-badge" aria-hidden="true">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 19 6 19 14 12 18 5 14 5 6 12 2" />
                                <circle cx="12" cy="10" r="3" />
                                <path d="M12 18v4" />
                                <path d="M8 22h8" />
                            </svg>
                        </div>
                        <h3>Pilih Komponen Molekuler</h3>
                        <p>
                            Klik komponen pada model 3D atau pilih dari indeks di bawah untuk memusatkan kamera secara otomatis (Auto-Focus) pada struktur target.
                        </p>

                        {onSelectComponentKey && (
                            <div className="inspector-directory-grid">
                                {QUICK_COMPONENTS.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className="inspector-dir-btn"
                                        onClick={() => onSelectComponentKey(item.key)}
                                    >
                                        <span className="dir-code" style={{ color: item.color, borderColor: `${item.color}55` }}>
                                            {item.code}
                                        </span>
                                        <span className="dir-label">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="detail-card" style={{ marginTop: '14px', textAlign: 'left', marginBottom: 0 }}>
                            <div className="detail-card-kicker">PARAMETER KRISTALOGRAFI AKTIF ({conformation}-DNA)</div>
                            <div className="detail-row">
                                <span className="label">Diameter Heliks</span>
                                <span className="value code-font">{conf.metrics.dia}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Jarak Aksial (Rise)</span>
                                <span className="value code-font">{conf.metrics.rise}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Tinggi 1 Putaran (Pitch)</span>
                                <span className="value code-font">{conf.metrics.pitch}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div id="inspector-details">
                        <div className="inspector-focus-bar">
                            <span className="inspector-focus-status">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="7" />
                                    <line x1="12" y1="2" x2="12" y2="5" />
                                    <line x1="12" y1="19" x2="12" y2="22" />
                                    <line x1="2" y1="12" x2="5" y2="12" />
                                    <line x1="19" y1="12" x2="22" y2="12" />
                                </svg>
                                <span>AUTO-FOKUS 3D AKTIF</span>
                            </span>
                            {onSelectComponentKey && selectedComponentKey && (
                                <button
                                    type="button"
                                    className="inspector-refocus-chip"
                                    onClick={() => onSelectComponentKey(selectedComponentKey)}
                                    title="Pusatkan ulang kamera atau pindah ke posisi residu berikutnya"
                                >
                                    Pusatkan Ulang
                                </button>
                            )}
                        </div>

                        <div className="component-header">
                            <div
                                className="component-color-indicator"
                                id="detail-color-indicator"
                                style={{
                                    backgroundColor: selectedComponent.colorHex,
                                    boxShadow: `0 0 14px ${selectedComponent.colorHex}80`
                                }}
                            ></div>
                            <div className="component-title-block">
                                <h2 id="detail-title">{selectedComponent.name}</h2>
                                <span id="detail-class" className="meta-tag">{selectedComponent.class}</span>
                            </div>
                        </div>

                        <div className="detail-card">
                            <div className="detail-row">
                                <span className="label">Rumus Molekul</span>
                                <span className="value code-font" id="detail-formula">{selectedComponent.formula}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Massa Molar</span>
                                <span className="value code-font" id="detail-weight">{selectedComponent.weight}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Pasangan Komplementer</span>
                                <span className="value highlight-text" id="detail-partner">{selectedComponent.partner}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Konfigurasi Ikatan</span>
                                <span className="value" id="detail-bonds">{selectedComponent.bonds}</span>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h4>Arsitektur &amp; Peran Struktural</h4>
                            <p id="detail-desc">{selectedComponent.desc}</p>
                        </div>

                        <div className="detail-section">
                            <h4>Signifikansi Biokimia &amp; Genetika</h4>
                            <p id="detail-function">{selectedComponent.func}</p>
                        </div>

                        {onSelectComponentKey && (
                            <div className="inspector-actions-row">
                                {selectedComponentKey && (
                                    <button
                                        type="button"
                                        className="ctrl-btn inspector-action-focus"
                                        onClick={() => onSelectComponentKey(selectedComponentKey)}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="7" />
                                            <circle cx="12" cy="12" r="2" />
                                            <line x1="12" y1="2" x2="12" y2="5" />
                                            <line x1="12" y1="19" x2="12" y2="22" />
                                            <line x1="2" y1="12" x2="5" y2="12" />
                                            <line x1="19" y1="12" x2="22" y2="12" />
                                        </svg>
                                        <span>Pusatkan Kamera</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="ctrl-btn"
                                    style={{ justifyContent: 'center' }}
                                    onClick={() => onSelectComponentKey(null)}
                                >
                                    <span>Indeks Komponen</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
};

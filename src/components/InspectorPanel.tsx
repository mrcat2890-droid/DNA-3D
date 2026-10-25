import React from 'react';
import { ComponentDetails } from '../types/dna';

interface InspectorPanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedComponent: ComponentDetails | null;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
    isOpen,
    onClose,
    selectedComponent
}) => {
    return (
        <aside id="inspector-panel" className={`glass-panel responsive-drawer ${isOpen ? 'drawer-open' : ''}`}>
            <div className="mobile-drawer-handle"></div>

            <div className="panel-header-inspector">
                <div className="inspector-badge" id="inspector-badge">INSPEKTOR MOLEKUL</div>
                <button id="btn-close-inspector" className="btn-icon-close" title="Tutup" onClick={onClose}>
                    &times;
                </button>
            </div>

            {!selectedComponent ? (
                <div id="inspector-placeholder" className="inspector-empty">
                    <div className="microscope-icon">🔬</div>
                    <h3>PILIH KOMPONEN DNA</h3>
                    <p>Ketuk salah satu basa nitrogen (A, T, G, C), ikatan hidrogen, atau pita tulang punggung untuk menginspeksi rumus kimia dan fungsinya.</p>
                </div>
            ) : (
                <div id="inspector-details">
                    <div className="component-header">
                        <div
                            className="component-color-indicator"
                            id="detail-color-indicator"
                            style={{
                                backgroundColor: selectedComponent.colorHex,
                                boxShadow: `0 0 16px ${selectedComponent.colorHex}`
                            }}
                        ></div>
                        <div>
                            <h2 id="detail-title">{selectedComponent.name}</h2>
                            <span id="detail-class" className="meta-tag">{selectedComponent.class}</span>
                        </div>
                    </div>

                    <div className="detail-card">
                        <div className="detail-row">
                            <span className="label">Rumus Molekul:</span>
                            <span className="value code-font" id="detail-formula">{selectedComponent.formula}</span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Berat Molekul:</span>
                            <span className="value" id="detail-weight">{selectedComponent.weight}</span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Pasangan Komplementer:</span>
                            <span className="value highlight-text" id="detail-partner">{selectedComponent.partner}</span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Jembatan Hidrogen:</span>
                            <span className="value" id="detail-bonds">{selectedComponent.bonds}</span>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h4>DESKRIPSI &amp; PERAN STRUKTURAL</h4>
                        <p id="detail-desc">{selectedComponent.desc}</p>
                    </div>

                    <div className="detail-section">
                        <h4>SIGNIFIKANSI GENETIKA</h4>
                        <p id="detail-function">{selectedComponent.func}</p>
                    </div>
                </div>
            )}
        </aside>
    );
};

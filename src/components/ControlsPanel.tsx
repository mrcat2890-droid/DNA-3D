import React, { useState } from 'react';
import {
    ConformationType,
    RenderModeType,
    MolecularConditionType,
    AssemblyModeType,
    FilterComponentType,
    SequenceStats,
    CameraControlMode,
    CameraStepAction,
    WebXrSupportStatus
} from '../types/dna';

interface ControlsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    conformation: ConformationType;
    onSelectConformation: (c: ConformationType) => void;
    renderMode: RenderModeType;
    onSelectRenderMode: (m: RenderModeType) => void;
    condition: MolecularConditionType;
    onSelectCondition: (cond: MolecularConditionType) => void;
    sequence: string;
    sequenceStats: SequenceStats;
    onApplySequence: (seq: string) => void;
    thermalDynamics: boolean;
    onToggleThermal: () => void;
    showIons: boolean;
    onToggleIons: () => void;
    metricScaleVisible: boolean;
    onToggleMetrics: () => void;
    assemblyMode: AssemblyModeType;
    onUnzip: () => void;
    onExplode: () => void;
    onResetAssembly: () => void;
    labelsVisible: boolean;
    onToggleLabels: () => void;
    filterComponent: FilterComponentType;
    onSelectFilter: (f: FilterComponentType) => void;
    autoRotate: boolean;
    onToggleRotate: () => void;
    cameraControlMode: CameraControlMode;
    onSelectCameraMode: (mode: CameraControlMode) => void;
    onCameraStep: (action: CameraStepAction) => void;
    onResetCamera: () => void;
    isVrModeActive: boolean;
    isStereoLensMode: boolean;
    webXrStatus: WebXrSupportStatus;
    onToggleVrMode: () => void;
    onToggleStereoLensMode: () => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
    isOpen,
    onClose,
    conformation,
    onSelectConformation,
    renderMode,
    onSelectRenderMode,
    condition,
    onSelectCondition,
    sequence,
    sequenceStats,
    onApplySequence,
    thermalDynamics,
    onToggleThermal,
    showIons,
    onToggleIons,
    metricScaleVisible,
    onToggleMetrics,
    assemblyMode,
    onUnzip,
    onExplode,
    onResetAssembly,
    labelsVisible,
    onToggleLabels,
    filterComponent,
    onSelectFilter,
    autoRotate,
    onToggleRotate,
    cameraControlMode,
    onSelectCameraMode,
    onCameraStep,
    onResetCamera,
    isVrModeActive,
    isStereoLensMode,
    webXrStatus,
    onToggleVrMode,
    onToggleStereoLensMode
}) => {
    const [inputSeq, setInputSeq] = useState(sequence);

    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();
        onApplySequence(inputSeq);
    };

    const handleChipClick = (seq: string) => {
        setInputSeq(seq);
        onApplySequence(seq);
    };

    return (
        <aside id="controls-panel" className={`glass-panel responsive-drawer ${isOpen ? 'drawer-open' : ''}`}>
            <div className="mobile-drawer-handle"></div>

            <div className="panel-header-flex">
                <div className="panel-section-title">
                    <span className="icon">🧬</span> PUSAT KONTROL MOLEKULER
                </div>
                <button id="btn-close-controls" className="btn-icon-close" title="Tutup Menu" onClick={onClose}>
                    &times;
                </button>
            </div>

            {/* 1. KONFORMASI ALOTROPIK KRISTALOGRAFI */}
            <div className="panel-section-title">
                <span className="icon">🌀</span> BENTUK KONFORMASI ALOTROPIK
            </div>
            <p className="section-hint">Standar kristalografi sinar-X (Dickerson &amp; Saenger):</p>
            <div className="conformation-tabs">
                <button
                    className={`conf-tab-btn ${conformation === 'B' ? 'active' : ''}`}
                    onClick={() => onSelectConformation('B')}
                    title="B-DNA: Bentuk fisiologis alami seluler"
                >
                    <span className="conf-badge">B-DNA</span>
                    <span className="conf-title">Fisiologis Standar</span>
                    <span className="conf-sub">Kanan • 10.5 pb • ⌀2.0 nm</span>
                </button>
                <button
                    className={`conf-tab-btn ${conformation === 'A' ? 'active' : ''}`}
                    onClick={() => onSelectConformation('A')}
                    title="A-DNA: Terdehidrasi &amp; hibrida DNA-RNA"
                >
                    <span className="conf-badge">A-DNA</span>
                    <span className="conf-title">Kompak Miring</span>
                    <span className="conf-sub">Kanan • 11.0 pb • Miring 19°</span>
                </button>
                <button
                    className={`conf-tab-btn ${conformation === 'Z' ? 'active' : ''}`}
                    onClick={() => onSelectConformation('Z')}
                    title="Z-DNA: Heliks kidal bergantian purin-pirimidin"
                >
                    <span className="conf-badge">Z-DNA</span>
                    <span className="conf-title">Heliks Kidal</span>
                    <span className="conf-sub">Kidal • 12.0 pb • Zigzag</span>
                </button>
            </div>

            <div className="divider"></div>

            {/* 2. MODE REPRESENTASI MOLEKULER */}
            <div className="panel-section-title">
                <span className="icon">🔬</span> STANDAR REPRESENTASI ILMIAH
            </div>
            <p className="section-hint">Pilih visualisasi setara RCSB PDB &amp; PyMOL:</p>
            <div className="mode-selector-grid">
                <button
                    className={`mode-btn ${renderMode === 'bio' ? 'active' : ''}`}
                    onClick={() => onSelectRenderMode('bio')}
                >
                    <span className="mode-icon">🧪</span>
                    <div className="mode-info">
                        <span className="mode-name">Bio-Illustrative</span>
                        <span className="mode-sub">Cincin Planar Purin-Pirimidin &amp; Pita Ribosa</span>
                    </div>
                </button>
                <button
                    className={`mode-btn ${renderMode === 'cpk' ? 'active' : ''}`}
                    onClick={() => onSelectRenderMode('cpk')}
                >
                    <span className="mode-icon">🔮</span>
                    <div className="mode-info">
                        <span className="mode-name">CPK Space-Filling</span>
                        <span className="mode-sub">Permukaan Atomik Padat (Van der Waals)</span>
                    </div>
                </button>
                <button
                    className={`mode-btn ${renderMode === 'ballstick' ? 'active' : ''}`}
                    onClick={() => onSelectRenderMode('ballstick')}
                >
                    <span className="mode-icon">⚛️</span>
                    <div className="mode-info">
                        <span className="mode-name">Ball &amp; Stick</span>
                        <span className="mode-sub">Kerangka Ikatan Kimia Kovalen 3D</span>
                    </div>
                </button>
                <button
                    className={`mode-btn ${renderMode === 'electrostatic' ? 'active' : ''}`}
                    onClick={() => onSelectRenderMode('electrostatic')}
                >
                    <span className="mode-icon">⚡</span>
                    <div className="mode-info">
                        <span className="mode-name">Coulombic Surface Map</span>
                        <span className="mode-sub">Peta Potensial Elektrostatik (- Fosfat vs 0 Basa)</span>
                    </div>
                </button>
            </div>

            <div className="divider"></div>

            {/* 3. FENOMENA & MODIFIKASI GENETIK */}
            <div className="panel-section-title">
                <span className="icon">✨</span> FENOMENA &amp; LESI MOLEKULER
            </div>
            <p className="section-hint">Simulasi modifikasi epigenetik &amp; kerusakan UV:</p>
            <div className="condition-selector-grid">
                <button
                    className={`condition-btn ${condition === 'normal' ? 'active' : ''}`}
                    onClick={() => onSelectCondition('normal')}
                >
                    <span className="cond-icon">🌿</span>
                    <div className="cond-info">
                        <span className="cond-title">Normal (Heliks Utuh)</span>
                        <span className="cond-sub">Pasangan Chargaff stabil tanpa lesi</span>
                    </div>
                </button>
                <button
                    className={`condition-btn ${condition === 'methylation' ? 'active' : ''}`}
                    onClick={() => onSelectCondition('methylation')}
                >
                    <span className="cond-icon">🧬</span>
                    <div className="cond-info">
                        <span className="cond-title">Metilasi DNA (5-mC)</span>
                        <span className="cond-sub">Epigenetik: Gugus -CH₃ di Major Groove</span>
                    </div>
                </button>
                <button
                    className={`condition-btn ${condition === 'thymine_dimer' ? 'active' : ''}`}
                    onClick={() => onSelectCondition('thymine_dimer')}
                >
                    <span className="cond-icon">☀️</span>
                    <div className="cond-info">
                        <span className="cond-title">Dimer Timin (Radiasi UV)</span>
                        <span className="cond-sub">Cincin Siklobutana CPD &amp; Kink 30°</span>
                    </div>
                </button>
                <button
                    className={`condition-btn ${condition === 'intercalation' ? 'active' : ''}`}
                    onClick={() => onSelectCondition('intercalation')}
                >
                    <span className="cond-icon">💊</span>
                    <div className="cond-info">
                        <span className="cond-title">Interkalasi Obat Kanker</span>
                        <span className="cond-sub">Penyisipan planar &amp; Unwinding heliks</span>
                    </div>
                </button>
            </div>

            <div className="divider"></div>

            {/* 4. SINTESIS SEKUENS NUKLEOTIDA DINAMIS */}
            <div className="panel-section-title">
                <span className="icon">⌨️</span> SINTESIS SEKUENS NUKLEOTIDA
            </div>
            <p className="section-hint">Rancang rantai basa sendiri (Chargaff komplementer):</p>
            <form onSubmit={handleApply} className="seq-input-group">
                <input
                    type="text"
                    id="dna-seq-input"
                    className="seq-input"
                    value={inputSeq}
                    onChange={(e) => setInputSeq(e.target.value.toUpperCase())}
                    maxLength={24}
                    placeholder="Ketik A, T, G, C..."
                    spellCheck="false"
                    autoComplete="off"
                />
                <button type="submit" id="btn-apply-seq" className="seq-apply-btn" title="Rakit Ulang Heliks 3D">
                    Sintesis
                </button>
            </form>
            <div className="seq-preset-chips">
                <button
                    type="button"
                    className={`seq-chip ${sequence === 'ATGCGTACCTACGATC' ? 'active' : ''}`}
                    onClick={() => handleChipClick('ATGCGTACCTACGATC')}
                >
                    Watson-Crick
                </button>
                <button
                    type="button"
                    className={`seq-chip ${sequence === 'CGCGCGGCCGCGCGCG' ? 'active' : ''}`}
                    onClick={() => handleChipClick('CGCGCGGCCGCGCGCG')}
                >
                    CpG Island (GC)
                </button>
                <button
                    type="button"
                    className={`seq-chip ${sequence === 'TATAAATATAAATATA' ? 'active' : ''}`}
                    onClick={() => handleChipClick('TATAAATATAAATATA')}
                >
                    TATA Box (AT)
                </button>
                <button
                    type="button"
                    className={`seq-chip ${sequence === 'CGCGCGCGCGCGCGCG' ? 'active' : ''}`}
                    onClick={() => handleChipClick('CGCGCGCGCGCGCGCG')}
                >
                    poly(dG-dC) Z
                </button>
            </div>
            <div className="seq-stats-badge" id="seq-stats-badge">
                <div className="seq-stat-item"><span className="stat-lbl">Panjang:</span> <b>{sequenceStats.length} pb</b></div>
                <div className="seq-stat-item"><span className="stat-lbl">GC:</span> <b>{sequenceStats.gcPercent}</b></div>
                <div className="seq-stat-item"><span className="stat-lbl">Tₘ:</span> <b>{sequenceStats.tm}</b></div>
                <div className="seq-stat-item"><span className="stat-lbl">Ikatan H:</span> <b>{sequenceStats.hBonds}</b></div>
            </div>

            <div className="divider"></div>

            {/* 5. BIOFISIKA & LINGKUNGAN SEL */}
            <div className="panel-section-title">
                <span className="icon">🌡️</span> BIOFISIKA &amp; LINGKUNGAN SEL
            </div>
            <p className="section-hint">Parameter dinamis molekul dalam sitoplasma:</p>
            <div className="toggle-group">
                <button
                    id="btn-toggle-thermal"
                    className={`ctrl-btn ${thermalDynamics ? 'active' : ''}`}
                    onClick={onToggleThermal}
                >
                    <span>🌊 Dinamika Termal (37°C): <b>{thermalDynamics ? 'AKTIF' : 'NONAKTIF'}</b></span>
                </button>
                <button
                    id="btn-toggle-ions"
                    className={`ctrl-btn ${showIons ? 'active' : ''}`}
                    onClick={onToggleIons}
                >
                    <span>💧 Solvasi &amp; Ion Lawan (Mg²⁺): <b>{showIons ? 'AKTIF' : 'SEMBUNYI'}</b></span>
                </button>
                <button
                    id="btn-toggle-metrics"
                    className={`ctrl-btn ${metricScaleVisible ? 'active' : ''}`}
                    onClick={onToggleMetrics}
                >
                    <span>📐 Skala Metrik (nm / Å): <b>{metricScaleVisible ? 'TAMPIL' : 'SEMBUNYI'}</b></span>
                </button>
            </div>

            <div className="divider"></div>

            {/* KONTROL PEMISAHAN */}
            <div className="panel-section-title">
                <span className="icon">⚡</span> KONTROL PEMISAHAN
            </div>
            <div className="btn-group-primary">
                {assemblyMode === 'assembled' ? (
                    <>
                        <button id="btn-unzip" className="action-btn btn-neon-blue" onClick={onUnzip}>
                            <span className="btn-icon">⚡</span>
                            <span className="btn-text">Pisahkan Untai Ganda (Unzip)</span>
                        </button>
                        <button id="btn-explode" className="action-btn btn-neon-purple" onClick={onExplode}>
                            <span className="btn-icon">💥</span>
                            <span className="btn-text">Uraikan Per Bagian (Exploded)</span>
                        </button>
                    </>
                ) : (
                    <button id="btn-reset-assembly" className="action-btn btn-neon-green" onClick={onResetAssembly}>
                        <span className="btn-icon">🔄</span>
                        <span className="btn-text">Gabungkan Kembali Heliks</span>
                    </button>
                )}
            </div>

            <div className="divider"></div>

            {/* ANOTASI & LABEL */}
            <div className="panel-section-title">
                <span className="icon">🏷️</span> ANOTASI &amp; LABEL
            </div>
            <div className="toggle-group">
                <button
                    id="btn-toggle-labels"
                    className={`ctrl-btn ${labelsVisible ? 'active' : ''}`}
                    onClick={onToggleLabels}
                >
                    <span>👁️ Label Ilmiah 3D: <b>{labelsVisible ? 'TAMPIL' : 'SEMBUNYI'}</b></span>
                </button>
            </div>

            <div className="divider"></div>

            {/* ISOLASI KOMPONEN */}
            <div className="panel-section-title">
                <span className="icon">🔬</span> ISOLASI KOMPONEN
            </div>
            <p className="section-hint">Ketuk untuk menonjolkan bagian tertentu:</p>
            <div className="filter-chips-scroll">
                <div className="filter-chips">
                    <button className={`chip ${filterComponent === 'all' ? 'active' : ''}`} onClick={() => onSelectFilter('all')}>Semua</button>
                    <button className={`chip chip-backbone ${filterComponent === 'backbone' ? 'active' : ''}`} onClick={() => onSelectFilter('backbone')}>Pita Gula-Fosfat</button>
                    <button className={`chip chip-adenine ${filterComponent === 'A' ? 'active' : ''}`} onClick={() => onSelectFilter('A')}>Adenin (A - Biru)</button>
                    <button className={`chip chip-thymine ${filterComponent === 'T' ? 'active' : ''}`} onClick={() => onSelectFilter('T')}>Timin (T - Kuning)</button>
                    <button className={`chip chip-guanine ${filterComponent === 'G' ? 'active' : ''}`} onClick={() => onSelectFilter('G')}>Guanin (G - Hijau)</button>
                    <button className={`chip chip-cytosine ${filterComponent === 'C' ? 'active' : ''}`} onClick={() => onSelectFilter('C')}>Sitosin (C - Merah)</button>
                    <button className={`chip chip-hbond ${filterComponent === 'hbond' ? 'active' : ''}`} onClick={() => onSelectFilter('hbond')}>Ikatan Hidrogen</button>
                </div>
            </div>

            <div className="divider"></div>

            {/* NAVIGASI KAMERA */}
            <div className="panel-section-title">
                <span className="icon">🎥</span> NAVIGASI KAMERA INDEPENDEN
            </div>
            <p className="section-hint">Pilih mode interaksi utama atau gunakan kontrol presisi:</p>
            <div className="camera-mode-tabs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <button
                    type="button"
                    id="btn-cam-mode-rotate"
                    className={`ctrl-btn ${cameraControlMode === 'rotate' ? 'active' : ''}`}
                    style={{ marginBottom: 0, justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                    onClick={() => onSelectCameraMode('rotate')}
                    title="Geser kursor/sentuhan untuk memutar orbit 360° secara independen"
                >
                    <span>🔄</span>
                    <span>Mode Rotasi</span>
                </button>
                <button
                    type="button"
                    id="btn-cam-mode-pan"
                    className={`ctrl-btn ${cameraControlMode === 'pan' ? 'active' : ''}`}
                    style={{ marginBottom: 0, justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                    onClick={() => onSelectCameraMode('pan')}
                    title="Geser kursor/sentuhan untuk menggeser posisi kamera (Pan X/Y) secara independen"
                >
                    <span>✥</span>
                    <span>Mode Geser (Pan)</span>
                </button>
            </div>

            {/* Panel Presisi Geser (Pan) & Orbit (Rotate) */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '10px',
                    background: 'rgba(6, 18, 40, 0.55)',
                    border: '1px solid rgba(56, 189, 248, 0.16)',
                    borderRadius: '10px',
                    padding: '10px'
                }}
            >
                <div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px', textAlign: 'center' }}>
                        GESER POSISI (PAN)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                        <span />
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center' }} onClick={() => onCameraStep('pan_up')} title="Geser Kamera ke Atas">↑</button>
                        <span />
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center' }} onClick={() => onCameraStep('pan_left')} title="Geser Kamera ke Kiri">←</button>
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center', fontSize: '0.7rem' }} onClick={() => onCameraStep('center_pan')} title="Pusatkan Titik Fokus (0,0,0)">⌖</button>
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center' }} onClick={() => onCameraStep('pan_right')} title="Geser Kamera ke Kanan">→</button>
                        <span />
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center' }} onClick={() => onCameraStep('pan_down')} title="Geser Kamera ke Bawah">↓</button>
                        <span />
                    </div>
                </div>

                <div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px', textAlign: 'center' }}>
                        ORBIT PRESISI (15°)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                        <span />
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center' }} onClick={() => onCameraStep('rotate_up')} title="Putar Orbit ke Atas 15°">⤒</button>
                        <span />
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center' }} onClick={() => onCameraStep('rotate_left')} title="Putar Orbit ke Kiri 15°">⟲</button>
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center', fontSize: '0.7rem' }} onClick={() => onCameraStep('zoom_in')} title="Perbesar (Zoom In)">＋</button>
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center' }} onClick={() => onCameraStep('rotate_right')} title="Putar Orbit ke Kanan 15°">⟳</button>
                        <span />
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center' }} onClick={() => onCameraStep('rotate_down')} title="Putar Orbit ke Bawah 15°">⤓</button>
                        <button type="button" className="ctrl-btn" style={{ marginBottom: 0, padding: '6px 0', justifyContent: 'center', fontSize: '0.7rem' }} onClick={() => onCameraStep('zoom_out')} title="Perkecil (Zoom Out)">－</button>
                    </div>
                </div>
            </div>

            <div className="camera-controls">
                <button
                    id="btn-toggle-rotate"
                    className={`ctrl-btn ${autoRotate ? 'active' : ''}`}
                    onClick={onToggleRotate}
                >
                    <span>🔄 Rotasi Otomatis: <b>{autoRotate ? 'AKTIF' : 'NONAKTIF'}</b></span>
                </button>
                <button id="btn-reset-camera" className="ctrl-btn" onClick={onResetCamera}>
                    <span>🎯 Reset Sudut Pandang Awal</span>
                </button>
            </div>

            <div className="divider"></div>

            {/* REALITAS VIRTUAL (WebXR 360°) */}
            <div className="panel-section-title">
                <span className="icon">🥽</span> VIRTUAL REALITY (WebXR 360°)
            </div>
            <p className="section-hint">
                {webXrStatus === 'supported'
                    ? 'Headset WebXR terdeteksi — siap masuk ruang imersif 360°:'
                    : 'Eksplorasi kubah observatorium 360° & lensa stereo VR:'}
            </p>
            <div className="toggle-group">
                <button
                    type="button"
                    id="btn-panel-toggle-vr"
                    className={`ctrl-btn ${isVrModeActive ? 'active' : ''}`}
                    onClick={onToggleVrMode}
                >
                    <span>
                        🥽 Mode Virtual Reality (360°): <b>{isVrModeActive ? 'AKTIF' : 'NONAKTIF'}</b>
                    </span>
                </button>
                {isVrModeActive && (
                    <button
                        type="button"
                        id="btn-panel-toggle-stereo"
                        className={`ctrl-btn ${isStereoLensMode ? 'active' : ''}`}
                        onClick={onToggleStereoLensMode}
                    >
                        <span>
                            👓 Lensa Stereo Headset (SBS): <b>{isStereoLensMode ? 'DUAL-EYE' : 'PANORAMA 360°'}</b>
                        </span>
                    </button>
                )}
            </div>

            {/* LEGENDA BIOKIMIA */}
            <div className="legend-box">
                <div className="legend-title">LEGENDA &amp; KLASIFIKASI BIOKIMIA</div>
                <div className="legend-grid">
                    <div className="legend-item"><span className="color-dot dot-a"></span> <b>A</b> Adenin (Purin: 2 Cincin)</div>
                    <div className="legend-item"><span className="color-dot dot-t"></span> <b>T</b> Timin (Pirimidin: 1 Cincin)</div>
                    <div className="legend-item"><span className="color-dot dot-g"></span> <b>G</b> Guanin (Purin: 2 Cincin)</div>
                    <div className="legend-item"><span className="color-dot dot-c"></span> <b>C</b> Sitosin (Pirimidin: 1 Cincin)</div>
                    <div className="legend-item"><span className="color-dot dot-backbone"></span> <b>P-S</b> Gula Deoksiribosa-Fosfat</div>
                    <div className="legend-item"><span className="color-dot dot-hbond"></span> <b>···</b> Ikatan Hidrogen (A=T, G≡C)</div>
                    <div className="legend-item"><span className="color-dot dot-methyl"></span> <b>-CH₃</b> Metilasi Epigenetik (5-mC)</div>
                    <div className="legend-item"><span className="color-dot dot-dimer"></span> <b>CPD</b> Dimer Timin Fotoproduk UV</div>
                    <div className="legend-item"><span className="color-dot dot-intercalator"></span> <b>Drug</b> Interkalasi Kemoterapi</div>
                    <div className="legend-item"><span className="color-dot dot-ion"></span> <b>Mg²⁺</b> Ion Lawan &amp; Air Solvasi</div>
                </div>
                <div className="legend-polarity-row">
                    <div className="polarity-chip"><b>5'</b> Fosfat Bebas</div>
                    <div className="polarity-arrow">⇄</div>
                    <div className="polarity-chip"><b>3'</b> -OH Bebas (Antiparalel)</div>
                </div>
                {renderMode === 'electrostatic' ? (
                    <div className="legend-electro-row">
                        <span className="electro-label">Potensial Coulomb:</span>
                        <span className="electro-bar"></span>
                        <span className="electro-tags"><span>-1e (Fosfat)</span><span>0 (Netral)</span><span>+1e (Amino)</span></span>
                    </div>
                ) : (
                    <div className="legend-cpk-row">
                        <span className="cpk-label">Standar CPK:</span>
                        <span className="cpk-item"><i style={{ background: '#3b4252' }}></i>C</span>
                        <span className="cpk-item"><i style={{ background: '#1d4ed8' }}></i>N</span>
                        <span className="cpk-item"><i style={{ background: '#dc2626' }}></i>O</span>
                        <span className="cpk-item"><i style={{ background: '#d97706' }}></i>P</span>
                        <span className="cpk-item"><i style={{ background: '#e2e8f0' }}></i>H</span>
                    </div>
                )}
            </div>
        </aside>
    );
};

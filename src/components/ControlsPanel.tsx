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
    WebXrSupportStatus,
    BloomPresetType,
    ExportFormatType,
    VrLocomotionMode,
    VrGameTelemetry
} from '../types/dna';

export const BLOOM_PRESETS: Record<Exclude<BloomPresetType, 'custom'>, { label: string; strength: number; threshold: number; desc: string }> = {
    subtle: {
        label: 'Subtle (Kristal Halus)',
        strength: 0.25,
        threshold: 0.92,
        desc: 'Pendaran lembut dan tajam hanya pada ikatan hidrogen terkuat.'
    },
    cinematic: {
        label: 'Cinematic (Studio Seimbang)',
        strength: 0.36,
        threshold: 0.82,
        desc: 'Keseimbangan studio antara aksen pendaran dan kejernihan material PBR.'
    },
    extreme: {
        label: 'Extreme (Bioluminesensi Penuh)',
        strength: 0.75,
        threshold: 0.54,
        desc: 'Pendaran intens pada pita fosfat, cincin basa, dan jembatan hidrogen.'
    }
};

type PanelTabCategory = 'all' | 'structure' | 'optics' | 'biophysics';

interface ControlsPanelProps {
    isOpen: boolean;
    isDesktopCollapsed?: boolean;
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
    bloomEnabled: boolean;
    bloomStrength: number;
    bloomThreshold: number;
    onToggleBloom: () => void;
    onChangeBloomStrength: (strength: number) => void;
    onChangeBloomThreshold: (threshold: number) => void;
    dofEnabled: boolean;
    dofAperture: number;
    envReflectionIntensity: number;
    onToggleDof: () => void;
    onChangeDofAperture: (aperture: number) => void;
    onChangeEnvReflectionIntensity: (intensity: number) => void;
    onExportFile: (format: ExportFormatType) => void;
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
    vrLocomotionMode: VrLocomotionMode;
    isVrGameActive: boolean;
    isVrAudioMuted: boolean;
    vrGameTelemetry?: VrGameTelemetry;
    onToggleVrMode: () => void;
    onToggleStereoLensMode: () => void;
    onChangeVrLocomotionMode: (mode: VrLocomotionMode) => void;
    onToggleVrGame: () => void;
    onToggleVrAudioMute: () => void;
}

const CONFORMATION_SUMMARY: Record<ConformationType, { title: string; detail: string }> = {
    B: {
        title: 'B-DNA · Fisiologis Standar',
        detail: 'Heliks Kanan · 10.5 pb/putaran · Diameter 2.0 nm'
    },
    A: {
        title: 'A-DNA · Terdehidrasi & Hibrida RNA',
        detail: 'Heliks Kanan · 11.0 pb/putaran · Kemiringan Basa 19°'
    },
    Z: {
        title: 'Z-DNA · Konformasi Zigzag Kidal',
        detail: 'Heliks Kidal · 12.0 pb/putaran · Diameter 1.8 nm'
    }
};

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
    isOpen,
    isDesktopCollapsed = false,
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
    bloomEnabled,
    bloomStrength,
    bloomThreshold,
    onToggleBloom,
    onChangeBloomStrength,
    onChangeBloomThreshold,
    dofEnabled,
    dofAperture,
    envReflectionIntensity,
    onToggleDof,
    onChangeDofAperture,
    onChangeEnvReflectionIntensity,
    onExportFile,
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
    vrLocomotionMode,
    isVrGameActive,
    isVrAudioMuted,
    vrGameTelemetry,
    onToggleVrMode,
    onToggleStereoLensMode,
    onChangeVrLocomotionMode,
    onToggleVrGame,
    onToggleVrAudioMute
}) => {
    const [inputSeq, setInputSeq] = useState(sequence);
    const [activeSectionTab, setActiveSectionTab] = useState<PanelTabCategory>('all');

    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();
        onApplySequence(inputSeq);
    };

    const handleChipClick = (seq: string) => {
        setInputSeq(seq);
        onApplySequence(seq);
    };

    const currentBloomPreset: BloomPresetType = (() => {
        const eps = 0.015;
        if (Math.abs(bloomStrength - BLOOM_PRESETS.subtle.strength) < eps && Math.abs(bloomThreshold - BLOOM_PRESETS.subtle.threshold) < eps) {
            return 'subtle';
        }
        if (Math.abs(bloomStrength - BLOOM_PRESETS.cinematic.strength) < eps && Math.abs(bloomThreshold - BLOOM_PRESETS.cinematic.threshold) < eps) {
            return 'cinematic';
        }
        if (Math.abs(bloomStrength - BLOOM_PRESETS.extreme.strength) < eps && Math.abs(bloomThreshold - BLOOM_PRESETS.extreme.threshold) < eps) {
            return 'extreme';
        }
        return 'custom';
    })();

    const handleSelectBloomPreset = (presetKey: string) => {
        if (presetKey === 'subtle' || presetKey === 'cinematic' || presetKey === 'extreme') {
            const preset = BLOOM_PRESETS[presetKey];
            onChangeBloomStrength(preset.strength);
            onChangeBloomThreshold(preset.threshold);
        }
    };

    const showStructure = activeSectionTab === 'all' || activeSectionTab === 'structure';
    const showBiophysics = activeSectionTab === 'all' || activeSectionTab === 'biophysics';
    const showOptics = activeSectionTab === 'all' || activeSectionTab === 'optics';

    return (
        <aside
            id="controls-panel"
            className={`glass-panel responsive-drawer ${isOpen ? 'drawer-open' : ''} ${isDesktopCollapsed ? 'desktop-collapsed' : ''}`}
        >
            <div className="mobile-drawer-handle"></div>

            {/* Sticky Panel Header */}
            <div className="panel-top-header">
                <div className="panel-header-flex">
                    <div className="panel-title-wrap">
                        <span className="panel-kicker">INSTRUMEN PARAMETER</span>
                        <h2 className="panel-main-title">Kontrol Molekuler</h2>
                    </div>
                    <button id="btn-close-controls" className="btn-icon-close" title="Sembunyikan Panel Kontrol" onClick={onClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Category Filter Tabs */}
                <div className="panel-category-tabs" role="tablist" aria-label="Filter Kategori Kontrol">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSectionTab === 'all'}
                        className={`panel-cat-tab ${activeSectionTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveSectionTab('all')}
                    >
                        Semua
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSectionTab === 'structure'}
                        className={`panel-cat-tab ${activeSectionTab === 'structure' ? 'active' : ''}`}
                        onClick={() => setActiveSectionTab('structure')}
                    >
                        Struktur
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSectionTab === 'biophysics'}
                        className={`panel-cat-tab ${activeSectionTab === 'biophysics' ? 'active' : ''}`}
                        onClick={() => setActiveSectionTab('biophysics')}
                    >
                        Biofisika
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSectionTab === 'optics'}
                        className={`panel-cat-tab ${activeSectionTab === 'optics' ? 'active' : ''}`}
                        onClick={() => setActiveSectionTab('optics')}
                    >
                        Optik &amp; Kamera
                    </button>
                </div>
            </div>

            <div className="panel-scroll-body">
                {/* SECTION 1: KONFORMASI & REPRESENTASI */}
                <div className={showStructure ? 'panel-module' : 'hidden'}>
                    <div className="panel-section-header">
                        <span className="panel-section-title">01. Konformasi Alotropik</span>
                        <span className="panel-section-meta">Dickerson &amp; Saenger</span>
                    </div>

                    <div className="conformation-segmented">
                        <button
                            type="button"
                            className={`conf-seg-btn ${conformation === 'B' ? 'active' : ''}`}
                            onClick={() => onSelectConformation('B')}
                            title="B-DNA: Bentuk fisiologis alami seluler"
                        >
                            <span className="conf-code">B-DNA</span>
                            <span className="conf-label">Fisiologis</span>
                        </button>
                        <button
                            type="button"
                            className={`conf-seg-btn ${conformation === 'A' ? 'active' : ''}`}
                            onClick={() => onSelectConformation('A')}
                            title="A-DNA: Terdehidrasi & hibrida DNA-RNA"
                        >
                            <span className="conf-code">A-DNA</span>
                            <span className="conf-label">Kompak 19°</span>
                        </button>
                        <button
                            type="button"
                            className={`conf-seg-btn ${conformation === 'Z' ? 'active' : ''}`}
                            onClick={() => onSelectConformation('Z')}
                            title="Z-DNA: Heliks kidal bergantian purin-pirimidin"
                        >
                            <span className="conf-code">Z-DNA</span>
                            <span className="conf-label">Heliks Kidal</span>
                        </button>
                    </div>
                    <div className="conformation-readout">
                        <div className="conf-readout-title">{CONFORMATION_SUMMARY[conformation].title}</div>
                        <div className="conf-readout-sub">{CONFORMATION_SUMMARY[conformation].detail}</div>
                    </div>

                    <div className="divider"></div>

                    {/* 2. MODE REPRESENTASI MOLEKULER */}
                    <div className="panel-section-header">
                        <span className="panel-section-title">02. Standar Representasi Ilmiah</span>
                        <span className="panel-section-meta">RCSB PDB / PyMOL</span>
                    </div>
                    <div className="mode-selector-grid">
                        <button
                            type="button"
                            className={`mode-btn ${renderMode === 'bio' ? 'active' : ''}`}
                            onClick={() => onSelectRenderMode('bio')}
                        >
                            <div className="mode-top-row">
                                <span className="mode-code-tag">BIO</span>
                                <span className="mode-name">Bio-Illustrative</span>
                            </div>
                            <span className="mode-sub">Cincin Aromatik &amp; Pita Gula-Fosfat</span>
                        </button>
                        <button
                            type="button"
                            className={`mode-btn ${renderMode === 'cpk' ? 'active' : ''}`}
                            onClick={() => onSelectRenderMode('cpk')}
                        >
                            <div className="mode-top-row">
                                <span className="mode-code-tag">CPK</span>
                                <span className="mode-name">CPK Space-Filling</span>
                            </div>
                            <span className="mode-sub">Volume Atomik Van der Waals</span>
                        </button>
                        <button
                            type="button"
                            className={`mode-btn ${renderMode === 'ballstick' ? 'active' : ''}`}
                            onClick={() => onSelectRenderMode('ballstick')}
                        >
                            <div className="mode-top-row">
                                <span className="mode-code-tag">B&amp;S</span>
                                <span className="mode-name">Ball &amp; Stick</span>
                            </div>
                            <span className="mode-sub">Geometri Ikatan Kovalen 3D</span>
                        </button>
                        <button
                            type="button"
                            className={`mode-btn ${renderMode === 'electrostatic' ? 'active' : ''}`}
                            onClick={() => onSelectRenderMode('electrostatic')}
                        >
                            <div className="mode-top-row">
                                <span className="mode-code-tag">ESP</span>
                                <span className="mode-name">Coulombic Surface</span>
                            </div>
                            <span className="mode-sub">Distribusi Potensial Elektrostatik</span>
                        </button>
                    </div>

                    <div className="divider"></div>

                    {/* 3. SINTESIS SEKUENS NUKLEOTIDA DINAMIS */}
                    <div className="panel-section-header">
                        <span className="panel-section-title">03. Sintesis Sekuens Nukleotida</span>
                        <span className="panel-section-meta">Chargaff A=T, G≡C</span>
                    </div>
                    <form onSubmit={handleApply} className="seq-input-group">
                        <input
                            type="text"
                            id="dna-seq-input"
                            className="seq-input"
                            value={inputSeq}
                            onChange={(e) => setInputSeq(e.target.value.toUpperCase())}
                            maxLength={24}
                            placeholder="Ketik urutan A, T, G, C..."
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
                            poly(dG-dC)
                        </button>
                    </div>
                    <div className="seq-stats-badge" id="seq-stats-badge">
                        <div className="seq-stat-item">
                            <span className="stat-lbl">Panjang</span>
                            <b>{sequenceStats.length} pb</b>
                        </div>
                        <div className="seq-stat-item">
                            <span className="stat-lbl">Kandungan GC</span>
                            <b>{sequenceStats.gcPercent}</b>
                        </div>
                        <div className="seq-stat-item">
                            <span className="stat-lbl">Titik Leleh (Tₘ)</span>
                            <b>{sequenceStats.tm}</b>
                        </div>
                        <div className="seq-stat-item">
                            <span className="stat-lbl">Ikatan Hidrogen</span>
                            <b>{sequenceStats.hBonds}</b>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* ISOLASI KOMPONEN & PEMISAHAN UNTAI */}
                    <div className="panel-section-header">
                        <span className="panel-section-title">04. Manipulasi Untai &amp; Isolasi</span>
                        <span className="panel-section-meta">Topologi Heliks</span>
                    </div>
                    <div className="btn-group-primary">
                        {assemblyMode === 'assembled' ? (
                            <div className="action-btn-row">
                                <button id="btn-unzip" className="action-btn btn-neon-blue" onClick={onUnzip}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M16 3h5v5" />
                                        <path d="M8 3H3v5" />
                                        <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
                                        <path d="m15 9 6-6" />
                                    </svg>
                                    <span className="btn-text">Pisahkan Untai (Unzip)</span>
                                </button>
                                <button id="btn-explode" className="action-btn btn-neon-purple" onClick={onExplode}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="15 3 21 3 21 9" />
                                        <polyline points="9 21 3 21 3 15" />
                                        <line x1="21" y1="3" x2="14" y2="10" />
                                        <line x1="3" y1="21" x2="10" y2="14" />
                                    </svg>
                                    <span className="btn-text">Uraikan (Exploded)</span>
                                </button>
                            </div>
                        ) : (
                            <button id="btn-reset-assembly" className="action-btn btn-neon-green" onClick={onResetAssembly}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                </svg>
                                <span className="btn-text">Gabungkan Kembali Heliks</span>
                            </button>
                        )}
                    </div>

                    <div className="filter-chips-scroll" style={{ marginTop: '10px' }}>
                        <div className="filter-chips">
                            <button className={`chip ${filterComponent === 'all' ? 'active' : ''}`} onClick={() => onSelectFilter('all')}>Semua Struktur</button>
                            <button className={`chip chip-backbone ${filterComponent === 'backbone' ? 'active' : ''}`} onClick={() => onSelectFilter('backbone')}>Pita Gula-Fosfat</button>
                            <button className={`chip chip-adenine ${filterComponent === 'A' ? 'active' : ''}`} onClick={() => onSelectFilter('A')}>Adenin (A)</button>
                            <button className={`chip chip-thymine ${filterComponent === 'T' ? 'active' : ''}`} onClick={() => onSelectFilter('T')}>Timin (T)</button>
                            <button className={`chip chip-guanine ${filterComponent === 'G' ? 'active' : ''}`} onClick={() => onSelectFilter('G')}>Guanin (G)</button>
                            <button className={`chip chip-cytosine ${filterComponent === 'C' ? 'active' : ''}`} onClick={() => onSelectFilter('C')}>Sitosin (C)</button>
                            <button className={`chip chip-hbond ${filterComponent === 'hbond' ? 'active' : ''}`} onClick={() => onSelectFilter('hbond')}>Ikatan Hidrogen</button>
                        </div>
                    </div>
                </div>

                {activeSectionTab === 'all' && <div className="divider"></div>}

                {/* SECTION 2: BIOFISIKA & LESI MOLEKULER */}
                <div className={showBiophysics ? 'panel-module' : 'hidden'}>
                    <div className="panel-section-header">
                        <span className="panel-section-title">05. Kondisi &amp; Lesi Molekuler</span>
                        <span className="panel-section-meta">Epigenetika &amp; Patologi</span>
                    </div>
                    <div className="condition-selector-grid">
                        <button
                            type="button"
                            className={`condition-btn ${condition === 'normal' ? 'active' : ''}`}
                            onClick={() => onSelectCondition('normal')}
                        >
                            <div className="mode-top-row">
                                <span className="cond-code-tag">WT</span>
                                <span className="cond-title">Normal (Heliks Utuh)</span>
                            </div>
                            <span className="cond-sub">Pasangan basa kanonik tanpa distorsi</span>
                        </button>
                        <button
                            type="button"
                            className={`condition-btn ${condition === 'methylation' ? 'active' : ''}`}
                            onClick={() => onSelectCondition('methylation')}
                        >
                            <div className="mode-top-row">
                                <span className="cond-code-tag">5mC</span>
                                <span className="cond-title">Metilasi DNA (5-mC)</span>
                            </div>
                            <span className="cond-sub">Adduksi -CH₃ pada C5 Sitosin</span>
                        </button>
                        <button
                            type="button"
                            className={`condition-btn ${condition === 'thymine_dimer' ? 'active' : ''}`}
                            onClick={() => onSelectCondition('thymine_dimer')}
                        >
                            <div className="mode-top-row">
                                <span className="cond-code-tag">CPD</span>
                                <span className="cond-title">Dimer Timin (Lesi UV)</span>
                            </div>
                            <span className="cond-sub">Cincin siklobutana &amp; tekukan 30°</span>
                        </button>
                        <button
                            type="button"
                            className={`condition-btn ${condition === 'intercalation' ? 'active' : ''}`}
                            onClick={() => onSelectCondition('intercalation')}
                        >
                            <div className="mode-top-row">
                                <span className="cond-code-tag">INT</span>
                                <span className="cond-title">Interkalasi Kemoterapi</span>
                            </div>
                            <span className="cond-sub">Penyisipan planar &amp; renggangan aksial</span>
                        </button>
                    </div>

                    <div className="divider"></div>

                    <div className="panel-section-header">
                        <span className="panel-section-title">06. Biofisika &amp; Anotasi Metrik</span>
                        <span className="panel-section-meta">Fisiologi 37°C</span>
                    </div>
                    <div className="toggle-group">
                        <button
                            id="btn-toggle-thermal"
                            type="button"
                            className={`ctrl-btn ${thermalDynamics ? 'active' : ''}`}
                            onClick={onToggleThermal}
                        >
                            <span className="ctrl-btn-label">Dinamika Termal Brownian (37°C)</span>
                            <span className={`status-pill ${thermalDynamics ? 'on' : 'off'}`}>
                                {thermalDynamics ? 'AKTIF' : 'NONAKTIF'}
                            </span>
                        </button>
                        <button
                            id="btn-toggle-ions"
                            type="button"
                            className={`ctrl-btn ${showIons ? 'active' : ''}`}
                            onClick={onToggleIons}
                        >
                            <span className="ctrl-btn-label">Solvasi Air &amp; Kation Mg²⁺</span>
                            <span className={`status-pill ${showIons ? 'on' : 'off'}`}>
                                {showIons ? 'AKTIF' : 'SEMBUNYI'}
                            </span>
                        </button>
                        <button
                            id="btn-toggle-metrics"
                            type="button"
                            className={`ctrl-btn ${metricScaleVisible ? 'active' : ''}`}
                            onClick={onToggleMetrics}
                        >
                            <span className="ctrl-btn-label">Penggaris Dimensi Metrik (nm / Å)</span>
                            <span className={`status-pill ${metricScaleVisible ? 'on' : 'off'}`}>
                                {metricScaleVisible ? 'TAMPIL' : 'SEMBUNYI'}
                            </span>
                        </button>
                        <button
                            id="btn-toggle-labels"
                            type="button"
                            className={`ctrl-btn ${labelsVisible ? 'active' : ''}`}
                            onClick={onToggleLabels}
                        >
                            <span className="ctrl-btn-label">Anotasi Struktur 3D</span>
                            <span className={`status-pill ${labelsVisible ? 'on' : 'off'}`}>
                                {labelsVisible ? 'TAMPIL' : 'SEMBUNYI'}
                            </span>
                        </button>
                    </div>
                </div>

                {activeSectionTab === 'all' && <div className="divider"></div>}

                {/* SECTION 3: OPTIK BLOOM, BOKEH MAKRO, PBR, KAMERA & WEBXR */}
                <div className={showOptics ? 'panel-module' : 'hidden'}>
                    <div className="panel-section-header">
                        <span className="panel-section-title">07. Post-Processing Optik (Bloom, Bokeh &amp; PBR)</span>
                        <span className="panel-section-meta">HDR &amp; RoomEnv</span>
                    </div>
                    <div className="toggle-group">
                        <button
                            id="btn-toggle-bloom"
                            type="button"
                            className={`ctrl-btn ${bloomEnabled ? 'active' : ''}`}
                            onClick={onToggleBloom}
                        >
                            <span className="ctrl-btn-label">Post-Processing Pendaran Bloom</span>
                            <span className={`status-pill ${bloomEnabled ? 'on' : 'off'}`}>
                                {bloomEnabled ? 'AKTIF' : 'NONAKTIF'}
                            </span>
                        </button>
                        {bloomEnabled && (
                            <div className="bloom-calibration-box">
                                <div className="bloom-row">
                                    <label htmlFor="select-bloom-preset" className="bloom-label">
                                        Preset Gaya
                                    </label>
                                    <select
                                        id="select-bloom-preset"
                                        value={currentBloomPreset}
                                        onChange={(e) => handleSelectBloomPreset(e.target.value)}
                                        className="bloom-select"
                                        title="Pilih preset gaya pencahayaan Bloom otomatis (Subtle, Cinematic, Extreme)"
                                    >
                                        <option value="subtle">Subtle (Kristal Halus)</option>
                                        <option value="cinematic">Cinematic (Studio Seimbang)</option>
                                        <option value="extreme">Extreme (Bioluminesensi Penuh)</option>
                                        {currentBloomPreset === 'custom' && (
                                            <option value="custom">Custom (Manual)</option>
                                        )}
                                    </select>
                                </div>
                                <div className="bloom-row">
                                    <span className="bloom-label">
                                        Intensitas Glow <b className="mono-val">{Math.round(bloomStrength * 100)}%</b>
                                    </span>
                                    <input
                                        id="slider-bloom-strength"
                                        type="range"
                                        min={0.1}
                                        max={1.0}
                                        step={0.05}
                                        value={bloomStrength}
                                        onChange={(e) => onChangeBloomStrength(parseFloat(e.target.value))}
                                        className="bloom-slider"
                                        title="Atur intensitas pendaran cahaya UnrealBloomPass"
                                    />
                                </div>
                                <div className="bloom-row">
                                    <span className="bloom-label">
                                        Emission Threshold <b className="mono-val">{bloomThreshold.toFixed(2)}</b>
                                    </span>
                                    <input
                                        id="slider-bloom-threshold"
                                        type="range"
                                        min={0.30}
                                        max={1.20}
                                        step={0.02}
                                        value={bloomThreshold}
                                        onChange={(e) => onChangeBloomThreshold(parseFloat(e.target.value))}
                                        className="bloom-slider"
                                        title="Naikkan Emission Threshold agar hanya aksen neon paling terang yang berpendar"
                                    />
                                </div>
                                <div className="bloom-desc">
                                    {currentBloomPreset !== 'custom'
                                        ? BLOOM_PRESETS[currentBloomPreset].desc
                                        : 'Konfigurasi manual aktif — sesuaikan kekuatan pijar dan ambang batas emisi.'}
                                </div>
                            </div>
                        )}

                        {/* Depth of Field (BokehPass Makro) & Refleksi PBR RoomEnvironment */}
                        <button
                            id="btn-toggle-dof"
                            type="button"
                            className={`ctrl-btn ${dofEnabled ? 'active' : ''}`}
                            onClick={onToggleDof}
                        >
                            <span className="ctrl-btn-label">Bokeh Kedalaman Ruang (Depth of Field)</span>
                            <span className={`status-pill ${dofEnabled ? 'on' : 'off'}`}>
                                {dofEnabled ? 'AKTIF' : 'NONAKTIF'}
                            </span>
                        </button>
                        <div className="bloom-calibration-box">
                            {dofEnabled && (
                                <div className="bloom-row">
                                    <span className="bloom-label">
                                        Bukaan Bokeh Makro <b className="mono-val">{(dofAperture * 10000).toFixed(1)}f</b>
                                    </span>
                                    <input
                                        id="slider-dof-aperture"
                                        type="range"
                                        min={0.00004}
                                        max={0.00045}
                                        step={0.00001}
                                        value={dofAperture}
                                        onChange={(e) => onChangeDofAperture(parseFloat(e.target.value))}
                                        className="bloom-slider"
                                        title="Atur bukaan lensa BokehPass (otomatis memperdalam fokus saat Auto-Focus nukleotida)"
                                    />
                                </div>
                            )}
                            <div className="bloom-row">
                                <span className="bloom-label">
                                    Kilau PBR Lab (PMREM) <b className="mono-val">{envReflectionIntensity.toFixed(2)}×</b>
                                </span>
                                <input
                                    id="slider-env-reflection"
                                    type="range"
                                    min={0.20}
                                    max={2.40}
                                    step={0.05}
                                    value={envReflectionIntensity}
                                    onChange={(e) => onChangeEnvReflectionIntensity(parseFloat(e.target.value))}
                                    className="bloom-slider"
                                    title="Intensitas pantulan mikroskopis RoomEnvironment pada permukaan atom CPK dan cincin purin/pirimidin"
                                />
                            </div>
                            <div className="bloom-desc">
                                Fokus BokehPass melacak jarak titik bidik kamera secara dinamis dan otomatis mempertajam efek makro saat Auto-Focus nukleotida aktif.
                            </div>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* NAVIGASI KAMERA */}
                    <div className="panel-section-header">
                        <span className="panel-section-title">08. Navigasi Kamera Presisi</span>
                        <span className="panel-section-meta">6-DOF Orbit &amp; Pan</span>
                    </div>
                    <div className="camera-mode-tabs">
                        <button
                            type="button"
                            id="btn-cam-mode-rotate"
                            className={`cam-seg-btn ${cameraControlMode === 'rotate' ? 'active' : ''}`}
                            onClick={() => onSelectCameraMode('rotate')}
                            title="Geser kursor/sentuhan untuk memutar orbit 360° secara independen"
                        >
                            Mode Rotasi Orbit
                        </button>
                        <button
                            type="button"
                            id="btn-cam-mode-pan"
                            className={`cam-seg-btn ${cameraControlMode === 'pan' ? 'active' : ''}`}
                            onClick={() => onSelectCameraMode('pan')}
                            title="Geser kursor/sentuhan untuk menggeser posisi kamera (Pan X/Y) secara independen"
                        >
                            Mode Geser (Pan)
                        </button>
                    </div>

                    {/* Panel Presisi Geser (Pan) & Orbit (Rotate) */}
                    <div className="dpad-matrix-card">
                        <div>
                            <div className="dpad-label">TRANSLASI POSISI (PAN)</div>
                            <div className="dpad-grid">
                                <span />
                                <button type="button" className="dpad-btn" onClick={() => onCameraStep('pan_up')} title="Geser Kamera ke Atas">↑</button>
                                <span />
                                <button type="button" className="dpad-btn" onClick={() => onCameraStep('pan_left')} title="Geser Kamera ke Kiri">←</button>
                                <button type="button" className="dpad-btn dpad-center" onClick={() => onCameraStep('center_pan')} title="Pusatkan Titik Fokus (0,0,0)">0,0</button>
                                <button type="button" className="dpad-btn" onClick={() => onCameraStep('pan_right')} title="Geser Kamera ke Kanan">→</button>
                                <span />
                                <button type="button" className="dpad-btn" onClick={() => onCameraStep('pan_down')} title="Geser Kamera ke Bawah">↓</button>
                                <span />
                            </div>
                        </div>

                        <div>
                            <div className="dpad-label">INKREMEN ORBIT (15°)</div>
                            <div className="dpad-grid">
                                <span />
                                <button type="button" className="dpad-btn" onClick={() => onCameraStep('rotate_up')} title="Putar Orbit ke Atas 15°">⤒</button>
                                <span />
                                <button type="button" className="dpad-btn" onClick={() => onCameraStep('rotate_left')} title="Putar Orbit ke Kiri 15°">⟲</button>
                                <button type="button" className="dpad-btn dpad-center" onClick={() => onCameraStep('zoom_in')} title="Perbesar (Zoom In)">＋</button>
                                <button type="button" className="dpad-btn" onClick={() => onCameraStep('rotate_right')} title="Putar Orbit ke Kanan 15°">⟳</button>
                                <span />
                                <button type="button" className="dpad-btn" onClick={() => onCameraStep('rotate_down')} title="Putar Orbit ke Bawah 15°">⤓</button>
                                <button type="button" className="dpad-btn dpad-center" onClick={() => onCameraStep('zoom_out')} title="Perkecil (Zoom Out)">－</button>
                            </div>
                        </div>
                    </div>

                    <div className="camera-controls">
                        <button
                            id="btn-toggle-rotate"
                            type="button"
                            className={`ctrl-btn ${autoRotate ? 'active' : ''}`}
                            onClick={onToggleRotate}
                        >
                            <span className="ctrl-btn-label">Rotasi Orbit Otomatis</span>
                            <span className={`status-pill ${autoRotate ? 'on' : 'off'}`}>
                                {autoRotate ? 'AKTIF' : 'NONAKTIF'}
                            </span>
                        </button>
                        <button id="btn-reset-camera" type="button" className="ctrl-btn" onClick={onResetCamera}>
                            <span className="ctrl-btn-label">Reset Koordinat Kamera</span>
                            <span className="status-pill neutral">DEFAULT</span>
                        </button>
                    </div>

                    <div className="divider"></div>

                    {/* REALITAS VIRTUAL UNIVERSAL & GAME VR (WebXR 6-DoF / Gamepad / 360°) */}
                    <div className="panel-section-header">
                        <span className="panel-section-title">09. Kompatibilitas VR Universal &amp; Game</span>
                        <span className="panel-section-meta">
                            {webXrStatus === 'supported' ? 'WebXR 6-DoF Siap' : 'Universal 360°/Pad'}
                        </span>
                    </div>
                    <div className="toggle-group">
                        <button
                            type="button"
                            id="btn-panel-toggle-vr"
                            className={`ctrl-btn ${isVrModeActive ? 'active' : ''}`}
                            onClick={onToggleVrMode}
                        >
                            <span className="ctrl-btn-label">Mode Virtual Reality Universal</span>
                            <span className={`status-pill ${isVrModeActive ? 'on' : 'off'}`}>
                                {isVrModeActive ? 'AKTIF' : 'NONAKTIF'}
                            </span>
                        </button>

                        <button
                            type="button"
                            id="btn-panel-toggle-vr-game"
                            className={`ctrl-btn ${isVrGameActive ? 'active' : ''}`}
                            onClick={onToggleVrGame}
                            title="Aktifkan Misi Game Perbaikan Heliks CRISPR (Kompatibel dengan Laser VR, Gaze, Gamepad, dan Klik/Spasi)"
                        >
                            <span className="ctrl-btn-label">Misi Game VR: Perbaikan CRISPR</span>
                            <span className={`status-pill ${isVrGameActive ? 'on' : 'off'}`}>
                                {isVrGameActive ? `SKOR ${vrGameTelemetry?.score ?? 0}` : 'MULAI GAME'}
                            </span>
                        </button>

                        <div className="camera-mode-tabs" role="group" aria-label="Mode Lokomosi VR">
                            <button
                                type="button"
                                id="btn-vr-loco-snap"
                                className={`cam-seg-btn ${vrLocomotionMode === 'snap' ? 'active' : ''}`}
                                onClick={() => onChangeVrLocomotionMode('snap')}
                                title="Putaran Bertahap 30° (Snap Turn) untuk kenyamanan anti-mual di semua headset VR"
                            >
                                Lokomosi Snap 30°
                            </button>
                            <button
                                type="button"
                                id="btn-vr-loco-smooth"
                                className={`cam-seg-btn ${vrLocomotionMode === 'smooth' ? 'active' : ''}`}
                                onClick={() => onChangeVrLocomotionMode('smooth')}
                                title="Putaran Kontinu Halus (Smooth Turn) dengan Thumbstick / Gamepad / QE"
                            >
                                Lokomosi Halus
                            </button>
                        </div>

                        <button
                            type="button"
                            id="btn-panel-toggle-vr-audio"
                            className={`ctrl-btn ${!isVrAudioMuted ? 'active' : ''}`}
                            onClick={onToggleVrAudioMute}
                            title="Efek suara sintesis prosedural Web Audio API untuk bidikan laser VR, perbaikan DNA, dan umpan balik haptik"
                        >
                            <span className="ctrl-btn-label">Audio Synth VR &amp; Haptik</span>
                            <span className={`status-pill ${!isVrAudioMuted ? 'on' : 'off'}`}>
                                {!isVrAudioMuted ? 'AKTIF' : 'BISU'}
                            </span>
                        </button>

                        {isVrModeActive && (
                            <button
                                type="button"
                                id="btn-panel-toggle-stereo"
                                className={`ctrl-btn ${isStereoLensMode ? 'active' : ''}`}
                                onClick={onToggleStereoLensMode}
                            >
                                <span className="ctrl-btn-label">Proyeksi Lensa Stereoskopik</span>
                                <span className={`status-pill ${isStereoLensMode ? 'on' : 'neutral'}`}>
                                    {isStereoLensMode ? 'SBS DUAL' : 'MONO 360°'}
                                </span>
                            </button>
                        )}
                        <div className="vr-raycast-note">
                            <span className="vr-raycast-badge">KOMPATIBEL SEMUA PLATFORM VR</span>
                            <span>Mendukung penuh Meta Quest 2/3/Pro, Pico 4, HTC Vive, Valve Index, Apple Vision Pro (WebXR 6-DoF + Grip Grab), Gamepad Xbox/PlayStation, Gyro 3-DoF, serta WASD/Mouse.</span>
                        </div>
                    </div>
                </div>

                {activeSectionTab === 'all' && <div className="divider"></div>}

                {/* SECTION 4: STUDIO EKSPOR SAINS & SNAPSHOT 3D */}
                <div className={showStructure || showBiophysics ? 'panel-module' : 'hidden'}>
                    <div className="panel-section-header">
                        <span className="panel-section-title">10. Studio Ekspor Sains &amp; Snapshot 3D</span>
                        <span className="panel-section-meta">PDB · FASTA · CSV</span>
                    </div>
                    <div className="export-studio-card">
                        <button
                            type="button"
                            id="btn-export-png"
                            className="export-snapshot-btn"
                            onClick={() => onExportFile('png')}
                            title="Tangkap gambar 3D beresolusi tinggi langsung dari WebGL tanpa panel antarmuka (UI-Free PNG)"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                            <div className="export-snapshot-text">
                                <span className="export-snapshot-title">Tangkap Snapshot 3D Murni (.PNG)</span>
                                <span className="export-snapshot-sub">Render WebGL Resolusi Tinggi Tanpa Panel UI</span>
                            </div>
                        </button>

                        <div className="export-format-grid">
                            <button
                                type="button"
                                id="btn-export-pdb"
                                className="export-format-btn"
                                onClick={() => onExportFile('pdb')}
                                title="Unduh koordinat atomik 3D standar Protein Data Bank (.pdb) dalam satuan Angstrom (Å)"
                            >
                                <span className="export-ext-tag">.PDB</span>
                                <span className="export-format-name">Koordinat Atom 3D</span>
                            </button>
                            <button
                                type="button"
                                id="btn-export-fasta"
                                className="export-format-btn"
                                onClick={() => onExportFile('fasta')}
                                title="Unduh sekuens untai Sense 5'→3' dan Antisense komplementer dalam standar bioinformatika FASTA (.fasta)"
                            >
                                <span className="export-ext-tag">.FASTA</span>
                                <span className="export-format-name">Sekuens Untai Ganda</span>
                            </button>
                            <button
                                type="button"
                                id="btn-export-csv"
                                className="export-format-btn"
                                onClick={() => onExportFile('csv')}
                                title="Unduh tabel pasangan basa, koordinat aksial Z (Å), sudut puntir, dan metrik termodinamika (.csv)"
                            >
                                <span className="export-ext-tag">.CSV</span>
                                <span className="export-format-name">Tabel Termodinamika</span>
                            </button>
                            <button
                                type="button"
                                id="btn-export-json"
                                className="export-format-btn"
                                onClick={() => onExportFile('json')}
                                title="Unduh struktur data lengkap kristalografi dan profil termodinamika (.json)"
                            >
                                <span className="export-ext-tag">.JSON</span>
                                <span className="export-format-name">Data Kristalografi</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* LEGENDA BIOKIMIA */}
                <div className="legend-box">
                    <div className="legend-title">LEGENDA &amp; KLASIFIKASI BIOKIMIA</div>
                    <div className="legend-grid">
                        <div className="legend-item"><span className="color-dot dot-a"></span> <b>A</b> Adenin (Purin)</div>
                        <div className="legend-item"><span className="color-dot dot-t"></span> <b>T</b> Timin (Pirimidin)</div>
                        <div className="legend-item"><span className="color-dot dot-g"></span> <b>G</b> Guanin (Purin)</div>
                        <div className="legend-item"><span className="color-dot dot-c"></span> <b>C</b> Sitosin (Pirimidin)</div>
                        <div className="legend-item"><span className="color-dot dot-backbone"></span> <b>P-S</b> Gula-Fosfat</div>
                        <div className="legend-item"><span className="color-dot dot-hbond"></span> <b>H</b> Ikatan Hidrogen</div>
                        <div className="legend-item"><span className="color-dot dot-methyl"></span> <b>5mC</b> Metilasi (-CH₃)</div>
                        <div className="legend-item"><span className="color-dot dot-dimer"></span> <b>CPD</b> Dimer Timin UV</div>
                        <div className="legend-item"><span className="color-dot dot-intercalator"></span> <b>INT</b> Interkalator</div>
                        <div className="legend-item"><span className="color-dot dot-ion"></span> <b>Mg²⁺</b> Kation &amp; Air</div>
                    </div>
                    <div className="legend-polarity-row">
                        <div className="polarity-chip"><b>5'</b> Ujung Fosfat</div>
                        <div className="polarity-arrow">⇄</div>
                        <div className="polarity-chip"><b>3'</b> Ujung Hidroksil (-OH)</div>
                    </div>
                    {renderMode === 'electrostatic' ? (
                        <div className="legend-electro-row">
                            <span className="electro-label">Gradien Potensial Coulomb:</span>
                            <span className="electro-bar"></span>
                            <span className="electro-tags"><span>-1e (Fosfat)</span><span>0 (Netral)</span><span>+1e (Kationik)</span></span>
                        </div>
                    ) : (
                        <div className="legend-cpk-row">
                            <span className="cpk-label">Atom CPK:</span>
                            <span className="cpk-item"><i style={{ background: '#3b4252' }}></i>C</span>
                            <span className="cpk-item"><i style={{ background: '#1d4ed8' }}></i>N</span>
                            <span className="cpk-item"><i style={{ background: '#dc2626' }}></i>O</span>
                            <span className="cpk-item"><i style={{ background: '#d97706' }}></i>P</span>
                            <span className="cpk-item"><i style={{ background: '#e2e8f0' }}></i>H</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

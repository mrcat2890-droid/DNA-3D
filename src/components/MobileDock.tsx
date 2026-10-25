import React from 'react';
import { AssemblyModeType } from '../types/dna';

interface MobileDockProps {
    assemblyMode: AssemblyModeType;
    onUnzip: () => void;
    onExplode: () => void;
    onResetAssembly: () => void;
    onToggleMenu: () => void;
    onToggleInspect: () => void;
}

export const MobileDock: React.FC<MobileDockProps> = ({
    assemblyMode,
    onUnzip,
    onExplode,
    onResetAssembly,
    onToggleMenu,
    onToggleInspect
}) => {
    return (
        <nav id="mobile-dock" className="mobile-dock-container" aria-label="Navigasi Cepat Seluler">
            {assemblyMode === 'assembled' ? (
                <>
                    <button id="dock-btn-unzip" type="button" className="dock-btn" onClick={onUnzip}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M16 3h5v5" />
                            <path d="M8 3H3v5" />
                            <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
                            <path d="m15 9 6-6" />
                        </svg>
                        <span className="dock-label">Pisahkan</span>
                    </button>
                    <button id="dock-btn-explode" type="button" className="dock-btn" onClick={onExplode}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                        <span className="dock-label">Uraikan</span>
                    </button>
                </>
            ) : (
                <button id="dock-btn-reset" type="button" className="dock-btn" onClick={onResetAssembly}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                    <span className="dock-label">Satukan</span>
                </button>
            )}
            <button id="dock-btn-menu" type="button" className="dock-btn dock-btn-primary" onClick={onToggleMenu}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
                <span className="dock-label">Kontrol</span>
            </button>
            <button id="dock-btn-inspect" type="button" className="dock-btn" onClick={onToggleInspect}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="12 2 20 7 20 17 12 22 4 17 4 7 12 2" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="dock-label">Inspektor</span>
            </button>
        </nav>
    );
};

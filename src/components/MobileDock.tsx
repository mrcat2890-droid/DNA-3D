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
        <nav id="mobile-dock" className="mobile-dock-container">
            {assemblyMode === 'assembled' ? (
                <>
                    <button id="dock-btn-unzip" className="dock-btn" onClick={onUnzip}>
                        <span className="dock-icon">⚡</span>
                        <span className="dock-label">Pisahkan</span>
                    </button>
                    <button id="dock-btn-explode" className="dock-btn" onClick={onExplode}>
                        <span className="dock-icon">💥</span>
                        <span className="dock-label">Uraikan</span>
                    </button>
                </>
            ) : (
                <button id="dock-btn-reset" className="dock-btn" onClick={onResetAssembly}>
                    <span className="dock-icon">🔄</span>
                    <span className="dock-label">Satukan</span>
                </button>
            )}
            <button id="dock-btn-menu" className="dock-btn dock-btn-primary" onClick={onToggleMenu}>
                <span className="dock-icon">⚙️</span>
                <span className="dock-label">Menu</span>
            </button>
            <button id="dock-btn-inspect" className="dock-btn" onClick={onToggleInspect}>
                <span className="dock-icon">🔬</span>
                <span className="dock-label">Detail</span>
            </button>
        </nav>
    );
};

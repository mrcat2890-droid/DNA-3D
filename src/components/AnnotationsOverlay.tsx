import React from 'react';
import { ConformationType } from '../types/dna';
import { CONFORMATIONS } from '../data/dnaData';

interface AnnotationsOverlayProps {
    visible: boolean;
    metricScaleVisible: boolean;
    conformation: ConformationType;
    positions: Record<string, { x: number; y: number; visible: boolean }>;
}

export const AnnotationsOverlay: React.FC<AnnotationsOverlayProps> = ({
    visible,
    metricScaleVisible,
    conformation,
    positions
}) => {
    if (!visible) return null;

    const conf = CONFORMATIONS[conformation] || CONFORMATIONS.B;

    const getStyle = (key: string): React.CSSProperties => {
        const pos = positions[key];
        if (!pos || !pos.visible) {
            return { opacity: 0, pointerEvents: 'none', transform: 'translate(-9999px, -9999px)' };
        }
        return {
            opacity: 1,
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            pointerEvents: 'none'
        };
    };

    return (
        <div id="annotations-overlay">
            {/* Major Groove */}
            <div className="annotation-callout callout-major-1" style={getStyle('majorGroove')}>
                <div className="bracket-bracket"></div>
                <div className="callout-text">Major Groove<br /><b>(Lekukan Mayor ~2.2 nm)</b></div>
            </div>

            {/* Minor Groove */}
            <div className="annotation-callout callout-minor-1" style={getStyle('minorGroove')}>
                <div className="bracket-bracket"></div>
                <div className="callout-text">Minor Groove<br /><b>(Lekukan Minor ~1.2 nm)</b></div>
            </div>

            {/* Backbone */}
            <div className="annotation-callout callout-backbone" style={getStyle('backbone')}>
                <div className="callout-pointer"></div>
                <div className="callout-text">Sugar-Phosphate<br />Backbone</div>
            </div>

            {/* A-T Base Pair */}
            <div className="annotation-callout callout-at" style={getStyle('atPair')}>
                <div className="callout-pointer"></div>
                <div className="callout-text">Hydrogen Bonds<br /><b>A-T Base Pair</b> (2 Ikatan)</div>
            </div>

            {/* C-G Base Pair */}
            <div className="annotation-callout callout-cg" style={getStyle('cgPair')}>
                <div className="callout-pointer"></div>
                <div className="callout-text">Hydrogen Bonds<br /><b>C-G Base Pair</b> (3 Ikatan)</div>
            </div>

            {/* Metric scales */}
            {metricScaleVisible && (
                <>
                    <div className="annotation-callout callout-metric" style={getStyle('metricDiameter2')}>
                        <div className="metric-ruler-line horizontal"></div>
                        <div className="callout-text metric-badge">⌀ Diameter Heliks: <b>{conf.metrics.dia}</b></div>
                    </div>
                    <div className="annotation-callout callout-metric" style={getStyle('metricRise2')}>
                        <div className="metric-ruler-line vertical"></div>
                        <div className="callout-text metric-badge">↕ Jarak Pasang Basa (Rise): <b>{conf.metrics.rise}</b></div>
                    </div>
                    <div className="annotation-callout callout-metric" style={getStyle('metricPitch2')}>
                        <div className="bracket-bracket metric-bracket"></div>
                        <div className="callout-text metric-badge">↻ 1 Putaran Penuh (Pitch): <b>{conf.metrics.pitch}</b></div>
                    </div>
                </>
            )}

            {/* 5' and 3' Polarity Indicators */}
            <div className="annotation-callout callout-polarity" style={getStyle('strand1Top')}>
                <span className="polarity-badge badge-5p">5'</span>
                <div className="callout-text">Untai 1 (Fosfat)</div>
            </div>
            <div className="annotation-callout callout-polarity" style={getStyle('strand1Bottom')}>
                <span className="polarity-badge badge-3p">3'</span>
                <div className="callout-text">Untai 1 (-OH)</div>
            </div>
            <div className="annotation-callout callout-polarity" style={getStyle('strand2Top')}>
                <span className="polarity-badge badge-3p">3'</span>
                <div className="callout-text">Untai 2 (-OH)</div>
            </div>
            <div className="annotation-callout callout-polarity" style={getStyle('strand2Bottom')}>
                <span className="polarity-badge badge-5p">5'</span>
                <div className="callout-text">Untai 2 (Fosfat)</div>
            </div>
        </div>
    );
};

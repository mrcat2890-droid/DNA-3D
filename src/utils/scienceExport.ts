import {
    ConformationType,
    MolecularConditionType,
    SequenceStats
} from '../types/dna';
import { CONFORMATIONS } from '../data/dnaData';

const COMPLEMENT_MAP: Record<string, string> = {
    A: 'T',
    T: 'A',
    G: 'C',
    C: 'G'
};

const CONDITION_LABELS: Record<MolecularConditionType, string> = {
    normal: 'Wild-Type Canonical Double Helix',
    methylation: '5-Methylcytosine (5-mC) Epigenetic Modification',
    thymine_dimer: 'UV Cyclobutane Pyrimidine Dimer (CPD Lesion)',
    intercalation: 'Chemotherapeutic Aromatic Intercalation Complex'
};

/**
 * Triggers a browser download for a text or data blob without opening popups.
 */
export function triggerFileDownload(content: string | Blob, filename: string, mimeType = 'text/plain;charset=utf-8'): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Triggers a browser download from a Canvas data URL (e.g., PNG snapshot).
 */
export function triggerDataUrlDownload(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generates a standard NCBI/EMBL FASTA (.fasta) file containing both the
 * 5'->3' Sense strand and the 3'->5' (and 5'->3' reverse-complement) Antisense strand.
 */
export function generateFastaFileContent(
    sequence: string,
    conformation: ConformationType,
    condition: MolecularConditionType,
    stats: SequenceStats
): string {
    const cleanSeq = sequence.toUpperCase().replace(/[^ATGC]/g, '') || 'ATGCGTACCTACGATC';
    const complement3to5 = cleanSeq
        .split('')
        .map(b => COMPLEMENT_MAP[b] || 'N')
        .join('');
    const reverseComplement5to3 = complement3to5.split('').reverse().join('');
    const conf = CONFORMATIONS[conformation] || CONFORMATIONS.B;
    const dateIso = new Date().toISOString().split('T')[0];

    const wrapFasta = (seq: string, width = 60) => {
        const lines: string[] = [];
        for (let i = 0; i < seq.length; i += width) {
            lines.push(seq.slice(i, i + width));
        }
        return lines.join('\n');
    };

    return [
        `>GENOS_3D_BIOCORE|Chain_A_Sense_5to3|conf=${conformation}-DNA|len=${stats.length}bp|GC=${stats.gcPercent}|Tm=${stats.tm}|HBonds=${stats.hBonds}|cond=${condition}|date=${dateIso}`,
        wrapFasta(cleanSeq),
        `>GENOS_3D_BIOCORE|Chain_B_Antisense_5to3_RevComp|conf=${conformation}-DNA|pitch=${conf.metrics.pitch}|rise=${conf.metrics.rise}|diameter=${conf.metrics.dia}`,
        wrapFasta(reverseComplement5to3),
        `>GENOS_3D_BIOCORE|Chain_B_Antisense_Aligned_3to5|complement_of=Chain_A_Sense_5to3`,
        wrapFasta(complement3to5),
        ''
    ].join('\n');
}

/**
 * Formats a single fixed-width 80-column Protein Data Bank (PDB) ATOM record.
 */
function formatPdbAtomLine(
    serial: number,
    atomName: string,
    resName: string,
    chainId: string,
    resSeq: number,
    x: number,
    y: number,
    z: number,
    element: string,
    bFactor = 18.50
): string {
    const record = 'ATOM  ';
    const serialStr = String(serial).padStart(5, ' ');
    const namePadded = atomName.length < 4 ? ` ${atomName.padEnd(3, ' ')}` : atomName.slice(0, 4);
    const altLoc = ' ';
    const resStr = resName.padStart(3, ' ');
    const chain = chainId.slice(0, 1);
    const resSeqStr = String(resSeq).padStart(4, ' ');
    const iCode = ' ';
    const xStr = x.toFixed(3).padStart(8, ' ');
    const yStr = y.toFixed(3).padStart(8, ' ');
    const zStr = z.toFixed(3).padStart(8, ' ');
    const occupancy = '  1.00';
    const tempFactor = bFactor.toFixed(2).padStart(6, ' ');
    const elemRight = element.padStart(2, ' ');
    return `${record}${serialStr} ${namePadded}${altLoc}${resStr} ${chain}${resSeqStr}${iCode}   ${xStr}${yStr}${zStr}${occupancy}${tempFactor}          ${elemRight}  `;
}

/**
 * Generates a specification-compliant Protein Data Bank (.pdb) 3D coordinate file
 * calculated from the active helical conformation (B-DNA, A-DNA, Z-DNA), sequence,
 * and molecular condition in Angstrom (Å) units.
 */
export function generatePdbFileContent(
    sequence: string,
    conformation: ConformationType,
    condition: MolecularConditionType,
    stats: SequenceStats
): string {
    const cleanSeq = sequence.toUpperCase().replace(/[^ATGC]/g, '') || 'ATGCGTACCTACGATC';
    const conf = CONFORMATIONS[conformation] || CONFORMATIONS.B;
    const dateStr = new Date().toISOString().slice(0, 10);

    // Convert internal 3D scene units to Crystallographic Angstroms (Å)
    const riseAngstrom = conformation === 'A' ? 2.56 : conformation === 'Z' ? 3.71 : 3.38;
    const radiusAngstrom = conformation === 'A' ? 11.5 : conformation === 'Z' ? 9.0 : 10.0;

    const lines: string[] = [];
    lines.push(`HEADER    DNA DOUBLE HELIX                        ${dateStr}   1BNA`);
    lines.push(`TITLE     GEN-OS 3D BIO-CORE CRYSTALLOGRAPHIC MODEL (${conformation}-DNA)`);
    lines.push(`COMPND    MOL_ID: 1;`);
    lines.push(`COMPND   2 MOLECULE: DNA DUPLEX (${cleanSeq.length} BASE PAIRS);`);
    lines.push(`COMPND   3 CHAIN: A, B;`);
    lines.push(`COMPND   4 ENGINEERED: YES`);
    lines.push(`REMARK 200 CONFORMATION : ${conf.name}`);
    lines.push(`REMARK 200 CONDITION    : ${CONDITION_LABELS[condition]}`);
    lines.push(`REMARK 200 SEQUENCE 5-3 : ${cleanSeq}`);
    lines.push(`REMARK 200 GC CONTENT   : ${stats.gcPercent}`);
    lines.push(`REMARK 200 MELTING TEMP : ${stats.tm}`);
    lines.push(`REMARK 200 TOTAL H-BOND : ${stats.hBonds}`);

    let atomSerial = 1;
    const chainALines: string[] = [];
    const chainBLines: string[] = [];

    const nPairs = cleanSeq.length;
    const midIdx = Math.floor(nPairs / 2);

    let accumZ = -(nPairs / 2) * riseAngstrom;
    let accumAngle = 0;

    const transformLocalAtom = (
        localX: number,
        localY: number,
        localZ: number,
        originX: number,
        originY: number,
        originZ: number,
        dirX: number,
        dirY: number,
        strandSign: number
    ): [number, number, number] => {
        // Right-handed local basis pointing from sugar-phosphate anchor toward helix axis
        const rightX = -dirY * strandSign;
        const rightY = dirX * strandSign;
        const worldX = originX + rightX * localX + dirX * localZ;
        const worldY = originY + rightY * localX + dirY * localZ;
        const worldZ = originZ + localY;
        return [worldX, worldY, worldZ];
    };

    const getNucleotideAtomTemplate = (base: string) => {
        const isPurine = base === 'A' || base === 'G';
        const backboneAtoms: Array<{ name: string; el: string; x: number; y: number; z: number }> = [
            { name: 'P', el: 'P', x: 0.0, y: 0.85, z: -0.75 },
            { name: 'OP1', el: 'O', x: -0.95, y: 1.35, z: -1.35 },
            { name: 'OP2', el: 'O', x: 0.95, y: 1.35, z: -1.35 },
            { name: "O5'", el: 'O', x: 0.32, y: 0.24, z: -0.12 },
            { name: "C5'", el: 'C', x: 0.52, y: 0.10, z: 0.34 },
            { name: "C4'", el: 'C', x: 0.56, y: -0.10, z: 0.86 },
            { name: "O4'", el: 'O', x: -0.52, y: 0.0, z: 1.46 },
            { name: "C3'", el: 'C', x: 1.32, y: -0.20, z: 1.24 },
            { name: "O3'", el: 'O', x: 1.85, y: -0.82, z: 0.95 },
            { name: "C2'", el: 'C', x: 0.98, y: 0.32, z: 2.16 },
            { name: "C1'", el: 'C', x: -0.28, y: 0.0, z: 2.48 }
        ];

        const baseAtoms: Array<{ name: string; el: string; x: number; y: number; z: number }> = isPurine
            ? [
                { name: 'N9', el: 'N', x: 0.0, y: 0.0, z: 3.48 },
                { name: 'C8', el: 'C', x: -1.22, y: 0.0, z: 4.25 },
                { name: 'N7', el: 'N', x: -0.78, y: 0.0, z: 5.56 },
                { name: 'C5', el: 'C', x: 0.72, y: 0.0, z: 5.56 },
                { name: 'C6', el: 'C', x: -0.12, y: 0.0, z: 6.92 },
                { name: 'N1', el: 'N', x: 0.88, y: 0.0, z: 7.98 },
                { name: 'C2', el: 'C', x: 2.40, y: 0.0, z: 7.64 },
                { name: 'N3', el: 'N', x: 2.58, y: 0.0, z: 6.20 },
                { name: 'C4', el: 'C', x: 1.14, y: 0.0, z: 4.25 }
            ]
            : [
                { name: 'N1', el: 'N', x: 0.0, y: 0.0, z: 3.48 },
                { name: 'C6', el: 'C', x: -1.26, y: 0.0, z: 4.25 },
                { name: 'C5', el: 'C', x: -1.26, y: 0.0, z: 5.76 },
                { name: 'C4', el: 'C', x: 0.0, y: 0.0, z: 6.56 },
                { name: 'N3', el: 'N', x: 1.26, y: 0.0, z: 5.76 },
                { name: 'C2', el: 'C', x: 1.26, y: 0.0, z: 4.25 },
                { name: 'O2', el: 'O', x: 2.28, y: 0.0, z: 3.78 }
            ];

        if (base === 'A') {
            baseAtoms.push({ name: 'N6', el: 'N', x: -0.98, y: 0.0, z: 7.88 });
        } else if (base === 'G') {
            baseAtoms.push({ name: 'O6', el: 'O', x: -0.98, y: 0.0, z: 7.88 });
            baseAtoms.push({ name: 'N2', el: 'N', x: 3.22, y: 0.0, z: 8.52 });
        } else if (base === 'T') {
            baseAtoms.push({ name: 'O4', el: 'O', x: -0.18, y: 0.0, z: 7.68 });
            baseAtoms.push({ name: 'C7', el: 'C', x: -2.42, y: 0.0, z: 6.40 });
        } else if (base === 'C') {
            baseAtoms.push({ name: 'N4', el: 'N', x: -0.18, y: 0.0, z: 7.68 });
        }

        return [...backboneAtoms, ...baseAtoms];
    };

    for (let i = 0; i < nPairs; i++) {
        const b1 = cleanSeq[i];
        const b2 = COMPLEMENT_MAP[b1] || 'T';

        let stepZ = riseAngstrom;
        let stepAngle = conf.angleStep;
        let localR = radiusAngstrom;

        if (conf.zigzag) {
            localR += i % 2 === 0 ? 0.75 : -0.75;
        }
        if (condition === 'intercalation' && i === midIdx) {
            stepZ *= 2.0;
            stepAngle -= 0.45;
        }

        accumZ += stepZ;
        accumAngle += stepAngle;

        const theta1 = accumAngle;
        const theta2 = theta1 + conf.majorMinorOffset;

        const x1 = Math.cos(theta1) * localR;
        const y1 = Math.sin(theta1) * localR;
        const x2 = Math.cos(theta2) * localR;
        const y2 = Math.sin(theta2) * localR;

        const cx = (x1 + x2) * 0.5;
        const cy = (y1 + y2) * 0.5;

        const len1 = Math.hypot(cx - x1, cy - y1) || 1;
        const dir1X = (cx - x1) / len1;
        const dir1Y = (cy - y1) / len1;

        const len2 = Math.hypot(cx - x2, cy - y2) || 1;
        const dir2X = (cx - x2) / len2;
        const dir2Y = (cy - y2) / len2;

        const resName1 = `D${b1}`;
        const atoms1 = getNucleotideAtomTemplate(b1);
        for (const a of atoms1) {
            const [wx, wy, wz] = transformLocalAtom(a.x, a.y, a.z, x1, y1, accumZ, dir1X, dir1Y, 1);
            chainALines.push(
                formatPdbAtomLine(atomSerial++, a.name, resName1, 'A', i + 1, wx, wy, wz, a.el)
            );
        }

        const resName2 = `D${b2}`;
        const atoms2 = getNucleotideAtomTemplate(b2);
        for (const a of atoms2) {
            const [wx, wy, wz] = transformLocalAtom(a.x, a.y, a.z, x2, y2, accumZ, dir2X, dir2Y, -1);
            chainBLines.push(
                formatPdbAtomLine(atomSerial++, a.name, resName2, 'B', nPairs - i, wx, wy, wz, a.el)
            );
        }
    }

    lines.push(...chainALines);
    lines.push(`TER   ${String(atomSerial++).padStart(5, ' ')}      D${cleanSeq[nPairs - 1]} A${String(nPairs).padStart(4, ' ')}`);
    lines.push(...chainBLines);
    lines.push(`TER   ${String(atomSerial++).padStart(5, ' ')}      D${COMPLEMENT_MAP[cleanSeq[nPairs - 1]] || 'T'} B   1`);
    lines.push('END                                                                             ');

    return lines.join('\n') + '\n';
}

/**
 * Generates a CSV (.csv) table containing base-pair thermodynamic & crystallographic metrics.
 */
export function generateMetricsCsvContent(
    sequence: string,
    conformation: ConformationType,
    condition: MolecularConditionType,
    stats: SequenceStats
): string {
    const cleanSeq = sequence.toUpperCase().replace(/[^ATGC]/g, '') || 'ATGCGTACCTACGATC';
    const conf = CONFORMATIONS[conformation] || CONFORMATIONS.B;
    const riseAngstrom = conformation === 'A' ? 2.56 : conformation === 'Z' ? 3.71 : 3.38;
    const twistDeg = Number(((conf.angleStep * 180) / Math.PI).toFixed(2));

    const rows: string[] = [];
    rows.push(
        [
            'Pair_Index',
            'Strand_1_5to3',
            'Strand_2_3to5',
            'Base_Pair_Type',
            'Purine_Pyrimidine_Class',
            'Hydrogen_Bonds',
            'Conformation',
            'Condition',
            'Axial_Rise_Angstrom',
            'Cumulative_Z_Angstrom',
            'Helical_Twist_Deg',
            'Global_GC_Percent',
            'Global_Melting_Temp_Tm'
        ].join(',')
    );

    for (let i = 0; i < cleanSeq.length; i++) {
        const b1 = cleanSeq[i];
        const b2 = COMPLEMENT_MAP[b1] || 'T';
        const isGC = b1 === 'G' || b1 === 'C';
        const hbonds = isGC ? 3 : 2;
        const ringClass = b1 === 'A' || b1 === 'G' ? 'Purine-Pyrimidine' : 'Pyrimidine-Purine';
        const zAngstrom = ((i + 1) * riseAngstrom).toFixed(2);

        rows.push(
            [
                i + 1,
                b1,
                b2,
                `${b1}-${b2}`,
                ringClass,
                hbonds,
                `${conformation}-DNA`,
                condition,
                riseAngstrom.toFixed(2),
                zAngstrom,
                twistDeg,
                stats.gcPercent,
                stats.tm
            ].join(',')
        );
    }

    return rows.join('\n') + '\n';
}

/**
 * Generates a structured JSON (.json) dataset of the current DNA model, thermodynamics, and base-pair coordinates.
 */
export function generateMetricsJsonContent(
    sequence: string,
    conformation: ConformationType,
    condition: MolecularConditionType,
    stats: SequenceStats
): string {
    const cleanSeq = sequence.toUpperCase().replace(/[^ATGC]/g, '') || 'ATGCGTACCTACGATC';
    const conf = CONFORMATIONS[conformation] || CONFORMATIONS.B;
    const riseAngstrom = conformation === 'A' ? 2.56 : conformation === 'Z' ? 3.71 : 3.38;
    const twistDeg = Number(((conf.angleStep * 180) / Math.PI).toFixed(2));

    const complement3to5 = cleanSeq
        .split('')
        .map(b => COMPLEMENT_MAP[b] || 'T')
        .join('');

    const payload = {
        metadata: {
            generator: 'GEN-OS 3D BIO-CORE Crystallographic Suite',
            referencePdb: '1BNA (Dickerson et al., 1982)',
            exportedAt: new Date().toISOString()
        },
        structure: {
            conformation: `${conformation}-DNA`,
            conformationName: conf.name,
            condition,
            conditionDescription: CONDITION_LABELS[condition],
            crystallographicMetrics: conf.metrics
        },
        thermodynamics: {
            lengthBp: stats.length,
            gcContent: stats.gcPercent,
            meltingTemperatureTm: stats.tm,
            totalHydrogenBonds: stats.hBonds,
            senseStrand5to3: cleanSeq,
            antisenseStrand3to5: complement3to5
        },
        basePairs: cleanSeq.split('').map((b1, idx) => {
            const b2 = COMPLEMENT_MAP[b1] || 'T';
            const isGC = b1 === 'G' || b1 === 'C';
            return {
                index: idx + 1,
                senseBase: b1,
                antisenseBase: b2,
                pairNotation: isGC ? `${b1}≡${b2}` : `${b1}=${b2}`,
                hydrogenBonds: isGC ? 3 : 2,
                zCoordinateAngstrom: Number(((idx + 1) * riseAngstrom).toFixed(2)),
                helicalTwistDeg: Number(((idx + 1) * twistDeg).toFixed(2))
            };
        })
    };

    return JSON.stringify(payload, null, 2);
}

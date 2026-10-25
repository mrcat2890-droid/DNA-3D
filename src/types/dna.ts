export type ConformationType = 'B' | 'A' | 'Z';
export type RenderModeType = 'bio' | 'cpk' | 'ballstick' | 'electrostatic';
export type MolecularConditionType = 'normal' | 'methylation' | 'thymine_dimer' | 'intercalation';
export type AssemblyModeType = 'assembled' | 'unzipped' | 'exploded';
export type FilterComponentType = 'all' | 'backbone' | 'A' | 'T' | 'G' | 'C' | 'hbond';
export type CameraControlMode = 'rotate' | 'pan';
export type CameraStepAction =
    | 'pan_up'
    | 'pan_down'
    | 'pan_left'
    | 'pan_right'
    | 'center_pan'
    | 'rotate_left'
    | 'rotate_right'
    | 'rotate_up'
    | 'rotate_down'
    | 'zoom_in'
    | 'zoom_out';

export interface CameraStepCommand {
    id: number;
    action: CameraStepAction;
}

export type WebXrSupportStatus = 'checking' | 'supported' | 'fallback_360';


export interface ComponentDetails {
    name: string;
    class: string;
    formula: string;
    weight: string;
    partner: string;
    bonds: string;
    colorHex: string;
    colorNum: number;
    desc: string;
    func: string;
}

export interface ConformationConfig {
    name: string;
    radius: number;
    heightStep: number;
    angleStep: number;
    majorMinorOffset: number;
    tilt: number;
    propeller: number;
    zigzag: boolean;
    metrics: {
        dia: string;
        rise: string;
        pitch: string;
    };
}

export interface SequenceStats {
    length: number;
    gcPercent: string;
    tm: string;
    hBonds: number;
}

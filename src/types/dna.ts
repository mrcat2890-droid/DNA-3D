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
export type BloomPresetType = 'subtle' | 'cinematic' | 'extreme' | 'custom';
export type ExportFormatType = 'png' | 'pdb' | 'fasta' | 'csv' | 'json';

export type VrLocomotionMode = 'smooth' | 'snap';
export type VrInputDeviceProfile = 'webxr_6dof' | 'gamepad_6dof' | 'gyro_3dof' | 'desktop_kb_mouse';
export type XrRuntimeProfile =
    | 'meta_quest'
    | 'pico_xr'
    | 'valve_index'
    | 'htc_vive'
    | 'wmr'
    | 'vision_pro_hand'
    | 'generic_xr'
    | 'gamepad'
    | 'gaze';

export type XrHandGestureState =
    | 'none'
    | 'open'
    | 'point'
    | 'pinch_select'
    | 'pinch_drag'
    | 'bimanual_scale'
    | 'fist_grab';

export interface VrHeadsetTelemetry {
    latencyMs: number;
    fps: number;
    batteryPercent: number;
    isCharging: boolean;
}

export interface VrPointerTelemetry {
    hoveredKey: string | null;
    dwellProgress: number; // 0 to 1
    interactionMode: 'controller_ray' | 'gaze_dwell' | 'gamepad_ray' | 'hand_pinch' | 'hand_direct';
    activeDeviceProfile?: VrInputDeviceProfile;
    controllerCount?: number;
    activeHand?: 'left' | 'right' | 'none';
    runtimeProfile?: XrRuntimeProfile;
    triggerPressure?: number;
    targetRayMode?: 'tracked-pointer' | 'gaze' | 'screen' | 'transient-pointer';
    isHandTracking?: boolean;
    handGesture?: XrHandGestureState;
    pinchStrength?: number; // 0 to 1 normalized thumb-to-index proximity
    pinchDistanceMm?: number; // Euclidean distance between thumb-tip and index-finger-tip in mm
}

export interface VrGameTelemetry {
    active: boolean;
    score: number;
    combo: number;
    repairedCount: number;
    timeRemainingSec: number;
    targetPairIndex: number;
    targetBaseType: string;
    complementBaseType: string;
    lesionLabel: string;
    lastEventLabel: string | null;
}


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

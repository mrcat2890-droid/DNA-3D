// Procedural Web Audio API Synthesizer & Universal WebXR / Gamepad Haptic Feedback Engine
// 100% self-contained with zero external audio files required.

class VrSoundEngine {
    private ctx: AudioContext | null = null;
    private muted: boolean = false;

    private getContext(): AudioContext | null {
        if (this.muted || typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    public setMuted(mute: boolean): void {
        this.muted = mute;
    }

    public isMuted(): boolean {
        return this.muted;
    }

    // Subtle high-tech tick when VR laser or gaze reticle begins scanning a nucleotide
    public playHoverTick(): void {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(780, now);
            osc.frequency.exponentialRampToValueAtTime(1120, now + 0.045);

            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.055);
        } catch {
            // Ignore audio context errors
        }
    }

    // Crisp sci-fi lock chime when a nucleotide is selected via VR controller trigger or gaze dwell
    public playSelectLock(baseType?: string): void {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const baseFreqMap: Record<string, number> = {
                A: 523.25, // C5
                T: 587.33, // D5
                G: 659.25, // E5
                C: 783.99  // G5
            };
            const rootFreq = (baseType && baseFreqMap[baseType]) || 587.33;

            [rootFreq, rootFreq * 1.25].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                const start = now + idx * 0.045;
                osc.frequency.setValueAtTime(freq, start);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.06, start + 0.12);

                gain.gain.setValueAtTime(0.075, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + 0.15);
            });
        } catch {
            // Ignore
        }
    }

    // Harmonic Watson-Crick CRISPR Repair Success Arpeggio
    public playRepairSuccess(combo: number = 1): void {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const pitchBoost = Math.min(combo - 1, 8) * 32;
            const notes = [523.25 + pitchBoost, 659.25 + pitchBoost, 783.99 + pitchBoost, 1046.5 + pitchBoost];

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
                const start = now + idx * 0.055;
                const dur = idx === notes.length - 1 ? 0.26 : 0.14;

                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.09, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + dur + 0.02);
            });
        } catch {
            // Ignore
        }
    }

    // Soft miss / off-target warning tone
    public playMissWarning(): void {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(155, now + 0.16);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.19);
        } catch {
            // Ignore
        }
    }

    // Mission start / complete fanfare
    public playGameStateChange(starting: boolean): void {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const seq = starting ? [440, 554.37, 659.25, 880] : [880, 659.25, 554.37, 440];
            seq.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const t = now + i * 0.065;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.07, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.19);
            });
        } catch {
            // Ignore
        }
    }
}

export const vrSound = new VrSoundEngine();

export interface XrHapticOptions {
    handedness?: 'left' | 'right' | 'any';
    inputSource?: any | null;
    runtimeProfile?:
        | 'meta_quest'
        | 'pico_xr'
        | 'valve_index'
        | 'htc_vive'
        | 'wmr'
        | 'vision_pro_hand'
        | 'generic_xr'
        | 'gamepad'
        | 'gaze';
}

/**
 * Triggers standardized cross-platform haptic feedback across:
 * 1. WebXR InputSource Gamepad (`hapticActuators[].pulse()`, `hapticActuators[].playEffect()`, `vibrationActuator.playEffect()`)
 * 2. Runtime-calibrated actuator response curves (Meta Quest LRA, Pico Broadband, HTC Vive Trackpad Actuator, Valve Index HD, WMR)
 * 3. Standard Dual-Rumble HTML5 Gamepads (Xbox, DualSense, PC VR Gamepads)
 */
export function triggerUniversalXrHaptics(
    xrSession: any | null,
    intensity: number = 0.6,
    durationMs: number = 40,
    options?: XrHapticOptions
): void {
    const profile = options?.runtimeProfile || 'generic_xr';

    // Normalize intensity and pulse duration across hardware actuator physics
    let gainScale = 1.0;
    let minDurationMs = 12;
    if (profile === 'htc_vive') {
        // Vive wand linear trackpad actuators require slightly longer pulse width to register crisp ticks
        gainScale = 1.15;
        minDurationMs = 22;
    } else if (profile === 'pico_xr') {
        gainScale = 1.06;
        minDurationMs = 16;
    } else if (profile === 'wmr') {
        gainScale = 1.10;
        minDurationMs = 20;
    } else if (profile === 'valve_index') {
        gainScale = 0.95;
        minDurationMs = 12;
    }

    const clampedIntensity = Math.max(0.05, Math.min(1.0, intensity * gainScale));
    const clampedDuration = Math.max(minDurationMs, Math.min(320, durationMs));
    const targetHand = options?.handedness || 'any';
    const targetSource = options?.inputSource || null;

    const pulseGamepadActuators = (gp: any) => {
        if (!gp) return;
        let pulsed = false;

        // A. WebXR GamepadHapticActuator array (Quest, Pico, Vive, Index, WMR)
        if (Array.isArray(gp.hapticActuators) && gp.hapticActuators.length > 0) {
            for (const actuator of gp.hapticActuators) {
                if (!actuator) continue;
                if (typeof actuator.pulse === 'function') {
                    try {
                        const res = actuator.pulse(clampedIntensity, clampedDuration);
                        if (res && typeof res.catch === 'function') res.catch(() => {});
                        pulsed = true;
                    } catch {
                        // Continue to fallback
                    }
                } else if (typeof actuator.playEffect === 'function') {
                    try {
                        const res = actuator.playEffect('dual-rumble', {
                            startDelay: 0,
                            duration: clampedDuration,
                            weakMagnitude: clampedIntensity * 0.85,
                            strongMagnitude: clampedIntensity
                        });
                        if (res && typeof res.catch === 'function') res.catch(() => {});
                        pulsed = true;
                    } catch {
                        // Continue to fallback
                    }
                }
            }
        }

        // B. Chromium / Standalone WebXR vibrationActuator (Dual-Rumble or Pulse)
        if (!pulsed && gp.vibrationActuator) {
            const vib = gp.vibrationActuator;
            if (typeof vib.playEffect === 'function') {
                try {
                    const res = vib.playEffect('dual-rumble', {
                        startDelay: 0,
                        duration: clampedDuration,
                        weakMagnitude: clampedIntensity * 0.8,
                        strongMagnitude: clampedIntensity
                    });
                    if (res && typeof res.catch === 'function') res.catch(() => {});
                    pulsed = true;
                } catch {
                    // Ignore
                }
            } else if (typeof vib.pulse === 'function') {
                try {
                    const res = vib.pulse(clampedIntensity, clampedDuration);
                    if (res && typeof res.catch === 'function') res.catch(() => {});
                    pulsed = true;
                } catch {
                    // Ignore
                }
            }
        }
    };

    // 1. Direct XRInputSource target if provided
    if (targetSource && targetSource.gamepad) {
        try {
            pulseGamepadActuators(targetSource.gamepad);
            return;
        } catch {
            // Fall through to session scan
        }
    }

    // 2. WebXR Session InputSources (filtered by handedness if requested)
    if (xrSession && xrSession.inputSources) {
        try {
            let matchedHand = false;
            for (const source of xrSession.inputSources) {
                if (!source || !source.gamepad) continue;
                if (targetHand !== 'any' && source.handedness && source.handedness !== targetHand) {
                    continue;
                }
                pulseGamepadActuators(source.gamepad);
                matchedHand = true;
            }
            // Fallback: if specific handedness wasn't found (e.g. single 'none' controller), pulse all active sources
            if (!matchedHand && targetHand !== 'any') {
                for (const source of xrSession.inputSources) {
                    if (source?.gamepad) pulseGamepadActuators(source.gamepad);
                }
            }
        } catch {
            // Ignore unsupported haptic implementations
        }
    }

    // 3. Standard HTML5 Gamepads (Xbox, PlayStation, PC VR Companion Gamepads)
    if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
        try {
            const pads = navigator.getGamepads();
            for (const pad of pads) {
                if (!pad) continue;
                pulseGamepadActuators(pad);
            }
        } catch {
            // Ignore
        }
    }
}


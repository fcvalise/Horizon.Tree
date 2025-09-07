import { OisifManager } from '_OManager';
import { ORandom } from '_ORandom';
import { OWrapper } from '_OWrapper';
import * as hz from 'horizon/core';

type Wave = { ampDeg: number; freq: number; phase: number; dirDeg: number; };
const DEG = (r:number)=> r*180/Math.PI;

class WaterMovement extends hz.Component<typeof WaterMovement> {
  private wrapper!: OWrapper;
  private random!: ORandom;
  private t = 0;
  private originPos!: hz.Vec3;
  private baseRot!: hz.Quaternion;

  // 2–3 gentle swells: amplitudes in degrees, freqs in Hz-ish
  private waves: Wave[] = [
    { ampDeg: 1.6, freq: 0.06, phase: 0.0,  dirDeg:  15 },
    { ampDeg: 0.9, freq: 0.11, phase: 1.7,  dirDeg: -30 },
    { ampDeg: 0.5, freq: 0.17, phase: 3.14, dirDeg:  80 },
  ];

  // vertical bob (meters)
  private bobAmp = 0.05;   // 5 cm
  private bobFreq = 0.07;  // Hz-ish
  private bobPhase = 0.4;
  private randomize = 0;

  start() {
    this.wrapper = new OWrapper(this);
    this.random = new ORandom('Oisif');
    this.wrapper.onUpdate((dt) => this.update(dt));

    this.originPos = this.entity.position.get();
    // Plane horizontal in your setup (X=270°). Keep current yaw so coastline alignment stays stable.
    const current = this.entity.rotation.get();
    this.baseRot = current ?? hz.Quaternion.fromEuler(new hz.Vec3(0, 0, 0));
    this.t = this.random.range(0, 10)
  }

  private update(dt: number) {
    this.t += dt;

    // Build small pitch/roll deltas from directional waves.
    // For a wave traveling along yaw 'dir', its contribution:
    //   pitch (x) ~ amp * cos(dir), roll (z) ~ amp * sin(dir)
    let pitchDeg = 0, rollDeg = 0;
    for (const w of this.waves) {
      const phase = 2 * Math.PI * w.freq * this.t + w.phase;
      const a = w.ampDeg * Math.sin(phase);
      const d = w.dirDeg * Math.PI / 180;
      pitchDeg += a * Math.cos(d); // tip forward/back
      rollDeg  += a * Math.sin(d); // tip left/right
    }

    // Compose rotation: base (keeps horizontal) + tiny pitch/roll around X/Z
    const delta = hz.Quaternion.fromEuler(new hz.Vec3(pitchDeg, 0, rollDeg));
    this.entity.rotation.set(hz.Quaternion.mul(this.baseRot, delta));

    // Gentle vertical bob (don’t slide on X/Z; that looks like the ocean drifting away)
    const y = this.originPos.y + this.bobAmp * Math.sin(2 * Math.PI * this.bobFreq * this.t + this.bobPhase);
    this.entity.position.set(new hz.Vec3(this.originPos.x, y, this.originPos.z));
  }
}
hz.Component.register(WaterMovement);

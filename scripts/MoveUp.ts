import * as hz from "horizon/core";

class MoveUp extends hz.Component<typeof MoveUp> {
  start(): void {
  }
  // // --- Motion knobs ---
  // private riseSpeed = 2.8;        // m/s upward
  // private wobbleAmpX = 0.25;      // m (lateral)
  // private wobbleAmpZ = 0.18;      // m
  // private wobbleFreqX = 0.6;      // Hz
  // private wobbleFreqZ = 0.8;      // Hz
  // private driftAlong = 0.05;      // m/s along wobble direction
  // private softStart = 0.35;       // s ease-in
  // private teleportThreshold = 2.0;// m (reset wobble after big jumps)

  // // --- Orientation knobs (forward looks up) ---
  // private tiltDeg = 6;            // max tilt away from straight-up (deg)
  // private tiltFreq = 0.5;         // Hz
  // private spinDegPerSec = 35;     // roll around forward (=up) axis

  // // --- State ---
  // private t = 0;
  // private phaseX = Math.random() * Math.PI * 2;
  // private phaseZ = Math.random() * Math.PI * 2;
  // private lastOffX = 0;
  // private lastOffZ = 0;
  // private lastPos!: hz.Vec3;
  // private lastMs = Date.now();
  // private spinRad = Math.random() * Math.PI * 2;

  // start() {
  //   this.lastPos = this.entity.position.get();

  //   // prime wobble so first frame has no snap
  //   const initX = Math.sin(this.phaseX) * this.wobbleAmpX;
  //   const initZ = Math.cos(this.phaseZ) * this.wobbleAmpZ;
  //   this.lastOffX = initX;
  //   this.lastOffZ = initZ;

  //   try {
  //     this.connectLocalBroadcastEvent(hz.World.onUpdate, () => {
  //       const now = Date.now();
  //       const dt = Math.min(0.05, Math.max(0.001, (now - this.lastMs) / 1000));
  //       this.lastMs = now;
  //       this.updateFloat(dt);
  //     });
  //   } catch {
  //     this.async.setInterval(() => this.updateFloat(1 / 60), 16);
  //   }
  // }

  // private updateFloat(dt: number) {
  //   this.t += dt;
  //   const ease = Math.min(1, this.t / this.softStart);

  //   // --- WOBBLE DELTAS (teleport-safe) ---
  //   const offX = Math.sin((this.t * 2 * Math.PI * this.wobbleFreqX) + this.phaseX) * this.wobbleAmpX * ease;
  //   const offZ = Math.cos((this.t * 2 * Math.PI * this.wobbleFreqZ) + this.phaseZ) * this.wobbleAmpZ * ease;
  //   let dx = offX - this.lastOffX;
  //   let dz = offZ - this.lastOffZ;

  //   const len = Math.hypot(dx, dz);
  //   if (len > 1e-5) {
  //     dx += (dx / len) * this.driftAlong * dt;
  //     dz += (dz / len) * this.driftAlong * dt;
  //   }

  //   const p = this.entity.position.get();
  //   const jumped = Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y, p.z - this.lastPos.z) > this.teleportThreshold;
  //   if (jumped) { dx = 0; dz = 0; this.lastOffX = offX; this.lastOffZ = offZ; }

  //   p.x += dx;
  //   p.y += this.riseSpeed * ease * dt;
  //   p.z += dz;
  //   try { this.entity.position.set(p); } catch {}

  //   this.lastOffX = offX;
  //   this.lastOffZ = offZ;
  //   this.lastPos = p;

  //   // --- ORIENTATION: forward points up (+Y) with tilt + spin ---
  //   // Target forward vector: mostly Up with a tiny lateral tilt
  //   const tiltRad = (this.tiltDeg * Math.PI / 180) * ease;
  //   const tiltX = Math.sin(2 * Math.PI * this.tiltFreq * this.t + this.phaseX) * tiltRad;
  //   const tiltZ = Math.cos(2 * Math.PI * this.tiltFreq * this.t + this.phaseZ) * tiltRad;

  //   // Base up and two world-orthogonal directions to deflect towards
  //   const up = new hz.Vec3(0, 1, 0);
  //   const right = new hz.Vec3(1, 0, 0);
  //   const fwdZ = new hz.Vec3(0, 0, 1);

  //   // Compose desired forward = normalize(Up + tiltX*Right + tiltZ*WorldZ)
  //   let fwd = new hz.Vec3(
  //     up.x + right.x * tiltX + fwdZ.x * tiltZ,
  //     up.y + right.y * tiltX + fwdZ.y * tiltZ,
  //     up.z + right.z * tiltX + fwdZ.z * tiltZ
  //   );
  //   fwd = this.normalize(fwd);

  //   // Spin (roll) around the forward axis
  //   this.spinRad += (this.spinDegPerSec * Math.PI / 180) * dt;

  //   // Build a stable "upHint" not parallel to fwd, rotated around fwd by spin
  //   let upHint = Math.abs(this.dot(fwd, fwdZ)) > 0.9 ? right : fwdZ;
  //   upHint = this.rotateAroundAxis(upHint, fwd, this.spinRad);

  //   // Try lookRotation(forward, upHint) if available
  //   try {
  //     const qLook = (hz.Quaternion as any).lookRotation?.(fwd, upHint)
  //                ?? (hz.Quaternion as any).fromLookRotation?.(fwd, upHint);
  //     if (qLook) { this.entity.rotation.set(qLook as hz.Quaternion); return; }
  //   } catch {}

  //   // Fallback: align default forward (+Z) to our fwd using fromToRotation, then roll
  //   try {
  //     const qAlign = (hz.Quaternion as any).fromToRotation?.(new hz.Vec3(0,0,1), fwd);
  //     const qRoll  = (hz.Quaternion as any).fromAxisAngle?.(fwd, this.spinRad);
  //     if (qAlign && qRoll && (qRoll as any).mul) {
  //       const q = (qRoll as any).mul(qAlign); // roll then align
  //       this.entity.rotation.set(q as hz.Quaternion);
  //       return;
  //     } else if (qAlign) {
  //       this.entity.rotation.set(qAlign as hz.Quaternion);
  //       return;
  //     }
  //   } catch {}

  //   // Last resort: face up with fixed pre-rotation (Z->Y), then add small euler wobble
  //   try {
  //     const up90 = (hz.Quaternion as any).fromAxisAngle?.(right, -Math.PI / 2);
  //     if (up90) this.entity.rotation.set(up90 as hz.Quaternion);
  //   } catch {}
  // }

  // // --- Tiny vector helpers (engine-agnostic) ---
  // private normalize(v: hz.Vec3): hz.Vec3 {
  //   const L = Math.hypot(v.x, v.y, v.z) || 1;
  //   return new hz.Vec3(v.x / L, v.y / L, v.z / L);
  // }
  // private dot(a: hz.Vec3, b: hz.Vec3): number { return a.x*b.x + a.y*b.y + a.z*b.z; }
  // private cross(a: hz.Vec3, b: hz.Vec3): hz.Vec3 {
  //   return new hz.Vec3(
  //     a.y*b.z - a.z*b.y,
  //     a.z*b.x - a.x*b.z,
  //     a.x*b.y - a.y*b.x
  //   );
  // }
  // private rotateAroundAxis(v: hz.Vec3, axis: hz.Vec3, ang: number): hz.Vec3 {
  //   // Rodrigues' rotation formula
  //   const k = this.normalize(axis);
  //   const c = Math.cos(ang), s = Math.sin(ang), d = this.dot(k, v);
  //   const cross = this.cross(k, v);
  //   return new hz.Vec3(
  //     v.x*c + cross.x*s + k.x*d*(1-c),
  //     v.y*c + cross.y*s + k.y*d*(1-c),
  //     v.z*c + cross.z*s + k.z*d*(1-c),
  //   );
  // }
}
hz.Component.register(MoveUp);
